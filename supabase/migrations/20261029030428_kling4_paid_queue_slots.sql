-- Paid queue receipts are independent of the first-free-film trial ledger and budget.
-- Never reclaim a pending POST: after 60 seconds it becomes ambiguous, not retryable.
begin;
create table public.kling4_paid_queue_slots (
  user_id uuid not null,
  job_id text not null check (job_id ~ '^[A-Za-z0-9_-]{8,100}$'),
  phase text not null check (phase in ('kling4', 'fallback')),
  scene_index integer not null,
  claim_token uuid not null,
  state text not null default 'pending' check (state in ('pending','accepted','rejected','ambiguous')),
  request_id text,
  model text,
  claimed_at timestamptz not null default now(),
  finished_at timestamptz,
  primary key (user_id, job_id, phase, scene_index),
  check (scene_index >= 0 and scene_index < case when phase = 'kling4' then 4 else 12 end),
  check ((state = 'accepted' and request_id is not null and length(btrim(request_id)) between 1 and 512 and model is not null)
    or (state <> 'accepted' and request_id is null)),
  check (model is null or (phase = 'kling4' and model in ('kling/v4/text-to-video','kling/v4/image-to-video'))
    or (phase = 'fallback' and model = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'))
);
alter table public.kling4_paid_queue_slots enable row level security;
revoke all on public.kling4_paid_queue_slots from public, anon, authenticated, service_role;
grant select, insert, update on public.kling4_paid_queue_slots to service_role;

create function public.claim_kling4_paid_scene(p_user_id uuid,p_job_id text,p_phase text,p_scene_index integer,p_claim_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_slot public.kling4_paid_queue_slots%rowtype;
begin
  if p_user_id is null or p_job_id is null or p_job_id !~ '^[A-Za-z0-9_-]{8,100}$' or p_claim_token is null
    or p_phase is null or p_phase not in ('kling4','fallback') or p_scene_index is null
    or p_scene_index < 0 or p_scene_index >= (case when p_phase = 'kling4' then 4 else 12 end)
  then return jsonb_build_object('code','invalid'); end if;
  insert into public.kling4_paid_queue_slots(user_id,job_id,phase,scene_index,claim_token)
    values(p_user_id,p_job_id,p_phase,p_scene_index,p_claim_token)
    on conflict (user_id,job_id,phase,scene_index) do nothing returning * into v_slot;
  if found then return jsonb_build_object('code','claimed'); end if;
  select * into v_slot from public.kling4_paid_queue_slots
    where user_id=p_user_id and job_id=p_job_id and phase=p_phase and scene_index=p_scene_index;
  return jsonb_build_object('code','existing','state',v_slot.state,'request_id',v_slot.request_id,'model',v_slot.model);
end;
$$;

create function public.finish_kling4_paid_scene(p_user_id uuid,p_job_id text,p_phase text,p_scene_index integer,
  p_claim_token uuid,p_state text,p_request_id text,p_model text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_slot public.kling4_paid_queue_slots%rowtype;
begin
  if p_state is null or p_state not in ('accepted','rejected','ambiguous')
    or (p_state='accepted' and (p_request_id is null or length(btrim(p_request_id)) not between 1 and 512))
    or (p_state<>'accepted' and p_request_id is not null)
    or p_model is null or not ((p_phase='kling4' and p_model in ('kling/v4/text-to-video','kling/v4/image-to-video'))
      or (p_phase='fallback' and p_model='fal-ai/bytedance/seedance/v1.5/pro/text-to-video'))
  then return jsonb_build_object('code','invalid'); end if;
  select * into v_slot from public.kling4_paid_queue_slots where user_id=p_user_id and job_id=p_job_id
    and phase=p_phase and scene_index=p_scene_index and claim_token=p_claim_token for update;
  if not found then return jsonb_build_object('code','not_owner'); end if;
  if v_slot.state <> 'pending' then
    if v_slot.state = p_state and v_slot.request_id is not distinct from p_request_id and v_slot.model = p_model
      then return jsonb_build_object('code','unchanged'); end if;
    return jsonb_build_object('code','frozen');
  end if;
  update public.kling4_paid_queue_slots set state=p_state, request_id=p_request_id, model=p_model, finished_at=now()
    where user_id=p_user_id and job_id=p_job_id and phase=p_phase and scene_index=p_scene_index;
  return jsonb_build_object('code','ok');
end;
$$;

create function public.read_kling4_paid_scenes(p_user_id uuid,p_job_id text,p_phase text,p_count integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_ids jsonb; v_models jsonb; v_states jsonb; v_count integer; v_pending integer;
begin
  if p_user_id is null or p_job_id is null or p_phase is null or p_phase not in ('kling4','fallback')
    or p_count is null or not ((p_phase='kling4' and p_count in (1,2,4)) or (p_phase='fallback' and p_count in (3,6,12)))
  then return jsonb_build_object('code','invalid'); end if;
  update public.kling4_paid_queue_slots set state='ambiguous', finished_at=now()
    where user_id=p_user_id and job_id=p_job_id and phase=p_phase and scene_index<p_count
      and state='pending' and claimed_at <= now()-interval '60 seconds';
  select count(*),count(*) filter(where state='pending'),jsonb_agg(request_id order by scene_index),
    jsonb_agg(model order by scene_index),jsonb_agg(state order by scene_index)
    into v_count,v_pending,v_ids,v_models,v_states
    from public.kling4_paid_queue_slots where user_id=p_user_id and job_id=p_job_id and phase=p_phase and scene_index<p_count;
  if v_count <> p_count or v_pending > 0 then return jsonb_build_object('code','pending'); end if;
  return jsonb_build_object('code','finalized','request_ids',v_ids,'models',v_models,'states',v_states);
end;
$$;
revoke all on function public.claim_kling4_paid_scene(uuid,text,text,integer,uuid),
  public.finish_kling4_paid_scene(uuid,text,text,integer,uuid,text,text,text),
  public.read_kling4_paid_scenes(uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.claim_kling4_paid_scene(uuid,text,text,integer,uuid),
  public.finish_kling4_paid_scene(uuid,text,text,integer,uuid,text,text,text),
  public.read_kling4_paid_scenes(uuid,text,text,integer) to service_role;
commit;
