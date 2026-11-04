-- KINEO-DEFINER-0411
-- JA APLICADA EM PRODUCAO (cqqukkvjjrguayiyjvhh) em 2026-11-04 03:19Z. Versionada para o repo refletir o banco.
--
-- Fecha SECURITY DEFINER que ficaram abertas a API publica sem caminho legitimo.
-- study_*: so lib/studyStats.ts, com service_role. Abertas, qualquer anonimo dispara varredura pesada.
-- revive_*: so app/revive/_lib/reviveProspect.ts, com service_role. A migration 022 ja previa mark_* so para
--   service_role; o grant a anon/authenticated em producao era desvio. Abertas, qualquer um infla o funil.
-- debit_avatar_credit: sem nenhum chamador no codigo e sem nenhuma linha kind='avatar' em credit_debits.
--   Aberta, serve para semear uma chave de cobranca a custo 1 e tornar gratis o debito real.
-- NAO mexe em debit_video_credits (em uso pelo app) nem em ad_brands_visible_to_me (usada pela RLS de ad_brands).
revoke all on function public.study_volume() from public, anon, authenticated;
revoke all on function public.study_speed() from public, anon, authenticated;
revoke all on function public.study_engine_mix() from public, anon, authenticated;
revoke all on function public.revive_prospect_public(text) from public, anon, authenticated;
revoke all on function public.revive_mark_view(text, integer) from public, anon, authenticated;
revoke all on function public.revive_mark_click(text) from public, anon, authenticated;
revoke all on function public.debit_avatar_credit(text) from public, anon, authenticated;

grant execute on function public.study_volume() to service_role;
grant execute on function public.study_speed() to service_role;
grant execute on function public.study_engine_mix() to service_role;
grant execute on function public.revive_prospect_public(text) to service_role;
grant execute on function public.revive_mark_view(text, integer) to service_role;
grant execute on function public.revive_mark_click(text) to service_role;
grant execute on function public.debit_avatar_credit(text) to service_role;
