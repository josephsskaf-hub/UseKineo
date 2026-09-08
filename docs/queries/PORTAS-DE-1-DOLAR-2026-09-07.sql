-- ════════════════════════════════════════════════════════════════════════════
-- AS PORTAS DE $1 — QUAL DELAS VENDE (escrito fv-r11/r12, 07/09/2026)
--
-- Em 07/09 a casa passou a oferecer a entrada de $1 (Creator, 7 dias, 80
-- créditos, depois a mensalidade) em CINCO lugares. Cada um tem carimbo
-- próprio, de propósito: somar tudo num `card_trial=1` apagaria a única
-- comparação que interessa.
--
--   intent_campaign            | onde                        | quem alcança (30d)
--   ---------------------------+-----------------------------+-------------------
--   trial_1usd_first_film      | banner do trial, ramo de    | 216 chegadas/mês
--                              | quem NÃO gastou crédito     |
--   trial_1usd_active_banner   | banner do trial, ramo de    | 15
--                              | quem JÁ gastou              |
--   trial_1usd_upgrade_modal   | modal de "sem créditos"     | 62
--   trial_1usd_downgrade       | modal de fim de trial       | 15
--   (a caixa de export limpo e o /pricing usam os carimbos das suas rotações)
--
-- ⚠️ TRÊS ARMADILHAS QUE ESTAS CONSULTAS JÁ EVITAM, cada uma paga com uma
--    rotação perdida hoje:
--  1. UNIDADE. Superfície pública grava `user_id` NULL e `count(distinct
--     user_id)` IGNORA NULL. Medido hoje: `exit_intent_shown` = 28 pessoas por
--     user_id e **404 visitantes** por `coalesce(user_id::text, session_id)`.
--     Toda contagem abaixo usa a unidade composta.
--  2. CORTE. NUNCA cortar por relógio para separar "antes/depois do deploy" —
--     use a presença do campo novo (`metadata ? 'trial_door'`). Linha sem o
--     campo é de antes e não se mistura.
--  3. DINHEIRO. `checkout_success_viewed` dispara em VISITA à página.
--     Só `payment_success` é venda, e a venda do trial é de 100 centavos.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. ALCANCE E CLIQUE DE CADA PORTA ───────────────────────────────────────
-- Impressão e clique lado a lado, por porta. As impressões carregam o veredito
-- (`visible`) porque zero clique não distingue "ninguém quis" de "nunca
-- apareceu".
select
  name,
  coalesce(metadata->>'visible', metadata->>'trial_door', '(sem veredito)') as visivel,
  coalesce(metadata->>'door_reason', metadata->>'reason', metadata->>'trial_door_reason', '-') as motivo,
  count(*)                                                    as linhas,
  count(distinct coalesce(user_id::text, session_id))          as visitantes,
  min(created_at)                                             as primeira,
  max(created_at)                                             as ultima
from events
where created_at > '2026-09-07 18:38:00+00'
  and name in (
    'trial_first_film_pay_door_shown',   'trial_first_film_pay_door_clicked',
    'upgrade_modal_trial_door_shown',    'upgrade_modal_trial_door_clicked',
    'trial_active_banner_cta',           'trial_downgrade_modal_cta',
    'pricing_trial_1usd_clicked'
  )
group by 1, 2, 3
order by visitantes desc, linhas desc;

-- ── 2. DA PORTA ATÉ O DINHEIRO, POR CAMPANHA ────────────────────────────────
-- `intent_campaign` é o ÚNICO elo que sobrevive até o servidor: `checkout_started`
-- é evento de SERVIDOR e o metadata que o navegador passa para `checkout.launch`
-- NÃO chega nele. `pricing_surface` nunca vai aparecer ali — não procure.
with ck as (
  select
    coalesce(metadata->>'intent_campaign', '(sem campanha)') as campanha,
    metadata->>'stripe_session_id'                            as sessao,
    user_id,
    created_at
  from events
  where name = 'checkout_started'
    and created_at > '2026-09-07 18:38:00+00'
),
pg as (
  select user_id, metadata->>'stripe_session_id' as sessao, created_at,
         (metadata->>'amount_total')::int as centavos
  from events
  where name = 'payment_success'
    and created_at > '2026-09-07 18:38:00+00'
)
select
  ck.campanha,
  count(*)                                        as sessoes,
  count(distinct ck.user_id)                      as pessoas,
  count(pg.sessao)                                as pagaram,
  count(*) filter (where pg.centavos = 100)       as pagaram_1_dolar
from ck
left join pg on pg.sessao is not distinct from ck.sessao
group by 1
order by pessoas desc;

-- ── 3. O QUE O COBRADOR REGISTROU (card_trial é do SERVIDOR) ────────────────
-- `card_trial='1'` é escrito por app/api/stripe/checkout/route.ts quando
-- `wantsTrial`; `card_trial_denied='has_paid'` é a recusa. Se aparecer recusa,
-- alguma vitrine está oferecendo a porta a quem já pagou — e aí o defeito é o
-- gate estrito de `has_paid` da tela, não a copy.
select
  coalesce(metadata->>'card_trial', '(sem campo)')        as card_trial,
  coalesce(metadata->>'card_trial_denied', '-')           as recusa,
  coalesce(metadata->>'intent_campaign', '(sem campanha)') as campanha,
  count(*)                                                as sessoes,
  count(distinct user_id)                                 as pessoas
from events
where name = 'checkout_started' and created_at > '2026-09-07 18:38:00+00'
group by 1, 2, 3
order by sessoes desc;

-- ── 4. O RAMO QUE A PESSOA ENCONTRA AO CHEGAR ───────────────────────────────
-- ⚠️ `trial_active_banner_shown` é deduplicado por conta POR DIA (localStorage):
-- este flag é o retrato do PRIMEIRO render do dia, não de todo render. Serve
-- para medir CHEGADA — que é a janela de compra (10 dos 12 pagantes em 48h) —
-- e NÃO para afirmar "N pessoas nunca tiveram botão".
select
  coalesce(metadata->>'first_delivery_eligible', '(sem campo)') as ramo_sem_botao_antigo,
  count(*)                                                      as impressoes,
  count(distinct user_id)                                       as pessoas
from events
where name = 'trial_active_banner_shown'
  and created_at > '2026-09-01 14:00:00+00'
group by 1
order by pessoas desc;

-- ── 5. CHECAGEM ZERO DA PISTA ───────────────────────────────────────────────
select 'cadastros 24h' as k, count(*)::text v from profiles where created_at > now() - interval '24 hours'
union all select 'credito zero 24h', count(*)::text from profiles
  where created_at > now() - interval '24 hours' and coalesce(video_credits,0) = 0
union all select 'trial orfao 24h', count(*)::text from profiles
  where created_at > now() - interval '24 hours' and coalesce(video_credits,0) = 0 and trial_credits_granted is null
union all select 'render preso >45min', count(*)::text from videos
  where status in ('processing','pending','queued')
    and created_at > now() - interval '24 hours' and created_at < now() - interval '45 minutes'
union all select 'recusa de cartao 24h', count(*)::text from events
  where name = 'checkout_payment_failed' and created_at > now() - interval '24 hours'
union all select 'recusa SEM dono 24h', count(*)::text from events
  where name = 'checkout_payment_failed' and created_at > now() - interval '24 hours' and user_id is null
union all select 'ultimo payment_success', coalesce(max(created_at)::text, 'nunca') from events
  where name = 'payment_success';
