create extension if not exists "pgcrypto";

create type public.profile_role as enum ('owner', 'attendant');
create type public.product_category as enum ('Açaí', 'Sorvetes', 'Milk-shakes', 'Sobremesas', 'Promoções', 'Bebidas', 'Outros');
create type public.payment_method as enum ('Pix', 'Dinheiro', 'Cartão', 'A combinar');
create type public.payment_status as enum ('pending', 'paid');
create type public.order_status as enum ('new', 'preparing', 'ready', 'delivered', 'canceled');
create type public.order_origin as enum ('internal', 'delivery');
create type public.delivery_type as enum ('pickup', 'delivery');
create type public.flavor_product_type as enum ('ice_cream', 'milkshake');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_order_public_code()
returns text
language sql
volatile
as $$
  select 'M' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 12));
$$;

create or replace function public.ensure_order_public_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  loop
    new.public_code = coalesce(nullif(trim(new.public_code), ''), public.generate_order_public_code());
    exit when not exists (
      select 1
      from public.orders
      where public_code = new.public_code
        and id is distinct from new.id
    );
    new.public_code = public.generate_order_public_code();
  end loop;

  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  role public.profile_role not null default 'attendant',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  category public.product_category not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  available_today boolean not null default true,
  featured boolean not null default false,
  display_order integer not null default 0,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_code text not null default public.generate_order_public_code(),
  customer_name text not null check (length(trim(customer_name)) > 0),
  phone text,
  notes text,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  order_status public.order_status not null default 'new',
  origin public.order_origin not null default 'internal',
  delivery_type public.delivery_type not null default 'pickup',
  address text,
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  cancellation_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches_parts check (total = subtotal + delivery_fee - discount),
  constraint orders_canceled_reason check (order_status <> 'canceled' or cancellation_reason is null or length(trim(cancellation_reason)) > 0)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null check (length(trim(product_name)) > 0),
  category public.product_category,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  details jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  constraint order_items_subtotal_matches_quantity check (subtotal = quantity * unit_price),
  constraint order_items_details_is_object check (jsonb_typeof(details) = 'object')
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.store_settings (
  id boolean primary key default true check (id),
  delivery_open boolean not null default false,
  pause_online_orders boolean not null default true,
  closed_today boolean not null default false,
  closed_message text not null default 'No momento, estamos fechados. Volte a pedir durante nosso horário de atendimento.',
  allow_pickup boolean not null default true,
  allow_delivery boolean not null default true,
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  minimum_order numeric(10, 2) not null default 0 check (minimum_order >= 0),
  free_add_ons_quantity integer not null default 3 check (free_add_ons_quantity >= 0),
  pix_key text not null default '',
  payment_note text not null default '',
  whatsapp text not null default '',
  instagram text not null default '',
  address text not null default '',
  headline text not null default 'Monte, peça e aproveite.',
  subtitle text not null default 'Açaí, sorvetes e milk-shakes preparados para retirada ou delivery.',
  displayed_hours text not null default 'Todos os dias, das 12h às 22h',
  config_version integer not null default 1 check (config_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  enabled boolean not null default true,
  open_time time not null,
  close_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekday)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  featured_on_home boolean not null default false,
  valid_from timestamptz,
  valid_until timestamptz,
  image_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_valid_range check (valid_from is null or valid_until is null or valid_until >= valid_from)
);

create table public.add_ons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  available boolean not null default true,
  extra_price numeric(10, 2) not null default 0 check (extra_price >= 0),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flavors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  product_type public.flavor_product_type not null,
  active boolean not null default true,
  available boolean not null default true,
  preview_color text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create view public.public_store_settings
with (security_invoker = false)
as
select
  delivery_open,
  pause_online_orders,
  closed_today,
  closed_message,
  allow_pickup,
  allow_delivery,
  delivery_fee,
  minimum_order,
  whatsapp,
  instagram,
  address,
  headline,
  subtitle,
  displayed_hours,
  config_version,
  updated_at
from public.store_settings
where id = true;

