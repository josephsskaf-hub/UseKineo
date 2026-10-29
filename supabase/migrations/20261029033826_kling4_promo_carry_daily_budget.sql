-- Strict UTC-day fal ceiling for accepted free promotion jobs continued on later days.
-- Re-hold the ORIGINAL full upper bound in every UTC day with new fal work. Never refund old days.
-- No new person/day use is counted: this is continuation of the same accepted film/ad, not a new entitlement.
begin;
create table public.kling4_promo_carry_days (
  user_id uuid not null,
  job_id text not null check (length(btrim(job_id)) between 1 and 200),
  request_day date not null,
  source_request_day date not null,
  reserved_milliusd integer not null check (reserved_milliusd between 157 and 19420),
  cost_basis text not null default 'reserved_upper_bound' check (cost_basis='reserved_upper_bound'),
  reserved_at timestamptz not null default pg_catalog.now(),
  primary key(user_id,job_id,request_day),
  check(source_request_day<request_day)
);
-- No account/generation cascades and no client-access policies. History cannot replenish an allowance.
alter table public.kling4_promo_carry_days enable row level security;
revoke all on public.kling4_promo_carry_days from public,anon,authenticated,service_role;
grant select,insert on public.kling4_promo_carry_days to service_role;

create function public.ensure_kling4_promo_budget_today(p_user_id uuid,p_job_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_day date := (pg_catalog.now() at time zone 'UTC')::date;
  v_source public.kling4_promo_uses%rowtype;
  v_carried public.kling4_promo_carry_days%rowtype;
  v_spent integer;
begin
  if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200 then
    return jsonb_build_object('allowed',false,'reason','invalid'); end if;
  select * into v_source from public.kling4_promo_uses where user_id=p_user_id and job_id=p_job_id for share;
  if not found or v_source.is_free is distinct from true or v_source.reason<>'ok'
    or v_source.reserved_milliusd is distinct from v_source.estimated_milliusd
    or v_source.reserved_milliusd not between 157 and 19420 or v_source.request_day>v_day then
    return jsonb_build_object('allowed',false,'reason','unverified'); end if;
  if v_source.request_day=v_day then
    return jsonb_build_object('allowed',true,'reason','current_day','reserved_milliusd',v_source.reserved_milliusd); end if;
  -- Original source is immutable. Lock continuation identity, then the SAME global UTC-day row as fresh admissions.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'kling4-promo-carry:' || p_user_id::text || ':' || p_job_id || ':' || v_day::text,0));
  select * into v_carried from public.kling4_promo_carry_days
    where user_id=p_user_id and job_id=p_job_id and request_day=v_day;
  if found then
    if v_carried.source_request_day<>v_source.request_day or v_carried.reserved_milliusd<>v_source.reserved_milliusd then
      return jsonb_build_object('allowed',false,'reason','unverified'); end if;
    return jsonb_build_object('allowed',true,'reason','duplicate','reserved_milliusd',v_carried.reserved_milliusd);
  end if;
  insert into public.kling4_promo_days(request_day) values(v_day) on conflict(request_day) do nothing;
  select reserved_milliusd into v_spent from public.kling4_promo_days where request_day=v_day for update;
  if v_spent+v_source.reserved_milliusd>100000 then
    return jsonb_build_object('allowed',false,'reason','daily_cap'); end if;
  insert into public.kling4_promo_carry_days(user_id,job_id,request_day,source_request_day,reserved_milliusd)
    values(p_user_id,p_job_id,v_day,v_source.request_day,v_source.reserved_milliusd);
  update public.kling4_promo_days set reserved_milliusd=reserved_milliusd+v_source.reserved_milliusd where request_day=v_day;
  insert into public.events(id,name,user_id,path,metadata) values(
    md5('kling4_promo_carry_reserved:' || p_user_id::text || ':' || p_job_id || ':' || v_day::text)::uuid,
    'kling4_promo_carry_reserved',p_user_id,'/lib/kling4PromoCarry',jsonb_build_object(
      'version','kling4-paid-2810','generation_id',p_job_id,'reservation_id',v_source.reservation_id,
      'kind',v_source.kind,'plan',v_source.plan,'seconds',v_source.seconds,
      'request_day',v_day,'source_request_day',v_source.request_day,
      'cost_usd',v_source.reserved_milliusd::numeric/1000,'cost_basis','reserved_upper_bound',
      'continuation',true,'new_entitlement_use',false)) on conflict(id) do nothing;
  return jsonb_build_object('allowed',true,'reason','reserved','reserved_milliusd',v_source.reserved_milliusd);
end;
$$;
revoke all on function public.ensure_kling4_promo_budget_today(uuid,text) from public,anon,authenticated;
grant execute on function public.ensure_kling4_promo_budget_today(uuid,text) to service_role;
commit;
