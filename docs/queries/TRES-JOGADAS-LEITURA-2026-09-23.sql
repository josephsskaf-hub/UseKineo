-- Leitura das 3 jogadas de 23/09/2026 (corte = hora do deploy; contas internas fora).
-- Trocar :deploy pelo timestamptz do deploy READY (ex.: '2026-09-24 03:00+00').

-- JOGADA 1 — parede v1: expostos → clique → checkout → pagamento, por país
with w as (
  select e.user_id, min(e.created_at) t0,
         max(e.metadata->>'required_credits') req, max(e.metadata->>'engine') engine,
         max(coalesce(p.signup_country, p.last_country, '??')) pais
  from events e join profiles p on p.id = e.user_id
  where e.name = 'wall_v1_shown' and e.created_at > :deploy
    and coalesce(p.email,'') not ilike '%josephsskaf%'
  group by e.user_id)
select pais, count(*) expostos,
  count(*) filter (where exists (select 1 from events c where c.user_id = w.user_id and c.name = 'wall_v1_clicked' and c.created_at >= w.t0)) clicaram,
  count(*) filter (where exists (select 1 from events c where c.user_id = w.user_id and c.name = 'checkout_started' and c.created_at >= w.t0)) checkout,
  count(*) filter (where exists (select 1 from events c where c.user_id = w.user_id and c.name = 'payment_success' and c.created_at >= w.t0)) pagaram,
  count(*) filter (where exists (select 1 from events c where c.user_id = w.user_id and c.name = 'payment_success' and c.metadata->>'intent_campaign' = 'wall_v1')) pagaram_wall_v1
from w group by 1 order by 2 desc;

-- Guarda de canibalização: checkout_started de Starter antes/depois do deploy (mesma janela de dias)
select (created_at > :deploy) depois, count(*) checkouts, count(distinct user_id) pessoas
from events where name = 'checkout_started' and metadata->>'tier' = 'starter'
  and created_at > :deploy - interval '14 days' group by 1;

-- Retorno do pack ao Studio e retomada do roteiro
select name, count(*), count(distinct user_id) from events
where created_at > :deploy and name in ('wall_v1_resume_restored','wall_v1_resume_missing','checkout_success_resume_offered','topup_unavailable_note_shown')
group by 1;

-- JOGADA 2 — Kineo Empresas
select name, count(*), count(distinct user_id) pessoas from events
where created_at > :deploy and name in ('dfy_card_shown','dfy_card_clicked','dfy_order_paid') group by 1;
select created_at, user_id, metadata->>'customer_email' email, metadata->>'amount_total' valor, metadata->'custom_fields' brief
from events where name = 'dfy_order_paid' order by 1 desc;

-- JOGADA 3 — ponte nas páginas citadas: impressão → clique → pouso no Seedance → conta → pagante
select metadata->>'from' origem, count(*) filter (where name='engine_bridge_shown') vistos,
  count(*) filter (where name='engine_bridge_clicked') cliques
from events where created_at > :deploy and name in ('engine_bridge_shown','engine_bridge_clicked') group by 1 order by 2 desc;

with s as (
  select session_id, min(created_at) t0, min(path) path
  from events where name = 'landing_session_started' and created_at > :deploy
    and (metadata->>'utm_source' ilike '%chatgpt%' or metadata->>'referrer_host' ilike '%chatgpt%')
    and coalesce((metadata->>'is_bot')::boolean,false) = false group by 1)
select s.path, count(*) sessoes,
  count(distinct e.user_id) contas,
  count(distinct e.user_id) filter (where exists (select 1 from events p where p.user_id = e.user_id and p.name = 'payment_success' and p.created_at > :deploy)) pagantes
from s left join events e on e.session_id = s.session_id and e.user_id is not null
group by 1 order by 2 desc limit 15;

-- Guarda de citação: sessões ChatGPT por semana na página do Kineo 1 (não pode cair >30%)
select date_trunc('week', created_at)::date semana, count(*) sessoes
from events where name = 'landing_session_started' and path like '/ai-video-generator/kineo-1%'
  and (metadata->>'utm_source' ilike '%chatgpt%' or metadata->>'referrer_host' ilike '%chatgpt%')
  and coalesce((metadata->>'is_bot')::boolean,false) = false and created_at > now() - interval '8 weeks'
group by 1 order by 1;
