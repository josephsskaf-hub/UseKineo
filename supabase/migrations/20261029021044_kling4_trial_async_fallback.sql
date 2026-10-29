-- Async Kling trial only. Prepared locally; no production application.
-- A durable scene claim is irrevocable: a lost receipt cannot safely authorize another paid POST.
begin;
create table public.kling4_trial_fallback_runs (
  user_id uuid not null,
  job_id text not null check (length(job_id) between 1 and 200),
  original_request_id text not null check (length(original_request_id) between 1 and 512),
  finalized_at timestamptz,
  request_ids jsonb,
  ambiguous boolean not null default false,
  primary key(user_id, job_id)
);
create table public.kling4_trial_fallback_scenes (
  user_id uuid not null,
  job_id text not null,
  scene_index integer not null check (scene_index between 0 and 2),
  state text not null default 'ready' check (state in ('ready','claimed','accepted','rejected','ambiguous')),
  claim_token uuid,
  claimed_at timestamptz,
  request_id text check (request_id is null or length(request_id) between 1 and 512),
  primary key(user_id, job_id, scene_index),
  foreign key(user_id, job_id) references public.kling4_trial_fallback_runs(user_id, job_id),
  check ((state = 'accepted') = (request_id is not null))
);
alter table public.kling4_trial_fallback_runs enable row level security;
alter table public.kling4_trial_fallback_scenes enable row level security;
revoke all on public.kling4_trial_fallback_runs, public.kling4_trial_fallback_scenes from public, anon, authenticated, service_role;
grant select, insert, update on public.kling4_trial_fallback_runs, public.kling4_trial_fallback_scenes to service_role;

