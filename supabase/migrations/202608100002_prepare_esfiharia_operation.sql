-- Prepara a Esfiharia para configuração comercial sem ativá-la nem criar
-- conteúdo comercial fictício.

alter type public.product_category add value if not exists 'Esfihas';

-- Horários desabilitados podem permanecer sem horas definidas até que o owner
-- informe os valores reais. Horários habilitados são validados pelo readiness.
alter table public.business_hours alter column open_time drop not null;
alter table public.business_hours alter column close_time drop not null;

-- O acesso administrativo não depende do estado comercial da store. A
-- disponibilidade para novos pedidos continua sendo validada separadamente.
create or replace function public.can_access_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    join public.profile_stores as membership on membership.profile_id = profile.id
    join public.stores as store on store.id = membership.store_id
    where profile.id = auth.uid()
      and profile.active = true
      and store.id = p_store_id
  );
$$;

create or replace function public.is_owner_of_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    join public.profile_stores as membership on membership.profile_id = profile.id
    join public.stores as store on store.id = membership.store_id
    where profile.id = auth.uid()
      and profile.active = true
      and profile.role = 'owner'::public.profile_role
      and store.id = p_store_id
  );
$$;

-- Associa, de forma idempotente, o owner existente à Esfiharia. Nenhum usuário
-- ou role é criado ou alterado por esta operação.
insert into public.profile_stores (profile_id, store_id)
select profile.id, store.id
from public.profiles as profile
cross join public.stores as store
where profile.role = 'owner'::public.profile_role
  and profile.active = true
  and store.slug = 'esfiharia'
on conflict (profile_id, store_id) do nothing;

-- Configuração inicial neutra e fechada. O ON CONFLICT preserva qualquer dado
-- real que já tenha sido informado antes da aplicação desta migration.
insert into public.store_settings (
  store_id,
  delivery_open,
  pause_online_orders,
  temporary_pause,
  closed_today,
  closed_message,
  allow_pickup,
  allow_delivery,
  delivery_fee,
  minimum_order,
  free_add_ons_quantity,
  accepted_payment_methods,
  pix_key,
  payment_note,
  whatsapp,
  instagram,
  address,
  headline,
  subtitle,
  displayed_hours,
  config_version
)
select
  store.id,
  false,
  true,
  false,
  false,
  '',
  false,
  false,
  0,
  0,
  0,
  '{}'::public.payment_method[],
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  1
from public.stores as store
where store.slug = 'esfiharia'
on conflict (store_id) do nothing;

insert into public.business_hours (
  store_id,
  weekday,
  enabled,
  open_time,
  close_time
)
select store.id, weekday.value::smallint, false, null, null
from public.stores as store
cross join generate_series(0, 6) as weekday(value)
where store.slug = 'esfiharia'
on conflict (store_id, weekday) do nothing;

create or replace function public.initialize_store_configuration(p_store_id uuid)
returns public.store_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.store_settings;
begin
  if not public.is_owner_of_store(p_store_id) then
    raise exception using errcode = '42501', message = 'Apenas um owner desta loja pode iniciar a configuração.';
  end if;

  insert into public.store_settings (
    store_id, delivery_open, pause_online_orders, temporary_pause,
    closed_today, closed_message, allow_pickup, allow_delivery,
    delivery_fee, minimum_order, free_add_ons_quantity,
    accepted_payment_methods, pix_key, payment_note, whatsapp, instagram,
    address, headline, subtitle, displayed_hours, config_version
  ) values (
    p_store_id, false, true, false, false, '', false, false,
    0, 0, 0, '{}'::public.payment_method[], '', '', '', '', '', '', '', '', 1
  )
  on conflict (store_id) do nothing;

  insert into public.business_hours (store_id, weekday, enabled, open_time, close_time)
  select p_store_id, weekday.value::smallint, false, null, null
  from generate_series(0, 6) as weekday(value)
  on conflict (store_id, weekday) do nothing;

  select * into v_settings
  from public.store_settings
  where store_id = p_store_id;
  return v_settings;
end;
$$;

