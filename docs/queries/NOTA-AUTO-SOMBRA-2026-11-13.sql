-- KINEO-NOTA-AUTO-V3-1311 — A NOTA AUTOMÁTICA NA SOMBRA, MEDIDA AO VIVO (sem ensaio pago).
-- Por dia (horário de Brasília): filmes julgados pelo juiz automático × a nota do REVISOR no mesmo filme.
-- Régua do dono para a automática ir ao painel: acerto nos ruins (< 7) ≥ 85% E alarme falso nos bons (≥ 7,5) ≤ 10%.
-- Erro médio só vale como número se ficar abaixo de "dar 7 a todos" (coluna erro_dar_7) — senão a nota não serve para o painel.
-- Fonte da automática: evento nota_auto da versão do juiz (troque a versão na CTE `versao` quando o juiz mudar).
-- Fonte do revisor: film_review_notes pelo link do vídeo, sem as linhas fonte='auto'. Filme sem nota do revisor conta em
-- `julgados` mas fica fora das colunas de comparação.
with versao as (select 'nota_auto_v3_regua19'::text as v),
auto as (
  select distinct on (e.session_id)
    e.session_id as video_id,
    e.created_at,
    (e.metadata->>'score')::numeric as nota_auto,
    (e.metadata->>'usd')::numeric as usd,
    e.metadata->>'model' as modelo
  from events e, versao
  where e.name = 'nota_auto'
    and e.metadata->>'version' = versao.v
    and jsonb_typeof(e.metadata->'score') = 'number'
  order by e.session_id, e.created_at desc
),
par as (
  select a.*, r.nota::numeric as nota_rev
  from auto a
  join videos v on v.id::text = a.video_id
  left join film_review_notes r on r.link = v.video_url and coalesce(r.fonte, '') <> 'auto'
)
select
  (created_at at time zone 'America/Sao_Paulo')::date as dia,
  count(*) as julgados,
  count(nota_rev) as com_nota_do_revisor,
  count(*) filter (where nota_rev < 7) as ruins,
  count(*) filter (where nota_rev < 7 and nota_auto < 7) as ruins_pegos,
  round(100.0 * count(*) filter (where nota_rev < 7 and nota_auto < 7) / nullif(count(*) filter (where nota_rev < 7), 0)) as pct_acerto_ruins,
  count(*) filter (where nota_rev >= 7.5) as bons,
  count(*) filter (where nota_rev >= 7.5 and nota_auto < 7) as alarmes_falsos,
  round(100.0 * count(*) filter (where nota_rev >= 7.5 and nota_auto < 7) / nullif(count(*) filter (where nota_rev >= 7.5), 0)) as pct_alarme_falso,
  count(*) filter (where nota_auto <= 5 and nota_rev is not null) as alarme_forte,
  round(100.0 * count(*) filter (where nota_auto <= 5 and nota_rev < 7) / nullif(count(*) filter (where nota_auto <= 5 and nota_rev is not null), 0)) as pct_alarme_forte_certo,
  round(avg(abs(nota_auto - nota_rev)), 2) as erro_medio,
  round(avg(abs(7 - nota_rev)), 2) as erro_dar_7,
  round(sum(usd), 3) as usd_total,
  round(avg(usd), 4) as usd_por_filme,
  string_agg(distinct modelo, ', ') as modelos
from par
group by 1
order by 1 desc;
