-- SELECT only. Replace __INTERNAL_VALUES__ from lib/internalAccounts.ts at execution;
-- never save identifying lists or rows in this directory.
WITH bounds AS (SELECT timestamptz '2026-10-05T23:25:12.672456+00:00' AS hi, timestamptz '2026-09-28T23:25:12.672456+00:00' AS lo),
patterns(pat) AS (VALUES __INTERNAL_VALUES__),
people AS (
 SELECT p.id,p.created_at,p.trial_status,
 coalesce(nullif(trim(p.signup_utm_source),''),nullif(trim(p.utm_source),''),'unknown') source,
 coalesce(nullif(trim(p.signup_utm_campaign),''),'unknown') campaign
 FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM patterns i WHERE lower(trim(coalesce(p.email,''))) LIKE i.pat)
), ev AS (
 SELECT e.* FROM events e JOIN people p ON p.id=e.user_id CROSS JOIN bounds b
 WHERE e.created_at>=b.lo AND e.created_at<b.hi
), signups AS (SELECT p.* FROM people p,bounds b WHERE p.created_at>=b.lo AND p.created_at<b.hi),
checkouts AS (SELECT e.* FROM ev e WHERE e.name='checkout_started' AND nullif(e.metadata->>'stripe_session_id','') IS NOT NULL),
payments AS (SELECT e.* FROM ev e WHERE e.name='payment_success'
 AND e.metadata->>'source'='stripe_webhook'
 AND CASE WHEN e.metadata->>'amount_total' ~ '^[0-9]+$' THEN (e.metadata->>'amount_total')::numeric>0 ELSE false END),
flags AS (SELECT p.*,EXISTS(SELECT 1 FROM checkouts c WHERE c.user_id=p.id AND c.created_at>=p.created_at) checkout,
 EXISTS(SELECT 1 FROM payments s JOIN checkouts c ON c.user_id=s.user_id AND s.created_at>=c.created_at
 AND nullif(s.metadata->>'stripe_session_id','')=nullif(c.metadata->>'stripe_session_id','')
 WHERE s.user_id=p.id AND c.created_at>=p.created_at) paid FROM signups p),
upgraded AS (SELECT user_id,min(created_at) at FROM ev WHERE name='upgrade_modal_opened' AND nullif(trim(session_id),'') IS NOT NULL GROUP BY user_id),
upgrade_funnel AS (SELECT count(*) upgrade_people,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM checkouts c WHERE c.user_id=u.user_id AND c.created_at>=u.at)) checkout_people,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM checkouts c JOIN payments s ON s.user_id=c.user_id AND s.created_at>=c.created_at
 AND nullif(s.metadata->>'stripe_session_id','')=nullif(c.metadata->>'stripe_session_id','') WHERE c.user_id=u.user_id AND c.created_at>=u.at)) paid_people
 FROM upgraded u)
SELECT jsonb_build_object(
 'start',(SELECT lo FROM bounds),'end_exclusive',(SELECT hi FROM bounds),
 'signup_cohort',(SELECT jsonb_build_object('people',count(*),'checkout_people',count(*) FILTER(WHERE checkout),'paid_people',count(*) FILTER(WHERE paid)) FROM flags),
 'upgrade_funnel',(SELECT to_jsonb(f) FROM upgrade_funnel f),
 'checkout_trial_status_now',(SELECT jsonb_agg(x) FROM (SELECT coalesce(trial_status,'unknown') status,count(*) people FROM flags WHERE checkout GROUP BY trial_status) x),
 'all_external_event_people',(SELECT jsonb_agg(x) FROM (SELECT name,count(DISTINCT user_id) people FROM ev WHERE name IN ('upgrade_modal_opened','pricing_view','topup_unavailable_note_shown') AND nullif(trim(session_id),'') IS NOT NULL GROUP BY name) x),
 'cohort_paid_origin',(SELECT jsonb_agg(x) FROM (SELECT source,campaign,count(*) people FROM flags WHERE paid GROUP BY source,campaign) x)
) AS result;
