insert into public.store_settings (
  id,
  delivery_open,
  pause_online_orders,
  closed_today,
  closed_message,
  allow_pickup,
  allow_delivery,
  delivery_fee,
  minimum_order,
  free_add_ons_quantity,
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
  true,
  false,
  true,
  false,
  'No momento, estamos fechados. Volte a pedir durante nosso horário de atendimento.',
  true,
  true,
  5.00,
  0.00,
  3,
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
on conflict (id) do update set
  delivery_open = excluded.delivery_open,
  pause_online_orders = excluded.pause_online_orders,
  closed_today = excluded.closed_today,
  closed_message = excluded.closed_message,
  allow_pickup = excluded.allow_pickup,
  allow_delivery = excluded.allow_delivery,
  delivery_fee = excluded.delivery_fee,
  minimum_order = excluded.minimum_order,
  free_add_ons_quantity = excluded.free_add_ons_quantity,
  pix_key = excluded.pix_key,
  payment_note = excluded.payment_note,
  whatsapp = excluded.whatsapp,
  instagram = excluded.instagram,
  address = excluded.address,
  headline = excluded.headline,
  subtitle = excluded.subtitle,
  displayed_hours = excluded.displayed_hours,
  config_version = excluded.config_version;

insert into public.business_hours (weekday, enabled, open_time, close_time)
values
  (0, true, '12:00', '22:00'),
  (1, true, '12:00', '22:00'),
  (2, true, '12:00', '22:00'),
  (3, true, '12:00', '22:00'),
  (4, true, '12:00', '22:00'),
  (5, true, '12:00', '22:00'),
  (6, true, '12:00', '22:00')
on conflict (weekday) do update set
  enabled = excluded.enabled,
  open_time = excluded.open_time,
  close_time = excluded.close_time;

insert into public.add_ons (name, active, available, extra_price, display_order)
values
  ('Leite condensado', true, true, 2.00, 1),
  ('Leite em pó', true, true, 2.00, 2),
  ('Granola', true, true, 2.00, 3),
  ('Banana', true, true, 2.00, 4),
  ('Morango', true, true, 3.00, 5),
  ('Paçoca', true, true, 2.00, 6),
  ('Amendoim', true, true, 2.00, 7),
  ('Nutella', true, true, 3.00, 8)
on conflict (name) do update set
  active = excluded.active,
  available = excluded.available,
  extra_price = excluded.extra_price,
  display_order = excluded.display_order;

insert into public.flavors (name, product_type, active, available, preview_color, display_order)
values
  ('Chocolate', 'ice_cream', true, true, '#6b3528', 1),
  ('Morango', 'ice_cream', true, true, '#e67b91', 2),
  ('Creme', 'ice_cream', true, true, '#f5dca6', 3),
  ('Flocos', 'ice_cream', true, true, '#e8dfd1', 4),
  ('Napolitano', 'ice_cream', true, true, '#d99887', 5),
  ('Açaí', 'ice_cream', true, true, '#4b164f', 6),
  ('Chocolate', 'milkshake', true, true, '#6b3528', 1),
  ('Morango', 'milkshake', true, true, '#e67b91', 2),
  ('Ovomaltine', 'milkshake', true, true, '#8c5b32', 3),
  ('Leite Ninho', 'milkshake', true, true, '#f2e5c6', 4),
  ('Açaí', 'milkshake', true, true, '#4b164f', 5),
  ('Creme', 'milkshake', true, true, '#d9b873', 6)
on conflict (product_type, name) do update set
  active = excluded.active,
  available = excluded.available,
  preview_color = excluded.preview_color,
  display_order = excluded.display_order;

insert into public.products (name, category, description, price, active, available_today, featured, display_order)
values
  ('Açaí 300 ml', 'Açaí', 'Açaí no copo para montar com adicionais.', 14.00, true, true, true, 1),
  ('Açaí 500 ml', 'Açaí', 'Açaí maior para montar com adicionais.', 19.00, true, true, false, 2),
  ('Copo de sorvete 2 bolas', 'Sorvetes', 'Sorvete no copo com sabores à escolha.', 12.00, true, true, true, 3),
  ('Casquinha', 'Sorvetes', 'Casquinha simples com sabor à escolha.', 8.00, true, true, false, 4),
  ('Taça especial', 'Sobremesas', 'Sobremesa montada com caldas e complementos.', 16.00, true, true, false, 5),
  ('Combo Manu', 'Promoções', 'Combinação promocional para o dia.', 25.00, true, true, true, 6),
  ('Milk-shake 300 ml', 'Milk-shakes', 'Milk-shake pequeno com sabor à escolha.', 12.00, true, true, false, 7),
  ('Milk-shake 500 ml', 'Milk-shakes', 'Milk-shake grande com sabor à escolha.', 17.00, true, true, false, 8),
  ('Água mineral', 'Bebidas', 'Bebida gelada para acompanhar.', 4.00, true, true, false, 9)
on conflict (name) do update set
  category = excluded.category,
  description = excluded.description,
  price = excluded.price,
  active = excluded.active,
  available_today = excluded.available_today,
  featured = excluded.featured,
  display_order = excluded.display_order;

insert into public.promotions (title, description, price, active, featured_on_home, display_order)
values
  ('Açaí 300 ml especial', 'Açaí, banana, granola e leite condensado.', 16.90, true, true, 1),
  ('Combo casal', '2 açaís de 500 ml com 3 adicionais cada.', 36.90, true, false, 2)
on conflict (title) do update set
  description = excluded.description,
  price = excluded.price,
  active = excluded.active,
  featured_on_home = excluded.featured_on_home,
  display_order = excluded.display_order;
