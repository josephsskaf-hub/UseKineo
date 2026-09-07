-- ═══════════════════════════════════════════════════════════════════════════
-- FECHAR A VENDA — consultas do ciclo de 2026-09-07 (15:38 → 23:38 BRT)
-- MARCO: '2026-09-07 18:38:00+00'::timestamptz
-- Toda eficácia deste ciclo se mede DEPOIS do marco. "Últimos N dias" mistura
-- o antes com o depois e não prova nada.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. O FUNIL POR PESSOA (o agregado esconde o degrau seco: quem passa do
--    degrau N pode não ser quem passa do N+1).
with p as (
  select user_id,
    max((name='video_ready_viewed')::int)      ready,
    max((name='video_download_clicked')::int)  dl,
    max((name='pricing_view')::int)            pricing,
    max((name='checkout_started')::int)        co,
    max((name='payment_success')::int)         pago
  from events
  where created_at > now() - interval '30 days' and user_id is not null
  group by user_id
)
select
  count(*) filter (where ready=1)                                            entregou_filme,
  count(*) filter (where ready=1 and dl=1)                                   baixou,
  count(*) filter (where ready=1 and dl=1 and pricing=1)                     viu_preco,
  count(*) filter (where ready=1 and dl=1 and pricing=1 and co=1)            abriu_checkout,
  count(*) filter (where ready=1 and dl=1 and pricing=1 and co=1 and pago=1) pagou,
  count(*) filter (where pricing=1 and co=0)                                 viu_preco_nao_clicou,
  count(*) filter (where co=1 and pago=0)                                    clicou_nao_pagou
from p;

-- 2. A DISPUTA PELO SLOT PÓS-ENTREGA (o achado do #1 deste ciclo).
--    A pergunta leva 17% ao checkout; as três que a substituíram levam ~1%.
with surf as (
  select user_id, name, min(created_at) t
  from events
  where name in ('trial_post_video_offer_viewed','trial_balance_bridge_viewed',
                 'trial_repeat_episode_viewed','plan_fit_impression','post_video_offer_viewed')
    and created_at > now() - interval '30 days' and user_id is not null
  group by 1,2
)
select s.name,
  count(distinct s.user_id) pessoas,
  count(distinct s.user_id) filter (where exists (
    select 1 from events e where e.user_id=s.user_id and e.created_at >= s.t
      and e.name='checkout_started')) foram_ao_checkout,
  count(distinct s.user_id) filter (where exists (
    select 1 from events e where e.user_id=s.user_id and e.created_at >= s.t
      and e.name='payment_success')) pagaram
from surf s group by 1 order by pessoas desc;

-- 3. A PERGUNTA VOLTOU? (métrica direta do conserto #1 — sem instrumento novo)
--    Antes: 176 impressões/semana em 17/08 -> 1/semana em 07/09.
--    Sinal de sucesso REAL: trial_post_video_offer_clicked voltar a existir
--    (morto desde 2026-08-22).
select date_trunc('day', created_at)::date dia,
       count(*) filter (where name='trial_post_video_offer_viewed')  impressoes,
       count(distinct user_id) filter (where name='trial_post_video_offer_viewed') pessoas,
       count(*) filter (where name='trial_post_video_offer_clicked') cliques
from events
where name in ('trial_post_video_offer_viewed','trial_post_video_offer_clicked')
  and created_at > now() - interval '21 days'
group by 1 order by 1;

-- 4. QUEM ENTREGOU UM FILME E NÃO VIU OFERTA NENHUMA.
--    Em 07/09, 7 dias: 135 entregaram · 98 viram alguma oferta · 37 viram NADA.
with ready as (
  select distinct user_id from events
  where name='video_ready_viewed' and created_at > now() - interval '7 days' and user_id is not null
), oferta as (
  select distinct user_id from events
  where created_at > now() - interval '7 days'
    and name in ('trial_post_video_offer_viewed','plan_fit_impression','post_video_offer_viewed',
                 'trial_balance_bridge_viewed','trial_repeat_episode_viewed')
)
select (select count(*) from ready) entregaram,
       (select count(*) from ready r where exists (select 1 from oferta o where o.user_id=r.user_id)) viram_oferta,
       (select count(*) from ready r where not exists (select 1 from oferta o where o.user_id=r.user_id)) viram_nada;

-- 5. O QUE CADA CHECKOUT OFERECEU E ONDE PAROU (F4).
--    Em 07/09: basic/standard/usd = 42 pessoas, 41 expiraram, 1 pagou;
--    pro/standard/usd = 13 pessoas, 4 pagaram. O tier mais barato converte PIOR.
select cs.metadata->>'tier' tier, cs.metadata->>'price_region' region,
       cs.metadata->>'currency' cur, count(*) sessoes,
       count(distinct cs.user_id) pessoas,
       count(*) filter (where exists (select 1 from events p
           where p.name='payment_success' and p.user_id=cs.user_id and p.created_at >= cs.created_at)) pagaram,
       count(*) filter (where exists (select 1 from events x
           where x.name='checkout_session_expired'
             and x.metadata->>'stripe_session_id' = cs.metadata->>'stripe_session_id')) expiraram
from events cs
where cs.name='checkout_started' and cs.created_at > now() - interval '30 days'
group by 1,2,3 order by sessoes desc;

-- 6. CHECAGEM ZERO (a cada rotação).
--    ATENÇÃO: crédito 0 significa TRÊS coisas — antifraude, trial gasto e
--    trial órfão. Ler trial_status ANTES de escalar: 'blocked' +
--    trial_blocked_fingerprint é o antifraude funcionando, não defeito.
select 'cadastro sem credito 24h' k, count(*) v from profiles p
 where p.created_at > now() - interval '24 hours' and coalesce(p.video_credits,0)=0
   and not exists (select 1 from events e where e.user_id=p.id and e.name='trial_credits_granted')
union all select 'render preso >90min', count(*) from videos
 where status in ('processing','pending','queued')
   and created_at > now() - interval '24 hours' and created_at < now() - interval '90 minutes'
union all select 'video entregue 24h', count(*) from videos
 where status='completed' and created_at > now() - interval '24 hours'
union all select 'video falhou 24h', count(*) from videos
 where status='failed' and created_at > now() - interval '24 hours'
union all select 'recusa de cartao sem dono 7d', count(*) from events
 where name in ('checkout_payment_failed','card_declined','invoice_payment_failed')
   and user_id is null and created_at > now() - interval '7 days';