create or replace function public.get_store_readiness(p_store_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings_configured boolean;
  v_catalog_configured boolean;
  v_hours_configured boolean;
  v_payment_configured boolean;
  v_fulfillment_configured boolean;
  v_contact_configured boolean;
  v_missing text[];
begin
  if not public.is_owner_of_store(p_store_id) then
    raise exception using errcode = '42501', message = 'Apenas um owner desta loja pode consultar a prontidão.';
  end if;

  select
    true,
    cardinality(settings.accepted_payment_methods) > 0,
    settings.allow_pickup or settings.allow_delivery,
    length(trim(settings.address)) > 0
      and (length(trim(settings.whatsapp)) > 0 or length(trim(settings.instagram)) > 0)
  into
    v_settings_configured,
    v_payment_configured,
    v_fulfillment_configured,
    v_contact_configured
  from public.store_settings as settings
  where settings.store_id = p_store_id;

  v_settings_configured := coalesce(v_settings_configured, false);
  v_payment_configured := coalesce(v_payment_configured, false);
  v_fulfillment_configured := coalesce(v_fulfillment_configured, false);
  v_contact_configured := coalesce(v_contact_configured, false);

  select exists (
    select 1
    from public.products as product
    where product.store_id = p_store_id
      and product.active
      and product.available_today
  ) into v_catalog_configured;

  select exists (
    select 1
    from public.business_hours as hours
    where hours.store_id = p_store_id
      and hours.enabled
      and hours.open_time is not null
      and hours.close_time is not null
      and hours.open_time <> hours.close_time
  ) into v_hours_configured;

  v_missing := array_remove(array[
    case when not v_settings_configured then 'configurações da loja' end,
    case when not v_catalog_configured then 'ao menos um produto ativo e disponível' end,
    case when not v_hours_configured then 'ao menos um horário habilitado e válido' end,
    case when not v_payment_configured then 'ao menos uma forma de pagamento' end,
    case when not v_fulfillment_configured then 'retirada ou entrega habilitada' end
  ]::text[], null);

  return jsonb_build_object(
    'ready', cardinality(v_missing) = 0,
    'requirements', jsonb_build_object(
      'settings', v_settings_configured,
      'catalog', v_catalog_configured,
      'hours', v_hours_configured,
      'payment', v_payment_configured,
      'fulfillment', v_fulfillment_configured,
      'contact', v_contact_configured
    ),
    'missing', to_jsonb(v_missing)
  );
end;
$$;

create or replace function public.activate_store(p_store_id uuid)
returns public.stores
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores;
  v_readiness jsonb;
  v_missing text;
begin
  if not public.is_owner_of_store(p_store_id) then
    raise exception using errcode = '42501', message = 'Apenas um owner desta loja pode ativá-la.';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Loja não encontrada.';
  end if;

  v_readiness := public.get_store_readiness(p_store_id);
  if not (v_readiness ->> 'ready')::boolean then
    select string_agg(value, ', ')
    into v_missing
    from jsonb_array_elements_text(v_readiness -> 'missing');
    raise exception using
      errcode = '23514',
      message = 'A loja ainda não pode ser ativada. Pendências: ' || coalesce(v_missing, 'requisitos não informados') || '.';
  end if;

  update public.stores
  set active = true
  where id = p_store_id
  returning * into v_store;
  return v_store;
end;
$$;

-- Mesmo que uma chamada interna seja construída fora da interface, nenhuma
-- store inativa pode receber pedidos novos.
create or replace function public.enforce_active_store_for_new_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.stores as store
    where store.id = new.store_id and store.active
  ) then
    raise exception using errcode = 'P0001', message = 'STORE_INACTIVE';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_require_active_store on public.orders;
create trigger orders_require_active_store
before insert on public.orders
for each row execute function public.enforce_active_store_for_new_order();

revoke all on function public.initialize_store_configuration(uuid) from public, anon;
revoke all on function public.get_store_readiness(uuid) from public, anon;
revoke all on function public.activate_store(uuid) from public, anon;
revoke all on function public.enforce_active_store_for_new_order() from public, anon, authenticated;
grant execute on function public.initialize_store_configuration(uuid) to authenticated;
grant execute on function public.get_store_readiness(uuid) to authenticated;
grant execute on function public.activate_store(uuid) to authenticated;

comment on function public.get_store_readiness(uuid) is
  'Retorna os requisitos obrigatórios de ativação e o contato recomendado por store.';
comment on function public.activate_store(uuid) is
  'Ativa uma store somente após validar configurações, catálogo, horários, pagamento e recebimento.';
comment on function public.enforce_active_store_for_new_order() is
  'Bloqueia a criação de qualquer pedido em stores inativas.';

notify pgrst, 'reload schema';
