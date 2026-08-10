-- Introduz isolamento por operação sem recriar os dados existentes.
-- UUIDs fixos tornam as stores determinísticas em upgrades e resets completos.

create table public.stores (
  id uuid primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  type text not null check (type in ('sorveteria', 'esfiharia')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.stores (id, slug, name, type, active)
values
  ('00000000-0000-4000-8000-000000000001', 'sorveteria', 'Sorveteria da Manu', 'sorveteria', true),
  ('00000000-0000-4000-8000-000000000002', 'esfiharia', 'Esfiharia', 'esfiharia', false)
on conflict (slug) do update
set name = excluded.name,
    type = excluded.type;

create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

create table public.profile_stores (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, store_id)
);

insert into public.profile_stores (profile_id, store_id)
select profile.id, '00000000-0000-4000-8000-000000000001'::uuid
from public.profiles as profile
on conflict (profile_id, store_id) do nothing;

create or replace function public.attach_new_profile_to_sorveteria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_stores (profile_id, store_id)
  values (new.id, '00000000-0000-4000-8000-000000000001')
  on conflict (profile_id, store_id) do nothing;
  return new;
end;
$$;

create trigger profiles_attach_default_store
after insert on public.profiles
for each row execute function public.attach_new_profile_to_sorveteria();

drop view public.public_store_settings;

alter table public.products add column store_id uuid;
alter table public.orders add column store_id uuid;
alter table public.store_settings add column store_id uuid;
alter table public.business_hours add column store_id uuid;
alter table public.promotions add column store_id uuid;
alter table public.add_ons add column store_id uuid;
alter table public.flavors add column store_id uuid;
alter table public.delivery_builder_options add column store_id uuid;
alter table public.public_order_rate_limits add column store_id uuid;

update public.products set store_id = '00000000-0000-4000-8000-000000000001' where store_id is null;
update public.orders set store_id = '00000000-0000-4000-8000-000000000001' where store_id is null;
update public.store_settings set store_id = '00000000-0000-4000-8000-000000000001' where store_id is null;
update public.business_hours set store_id = '00000000-0000-4000-8000-000000000001' where store_id is null;
update public.promotions set store_id = '00000000-0000-4000-8000-000000000001' where store_id is null;
update public.add_ons set store_id = '00000000-0000-4000-8000-000000000001' where store_id is null;
update public.flavors set store_id = '00000000-0000-4000-8000-000000000001' where store_id is null;
update public.delivery_builder_options set store_id = '00000000-0000-4000-8000-000000000001' where store_id is null;
update public.public_order_rate_limits set store_id = '00000000-0000-4000-8000-000000000001' where store_id is null;

do $$
declare
  v_nulls bigint;
begin
  select
    (select count(*) from public.products where store_id is null)
    + (select count(*) from public.orders where store_id is null)
    + (select count(*) from public.store_settings where store_id is null)
    + (select count(*) from public.business_hours where store_id is null)
    + (select count(*) from public.promotions where store_id is null)
    + (select count(*) from public.add_ons where store_id is null)
    + (select count(*) from public.flavors where store_id is null)
    + (select count(*) from public.delivery_builder_options where store_id is null)
    + (select count(*) from public.public_order_rate_limits where store_id is null)
  into v_nulls;

  if v_nulls <> 0 then
    raise exception 'Falha no backfill multi-store: % registros sem store_id.', v_nulls;
  end if;
end;
$$;

drop function public.consume_public_order_rate_limit(text, integer, integer);

create or replace function public.consume_public_order_rate_limit(
  p_store_slug text,
  p_rate_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_row public.public_order_rate_limits;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'A função de limite público é exclusiva do servidor.';
  end if;

  select id into v_store_id
  from public.stores
  where slug = lower(trim(p_store_slug)) and active;
  if not found then
    raise exception using errcode = 'P0002', message = 'STORE_NOT_FOUND';
  end if;
  if p_rate_key !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_window_seconds < 1 then
    raise exception using errcode = '22023', message = 'Parâmetros de limite inválidos.';
  end if;

  insert into public.public_order_rate_limits (store_id, rate_key, window_started_at, request_count)
  values (v_store_id, p_rate_key, now(), 1)
  on conflict (store_id, rate_key) do update
  set
    window_started_at = case
      when public.public_order_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.public_order_rate_limits.window_started_at
    end,
    request_count = case
      when public.public_order_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.public_order_rate_limits.request_count + 1
    end
  returning * into v_row;

  return v_row.request_count <= p_limit;
end;
$$;

drop function public.create_public_order_with_tracking(text, jsonb, text);
drop function public.create_public_order(text, jsonb);

create or replace function public.create_public_order(
  p_store_slug text,
  p_idempotency_key text,
  p_request jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_settings public.store_settings;
  v_current_hour public.business_hours;
  v_previous_hour public.business_hours;
  v_now_local timestamp;
  v_current_time time;
  v_weekday smallint;
  v_previous_weekday smallint;
  v_within_hours boolean := false;
  v_payment_text text;
  v_payment_method public.payment_method;
  v_delivery_type public.delivery_type;
  v_customer_name text;
  v_phone text;
  v_address text;
  v_notes text;
  v_payload_hash text;
  v_existing public.orders;
  v_order public.orders;
  v_item jsonb;
  v_item_count integer;
  v_quantity integer;
  v_builder_type text;
  v_item_notes text;
  v_size public.delivery_builder_options;
  v_format public.delivery_builder_options;
  v_scoop public.delivery_builder_options;
  v_topping public.delivery_builder_options;
  v_flavor_count integer;
  v_flavor_distinct_count integer;
  v_add_on_count integer;
  v_add_on_distinct_count integer;
  v_add_on_paid_total numeric(10, 2);
  v_add_on_details jsonb;
  v_flavor_details jsonb;
  v_product public.products;
  v_promotion public.promotions;
  v_unit_price numeric(10, 2);
  v_item_subtotal numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_delivery_fee numeric(10, 2) := 0;
  v_name text;
  v_category public.product_category;
  v_details jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'A criação de pedidos públicos é exclusiva do servidor.';
  end if;

  select id into v_store_id
  from public.stores
  where slug = lower(trim(p_store_slug)) and active;
  if not found then raise exception using errcode = 'P0002', message = 'STORE_NOT_FOUND'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID';
  end if;
  if jsonb_typeof(p_request) <> 'object' or jsonb_typeof(p_request -> 'items') <> 'array' then
    raise exception using errcode = '22023', message = 'PAYLOAD_INVALID';
  end if;

  v_payload_hash := encode(extensions.digest(p_request::text, 'sha256'), 'hex');
  select * into v_existing
  from public.orders
  where store_id = v_store_id and origin = 'delivery' and idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_existing.idempotency_payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing;
  end if;

  select * into v_settings from public.store_settings where store_id = v_store_id for share;
  if not found then raise exception using errcode = 'P0002', message = 'STORE_CONFIGURATION_MISSING'; end if;
  if not v_settings.delivery_open or v_settings.closed_today then raise exception using errcode = 'P0001', message = 'STORE_CLOSED'; end if;
  if v_settings.pause_online_orders or v_settings.temporary_pause then raise exception using errcode = 'P0001', message = 'STORE_PAUSED'; end if;

  v_now_local := now() at time zone 'America/Sao_Paulo';
  v_current_time := v_now_local::time;
  v_weekday := extract(dow from v_now_local)::smallint;
  v_previous_weekday := ((v_weekday + 6) % 7)::smallint;
  select * into v_current_hour from public.business_hours where store_id = v_store_id and weekday = v_weekday;
  select * into v_previous_hour from public.business_hours where store_id = v_store_id and weekday = v_previous_weekday;
  if found and v_previous_hour.enabled and v_previous_hour.close_time < v_previous_hour.open_time and v_current_time <= v_previous_hour.close_time then v_within_hours := true; end if;
  if v_current_hour.enabled and ((v_current_hour.close_time >= v_current_hour.open_time and v_current_time between v_current_hour.open_time and v_current_hour.close_time) or (v_current_hour.close_time < v_current_hour.open_time and v_current_time >= v_current_hour.open_time)) then v_within_hours := true; end if;
  if not v_within_hours then raise exception using errcode = 'P0001', message = 'STORE_CLOSED'; end if;

  v_customer_name := trim(coalesce(p_request ->> 'customer_name', ''));
  v_phone := regexp_replace(coalesce(p_request ->> 'phone', ''), '\D', '', 'g');
  v_address := nullif(trim(coalesce(p_request ->> 'address', '')), '');
  v_notes := nullif(trim(coalesce(p_request ->> 'notes', '')), '');
  v_delivery_type := (p_request ->> 'delivery_type')::public.delivery_type;
  v_payment_text := p_request ->> 'payment_method';
  if length(v_customer_name) not between 2 and 100 or v_phone !~ '^\d{10,11}$' or (v_notes is not null and length(v_notes) > 500) then raise exception using errcode = '22023', message = 'PAYLOAD_INVALID'; end if;
  if v_delivery_type = 'pickup' and not v_settings.allow_pickup then raise exception using errcode = 'P0001', message = 'PICKUP_DISABLED'; end if;
  if v_delivery_type = 'delivery' and not v_settings.allow_delivery then raise exception using errcode = 'P0001', message = 'DELIVERY_DISABLED'; end if;
  if v_delivery_type = 'delivery' and (v_address is null or length(v_address) > 500) then raise exception using errcode = '22023', message = 'ADDRESS_REQUIRED'; end if;
  if v_payment_text not in ('Pix', 'Dinheiro', 'Cartão', 'A combinar') then raise exception using errcode = '22023', message = 'PAYMENT_METHOD_UNAVAILABLE'; end if;
  v_payment_method := v_payment_text::public.payment_method;
  if not (v_payment_method = any(v_settings.accepted_payment_methods)) then raise exception using errcode = 'P0001', message = 'PAYMENT_METHOD_UNAVAILABLE'; end if;
  v_item_count := jsonb_array_length(p_request -> 'items');
  if v_item_count not between 1 and 30 then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;

  begin
    insert into public.orders (
      store_id, customer_name, phone, notes, payment_method, payment_status,
      order_status, origin, delivery_type, address, subtotal, delivery_fee,
      discount, total, idempotency_key, idempotency_payload_hash
    ) values (
      v_store_id, v_customer_name, v_phone, v_notes, v_payment_method, 'pending',
      'new', 'delivery', v_delivery_type,
      case when v_delivery_type = 'delivery' then v_address else null end,
      0, 0, 0, 0, p_idempotency_key, v_payload_hash
    ) returning * into v_order;
  exception when unique_violation then
    select * into v_existing
    from public.orders
    where store_id = v_store_id and origin = 'delivery' and idempotency_key = p_idempotency_key;
    if found then
      if v_existing.idempotency_payload_hash <> v_payload_hash then raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT'; end if;
      return v_existing;
    end if;
    raise;
  end;

  for v_item in select value from jsonb_array_elements(p_request -> 'items') loop
    v_builder_type := v_item ->> 'builder_type';
    v_quantity := (v_item ->> 'quantity')::integer;
    v_item_notes := nullif(trim(coalesce(v_item ->> 'notes', '')), '');
    if v_quantity not between 1 and 20 or (v_item_notes is not null and length(v_item_notes) > 300) then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;
    v_unit_price := 0;
    v_name := '';
    v_category := null;
    v_details := jsonb_build_object('builderType', v_builder_type);

    if v_builder_type = 'acai' then
      select * into v_size from public.delivery_builder_options where store_id = v_store_id and id = (v_item ->> 'size_id')::uuid and builder_type = 'acai' and option_type = 'size' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      if jsonb_typeof(coalesce(v_item -> 'add_on_ids', '[]'::jsonb)) <> 'array' then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;
      select count(*), count(distinct value) into v_add_on_count, v_add_on_distinct_count from jsonb_array_elements_text(coalesce(v_item -> 'add_on_ids', '[]'::jsonb));
      if v_add_on_count <> v_add_on_distinct_count or v_add_on_count > 20 then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;
      select coalesce(sum(case when position > v_settings.free_add_ons_quantity then extra_price else 0 end), 0), coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'extraPrice', extra_price, 'included', position <= v_settings.free_add_ons_quantity) order by position), '[]'::jsonb)
      into v_add_on_paid_total, v_add_on_details
      from (
        select add_on.id, add_on.name, add_on.extra_price, row_number() over (order by add_on.display_order, add_on.id) as position
        from public.add_ons as add_on
        where add_on.store_id = v_store_id
          and add_on.id in (select value::uuid from jsonb_array_elements_text(coalesce(v_item -> 'add_on_ids', '[]'::jsonb)))
          and add_on.active and add_on.available
      ) as selected_add_on;
      if (select count(*) from jsonb_array_elements(v_add_on_details)) <> v_add_on_count then raise exception using errcode = 'P0001', message = 'ADD_ON_UNAVAILABLE'; end if;
      v_unit_price := round(v_size.price + v_add_on_paid_total, 2);
      v_name := 'Açaí ' || v_size.name;
      v_category := 'Açaí';
      v_details := v_details || jsonb_build_object('size', jsonb_build_object('id', v_size.id, 'name', v_size.name, 'price', v_size.price), 'addOns', v_add_on_details, 'freeAddOnsQuantity', v_settings.free_add_ons_quantity);
    elsif v_builder_type = 'ice_cream' then
      select * into v_format from public.delivery_builder_options where store_id = v_store_id and id = (v_item ->> 'format_id')::uuid and builder_type = 'ice_cream' and option_type = 'format' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      select * into v_scoop from public.delivery_builder_options where store_id = v_store_id and id = (v_item ->> 'scoop_id')::uuid and builder_type = 'ice_cream' and option_type = 'scoop' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      select * into v_topping from public.delivery_builder_options where store_id = v_store_id and id = (v_item ->> 'topping_id')::uuid and builder_type = 'ice_cream' and option_type = 'topping' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      if jsonb_typeof(v_item -> 'flavor_ids') <> 'array' then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;
      select count(*), count(distinct value) into v_flavor_count, v_flavor_distinct_count from jsonb_array_elements_text(v_item -> 'flavor_ids');
      if v_flavor_count <> v_scoop.max_flavors or v_flavor_count <> v_flavor_distinct_count then raise exception using errcode = '22023', message = 'FLAVORS_INVALID'; end if;
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'previewColor', preview_color) order by display_order, id), '[]'::jsonb)
      into v_flavor_details from public.flavors
      where store_id = v_store_id and id in (select value::uuid from jsonb_array_elements_text(v_item -> 'flavor_ids')) and product_type = 'ice_cream' and active and available;
      if (select count(*) from jsonb_array_elements(v_flavor_details)) <> v_flavor_count then raise exception using errcode = 'P0001', message = 'FLAVOR_UNAVAILABLE'; end if;
      v_unit_price := round(v_format.price + v_scoop.price + v_topping.price, 2);
      v_name := 'Sorvete ' || lower(v_format.name) || ' - ' || v_scoop.name;
      v_category := 'Sorvetes';
      v_details := v_details || jsonb_build_object('format', jsonb_build_object('id', v_format.id, 'name', v_format.name, 'price', v_format.price), 'scoop', jsonb_build_object('id', v_scoop.id, 'name', v_scoop.name, 'price', v_scoop.price, 'maxFlavors', v_scoop.max_flavors), 'flavors', v_flavor_details, 'topping', jsonb_build_object('id', v_topping.id, 'name', v_topping.name, 'price', v_topping.price));
    elsif v_builder_type = 'milkshake' then
      select * into v_size from public.delivery_builder_options where store_id = v_store_id and id = (v_item ->> 'size_id')::uuid and builder_type = 'milkshake' and option_type = 'size' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      if jsonb_typeof(v_item -> 'flavor_ids') <> 'array' then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;
      select count(*), count(distinct value) into v_flavor_count, v_flavor_distinct_count from jsonb_array_elements_text(v_item -> 'flavor_ids');
      if v_flavor_count <> 1 or v_flavor_count <> v_flavor_distinct_count then raise exception using errcode = '22023', message = 'FLAVORS_INVALID'; end if;
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'previewColor', preview_color) order by display_order, id), '[]'::jsonb)
      into v_flavor_details from public.flavors
      where store_id = v_store_id and id in (select value::uuid from jsonb_array_elements_text(v_item -> 'flavor_ids')) and product_type = 'milkshake' and active and available;
      if (select count(*) from jsonb_array_elements(v_flavor_details)) <> 1 then raise exception using errcode = 'P0001', message = 'FLAVOR_UNAVAILABLE'; end if;
      v_unit_price := v_size.price;
      v_name := 'Milk-shake ' || v_size.name;
      v_category := 'Milk-shakes';
      v_details := v_details || jsonb_build_object('size', jsonb_build_object('id', v_size.id, 'name', v_size.name, 'price', v_size.price), 'flavors', v_flavor_details);
    elsif v_builder_type = 'promotion' then
      select * into v_promotion from public.promotions where store_id = v_store_id and id = (v_item ->> 'promotion_id')::uuid and active and price > 0 and (valid_from is null or valid_from <= now()) and (valid_until is null or valid_until >= now());
      if not found then raise exception using errcode = 'P0001', message = 'PROMOTION_UNAVAILABLE'; end if;
      v_unit_price := v_promotion.price;
      v_name := v_promotion.title;
      v_category := 'Promoções';
      v_details := v_details || jsonb_build_object('promotion', jsonb_build_object('id', v_promotion.id, 'title', v_promotion.title, 'description', v_promotion.description, 'price', v_promotion.price));
    elsif v_builder_type = 'product' then
      select * into v_product from public.products where store_id = v_store_id and id = (v_item ->> 'product_id')::uuid and active and available_today;
      if not found then raise exception using errcode = 'P0001', message = 'PRODUCT_UNAVAILABLE'; end if;
      v_unit_price := v_product.price;
      v_name := v_product.name;
      v_category := v_product.category;
      v_details := v_details || jsonb_build_object('product', jsonb_build_object('id', v_product.id, 'name', v_product.name, 'price', v_product.price));
    else
      raise exception using errcode = '22023', message = 'ITEMS_INVALID';
    end if;

    v_item_subtotal := round(v_unit_price * v_quantity, 2);
    insert into public.order_items (order_id, product_id, product_name, category, quantity, unit_price, subtotal, details, notes)
    values (v_order.id, case when v_builder_type = 'product' then v_product.id else null end, v_name, v_category, v_quantity, v_unit_price, v_item_subtotal, v_details, v_item_notes);
    v_subtotal := round(v_subtotal + v_item_subtotal, 2);
  end loop;

  if v_delivery_type = 'delivery' then
    v_delivery_fee := v_settings.delivery_fee;
    if v_subtotal < v_settings.minimum_order then raise exception using errcode = 'P0001', message = 'MINIMUM_ORDER_NOT_REACHED'; end if;
  end if;
  update public.orders
  set subtotal = v_subtotal, delivery_fee = v_delivery_fee, discount = 0, total = round(v_subtotal + v_delivery_fee, 2)
  where id = v_order.id and store_id = v_store_id
  returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.create_public_order_with_tracking(
  p_store_slug text,
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

  v_order := public.create_public_order(p_store_slug, p_idempotency_key, p_request);
  v_token_hash := encode(extensions.digest(p_tracking_token, 'sha256'), 'hex');
  insert into public.order_public_tracking (order_id, token_hash)
  values (v_order.id, v_token_hash)
  on conflict (order_id) do nothing;

  select token_hash into v_existing_hash from public.order_public_tracking where order_id = v_order.id;
  if v_existing_hash <> v_token_hash then
    raise exception using errcode = '23505', message = 'TRACKING_TOKEN_CONFLICT';
  end if;
  return v_order;
end;
$$;

drop function public.get_public_order_tracking(text, text);

create or replace function public.get_public_order_tracking(
  p_store_slug text,
  p_public_code text,
  p_tracking_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_order public.orders;
  v_token_hash text;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'O acompanhamento público é exclusivo do servidor.';
  end if;
  select id into v_store_id from public.stores where slug = lower(trim(p_store_slug)) and active;
  if not found or p_public_code !~ '^M[0-9A-F]{12}$' or p_tracking_token !~ '^[A-Za-z0-9_-]{32,128}$' then
    raise exception using errcode = '22023', message = 'TRACKING_NOT_FOUND';
  end if;
  v_token_hash := encode(extensions.digest(p_tracking_token, 'sha256'), 'hex');
  select orders.* into v_order
  from public.orders
  join public.order_public_tracking as tracking on tracking.order_id = orders.id
  where orders.store_id = v_store_id
    and orders.public_code = upper(p_public_code)
    and tracking.token_hash = v_token_hash;
  if not found then raise exception using errcode = 'P0002', message = 'TRACKING_NOT_FOUND'; end if;

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
      select jsonb_agg(jsonb_build_object('name', item.product_name, 'quantity', item.quantity, 'subtotal', item.subtotal) order by item.created_at)
      from public.order_items as item where item.order_id = v_order.id
    ), '[]'::jsonb)
  );
