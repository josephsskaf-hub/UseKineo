with bounds as (
 select '2026-11-23T08:33:47+00:00'::timestamptz as cut, '2026-11-23T04:51:10Z'::timestamptz as deployed
), windows as (
 select 'ultimos_14d_completos'::text period, '2026-11-09T03:00:00Z'::timestamptz started_at, '2026-11-23T03:00:00Z'::timestamptz ended_at
 union all select 'ultimos_7d_completos','2026-11-16T03:00:00Z','2026-11-23T03:00:00Z'
 union all select 'antes_mesmo_relogio',deployed-interval '1 day',cut-interval '1 day' from bounds
 union all select 'depois_deploy',deployed,cut from bounds
), internal_profiles as (
select id from profiles where lower(coalesce(email,'')) in ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com')
or lower(coalesce(email,'')) like any(array['josephsskaf+%@gmail.com','joseph+%@gmail.com','joseph+%','victoriaskaf%','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%'])
), land_raw as (
 select distinct on(w.period,e.session_id) w.period,w.started_at,w.ended_at,e.id,e.session_id,e.created_at,
 coalesce(nullif(split_part(e.path,'?',1),''),'(sem caminho)') path,e.metadata
 from windows w join public.events e on e.created_at>=w.started_at and e.created_at<w.ended_at
 where e.name='landing_session_started' and e.session_id is not null order by w.period,e.session_id,e.created_at,e.id
), identities as (
 select l.period,l.session_id,count(distinct e.user_id) users,
 array_agg(distinct e.user_id) filter(where e.user_id is not null) ids,bool_or(i.id is not null) internal
 from land_raw l left join public.events e on e.session_id=l.session_id and e.created_at>=l.created_at and e.created_at<l.ended_at
 left join internal_profiles i on i.id=e.user_id group by l.period,l.session_id
), land as (
 select l.*,s.users,case when s.users=1 then s.ids[1] end uid,
 (coalesce(metadata->>'utm_source','') ilike '%chatgpt%' or lower(coalesce(metadata->>'referrer_host','')) in ('chatgpt','chatgpt.com','www.chatgpt.com')) chatgpt,
 (nullif(metadata->>'referrer_host','') is null and nullif(metadata->>'utm_source','') is null) unknown_origin
 from land_raw l join identities s using(period,session_id) where metadata->>'is_bot'='false' and not coalesce(s.internal,false)
), per_page as (
 select period,path,count(*) all_origins_sessions,count(*) filter(where chatgpt) chatgpt_sessions,
 count(*) filter(where unknown_origin) unknown_origin_sessions,count(distinct uid) filter(where chatgpt) identified_chatgpt_actors
 from land group by period,path
), controls as (
 select w.period,w.started_at,w.ended_at,
 (select count(*) from land_raw r where r.period=w.period) dedup_landing_sessions,
 (select count(*) from land_raw r where r.period=w.period and r.metadata->>'is_bot'='true') bot_sessions,
 (select count(*) from identities i where i.period=w.period and coalesce(i.internal,false)) recognized_internal_sessions,
 (select count(*) from land l where l.period=w.period) all_origins_sessions,
 (select count(*) from land l where l.period=w.period and l.chatgpt) chatgpt_sessions,
 (select count(*) from land l where l.period=w.period and l.unknown_origin) unknown_origin_sessions,
 (select count(distinct uid) from land l where l.period=w.period and l.chatgpt) identified_chatgpt_actors
 from windows w
)
select jsonb_build_object('read_at',now(),'cut_utc',(select cut from bounds),'deployed_utc',(select deployed from bounds),
 'controls',(select jsonb_agg(to_jsonb(c) order by c.started_at,c.period) from controls c),
 'rows',(select jsonb_agg(to_jsonb(p) order by p.period,p.chatgpt_sessions desc,p.path) from per_page p where chatgpt_sessions>0 or path in ('/free-ai-shorts/cartoon','/gerador-de-shorts-gratis','/ai-video-generator/for/urdu','/ai-video-generator/seedance','/best-ai-shorts-generators','/chatgpt','/text-to-video-shorts','/ai-video-generator/for/documentary-shorts','/generador-de-videos-de-terror','/faceless-youtube-shorts-generator','/free-ai-shorts/horror','/generador-de-shorts-gratis','/vs/invideo-alternatives-faceless-shorts','/ai-video-generator/for/faceless-videos','/ai-video-generator/for/story-videos'))) measurement;