-- Leitura da sprint de 16 h (27/09/2026). Rodar às 24 h (28/09 09h BRT = 12:00Z) e 48 h (29/09 05h BRT = 08:00Z).
-- Marcos (UTC): A = 2026-09-27 09:54Z (5ca92533) · B = 2026-09-27 20:05Z (0879fa1d) · B2 = 20:12Z (cf3eeb7e) · B3 = 20:28Z (910317ea).
-- Regras dos revisores: ads_access_denied who='anon' também sai quando o painel É mostrado (outcome='anonymous_panel');
-- trial_active_banner_cta / trial_downgrade_modal_cta saem com o mesmo nome para Starter e Creator → separar por tier e cta_role.
-- Contas internas sempre fora. Nunca "últimos N dias": sempre created_at > marco.

\set marco '''2026-09-27 20:05:00+00'''

with ext as (
  select p.id from profiles p
  where not (coalesce(p.email,'') ilike 'josephskaf%' or coalesce(p.email,'') ilike 'josephsskaf%'
          or coalesce(p.email,'') ilike 'victoriaskaf%' or coalesce(p.email,'') ilike 'joseph+%')
), e as (
  select * from events
  where created_at > :marco::timestamptz and (user_id is null or user_id in (select id from ext))
)
select 'cadastros' k, count(*) n, count(*) pessoas from profiles where created_at > :marco::timestamptz and id in (select id from ext)
union all select 'filmes entregues', count(*), count(distinct user_id) from videos where created_at > :marco::timestamptz and status='completed' and user_id in (select id from ext)
union all select 'parede antes do roteiro (wall_before_script)', count(*), count(distinct user_id) from e where name='wall_before_script'
union all select 'saida Kineo 1 no modal (trial_kineo1)', count(*), count(distinct user_id) from e where name='first_film_free_offer_clicked' and metadata->>'variant'='trial_kineo1'
union all select 'banner do trial → Starter (botao)', count(*), count(distinct user_id) from e where name='trial_active_banner_cta' and metadata->>'tier'='starter'
union all select 'banner do trial → Creator (link)', count(*), count(distinct user_id) from e where name='trial_active_banner_cta' and metadata->>'tier'='basic'
union all select 'modal fim do trial → Starter', count(*), count(distinct user_id) from e where name='trial_downgrade_modal_cta' and metadata->>'tier'='starter'
union all select 'modal fim do trial → Creator', count(*), count(distinct user_id) from e where name='trial_downgrade_modal_cta' and metadata->>'tier'='basic'
union all select 'exit-intent logado → Back to Studio', count(*), count(distinct coalesce(user_id::text, session_id)) from e where name='exit_intent_back_to_studio_clicked'
union all select 'exit-intent deslogado → signup', count(*), count(distinct session_id) from e where name='exit_intent_free_clicked'
union all select '/ads/new anonimo: painel mostrado', count(*), count(distinct session_id) from e where name='ads_access_denied' and metadata->>'who'='anon' and metadata->>'outcome'='anonymous_panel'
union all select '/ads/new logado sem acesso → /ads', count(*), count(distinct user_id) from e where name='ads_access_denied' and metadata->>'who'='no_access'
union all select 'ads_auto_started', count(*), count(distinct user_id) from e where name='ads_auto_started'
union all select 'paginas GPT: landing_session_started em /ads/for/*', count(*), count(distinct session_id) from e where name='landing_session_started' and path like '/ads/for/%'
union all select 'paginas GPT: landing_session_started em /vs/*-alternative', count(*), count(distinct session_id) from e where name='landing_session_started' and path ~ '^/vs/(creatify|topview|zeely)-alternative'
union all select 'utm gpt24h → qualquer evento', count(*), count(distinct coalesce(user_id::text, session_id)) from e where metadata->>'utm_campaign'='gpt24h'
union all select 'checkout_started', count(*), count(distinct user_id) from e where name='checkout_started'
union all select 'checkout_started · intent ads_door', count(*), count(distinct user_id) from e where name='checkout_started' and metadata->>'intent_campaign' like 'ads_door%'
union all select 'payment_success', count(*), count(distinct user_id) from e where name='payment_success'
union all select 'generation_stage_error (pessoas)', count(*), count(distinct user_id) from e where name='generation_stage_error'
order by 1;

-- Por pessoa: quem chegou ao checkout depois do marco e o que fez antes (para ler o degrau seco, nunca o agregado).
with ext as (
  select p.id, p.email, p.plan, p.trial_status, p.created_at from profiles p
  where not (coalesce(p.email,'') ilike 'josephskaf%' or coalesce(p.email,'') ilike 'josephsskaf%'
          or coalesce(p.email,'') ilike 'victoriaskaf%' or coalesce(p.email,'') ilike 'joseph+%')
)
select left(x.email,4)||'…@'||split_part(x.email,'@',2) who, to_char(x.created_at,'MM-DD') signup, x.plan, x.trial_status,
  (select count(*) from videos v where v.user_id=x.id and v.status='completed') films,
  (select string_agg(coalesce(metadata->>'tier','?')||'@'||to_char(created_at,'DD HH24:MI'), ' · ' order by created_at) from events where user_id=x.id and name='checkout_started' and created_at > :marco::timestamptz) checkouts,
  exists(select 1 from events where user_id=x.id and name='payment_success' and created_at > :marco::timestamptz) pagou,
  exists(select 1 from events where user_id=x.id and name='checkout_payment_failed' and created_at > :marco::timestamptz) cartao_recusado
from ext x
where exists(select 1 from events where user_id=x.id and name='checkout_started' and created_at > :marco::timestamptz)
order by pagou desc, films desc;
