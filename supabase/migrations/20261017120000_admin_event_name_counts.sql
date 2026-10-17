-- KINEO-ADMIN-RAPIDO-1710 — contagem de eventos por nome numa chamada só, para o /admin/funnel.
--
-- ⚠ NÃO APLICADA. Escrita no banco (DDL) só com o "vai" do fundador. Até lá a rota /api/admin/funnel chama o RPC, recebe
-- "function not found" e volta às 78 contagens exatas de antes (mesmo número, só mais lento). Depois de aplicada, as 78
-- requisições viram UMA, sem mudar nenhum número.
--
-- A REGRA É A MESMA DAS 78 CONTAGENS (app/api/admin/funnel/route.ts, countTrackedEvents):
--   name = um dos nomes pedidos
--   created_at >= p_since            (p_since nulo = período "all")
--   user_id nulo OU fora de p_internal_ids  (a lista de contas internas chega por PARÂMETRO, vinda de
--                                            lib/internalAccounts.ts — ela não mora aqui; mesmo princípio do
--                                            admin_live_counters de 27/08)
-- Usa o índice events_name_created_idx (name, created_at desc). Devolve no máximo uma linha por nome (78 < 1000 do
-- db.max_rows), então não há truncamento silencioso do PostgREST.

create or replace function public.admin_event_name_counts(
  p_names text[],
  p_since timestamptz,
  p_internal_ids uuid[]
)
returns table (name text, n bigint)
language sql
security definer
set search_path = public
stable
as $$
  select e.name, count(*)::bigint as n
  from events e
  where e.name = any (p_names)
    and (p_since is null or e.created_at >= p_since)
    and (e.user_id is null or not (e.user_id = any (coalesce(p_internal_ids, '{}'::uuid[]))))
  group by e.name
$$;

-- Só o service role (as rotas do admin) chama. Mesmo fechamento de public.events (26/08).
revoke all on function public.admin_event_name_counts(text[], timestamptz, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_event_name_counts(text[], timestamptz, uuid[]) to service_role;
