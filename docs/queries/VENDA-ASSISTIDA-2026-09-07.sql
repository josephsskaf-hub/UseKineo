-- ═══════════════════════════════════════════════════════════════════════════
-- VENDA ASSISTIDA — 07/09/2026 · SQL da pista das PESSOAS
-- Marco: 2026-09-07 20:00:00+00. Medição de eficácia recorta DEPOIS do marco.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- Q1. A CORREÇÃO DA LISTA A — "voltou 2+ vezes" contado de 4 jeitos.
--
-- Rodar ANTES de qualquer carta que afirme "você voltou duas vezes".
-- Em 07/09 devolveu: evento=104, hora=8, sessão=9, dia=2.
-- O jeito de 19/08 (por evento) infla ~11x porque um clique em comprar emite
-- checkout_cta_clicked + checkout_started + checkout_attempted em < 1 segundo.
-- ───────────────────────────────────────────────────────────────────────────
with ev as (
  select user_id, created_at, session_id
  from events
  where created_at > now() - interval '30 days'
    and name in ('checkout_started','checkout_attempted','checkout_cta_clicked')
    and user_id is not null
),
agg as (
  select user_id,
         count(*)                                        eventos,
         count(distinct session_id)                      sessoes,
         count(distinct date_trunc('day' , created_at))  dias,
         count(distinct date_trunc('hour', created_at))  horas
  from ev group by 1
),
paid as (select distinct user_id from events where name = 'payment_success' and user_id is not null)
select count(*) filter (where eventos >= 2) por_evento_2mais,   -- inflado
       count(*) filter (where horas   >= 2) por_hora_2mais,
       count(*) filter (where sessoes >= 2) por_sessao_2mais,   -- honesto
       count(*) filter (where dias    >= 2) por_dia_2mais,      -- conservador
       count(*)                             total_nao_pagantes
from agg a left join paid p using (user_id)
where p.user_id is null;

-- Q1b. CONTROLE do número baixo: se session_id fosse nulo, count(distinct)
-- devolveria 9 por engolir nulo, não por haver 9 sessões. Em 07/09: 500 de 500
-- linhas COM session_id. Rodar sempre junto da Q1.
select count(*) linhas, count(session_id) com_session,
       count(*) - count(session_id) sem_session
from events
where created_at > now() - interval '30 days'
  and name in ('checkout_started','checkout_attempted','checkout_cta_clicked')
  and user_id is not null;

-- Q1c. A PROVA MECÂNICA: distribuição do intervalo entre eventos consecutivos
-- de checkout da mesma pessoa. Em 07/09: mediana 0,86s; 297 de 388 pares < 5s.
with ev as (
  select user_id, created_at,
         extract(epoch from created_at
                 - lag(created_at) over (partition by user_id order by created_at)) gap_s
  from events
  where created_at > now() - interval '30 days'
    and name in ('checkout_started','checkout_attempted','checkout_cta_clicked')
    and user_id is not null
)
select count(*) filter (where gap_s is not null)                pares,
       count(*) filter (where gap_s < 5)                        gap_menor_5s,
       count(*) filter (where gap_s >= 5    and gap_s < 1800)   gap_5s_a_30min,
       count(*) filter (where gap_s >= 1800)                    gap_maior_30min,
       round(percentile_cont(0.5) within group (order by gap_s)::numeric, 2) mediana_gap_s
from ev;

-- ───────────────────────────────────────────────────────────────────────────
-- Q2. QUANTAS CARTAS A LISTA A JÁ RECEBEU (campanha vs. automática).
-- Em 07/09: 104 pessoas, 103 já receberam carta, média 7,4 (3,6 + 3,8),
-- recordista com 19.
-- ───────────────────────────────────────────────────────────────────────────
with tries as (
  select user_id from events
  where created_at > now() - interval '30 days'
    and name in ('checkout_started','checkout_attempted','checkout_cta_clicked')
    and user_id is not null
  group by 1 having count(*) >= 2
),
paid as (select distinct user_id from events where name = 'payment_success' and user_id is not null),
lista_a as (select t.user_id from tries t left join paid p using (user_id) where p.user_id is null),
camp as (select user_id, count(*) n from events where name like '%emailed%'            group by 1),
auto as (select user_id, count(*) n from events where name = 'trial_lifecycle_email_sent' group by 1)
select count(*)                                              pessoas,
       round(avg(coalesce(c.n,0)), 1)                        media_cartas_campanha,
       round(avg(coalesce(a.n,0)), 1)                        media_automaticas,
       round(avg(coalesce(c.n,0) + coalesce(a.n,0)), 1)      media_total,
       max(coalesce(c.n,0) + coalesce(a.n,0))                max_total,
       count(*) filter (where coalesce(c.n,0) = 0)           sem_nenhuma_campanha,
       count(*) filter (where coalesce(c.n,0)+coalesce(a.n,0) >= 10) com_10_ou_mais
