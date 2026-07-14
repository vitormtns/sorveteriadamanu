create or replace function public.save_store_configuration(
  p_settings jsonb,
  p_business_hours jsonb,
  p_promotions jsonb,
  p_add_ons jsonb,
  p_flavors jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_stage text := 'store_settings';
  v_error_message text;
begin
  if not public.is_owner() then
    raise exception using errcode = '42501', message = 'Apenas um owner ativo pode salvar as configurações.';
  end if;

  if jsonb_typeof(p_settings) <> 'object'
    or jsonb_typeof(p_business_hours) <> 'array'
    or jsonb_typeof(p_promotions) <> 'array'
    or jsonb_typeof(p_add_ons) <> 'array'
    or jsonb_typeof(p_flavors) <> 'array' then
    raise exception using errcode = '22023', message = 'Payload de configuração inválido.';
  end if;

  update public.store_settings
  set
    delivery_open = (p_settings ->> 'delivery_open')::boolean,
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
  where id = true;

  if not found then
    raise exception using errcode = 'P0002', message = 'A configuração global da loja não foi encontrada.';
  end if;

  v_stage := 'business_hours';
  insert into public.business_hours (weekday, enabled, open_time, close_time)
  select weekday, enabled, open_time, close_time
  from jsonb_to_recordset(p_business_hours) as item(
    weekday smallint,
    enabled boolean,
    open_time time,
    close_time time
  )
  on conflict (weekday) do update
  set enabled = excluded.enabled,
      open_time = excluded.open_time,
      close_time = excluded.close_time;

  v_stage := 'promotions';
  update public.promotions set featured_on_home = false where featured_on_home = true;

  insert into public.promotions (
    id, title, description, price, active, featured_on_home,
    valid_from, valid_until, image_url, display_order
  )
  select
    id, title, description, price, active, featured_on_home,
    valid_from, valid_until, image_url, display_order
  from jsonb_to_recordset(p_promotions) as item(
    id uuid,
    title text,
    description text,
    price numeric,
    active boolean,
    featured_on_home boolean,
    valid_from timestamptz,
    valid_until timestamptz,
    image_url text,
    display_order integer
  )
  on conflict (id) do update
  set title = excluded.title,
      description = excluded.description,
      price = excluded.price,
      active = excluded.active,
      featured_on_home = excluded.featured_on_home,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      image_url = excluded.image_url,
      display_order = excluded.display_order;

  delete from public.promotions as existing
  where not exists (
    select 1 from jsonb_array_elements(p_promotions) as item
    where (item ->> 'id')::uuid = existing.id
  );

  v_stage := 'add_ons';
  insert into public.add_ons (id, name, active, available, extra_price, display_order)
  select id, name, active, available, extra_price, display_order
  from jsonb_to_recordset(p_add_ons) as item(
    id uuid,
    name text,
    active boolean,
    available boolean,
    extra_price numeric,
    display_order integer
  )
  on conflict (id) do update
  set name = excluded.name,
      active = excluded.active,
      available = excluded.available,
      extra_price = excluded.extra_price,
      display_order = excluded.display_order;

  delete from public.add_ons as existing
  where not exists (
    select 1 from jsonb_array_elements(p_add_ons) as item
    where (item ->> 'id')::uuid = existing.id
  );

  v_stage := 'flavors';
  insert into public.flavors (
    id, name, product_type, active, available, preview_color, display_order
  )
  select id, name, product_type, active, available, preview_color, display_order
  from jsonb_to_recordset(p_flavors) as item(
    id uuid,
    name text,
    product_type public.flavor_product_type,
    active boolean,
    available boolean,
    preview_color text,
    display_order integer
  )
  on conflict (id) do update
  set name = excluded.name,
      product_type = excluded.product_type,
      active = excluded.active,
      available = excluded.available,
      preview_color = excluded.preview_color,
      display_order = excluded.display_order;

  delete from public.flavors as existing
  where not exists (
    select 1 from jsonb_array_elements(p_flavors) as item
    where (item ->> 'id')::uuid = existing.id
  );
exception
  when others then
    get stacked diagnostics v_error_message = message_text;
    raise exception using
      errcode = sqlstate,
      message = format('Falha em %s: %s', v_stage, v_error_message);
end;
$$;

revoke all on function public.save_store_configuration(jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_store_configuration(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

comment on function public.save_store_configuration(jsonb, jsonb, jsonb, jsonb, jsonb)
is 'Salva configurações, horários e catálogo configurável em uma única transação para owner ativo.';

notify pgrst, 'reload schema';
