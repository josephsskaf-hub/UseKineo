WITH bounds AS (SELECT statement_timestamp() cut),
internal_profiles AS (SELECT unnest(:internal_profile_ids::uuid[]) AS id), raw AS (
 SELECT DISTINCT ON(e.session_id) e.id,e.session_id,e.created_at,coalesce(nullif(split_part(e.path,'?',1),''),'(sem caminho)') path,e.metadata,b.cut
 FROM events e CROSS JOIN bounds b WHERE e.name='landing_session_started' AND e.session_id IS NOT NULL
 AND e.created_at>=b.cut-interval '30 days' AND e.created_at<b.cut ORDER BY e.session_id,e.created_at,e.id
), identities AS (
 SELECT l.session_id,count(DISTINCT e.user_id) users,array_agg(DISTINCT e.user_id) FILTER(WHERE e.user_id IS NOT NULL) ids,bool_or(i.id IS NOT NULL) internal
 FROM raw l LEFT JOIN events e ON e.session_id=l.session_id AND e.created_at>=l.created_at AND e.created_at<l.cut
 LEFT JOIN internal_profiles i ON i.id=e.user_id GROUP BY l.session_id
), land AS (
 SELECT r.*,s.users,CASE WHEN s.users=1 THEN s.ids[1] END uid,
 CASE WHEN lower(coalesce(r.metadata->>'referrer_host','')) IN ('chatgpt','chatgpt.com','www.chatgpt.com') OR coalesce(r.metadata->>'utm_source','') ILIKE '%chatgpt%' THEN 'chatgpt_explicito'
 WHEN nullif(r.metadata->>'referrer_host','') IS NULL AND nullif(r.metadata->>'utm_source','') IS NULL THEN 'origem_nao_gravada'
 ELSE coalesce(nullif(r.metadata->>'referrer_host',''),r.metadata->>'utm_source') END origin,
 nullif(r.metadata->>'utm_source','') utm_source,nullif(r.metadata->>'utm_medium','') utm_medium
 FROM raw r JOIN identities s USING(session_id) WHERE r.metadata->>'is_bot'='false' AND NOT coalesce(s.internal,false)
), new_links AS (
 SELECT DISTINCT ON(p.id) p.id uid,l.session_id,l.path,l.created_at landed_at,p.created_at signed_at,l.cut,
 coalesce(nullif(upper(trim(p.signup_country)),''),'PAIS_NAO_GRAVADO') country,l.origin,l.utm_source,l.utm_medium
 FROM land l JOIN profiles p ON p.id=l.uid WHERE p.created_at>=l.created_at AND p.created_at<l.cut
 ORDER BY p.id,l.created_at,l.id
), films AS (
 SELECT n.uid,min(v.created_at) request_at FROM new_links n JOIN videos v ON v.user_id=n.uid AND v.status='completed'
 WHERE v.created_at>=n.signed_at AND v.created_at<n.cut GROUP BY n.uid
),
selected AS (SELECT * FROM land WHERE origin='chatgpt_explicito' OR origin ILIKE '%bing%' OR utm_source ILIKE '%bing%'),
grouped AS (
 SELECT l.path,l.origin,l.utm_source,l.utm_medium,count(*) sessions,count(DISTINCT n.uid) signups,count(DISTINCT f.uid) completed_requests,
 count(*) FILTER(WHERE nullif(trim(l.metadata->>'utm_term'),'') IS NOT NULL) sessions_with_utm_term
 FROM selected l LEFT JOIN new_links n ON n.session_id=l.session_id LEFT JOIN films f ON f.uid=n.uid
 GROUP BY l.path,l.origin,l.utm_source,l.utm_medium),
terms AS (
 SELECT origin,utm_medium,lower(trim(metadata->>'utm_term')) term,count(*) sessions
 FROM selected WHERE nullif(trim(metadata->>'utm_term'),'') IS NOT NULL
 GROUP BY origin,utm_medium,lower(trim(metadata->>'utm_term'))),
safe_questions AS (
 SELECT origin,utm_medium,term,sessions FROM terms WHERE sessions>=3 AND length(term) BETWEEN 10 AND 150
 AND term ~ '^(how|what|which|where|can|best|ai|free|make|create|text|faceless|quanto|como|qual|melhor)[ a-z0-9?/-]+$'
 AND term !~ '[0-9]{5}' AND term !~ '(www|http|@)')
SELECT jsonb_build_object('cut_utc',(SELECT cut FROM bounds),'start_utc',(SELECT cut-interval '30 days' FROM bounds),
'paths',(SELECT jsonb_agg(to_jsonb(g) ORDER BY signups DESC,sessions DESC,path) FROM grouped g),
'query_term_coverage',(SELECT jsonb_agg(to_jsonb(x)) FROM(SELECT origin,utm_medium,count(*) distinct_term_groups,sum(sessions) sessions_with_term FROM terms GROUP BY origin,utm_medium)x),
'aggregate_question_terms_ge3',(SELECT jsonb_agg(to_jsonb(q) ORDER BY sessions DESC,term) FROM safe_questions q)) measurement;

-- Segunda consulta: mesma janela, cobertura dos perfis.

WITH bounds AS (SELECT '2026-11-24T05:05:04.514356+00:00'::timestamptz cut),
internal_profiles AS (SELECT unnest(:internal_profile_ids::uuid[]) AS id),
p AS (
 SELECT CASE WHEN coalesce(signup_utm_source,utm_source,'') ILIKE '%chatgpt%' OR signup_referrer ~* '^https?://([^/?#]+\.)?chatgpt\.com([/?#]|$)' THEN 'chatgpt_explicit_profile'
 WHEN signup_referrer ~* '^https?://([^/?#]+\.)?bing\.com([/?#]|$)' OR coalesce(signup_utm_source,utm_source,'') ILIKE '%bing%' THEN 'bing_profile' ELSE 'other' END origin,
 signup_referrer referrer, signup_utm_medium medium FROM profiles,bounds b
 WHERE created_at>=b.cut-interval '30 days' AND created_at<b.cut AND id NOT IN (SELECT id FROM internal_profiles)
), marked AS (
 SELECT *,substring(referrer FROM '(?i)[?&](?:q|query|search_query|question|prompt)=([^&#]+)') term FROM p)
SELECT origin,medium,count(*) profiles,
count(*) FILTER(WHERE nullif(trim(referrer),'') IS NOT NULL) with_external_referrer,
count(*) FILTER(WHERE referrer LIKE '%?%') with_referrer_query,
count(*) FILTER(WHERE nullif(trim(term),'') IS NOT NULL AND term !~ '^(%20|\+|\s)*$') with_nonempty_question_parameter
FROM marked WHERE origin<>'other' GROUP BY origin,medium ORDER BY origin,medium;