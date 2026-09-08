-- ═══════════════════════════════════════════════════════════════════════════
-- VENDA ASSISTIDA — 2026-09-07/08 (pista va-*) — V5 MEDIÇÃO
-- Marco da janela: 2026-09-07 20:00 UTC. Rode contra produção.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) PLACAR POR CARTA. Substitua o carimbo conforme a campanha:
--    second_try_1usd_sent · affiliate_wakeup_1usd_sent · checkout_hot_nudge_emailed_v1
--    checkout_recovery_emailed_v1 · checkout_rescue_emailed_v1 · card_declined_emailed_v1
with carta as (
  select user_id, min(created_at) as enviada_em
  from events where name = 'second_try_1usd_sent' group by user_id
)
select
  count(*)                                       as enviadas,
  count(*) filter (where v.hit is not null)      as voltaram_ao_site,
  count(*) filter (where cl.hit is not null)     as clicaram_no_1usd,
  count(*) filter (where pg.hit is not null)     as pagaram
from carta c
-- ⚠️ o corte tem que EXCLUIR o próprio evento de envio, senão o retorno dá 100%
--    (memória `corte-que-pega-o-proprio-envio`). Só evento de navegador conta
--    como "voltou" (memória `retorno-pos-email-conta-email-nosso`).
left join lateral (
  select 1 as hit from events e
  where e.user_id = c.user_id and e.created_at > c.enviada_em
    and e.name not like '%\_sent' escape '\'
    and e.name not like '%\_emailed\_%' escape '\'
    and e.session_id is not null limit 1
) v on true
left join lateral (
  select 1 as hit from events e
  where e.user_id = c.user_id and e.created_at > c.enviada_em
    and coalesce(e.metadata->>'utm_campaign', e.metadata->>'intent_campaign') = 'second_try_1usd'
  limit 1
) cl on true
left join lateral (
  select 1 as hit from events e
  where e.user_id = c.user_id and e.name = 'payment_success' and e.created_at > c.enviada_em limit 1
) pg on true;

-- 2) A METADE SEM NOME (achado da #15). Quem aperta comprar e não deixa rastro
--    é invisível para os SEIS remédios da casa — todos filtram por user_id.
select date_trunc('day', created_at)::date as dia,
       count(*) as n,
       count(*) filter (where user_id is null) as anon,
       round(100.0 * count(*) filter (where user_id is null) / nullif(count(*),0), 1) as pct_anon
from events
where name = 'checkout_attempted' and created_at > now() - interval '14 days'
group by 1 order by 1 desc;

-- 3) FUNIL DE EXCLUSÃO do send-checkout-hot-nudge. Mede quantas pessoas COM
--    nome a lista OUTRAS_CAMPANHAS remove PARA SEMPRE (medido 08/09: 74 de 99).
with cs as (
  select distinct user_id from events
  where name = 'checkout_started' and created_at > now() - interval '30 days' and user_id is not null
), pass1 as (
  select c.user_id, p.email from cs c join profiles p on p.id = c.user_id
  where coalesce(p.has_paid,false) = false and coalesce(p.email_opted_out,false) = false
    and p.email is not null and p.email <> ''
    and p.email not ilike '%@shortsforgeai.com'
    and p.email not ilike 'josephsskaf%' and p.email not ilike 'josephskaf%'
), outras as (
  select distinct user_id from events
  where user_id in (select user_id from pass1)
    and name in ('checkout_recovery_emailed_v1','checkout_rescue_emailed_v1','checkout30_emailed_v1',
                 'card_declined_emailed_v1','made_video_today_emailed_v1','india_price_emailed_v1',
                 'comeback50_emailed_v1','hot_upsell_sent','next_episode_wall_emailed_v1',
                 'season_letter_emailed_v1')
)
select (select count(*) from cs)     as clicaram_30d,
       (select count(*) from pass1)  as apos_pagante_optout_email,
       (select count(*) from outras) as excluidos_outra_campanha_para_sempre,
       (select count(*) from pass1 where user_id not in (select user_id from outras)) as sobreviventes;

-- 4) ROTA NOVA: NUNCA medir por relógio, sempre pelo CARIMBO DO DEPLOY.
--    O send-checkout-hot-nudge nasceu 2026-09-07 20:22 UTC; medir "30 dias"
--    devolve zero e inventa um defeito que não existe.
select count(*) as oportunidades_desde_o_deploy
from events
where name = 'checkout_started' and created_at >= timestamptz '2026-09-07 20:22:00+00';

-- 5) JANELA DE RELÓGIO — comparar a MESMA faixa horária em dias anteriores
--    antes de suspeitar de queda (memória `queda-de-trafego-contra-hora-inflada`).
with d as (select generate_series(0,5) i)
select (date '2026-09-07' - i)::text as noite,
       count(e.*) filter (where e.name = 'checkout_started')  as checkout_started,
       count(distinct e.user_id) filter (where e.name = 'checkout_attempted') as pessoas_com_nome,
       count(e.*) filter (where e.name = 'checkout_attempted') as tentativas_totais
from d
left join events e
  on e.created_at >= ((date '2026-09-07' - i)::timestamp + interval '20 hours 22 minutes') at time zone 'UTC'
 and e.created_at <  ((date '2026-09-07' - i)::timestamp + interval '27 hours 22 minutes') at time zone 'UTC'
group by i order by i;
