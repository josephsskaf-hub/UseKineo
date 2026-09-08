-- Baseline anterior a sprint, nunca resultado posterior ao deploy P3.
-- Recorte conservador 04:30 UTC; o painel usa 05:00 UTC.
-- Apenas SELECT e agregados, sem identidade de cliente na saida.
with bounds as (
 select '2026-09-08 04:30:00+00'::timestamptz start_at,
        '2026-09-08 15:23:30+00'::timestamptz cutoff_utc
), probe_hashes(ip_hash) as (
 values ('67fc14c5443b51680991b631ce1a7ec3aa53386b95a5c76a4e386f6d77321e0d'),
        ('04b852318d49a58963ac5a5303af0e4cbf8725197864c53dc9df553730410625')
), profiles_external as (
 select p.id,p.created_at,
  (coalesce(p.signup_utm_source,'') ~* '(chatgpt|chat[.]openai[.]com)'
   or coalesce(p.signup_referrer,'') ~* '(chatgpt[.]com|chat[.]openai[.]com)'
   or coalesce(p.signup_utm_campaign,'') ~* '(chatgpt|gpt_handoff)') as signup_chatgpt,
  (nullif(trim(p.signup_utm_source),'') is not null
   or nullif(trim(p.signup_referrer),'') is not null) as signup_source_present
 from public.profiles p cross join bounds b
 where p.created_at>=b.start_at and p.created_at<b.cutoff_utc
 and nullif(trim(p.email),'') is not null
 and not (
  lower(trim(p.email))=any(array[
   'josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com',
   'joseph+teste01@gmail.com','teste01@shortsforgeai.com'])
  or lower(trim(p.email)) like any(array[
   'josephsskaf+%@gmail.com','joseph+%@gmail.com','%@theresanaiforthat.com',
   'josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%',
   'smoketest%','%josephsskaf%','%usekineo%','%kineo.local%'])
 )
), ev as materialized (
 select e.id,e.name,e.user_id,e.created_at,e.metadata as m,
  case when (case when e.name='subscription_invoice_paid'
   then e.metadata->>'amount_paid' else e.metadata->>'amount_total' end) ~ '^[0-9]+$'
  then (case when e.name='subscription_invoice_paid'
   then e.metadata->>'amount_paid' else e.metadata->>'amount_total' end)::numeric end as amount
 from public.events e join profiles_external p on p.id=e.user_id cross join bounds b
 where e.created_at>=b.start_at and e.created_at<b.cutoff_utc
 and not (
  coalesce(e.metadata->>'bot','')='true' or coalesce(e.metadata->>'is_bot','')='true'
  or coalesce(e.metadata->>'client_class','')='bot'
  or coalesce(e.metadata->>'ua',e.metadata->>'user_agent','')
    ~* '(curl/|kineo.*(probe|audit)|playwright|smoketest)'
  or exists(select 1 from public.gpt_handoffs h join probe_hashes ph using(ip_hash)
            where h.token=e.metadata->>'token')
 )
), members as (
 select p.id,min(e.created_at) as entered_at,p.signup_chatgpt,p.signup_source_present
 from profiles_external p join ev e on e.user_id=p.id
 where e.name='card_entry_required' and e.created_at>=p.created_at
 and e.m->>'policy'='card_entry_only' and e.m->>'marked'='true'
 group by p.id,p.signup_chatgpt,p.signup_source_present
), cohort as (
 select c.*,
 case when c.signup_chatgpt or exists (
  select 1 from ev e where e.user_id=c.id and e.created_at<=c.entered_at
  and (
   exists(select 1 from (values (e.m->>'utm_source'),(e.m->>'source'),
    (e.m->>'ref'),(e.m->>'referrer_host'),(e.m->>'referrer'),
    (e.m->>'utm_campaign'),(e.m->>'intent_campaign')) s(v)
    where s.v ~* '(chatgpt|chat[.]openai[.]com|gpt_handoff)')
   or (e.name in ('gpt_landing_viewed','gpt_landing_clicked') and exists(
    select 1 from public.gpt_handoffs h where h.token=e.m->>'token'
    and (h.channel='gpt_store' or h.assistant='chatgpt')))
  )
 ) then 'chatgpt_com_sinal'
 when c.signup_source_present then 'outra_fonte_declarada'
 else 'origem_desconhecida' end as origin
 from members c
), money_candidates as (
 select e.*,coalesce(case when e.name='payment_success'
  then nullif(e.m->>'stripe_session_id','')
  else nullif(e.m->>'stripe_invoice_id','') end,e.id::text) as money_key
 from ev e where e.name in ('payment_success','subscription_invoice_paid')
), money_consistency as (
 select name,money_key,
  count(distinct jsonb_build_array(user_id,amount,m->>'currency',
    m->>'stripe_subscription_id',m->>'card_trial',m->>'trial_conversion',
    m->>'checkout_mode',m->>'pack'))>1 as conflicting
 from money_candidates group by name,money_key
), money as materialized (
 select distinct on(e.name,e.money_key) e.*,
 case when s.conflicting then 'conflicting'
 when e.name='subscription_invoice_paid' and nullif(e.m->>'stripe_invoice_id','') is not null
   then 'invoice_reported'
 when e.name<>'payment_success' or nullif(e.m->>'stripe_session_id','') is null then 'unknown'
 when e.m->>'card_trial'='true' and e.amount=100 and e.m->>'currency'='usd' then 'trial_1usd'
 when e.m->>'card_trial'='true' then 'trial_other_amount'
 when e.m->>'card_trial'='false' and e.m->>'checkout_mode'='subscription' then 'direct_subscription'
 when e.m->>'checkout_mode'='payment' and nullif(e.m->>'pack','') is not null then 'oneoff'
 else 'unknown' end as kind
 from money_candidates e join money_consistency s using(name,money_key)
 order by e.name,e.money_key,e.created_at,e.id
), people as (
 select c.*,v.viewed_at,k.clicked_at,q.checkout_at,
  f.trial_1usd,f.trial_other,f.direct_subscription,f.oneoff,f.unknown_payment,
  f.amount_unknown_or_zero,f.invoice_reported,f.invoice_after_trial,
  f.trial_paid_in_sequence,f.conflicting_money
 from cohort c
 left join lateral (
  select min(e.created_at) viewed_at from ev e where e.user_id=c.id
  and e.created_at>=c.entered_at and e.name='card_entry_banner_shown'
  and e.m->>'visible'='true'
 ) v on true
 left join lateral (
  select min(e.created_at) clicked_at from ev e where e.user_id=c.id
  and e.created_at>=v.viewed_at and e.name='card_entry_banner_clicked'
 ) k on true
 left join lateral (
  select min(e.created_at) checkout_at from ev e where e.user_id=c.id
  and e.created_at>=k.clicked_at and e.name='checkout_started'
  and e.m->>'card_trial' in ('true','1')
  and nullif(e.m->>'stripe_session_id','') is not null
 ) q on true
 left join lateral (
  select bool_or(m.kind='trial_1usd' and m.amount>0) trial_1usd,
   bool_or(m.kind='trial_other_amount' and m.amount>0) trial_other,
   bool_or(m.kind='direct_subscription' and m.amount>0) direct_subscription,
   bool_or(m.kind='oneoff' and m.amount>0) oneoff,
   bool_or(m.kind='unknown' and m.amount>0) unknown_payment,
   bool_or(m.amount is null or m.amount=0) amount_unknown_or_zero,
   bool_or(m.kind='conflicting') conflicting_money,
   bool_or(m.kind='invoice_reported' and m.amount>0) invoice_reported,
   bool_or(m.kind='invoice_reported' and m.amount>0
    and m.m->>'trial_conversion'='true' and exists(
     select 1 from money previous where previous.user_id=c.id
     and previous.kind in ('trial_1usd','trial_other_amount') and previous.amount>0
     and previous.created_at>=c.entered_at and previous.created_at<m.created_at
     and previous.m->>'stripe_subscription_id'=m.m->>'stripe_subscription_id'
    )) invoice_after_trial,
   bool_or(m.kind='trial_1usd' and m.amount>0 and exists(
    select 1 from ev ch where ch.user_id=c.id and ch.name='checkout_started'
    and ch.created_at>=k.clicked_at and ch.created_at<=m.created_at
    and ch.m->>'card_trial' in ('true','1')
    and ch.m->>'stripe_session_id'=m.m->>'stripe_session_id'
   )) trial_paid_in_sequence
  from money m where m.user_id=c.id and m.created_at>=c.entered_at
 ) f on true
), origins(origin) as (
 values ('chatgpt_com_sinal'),('outra_fonte_declarada'),('origem_desconhecida')
)
select b.start_at,b.cutoff_utc,o.origin,
 count(p.id) as cohort_people,
 count(p.viewed_at) as banner_seen_after_entry,
 count(p.clicked_at) as banner_clicked_after_seen,
 count(p.checkout_at) as trial_checkout_after_click,
 count(*) filter(where p.trial_paid_in_sequence) as trial_1usd_in_sequence,
 count(*) filter(where p.trial_1usd) as trial_1usd_any_route,
 count(*) filter(where p.trial_other) as trial_other_amount_people,
 count(*) filter(where p.direct_subscription) as direct_subscription_people,
 count(*) filter(where p.oneoff) as oneoff_people,
 count(*) filter(where p.unknown_payment) as positive_payment_unclassified,
 count(*) filter(where p.amount_unknown_or_zero) as amount_unknown_or_zero,
 count(*) filter(where p.conflicting_money) as conflicting_money_people,
 count(*) filter(where p.invoice_reported) as positive_invoice_reported_people,
 count(*) filter(where p.invoice_after_trial) as invoice_linked_after_trial,
 count(*) filter(where p.invoice_reported and not coalesce(p.invoice_after_trial,false))
  as invoice_without_proven_trial_sequence
from bounds b cross join origins o left join people p on p.origin=o.origin
group by b.start_at,b.cutoff_utc,o.origin order by o.origin;
