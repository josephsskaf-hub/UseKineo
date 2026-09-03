-- Auditoria Growth 72h — UseKineo
-- Janela fixa e semiaberta: [2026-08-31 10:48 BRT, 2026-09-03 10:48 BRT)
-- Somente SELECT. Resultado agregado, sem PII ou Stripe Session ID.
-- Executado em 2026-09-03 10:48:43 BRT:
-- 2 pessoas externas; 2 Sessions recorrentes; USD 3600 minor;
-- zero Session de pagamento não reconciliada; 1 pro/monthly USD 2900;
-- 1 starter/monthly USD 700.
-- Coorte executada em 2026-09-03 10:48:48 BRT:
-- 761 browser sessions; 115 signups externos; 71 pessoas com vídeo concluído;
-- 17 pessoas com Checkout recorrente; 1 pessoa com pagamento recorrente.

-- 1. Receita bruta de assinatura por Stripe Session reconciliada.
with external_profiles as (
  select id
  from public.profiles
  where email is not null
    and lower(email) not in (
      'josephsskaf@gmail.com',
      'josephskaf@hotmail.com',
      'victoriaskaf96@gmail.com',
      'joseph+teste01@gmail.com',
      'teste01@shortsforgeai.com'
    )
    and lower(email) not like 'josephsskaf+%@gmail.com'
    and lower(email) not like 'joseph+%@gmail.com'
    and lower(email) not like '%@theresanaiforthat.com'
    and lower(email) not like 'josephsskaf%'
    and lower(email) not like 'josephskaf%'
    and lower(email) not like '%@shortsforgeai.com'
    and lower(email) not like 'test%'
    and lower(email) not like '%mailinator%'
    and lower(email) not like 'smoketest%'
),
payment_rows as (
  select
    e.user_id,
    e.metadata->>'stripe_session_id' as stripe_session_id,
    (e.metadata->>'amount_total')::bigint as amount_minor,
    lower(e.metadata->>'currency') as currency
  from public.events e
  join external_profiles x on x.id = e.user_id
  where e.name = 'payment_success'
    and lower(e.metadata->>'checkout_mode') = 'subscription'
    and e.metadata->>'stripe_session_id' is not null
    and coalesce(e.metadata->>'amount_total', '') ~ '^[0-9]+$'
    and (e.metadata->>'amount_total')::bigint > 0
    and e.metadata->>'currency' is not null
    and e.created_at >= timestamptz '2026-08-31 13:48:00+00'
    and e.created_at <  timestamptz '2026-09-03 13:48:00+00'
),
payment_sessions as (
  select
    stripe_session_id,
    min(user_id::text)::uuid as user_id,
    min(amount_minor) as amount_minor,
    min(currency) as currency,
    count(distinct user_id) as owner_count,
    count(distinct amount_minor) as amount_count,
    count(distinct currency) as currency_count
  from payment_rows
  group by stripe_session_id
),
start_rows as (
  select
    e.user_id,
    e.metadata->>'stripe_session_id' as stripe_session_id,
    lower(e.metadata->>'tier') as tier,
    lower(e.metadata->>'billing') as billing
  from public.events e
  join external_profiles x on x.id = e.user_id
  where e.name = 'checkout_started'
    and e.metadata->>'stripe_session_id' is not null
    and e.metadata->>'tier' is not null
    and e.metadata->>'billing' is not null
    and e.created_at < timestamptz '2026-09-03 13:48:00+00'
),
start_sessions as (
  select
    stripe_session_id,
    min(user_id::text)::uuid as user_id,
    min(tier) as tier,
    min(billing) as billing,
    count(distinct user_id) as owner_count,
    count(distinct tier) as tier_count,
    count(distinct billing) as billing_count
  from start_rows
  group by stripe_session_id
),
valid_sessions as (
  select
    p.stripe_session_id,
    p.user_id,
    p.amount_minor,
    p.currency,
    s.tier,
    s.billing
  from payment_sessions p
  join start_sessions s using (stripe_session_id)
  where p.owner_count = 1
    and p.amount_count = 1
    and p.currency_count = 1
    and s.owner_count = 1
    and s.tier_count = 1
    and s.billing_count = 1
    and p.user_id = s.user_id
),
breakdown as (
  select
    tier,
    billing,
    currency,
    count(*)::int as paid_sessions,
    count(distinct user_id)::int as people,
    sum(amount_minor)::bigint as revenue_minor
  from valid_sessions
  group by tier, billing, currency
)
select
  now() as observed_at,
  (select count(distinct user_id) from valid_sessions)::int as external_people_paid,
  (select count(*) from valid_sessions)::int as paid_subscription_sessions,
  (select coalesce(sum(amount_minor), 0) from valid_sessions)::bigint as revenue_minor,
  (
    select count(*)::int
    from payment_sessions p
    where not exists (
      select 1
      from valid_sessions v
      where v.stripe_session_id = p.stripe_session_id
    )
  ) as unreconciled_payment_sessions,
  coalesce(jsonb_agg(to_jsonb(breakdown) order by tier, billing), '[]'::jsonb) as breakdown
