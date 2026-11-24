WITH params AS (
 SELECT :observed_cut::timestamptz observed_cut,:live_from::timestamptz live_from
), observed AS (SELECT least(observed_cut,statement_timestamp()) cut,live_from FROM params),
windows AS (
 SELECT 'antes'::text phase,live_from-interval '14 days' phase_start,least(cut,live_from) phase_cut FROM observed WHERE live_from IS NOT NULL AND cut>live_from-interval '14 days'
 UNION ALL SELECT 'depois',live_from,least(cut,live_from+interval '14 days') FROM observed WHERE live_from IS NOT NULL AND cut>live_from
 UNION ALL SELECT 'baseline_sem_exposicao',cut-interval '14 days',cut FROM observed WHERE live_from IS NULL
), internal_profiles AS (SELECT unnest(:internal_profile_ids::uuid[]) AS id),
raw AS (
 SELECT DISTINCT ON(w.phase,e.session_id) w.phase,w.phase_start,w.phase_cut,e.id,e.session_id,e.created_at,CASE WHEN e.path ~* '^/(v|go|recreate|recreate-flow-preview|revive)/' THEN '/'||split_part(e.path,'/',2)||'/:id' WHEN e.path ~* '^/admin/people/' THEN '/admin/people/:id' WHEN e.path ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN regexp_replace(e.path,'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',':id','gi') WHEN e.path ~* '(@|%40)' THEN '(caminho_nao_publico)' ELSE coalesce(nullif(split_part(e.path,'?',1),''),'(sem_caminho)') END path,e.metadata
 FROM windows w JOIN events e ON e.created_at>=w.phase_start AND e.created_at<w.phase_cut
 WHERE e.name='landing_session_started' AND e.session_id IS NOT NULL
 ORDER BY w.phase,e.session_id,e.created_at,e.id
), linked AS (
 SELECT r.*,u.ids,u.n,u.internal FROM raw r CROSS JOIN LATERAL(
 SELECT array_agg(DISTINCT e.user_id) FILTER(WHERE e.user_id IS NOT NULL) ids,count(DISTINCT e.user_id) n,bool_or(i.id IS NOT NULL) internal
 FROM events e LEFT JOIN internal_profiles i ON i.id=e.user_id
 WHERE e.session_id=r.session_id AND e.created_at>=r.created_at AND e.created_at<r.phase_cut
 )u WHERE r.metadata->>'is_bot'='false' AND NOT coalesce(u.internal,false)
), first_account AS (
 SELECT DISTINCT ON(l.phase,p.id) l.phase,p.id uid,l.session_id,p.created_at signed_at,l.phase_start,l.phase_cut
 FROM linked l JOIN profiles p ON p.id=ANY(l.ids)
 WHERE l.n=1 AND p.created_at>=l.phase_start AND p.created_at<l.phase_cut AND p.id NOT IN(SELECT id FROM internal_profiles)
 ORDER BY l.phase,p.id,l.created_at,l.id
), origins AS (SELECT l.*,CASE
 WHEN lower(coalesce(metadata->>'referrer_host','')) IN ('chatgpt','chatgpt.com','www.chatgpt.com') OR coalesce(metadata->>'utm_source','') ILIKE '%chatgpt%' THEN 'chatgpt_explicito'
 WHEN lower(coalesce(metadata->>'referrer_host','')) IN ('bing','bing.com','www.bing.com') OR lower(coalesce(metadata->>'utm_source',''))='bing' THEN CASE WHEN lower(coalesce(metadata->>'utm_medium',''))='cpc' THEN 'bing_pago' ELSE 'bing_explicito' END
 WHEN lower(coalesce(metadata->>'referrer_host','')) IN ('google.com','www.google.com','google') OR lower(coalesce(metadata->>'utm_source',''))='google' THEN 'google'
 WHEN lower(coalesce(metadata->>'referrer_host','')) IN ('duckduckgo.com','www.duckduckgo.com') OR lower(coalesce(metadata->>'utm_source',''))='duckduckgo' THEN 'duckduckgo'
 WHEN lower(coalesce(metadata->>'referrer_host','')) IN ('youtube.com','www.youtube.com','m.youtube.com','youtu.be') OR lower(coalesce(metadata->>'utm_source',''))='youtube' THEN 'youtube'
 WHEN lower(coalesce(metadata->>'utm_source',''))='affiliate' THEN 'afiliado_rotulado'
 WHEN lower(coalesce(metadata->>'utm_source','')) IN ('instagram','ig') THEN 'instagram'
 WHEN nullif(metadata->>'referrer_host','') IS NULL AND nullif(metadata->>'utm_source','') IS NULL THEN 'origem_nao_gravada'
 ELSE 'outra_origem_gravada' END origin FROM linked l),
