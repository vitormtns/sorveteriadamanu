create table public.delivery_builder_options (
  id uuid primary key default gen_random_uuid(),
  builder_type text not null check (builder_type in ('acai', 'ice_cream', 'milkshake')),
  option_type text not null check (option_type in ('size', 'format', 'scoop', 'topping')),
  code text not null check (code ~ '^[a-z0-9_-]{2,64}$'),
  name text not null check (length(trim(name)) > 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  max_flavors smallint check (max_flavors is null or max_flavors > 0),
  active boolean not null default true,
  available boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_builder_options_unique_code unique (builder_type, option_type, code)
);

alter table public.orders
  add column idempotency_key text,
  add column idempotency_payload_hash text,
  add constraint orders_public_idempotency_pair check (
    origin <> 'delivery'
    or (idempotency_key is not null and idempotency_payload_hash is not null)
  );

create unique index orders_delivery_idempotency_key_uidx
  on public.orders (idempotency_key)
  where origin = 'delivery' and idempotency_key is not null;

create index delivery_builder_options_available_idx
  on public.delivery_builder_options (builder_type, option_type, active, available);

create table public.public_order_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create trigger delivery_builder_options_set_updated_at
before update on public.delivery_builder_options
for each row execute function public.set_updated_at();

create trigger public_order_rate_limits_set_updated_at
before update on public.public_order_rate_limits
for each row execute function public.set_updated_at();

alter table public.delivery_builder_options enable row level security;
alter table public.public_order_rate_limits enable row level security;

create policy "delivery_builder_options_public_select_available"
on public.delivery_builder_options for select
using (active = true and available = true);

create policy "delivery_builder_options_owner_insert"
on public.delivery_builder_options for insert
with check (public.is_owner());

create policy "delivery_builder_options_owner_update"
on public.delivery_builder_options for update
using (public.is_owner())
with check (public.is_owner());

create policy "delivery_builder_options_owner_delete"
on public.delivery_builder_options for delete
using (public.is_owner());

create or replace function public.consume_public_order_rate_limit(
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
  v_row public.public_order_rate_limits;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'A função de limite público é exclusiva do servidor.';
  end if;

  if p_rate_key !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_window_seconds < 1 then
    raise exception using errcode = '22023', message = 'Parâmetros de limite inválidos.';
  end if;

  insert into public.public_order_rate_limits (rate_key, window_started_at, request_count)
  values (p_rate_key, now(), 1)
  on conflict (rate_key) do update
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

create or replace function public.create_public_order(
  p_idempotency_key text,
  p_request jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
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
  v_item_index integer := 0;
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

  if p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID';
  end if;
  if jsonb_typeof(p_request) <> 'object' or jsonb_typeof(p_request -> 'items') <> 'array' then
    raise exception using errcode = '22023', message = 'PAYLOAD_INVALID';
  end if;

  v_payload_hash := encode(extensions.digest(p_request::text, 'sha256'), 'hex');
  select * into v_existing
  from public.orders
  where origin = 'delivery' and idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_existing.idempotency_payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing;
  end if;

  select * into v_settings from public.store_settings where id = true for share;
  if not found then
    raise exception using errcode = 'P0002', message = 'STORE_CONFIGURATION_MISSING';
  end if;
  if not v_settings.delivery_open or v_settings.closed_today then
    raise exception using errcode = 'P0001', message = 'STORE_CLOSED';
  end if;
  if v_settings.pause_online_orders or v_settings.temporary_pause then
    raise exception using errcode = 'P0001', message = 'STORE_PAUSED';
  end if;

  v_now_local := now() at time zone 'America/Sao_Paulo';
  v_current_time := v_now_local::time;
  v_weekday := extract(dow from v_now_local)::smallint;
  v_previous_weekday := ((v_weekday + 6) % 7)::smallint;
  select * into v_current_hour from public.business_hours where weekday = v_weekday;
  select * into v_previous_hour from public.business_hours where weekday = v_previous_weekday;
  if found and v_previous_hour.enabled and v_previous_hour.close_time < v_previous_hour.open_time
    and v_current_time <= v_previous_hour.close_time then
    v_within_hours := true;
  end if;
  if v_current_hour.enabled and (
    (v_current_hour.close_time >= v_current_hour.open_time and v_current_time between v_current_hour.open_time and v_current_hour.close_time)
    or (v_current_hour.close_time < v_current_hour.open_time and v_current_time >= v_current_hour.open_time)
  ) then
    v_within_hours := true;
  end if;
  if not v_within_hours then
    raise exception using errcode = 'P0001', message = 'STORE_CLOSED';
  end if;

  v_customer_name := trim(coalesce(p_request ->> 'customer_name', ''));
  v_phone := regexp_replace(coalesce(p_request ->> 'phone', ''), '\D', '', 'g');
  v_address := nullif(trim(coalesce(p_request ->> 'address', '')), '');
  v_notes := nullif(trim(coalesce(p_request ->> 'notes', '')), '');
  v_delivery_type := (p_request ->> 'delivery_type')::public.delivery_type;
  v_payment_text := p_request ->> 'payment_method';
  if length(v_customer_name) not between 2 and 100 or v_phone !~ '^\d{10,11}$'
    or (v_notes is not null and length(v_notes) > 500) then
    raise exception using errcode = '22023', message = 'PAYLOAD_INVALID';
  end if;
  if v_delivery_type = 'pickup' and not v_settings.allow_pickup then
    raise exception using errcode = 'P0001', message = 'PICKUP_DISABLED';
  end if;
  if v_delivery_type = 'delivery' and not v_settings.allow_delivery then
    raise exception using errcode = 'P0001', message = 'DELIVERY_DISABLED';
  end if;
  if v_delivery_type = 'delivery' and (v_address is null or length(v_address) > 500) then
    raise exception using errcode = '22023', message = 'ADDRESS_REQUIRED';
  end if;
  if v_payment_text not in ('Pix', 'Dinheiro', 'Cartão', 'A combinar') then
    raise exception using errcode = '22023', message = 'PAYMENT_METHOD_UNAVAILABLE';
  end if;
  v_payment_method := v_payment_text::public.payment_method;
  if not (v_payment_method = any(v_settings.accepted_payment_methods)) then
    raise exception using errcode = 'P0001', message = 'PAYMENT_METHOD_UNAVAILABLE';
  end if;

  v_item_count := jsonb_array_length(p_request -> 'items');
  if v_item_count not between 1 and 30 then
    raise exception using errcode = '22023', message = 'ITEMS_INVALID';
  end if;

  begin
    insert into public.orders (
      customer_name, phone, notes, payment_method, payment_status, order_status,
      origin, delivery_type, address, subtotal, delivery_fee, discount, total,
      idempotency_key, idempotency_payload_hash
    ) values (
      v_customer_name, v_phone, v_notes, v_payment_method, 'pending', 'new',
      'delivery', v_delivery_type, case when v_delivery_type = 'delivery' then v_address else null end,
      0, 0, 0, 0, p_idempotency_key, v_payload_hash
    ) returning * into v_order;
  exception when unique_violation then
    select * into v_existing from public.orders
    where origin = 'delivery' and idempotency_key = p_idempotency_key;
    if found then
      if v_existing.idempotency_payload_hash <> v_payload_hash then
        raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT';
      end if;
      return v_existing;
    end if;
    raise;
  end;

  for v_item in select value from jsonb_array_elements(p_request -> 'items') loop
    v_item_index := v_item_index + 1;
    v_builder_type := v_item ->> 'builder_type';
    v_quantity := (v_item ->> 'quantity')::integer;
    v_item_notes := nullif(trim(coalesce(v_item ->> 'notes', '')), '');
    if v_quantity not between 1 and 20 or (v_item_notes is not null and length(v_item_notes) > 300) then
      raise exception using errcode = '22023', message = 'ITEMS_INVALID';
    end if;

    v_unit_price := 0;
    v_name := '';
    v_category := null;
    v_details := jsonb_build_object('builderType', v_builder_type);

    if v_builder_type = 'acai' then
      select * into v_size from public.delivery_builder_options
      where id = (v_item ->> 'size_id')::uuid and builder_type = 'acai' and option_type = 'size' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      if jsonb_typeof(coalesce(v_item -> 'add_on_ids', '[]'::jsonb)) <> 'array' then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;
      select count(*), count(distinct value)
      into v_add_on_count, v_add_on_distinct_count
      from jsonb_array_elements_text(coalesce(v_item -> 'add_on_ids', '[]'::jsonb));
      if v_add_on_count <> v_add_on_distinct_count or v_add_on_count > 20 then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;
      select coalesce(sum(case when position > v_settings.free_add_ons_quantity then extra_price else 0 end), 0),
        coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'extraPrice', extra_price, 'included', position <= v_settings.free_add_ons_quantity) order by position), '[]'::jsonb)
      into v_add_on_paid_total, v_add_on_details
      from (
        select add_on.id, add_on.name, add_on.extra_price,
          row_number() over (order by add_on.display_order, add_on.id) as position
        from public.add_ons as add_on
        where add_on.id in (select value::uuid from jsonb_array_elements_text(coalesce(v_item -> 'add_on_ids', '[]'::jsonb)))
          and add_on.active and add_on.available
      ) as selected_add_on;
      if (select count(*) from jsonb_array_elements(v_add_on_details)) <> v_add_on_count then
        raise exception using errcode = 'P0001', message = 'ADD_ON_UNAVAILABLE';
      end if;
      v_unit_price := round(v_size.price + v_add_on_paid_total, 2);
      v_name := 'Açaí ' || v_size.name;
      v_category := 'Açaí';
      v_details := v_details || jsonb_build_object('size', jsonb_build_object('id', v_size.id, 'name', v_size.name, 'price', v_size.price), 'addOns', v_add_on_details, 'freeAddOnsQuantity', v_settings.free_add_ons_quantity);
    elsif v_builder_type = 'ice_cream' then
      select * into v_format from public.delivery_builder_options where id = (v_item ->> 'format_id')::uuid and builder_type = 'ice_cream' and option_type = 'format' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      select * into v_scoop from public.delivery_builder_options where id = (v_item ->> 'scoop_id')::uuid and builder_type = 'ice_cream' and option_type = 'scoop' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      select * into v_topping from public.delivery_builder_options where id = (v_item ->> 'topping_id')::uuid and builder_type = 'ice_cream' and option_type = 'topping' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      if jsonb_typeof(v_item -> 'flavor_ids') <> 'array' then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;
      select count(*), count(distinct value) into v_flavor_count, v_flavor_distinct_count from jsonb_array_elements_text(v_item -> 'flavor_ids');
      if v_flavor_count <> v_scoop.max_flavors or v_flavor_count <> v_flavor_distinct_count then raise exception using errcode = '22023', message = 'FLAVORS_INVALID'; end if;
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'previewColor', preview_color) order by display_order, id), '[]'::jsonb)
      into v_flavor_details from public.flavors
      where id in (select value::uuid from jsonb_array_elements_text(v_item -> 'flavor_ids')) and product_type = 'ice_cream' and active and available;
      if (select count(*) from jsonb_array_elements(v_flavor_details)) <> v_flavor_count then raise exception using errcode = 'P0001', message = 'FLAVOR_UNAVAILABLE'; end if;
      v_unit_price := round(v_format.price + v_scoop.price + v_topping.price, 2);
      v_name := 'Sorvete ' || lower(v_format.name) || ' - ' || v_scoop.name;
      v_category := 'Sorvetes';
      v_details := v_details || jsonb_build_object('format', jsonb_build_object('id', v_format.id, 'name', v_format.name, 'price', v_format.price), 'scoop', jsonb_build_object('id', v_scoop.id, 'name', v_scoop.name, 'price', v_scoop.price, 'maxFlavors', v_scoop.max_flavors), 'flavors', v_flavor_details, 'topping', jsonb_build_object('id', v_topping.id, 'name', v_topping.name, 'price', v_topping.price));
    elsif v_builder_type = 'milkshake' then
      select * into v_size from public.delivery_builder_options where id = (v_item ->> 'size_id')::uuid and builder_type = 'milkshake' and option_type = 'size' and active and available;
      if not found then raise exception using errcode = 'P0001', message = 'BUILDER_OPTION_UNAVAILABLE'; end if;
      if jsonb_typeof(v_item -> 'flavor_ids') <> 'array' then raise exception using errcode = '22023', message = 'ITEMS_INVALID'; end if;
      select count(*), count(distinct value) into v_flavor_count, v_flavor_distinct_count from jsonb_array_elements_text(v_item -> 'flavor_ids');
      if v_flavor_count <> 1 or v_flavor_count <> v_flavor_distinct_count then raise exception using errcode = '22023', message = 'FLAVORS_INVALID'; end if;
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'previewColor', preview_color) order by display_order, id), '[]'::jsonb)
      into v_flavor_details from public.flavors
      where id in (select value::uuid from jsonb_array_elements_text(v_item -> 'flavor_ids')) and product_type = 'milkshake' and active and available;
      if (select count(*) from jsonb_array_elements(v_flavor_details)) <> 1 then raise exception using errcode = 'P0001', message = 'FLAVOR_UNAVAILABLE'; end if;
      v_unit_price := v_size.price;
      v_name := 'Milk-shake ' || v_size.name;
      v_category := 'Milk-shakes';
      v_details := v_details || jsonb_build_object('size', jsonb_build_object('id', v_size.id, 'name', v_size.name, 'price', v_size.price), 'flavors', v_flavor_details);
    elsif v_builder_type = 'promotion' then
      select * into v_promotion from public.promotions
      where id = (v_item ->> 'promotion_id')::uuid and active and price > 0
        and (valid_from is null or valid_from <= now())
        and (valid_until is null or valid_until >= now());
      if not found then raise exception using errcode = 'P0001', message = 'PROMOTION_UNAVAILABLE'; end if;
      v_unit_price := v_promotion.price;
      v_name := v_promotion.title;
      v_category := 'Promoções';
      v_details := v_details || jsonb_build_object('promotion', jsonb_build_object('id', v_promotion.id, 'title', v_promotion.title, 'description', v_promotion.description, 'price', v_promotion.price));
    elsif v_builder_type = 'product' then
      select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid and active and available_today;
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
    if v_subtotal < v_settings.minimum_order then
      raise exception using errcode = 'P0001', message = 'MINIMUM_ORDER_NOT_REACHED';
    end if;
  end if;

  update public.orders
  set subtotal = v_subtotal, delivery_fee = v_delivery_fee, discount = 0, total = round(v_subtotal + v_delivery_fee, 2)
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on table public.delivery_builder_options, public.public_order_rate_limits from public, anon, authenticated;
grant select on public.delivery_builder_options to anon, authenticated;
grant usage on schema public to service_role;
grant execute on function public.consume_public_order_rate_limit(text, integer, integer) to service_role;
grant execute on function public.create_public_order(text, jsonb) to service_role;

comment on table public.delivery_builder_options is 'Opções e preços dos montadores públicos. A criação de pedido calcula tudo no banco a partir desta tabela.';
comment on table public.public_order_rate_limits is 'Contadores persistentes de proteção básica do endpoint público. As chaves são hashes sem dados pessoais em claro.';
comment on function public.create_public_order(text, jsonb) is 'Operação atômica e idempotente para pedidos públicos. Só o servidor com service_role pode executá-la.';

notify pgrst, 'reload schema';
