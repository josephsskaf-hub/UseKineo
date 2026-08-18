-- ============================================================================
-- FUNIL — CONSULTA CANÔNICA (KINEO-FUNIL-DENOMINADOR-UNICO-2026-08-17)
-- ============================================================================
-- POR QUE ESTE ARQUIVO EXISTE
--
-- Em 17/08 o relatório das 19h subiu um alerta 🔴 "conclusão de geração desabou
-- para 34% (199 iniciadas → 67 concluídas)" e mandou o assunto para a sprint
-- das 21h como item #1. Era ARTEFATO DE MEDIÇÃO, não queda de produto:
--
--   · 16h usou  video_generation_started / video_generation_completed → 87 → 50 (57%)
--   · 19h usou  OUTRO instrumento no numerador/denominador             → 199 → 67 (34%)
--
-- O dia inteiro teve 102 `video_generation_started`. Um denominador de 199 às
-- 18h é impossível para o mesmo instrumento. O que mudou foi a régua, não o
-- produto. Três instrumentos independentes, medidos às 22h de 17/08, batem:
--
--   A) eventos video_generation_started/completed ..... 102 → 60  (59%)
--   B) generate_started/generate_completed ............ 102 → 60  (59%)
--   C) tabela videos (linhas criadas no dia) .......... 62 linhas, 62 com URL
--   D) analyze_idea_clicked = 180 → é CLIQUE, não geração. NUNCA usar como
--      denominador de conclusão. (180 cliques vieram de 51 pessoas.)
--
-- 59% hoje contra 61% ontem = estável. O 🔴 era falso.
--
-- REGRA DA CASA A PARTIR DE AGORA: todo número de funil que entra em
-- SPRINT-*.md ou no relatório do CEO sai DESTE arquivo, sem reescrever a query
-- na mão. Se o número tiver de mudar de instrumento, muda AQUI, uma vez, e a
-- série histórica continua comparável.
-- ============================================================================

-- ── 1. FUNIL DO DIA (fuso America/Sao_Paulo, que é o fuso das sprints) ──────
-- Use este bloco para as linhas "iniciadas → concluídas" da tabela de números.
with dia as (select date_trunc('day', now() at time zone 'America/Sao_Paulo') d)
select
  (select count(*) from events, dia
     where name = 'video_generation_started'
       and (created_at at time zone 'America/Sao_Paulo') >= d)                as iniciadas,
  (select count(*) from events, dia
     where name = 'video_generation_completed'
       and (created_at at time zone 'America/Sao_Paulo') >= d)                as concluidas,
  round(100.0 *
    (select count(*) from events, dia where name = 'video_generation_completed'
       and (created_at at time zone 'America/Sao_Paulo') >= d) /
    nullif((select count(*) from events, dia where name = 'video_generation_started'
       and (created_at at time zone 'America/Sao_Paulo') >= d), 0))           as pct_por_evento;

-- ── 2. O MESMO FUNIL POR PESSOA (o número honesto para decisão) ─────────────
-- Evento conta RETENTATIVA; pessoa conta GENTE. Quem decide o que consertar
-- quer saber quantas PESSOAS saíram sem vídeo, não quantos cliques falharam.
-- Em 17/08: 51 clicaram → 48 iniciaram → 33 concluíram (69%); 15 pessoas
-- passaram o dia tentando e saíram com ZERO vídeo.
with d as (select date_trunc('day', now() at time zone 'America/Sao_Paulo') dd),
cl as (select distinct user_id from events, d
        where name = 'analyze_idea_clicked'
          and (created_at at time zone 'America/Sao_Paulo') >= dd and user_id is not null),
st as (select distinct user_id from events, d
        where name = 'video_generation_started'
          and (created_at at time zone 'America/Sao_Paulo') >= dd and user_id is not null),
co as (select distinct user_id from events, d
        where name = 'video_generation_completed'
          and (created_at at time zone 'America/Sao_Paulo') >= dd and user_id is not null)
select (select count(*) from cl)                                       as clicaram_analyze,
       (select count(*) from st)                                       as iniciaram,
       (select count(*) from co)                                       as concluiram,
       (select count(*) from st
          where user_id not in (select user_id from co))               as sairam_sem_nenhum_video;

-- ── 3. AQUISIÇÃO → DINHEIRO, POR FONTE (14 dias) ───────────────────────────
-- Este é o bloco que responde "vale a pena pagar por este canal?".
-- Medido em 17/08: 343 cadastros · 190 fizeram vídeo (55%) · 48 abriram
-- checkout (14%) · ZERO pagaram — em TODAS as fontes, inclusive taaft (164
-- cadastros, 0 dólares). Ativação não é o gargalo; o fechamento é.
with p as (select id, coalesce(signup_utm_source, '(sem utm)') fonte
             from profiles where created_at >= now() - interval '14 days'),
v as (select distinct user_id from events
        where name = 'video_generation_completed' and created_at >= now() - interval '14 days'),
c as (select distinct user_id from events
        where name = 'checkout_started' and created_at >= now() - interval '14 days')
select p.fonte,
       count(*)                                                              as signups,
       count(*) filter (where p.id in (select user_id from v))               as fez_video,
       round(100.0 * count(*) filter (where p.id in (select user_id from v))
             / count(*))                                                     as pct_ativacao,
       count(*) filter (where p.id in (select user_id from c))               as foi_ao_checkout,
       count(*) filter (where p.id in
             (select id from profiles where has_paid))                       as pagou
from p group by 1 having count(*) >= 3 order by signups desc;

-- ⚠️ NÃO usar `profiles.scripts_generated` / `profiles.generations_used` para
-- ativação: as duas colunas devolvem 0% para TODAS as fontes (deixaram de ser
-- incrementadas em algum ponto). Ativação sai de `video_generation_completed`.

-- ── 4. O PORTÃO DE RENDER FANTASMA (bloqueios que matam geração) ───────────
-- 127 dos 158 erros de 48h em 17/08 eram este motivo. Último bloqueio às 10h
-- de 17/08; a correção das 16h entrou depois disso, então "zero bloqueios
-- desde a correção" AINDA NÃO É PROVA — o padrão é em rajada. Continuar
-- olhando esta linha por alguns dias antes de declarar resolvido.
select to_char(date_trunc('hour', created_at at time zone 'America/Sao_Paulo'), 'MM-DD HH24') hora,
       count(*) bloqueios, count(distinct user_id) pessoas
from events
where name = 'generation_stage_error'
  and metadata->>'reason' = 'analyze_blocked_active_render_gate'
  and created_at >= now() - interval '96 hours'
group by 1 order by 1;

-- ── 5. CONCESSÃO DO TRIAL: o que a conta REALMENTE recebeu ─────────────────
-- A troca 40→50 entrou em produção entre 13h e 15h (BRT) de 17/08. Corte limpo:
-- nenhuma conta depois das 15h saiu com 40. Consequência viva: 139 contas em
-- trial ATIVO têm concessão de 40 e 18 têm 50 — por isso superfície LOGADA tem
-- de falar `profiles.trial_credits_granted` (o fato daquela conta) e só
-- superfície PÚBLICA pode falar a constante `TRIAL_GRANT_CREDITS_COPY` (a oferta).
select trial_credits_granted, count(*) contas_em_trial_ativo, sum(video_credits) creditos_restantes
from profiles where trial_status = 'active' group by 1 order by 1;