end;
$$;

alter table public.products alter column store_id set not null;
alter table public.orders alter column store_id set not null;
alter table public.store_settings alter column store_id set not null;
alter table public.business_hours alter column store_id set not null;
alter table public.promotions alter column store_id set not null;
alter table public.add_ons alter column store_id set not null;
alter table public.flavors alter column store_id set not null;
alter table public.delivery_builder_options alter column store_id set not null;
alter table public.public_order_rate_limits alter column store_id set not null;

alter table public.products add constraint products_store_id_fkey foreign key (store_id) references public.stores(id) on delete restrict;
alter table public.orders add constraint orders_store_id_fkey foreign key (store_id) references public.stores(id) on delete restrict;
alter table public.store_settings add constraint store_settings_store_id_fkey foreign key (store_id) references public.stores(id) on delete restrict;
alter table public.business_hours add constraint business_hours_store_id_fkey foreign key (store_id) references public.stores(id) on delete restrict;
alter table public.promotions add constraint promotions_store_id_fkey foreign key (store_id) references public.stores(id) on delete restrict;
alter table public.add_ons add constraint add_ons_store_id_fkey foreign key (store_id) references public.stores(id) on delete restrict;
alter table public.flavors add constraint flavors_store_id_fkey foreign key (store_id) references public.stores(id) on delete restrict;
alter table public.delivery_builder_options add constraint delivery_builder_options_store_id_fkey foreign key (store_id) references public.stores(id) on delete restrict;
alter table public.public_order_rate_limits add constraint public_order_rate_limits_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;