create function public.claim_kling4_trial_fallback_scene(p_job_id text,p_user_id uuid,p_original_request_id text,p_scene_index integer,p_claim_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_run public.kling4_trial_fallback_runs%rowtype; v_scene public.kling4_trial_fallback_scenes%rowtype;
begin
  if p_user_id is null or p_claim_token is null or p_job_id is null or length(p_job_id) not between 1 and 200
    or p_original_request_id is null or length(p_original_request_id) not between 1 and 512
    or p_scene_index is null or p_scene_index not between 0 and 2 then return jsonb_build_object('code','unavailable'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-fallback:'||p_user_id::text||':'||p_job_id,0));
  insert into public.kling4_trial_fallback_runs(user_id,job_id,original_request_id) values(p_user_id,p_job_id,p_original_request_id)
    on conflict(user_id,job_id) do nothing;
  select * into v_run from public.kling4_trial_fallback_runs where user_id=p_user_id and job_id=p_job_id for update;
  if v_run.original_request_id <> p_original_request_id then return jsonb_build_object('code','unavailable'); end if;
  if v_run.finalized_at is not null then return jsonb_build_object('code','finalized'); end if;
  insert into public.kling4_trial_fallback_scenes(user_id,job_id,scene_index)
    select p_user_id,p_job_id,i from generate_series(0,2) i on conflict(user_id,job_id,scene_index) do nothing;
  select * into v_scene from public.kling4_trial_fallback_scenes where user_id=p_user_id and job_id=p_job_id and scene_index=p_scene_index for update;
  if v_scene.state <> 'ready' then return jsonb_build_object('code','existing','state',v_scene.state,'request_id',v_scene.request_id); end if;
  update public.kling4_trial_fallback_scenes set state='claimed',claim_token=p_claim_token,claimed_at=now()
    where user_id=p_user_id and job_id=p_job_id and scene_index=p_scene_index;
  return jsonb_build_object('code','claimed');
end;
$$;

create function public.finish_kling4_trial_fallback_scene(p_job_id text,p_user_id uuid,p_original_request_id text,p_scene_index integer,p_claim_token uuid,p_state text,p_request_id text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_run public.kling4_trial_fallback_runs%rowtype; v_scene public.kling4_trial_fallback_scenes%rowtype;
begin
  if p_state is null or p_state not in ('accepted','rejected','ambiguous')
    or ((p_state='accepted') is distinct from (p_request_id is not null)) then return jsonb_build_object('code','unavailable'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-fallback:'||p_user_id::text||':'||p_job_id,0));
  select * into v_run from public.kling4_trial_fallback_runs where user_id=p_user_id and job_id=p_job_id for update;
  if not found or v_run.original_request_id is distinct from p_original_request_id then return jsonb_build_object('code','unavailable'); end if;
  select * into v_scene from public.kling4_trial_fallback_scenes where user_id=p_user_id and job_id=p_job_id and scene_index=p_scene_index for update;
  if not found or v_scene.claim_token is distinct from p_claim_token then return jsonb_build_object('code','unavailable'); end if;
  if v_scene.state=p_state and v_scene.request_id is not distinct from p_request_id then return jsonb_build_object('code','unchanged'); end if;
  if v_run.finalized_at is not null or v_scene.state <> 'claimed' then return jsonb_build_object('code','unavailable'); end if;
  update public.kling4_trial_fallback_scenes set state=p_state,request_id=p_request_id
    where user_id=p_user_id and job_id=p_job_id and scene_index=p_scene_index;
  return jsonb_build_object('code','ok');
end;
$$;

create function public.finalize_kling4_trial_fallback(p_job_id text,p_user_id uuid,p_original_request_id text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_run public.kling4_trial_fallback_runs%rowtype; v_ids jsonb; v_ambiguous boolean; v_accepted integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-fallback:'||p_user_id::text||':'||p_job_id,0));
  select * into v_run from public.kling4_trial_fallback_runs where user_id=p_user_id and job_id=p_job_id for update;
  if not found or v_run.original_request_id is distinct from p_original_request_id then return jsonb_build_object('code','unavailable'); end if;
  if v_run.finalized_at is null then
    -- POST timeout is 10s; 60s covers its receipt persistence. A dead worker's slot is abandoned, never re-POSTed.
    update public.kling4_trial_fallback_scenes set state='ambiguous' where user_id=p_user_id and job_id=p_job_id
      and state='claimed' and claimed_at <= now()-interval '60 seconds';
    if exists(select 1 from public.kling4_trial_fallback_scenes where user_id=p_user_id and job_id=p_job_id and state in ('ready','claimed'))
      then return jsonb_build_object('code','pending'); end if;
    select jsonb_agg(request_id order by scene_index),bool_or(state='ambiguous') into v_ids,v_ambiguous
      from public.kling4_trial_fallback_scenes where user_id=p_user_id and job_id=p_job_id;
    if jsonb_array_length(v_ids) is distinct from 3 then return jsonb_build_object('code','unavailable'); end if;
    update public.kling4_trial_fallback_runs set finalized_at=now(),request_ids=v_ids,ambiguous=v_ambiguous
      where user_id=p_user_id and job_id=p_job_id returning * into v_run;
  end if;
  select count(*) into v_accepted from jsonb_array_elements(v_run.request_ids) e where e <> 'null'::jsonb;
  return jsonb_build_object('code','finalized','request_ids',v_run.request_ids,'ambiguous',v_run.ambiguous,'no_accepted',v_accepted=0);
end;
$$;

-- The experiment initially recorded the accepted Kling submission. Correct its one canonical result in place once.
-- Replays and a later birth/compose record call cannot revert this terminal transition or alter cost/country.
create function public.transition_kling4_trial_fallback(p_job_id text,p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_film public.kling4_trial_films%rowtype; v_event_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:'||p_user_id::text||':'||p_job_id,0));
  select * into v_film from public.kling4_trial_films where user_id=p_user_id and job_id=p_job_id for update;
  if not found or v_film.reserved_milliusd <> 2355 then return jsonb_build_object('code','unavailable'); end if;
  if v_film.recorded_at is null then
    return public.record_kling4_trial_film(p_job_id,p_user_id,v_film.country,'seedance15_fallback',2355);
  end if;
  if v_film.engine_used not in ('kling4','seedance15_fallback') then return jsonb_build_object('code','unavailable'); end if;
  update public.kling4_trial_films set engine_used='seedance15_fallback' where user_id=p_user_id and job_id=p_job_id;
  v_event_id := md5('free_film_engine_used:'||p_user_id::text||':'||p_job_id)::uuid;
  insert into public.events(id,name,user_id,path,metadata) values(v_event_id,'free_film_engine_used',p_user_id,'/api/generate-video-cinematic',
    jsonb_build_object('film_id',p_job_id,'generation_id',p_job_id,'engine_used','seedance15_fallback','cost_usd',v_film.cost_milliusd::numeric/1000,
      'cost_basis','reserved_upper_bound','country',v_film.country,'seconds',15,'trial_version','kling4-2810'))
    on conflict(id) do update set metadata=jsonb_set(public.events.metadata,'{engine_used}','"seedance15_fallback"'::jsonb)
      where public.events.user_id=p_user_id and public.events.name='free_film_engine_used'
        and public.events.metadata->>'engine_used' in ('kling4','seedance15_fallback');
  return jsonb_build_object('code','ok');
end;
$$;
revoke all on function public.claim_kling4_trial_fallback_scene(text,uuid,text,integer,uuid),
  public.finish_kling4_trial_fallback_scene(text,uuid,text,integer,uuid,text,text),
  public.finalize_kling4_trial_fallback(text,uuid,text),public.transition_kling4_trial_fallback(text,uuid) from public,anon,authenticated;
grant execute on function public.claim_kling4_trial_fallback_scene(text,uuid,text,integer,uuid),
  public.finish_kling4_trial_fallback_scene(text,uuid,text,integer,uuid,text,text),
  public.finalize_kling4_trial_fallback(text,uuid,text),public.transition_kling4_trial_fallback(text,uuid) to service_role;
commit;
