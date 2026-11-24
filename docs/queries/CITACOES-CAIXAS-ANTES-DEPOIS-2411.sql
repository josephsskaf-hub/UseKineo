WITH params AS (
 SELECT :observed_cut::timestamptz observed_cut,'2026-11-24T20:28:00Z'::timestamptz live_from
), observed AS (SELECT least(observed_cut,statement_timestamp()) cut,live_from FROM params),
windows AS (
 SELECT 'antes'::text phase,live_from-interval '14 days' phase_start,least(cut,live_from) phase_cut FROM observed WHERE cut>live_from-interval '14 days'
 UNION ALL SELECT 'depois',live_from,least(cut,live_from+interval '14 days') FROM observed WHERE cut>live_from
), targets(path,kind) AS (VALUES
 ('/free-ai-shorts-generator','caixa'),('/how-much-do-youtube-shorts-pay','caixa'),('/cheapest-ai-shorts-maker','caixa'),
 ('/best-ai-shorts-generators','caixa'),('/how-much-do-instagram-reels-pay','caixa'),('/state-of-ai-shorts-2026','caixa'),('/free-script-generator','caixa'),
 ('/ai-video-generator/for/cartoon-videos','nova'),('/ai-video-generator/for/animated-story-videos','nova'),
 ('/ai-video-generator/for/animal-story-videos','nova'),('/ai-ugc-ads/product-photo-ads','nova')
), internal_profiles AS (SELECT unnest(:internal_profile_ids::uuid[]) AS id),
raw AS (
 SELECT DISTINCT ON(w.phase,e.session_id) w.phase,w.phase_start,w.phase_cut,e.id,e.session_id,e.created_at,
 coalesce(nullif(split_part(e.path,'?',1),''),'(sem_caminho)') path,e.metadata
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
), source_fields AS (
 SELECT l.*,lower(nullif(metadata->>'referrer_host','')) host,lower(nullif(metadata->>'utm_source','')) utm,
 coalesce(lower(nullif(metadata->>'referrer_host','')),lower(nullif(metadata->>'utm_source',''))) attested_source
 FROM linked l
), origins AS (SELECT l.*,CASE
 WHEN host IN ('chatgpt','chatgpt.com','www.chatgpt.com') OR utm LIKE '%chatgpt%' THEN 'chatgpt_explicito'
 WHEN attested_source IN ('bing','bing.com','www.bing.com') THEN CASE WHEN lower(coalesce(metadata->>'utm_medium',''))='cpc' THEN 'bing_pago' ELSE 'bing_explicito' END
 WHEN attested_source IN ('google.com','www.google.com','google') THEN 'google'
 WHEN attested_source IN ('duckduckgo','duckduckgo.com','www.duckduckgo.com') THEN 'duckduckgo'
 WHEN attested_source IN ('youtube','youtube.com','www.youtube.com','m.youtube.com','youtu.be') THEN 'youtube'
 WHEN attested_source='affiliate' THEN 'afiliado_rotulado'
 WHEN attested_source IN ('instagram','ig','instagram.com','www.instagram.com') THEN 'instagram'
 WHEN attested_source IN ('facebook','fb','facebook.com','www.facebook.com','m.facebook.com','l.facebook.com') THEN 'facebook'
 WHEN attested_source IN ('taaft','theresanaiforthat','theresanaiforthat.com','www.theresanaiforthat.com') THEN 'taaft'
 WHEN host IS NULL AND utm IS NULL THEN 'origem_nao_gravada'
 ELSE 'outra_origem_gravada' END origin FROM source_fields l),
