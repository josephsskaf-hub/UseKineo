with classified as (
select p.*, (nullif(trim(p.email),'') is not null and not (lower(trim(p.email)) in ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') or lower(trim(p.email)) like any(array['josephsskaf+%@gmail.com','joseph+%@gmail.com','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%']))) as external,
coalesce(nullif(lower(trim(p.signup_utm_source)),''),nullif(lower(trim(p.utm_source)),''),case when lower(coalesce(p.signup_referrer,'')) like '%chatgpt.com%' or lower(coalesce(p.signup_referrer,'')) like '%openai.com%' then 'chatgpt' else 'unknown' end) as resolved_source
from profiles p where p.created_at>='2026-09-04T03:00:00Z' and p.created_at<'2026-09-17T07:30:00Z'
), days as (select generate_series('2026-09-04'::date,'2026-09-17'::date,'1 day')::date as day_brt)
select current_timestamp as observed_at,'2026-09-17T07:30:00Z'::timestamptz as cutoff_exclusive, d.day_brt,
d.day_brt='2026-09-17'::date as partial_day,
count(p.id) filter(where p.external) as external_signups_all,
count(p.id) filter(where p.external and p.utm_source='chatgpt') as external_chatgpt_exact,
count(p.id) filter(where p.external and p.resolved_source='chatgpt') as external_chatgpt_resolved,
count(p.id) filter(where p.external and p.resolved_source='chatgpt' and exists(select 1 from videos v where v.user_id=p.id and v.status='completed' and v.created_at<p.created_at+interval '12 hours' and v.created_at<'2026-09-17T07:30:00Z')) as resolved_completed_within_12h,
count(p.id) filter(where p.external and p.resolved_source='chatgpt' and exists(select 1 from events e where e.user_id=p.id and e.name='checkout_started' and e.created_at>=p.created_at and e.created_at<'2026-09-17T07:30:00Z')) as resolved_checkout_people_to_cutoff,
count(p.id) filter(where p.external and p.resolved_source='chatgpt' and exists(select 1 from events e where e.user_id=p.id and e.name='payment_success' and e.created_at>=p.created_at and e.created_at<'2026-09-17T07:30:00Z')) as resolved_payment_event_people_unreconciled,
count(p.id) filter(where nullif(trim(p.email),'') is null and p.utm_source='chatgpt') as chatgpt_unknown_email
from days d left join classified p on (p.created_at at time zone 'America/Sao_Paulo')::date=d.day_brt group by d.day_brt order by d.day_brt;