alter table public.store_settings drop constraint store_settings_pkey;
alter table public.store_settings drop constraint store_settings_id_check;
alter table public.store_settings drop column id;
alter table public.store_settings add primary key (store_id);

alter table public.business_hours drop constraint business_hours_weekday_key;
alter table public.business_hours add constraint business_hours_store_weekday_key unique (store_id, weekday);

alter table public.delivery_builder_options drop constraint delivery_builder_options_unique_code;
alter table public.delivery_builder_options
  add constraint delivery_builder_options_store_code_key unique (store_id, builder_type, option_type, code);

alter table public.public_order_rate_limits drop constraint public_order_rate_limits_pkey;
alter table public.public_order_rate_limits add primary key (store_id, rate_key);

drop index public.orders_delivery_idempotency_key_uidx;
create unique index orders_store_delivery_idempotency_key_uidx
  on public.orders (store_id, idempotency_key)
  where origin = 'delivery' and idempotency_key is not null;

drop index public.add_ons_name_unique_idx;
drop index public.flavors_product_type_name_unique_idx;
drop index public.products_name_unique_idx;
drop index public.promotions_title_unique_idx;
drop index public.promotions_single_featured_home_idx;

create unique index add_ons_store_name_unique_idx on public.add_ons (store_id, name);
create unique index flavors_store_product_type_name_unique_idx on public.flavors (store_id, product_type, name);
create unique index products_store_name_unique_idx on public.products (store_id, name);
create unique index promotions_store_title_unique_idx on public.promotions (store_id, title);
create unique index promotions_store_single_featured_home_idx
  on public.promotions (store_id, featured_on_home)
  where active and featured_on_home;

