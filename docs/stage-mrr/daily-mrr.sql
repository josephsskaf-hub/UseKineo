-- SELECT only. Daily subscriptions are a calendar flow; funnel is a signup cohort. Do not divide the former by today's signups.
WITH bounds AS (SELECT statement_timestamp() hi, statement_timestamp()-interval '30 days' lo),
patterns(pat) AS (VALUES ('josephsskaf@gmail.com'),('josephskaf@hotmail.com'),('victoriaskaf96@gmail.com'),('joseph+teste01@gmail.com'),('teste01@shortsforgeai.com'),('josephsskaf+%@gmail.com'),('joseph+%@gmail.com'),('joseph+%'),('victoriaskaf%'),('%@theresanaiforthat.com'),('josephsskaf%'),('josephskaf%'),('%@shortsforgeai.com'),('test%'),('%mailinator%'),('smoketest%')),

people AS (SELECT p.id,p.created_at,coalesce(nullif(trim(p.signup_utm_source),''),nullif(trim(p.utm_source),''),'unknown') source,
 coalesce(nullif(trim(p.signup_utm_campaign),''),'unknown') campaign
 FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM patterns i WHERE lower(trim(coalesce(p.email,''))) LIKE i.pat)),
first_sub AS (SELECT DISTINCT ON(e.user_id) e.user_id,e.created_at,e.metadata
 FROM events e JOIN people p ON p.id=e.user_id
 WHERE e.name='payment_success' AND e.metadata->>'checkout_mode'='subscription'
 AND CASE WHEN e.metadata->>'amount_total' ~ '^[0-9]+(\.[0-9]+)?$' THEN (e.metadata->>'amount_total')::numeric>0 ELSE false END
 ORDER BY e.user_id,e.created_at,e.id),
payers AS (SELECT s.user_id,s.created_at,p.source,p.campaign FROM first_sub s JOIN people p ON p.id=s.user_id,bounds b WHERE s.created_at>=b.lo AND s.created_at<b.hi),
days AS(SELECT generate_series((b.lo AT TIME ZONE 'America/Sao_Paulo')::date,(b.hi AT TIME ZONE 'America/Sao_Paulo')::date,'1 day')::date AS day FROM bounds b),
cohort AS (SELECT p.* FROM people p,bounds b WHERE p.created_at>=b.lo AND p.created_at<b.hi),
flags AS (SELECT p.id,p.created_at,p.source,
 EXISTS(SELECT 1 FROM events e,bounds b WHERE e.user_id=p.id AND e.created_at>=p.created_at AND e.created_at<b.hi AND e.path='/studio' AND nullif(trim(e.session_id),'') IS NOT NULL) studio,
 EXISTS(SELECT 1 FROM events e,bounds b WHERE e.user_id=p.id AND e.created_at>=p.created_at AND e.created_at<b.hi AND e.name='mrr_idea_entered' AND e.metadata->>'version'='mrr_studio_20261001_v1' AND nullif(trim(e.session_id),'') IS NOT NULL) typed_in_instrumented_version,
 EXISTS(SELECT 1 FROM events e,bounds b WHERE e.user_id=p.id AND e.created_at>=p.created_at AND e.created_at<b.hi AND e.name='generate_started' AND nullif(trim(e.session_id),'') IS NOT NULL) generated,
 (SELECT count(*) FROM videos v,bounds b WHERE v.user_id=p.id AND v.created_at>=p.created_at AND v.created_at<b.hi AND v.status='completed' AND coalesce(nullif(v.final_video_url,''),nullif(v.video_url,'')) IS NOT NULL) films,
 EXISTS(SELECT 1 FROM events e,bounds b WHERE e.user_id=p.id AND e.created_at>=p.created_at AND e.created_at<b.hi AND e.name='checkout_started' AND nullif(trim(e.session_id),'') IS NOT NULL) checkout,
 EXISTS(SELECT 1 FROM payers s WHERE s.user_id=p.id AND s.created_at>=p.created_at) new_subscription
 FROM cohort p),
versions AS(SELECT e.metadata->>'version' version,e.name,count(DISTINCT e.user_id) identified_external_people,
 count(*) FILTER(WHERE e.user_id IS NULL) anonymous_events_not_people
 FROM events e,bounds b WHERE e.created_at>=b.lo AND e.created_at<b.hi AND nullif(trim(e.session_id),'') IS NOT NULL
 AND e.metadata->>'version' IN('mrr_studio_20261001_v1','mrr_showcase_20261001_v1','mrr_first_film_20261001_v1','mrr_episode_value_20261001_v1','mrr_pricing_proof_20261001_v1','mrr_share_20261001_v1','mrr_ready_film_20261001_v1')
 AND (e.user_id IS NULL OR EXISTS(SELECT 1 FROM people p WHERE p.id=e.user_id)) GROUP BY e.metadata->>'version',e.name)
SELECT jsonb_build_object('cut',(SELECT hi FROM bounds),'start',(SELECT lo FROM bounds),'timezone','America/Sao_Paulo',
 'daily',(SELECT jsonb_agg(x ORDER BY day) FROM (SELECT d.day,
 (SELECT count(*) FROM payers p WHERE (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date=d.day) new_subscriptions,
 (SELECT count(*) FROM cohort p WHERE (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date=d.day) signups,
 d.day IN ((SELECT (lo AT TIME ZONE 'America/Sao_Paulo')::date FROM bounds),(SELECT (hi AT TIME ZONE 'America/Sao_Paulo')::date FROM bounds)) partial_day FROM days d) x),
 'new_subscribers_by_source',(SELECT coalesce(jsonb_agg(p ORDER BY p.created_at),'[]'::jsonb) FROM payers p),
 'signup_cohort',(SELECT jsonb_build_object('signup',count(*),'studio_observed_lower_bound',count(*) FILTER(WHERE studio),'typed_in_instrumented_version',count(*) FILTER(WHERE typed_in_instrumented_version),'generate',count(*) FILTER(WHERE generated),'first_film',count(*) FILTER(WHERE films>=1),'second_film',count(*) FILTER(WHERE films>=2),'checkout',count(*) FILTER(WHERE checkout),'new_subscription',count(*) FILTER(WHERE new_subscription),'share_signups',count(*) FILTER(WHERE source='share')) FROM flags),
 'versions',(SELECT coalesce(jsonb_agg(v),'[]'::jsonb) FROM versions v),
 'limits','First observed positive subscription payment_success in available history; renewals/reactivations and one-offs excluded. Signup stages overlap and are not strictly sequential. No causal attribution from time alone. Missing legacy idea instrumentation is unknown, not zero.') measurement;

