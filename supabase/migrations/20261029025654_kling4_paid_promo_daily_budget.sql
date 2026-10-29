-- KINEO-KLING4-PAID-2810. Prepared locally; Claude applies after review, before opt-in rollout.
-- UTC days; 30 November inclusive = started_at < 2026-12-01 00:00:00Z.
-- All fal video AND bounded fal extras must be reserved before their provider calls.
-- Reservations are upper bounds, not invoices. Ambiguous failures never replenish either allowance.
begin;
create table public.kling4_promo_days (
  request_day date primary key,
  reserved_milliusd integer not null default 0 check (reserved_milliusd between 0 and 100000)
);
create table public.kling4_promo_enrollments (
  user_id uuid primary key,
  subscription_started_at timestamptz not null,
  launch_at timestamptz not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null check (expires_at = starts_at + interval '720 hours'),
  created_at timestamptz not null default pg_catalog.now()
);
create table public.kling4_promo_user_days (
  user_id uuid not null,
  request_day date not null,
  uses integer not null default 0 check (uses between 0 and 3),
  primary key(user_id, request_day)
);
create table public.kling4_promo_uses (
  user_id uuid not null,
  job_id text not null check (length(btrim(job_id)) between 1 and 200),
  reservation_id uuid not null unique,
  kind text not null check (kind in ('film','ad')),
  seconds integer not null check (seconds between 1 and 60),
  request_day date not null,
  plan text not null,
  provider text not null check (provider in ('stripe','paypal','dodo')),
  subscription_id text not null,
  subscription_started_at timestamptz not null,
  expires_at timestamptz not null,
  is_free boolean not null,
  reason text not null check (reason in ('ok','daily_limit','daily_cap')),
  estimated_milliusd integer not null check (estimated_milliusd between 157 and 19420),
  reserved_milliusd integer not null check (reserved_milliusd between 0 and 19420),
  remaining integer not null check (remaining between 0 and 3),
  reserved_at timestamptz not null default pg_catalog.now(),
  submitted_at timestamptz,
  primary key(user_id,job_id),
  check ((is_free and reason='ok' and reserved_milliusd=estimated_milliusd)
    or (not is_free and reason<>'ok' and reserved_milliusd=0))
);
-- No account/generation foreign-key cascades: deletion never resets a budget or promotion window.
alter table public.kling4_promo_days enable row level security;
alter table public.kling4_promo_enrollments enable row level security;
alter table public.kling4_promo_user_days enable row level security;
alter table public.kling4_promo_uses enable row level security;
revoke all on public.kling4_promo_days, public.kling4_promo_enrollments,
  public.kling4_promo_user_days, public.kling4_promo_uses from public,anon,authenticated,service_role;
grant select,insert,update on public.kling4_promo_days, public.kling4_promo_enrollments,
  public.kling4_promo_user_days, public.kling4_promo_uses to service_role;

