-- SELECT only. Boundaries are fixed; exposure is defined by offer version, not clock alone.
-- Replace __INTERNAL_VALUES__ in memory from canonical internalAccounts.ts. No PII output.
WITH bounds AS (
 SELECT timestamptz '2026-10-06 03:00:00+00' lo,
 least(now(),timestamptz '2026-10-09 03:00:00+00') hi
), patterns(pat) AS (VALUES __INTERNAL_VALUES__),
people AS (
 SELECT p.id,coalesce(nullif(trim(p.signup_utm_source),''),nullif(trim(p.utm_source),''),'unknown') source,
 coalesce(nullif(trim(p.signup_utm_campaign),''),'unknown') campaign
 FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM patterns i WHERE lower(trim(coalesce(p.email,''))) LIKE i.pat)
), ev AS (
 SELECT e.* FROM events e JOIN people p ON p.id=e.user_id CROSS JOIN bounds b WHERE e.created_at>=b.lo AND e.created_at<b.hi
), upgraded AS (
 SELECT user_id,min(created_at) at FROM ev WHERE name='upgrade_modal_opened'
 AND metadata->>'offer_version'='mrr0610_v1' AND nullif(trim(session_id),'') IS NOT NULL GROUP BY user_id
), exposure AS (
 SELECT user_id,metadata->>'offer_surface' surface,metadata->>'offer_id' offer,min(created_at) at
 FROM ev WHERE name='conversion_offer_viewed' AND metadata->>'offer_version'='mrr0610_v1'
 AND nullif(trim(session_id),'') IS NOT NULL GROUP BY user_id,metadata->>'offer_surface',metadata->>'offer_id'
), checkouts AS (
 SELECT e.*,split_part(metadata->>'intent_campaign','_',3) surface,
 substring(metadata->>'intent_campaign' FROM '^mrr0610_v1_(?:upgrade|pricing)_(.+)$') offer
 FROM ev e WHERE e.name='checkout_started' AND nullif(e.metadata->>'stripe_session_id','') IS NOT NULL
 AND e.metadata->>'intent_campaign' ~ '^mrr0610_v1_(upgrade|pricing)_(pass|(?:starter|basic|pro)_(monthly|annual))$'
), paid AS (
 SELECT s.* FROM ev s WHERE s.name='payment_success' AND s.metadata->>'source'='stripe_webhook'
 AND CASE WHEN s.metadata->>'amount_total' ~ '^[0-9]+$' THEN (s.metadata->>'amount_total')::numeric>0 ELSE false END
), converted AS (
 SELECT DISTINCT c.user_id,c.surface,c.offer,c.id checkout_id,s.id payment_id,s.created_at paid_at,
 s.metadata->>'checkout_mode' mode
 FROM checkouts c JOIN paid s ON s.user_id=c.user_id AND s.created_at>=c.created_at
 AND nullif(s.metadata->>'stripe_session_id','')=nullif(c.metadata->>'stripe_session_id','')
), per_offer AS (
 SELECT x.surface,x.offer,count(DISTINCT x.user_id) exposed_people,
 count(DISTINCT x.user_id) FILTER(WHERE EXISTS(SELECT 1 FROM checkouts c WHERE c.user_id=x.user_id AND c.surface=x.surface AND c.offer=x.offer AND c.created_at>=x.at)) checkout_people,
 count(DISTINCT x.user_id) FILTER(WHERE EXISTS(SELECT 1 FROM converted c JOIN checkouts k ON k.id=c.checkout_id WHERE c.user_id=x.user_id AND c.surface=x.surface AND c.offer=x.offer AND k.created_at>=x.at)) paid_people
 FROM exposure x WHERE x.offer<>'menu' GROUP BY x.surface,x.offer
), funnel AS (
 SELECT count(*) upgrade_people,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM checkouts c WHERE c.user_id=u.user_id AND c.created_at>=u.at)) checkout_people,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM converted c JOIN checkouts k ON k.id=c.checkout_id WHERE c.user_id=u.user_id AND k.created_at>=u.at)) paid_people
 FROM upgraded u
), cohort_paid AS (
 SELECT c.* FROM converted c JOIN checkouts k ON k.id=c.checkout_id WHERE EXISTS(SELECT 1 FROM exposure x WHERE x.user_id=c.user_id AND x.surface=c.surface AND x.offer=c.offer AND x.at<=k.created_at)
)
SELECT jsonb_build_object('start',(SELECT lo FROM bounds),'as_of',(SELECT hi FROM bounds),'status',(SELECT CASE WHEN hi<lo THEN 'not_started' ELSE 'in_window_or_complete' END FROM bounds),'offer_version','mrr0610_v1',
 'upgrade_funnel',(SELECT to_jsonb(f) FROM funnel f),
 'by_offer',(SELECT coalesce(jsonb_agg(o),'[]'::jsonb) FROM per_offer o),
 'unique_paid_people',(SELECT count(DISTINCT user_id) FROM cohort_paid),
 'by_day',(SELECT coalesce(jsonb_agg(d),'[]'::jsonb) FROM (SELECT (paid_at AT TIME ZONE 'America/Sao_Paulo')::date AS report_day,count(DISTINCT user_id) paid_people,count(DISTINCT payment_id) payment_success_records FROM cohort_paid GROUP BY 1) d),
 'by_origin',(SELECT coalesce(jsonb_agg(o),'[]'::jsonb) FROM (SELECT p.source,p.campaign,c.mode,count(DISTINCT c.user_id) paid_people FROM cohort_paid c JOIN people p ON p.id=c.user_id GROUP BY p.source,p.campaign,c.mode) o),
 'unmatched_versioned_checkouts',(SELECT count(DISTINCT c.user_id) FROM checkouts c WHERE NOT EXISTS(SELECT 1 FROM exposure x WHERE x.user_id=c.user_id AND x.surface=c.surface AND x.offer=c.offer AND x.at<=c.created_at)),
 'browser_events_without_session',(SELECT count(*) FROM ev WHERE name IN ('upgrade_modal_opened','conversion_offer_viewed') AND metadata->>'offer_version'='mrr0610_v1' AND nullif(trim(session_id),'') IS NULL)
) AS result;