drop index public.orders_created_at_desc_idx;
drop index public.orders_order_status_idx;
drop index public.orders_payment_status_idx;
drop index public.orders_phone_idx;
drop index public.orders_origin_idx;
drop index public.orders_active_queue_idx;
drop index public.products_active_available_today_idx;
drop index public.promotions_active_valid_until_idx;
drop index public.flavors_product_type_active_available_idx;
drop index public.delivery_builder_options_available_idx;

create index orders_store_created_at_desc_idx on public.orders (store_id, created_at desc);
create index orders_store_order_status_idx on public.orders (store_id, order_status);
create index orders_store_payment_status_idx on public.orders (store_id, payment_status);
create index orders_store_phone_idx on public.orders (store_id, phone);
create index orders_store_origin_idx on public.orders (store_id, origin);
create index orders_store_active_queue_idx
  on public.orders (store_id, order_status, payment_status, created_at desc)
  where order_status <> 'canceled';
create index products_store_available_idx on public.products (store_id, active, available_today, display_order);
create index promotions_store_active_valid_until_idx on public.promotions (store_id, active, valid_until);
create index flavors_store_available_idx on public.flavors (store_id, product_type, active, available);
create index delivery_builder_options_store_available_idx
  on public.delivery_builder_options (store_id, builder_type, option_type, active, available);

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
      and store.active = true
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
      and store.active = true
  );
