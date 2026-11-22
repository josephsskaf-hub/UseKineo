with internal_profiles as (
select id from profiles where lower(coalesce(email,'')) in ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com')
or lower(coalesce(email,'')) like any(array['josephsskaf+%@gmail.com','joseph+%@gmail.com','joseph+%','victoriaskaf%','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%'])
), land_raw as (
select distinct on (session_id) id,session_id,created_at,coalesce(nullif(split_part(path,'?',1),''),'(sem caminho)') path,metadata from events
where name='landing_session_started' and created_at>='2026-11-06T03:00:00Z' and created_at<'2026-11-20T03:00:00Z' and session_id is not null order by session_id,created_at,id
), identities as (
select l.session_id,count(distinct e.user_id) users,array_agg(distinct e.user_id) filter(where e.user_id is not null) ids,bool_or(i.id is not null) internal
from land_raw l left join events e on e.session_id=l.session_id and e.created_at>=l.created_at and e.created_at<'2026-11-20T03:00:00Z'
left join internal_profiles i on i.id=e.user_id group by l.session_id
), land as (
select l.*,s.users,case when s.users=1 then s.ids[1] end uid,
(coalesce(metadata->>'utm_source','') ilike '%chatgpt%' or lower(coalesce(metadata->>'referrer_host','')) in ('chatgpt','chatgpt.com','www.chatgpt.com')) chatgpt
from land_raw l join identities s using(session_id) where metadata->>'is_bot'='false' and not coalesce(s.internal,false)
), new_links as (
select distinct on (p.id) p.id uid,l.session_id,l.path,l.created_at landed_at,p.created_at signed_at
from land l join profiles p on p.id=l.uid where l.chatgpt and p.created_at>=l.created_at and p.created_at<'2026-11-20T03:00:00Z'
order by p.id,l.created_at,l.id
), completed as (
select n.uid,min(v.created_at) first_completed_request_at from new_links n join videos v on v.user_id=n.uid and v.status='completed'
where v.created_at>=n.signed_at and v.created_at<'2026-11-20T03:00:00Z' group by n.uid
), funnel as (
select l.path,count(*) visits,count(*) filter(where l.users=1) linked_sessions,count(*) filter(where l.users>1) ambiguous_sessions,count(distinct n.uid) signups,count(distinct c.uid) first_completed_films
from land l left join new_links n on n.session_id=l.session_id left join completed c on c.uid=n.uid where l.chatgpt group by l.path
)
select jsonb_build_object('measured_at',now(),'start_utc','2026-11-06T03:00:00Z','end_exclusive_utc','2026-11-20T03:00:00Z',
'controls',(select jsonb_build_object('raw_landing_events',(select count(*) from events where name='landing_session_started' and created_at>='2026-11-06T03:00:00Z' and created_at<'2026-11-20T03:00:00Z'),'dedup_sessions',count(*),'bot_sessions',count(*) filter(where metadata->>'is_bot'='true')) from land_raw),
'all_origins_external_nonbot_sessions',(select count(*) from land),
'unknown_origin_sessions',(select count(*) from land where nullif(metadata->>'referrer_host','') is null and nullif(metadata->>'utm_source','') is null),
'chatgpt_sessions',(select count(*) from land where chatgpt),
'chatgpt_known_internal_sessions_excluded',(select count(*) from land_raw l join identities i using(session_id) where coalesce(i.internal,false) and (coalesce(metadata->>'utm_source','') ilike '%chatgpt%' or lower(coalesce(metadata->>'referrer_host','')) in ('chatgpt','chatgpt.com','www.chatgpt.com'))),
'rows',(select jsonb_agg(to_jsonb(f) order by visits desc,path) from funnel f)) as measurement;
