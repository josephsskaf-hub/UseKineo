-- ═══════════════════════════════════════════════════════════════════════════
-- VENDA ASSISTIDA — 07/09/2026 · medição da pista das PESSOAS
-- Marco da pista: 2026-09-07 20:00:00+00. Rotação #3.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ LEIA ANTES DE COPIAR QUALQUER NÚMERO DAQUI.
--
-- 1. `events.name`, nunca `events.type` — a coluna `type` NÃO EXISTE (memória
--    `zero-por-chave-inexistente`). Vocabulário conferido nesta rotação:
--    video_generation_started / video_generation_completed / pricing_view /
--    welcome_offer_viewed / checkout_started / checkout_cta_clicked /
--    checkout_attempted / payment_success. Um nome inventado devolve ZERO sem
--    erro nenhum: sempre ancore um número novo num já conhecido.
-- 2. `payment_success` é a ÚNICA prova de dinheiro. `checkout_success_viewed`
--    dispara em VISITA à página (memória `evento-de-sucesso-que-nao-e-dinheiro`).
-- 3. A conta do fundador infla tudo — excluir SEMPRE (ele fez 3 dos 4 checkouts
--    de um dia recente).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. A JANELA DE COMPRA — o achado que redirecionou a rotação #3
-- ═══════════════════════════════════════════════════════════════════════════
-- Resultado medido em 07/09 (90 dias, contas externas): 12 pagantes.
--   0.0h · 0.1h · 0.4h · 0.5h · 1.0h · 4.2h · 7.4h  ← 7 em MENOS DE 8 HORAS
--   24.3h · 41.4h · 42.7h                            ← 10 em menos de 48h
--   247.1h · 399.7h                                  ← as DUAS da campanha de
--                                                       review de agosto
-- Mediana: ~5,8h. Nenhum pagante ORGÂNICO nasceu depois do D2 em 90 dias.
with pay as (
  select user_id, min(created_at) as paid_at
  from events
  where name = 'payment_success'
    and created_at > now() - interval '90 days'
    and user_id is not null
  group by 1
)
select pr.email,
       pr.created_at::date as signup_dia,
       pay.paid_at,
       round(extract(epoch from (pay.paid_at - pr.created_at)) / 3600.0, 1) as horas_ate_pagar
from pay
join profiles pr on pr.id = pay.user_id
where pr.email not ilike '%josephsskaf%'
order by horas_ate_pagar;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. A CASA FALA TARDE — primeira carta vs. janela de compra
-- ═══════════════════════════════════════════════════════════════════════════
-- Medido em 07/09 (14 dias): 380 cadastros, TODOS recebem carta alguma hora.
-- Mediana até a PRIMEIRA carta = 25,3h. Só 134 de 380 ouvem algo nas 8h em que
-- 7 dos 12 pagantes pagaram.
-- ⚠️ O que isto NÃO prova: que a carta cedo faria pagar. Quem paga rápido pode
-- pagar rápido por já ter chegado decidido. O que está provado é só o
-- DESENCONTRO entre onde a casa fala e onde o dinheiro acontece.
with novos as (
  select id, created_at from profiles
  where created_at > now() - interval '14 days'
    and email not ilike '%josephsskaf%'
),
prim as (
  select n.id,
         n.created_at,
         min(l.sent_at) as primeira_carta,
         count(*) filter (where l.sent_at < n.created_at + interval '8 hours')  as cartas_8h,
         count(*) filter (where l.sent_at < n.created_at + interval '48 hours') as cartas_48h
  from novos n
  left join email_send_log l on l.user_id = n.id and l.ok is not false
  group by n.id, n.created_at
)
select count(*)                                              as cadastros_14d,
       count(*) filter (where cartas_8h  > 0)                as com_carta_nas_8h,
       count(*) filter (where cartas_48h > 0)                as com_carta_nas_48h,
       round((percentile_cont(0.5) within group (
         order by extract(epoch from (primeira_carta - created_at)) / 3600.0))::numeric, 1)
                                                             as mediana_h_ate_1a_carta