from lista_a l left join camp c using (user_id) left join auto a using (user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- Q3. ⭐ A CONSULTA QUE DECIDE SE VALE ESCREVER OUTRA CARTA:
-- quantas cartas cada PAGANTE tinha recebido ANTES de pagar.
-- Em 07/09 (45 dias, 9 pagantes): 7 tinham ZERO. 1 tinha uma. 1 tinha três.
-- Enquanto isso a lista A tem média 7,4 e pagou zero.
-- Se este número continuar assim, carta nova não é a alavanca.
-- ───────────────────────────────────────────────────────────────────────────
select p.user_id,
       p2.pay pagou_em,
       (select count(*) from events e
         where e.user_id = p.user_id
           and (e.name like '%emailed%' or e.name = 'trial_lifecycle_email_sent')
           and e.created_at < p2.pay) cartas_antes
from events p
join lateral (select min(e2.created_at) pay from events e2
              where e2.user_id = p.user_id and e2.name = 'payment_success') p2 on true
where p.name = 'payment_success'
  and p.user_id is not null
  and p.created_at > now() - interval '45 days'
group by p.user_id, p2.pay
order by pagou_em desc;

-- ───────────────────────────────────────────────────────────────────────────
-- Q4. A LISTA A HONESTA — as 9 que voltaram em OUTRA sessão. É a lista com
-- que se pode falar sem mentir. Ordenada pelo que a pessoa já entregou.
-- ───────────────────────────────────────────────────────────────────────────
with ses as (
  select user_id, session_id, min(created_at) t from events
  where created_at > now() - interval '30 days'
    and name in ('checkout_started','checkout_attempted','checkout_cta_clicked')
    and user_id is not null
  group by 1,2
),
agg as (select user_id, count(*) sessoes, min(t) primeira, max(t) ultima
         from ses group by 1 having count(*) >= 2),
paid as (select distinct user_id from events where name = 'payment_success' and user_id is not null)
select a.user_id, a.sessoes,
       round(extract(epoch from a.ultima - a.primeira)/3600, 1) horas_entre,
       p.plan, p.video_credits,
       (select count(*) from videos v where v.user_id = a.user_id and v.status = 'completed') filmes_ok,
       (select count(*) from events e where e.user_id = a.user_id and e.name like '%emailed%')  cartas
from agg a
join profiles p on p.id = a.user_id
left join paid pd on pd.user_id = a.user_id
where pd.user_id is null
order by filmes_ok desc, a.sessoes desc;

-- ───────────────────────────────────────────────────────────────────────────
-- Q5. LISTA C — o trilho de afiliados. Em 07/09: 15 afiliados, 25 cliques
-- (14 em 30d), 0 atribuições, 0 comissões NA HISTÓRIA INTEIRA.
-- Enquanto `atribuicoes` for 0 com `cliques` > 0, a V3 fica BLOQUEADA:
-- pedir divulgação num trilho que não credita é pedir trabalho de graça.
-- ───────────────────────────────────────────────────────────────────────────
select (select count(*) from affiliates)                                            afiliados,
       (select count(*) from affiliate_clicks)                                       cliques,
       (select count(*) from affiliate_clicks where created_at > now() - interval '30 days') cliques_30d,
       (select max(created_at) from affiliate_clicks)                                ultimo_clique,
       (select count(*) from affiliate_referrals)                                    atribuicoes,
       (select count(*) from affiliate_commissions)                                  comissoes;

-- ───────────────────────────────────────────────────────────────────────────
-- Q6. MEDIÇÃO POR CARTA depois do marco (V5 do cardápio). Trocar o nome do
-- evento pela carta que se quer medir. `pagou_depois` é o único número que
-- paga a conta — `checkout_success_viewed` NÃO é venda (memória
-- `evento-de-sucesso-que-nao-e-dinheiro`), só `payment_success` é.
-- ───────────────────────────────────────────────────────────────────────────
select e.name carta,
       count(*)                                                          enviadas,
       count(distinct e.user_id)                                         pessoas,
       count(*) filter (where exists (
         select 1 from events v
          where v.user_id = e.user_id
            and v.created_at > e.created_at
            and v.session_id is not null))                               voltaram_ao_site,
       count(*) filter (where exists (
         select 1 from events c
          where c.user_id = e.user_id
            and c.name in ('checkout_started','checkout_cta_clicked')
            and c.created_at > e.created_at))                            clicaram_comprar,
       count(*) filter (where exists (
         select 1 from events pg
          where pg.user_id = e.user_id
            and pg.name = 'payment_success'
            and pg.created_at > e.created_at))                           pagaram
from events e
where e.created_at > '2026-09-07 20:00:00+00'::timestamptz
  and (e.name like '%emailed%' or e.name like '%_rescue_sent')
group by 1
order by enviadas desc;

-- ═══════════════════════════════════════════════════════════════════════
-- ROTAÇÃO #2 (07/09) — O TRILHO DE AFILIADO: VAZIO, NÃO QUEBRADO
-- ═══════════════════════════════════════════════════════════════════════

-- Q10 — A ADOÇÃO DO CONSERTO, NÃO A EXISTÊNCIA DELE.
-- `finalizeAffiliateSignupAttribution` (076ca7bb, 29/08) grava
-- `affiliate_signup_attribution_result` em TODA finalização, e só volta cedo
-- SEM gravar quando não há cookie. Logo: 0 eventos = 0 cadastros carregando
-- cookie de afiliado. O denominador honesto é `cliques_humanos_pos` (6), NUNCA
-- `cadastros_pos_conserto` (313).
select
 (select count(*) from affiliate_clicks where created_at > '2026-08-29') cliques_pos_conserto,
 (select count(*) from affiliate_clicks where created_at > '2026-08-29'
    and user_agent not ilike '%bot%' and user_agent not ilike '%whatsapp%') cliques_humanos_pos,
 (select count(*) from events where name='affiliate_signup_attribution_result') eventos_atribuicao,
 (select count(*) from profiles where created_at > '2026-08-29') cadastros_pos_conserto;

-- Q11 — OS "25 CLIQUES DA HISTÓRIA" DEPOIS DE TIRAR ROBÔ E AUTOTESTE.
-- 10 de 25 são bot/preview (SemrushBot, WhatsApp). Dos 15 restantes, 10 são
-- uma rajada de 25 min no mesmo código com o mesmo Android = o afiliado
-- testando o próprio link. Nunca citar "25 cliques" sem este recorte.
with cl as (
  select c.*, a.code,
    case when c.user_agent ilike '%bot%' or c.user_agent ilike '%WhatsApp%'
          or c.user_agent ilike '%crawler%' or c.user_agent ilike '%spider%'
         then 'bot/preview' else 'humano?' end tipo
  from affiliate_clicks c join affiliates a on a.id = c.affiliate_id)
select tipo, count(*) cliques, count(distinct code) codigos,
       count(distinct (code || coalesce(ip_hash,'?') || left(user_agent,60))) visitantes_aprox,
       count(*) filter (where created_at > now() - interval '30 days') em_30d
from cl group by tipo;

-- Q12 — LISTA B (AUTOPILOT), COM AS DUAS ARMADILHAS À MOSTRA.
-- `eventos_ck` 2-3 com `primeiro_ck`/`ultimo_ck` a <1s = UM clique, não uma
-- deliberação (mesmo artefato da Q1). `amt` nulo nos 7 = a casa NÃO sabe que
-- preço a pessoa viu; nenhuma carta pode citar $299.
with b as (
  select user_id, min(created_at) primeiro_ck, max(created_at) ultimo_ck,
         count(*) eventos_ck, max(metadata->>'amount_total') amt
  from events
  where name in ('checkout_started','checkout_cta_clicked','checkout_attempted','checkout_session_created')
    and metadata->>'tier' ilike '%autopilot%'
  group by user_id)
select p.email, p.plan, p.has_paid, p.video_credits,
       b.primeiro_ck, b.eventos_ck,
       extract(epoch from (b.ultimo_ck - b.primeiro_ck)) segundos_entre_1o_e_ultimo,
       b.amt,
       (select count(*) from videos v where v.user_id = b.user_id) filmes,
       (select count(*) from events e where e.user_id = b.user_id and e.name like '%emailed%') cartas_recebidas,
       (select max(e.created_at) from events e where e.user_id = b.user_id) ultima_atividade
from b join profiles p on p.id = b.user_id
order by b.ultimo_ck desc;
