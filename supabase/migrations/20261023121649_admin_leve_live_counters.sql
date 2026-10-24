-- KINEO-ADMIN-LEVE-2310 — NEW migration; never replay 20260827200000.
-- PROPOSED, not applied in production by this task. See docs/ADMIN-LEVE-2310.md.
-- The covering partial index targets the four session scans in the measured plan.
-- Normal CREATE INDEX locks writes; apply only after the polling/cache rollout.
-- Abort quickly instead of holding up event ingestion on the overloaded Nano.
set local lock_timeout = '1s';
set local statement_timeout = '5s';

create index events_admin_live_sessions_idx
  on public.events (created_at desc) include (session_id, user_id)
  where session_id is not null;

create or replace function public.admin_live_counters(p_exact_emails text[], p_like_patterns text[])
returns table (
  visitors_7d bigint, visitors_24h bigint, signups_7d bigint,
  signups_24h bigint, videos_24h bigint, checkouts_24h bigint
)
language sql
stable
security definer
set search_path = public
as $function$
with internos as (
    select p.id
    from profiles p
    where lower(p.email) = any (array(select lower(x) from unnest(p_exact_emails) x))
       or lower(p.email) like any (array(select lower(pat) from unnest(p_like_patterns) pat))
  ),
  -- Uma sessao e descartada se QUALQUER evento dela na janela veio de conta
  -- interna. Visitante anonimo (user_id null) conta como visitante de verdade:
  -- ele e exatamente quem o card quer medir.
  sessoes_internas_7d as (
    select distinct e.session_id from events e
    where e.created_at > now() - interval '7 days'
      and e.session_id is not null
      and e.user_id in (select id from internos)
  ),
  sessoes_internas_24h as (
    select distinct e.session_id from events e
    where e.created_at > now() - interval '24 hours'
      and e.session_id is not null
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
$function$;

revoke all on function public.admin_live_counters(text[], text[]) from public, anon, authenticated;
grant execute on function public.admin_live_counters(text[], text[]) to service_role;
