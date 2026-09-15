-- SOMENTE LEITURA. Etapas independentes, NÃO uma coorte sequencial.
-- Exclusões copiadas de lib/internalAccounts.ts no SHA 469680ce.
-- payment_events NÃO é caixa reconciliado nem primeira assinatura.
with external_profiles as (
  select id, created_at from public.profiles p
  where nullif(trim(p.email), '') is not null
    and not (
      lower(p.email) in ('josephsskaf@gmail.com','josephskaf@hotmail.com',
        'victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com')
      or lower(p.email) like any(array['josephsskaf+%@gmail.com','joseph+%@gmail.com',
        '%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com',
        'test%','%mailinator%','smoketest%'])
    )
), windows(label, since, until) as (
  values
    ('baseline_12h', timestamptz '2026-09-15 06:08:27+00', timestamptz '2026-09-15 18:08:27+00'),
    ('sprint_partial', timestamptz '2026-09-15 18:08:27+00', least(now(), timestamptz '2026-09-16 06:08:27+00'))
)
select w.*,
  (select count(*) from external_profiles p where p.created_at >= w.since and p.created_at < w.until) signups,
  (select count(distinct e.user_id) from public.events e join external_profiles p on p.id=e.user_id
    where e.created_at >= w.since and e.created_at < w.until and e.name='checkout_started') checkout_people,
  (select count(distinct v.user_id) from public.videos v join external_profiles p on p.id=v.user_id
    where v.created_at >= w.since and v.created_at < w.until and v.status='completed') completed_video_people,
  (select count(*) from public.events e join external_profiles p on p.id=e.user_id
    where e.created_at >= w.since and e.created_at < w.until
      and e.name in ('payment_success','subscription_invoice_paid')) payment_events
from windows w;