from prim;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PARA ONDE APONTA A VAZÃO DE E-MAIL DA CASA
-- ═══════════════════════════════════════════════════════════════════════════
-- Medido em 07/09 (14 dias): lastcall_d10 400 · offer_d5 385 · downgraded_loss
-- 323 · ending_soon 296 · d0_welcome 285. Ou seja 785 cartas de pós-morte
-- contra 285 de boas-vindas — 2,7 para 1 na direção da janela que nunca
-- produziu um pagante orgânico.
select kind,
       count(*)                  as envios_14d,
       count(distinct user_id)   as pessoas,
       count(*) filter (where yielded) as cederam_a_vez
from email_send_log
where sent_at > now() - interval '14 days'
group by 1
order by 2 desc;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. A PORTA DE ENTRADA NAS CARTAS D5/D10 — medição do que subiu na #3
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ O CORTE É O CARIMBO, NÃO O RELÓGIO (memória `campo-novo-e-o-carimbo-do-
-- deploy`): quem recebeu o bundle novo é quem tem body = 'offer_with_film_1usd'.
-- Cortar por hora inventaria defeito, porque o cron roda de hora em hora e o
-- deploy não vira a chave no mesmo minuto para todo mundo.
select date_trunc('day', e.created_at) as dia,
       e.metadata ->> 'body'           as corpo,
       count(*)                        as envios,
       count(distinct e.user_id)       as pessoas
from events e
where e.name = 'trial_lifecycle_email_sent'
  and e.created_at > timestamptz '2026-09-07 20:00:00+00'
  and e.metadata ->> 'kind' in ('expired_offer_d5', 'expired_lastcall_d10')
group by 1, 2
order by 1 desc, 3 desc;

-- 4b. O DESFECHO, por pessoa: quem recebeu o corpo novo voltou? clicou? pagou?
-- O clique na porta chega com `intent_campaign` = trial_1usd_d5 / trial_1usd_d10
-- no checkout; o retorno ao site é qualquer evento de navegador depois do envio.
-- ⚠️ Clique de inbox chega SEM cookie (memória `clique-de-inbox-chega-sem-
-- cookie`): não exigir sessão para contar o retorno.
with enviados as (
  select e.user_id,
         min(e.created_at) as enviado_em,
         min(e.metadata ->> 'kind') as carta
  from events e
  where e.name = 'trial_lifecycle_email_sent'
    and e.metadata ->> 'body' = 'offer_with_film_1usd'
    and e.created_at > timestamptz '2026-09-07 20:00:00+00'
  group by 1
)
select count(*) as receberam_o_corpo_novo,
       count(*) filter (where exists (
         select 1 from events v
         where v.user_id = s.user_id and v.created_at > s.enviado_em
           and v.name in ('homepage_view', 'generate_page_view', 'pricing_view')
       )) as voltaram_ao_site,
       count(*) filter (where exists (
         select 1 from events c
         where c.user_id = s.user_id and c.created_at > s.enviado_em
           and c.name in ('checkout_started', 'checkout_cta_clicked', 'checkout_attempted')
           and coalesce(c.metadata ->> 'intent_campaign', '') like 'trial_1usd_d%'
       )) as clicaram_a_porta_de_entrada,
       count(*) filter (where exists (
         select 1 from events p
         where p.user_id = s.user_id and p.created_at > s.enviado_em
           and p.name = 'payment_success'
       )) as pagaram
from enviados s;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. CHECAGEM ZERO DESTA PISTA — a oferta que o caixa recusaria
-- ═══════════════════════════════════════════════════════════════════════════
-- A carta oferece `?trial=1`, e o servidor NEGA quem tem has_paid = true
-- (grava card_trial_denied). Se esta consulta deixar de dar 0, a casa está
-- oferecendo uma porta que o próprio caixa fecha na cara da pessoa
-- (memória `vitrine-oferece-o-que-o-cobrador-recusa`).
select count(*) as recebeu_a_porta_mas_o_caixa_recusaria
from events e
join profiles pr on pr.id = e.user_id
where e.name = 'trial_lifecycle_email_sent'
  and e.metadata ->> 'body' = 'offer_with_film_1usd'
  and e.created_at > timestamptz '2026-09-07 20:00:00+00'
  and pr.has_paid is true;