create function public.reserve_kling4_promo(
  p_user_id uuid, p_job_id text, p_kind text, p_seconds integer, p_fal_extras_milliusd integer,
  p_plan text, p_provider text, p_subscription_id text, p_started_at timestamptz,
  p_paid_through timestamptz, p_verified_at timestamptz, p_launch_at timestamptz,
  p_paid_live boolean, p_promo_live boolean
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_day date := (v_now at time zone 'UTC')::date;
  v_profile jsonb;
  v_existing public.kling4_promo_uses%rowtype;
  v_enrollment public.kling4_promo_enrollments%rowtype;
  v_spent integer;
  v_uses integer;
  v_cost integer;
  v_id uuid;
  v_reason text := 'ok';
  v_free boolean;
begin
  if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200
    or p_kind is null or p_kind not in ('film','ad') or p_seconds is null or p_seconds not between 1 and 60
    or p_fal_extras_milliusd is null or p_fal_extras_milliusd not between 0 and 10000 then
    return jsonb_build_object('reason','invalid_request','is_free',false,'duplicate',false);
  end if;
  v_cost := p_seconds * 157 + p_fal_extras_milliusd;
  -- Shared order for every film/ad: identity -> person -> person/day -> GLOBAL UTC day.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-promo-use:' || p_user_id::text || ':' || p_job_id,0));
  select * into v_existing from public.kling4_promo_uses where user_id=p_user_id and job_id=p_job_id;
  if found then
    if v_existing.kind<>p_kind or v_existing.seconds<>p_seconds or v_existing.estimated_milliusd<>v_cost then
      return jsonb_build_object('reason','identity_conflict','is_free',false,'duplicate',true);
    end if;
    return jsonb_build_object('reason',v_existing.reason,'is_free',v_existing.is_free,'duplicate',true,
      'reservation_id',v_existing.reservation_id,'reserved_milliusd',v_existing.reserved_milliusd,
      'expires_at',v_existing.expires_at,'remaining',v_existing.remaining);
  end if;
  if p_paid_live is distinct from true then return jsonb_build_object('reason','paid_off','is_free',false,'duplicate',false); end if;
  if p_promo_live is distinct from true then return jsonb_build_object('reason','promo_off','is_free',false,'duplicate',false); end if;
  if p_launch_at is null or p_launch_at >= '2026-12-01T00:00:00Z'::timestamptz then
    return jsonb_build_object('reason','launch_unconfigured','is_free',false,'duplicate',false); end if;
  if p_launch_at>v_now then return jsonb_build_object('reason','not_launched','is_free',false,'duplicate',false); end if;
  if p_plan is null or p_plan not in ('starter','basic','creator','pro','studio','business','autopilot','autopilot_lite')
    or p_provider is null or p_provider not in ('stripe','paypal','dodo')
    or p_subscription_id is null or length(p_subscription_id) not between 3 and 200
    or p_started_at is null or p_started_at>v_now or p_paid_through is null or p_paid_through<=v_now
    or p_verified_at is null or p_verified_at>v_now+interval '5 seconds' or p_verified_at<v_now-interval '60 seconds' then
    return jsonb_build_object('reason','subscription_unverified','is_free',false,'duplicate',false);
  end if;
  -- Provider was checked server-side immediately before this RPC. Re-check its current profile link.
  select to_jsonb(p) into v_profile from public.profiles p where p.id=p_user_id for share;
  if v_profile is null or (v_profile->>'plan') is distinct from p_plan
    or (v_profile->>(p_provider || '_subscription_id')) is distinct from p_subscription_id then
    return jsonb_build_object('reason','subscription_unverified','is_free',false,'duplicate',false);
  end if;
  if p_started_at >= '2026-12-01T00:00:00Z'::timestamptz then
    return jsonb_build_object('reason','signup_closed','is_free',false,'duplicate',false); end if;
  -- One enrollment per PERSON. Plan changes, a renewed invoice or a new subscription cannot restart it.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-promo-person:' || p_user_id::text,0));
  insert into public.kling4_promo_enrollments(user_id,subscription_started_at,launch_at,starts_at,expires_at)
    values(p_user_id,p_started_at,p_launch_at,greatest(p_started_at,p_launch_at),greatest(p_started_at,p_launch_at)+interval '720 hours')
    on conflict(user_id) do nothing;
  select * into v_enrollment from public.kling4_promo_enrollments where user_id=p_user_id for update;
  if v_now>=v_enrollment.expires_at then return jsonb_build_object('reason','expired','is_free',false,'duplicate',false,
    'expires_at',v_enrollment.expires_at); end if;
  insert into public.kling4_promo_user_days(user_id,request_day) values(p_user_id,v_day) on conflict do nothing;
  select uses into v_uses from public.kling4_promo_user_days where user_id=p_user_id and request_day=v_day for update;
  insert into public.kling4_promo_days(request_day) values(v_day) on conflict do nothing;
  select reserved_milliusd into v_spent from public.kling4_promo_days where request_day=v_day for update;
  if v_uses>=3 then v_reason:='daily_limit';
  elsif v_spent+v_cost>100000 then v_reason:='daily_cap'; end if;
  v_free := v_reason='ok';
  v_id := md5('kling4-promo:' || p_user_id::text || ':' || p_job_id)::uuid;
  if v_free then
    update public.kling4_promo_user_days set uses=uses+1 where user_id=p_user_id and request_day=v_day;
    update public.kling4_promo_days set reserved_milliusd=reserved_milliusd+v_cost where request_day=v_day;
    v_uses:=v_uses+1;
  end if;
  insert into public.kling4_promo_uses(user_id,job_id,reservation_id,kind,seconds,request_day,plan,provider,
    subscription_id,subscription_started_at,expires_at,is_free,reason,estimated_milliusd,reserved_milliusd,remaining)
    values(p_user_id,p_job_id,v_id,p_kind,p_seconds,v_day,p_plan,p_provider,p_subscription_id,p_started_at,
      v_enrollment.expires_at,v_free,v_reason,v_cost,case when v_free then v_cost else 0 end,3-v_uses);
  insert into public.events(id,name,user_id,path,metadata) values(
    md5('kling4_promo_use_reserved:' || v_id::text)::uuid,'kling4_promo_use_reserved',p_user_id,
    case when p_kind='film' then '/api/generate-video-cinematic' else '/api/ads/escolha' end,
    jsonb_build_object('version','kling4-paid-2810','generation_id',p_job_id,'reservation_id',v_id,
      'kind',p_kind,'plan',p_plan,'seconds',p_seconds,'cost_usd',v_cost::numeric/1000,
      'cost_basis','reserved_upper_bound','billing_mode',case when v_free then 'promo' else 'credits' end,
      'promo_reserved_usd',case when v_free then v_cost::numeric/1000 else 0 end,'reason',v_reason,
      'subscription_started_at',p_started_at,'promo_expires_at',v_enrollment.expires_at))
    on conflict(id) do nothing;
  return jsonb_build_object('reason',v_reason,'is_free',v_free,'duplicate',false,'reservation_id',v_id,
    'reserved_milliusd',case when v_free then v_cost else 0 end,'expires_at',v_enrollment.expires_at,'remaining',3-v_uses);
end;
$$;

create function public.record_kling4_paid_use(p_user_id uuid,p_job_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_use public.kling4_promo_uses%rowtype;
begin
  select * into v_use from public.kling4_promo_uses where user_id=p_user_id and job_id=p_job_id for update;
  if not found then return jsonb_build_object('code','unavailable'); end if;
  if v_use.submitted_at is not null then return jsonb_build_object('code','unchanged'); end if;
  insert into public.events(id,name,user_id,path,metadata) values(
    md5('kling4_paid_engine_used:' || v_use.reservation_id::text)::uuid,'kling4_paid_engine_used',p_user_id,
    case when v_use.kind='film' then '/api/generate-video-cinematic' else '/api/ads/escolha' end,
    jsonb_build_object('version','kling4-paid-2810','generation_id',p_job_id,'kind',v_use.kind,
      'reservation_id',v_use.reservation_id,'plan',v_use.plan,'seconds',v_use.seconds,'engine_used','kling4',
      'cost_usd',v_use.estimated_milliusd::numeric/1000,'cost_basis','reserved_upper_bound',
      'billing_mode',case when v_use.is_free then 'promo' else 'credits' end,
      'subscription_started_at',v_use.subscription_started_at,'promo_expires_at',v_use.expires_at))
    on conflict(id) do nothing;
  update public.kling4_promo_uses set submitted_at=pg_catalog.now() where user_id=p_user_id and job_id=p_job_id;
  return jsonb_build_object('code','ok');
end;
$$;
revoke all on function public.reserve_kling4_promo(uuid,text,text,integer,integer,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,boolean,boolean),
  public.record_kling4_paid_use(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_kling4_promo(uuid,text,text,integer,integer,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,boolean,boolean),
  public.record_kling4_paid_use(uuid,text) to service_role;
commit;