from breakdown;

-- 2. Coorte externa criada dentro do ciclo.
with external_profiles as (
  select id, created_at
  from public.profiles
  where email is not null
    and lower(email) not in (
      'josephsskaf@gmail.com',
      'josephskaf@hotmail.com',
      'victoriaskaf96@gmail.com',
      'joseph+teste01@gmail.com',
      'teste01@shortsforgeai.com'
    )
    and lower(email) not like 'josephsskaf+%@gmail.com'
    and lower(email) not like 'joseph+%@gmail.com'
    and lower(email) not like '%@theresanaiforthat.com'
    and lower(email) not like 'josephsskaf%'
    and lower(email) not like 'josephskaf%'
    and lower(email) not like '%@shortsforgeai.com'
    and lower(email) not like 'test%'
    and lower(email) not like '%mailinator%'
    and lower(email) not like 'smoketest%'
),
cohort as (
  select id
  from external_profiles
  where created_at >= timestamptz '2026-08-31 13:48:00+00'
    and created_at <  timestamptz '2026-09-03 13:48:00+00'
),
completed as (
  select distinct v.user_id
  from public.videos v
  join cohort c on c.id = v.user_id
  where v.status = 'completed'
    and v.created_at < timestamptz '2026-09-03 13:48:00+00'
),
checkout_people as (
  select distinct e.user_id
  from public.events e
  join cohort c on c.id = e.user_id
  where e.name = 'checkout_started'
    and e.metadata->>'stripe_session_id' is not null
    and e.metadata->>'tier' is not null
    and e.metadata->>'billing' is not null
    and e.created_at < timestamptz '2026-09-03 13:48:00+00'
),
paid_people as (
  select distinct e.user_id
  from public.events e
  join cohort c on c.id = e.user_id
  where e.name = 'payment_success'
    and lower(e.metadata->>'checkout_mode') = 'subscription'
    and e.metadata->>'stripe_session_id' is not null
    and e.created_at < timestamptz '2026-09-03 13:48:00+00'
),
landing_sessions as (
  select distinct e.session_id
  from public.events e
  where e.name = 'landing_session_started'
    and e.session_id is not null
    and e.created_at >= timestamptz '2026-08-31 13:48:00+00'
    and e.created_at <  timestamptz '2026-09-03 13:48:00+00'
)
select
  now() as observed_at,
  (select count(*) from landing_sessions)::int as landing_browser_sessions,
  (select count(*) from cohort)::int as external_signups,
  (select count(*) from completed)::int as cohort_people_with_completed_video,
  (select count(*) from checkout_people)::int as cohort_people_with_subscription_checkout,
  (select count(*) from paid_people)::int as cohort_people_with_subscription_payment;
