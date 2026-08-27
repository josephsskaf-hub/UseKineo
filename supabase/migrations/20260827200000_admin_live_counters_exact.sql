-- KINEO-PAINEL-VERDADE-2026-08-27
--
-- POR QUE ESTA FUNÇÃO EXISTE.
--
-- A rota /api/admin/live contava visitantes assim: lia `events` com
-- `.limit(60000)` e passava as linhas por `new Set()` em JavaScript. Mas o
-- PostgREST deste projeto tem `db.max_rows = 1000`: ele CORTA a resposta em
-- 1000 linhas e NÃO devolve erro. O `.limit(60000)` nunca teve efeito.
--
-- Consequência medida em 27/08/2026: o painel mostrava
--   VISITORS 7D  = 435
--   VISITORS 24H = 435
-- porque as duas janelas liam as MESMAS 1000 linhas mais recentes. Os números
-- reais eram 1.820 e 574. O painel errava por 4x e parecia saudável — o pior
-- tipo de erro de número, porque ninguém desconfia dele.
-- Mesma família do defeito do #275 ("PostgREST trunca em 1000 linhas SEM ERRO").
--
-- Segundo defeito, na mesma leitura: NENHUMA das cinco contagens excluía conta
-- interna. VIDEOS 24H mostrava 13 quando o cliente tinha feito 9 — os outros 4
-- eram render de teste do fundador. E o card do CEO, na MESMA tela, mostrava 9
-- (porque compute.ts exclui). Dois números da mesma coisa, brigando na mesma
-- página.
--
-- A CURA: não trazer linha nenhuma para o Node. Contar no banco, uma chamada.
--
-- A LISTA DE CONTAS INTERNAS NÃO MORA AQUI. Ela chega por parâmetro, vinda de
-- lib/internalAccounts.ts, que continua sendo a única fonte da verdade.
-- Duplicá-la em SQL seria criar o segundo 150 que a casa já caçou uma vez.

create or replace function public.admin_live_counters(
  p_exact_emails text[],
  p_like_patterns text[]
)
returns table (
  visitors_7d    bigint,
  visitors_24h   bigint,
  signups_7d     bigint,
  signups_24h    bigint,
  videos_24h     bigint,
  checkouts_24h  bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with internos as (
    select p.id
    from profiles p
    where lower(p.email) = any (select lower(x) from unnest(p_exact_emails) x)
       or exists (select 1 from unnest(p_like_patterns) pat where lower(p.email) like lower(pat))
  ),
  -- Uma sessão é descartada se QUALQUER evento dela na janela veio de conta
  -- interna. Visitante anônimo (user_id null) conta como visitante de verdade:
  -- ele é exatamente quem o card quer medir.
  sessoes_internas_7d as (
    select distinct e.session_id from events e
    where e.created_at > now() - interval '7 days'
      and e.user_id in (select id from internos)
  ),
  sessoes_internas_24h as (
    select distinct e.session_id from events e
    where e.created_at > now() - interval '24 hours'
      and e.user_id in (select id from internos)
  )
  select
    (select count(distinct e.session_id) from events e
      where e.created_at > now() - interval '7 days'
        and e.session_id is not null
        and e.session_id not in (select session_id from sessoes_internas_7d where session_id is not null)),
    (select count(distinct e.session_id) from events e
      where e.created_at > now() - interval '24 hours'
        and e.session_id is not null
        and e.session_id not in (select session_id from sessoes_internas_24h where session_id is not null)),
    (select count(*) from profiles p
      where p.created_at > now() - interval '7 days' and p.id not in (select id from internos)),
    (select count(*) from profiles p
      where p.created_at > now() - interval '24 hours' and p.id not in (select id from internos)),
    (select count(*) from videos v
      where v.created_at > now() - interval '24 hours'
        and (v.user_id is null or v.user_id not in (select id from internos))),
    (select count(*) from events e
      where e.name = 'checkout_started'
        and e.created_at > now() - interval '24 hours'
        and (e.user_id is null or e.user_id not in (select id from internos)));
$$;

-- Só o service_role chama. A função é SECURITY DEFINER e lê `events`, que está
-- fechada desde as migrations events_lockdown_service_role_only e
-- events_service_role_least_privilege — deixá-la aberta para `authenticated`
-- reabriria por RPC a porta que aquelas duas fecharam.
revoke all on function public.admin_live_counters(text[], text[]) from public, anon, authenticated;
grant execute on function public.admin_live_counters(text[], text[]) to service_role;
