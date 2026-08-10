-- O Route Handler público usa service_role para resolver a store fixa e montar
-- um snapshot seguro; o navegador continua sem acesso direto a estas tabelas.

grant usage on schema public to service_role;
grant select on table
  public.stores,
  public.products,
  public.business_hours,
  public.promotions,
  public.add_ons,
  public.flavors,
  public.delivery_builder_options,
  public.public_store_settings
to service_role;

notify pgrst, 'reload schema';