$$;

create or replace function public.can_access_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders as orders
    where orders.id = p_order_id
      and public.can_access_store(orders.store_id)
  );
$$;

create or replace function public.is_owner_of_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders as orders
    where orders.id = p_order_id
      and public.is_owner_of_store(orders.store_id)
  );
$$;

drop function public.create_internal_order(text, public.payment_method, jsonb, text, text, public.payment_status, public.delivery_type, text, numeric, numeric);

create function public.create_internal_order(
  p_store_id uuid,
  p_customer_name text,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_phone text,
  p_notes text,
  p_payment_status public.payment_status,
  p_delivery_type public.delivery_type,
  p_address text,
  p_delivery_fee numeric,
  p_discount numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
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
  if not public.can_access_store(p_store_id) then
    raise exception 'Usuário sem permissão para criar pedidos nesta loja.' using errcode = '42501';
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
    store_id, customer_name, phone, notes, payment_method, payment_status,
    order_status, origin, delivery_type, address, subtotal, delivery_fee,
    discount, total, created_by
  ) values (
    p_store_id, trim(p_customer_name), nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''), p_payment_method, p_payment_status,
    'new', 'internal', p_delivery_type, nullif(trim(coalesce(p_address, '')), ''),
    0, 0, 0, 0, auth.uid()
  ) returning id into v_order_id;

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
      select * into v_product
      from public.products
      where id = v_product_id and store_id = p_store_id and active = true;
      if not found then
        raise exception 'Produto informado não está disponível nesta loja.' using errcode = '23503';
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
      order_id, product_id, product_name, category, quantity, unit_price, subtotal, details, notes
    ) values (
      v_order_id, v_product_id, v_product_name, v_category, v_quantity,
      round(v_unit_price, 2), v_item_subtotal, v_details,
      nullif(trim(coalesce(v_item->>'notes', '')), '')
    );
  end loop;

  if v_subtotal + p_delivery_fee - p_discount < 0 then
    raise exception 'Total do pedido não pode ser negativo.' using errcode = '23514';
  end if;

  update public.orders
  set subtotal = round(v_subtotal, 2),
      delivery_fee = round(p_delivery_fee, 2),
      discount = round(p_discount, 2),
      total = round(v_subtotal + p_delivery_fee - p_discount, 2)
  where id = v_order_id and store_id = p_store_id;

  return v_order_id;
end;
$$;

drop function public.update_order_status(uuid, public.order_status, text);

