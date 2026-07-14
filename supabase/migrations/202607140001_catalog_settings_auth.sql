alter table public.store_settings
  add column temporary_pause boolean not null default false,
  add column accepted_payment_methods public.payment_method[] not null
    default array['Pix', 'Dinheiro', 'Cartão', 'A combinar']::public.payment_method[];

drop view public.public_store_settings;

create view public.public_store_settings
with (security_invoker = false)
as
select
  delivery_open, pause_online_orders, temporary_pause, closed_today, closed_message,
  allow_pickup, allow_delivery, delivery_fee, minimum_order, free_add_ons_quantity,
  accepted_payment_methods, whatsapp, instagram, address, headline, subtitle,
  displayed_hours, config_version, updated_at
from public.store_settings
where id = true;

grant select on public.public_store_settings to anon, authenticated;
comment on view public.public_store_settings is 'View pública com apenas configurações seguras para o site e delivery. Não expõe chave Pix nem observações internas de pagamento.';
notify pgrst, 'reload schema';
