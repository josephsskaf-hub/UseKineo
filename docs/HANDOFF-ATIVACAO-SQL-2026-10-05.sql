-- HANDOFF-ATIVACAO-SQL-2026-10-05 — consultas de MEDIÇÃO da branch codex/nuvem-ativacao-previa-br-0310.
-- Todas são SÓ LEITURA. A sessão CEO roda e cola os números em docs/HANDOFF-ATIVACAO-2026-10-05.md.
-- Cada consulta diz: o que mede · qual decisão alimenta · resultado esperado se a hipótese estiver certa.
-- As marcadas "JÁ MEDIDA 03/10" rodaram antes da ordem de não usar o conector; o número está no handoff. Rodar de novo
-- só para atualizar.

-- ═══ SQL #1 (JÁ MEDIDA 03/10) — Ativação em 24 h por grupo de país, antes × depois da saída B ═══════════════════════
-- Mede: % de cadastros com filme 'completed' em até 24 h, por grupo (lista / BR / fora), antes e depois de 29/09 15:00 UTC.
-- Decisão: confirma que a queda é da política (e não de motor) e serve de linha de base da prévia e do BR.
-- Esperado: lista estável (~65%); BR e fora ~0% depois de 29/09. Medido em 03/10: lista 67,4% → 65,4%; BR 62,5% → 0%;
-- fora 57,3% → 0%.
with s as (
  select p.id, p.created_at, p.signup_country c,
    exists(select 1 from videos v where v.user_id = p.id and v.status = 'completed' and v.created_at < p.created_at + interval '24 hours') f24
  from profiles p where p.created_at >= '2026-08-30' and p.signup_country is not null
)
select case when created_at < '2026-09-29 15:00+00' then 'a_antes' else 'b_depois' end janela,
  case when c = 'BR' then 'BR'
       when c in ('US','CA','GB','IE','AU','NZ','AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','NO','IS','LI','CH','JP','KR','SG','HK','TW','AE','SA','QA','KW','BH','OM','IL') then 'lista'
       else 'fora' end grupo,
  count(*) cadastros, count(*) filter (where f24) com_filme_24h, round(100.0 * count(*) filter (where f24) / nullif(count(*), 0), 1) pct
from s group by 1, 2 order by 1, 2;

-- ═══ SQL #2 (JÁ MEDIDA 03/10) — Pagantes BR na história ═══════════════════════════════════════════════════════════
-- Mede: pagamentos (payment_success) de quem tem signup_country='BR' ou pagou em BRL. metadata.customer_country vem nulo;
-- os sinais confiáveis são profiles.signup_country (preenchido nos 21 pagantes) e metadata.currency.
-- Decisão: Brasil de volta (Entrega 2) — o Brasil já pagou?
-- Esperado: ≥ 1. Medido em 03/10: 3 pessoas / 4 eventos (2 em jun/jul sem moeda; 1 Starter em BRL R$ 49,90 em 10/09).
select date(e.created_at) dia, lower(coalesce(e.metadata->>'currency', '?')) moeda, e.metadata->>'tier' tier,
  e.metadata->>'amount_total' valor, p.signup_country
from events e join profiles p on p.id = e.user_id
where e.name = 'payment_success' and (p.signup_country = 'BR' or lower(coalesce(e.metadata->>'currency', '')) = 'brl')
order by 1;

-- ═══ SQL #3 (JÁ MEDIDA 03/10) — Contas BR region_paid_only a recreditar ═══════════════════════════════════════════
-- Mede: contas que o GET /api/admin/br-recredit listaria (BR, region_paid_only, sem pagar).
-- Decisão: DECISÃO DO FUNDADOR PENDENTE — aplicar o recrédito (POST ?confirm=APPLY)?
-- Esperado: poucas (≈ 6 em 4 dias). Medido em 03/10: 6 contas → 60 créditos, no máximo 6 filmes de 15 s.
select count(distinct e.user_id) contas
from events e join profiles p on p.id = e.user_id
where e.name = 'trial_region_excluded' and e.metadata->>'country' = 'BR'
  and p.trial_status = 'region_paid_only' and coalesce(p.has_paid, false) = false;

-- ═══ SQL #4 (JÁ MEDIDA 03/10) — Uso real da cota semanal (o custo do BR depende dela) ═════════════════════════════
-- Mede: admissões e recargas da cota semanal (1 Seedance 15 s) desde 29/09; cadastros BR do último mês antes da saída B.
-- Decisão: custo mensal estimado da cota BR (Entrega 2).
-- Esperado: uso baixo. Medido em 03/10: 0 admissões no total; 4 recargas em 7 d; 56 cadastros BR em 30 d.
select 'admitidas_total' k, count(*) v from events where name = 'free_weekly_film_admitted'
union all select 'recargas_7d', count(*) from events where name = 'free_weekly_film_granted' and created_at > now() - interval '7 days'
union all select 'cadastros_BR_30d_antes_29_09', count(*) from profiles where signup_country = 'BR' and created_at between '2026-08-30' and '2026-09-29 15:00+00';

-- ═══ SQL #5 (DEPOIS DO DEPLOY) — Funil da prévia das cenas, por PESSOA ════════════════════════════════════════════
-- Mede: desviadas (routed) → viram a prévia (shown) → clicaram "Transformar em filme" → pagaram (payment_success depois
-- da prévia). Também as recusas por motivo.
-- Decisão: manter PREVIA_CENAS_PUBLIC=true e os tetos (1/dia, 3 no total, 200/dia global).
-- Esperado (hipótese do fundador): ≥ 50% das desviadas veem a prévia; ≥ 1 pagante em 7 dias entre quem viu.
with r as (select distinct user_id from events where name = 'scene_preview_routed'),
     v as (select user_id, min(created_at) t from events where name = 'scene_preview_shown' group by 1),
     c as (select distinct user_id from events where name = 'scene_preview_cta_clicked'),
     p as (select user_id, min(created_at) t from events where name = 'payment_success' group by 1)
select (select count(*) from r) desviadas, (select count(*) from v) viram, (select count(*) from c) clicaram,
       (select count(*) from v join p using (user_id) where p.t > v.t) pagaram_depois_da_previa;
select metadata->>'reason' motivo, count(*) from events where name = 'scene_preview_refused' group by 1 order by 2 desc;

-- ═══ SQL #6 (DEPOIS DO DEPLOY) — Custo medível da prévia ══════════════════════════════════════════════════════════
-- Mede: prévias mostradas, imagens e megapixels FLUX schnell, chamadas de roteiro (gravados em scene_preview_shown).
-- Decisão: custo por prévia (hoje DESCONHECIDO em US$): dividir a fatura da fal (fal-ai/flux/schnell) e da OpenAI
-- (gpt-4o) do período por estas contagens.
-- Esperado: ~4 imagens e ~2,4 MP por prévia.
select count(*) previas, sum((metadata->>'image_calls')::int) imagens, sum((metadata->>'image_megapixels')::numeric) megapixels,
  sum((metadata->>'script_calls')::int) roteiros
from events where name = 'scene_preview_shown';
