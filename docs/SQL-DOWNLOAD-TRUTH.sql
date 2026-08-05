-- docs/SQL-DOWNLOAD-TRUTH.sql — KINEO-DOWNLOAD-TRUTH-2026-08-04
--
-- NÃO É MIGRAÇÃO. Nenhum DDL, nada para aplicar. É a LEITURA da sprint das 21h
-- de 04/08, para a primeira sprint que rodar 24h depois do deploy.
--
-- O QUE ESTÁ SENDO MEDIDO
-- ───────────────────────
-- O maior buraco do funil: 327 pessoas geraram um vídeo `completed`, 67
-- baixaram (20%). Entre as 109 que chegaram na tela pós-render, 40 baixaram
-- (36,7%). Até 04/08 esse buraco era CEGO — `video_downloaded` só existia no
-- caminho feliz (blob), e o fallback (`window.open`) não disparava evento
-- nenhum. Três causas opostas colapsavam no mesmo silêncio.
--
-- Os eventos novos separam as três:
--   video_download_clicked        → o denominador honesto (dispara antes do await)
--   video_download_failed         → o blob quebrou; `reason` diz se é HTTP ou rede
--   video_download_popup_blocked  → o degrau 2 foi barrado (assinatura de MOBILE)
--   video_downloaded + method     → blob | popup | navigate
--
-- ⚠️ JANELA: nada antes do deploy conta. Preencher :deploy abaixo com o
-- timestamp do deploy READY (o push desta sprint) antes de rodar.

\set deploy '2026-08-05 00:00:00+00'

-- ── 1. O VEREDITO. Qual das três hipóteses é a verdadeira? ─────────────────
-- Ler assim:
--   clicou ≈ baixou            → o download FUNCIONA; o problema é (a) não
--                                clicar → a Medida 5 (CTA sticky) é a resposta.
--   clicou >> baixou           → o download QUEBRA. Olhar falhou/bloqueado.
--   bloqueado > 0              → é MOBILE. CTA sticky não resolveria nada.
with ext as (
  select id from public.profiles
  where email not ilike 'josephsskaf%' and email not ilike 'josephskaf%'
    and email not ilike '%@shortsforgeai.com'
    and email not ilike '%@mailinator.com'
    and email not ilike '%@example.com'
)
select e.name,
       count(*)                       eventos,
       count(distinct e.user_id)      pessoas,
       count(distinct e.metadata->>'device') filter (where e.metadata->>'device' = 'mobile') as tem_mobile
from public.events e
join ext on ext.id = e.user_id
where e.name in ('video_download_clicked','video_downloaded',
                 'video_download_failed','video_download_popup_blocked',
                 'video_download_dead_end')
  and e.created_at > :'deploy'::timestamptz
group by 1
order by pessoas desc;

-- ── 2. O CORTE QUE DECIDE: mobile × desktop ────────────────────────────────
-- Se a taxa de clique→download despencar no mobile, a correção é de mobile e
-- qualquer trabalho de copy/CTA é desperdício.
with ext as (
  select id from public.profiles
  where email not ilike 'josephsskaf%' and email not ilike 'josephskaf%'
    and email not ilike '%@shortsforgeai.com'
    and email not ilike '%@mailinator.com'
    and email not ilike '%@example.com'
),
ev as (
  select e.* from public.events e join ext on ext.id = e.user_id
  where e.created_at > :'deploy'::timestamptz
)
select coalesce(metadata->>'device','?')                                     device,
       count(distinct user_id) filter (where name='video_download_clicked')  clicaram,
       count(distinct user_id) filter (where name='video_downloaded')        baixaram,
       round(100.0 * count(distinct user_id) filter (where name='video_downloaded')
             / nullif(count(distinct user_id) filter (where name='video_download_clicked'),0), 1) pct_entregue,
       count(*) filter (where name='video_download_popup_blocked')           popups_barrados,
       count(*) filter (where name='video_download_failed')                  blobs_quebrados
from ev
where name in ('video_download_clicked','video_downloaded',
               'video_download_failed','video_download_popup_blocked')
group by 1
order by clicaram desc;

-- ── 3. Por qual degrau o arquivo saiu ──────────────────────────────────────
-- `navigate` e `popup` > 0 são downloads que ANTES eram invisíveis: cada um
-- deles é uma pessoa que a empresa contava como "não baixou".
select coalesce(metadata->>'method','(legado)') metodo,
       coalesce(metadata->>'surface','?')       tela,
       count(*) n, count(distinct user_id) pessoas
from public.events
where name = 'video_downloaded' and created_at > :'deploy'::timestamptz
group by 1,2 order by n desc;

-- ── 4. Motivo da falha do blob (só se o item 1 apontar quebra) ─────────────
-- HTTP 4xx/5xx  → problema no storage/URL assinada
-- "Failed to fetch" / TypeError → rede ou CORS
select metadata->>'reason' motivo, coalesce(metadata->>'device','?') device,
       count(*) n, count(distinct user_id) pessoas
from public.events
where name = 'video_download_failed' and created_at > :'deploy'::timestamptz
group by 1,2 order by n desc limit 20;

-- ── 5. Baseline congelado de 04/08 21:00 BRT (para comparar depois) ────────
--   geraram (completed, externos) ......... 327
--   viram a tela pós-render (next_shorts) . 109
--   baixaram alguma vez ................... 67   (20% de quem gerou)
--   baixaram entre os que viram a tela .... 40   (36,7%)
--   downloads totais ...................... 284  (4,2 por pessoa que baixa)
-- A leitura de 4,2 downloads por pessoa importa: quem baixa, baixa MUITO.
-- A perda não é gradual, é binária — ou a pessoa passa por essa porta, ou some.
