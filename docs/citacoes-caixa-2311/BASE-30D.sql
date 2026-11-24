
with bounds as (select '2026-11-23T18:28:12Z'::timestamptz cut),
windows as (
 select 'ultimos_30d'::text period,cut-interval '30 days' started_at,cut ended_at from bounds
 union all select 'bing_12a15nov','2026-11-12T03:00:00Z','2026-11-16T03:00:00Z'
), internal_profiles as (
 select id from profiles where lower(coalesce(email,'')) in ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com')
 or lower(coalesce(email,'')) like any(array['josephsskaf+%@gmail.com','joseph+%@gmail.com','joseph+%','victoriaskaf%','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%'])
), raw_all as (
 select distinct on(w.period,e.session_id) w.period,w.started_at,w.ended_at,e.id,e.session_id,e.created_at,coalesce(nullif(split_part(e.path,'?',1),''),'(sem caminho)') path,e.metadata
 from windows w join events e on e.created_at>=w.started_at and e.created_at<w.ended_at
 where e.name='landing_session_started' and e.session_id is not null
 order by w.period,e.session_id,e.created_at,e.id
), raw as (
 select * from raw_all where path in ('/text-to-video-shorts','/best-ai-shorts-generators','/how-much-do-youtube-shorts-pay')
), identities as (
 select l.period,l.session_id,count(distinct e.user_id) users,array_agg(distinct e.user_id) filter(where e.user_id is not null) ids,bool_or(i.id is not null) internal
 from raw l left join events e on e.session_id=l.session_id and e.created_at>=l.created_at and e.created_at<l.ended_at
 left join internal_profiles i on i.id=e.user_id group by l.period,l.session_id
), land as (
 select r.*,s.users,case when s.users=1 then s.ids[1] end uid,
 case when lower(coalesce(metadata->>'referrer_host','')) in ('chatgpt','chatgpt.com','www.chatgpt.com') or coalesce(metadata->>'utm_source','') ilike '%chatgpt%' then 'chatgpt_explicito'
 when lower(coalesce(metadata->>'referrer_host','')) in ('bing','bing.com','www.bing.com') or lower(coalesce(metadata->>'utm_source','')) in ('bing','bing.com') then 'bing_explicito'
 when nullif(metadata->>'referrer_host','') is null and nullif(metadata->>'utm_source','') is null then 'origem_nao_gravada'
 else 'outras_origens_gravadas' end origin
 from raw r join identities s using(period,session_id) where metadata->>'is_bot'='false' and not coalesce(s.internal,false)
), new_links as (
 select distinct on(l.period,p.id) l.period,p.id uid,l.session_id,l.path,l.origin,l.created_at landed_at,p.created_at signed_at,upper(coalesce(p.signup_country,'')) country,l.ended_at
 from land l join profiles p on p.id=l.uid where p.created_at>=l.created_at and p.created_at<l.ended_at
 order by l.period,p.id,l.created_at,l.id
), first_films as (
 select n.period,n.uid,min(v.created_at) first_completed_request_at from new_links n join videos v on v.user_id=n.uid and v.status='completed'
 where v.created_at>=n.signed_at and v.created_at<n.ended_at group by n.period,n.uid
), expanded as (
 select l.*,k.bucket from land l cross join lateral (values('todas_as_origens'),(l.origin),(case when lower(coalesce(l.metadata->>'referrer_host','')) in ('bing','bing.com','www.bing.com') then 'bing_referrer_estrito' end),(case when l.origin='bing_explicito' and lower(coalesce(l.metadata->>'utm_medium',''))='cpc' then 'bing_cpc' end)) k(bucket)
), funnel as (
 select l.period,l.path,l.bucket,count(*) sessions,count(distinct l.uid) identified_actors,
 count(*) filter(where l.users=0) anonymous_sessions,count(*) filter(where l.users>1) ambiguous_sessions,
 count(distinct n.uid) signups,count(distinct n.uid) filter(where n.country in ('US','CA')) us_ca_signups,
 count(distinct n.uid) filter(where n.country='US') us_signups,count(distinct n.uid) filter(where n.country='') signups_without_country,
 count(distinct f.uid) first_completed_films
 from expanded l left join new_links n on n.period=l.period and n.session_id=l.session_id left join first_films f on f.period=n.period and f.uid=n.uid
 where l.bucket is not null group by l.period,l.path,l.bucket
)
select jsonb_build_object('read_at',now(),'cut_utc',(select cut from bounds),
 'windows',(select jsonb_agg(to_jsonb(w)) from windows w),
 'controls',(select jsonb_agg(jsonb_build_object('period',w.period,'dedup_target_sessions',(select count(*) from raw r where r.period=w.period),'bot_target_sessions',(select count(*) from raw r where r.period=w.period and r.metadata->>'is_bot'='true'),'recognized_internal_target_sessions',(select count(*) from identities i where i.period=w.period and coalesce(i.internal,false)))) from windows w),
 'rows',(select jsonb_agg(to_jsonb(f) order by period,path,bucket) from funnel f)) measurement;