film AS (
 SELECT a.phase,a.uid,min(v.created_at) first_film_history_at
 FROM first_account a JOIN videos v ON v.user_id=a.uid
 WHERE v.status='completed' AND v.quality_mode IN ('cinematic_ai','cinematic_hollywood','cinematic_kling','cinematic_veo','cinematic_h3','cinematic_omni')
 AND v.created_at>=a.signed_at AND v.created_at<a.phase_cut GROUP BY a.phase,a.uid
), paid AS (
 SELECT DISTINCT a.phase,e.user_id uid FROM events e JOIN first_account a ON a.uid=e.user_id
 WHERE e.name='payment_success' AND (
 (e.path='/api/stripe/webhook' AND e.metadata->>'source'='stripe_webhook' AND e.metadata->>'stripe_livemode'='true' AND e.metadata->>'stripe_payment_status'='paid')
 OR (e.path='/api/dodo/webhook' AND e.metadata->>'source'='dodo_webhook' AND e.metadata->>'dodo_mode'='live')
 ) AND e.metadata->>'amount_total' ~ '^[0-9]+$' AND (e.metadata->>'amount_total')::numeric>0
 AND e.created_at>=a.signed_at AND e.created_at<a.phase_cut
), groups AS (
 SELECT l.phase,l.origin,l.path,count(*) sessions,count(DISTINCT a.uid) accounts,count(DISTINCT f.uid) first_film_delivered,count(DISTINCT p.uid) paid_people,count(*) FILTER(WHERE l.n>1) ambiguous_sessions
 FROM origins l LEFT JOIN first_account a ON a.phase=l.phase AND a.session_id=l.session_id
 LEFT JOIN film f ON f.phase=a.phase AND f.uid=a.uid LEFT JOIN paid p ON p.phase=a.phase AND p.uid=a.uid
 WHERE l.path IN ('/how-much-do-youtube-shorts-pay','/how-much-do-instagram-reels-pay') GROUP BY l.phase,l.origin,l.path
), coverage AS (
 SELECT w.phase,count(DISTINCT p.id) all_new_external_accounts,count(DISTINCT a.uid) accounts_with_eligible_session,
 count(DISTINCT p.id) FILTER(WHERE a.uid IS NULL) accounts_without_eligible_session
 FROM windows w JOIN profiles p ON p.created_at>=w.phase_start AND p.created_at<w.phase_cut
 LEFT JOIN first_account a ON a.phase=w.phase AND a.uid=p.id
 WHERE p.id NOT IN(SELECT id FROM internal_profiles) GROUP BY w.phase
)
SELECT jsonb_build_object('criterion','conversion inside each phase; independent phase cut for identity, signup, film history and paid event',
'observed_cut',(SELECT cut FROM observed),'live_from',(SELECT live_from FROM observed),
'after_not_observed',(SELECT live_from IS NULL OR cut<=live_from FROM observed),
'after_complete',(SELECT coalesce(cut>=live_from+interval '14 days',false) FROM observed),
'windows',(SELECT jsonb_agg(to_jsonb(w) ORDER BY phase) FROM windows w),
'coverage',(SELECT jsonb_agg(to_jsonb(c) ORDER BY phase) FROM coverage c),
'rows',(SELECT jsonb_agg(to_jsonb(g) ORDER BY phase,accounts DESC,sessions DESC,path) FROM groups g)) measurement;