-- ══════════════════════════════════════════════════════════════════════════
-- va-r5 (07/09 ~19:30 BRT) — A PORTA DE ENTRADA PAGA NO E-MAIL DE ENTREGA
-- SHA 7d3b0817. Marco do deploy: use o CAMPO, nunca o relogio
-- (memoria `campo-novo-e-o-carimbo-do-deploy`): so os envios do bundle novo
-- carregam `metadata ? 'trial_door'`.
-- ══════════════════════════════════════════════════════════════════════════

-- V5.1 — ALCANCE: quantos e-mails de entrega saem por dia, por rodape, e em
-- quantos deles a porta entrou. As tres familias de "filme pronto" juntas.
select
  e.name                                              as remetente,
  coalesce(e.metadata ->> 'footer', '(sem carimbo)')  as rodape,
  (e.metadata ->> 'trial_door')::boolean              as porta,
  count(*)                                            as envios,
  count(distinct e.user_id)                           as pessoas,
  min(e.created_at)                                   as primeiro,
  max(e.created_at)                                   as ultimo
from events e
where e.name in ('video_ready_email_sent', 'stranded_ready_sent', 'video_ready_nudge_sent')
  and e.metadata ? 'trial_door'          -- so o bundle novo; relogio nao serve
group by 1, 2, 3
order by envios desc;

-- V5.2 — O DEGRAU: quem RECEBEU a porta e chegou ao checkout por ela.
-- O carimbo do link (`intent_campaign`) e propagado pela rota de checkout ate
-- o `payment_success`, entao a mesma chave serve para os tres degraus.
-- ⚠ CONTROLE OBRIGATORIO antes de ler um zero aqui: a linha `controle` conta
-- QUALQUER chegada com intent_campaign no periodo. Se ela vier 0 tambem, o
-- problema e a escrita do campo, nao a peca (memoria `provar-leitura-sem-trafego`).
with recebeu as (
  select distinct user_id
  from events
  where metadata ? 'trial_door'
    and (metadata ->> 'trial_door')::boolean is true
    and name in ('video_ready_email_sent', 'stranded_ready_sent', 'video_ready_nudge_sent')
)
select
  (select count(*) from recebeu)                                                    as receberam_a_porta,
  (select count(distinct user_id) from events
     where metadata ->> 'intent_campaign' = 'video_ready_email_trial_1usd_v1')      as clicaram_na_porta,
  (select count(distinct user_id) from events
     where name = 'checkout_started'
       and metadata ->> 'intent_campaign' = 'video_ready_email_trial_1usd_v1')      as abriram_checkout,
  (select count(distinct user_id) from events
     where name = 'payment_success'
       and metadata ->> 'intent_campaign' = 'video_ready_email_trial_1usd_v1')      as pagaram,
  (select count(distinct user_id) from events
     where metadata ->> 'intent_campaign' = 'video_ready_email_plan_truth_v1')      as comparacao_link_do_plano,
  (select count(*) from events
     where metadata ? 'intent_campaign'
       and created_at > timestamptz '2026-09-07 22:00:00+00')                       as controle_qualquer_intent;

-- V5.3 — A TRAVA FUNCIONA? Ninguem com has_paid=true pode ter recebido a porta.
-- Uma linha aqui = a casa anunciou o que o cobrador recusa. Deve dar SEMPRE 0.
select count(*) as violacoes_da_trava
from events
where metadata ? 'trial_door'
  and (metadata ->> 'trial_door')::boolean is true
  and (metadata ->> 'has_paid')::boolean is true;

-- V5.4 — QUANTOS PERDEM A PORTA POR LEITURA DE PERFIL FALHA (has_paid null).
-- Falha fechada de proposito; se este numero for grande, o conserto e a
-- leitura do perfil, nao afrouxar a trava.
select
  coalesce(e.metadata ->> 'has_paid', 'null') as has_paid_no_envio,
  count(*)                                    as envios,
  count(distinct e.user_id)                   as pessoas
from events e
where e.metadata ? 'trial_door'
group by 1 order by envios desc;