create unique index orders_public_code_idx on public.orders (public_code);
create index orders_created_at_desc_idx on public.orders (created_at desc);
create index orders_order_status_idx on public.orders (order_status);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_phone_idx on public.orders (phone);
create index orders_origin_idx on public.orders (origin);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_status_history_order_id_created_at_idx on public.order_status_history (order_id, created_at);
create index products_active_available_today_idx on public.products (active, available_today);
create index promotions_active_valid_until_idx on public.promotions (active, valid_until);
create unique index promotions_single_featured_home_idx on public.promotions (featured_on_home) where active and featured_on_home;
create index flavors_product_type_active_available_idx on public.flavors (product_type, active, available);
create unique index add_ons_name_unique_idx on public.add_ons (name);
create unique index flavors_product_type_name_unique_idx on public.flavors (product_type, name);
create unique index products_name_unique_idx on public.products (name);
create unique index promotions_title_unique_idx on public.promotions (title);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger orders_ensure_public_code before insert on public.orders for each row execute function public.ensure_order_public_code();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings for each row execute function public.set_updated_at();
create trigger business_hours_set_updated_at before update on public.business_hours for each row execute function public.set_updated_at();
create trigger promotions_set_updated_at before update on public.promotions for each row execute function public.set_updated_at();
create trigger add_ons_set_updated_at before update on public.add_ons for each row execute function public.set_updated_at();
create trigger flavors_set_updated_at before update on public.flavors for each row execute function public.set_updated_at();

create or replace function public.track_order_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, previous_status, new_status, changed_by, notes)
    values (new.id, null, new.order_status, auth.uid(), 'Pedido criado');
  elsif old.order_status is distinct from new.order_status then
    insert into public.order_status_history (order_id, previous_status, new_status, changed_by)
    values (new.id, old.order_status, new.order_status, auth.uid());
  end if;

  return new;
end;
$$;

create trigger orders_track_status_history
after insert or update of order_status on public.orders
for each row execute function public.track_order_status_history();

create or replace function public.current_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true;
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_internal_user();
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'owner'::public.profile_role;
$$;

