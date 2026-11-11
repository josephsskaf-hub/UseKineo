-- KINEO-FAL-DIA-POR-QUEM v1 (Div. 5 Plataforma, 11/11/2026) — SÓ LEITURA. Testada em produção em 11/11.
-- Gasto ESTIMADO de fal por dia (UTC) e por classe de conta (casa / pagante / gratis), últimos 14 dias. Sem nome nem e-mail na saída.
-- Cobre o que o banco registra:
--   filme   = claims settled (cinematic_submission_claim): segundos de cada clipe × preço por segundo do código
--             (sem duração no claim → média do mesmo motor);
--   clipes / recreate = clips.fal_usd;
--   enhance = videos.enhanced_at × ~40 s × US$ 0,02;
--   usd_provavel_sem_registro = reservas do teste Kling 4 sem motor gravado (pode ou não ter sido cobrado pela fal).
-- NÃO cobre (~1/3 do painel da fal): stills dos filmes (nano-banana edit / flux), música (lyria) e chamadas feitas fora do app.
-- Classe "casa" = mesma régua de lib/internalAccounts.ts. Preços: os de lib/freeRedo/core.ts e lib/ads/v2Tiers.ts em 11/11
-- (H3 Max Turbo passa de 0,028 para 0,04 em 16/11 — atualizar o case).
with params as (select (current_date - 13)::timestamptz desde),
cls as (
  select p.id, case
    when p.email ~* '^(josephsskaf|josephskaf|victoriaskaf|joseph\+|test|smoketest)' or p.email ~* '@(shortsforgeai|usekineo|theresanaiforthat)\.com$' or p.email ilike '%mailinator%' then 'casa'
    when p.has_paid or p.stripe_subscription_id is not null then 'pagante'
    else 'gratis' end classe
  from profiles p
),
claims as (
  select e.id, e.user_id, e.created_at::date dia, e.metadata->'fal_models' models, e.metadata->'response'->'clip_seconds' cs
  from events e, params where e.name='cinematic_submission_claim' and e.created_at>=params.desde
    and e.metadata->>'status'='settled' and jsonb_typeof(e.metadata->'fal_models')='array'
),
clipes_filme as (
  select c.user_id, c.dia, m.model, case when jsonb_typeof(c.cs)='array' then (c.cs->>(m.i::int-1))::numeric end secs
  from claims c, lateral jsonb_array_elements_text(c.models) with ordinality m(model,i)
),
media as (select model, avg(secs) a from clipes_filme group by 1),
linhas as (
  select f.user_id, f.dia, 'filme' produto,
    coalesce(f.secs, media.a, 6) * case
      when f.model like 'kling/v4/%' then 0.157 when f.model like '%seedance/v1.5%' then 0.026
      when f.model like '%h3-max-turbo%' then 0.028 when f.model like '%h3%' then 0.06
      when f.model like '%kling-video%' then 0.112 when f.model like '%veo%' then 0.15 else 0.05 end usd,
    0::numeric provavel
  from clipes_filme f join media using (model)
  union all
  select user_id, created_at::date, case when model like '%recast%' then 'recreate' else 'clipes' end, coalesce(fal_usd,0), 0
  from clips, params where created_at>=params.desde
  union all
  select user_id, enhanced_at::date, 'enhance', 0.8, 0 from videos, params where enhanced_at>=params.desde
  union all
  select user_id, reserved_at::date, 'kling4_reserva_sem_filme', 0, reserved_milliusd/1000.0
  from kling4_trial_films, params where reserved_at>=params.desde and engine_used is null
)
select l.dia, coalesce(cls.classe,'sem_dono') classe,
  round(sum(l.usd),2) usd_estimado,
  round(sum(l.provavel),2) usd_provavel_sem_registro,
  round(sum(l.usd) filter (where produto='filme'),2) filme,
  round(sum(l.usd) filter (where produto='clipes'),2) clipes,
  round(sum(l.usd) filter (where produto='recreate'),2) recreate,
  round(sum(l.usd) filter (where produto='enhance'),2) enhance,
  count(distinct l.user_id) contas
from linhas l left join cls on cls.id=l.user_id
group by 1,2 order by 1 desc, 2;
