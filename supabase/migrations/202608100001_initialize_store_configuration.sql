-- Permite que um owner inicialize, de forma explícita, uma configuração
-- segura e fechada para uma store ativa ainda sem dados operacionais.

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

  insert into public.store_settings (store_id)
  values (p_store_id)
  on conflict (store_id) do nothing;

  select * into v_settings from public.store_settings where store_id = p_store_id;
  return v_settings;
end;
$$;

revoke all on function public.initialize_store_configuration(uuid) from public, anon;
grant execute on function public.initialize_store_configuration(uuid) to authenticated;

comment on function public.initialize_store_configuration(uuid) is
  'Inicializa configuração fechada para uma store ativa, sem criar horários ou catálogo fictícios.';

notify pgrst, 'reload schema';
