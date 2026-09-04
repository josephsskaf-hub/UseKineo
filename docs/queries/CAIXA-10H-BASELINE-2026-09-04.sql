-- SELECT only. B2C first subscriptions recorded by Stripe webhook, not page views.
-- Fixed baseline, current-cycle cutoff supplied by now(); retain measured_at.
WITH ext AS (SELECT id,created_at FROM auth.users WHERE email IS NOT NULL AND NOT (lower(email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(email) LIKE ANY (ARRAY['josephsskaf+%@gmail.com','joseph+%@gmail.com','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%']))),
windows AS (SELECT 'baseline_24h'::text label, '2026-09-03 20:08:00+00'::timestamptz start_at,'2026-09-04 20:08:00+00'::timestamptz end_at UNION ALL SELECT 'cycle_so_far','2026-09-04 20:08:00+00'::timestamptz,now()),
paid AS (SELECT DISTINCT ON (e.metadata->>'stripe_session_id') e.user_id,e.created_at,e.metadata FROM public.events e JOIN ext ON ext.id=e.user_id WHERE e.name='payment_success' AND e.metadata->>'source'='stripe_webhook' AND nullif(e.metadata->>'stripe_session_id','') IS NOT NULL AND CASE WHEN e.metadata->>'amount_total' ~ '^[0-9]+$' THEN (e.metadata->>'amount_total')::numeric>0 ELSE false END ORDER BY e.metadata->>'stripe_session_id',e.created_at),
first_subscription AS (SELECT user_id,min(created_at) at FROM paid WHERE metadata->>'checkout_mode'='subscription' AND nullif(metadata->>'stripe_subscription_id','') IS NOT NULL AND metadata->>'tier' IN ('starter','basic','pro','creator','studio') GROUP BY user_id)
SELECT now() measured_at,w.label,w.start_at,w.end_at,
(SELECT count(*) FROM ext WHERE created_at>=w.start_at AND created_at<w.end_at) signups,
(SELECT count(DISTINCT v.user_id) FROM public.videos v JOIN ext ON ext.id=v.user_id WHERE v.status='completed' AND v.created_at>=w.start_at AND v.created_at<w.end_at) people_with_completed_video,
(SELECT count(DISTINCT e.user_id) FROM public.events e JOIN ext ON ext.id=e.user_id WHERE e.name='checkout_started' AND e.created_at>=w.start_at AND e.created_at<w.end_at) checkout_people,
(SELECT count(DISTINCT e.metadata->>'stripe_session_id') FROM public.events e JOIN ext ON ext.id=e.user_id WHERE e.name='checkout_started' AND e.created_at>=w.start_at AND e.created_at<w.end_at) checkout_stripe_sessions,
(SELECT count(*) FROM first_subscription WHERE at>=w.start_at AND at<w.end_at) first_b2c_paid_subscribers,
(SELECT count(DISTINCT user_id) FROM paid WHERE created_at>=w.start_at AND created_at<w.end_at AND metadata->>'checkout_mode'='payment') one_time_buyers
FROM windows w;