-- ═══════════════════════════════════════════════════════════════════════════
-- V6 — A PORTA DE ENTRADA NO MOMENTO DA PERDA (va-r6, commit e8b401c4)
-- ═══════════════════════════════════════════════════════════════════════════
-- Corte SEMPRE pelo campo novo `trial_door`, NUNCA pelo relogio
-- (memoria `campo-novo-e-o-carimbo-do-deploy`). Linha sem o campo e de antes.

-- V6.1 — ALCANCE: quantas cartas da perda sairam, e quantas levavam a porta.
-- O ramo `neverRan` carimba FALSE de proposito: ele e denominador, nao ausencia.
select
  metadata->>'body'                                as ramo,
  count(*)                                         as envios,
  count(distinct user_id)                          as pessoas,
  count(*) filter (where metadata ? 'trial_door')  as com_carimbo,
  count(*) filter (where (metadata->>'trial_door') = 'true')  as com_porta,
  count(*) filter (where (metadata->>'trial_door') = 'false') as sem_porta_de_proposito,
  min(created_at) as primeiro, max(created_at) as ultimo
from events
where name = 'trial_lifecycle_email_sent'
  and metadata->>'kind' = 'downgraded_loss'
  and metadata ? 'trial_door'          -- so o bundle novo
group by 1
order by envios desc;

-- V6.2 — O DEGRAU: quem RECEBEU a porta e voltou por ela.
-- As duas campanhas sao separadas de proposito (um campo em duas superficies
-- nasce de UMA variavel por superficie) — nao somar antes de olhar separado.
-- ⚠️ CONTROLE OBRIGATORIO antes de ler um zero aqui: rodar a V6.3.
select
  coalesce(metadata->>'intent_campaign', metadata->>'utm_campaign') as campanha,
  count(*)                                            as chegadas,
  count(distinct user_id)                             as pessoas,
  count(distinct coalesce(user_id::text, session_id)) as visitantes,
  min(created_at) as primeira, max(created_at) as ultima
from events
where coalesce(metadata->>'intent_campaign', metadata->>'utm_campaign')
      in ('trial_1usd_loss', 'trial_1usd_loss_burned')
group by 1 order by chegadas desc;

-- V6.3 — CONTROLE DA LEITURA (rodar SEMPRE junto com a V6.2).
-- Se o campo nao estiver sendo escrito por ninguem, um zero na V6.2 e cegueira,
-- nao comportamento (memoria `provar-leitura-sem-trafego`).
select
  count(*) filter (where metadata ? 'intent_campaign')            as com_intent_campaign,
  count(*) filter (where metadata->>'utm_campaign' is not null)   as com_utm_campaign,
  count(distinct metadata->>'utm_campaign')                       as campanhas_distintas
from events
where created_at > now() - interval '60 days';

-- V6.4 — DINHEIRO: alguem que recebeu a porta da perda pagou?
-- `payment_success` e a UNICA prova de venda — `checkout_success_viewed`
-- dispara em visita a pagina (memoria `evento-de-sucesso-que-nao-e-dinheiro`).
with recebeu as (
  select distinct user_id
  from events
  where name = 'trial_lifecycle_email_sent'
    and metadata->>'kind' = 'downgraded_loss'
    and (metadata->>'trial_door') = 'true'
)
select
  (select count(*) from recebeu)                                          as receberam_a_porta,
  count(distinct e.user_id) filter (where e.name = 'checkout_started')     as chegaram_ao_checkout,
  count(distinct e.user_id) filter (where e.name = 'payment_success')      as pagaram
from recebeu r
left join events e
  on e.user_id = r.user_id
 and e.created_at > now() - interval '60 days';

-- V6.5 — A JANELA DE COMPRA, para refazer a conta que decidiu a va-r6.
-- 12 pagantes em 90d; DEZ pagaram em menos de 48h do cadastro.
with pay as (
  select user_id, min(created_at) as pago
  from events
  where name = 'payment_success' and created_at > now() - interval '90 days'
    and user_id is not null
  group by 1
)
select
  count(*)                                                             as pagantes,
  count(*) filter (where pago - pr.created_at < interval '48 hours')   as pagaram_em_48h,
  round(avg(extract(epoch from (pago - pr.created_at))/3600.0)::numeric, 1) as media_horas
from pay join profiles pr on pr.id = pay.user_id
where pr.email not ilike '%josephsskaf%';
