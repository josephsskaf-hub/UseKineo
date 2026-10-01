-- Read only. Version is the exposure boundary; timestamps only enforce equal 48h follow-up.
-- Anonymous sessions are diagnostics, never counted as people.
WITH patterns(pat) AS (VALUES ('josephsskaf@gmail.com'),('josephskaf@hotmail.com'),('victoriaskaf96@gmail.com'),('joseph+teste01@gmail.com'),('teste01@shortsforgeai.com'),('josephsskaf+%@gmail.com'),('joseph+%@gmail.com'),('joseph+%'),('victoriaskaf%'),('%@theresanaiforthat.com'),('josephsskaf%'),('josephskaf%'),('%@shortsforgeai.com'),('test%'),('%mailinator%'),('smoketest%')),
people AS (SELECT p.id,p.created_at,coalesce(nullif(trim(p.signup_utm_source),''),nullif(trim(p.utm_source),''),'unknown') source,p.signup_utm_campaign campaign FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM patterns i WHERE lower(trim(coalesce(p.email,''))) LIKE i.pat)),
surface_events AS (
 SELECT e.* FROM events e
 WHERE e.name IN ('mrr_studio_viewed','mrr_showcase_viewed','mrr_showcase_door_viewed')
 AND e.metadata->>'version' IN ('mrr_studio_20261001_v1','mrr_showcase_20261001_v1')
 AND nullif(trim(e.session_id),'') IS NOT NULL
),
session_people AS (
 SELECT e.session_id,min(e.user_id::text)::uuid person
 FROM events e
 WHERE e.user_id IS NOT NULL
 AND EXISTS(SELECT 1 FROM surface_events s WHERE s.session_id=e.session_id)
 GROUP BY e.session_id HAVING count(DISTINCT e.user_id)=1
),
resolved AS (
 SELECT s.*,coalesce(s.user_id,sp.person) person
 FROM surface_events s LEFT JOIN session_people sp USING(session_id)
),
exposures AS (
 SELECT r.person,r.name surface,r.metadata->>'version' version,coalesce(r.metadata->>'variant','showcase') variant,min(r.created_at) exposed_at
 FROM resolved r JOIN people p ON p.id=r.person
 GROUP BY 1,2,3,4
),
mature AS (SELECT * FROM exposures WHERE exposed_at<=now()-interval '48 hours'),
flags AS (
 SELECT x.*,p.created_at>=x.exposed_at AND p.created_at<x.exposed_at+interval '48 hours' AS signup_in_48h,
 EXISTS(SELECT 1 FROM events e WHERE e.user_id=x.person AND e.created_at>=x.exposed_at AND e.created_at<x.exposed_at+interval '48 hours'
   AND e.name='mrr_idea_entered' AND e.metadata->>'version'=x.version AND e.metadata->>'variant'=x.variant AND nullif(trim(e.session_id),'') IS NOT NULL) typed,
 EXISTS(SELECT 1 FROM events e WHERE e.user_id=x.person AND e.created_at>=x.exposed_at AND e.created_at<x.exposed_at+interval '48 hours'
   AND e.name='generate_started' AND nullif(trim(e.session_id),'') IS NOT NULL) generated,
 EXISTS(SELECT 1 FROM events e WHERE e.user_id=x.person AND e.created_at>=x.exposed_at AND e.created_at<x.exposed_at+interval '48 hours'
   AND e.name='checkout_started' AND nullif(trim(e.session_id),'') IS NOT NULL) checkout,
 EXISTS(SELECT 1 FROM events e WHERE e.user_id=x.person AND e.created_at>=x.exposed_at AND e.created_at<x.exposed_at+interval '48 hours'
   AND e.name='payment_success' AND e.metadata->>'checkout_mode'='subscription' AND (e.metadata->>'amount_total')::numeric>0
   AND NOT EXISTS(SELECT 1 FROM events prior WHERE prior.user_id=e.user_id AND prior.name='payment_success'
     AND prior.metadata->>'checkout_mode'='subscription' AND (prior.metadata->>'amount_total')::numeric>0 AND prior.created_at<e.created_at)) first_subscription
 FROM mature x JOIN people p ON p.id=x.person
)
SELECT jsonb_build_object(
 'measured_at',now(),'followup_hours',48,
 'version_exposed_people',(SELECT jsonb_agg(z) FROM (SELECT surface,version,variant,count(DISTINCT person) people FROM exposures GROUP BY 1,2,3)z),
 'mature_48h',(SELECT jsonb_agg(z) FROM (SELECT surface,version,variant,count(DISTINCT person) denominator,
 count(DISTINCT person) FILTER(WHERE signup_in_48h) signups,
 count(DISTINCT person) FILTER(WHERE typed) typed,
 count(DISTINCT person) FILTER(WHERE generated) generated,
 count(DISTINCT person) FILTER(WHERE checkout) checkout,
 count(DISTINCT person) FILTER(WHERE first_subscription) new_subscribers
 FROM flags GROUP BY 1,2,3)z),
 'unresolved_sessions',(SELECT count(DISTINCT session_id) FROM resolved WHERE person IS NULL)
) measurement;

