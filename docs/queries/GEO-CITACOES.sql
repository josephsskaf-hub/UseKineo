-- GEO-CITACOES.sql — KINEO-GEO-CITACAO-SEMANAL-2026-10-08
-- Leitura do monitor semanal de citação no ChatGPT: app/api/cron/geo-citation-monitor (toda segunda, 12:00 UTC).
-- SELECT somente leitura. Fonte: public.events —
--   · 'geo_citation_check'   = 1 linha por pergunta por rodada (metadata: week, question_id, question, ok, mentions_kineo,
--                              cites_usekineo, usekineo_urls, competitors_mentioned, cited_hosts, answer, searches...);
--   · 'geo_citation_summary' = 1 linha por rodada (status running → done, totais, custo estimado).
-- Os dois nomes estão no SERVER_ONLY_EVENTS do sink /api/events: o navegador não consegue forjá-los.
-- Denominador = respostas que VIERAM (metadata.ok = true). Pergunta que falhou (timeout, 429) conta em `falhas`,
-- nunca como "sem Kineo".
-- mentions_kineo = a Kineo NOMEADA no texto que a pessoa lê; cites_usekineo = algum link para usekineo.com
-- (o chip de citação conta só aqui). Na pergunta da marca ('kineo-brand') o nome aparece até numa resposta
-- "não encontrei" — nela, a coluna que vale é pct_citando_usekineo.
-- A semana é a da rodada (segunda 00:00 UTC, gravada pela rota em metadata.week).

-- 1) Por pergunta, semana a semana — e uma linha TOTAL por semana.
with checks as (
  select coalesce((e.metadata->>'week')::date, (date_trunc('week', e.created_at at time zone 'UTC'))::date) as semana,
         e.metadata->>'question_id' as pergunta_id,
         e.metadata->>'question' as pergunta,
         (e.metadata->>'ok')::boolean is true as respondeu,
         (e.metadata->>'mentions_kineo')::boolean is true as com_kineo,
         (e.metadata->>'cites_usekineo')::boolean is true as cita_usekineo
  from public.events e
  where e.name = 'geo_citation_check'
)
select semana,
       case when grouping(pergunta_id) = 1 then 'TOTAL' else pergunta_id end as pergunta_id,
       case when grouping(pergunta_id) = 1 then '(todas as perguntas)' else max(pergunta) end as pergunta,
       count(*) filter (where respondeu) as respostas,
       count(*) filter (where not respondeu) as falhas,
       round(100.0 * count(*) filter (where respondeu and com_kineo) / nullif(count(*) filter (where respondeu), 0), 1) as pct_com_kineo,
       round(100.0 * count(*) filter (where respondeu and cita_usekineo) / nullif(count(*) filter (where respondeu), 0), 1) as pct_citando_usekineo
from checks
group by grouping sets ((semana, pergunta_id), (semana))
order by semana desc, grouping(pergunta_id), pergunta_id;

-- 2) Quem aparece no lugar da Kineo: concorrentes nas respostas que vieram, por semana.
select coalesce((e.metadata->>'week')::date, (date_trunc('week', e.created_at at time zone 'UTC'))::date) as semana,
       c.concorrente,
       count(*) as respostas_com_ele
from public.events e
cross join lateral jsonb_array_elements_text(coalesce(e.metadata->'competitors_mentioned', '[]'::jsonb)) as c(concorrente)
where e.name = 'geo_citation_check'
  and (e.metadata->>'ok')::boolean is true
group by 1, 2
order by 1 desc, 3 desc, 2;

-- 3) Saúde e custo de cada rodada (status 'running' que ficou = a função morreu no meio; forced = rodada manual).
select (e.metadata->>'week')::date as semana,
       e.metadata->>'status' as status,
       (e.metadata->>'forced')::boolean as manual,
       (e.metadata->>'planned')::int as planejadas,
       (e.metadata->>'calls')::int as chamadas,
       (e.metadata->>'answered')::int as respondidas,
       (e.metadata->>'failed')::int as falhas,
       (e.metadata->>'est_usd')::numeric as usd_estimado,
       e.created_at
from public.events e
where e.name = 'geo_citation_summary'
order by e.created_at desc
limit 26;
