create table public.order_public_tracking (
  order_id uuid primary key references public.orders(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create index orders_active_queue_idx
  on public.orders (order_status, payment_status, created_at desc)
  where order_status <> 'canceled';

alter publication supabase_realtime add table public.orders;

alter table public.order_public_tracking enable row level security;

create or replace function public.create_public_order_with_tracking(
  p_idempotency_key text,
  p_request jsonb,
  p_tracking_token text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_token_hash text;
  v_existing_hash text;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'A criação de pedidos públicos é exclusiva do servidor.';
  end if;
  if p_tracking_token !~ '^[A-Za-z0-9_-]{32,128}$' then
    raise exception using errcode = '22023', message = 'TRACKING_TOKEN_INVALID';
  end if;

  v_order := public.create_public_order(p_idempotency_key, p_request);
  v_token_hash := encode(extensions.digest(p_tracking_token, 'sha256'), 'hex');

  insert into public.order_public_tracking (order_id, token_hash)
  values (v_order.id, v_token_hash)
  on conflict (order_id) do nothing;

  select token_hash into v_existing_hash
  from public.order_public_tracking
  where order_id = v_order.id;
  if v_existing_hash <> v_token_hash then
    raise exception using errcode = '23505', message = 'TRACKING_TOKEN_CONFLICT';
  end if;

  return v_order;
end;
$$;

create or replace function public.get_public_order_tracking(
  p_public_code text,
  p_tracking_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_token_hash text;
begin
  if p_public_code !~ '^M[0-9A-F]{12}$' or p_tracking_token !~ '^[A-Za-z0-9_-]{32,128}$' then
    raise exception using errcode = '22023', message = 'TRACKING_NOT_FOUND';
  end if;
  v_token_hash := encode(extensions.digest(p_tracking_token, 'sha256'), 'hex');

  select orders.* into v_order
  from public.orders
  join public.order_public_tracking as tracking on tracking.order_id = orders.id
  where orders.public_code = upper(p_public_code)
    and tracking.token_hash = v_token_hash;
  if not found then
    raise exception using errcode = 'P0002', message = 'TRACKING_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'publicCode', v_order.public_code,
    'orderStatus', v_order.order_status,
    'paymentStatus', v_order.payment_status,
    'paymentMethod', v_order.payment_method,
    'deliveryType', v_order.delivery_type,
    'subtotal', v_order.subtotal,
    'deliveryFee', v_order.delivery_fee,
    'discount', v_order.discount,
    'total', v_order.total,
    'createdAt', v_order.created_at,
    'preparingAt', v_order.preparing_at,
    'readyAt', v_order.ready_at,
    'completedAt', v_order.completed_at,
    'canceledAt', v_order.canceled_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', item.product_name,
        'quantity', item.quantity,
        'subtotal', item.subtotal
      ) order by item.created_at)
      from public.order_items as item
      where item.order_id = v_order.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on table public.order_public_tracking from public, anon, authenticated;
revoke all on function public.create_public_order_with_tracking(text, jsonb, text) from public, anon, authenticated;
revoke all on function public.get_public_order_tracking(text, text) from public, authenticated;
grant usage on schema public to service_role;
grant execute on function public.create_public_order_with_tracking(text, jsonb, text) to service_role;
grant execute on function public.get_public_order_tracking(text, text) to anon, authenticated;

comment on table public.order_public_tracking is 'Credencial de acompanhamento público: somente o hash SHA-256 do token aleatório é persistido.';
comment on function public.get_public_order_tracking(text, text) is 'Retorna somente dados mínimos de acompanhamento após validar código e token.';

notify pgrst, 'reload schema';
