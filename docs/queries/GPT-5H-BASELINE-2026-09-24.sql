WITH cohort AS (
SELECT p.id,p.created_at,CASE WHEN coalesce(p.signup_utm_source,'') ~* 'chatgpt' OR coalesce(p.signup_referrer,'') ~* 'chatgpt[.]com|chat[.]openai[.]com' OR coalesce(p.signup_utm_campaign,'') ~* 'chatgpt|gpt_handoff' THEN 'ChatGPT' ELSE 'other_or_unknown' END source
FROM profiles p WHERE p.created_at >= '2026-09-10T13:51:19Z' AND p.created_at < '2026-09-24T13:51:19Z' AND NOT (lower(p.email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(p.email) LIKE ANY(ARRAY['josephsskaf+%@gmail.com','joseph+%@gmail.com','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%']))
), persons AS (
 SELECT c.*,
 (SELECT min(v.created_at) FROM videos v WHERE v.user_id=c.id AND v.status='completed' AND v.created_at >= c.created_at AND v.created_at < '2026-09-24T13:51:19Z') first_video,
 (SELECT min(e.created_at) FROM events e WHERE e.user_id=c.id AND e.name='checkout_attempted' AND e.created_at >= c.created_at AND e.created_at < '2026-09-24T13:51:19Z') checkout,
 (SELECT min(e.created_at) FROM events e WHERE e.user_id=c.id AND e.name='payment_success' AND e.created_at >= c.created_at AND e.created_at < '2026-09-24T13:51:19Z') paid,
 (SELECT e.metadata->>'path' FROM events e WHERE e.user_id=c.id AND e.created_at < '2026-09-24T13:51:19Z' ORDER BY e.created_at,e.id LIMIT 1) first_path
 FROM cohort c
)
SELECT 'day_brt' group_type,(created_at AT TIME ZONE 'America/Sao_Paulo')::date::text bucket,source,count(*) people,count(first_video) completed_video,count(checkout) checkout_attempted,count(paid) payment_success,count(*) FILTER(WHERE first_video IS NOT NULL AND checkout>=first_video) ordered_video_checkout,count(*) FILTER(WHERE first_video IS NOT NULL AND checkout>=first_video AND paid>=checkout) ordered_full_funnel FROM persons GROUP BY 2,3
UNION ALL
SELECT 'landing',coalesce(first_path,'UNKNOWN'),source,count(*),count(first_video),count(checkout),count(paid),count(*) FILTER(WHERE first_video IS NOT NULL AND checkout>=first_video),count(*) FILTER(WHERE first_video IS NOT NULL AND checkout>=first_video AND paid>=checkout) FROM persons GROUP BY 2,3
UNION ALL SELECT 'total','14d',source,count(*),count(first_video),count(checkout),count(paid),count(*) FILTER(WHERE first_video IS NOT NULL AND checkout>=first_video),count(*) FILTER(WHERE first_video IS NOT NULL AND checkout>=first_video AND paid>=checkout) FROM persons GROUP BY source
ORDER BY 1,2,3
