revoke all on function public.get_public_order_tracking(text, text) from public, anon, authenticated;
grant execute on function public.get_public_order_tracking(text, text) to service_role;

comment on function public.get_public_order_tracking(text, text) is 'Usada exclusivamente pelo Route Handler server-side após validar código e token.';

notify pgrst, 'reload schema';
