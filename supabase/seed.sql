insert into public.stores (id, slug, name, type, active)
values
  ('00000000-0000-4000-8000-000000000001', 'sorveteria', 'Sorveteria da Manu', 'sorveteria', true),
  ('00000000-0000-4000-8000-000000000002', 'esfiharia', 'Esfiharia', 'esfiharia', false)
on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type;

insert into public.store_settings (
  store_id,
  delivery_open,
  pause_online_orders,
  closed_today,
  closed_message,
  allow_pickup,
  allow_delivery,
  delivery_fee,
  minimum_order,
  free_add_ons_quantity,
  temporary_pause,
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
values (
  '00000000-0000-4000-8000-000000000001',
  false,
  true,
  false,
  'No momento, estamos fechados. Volte a pedir durante nosso horário de atendimento.',
  true,
  true,
  5.00,
  0.00,
  3,
  false,
  array['Pix', 'Dinheiro', 'Cartão', 'A combinar']::public.payment_method[],
  '',
  '',
  '',
  '',
  '',
  'Monte, peça e aproveite.',
  'Açaí, sorvetes e milk-shakes preparados para retirada ou delivery.',
  'Todos os dias, das 12h às 22h',
  1
)
on conflict (store_id) do update set
  delivery_open = excluded.delivery_open,
  pause_online_orders = excluded.pause_online_orders,
  closed_today = excluded.closed_today,
  closed_message = excluded.closed_message,
  allow_pickup = excluded.allow_pickup,
  allow_delivery = excluded.allow_delivery,
  delivery_fee = excluded.delivery_fee,
  minimum_order = excluded.minimum_order,
  free_add_ons_quantity = excluded.free_add_ons_quantity,
  temporary_pause = excluded.temporary_pause,
  accepted_payment_methods = excluded.accepted_payment_methods,
  pix_key = excluded.pix_key,
  payment_note = excluded.payment_note,
  whatsapp = excluded.whatsapp,
  instagram = excluded.instagram,
  address = excluded.address,
  headline = excluded.headline,
  subtitle = excluded.subtitle,
  displayed_hours = excluded.displayed_hours,
  config_version = excluded.config_version;

insert into public.business_hours (store_id, weekday, enabled, open_time, close_time)
values
  ('00000000-0000-4000-8000-000000000001', 0, true, '12:00', '22:00'),
  ('00000000-0000-4000-8000-000000000001', 1, true, '12:00', '22:00'),
  ('00000000-0000-4000-8000-000000000001', 2, true, '12:00', '22:00'),
  ('00000000-0000-4000-8000-000000000001', 3, true, '12:00', '22:00'),
  ('00000000-0000-4000-8000-000000000001', 4, true, '12:00', '22:00'),
  ('00000000-0000-4000-8000-000000000001', 5, true, '12:00', '22:00'),
  ('00000000-0000-4000-8000-000000000001', 6, true, '12:00', '22:00')
on conflict (store_id, weekday) do update set
  enabled = excluded.enabled,
  open_time = excluded.open_time,
  close_time = excluded.close_time;

insert into public.add_ons (store_id, name, active, available, extra_price, display_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Leite condensado', true, true, 2.00, 1),
  ('00000000-0000-4000-8000-000000000001', 'Leite em pó', true, true, 2.00, 2),
  ('00000000-0000-4000-8000-000000000001', 'Granola', true, true, 2.00, 3),
  ('00000000-0000-4000-8000-000000000001', 'Banana', true, true, 2.00, 4),
  ('00000000-0000-4000-8000-000000000001', 'Morango', true, true, 3.00, 5),
  ('00000000-0000-4000-8000-000000000001', 'Paçoca', true, true, 2.00, 6),
  ('00000000-0000-4000-8000-000000000001', 'Amendoim', true, true, 2.00, 7),
  ('00000000-0000-4000-8000-000000000001', 'Nutella', true, true, 3.00, 8)
on conflict (store_id, name) do update set
  active = excluded.active,
  available = excluded.available,
  extra_price = excluded.extra_price,
  display_order = excluded.display_order;

insert into public.flavors (store_id, name, product_type, active, available, preview_color, display_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Chocolate', 'ice_cream', true, true, '#6b3528', 1),
  ('00000000-0000-4000-8000-000000000001', 'Morango', 'ice_cream', true, true, '#e67b91', 2),
  ('00000000-0000-4000-8000-000000000001', 'Creme', 'ice_cream', true, true, '#f5dca6', 3),
  ('00000000-0000-4000-8000-000000000001', 'Flocos', 'ice_cream', true, true, '#e8dfd1', 4),
  ('00000000-0000-4000-8000-000000000001', 'Napolitano', 'ice_cream', true, true, '#d99887', 5),
  ('00000000-0000-4000-8000-000000000001', 'Açaí', 'ice_cream', true, true, '#4b164f', 6),
  ('00000000-0000-4000-8000-000000000001', 'Chocolate', 'milkshake', true, true, '#6b3528', 1),
  ('00000000-0000-4000-8000-000000000001', 'Morango', 'milkshake', true, true, '#e67b91', 2),
  ('00000000-0000-4000-8000-000000000001', 'Ovomaltine', 'milkshake', true, true, '#8c5b32', 3),
  ('00000000-0000-4000-8000-000000000001', 'Leite Ninho', 'milkshake', true, true, '#f2e5c6', 4),
  ('00000000-0000-4000-8000-000000000001', 'Açaí', 'milkshake', true, true, '#4b164f', 5),
  ('00000000-0000-4000-8000-000000000001', 'Creme', 'milkshake', true, true, '#d9b873', 6)
on conflict (store_id, product_type, name) do update set
  active = excluded.active,
  available = excluded.available,
  preview_color = excluded.preview_color,
  display_order = excluded.display_order;

insert into public.products (store_id, name, category, description, price, active, available_today, featured, display_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Açaí 300 ml', 'Açaí', 'Açaí no copo para montar com adicionais.', 14.00, true, true, true, 1),
  ('00000000-0000-4000-8000-000000000001', 'Açaí 500 ml', 'Açaí', 'Açaí maior para montar com adicionais.', 19.00, true, true, false, 2),
  ('00000000-0000-4000-8000-000000000001', 'Copo de sorvete 2 bolas', 'Sorvetes', 'Sorvete no copo com sabores à escolha.', 12.00, true, true, true, 3),
  ('00000000-0000-4000-8000-000000000001', 'Casquinha', 'Sorvetes', 'Casquinha simples com sabor à escolha.', 8.00, true, true, false, 4),
  ('00000000-0000-4000-8000-000000000001', 'Taça especial', 'Sobremesas', 'Sobremesa montada com caldas e complementos.', 16.00, true, true, false, 5),
  ('00000000-0000-4000-8000-000000000001', 'Combo Manu', 'Promoções', 'Combinação promocional para o dia.', 25.00, true, true, true, 6),
  ('00000000-0000-4000-8000-000000000001', 'Milk-shake 300 ml', 'Milk-shakes', 'Milk-shake pequeno com sabor à escolha.', 12.00, true, true, false, 7),
  ('00000000-0000-4000-8000-000000000001', 'Milk-shake 500 ml', 'Milk-shakes', 'Milk-shake grande com sabor à escolha.', 17.00, true, true, false, 8),
  ('00000000-0000-4000-8000-000000000001', 'Água mineral', 'Bebidas', 'Bebida gelada para acompanhar.', 4.00, true, true, false, 9)
on conflict (store_id, name) do update set
  category = excluded.category,
  description = excluded.description,
  price = excluded.price,
  active = excluded.active,
  available_today = excluded.available_today,
  featured = excluded.featured,
  display_order = excluded.display_order;

insert into public.promotions (store_id, title, description, price, active, featured_on_home, display_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Açaí 300 ml especial', 'Açaí, banana, granola e leite condensado.', 16.90, true, true, 1),
  ('00000000-0000-4000-8000-000000000001', 'Combo casal', '2 açaís de 500 ml com 3 adicionais cada.', 36.90, true, false, 2)
on conflict (store_id, title) do update set
  description = excluded.description,
  price = excluded.price,
  active = excluded.active,
  featured_on_home = excluded.featured_on_home,
  display_order = excluded.display_order;

insert into public.delivery_builder_options (store_id, builder_type, option_type, code, name, price, max_flavors, active, available, display_order)
values
  ('00000000-0000-4000-8000-000000000001', 'acai', 'size', '300ml', '300 ml', 14.00, null, true, true, 1),
  ('00000000-0000-4000-8000-000000000001', 'acai', 'size', '500ml', '500 ml', 19.00, null, true, true, 2),
  ('00000000-0000-4000-8000-000000000001', 'acai', 'size', '700ml', '700 ml', 25.00, null, true, true, 3),
  ('00000000-0000-4000-8000-000000000001', 'acai', 'size', '1l', '1 litro', 34.00, null, true, true, 4),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'format', 'cup', 'Copo', 0.00, null, true, true, 1),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'format', 'cone', 'Casquinha', 0.00, null, true, true, 2),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'scoop', 'one', '1 bola', 7.00, 1, true, true, 1),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'scoop', 'two', '2 bolas', 12.00, 2, true, true, 2),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'scoop', 'three', '3 bolas', 16.00, 3, true, true, 3),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'topping', 'chocolate', 'Chocolate', 0.00, null, true, true, 1),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'topping', 'strawberry', 'Morango', 0.00, null, true, true, 2),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'topping', 'condensed-milk', 'Leite condensado', 0.00, null, true, true, 3),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'topping', 'sprinkles', 'Granulado', 0.00, null, true, true, 4),
  ('00000000-0000-4000-8000-000000000001', 'ice_cream', 'topping', 'none', 'Sem cobertura', 0.00, null, true, true, 5),
  ('00000000-0000-4000-8000-000000000001', 'milkshake', 'size', '300ml', '300 ml', 12.00, null, true, true, 1),
  ('00000000-0000-4000-8000-000000000001', 'milkshake', 'size', '500ml', '500 ml', 17.00, null, true, true, 2),
  ('00000000-0000-4000-8000-000000000001', 'milkshake', 'size', '700ml', '700 ml', 22.00, null, true, true, 3)
on conflict (store_id, builder_type, option_type, code) do update set
  name = excluded.name,
  price = excluded.price,
  max_flavors = excluded.max_flavors,
  active = excluded.active,
  available = excluded.available,
  display_order = excluded.display_order;