create or replace function public.create_internal_order(
  p_customer_name text,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_phone text default null,
  p_notes text default null,
  p_payment_status public.payment_status default 'pending',
  p_delivery_type public.delivery_type default 'pickup',
  p_address text default null,
  p_delivery_fee numeric default 0,
  p_discount numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_product_name text;
  v_category public.product_category;
  v_quantity integer;
  v_unit_price numeric(10, 2);
  v_item_subtotal numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_details jsonb;
begin
  if not public.is_active_user() then
    raise exception 'Usuário sem permissão para criar pedidos.' using errcode = '42501';
  end if;

  p_payment_status := coalesce(p_payment_status, 'pending');
  p_delivery_type := coalesce(p_delivery_type, 'pickup');
  p_delivery_fee := coalesce(p_delivery_fee, 0);
  p_discount := coalesce(p_discount, 0);

  if length(trim(coalesce(p_customer_name, ''))) = 0 then
    raise exception 'Nome do cliente é obrigatório.' using errcode = '23514';
  end if;

  if p_delivery_type = 'delivery' and length(trim(coalesce(p_address, ''))) = 0 then
    raise exception 'Endereço é obrigatório para entrega.' using errcode = '23514';
  end if;

  if p_delivery_fee < 0 or p_discount < 0 then
    raise exception 'Valores monetários não podem ser negativos.' using errcode = '23514';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido deve ter pelo menos um item.' using errcode = '23514';
  end if;

  insert into public.orders (
    customer_name,
    phone,
    notes,
    payment_method,
    payment_status,
    order_status,
    origin,
    delivery_type,
    address,
    subtotal,
    delivery_fee,
    discount,
    total,
    created_by
  )
  values (
    trim(p_customer_name),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    p_payment_method,
    p_payment_status,
    'new',
    'internal',
    p_delivery_type,
    nullif(trim(coalesce(p_address, '')), ''),
    0,
    0,
    0,
    0,
    auth.uid()
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_quantity := coalesce((v_item->>'quantity')::integer, 0);
    v_details := coalesce(v_item->'details', '{}'::jsonb);

    if v_quantity <= 0 then
      raise exception 'Quantidade do item deve ser maior que zero.' using errcode = '23514';
    end if;

    if jsonb_typeof(v_details) <> 'object' then
      raise exception 'Detalhes do item devem ser um objeto JSON.' using errcode = '23514';
    end if;

    if v_product_id is not null then
      select *
      into v_product
      from public.products
      where id = v_product_id
        and active = true;

      if not found then
        raise exception 'Produto informado não está disponível.' using errcode = '23503';
      end if;

      v_product_name := v_product.name;
      v_category := v_product.category;
      v_unit_price := v_product.price;
    else
      v_product_name := nullif(trim(coalesce(v_item->>'product_name', '')), '');
      v_category := nullif(v_item->>'category', '')::public.product_category;
      v_unit_price := coalesce((v_item->>'unit_price')::numeric, -1);

      if v_product_name is null then
        raise exception 'Nome do item manual é obrigatório.' using errcode = '23514';
      end if;

      if v_unit_price < 0 then
        raise exception 'Preço do item manual não pode ser negativo.' using errcode = '23514';
      end if;
    end if;

    v_item_subtotal := round(v_quantity * v_unit_price, 2);
    v_subtotal := v_subtotal + v_item_subtotal;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      category,
      quantity,
      unit_price,
      subtotal,
      details,
      notes
    )
    values (
      v_order_id,
      v_product_id,
      v_product_name,
      v_category,
      v_quantity,
      round(v_unit_price, 2),
      v_item_subtotal,
      v_details,
      nullif(trim(coalesce(v_item->>'notes', '')), '')
    );
  end loop;

  if v_subtotal + p_delivery_fee - p_discount < 0 then
    raise exception 'Total do pedido não pode ser negativo.' using errcode = '23514';
  end if;

  update public.orders
  set
    subtotal = round(v_subtotal, 2),
    delivery_fee = round(p_delivery_fee, 2),
    discount = round(p_discount, 2),
    total = round(v_subtotal + p_delivery_fee - p_discount, 2)
  where id = v_order_id;

  return v_order_id;
end;
$$;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_new_status public.order_status,
  p_cancellation_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_updated public.orders%rowtype;
  v_allowed boolean;
begin
  if not public.is_active_user() then
    raise exception 'Usuário sem permissão para atualizar pedidos.' using errcode = '42501';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido não encontrado.' using errcode = 'P0002';
  end if;

  if v_order.order_status = p_new_status then
    return v_order;
  end if;

  v_allowed :=
    (v_order.order_status = 'new' and p_new_status = 'preparing')
    or (v_order.order_status = 'preparing' and p_new_status = 'ready')
    or (v_order.order_status = 'ready' and p_new_status = 'delivered')
    or (v_order.order_status <> 'canceled' and p_new_status = 'canceled');

  if not v_allowed then
    raise exception 'Transição de status não permitida.' using errcode = '23514';
  end if;

  if p_new_status = 'canceled' and length(trim(coalesce(p_cancellation_reason, ''))) = 0 then
    raise exception 'Motivo do cancelamento é obrigatório.' using errcode = '23514';
  end if;

  update public.orders
  set
    order_status = p_new_status,
    cancellation_reason = case when p_new_status = 'canceled' then trim(p_cancellation_reason) else cancellation_reason end,
    accepted_at = case when p_new_status in ('preparing', 'ready', 'delivered') then coalesce(accepted_at, now()) else accepted_at end,
    preparing_at = case when p_new_status = 'preparing' then coalesce(preparing_at, now()) else preparing_at end,
    ready_at = case when p_new_status = 'ready' then coalesce(ready_at, now()) else ready_at end,
    completed_at = case when p_new_status = 'delivered' then coalesce(completed_at, now()) else completed_at end,
    canceled_at = case when p_new_status = 'canceled' then coalesce(canceled_at, now()) else canceled_at end
  where id = p_order_id
  returning * into v_updated;

  return v_updated;
end;
$$;

create or replace function public.update_payment_status(
  p_order_id uuid,
  p_payment_status public.payment_status
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_updated public.orders%rowtype;
begin
  if not public.is_active_user() then
    raise exception 'Usuário sem permissão para atualizar pagamentos.' using errcode = '42501';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido não encontrado.' using errcode = 'P0002';
  end if;

  if v_order.payment_status = p_payment_status then
    return v_order;
  end if;

  if v_order.payment_status = 'paid' and p_payment_status = 'pending' and not public.is_owner() then
    raise exception 'Somente owner pode reabrir pagamento como pendente.' using errcode = '42501';
  end if;

  if v_order.payment_status = 'pending' and p_payment_status <> 'paid' then
    raise exception 'Transição de pagamento não permitida.' using errcode = '23514';
  end if;

  update public.orders
  set payment_status = p_payment_status
  where id = p_order_id
  returning * into v_updated;

  return v_updated;
end;
$$;

create or replace function public.cancel_order(
  p_order_id uuid,
  p_cancellation_reason text
)
returns public.orders
language sql
security definer
set search_path = public
as $$
  select public.update_order_status(p_order_id, 'canceled'::public.order_status, p_cancellation_reason);
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.store_settings enable row level security;
alter table public.business_hours enable row level security;
alter table public.promotions enable row level security;
alter table public.add_ons enable row level security;
alter table public.flavors enable row level security;

create policy "profiles_select_internal"
on public.profiles for select
to authenticated
using (public.is_owner() or (id = auth.uid() and active = true));

create policy "profiles_owner_insert"
on public.profiles for insert
to authenticated
with check (public.is_owner());

create policy "profiles_owner_update"
on public.profiles for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "profiles_owner_delete"
on public.profiles for delete
to authenticated
using (public.is_owner());

create policy "products_public_select_available"
on public.products for select
to anon, authenticated
using ((active = true and available_today = true) or public.is_internal_user());

create policy "products_owner_insert"
on public.products for insert
to authenticated
with check (public.is_owner());

create policy "products_owner_update"
on public.products for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "products_owner_delete"
on public.products for delete
to authenticated
using (public.is_owner());

create policy "orders_internal_select"
on public.orders for select
to authenticated
using (public.is_internal_user());

create policy "orders_owner_insert"
on public.orders for insert
to authenticated
with check (public.is_owner());

create policy "orders_owner_update"
on public.orders for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "orders_owner_delete"
on public.orders for delete
to authenticated
using (public.is_owner());

create policy "order_items_internal_select"
on public.order_items for select
to authenticated
using (public.is_internal_user());

create policy "order_items_owner_insert"
on public.order_items for insert
to authenticated
with check (public.is_owner());

create policy "order_items_owner_update"
on public.order_items for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "order_items_owner_delete"
on public.order_items for delete
to authenticated
using (public.is_owner());

create policy "order_status_history_internal_select"
on public.order_status_history for select
to authenticated
using (public.is_internal_user());

create policy "store_settings_internal_select"
on public.store_settings for select
to authenticated
using (public.is_internal_user());

create policy "store_settings_owner_update"
on public.store_settings for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "business_hours_public_select"
on public.business_hours for select
to anon, authenticated
using (true);

create policy "business_hours_owner_insert"
on public.business_hours for insert
to authenticated
with check (public.is_owner());

create policy "business_hours_owner_update"
on public.business_hours for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "business_hours_owner_delete"
on public.business_hours for delete
to authenticated
using (public.is_owner());

create policy "promotions_public_select_active"
on public.promotions for select
to anon, authenticated
using (
  (active = true and (valid_from is null or valid_from <= now()) and (valid_until is null or valid_until >= now()))
  or public.is_internal_user()
);

create policy "promotions_owner_insert"
on public.promotions for insert
to authenticated
with check (public.is_owner());

create policy "promotions_owner_update"
on public.promotions for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "promotions_owner_delete"
on public.promotions for delete
to authenticated
using (public.is_owner());

create policy "add_ons_public_select_available"
on public.add_ons for select
to anon, authenticated
using ((active = true and available = true) or public.is_internal_user());

create policy "add_ons_owner_insert"
on public.add_ons for insert
to authenticated
with check (public.is_owner());

create policy "add_ons_owner_update"
on public.add_ons for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "add_ons_owner_delete"
on public.add_ons for delete
to authenticated
using (public.is_owner());

create policy "flavors_public_select_available"
on public.flavors for select
to anon, authenticated
using ((active = true and available = true) or public.is_internal_user());

create policy "flavors_owner_insert"
on public.flavors for insert
to authenticated
with check (public.is_owner());

create policy "flavors_owner_update"
on public.flavors for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "flavors_owner_delete"
on public.flavors for delete
to authenticated
using (public.is_owner());

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.products, public.public_store_settings, public.business_hours, public.promotions, public.add_ons, public.flavors to anon;
grant select on public.profiles, public.products, public.orders, public.order_items, public.order_status_history, public.store_settings, public.business_hours, public.promotions, public.add_ons, public.flavors to authenticated;
grant insert, update, delete on public.profiles, public.products, public.orders, public.order_items, public.business_hours, public.promotions, public.add_ons, public.flavors to authenticated;
grant update on public.store_settings to authenticated;
grant select on public.public_store_settings to authenticated;
grant execute on function public.current_profile_role() to anon, authenticated;
grant execute on function public.generate_order_public_code() to authenticated;
grant execute on function public.is_internal_user() to anon, authenticated;
grant execute on function public.is_active_user() to anon, authenticated;
grant execute on function public.is_owner() to anon, authenticated;
grant execute on function public.create_internal_order(text, public.payment_method, jsonb, text, text, public.payment_status, public.delivery_type, text, numeric, numeric) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.update_payment_status(uuid, public.payment_status) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;

comment on table public.orders is 'Endereço de entrega deve ser validado pela operação de servidor para pedidos delivery. A regra não fica em CHECK para não atrapalhar migrações e correções operacionais.';
comment on column public.orders.public_code is 'Código público aleatório, único e não sequencial. Não deve autorizar consulta pública sozinho; combine com telefone normalizado ou token público.';
comment on table public.order_status_history is 'Histórico simples de mudanças operacionais do pedido. Não substitui Event Sourcing.';
comment on view public.public_store_settings is 'View pública com apenas configurações seguras para o site e delivery. Não expõe chave Pix, observação interna de pagamento nem campos sensíveis futuros.';
comment on function public.create_internal_order(text, public.payment_method, jsonb, text, text, public.payment_status, public.delivery_type, text, numeric, numeric) is 'Cria pedido interno de forma atômica. Produtos com product_id usam preço do banco; itens sem product_id são itens manuais autenticados.';