create function public.update_order_status(
  p_store_id uuid,
  p_order_id uuid,
  p_new_status public.order_status,
  p_cancellation_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_updated public.orders%rowtype;
  v_allowed boolean;
begin
  if not public.can_access_store(p_store_id) then
    raise exception 'Usuário sem permissão para atualizar pedidos nesta loja.' using errcode = '42501';
  end if;
  select * into v_order from public.orders
  where id = p_order_id and store_id = p_store_id for update;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  if v_order.order_status = p_new_status then return v_order; end if;

  v_allowed :=
    (v_order.order_status = 'new' and p_new_status = 'preparing')
    or (v_order.order_status = 'preparing' and p_new_status = 'ready')
    or (v_order.order_status = 'ready' and p_new_status = 'delivered')
    or (v_order.order_status in ('new', 'preparing', 'ready') and p_new_status = 'canceled');
  if not v_allowed then raise exception 'Transição de status não permitida.' using errcode = '23514'; end if;
  if p_new_status = 'canceled' and length(trim(coalesce(p_cancellation_reason, ''))) = 0 then
    raise exception 'Motivo do cancelamento é obrigatório.' using errcode = '23514';
  end if;

  update public.orders
  set order_status = p_new_status,
      cancellation_reason = case when p_new_status = 'canceled' then trim(p_cancellation_reason) else cancellation_reason end,
      accepted_at = case when p_new_status in ('preparing', 'ready', 'delivered') then coalesce(accepted_at, now()) else accepted_at end,
      preparing_at = case when p_new_status = 'preparing' then coalesce(preparing_at, now()) else preparing_at end,
      ready_at = case when p_new_status = 'ready' then coalesce(ready_at, now()) else ready_at end,
      completed_at = case when p_new_status = 'delivered' then coalesce(completed_at, now()) else completed_at end,
      canceled_at = case when p_new_status = 'canceled' then coalesce(canceled_at, now()) else canceled_at end
  where id = p_order_id and store_id = p_store_id
  returning * into v_updated;
  return v_updated;
end;
$$;

drop function public.update_payment_status(uuid, public.payment_status);

create function public.update_payment_status(
  p_store_id uuid,
  p_order_id uuid,
  p_payment_status public.payment_status
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_updated public.orders%rowtype;
begin
  if not public.can_access_store(p_store_id) then
    raise exception 'Usuário sem permissão para atualizar pagamentos nesta loja.' using errcode = '42501';
  end if;
  select * into v_order from public.orders
  where id = p_order_id and store_id = p_store_id for update;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  if v_order.payment_status = p_payment_status then return v_order; end if;
  if v_order.payment_status = 'paid' and p_payment_status = 'pending' and not public.is_owner_of_store(p_store_id) then
    raise exception 'Somente owner pode reabrir pagamento como pendente.' using errcode = '42501';
  end if;
  if v_order.payment_status = 'pending' and p_payment_status <> 'paid' then
    raise exception 'Transição de pagamento não permitida.' using errcode = '23514';
  end if;
  update public.orders set payment_status = p_payment_status
  where id = p_order_id and store_id = p_store_id returning * into v_updated;
  return v_updated;
end;
$$;

drop function public.cancel_order(uuid, text);

create function public.cancel_order(
  p_store_id uuid,
  p_order_id uuid,
  p_cancellation_reason text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.order_status;
begin
  if not public.can_access_store(p_store_id) then
    raise exception 'Usuário sem permissão para cancelar pedidos nesta loja.' using errcode = '42501';
  end if;
  select order_status into v_status from public.orders
  where id = p_order_id and store_id = p_store_id;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  if v_status = 'delivered' then
    raise exception 'Pedidos entregues não podem ser cancelados pelo fluxo comum.' using errcode = '23514';
  end if;
  if v_status = 'canceled' then raise exception 'Pedido já está cancelado.' using errcode = '23514'; end if;
  return public.update_order_status(p_store_id, p_order_id, 'canceled'::public.order_status, p_cancellation_reason);
end;
$$;

drop function public.save_store_configuration(jsonb, jsonb, jsonb, jsonb, jsonb);

create function public.save_store_configuration(
  p_store_id uuid,
  p_settings jsonb,
  p_business_hours jsonb,
  p_promotions jsonb,
  p_add_ons jsonb,
  p_flavors jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage text := 'store_settings';
  v_error_message text;
begin
  if not public.is_owner_of_store(p_store_id) then
    raise exception using errcode = '42501', message = 'Apenas um owner desta loja pode salvar as configurações.';
  end if;
  if jsonb_typeof(p_settings) <> 'object'
    or jsonb_typeof(p_business_hours) <> 'array'
    or jsonb_typeof(p_promotions) <> 'array'
    or jsonb_typeof(p_add_ons) <> 'array'
    or jsonb_typeof(p_flavors) <> 'array' then
    raise exception using errcode = '22023', message = 'Payload de configuração inválido.';
  end if;

  update public.store_settings
  set delivery_open = (p_settings ->> 'delivery_open')::boolean,
      pause_online_orders = (p_settings ->> 'pause_online_orders')::boolean,
      temporary_pause = (p_settings ->> 'temporary_pause')::boolean,
      closed_today = (p_settings ->> 'closed_today')::boolean,
      closed_message = p_settings ->> 'closed_message',
      allow_pickup = (p_settings ->> 'allow_pickup')::boolean,
      allow_delivery = (p_settings ->> 'allow_delivery')::boolean,
      delivery_fee = (p_settings ->> 'delivery_fee')::numeric,
      minimum_order = (p_settings ->> 'minimum_order')::numeric,
      free_add_ons_quantity = (p_settings ->> 'free_add_ons_quantity')::integer,
      accepted_payment_methods = array(
        select value::public.payment_method
        from jsonb_array_elements_text(p_settings -> 'accepted_payment_methods')
      ),
      pix_key = p_settings ->> 'pix_key',
      payment_note = p_settings ->> 'payment_note',
      whatsapp = p_settings ->> 'whatsapp',
      instagram = p_settings ->> 'instagram',
      address = p_settings ->> 'address',
      headline = p_settings ->> 'headline',
      subtitle = p_settings ->> 'subtitle',
      displayed_hours = p_settings ->> 'displayed_hours',
      config_version = (p_settings ->> 'config_version')::integer
  where store_id = p_store_id;
  if not found then raise exception using errcode = 'P0002', message = 'A configuração da loja não foi encontrada.'; end if;

  if exists (
    select 1 from public.promotions as existing
    where existing.store_id <> p_store_id
      and existing.id in (select (item ->> 'id')::uuid from jsonb_array_elements(p_promotions) as item)
  ) or exists (
    select 1 from public.add_ons as existing
    where existing.store_id <> p_store_id
      and existing.id in (select (item ->> 'id')::uuid from jsonb_array_elements(p_add_ons) as item)
  ) or exists (
    select 1 from public.flavors as existing
    where existing.store_id <> p_store_id
      and existing.id in (select (item ->> 'id')::uuid from jsonb_array_elements(p_flavors) as item)
  ) then
    raise exception using errcode = '42501', message = 'O payload contém recursos de outra loja.';
  end if;

  v_stage := 'business_hours';
  insert into public.business_hours (store_id, weekday, enabled, open_time, close_time)
  select p_store_id, weekday, enabled, open_time, close_time
  from jsonb_to_recordset(p_business_hours) as item(weekday smallint, enabled boolean, open_time time, close_time time)
  on conflict (store_id, weekday) do update
  set enabled = excluded.enabled, open_time = excluded.open_time, close_time = excluded.close_time;

  v_stage := 'promotions';
  update public.promotions set featured_on_home = false
  where store_id = p_store_id and featured_on_home = true;
  insert into public.promotions (
    id, store_id, title, description, price, active, featured_on_home,
    valid_from, valid_until, image_url, display_order
  )
  select id, p_store_id, title, description, price, active, featured_on_home,
    valid_from, valid_until, image_url, display_order
  from jsonb_to_recordset(p_promotions) as item(
    id uuid, title text, description text, price numeric, active boolean,
    featured_on_home boolean, valid_from timestamptz, valid_until timestamptz,
    image_url text, display_order integer
  )
  on conflict (id) do update
  set title = excluded.title, description = excluded.description, price = excluded.price,
      active = excluded.active, featured_on_home = excluded.featured_on_home,
      valid_from = excluded.valid_from, valid_until = excluded.valid_until,
      image_url = excluded.image_url, display_order = excluded.display_order
  where promotions.store_id = p_store_id;
  delete from public.promotions as existing
  where existing.store_id = p_store_id
    and not exists (select 1 from jsonb_array_elements(p_promotions) as item where (item ->> 'id')::uuid = existing.id);

  v_stage := 'add_ons';
  insert into public.add_ons (id, store_id, name, active, available, extra_price, display_order)
  select id, p_store_id, name, active, available, extra_price, display_order
  from jsonb_to_recordset(p_add_ons) as item(
    id uuid, name text, active boolean, available boolean, extra_price numeric, display_order integer
  )
  on conflict (id) do update
  set name = excluded.name, active = excluded.active, available = excluded.available,
      extra_price = excluded.extra_price, display_order = excluded.display_order
  where add_ons.store_id = p_store_id;
  delete from public.add_ons as existing
  where existing.store_id = p_store_id
    and not exists (select 1 from jsonb_array_elements(p_add_ons) as item where (item ->> 'id')::uuid = existing.id);

  v_stage := 'flavors';
  insert into public.flavors (id, store_id, name, product_type, active, available, preview_color, display_order)
  select id, p_store_id, name, product_type, active, available, preview_color, display_order
  from jsonb_to_recordset(p_flavors) as item(
    id uuid, name text, product_type public.flavor_product_type, active boolean,
    available boolean, preview_color text, display_order integer
  )
  on conflict (id) do update
  set name = excluded.name, product_type = excluded.product_type, active = excluded.active,
      available = excluded.available, preview_color = excluded.preview_color,
      display_order = excluded.display_order
  where flavors.store_id = p_store_id;
  delete from public.flavors as existing
  where existing.store_id = p_store_id
    and not exists (select 1 from jsonb_array_elements(p_flavors) as item where (item ->> 'id')::uuid = existing.id);
exception
  when others then
    get stacked diagnostics v_error_message = message_text;
    raise exception using errcode = sqlstate, message = format('Falha em %s: %s', v_stage, v_error_message);
end;
$$;

alter table public.stores enable row level security;
alter table public.profile_stores enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'stores', 'profile_stores', 'products', 'orders', 'order_items',
        'order_status_history', 'store_settings', 'business_hours',
        'promotions', 'add_ons', 'flavors', 'delivery_builder_options'
      ])
  loop
    execute format('drop policy %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end;
$$;

create policy stores_member_select
on public.stores for select to authenticated
using (public.can_access_store(id));

create policy profile_stores_self_select
on public.profile_stores for select to authenticated
using (profile_id = auth.uid());

create policy products_member_select
on public.products for select to authenticated
using (public.can_access_store(store_id));
create policy products_owner_insert
on public.products for insert to authenticated
with check (public.is_owner_of_store(store_id));
create policy products_owner_update
on public.products for update to authenticated
using (public.is_owner_of_store(store_id))
with check (public.is_owner_of_store(store_id));
create policy products_owner_delete
on public.products for delete to authenticated
using (public.is_owner_of_store(store_id));

create policy orders_member_select
on public.orders for select to authenticated
using (public.can_access_store(store_id));
create policy orders_owner_insert
on public.orders for insert to authenticated
with check (public.is_owner_of_store(store_id));
create policy orders_owner_update
on public.orders for update to authenticated
using (public.is_owner_of_store(store_id))
with check (public.is_owner_of_store(store_id));
create policy orders_owner_delete
on public.orders for delete to authenticated
using (public.is_owner_of_store(store_id));

create policy order_items_member_select
on public.order_items for select to authenticated
using (public.can_access_order(order_id));
create policy order_items_owner_insert
on public.order_items for insert to authenticated
with check (public.is_owner_of_order(order_id));
create policy order_items_owner_update
on public.order_items for update to authenticated
using (public.is_owner_of_order(order_id))
with check (public.is_owner_of_order(order_id));
create policy order_items_owner_delete
on public.order_items for delete to authenticated
using (public.is_owner_of_order(order_id));

create policy order_status_history_member_select
on public.order_status_history for select to authenticated
using (public.can_access_order(order_id));

create policy store_settings_member_select
on public.store_settings for select to authenticated
using (public.can_access_store(store_id));
create policy store_settings_owner_update
on public.store_settings for update to authenticated
using (public.is_owner_of_store(store_id))
with check (public.is_owner_of_store(store_id));

create policy business_hours_member_select
on public.business_hours for select to authenticated
using (public.can_access_store(store_id));
create policy business_hours_owner_insert
on public.business_hours for insert to authenticated
with check (public.is_owner_of_store(store_id));
create policy business_hours_owner_update
on public.business_hours for update to authenticated
using (public.is_owner_of_store(store_id))
with check (public.is_owner_of_store(store_id));
create policy business_hours_owner_delete
on public.business_hours for delete to authenticated
using (public.is_owner_of_store(store_id));

create policy promotions_member_select
on public.promotions for select to authenticated
using (public.can_access_store(store_id));
create policy promotions_owner_insert
on public.promotions for insert to authenticated
with check (public.is_owner_of_store(store_id));
create policy promotions_owner_update
on public.promotions for update to authenticated
using (public.is_owner_of_store(store_id))
with check (public.is_owner_of_store(store_id));
create policy promotions_owner_delete
on public.promotions for delete to authenticated
using (public.is_owner_of_store(store_id));

create policy add_ons_member_select
on public.add_ons for select to authenticated
using (public.can_access_store(store_id));
create policy add_ons_owner_insert
on public.add_ons for insert to authenticated
with check (public.is_owner_of_store(store_id));
create policy add_ons_owner_update
on public.add_ons for update to authenticated
using (public.is_owner_of_store(store_id))
with check (public.is_owner_of_store(store_id));
create policy add_ons_owner_delete
on public.add_ons for delete to authenticated
using (public.is_owner_of_store(store_id));

create policy flavors_member_select
on public.flavors for select to authenticated
using (public.can_access_store(store_id));
create policy flavors_owner_insert
on public.flavors for insert to authenticated
with check (public.is_owner_of_store(store_id));
create policy flavors_owner_update
on public.flavors for update to authenticated
using (public.is_owner_of_store(store_id))
with check (public.is_owner_of_store(store_id));
create policy flavors_owner_delete
on public.flavors for delete to authenticated
using (public.is_owner_of_store(store_id));

create policy delivery_builder_options_member_select
on public.delivery_builder_options for select to authenticated
using (public.can_access_store(store_id));
create policy delivery_builder_options_owner_insert
on public.delivery_builder_options for insert to authenticated
with check (public.is_owner_of_store(store_id));
create policy delivery_builder_options_owner_update
on public.delivery_builder_options for update to authenticated
using (public.is_owner_of_store(store_id))
with check (public.is_owner_of_store(store_id));
create policy delivery_builder_options_owner_delete
on public.delivery_builder_options for delete to authenticated
using (public.is_owner_of_store(store_id));

create view public.public_store_settings
with (security_invoker = false)
as
select
  settings.store_id,
  store.slug as store_slug,
  settings.delivery_open,
  settings.pause_online_orders,
  settings.closed_today,
  settings.temporary_pause,
  settings.closed_message,
  settings.address,
  settings.whatsapp,
  settings.instagram,
  settings.delivery_fee,
  settings.minimum_order,
  settings.allow_pickup,
  settings.allow_delivery,
  settings.accepted_payment_methods,
  settings.free_add_ons_quantity,
  settings.headline,
  settings.subtitle,
  settings.displayed_hours,
  settings.config_version,
  settings.updated_at
from public.store_settings as settings
join public.stores as store on store.id = settings.store_id;

revoke all on table public.stores, public.profile_stores from public, anon, authenticated;
revoke all on table
  public.products, public.orders, public.order_items, public.order_status_history,
  public.store_settings, public.business_hours, public.promotions, public.add_ons,
  public.flavors, public.delivery_builder_options, public.public_order_rate_limits,
  public.order_public_tracking, public.public_store_settings
from anon;
revoke all on table public.public_order_rate_limits, public.order_public_tracking, public.public_store_settings
from authenticated;

grant select on public.stores, public.profile_stores to authenticated;
grant select on table
  public.products, public.orders, public.order_items, public.order_status_history,
  public.store_settings, public.business_hours, public.promotions, public.add_ons,
  public.flavors, public.delivery_builder_options
to authenticated;
grant insert, update, delete on table
  public.products, public.orders, public.order_items, public.business_hours,
  public.promotions, public.add_ons, public.flavors, public.delivery_builder_options
to authenticated;
grant update on public.store_settings to authenticated;
grant select on public.public_store_settings to service_role;

revoke all on function public.can_access_store(uuid) from public, anon;
revoke all on function public.is_owner_of_store(uuid) from public, anon;
revoke all on function public.can_access_order(uuid) from public, anon;
revoke all on function public.is_owner_of_order(uuid) from public, anon;
revoke all on function public.attach_new_profile_to_sorveteria() from public, anon, authenticated;
grant execute on function public.can_access_store(uuid) to authenticated;
grant execute on function public.is_owner_of_store(uuid) to authenticated;
grant execute on function public.can_access_order(uuid) to authenticated;
grant execute on function public.is_owner_of_order(uuid) to authenticated;

revoke all on function public.create_internal_order(uuid, text, public.payment_method, jsonb, text, text, public.payment_status, public.delivery_type, text, numeric, numeric) from public, anon;
revoke all on function public.update_order_status(uuid, uuid, public.order_status, text) from public, anon;
revoke all on function public.update_payment_status(uuid, uuid, public.payment_status) from public, anon;
revoke all on function public.cancel_order(uuid, uuid, text) from public, anon;
revoke all on function public.save_store_configuration(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.create_internal_order(uuid, text, public.payment_method, jsonb, text, text, public.payment_status, public.delivery_type, text, numeric, numeric) to authenticated;
grant execute on function public.update_order_status(uuid, uuid, public.order_status, text) to authenticated;
grant execute on function public.update_payment_status(uuid, uuid, public.payment_status) to authenticated;
grant execute on function public.cancel_order(uuid, uuid, text) to authenticated;
grant execute on function public.save_store_configuration(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

revoke all on function public.consume_public_order_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.create_public_order(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.create_public_order_with_tracking(text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.get_public_order_tracking(text, text, text) from public, anon, authenticated;
grant execute on function public.consume_public_order_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.create_public_order(text, text, jsonb) to service_role;
grant execute on function public.create_public_order_with_tracking(text, text, jsonb, text) to service_role;
grant execute on function public.get_public_order_tracking(text, text, text) to service_role;

comment on table public.stores is 'Cadastro central das operações atendidas pela plataforma.';
comment on table public.profile_stores is 'Associa usuários autenticados às lojas que podem acessar.';
comment on view public.public_store_settings is 'Configuração pública consumida somente pelo Route Handler server-side da loja.';
comment on function public.create_public_order(text, text, jsonb) is 'Cria pedido público na loja resolvida pelo servidor, com validação e idempotência por loja.';
comment on function public.get_public_order_tracking(text, text, text) is 'Retorna o acompanhamento somente quando loja, código e token pertencem ao mesmo pedido.';

notify pgrst, 'reload schema';