film AS (
 SELECT a.phase,a.uid,min(v.created_at) first_film_history_at
 FROM first_account a JOIN videos v ON v.user_id=a.uid
 WHERE v.status='completed' AND v.quality_mode IN ('cinematic_ai','cinematic_hollywood','cinematic_kling','cinematic_veo','cinematic_h3','cinematic_omni')
 AND v.created_at>=a.signed_at AND v.created_at<a.phase_cut GROUP BY a.phase,a.uid
), grouped AS (
 SELECT l.phase,l.origin,l.path,count(*) sessions,count(DISTINCT a.uid) accounts,count(DISTINCT f.uid) first_film,
 count(*) FILTER(WHERE l.n>1) ambiguous_sessions,
 count(*) FILTER(WHERE lower(coalesce(l.metadata->>'utm_source',''))='affiliate' OR lower(coalesce(l.metadata->>'utm_campaign','')) LIKE 'affiliate%') affiliate_tagged_sessions
 FROM origins l LEFT JOIN first_account a ON a.phase=l.phase AND a.session_id=l.session_id
 LEFT JOIN film f ON f.phase=a.phase AND f.uid=a.uid
 WHERE l.path IN (SELECT path FROM targets) GROUP BY l.phase,l.origin,l.path
), page_totals AS (
 SELECT w.phase,t.path,t.kind,coalesce(sum(g.sessions),0)::bigint sessions,coalesce(sum(g.accounts),0)::bigint accounts,
 coalesce(sum(g.first_film),0)::bigint first_film,coalesce(sum(g.ambiguous_sessions),0)::bigint ambiguous_sessions,coalesce(sum(g.affiliate_tagged_sessions),0)::bigint affiliate_tagged_sessions
 FROM windows w CROSS JOIN targets t LEFT JOIN grouped g ON g.phase=w.phase AND g.path=t.path GROUP BY w.phase,t.path,t.kind
), coverage AS (
 SELECT w.phase,count(DISTINCT p.id) all_new_external_accounts,count(DISTINCT a.uid) accounts_with_eligible_session,
 count(DISTINCT p.id) FILTER(WHERE a.uid IS NULL) accounts_without_eligible_session
 FROM windows w LEFT JOIN profiles p ON p.created_at>=w.phase_start AND p.created_at<w.phase_cut AND p.id NOT IN(SELECT id FROM internal_profiles)
 LEFT JOIN first_account a ON a.phase=w.phase AND a.uid=p.id GROUP BY w.phase
), quality AS (
 SELECT w.phase,count(r.session_id) raw_sessions,count(*) FILTER(WHERE r.metadata->>'is_bot'='true') marked_bot_sessions,
 count(*) FILTER(WHERE r.session_id IS NOT NULL AND r.metadata->>'is_bot' IS DISTINCT FROM 'false' AND r.metadata->>'is_bot' IS DISTINCT FROM 'true') missing_bot_flag_sessions,
 (SELECT count(*) FROM linked l WHERE l.phase=w.phase) eligible_sessions
 FROM windows w LEFT JOIN raw r ON r.phase=w.phase GROUP BY w.phase
), gates AS (
 SELECT p.*,round(100.0*p.accounts/nullif(p.sessions,0),2) conversion_pct,
 CASE WHEN kind='nova' THEN 'pagina_nova_sem_gate_da_caixa' WHEN phase='antes' THEN 'referencia_antes'
 WHEN NOT(SELECT cut>=live_from+interval '14 days' FROM observed) THEN 'aguardar_14_dias'
 WHEN sessions=0 THEN 'sem_denominador'
 WHEN accounts*100>sessions*4 THEN 'acima_4pct'
 ELSE 'nao_supera_4pct_CEO_rever_caixa' END gate
 FROM page_totals p
), origin_results AS (
 SELECT g.*,t.kind,round(100.0*g.accounts/nullif(g.sessions,0),2) conversion_pct,
 CASE WHEN t.kind='nova' THEN 'pagina_nova_sem_gate_da_caixa' WHEN phase='antes' THEN 'referencia_antes'
 WHEN NOT(SELECT cut>=live_from+interval '14 days' FROM observed) THEN 'aguardar_14_dias'
 WHEN g.sessions=0 THEN 'sem_denominador'
 WHEN g.accounts*100>g.sessions*4 THEN 'acima_4pct'
 ELSE 'nao_supera_4pct_CEO_rever_caixa' END gate
 FROM grouped g JOIN targets t ON t.path=g.path
)
SELECT jsonb_build_object('version','citacoes-caixas-2411-v2','criterion','conversion within each phase, fixed independent cuts; account once at first eligible session across all pages before target filter',
 'read_on',statement_timestamp(),'observed_cut',(SELECT cut FROM observed),'live_from',(SELECT live_from FROM observed),
 'after_complete',(SELECT cut>=live_from+interval '14 days' FROM observed),'after_not_observed',(SELECT cut<=live_from FROM observed),
 'windows',(SELECT jsonb_agg(to_jsonb(w) ORDER BY phase) FROM windows w),
 'coverage',(SELECT jsonb_agg(to_jsonb(c) ORDER BY phase) FROM coverage c),
 'quality',(SELECT jsonb_agg(to_jsonb(q) ORDER BY phase) FROM quality q),
 'page_totals',(SELECT jsonb_agg(to_jsonb(g) ORDER BY phase,path) FROM gates g),
 'rows',(SELECT jsonb_agg(to_jsonb(g) ORDER BY phase,path,origin) FROM origin_results g)) measurement;
