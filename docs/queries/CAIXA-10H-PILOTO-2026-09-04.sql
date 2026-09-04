-- SOMENTE SELECT. Janela móvel: conservar measured_at junto ao resultado.
-- Pré-seleção agregada, nunca autorização de contato. Sem e-mails/IDs exportados.
WITH ext AS (SELECT id,created_at FROM auth.users WHERE email IS NOT NULL AND NOT (lower(email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(email) LIKE ANY (ARRAY['josephsskaf+%@gmail.com','joseph+%@gmail.com','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%']))), candidates AS (
 SELECT e.user_id,min(e.created_at) first_checkout,max(e.created_at) last_checkout
 FROM public.events e JOIN ext ON ext.id=e.user_id
 WHERE e.name='checkout_started' AND e.created_at>=now()-interval '7 days'
 AND e.metadata->>'tier' IN ('starter','basic','pro','creator','studio')
 AND NOT EXISTS(SELECT 1 FROM public.events p WHERE p.user_id=e.user_id AND p.name='payment_success' AND p.metadata->>'source'='stripe_webhook' AND p.metadata->>'checkout_mode'='subscription' AND nullif(p.metadata->>'stripe_subscription_id','') IS NOT NULL AND p.metadata->>'tier' IN ('starter','basic','pro','creator','studio') AND CASE WHEN p.metadata->>'amount_total' ~ '^[0-9]+$' THEN (p.metadata->>'amount_total')::numeric>0 ELSE false END)
 GROUP BY e.user_id), flags AS (
 SELECT c.user_id,
 split_part(lower(u.email),'@',1) IN ('den.higgins','noelrss21','emiliomontinari','akajitin') named_exclusion,
 p.email_opted_out, p.id IS NULL profile_missing,
 EXISTS(SELECT 1 FROM public.email_send_log l WHERE l.user_id=c.user_id AND l.sent_at>=now()-interval '7 days' AND l.ok IS TRUE AND l.yielded IS NOT TRUE) recent_service_accepted_email,
 EXISTS(SELECT 1 FROM public.videos v WHERE v.user_id=c.user_id AND v.status='completed' AND v.created_at<=c.first_checkout) film_before_checkout
 FROM candidates c JOIN auth.users u ON u.id=c.user_id LEFT JOIN public.profiles p ON p.id=c.user_id)
 SELECT now() measured_at,count(*) unpaid_b2c_checkout_people,
 count(*) FILTER(WHERE named_exclusion) named_exclusions,
 count(*) FILTER(WHERE email_opted_out IS TRUE) opted_out,
 count(*) FILTER(WHERE profile_missing OR email_opted_out IS NULL) unknown_preference,
 count(*) FILTER(WHERE recent_service_accepted_email) recent_service_accepted_email,
 count(*) FILTER(WHERE film_before_checkout) film_before_first_checkout,
 count(*) FILTER(WHERE NOT named_exclusion AND email_opted_out IS FALSE AND NOT recent_service_accepted_email) preliminary_only_consent_and_campaigns_unverified
 FROM flags;

