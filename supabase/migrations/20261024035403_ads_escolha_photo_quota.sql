-- KINEO-ADS-ESCOLHA-PUBLICO-2410. Prepared only: apply before releasing photo generation.
-- Service-only spend ledger. No FK/cascade to orders: deleting a draft must not reset the day's allowance.
begin;
create table public.ads_escolha_photo_requests (
  order_id uuid not null,
  owner_id uuid not null,
  actor_id uuid not null,
  requested_at timestamptz not null default now(),
  request_day date not null default (now() at time zone 'UTC')::date,
  primary key (order_id, request_day)
);
create index ads_escolha_photo_actor_day on public.ads_escolha_photo_requests (actor_id, requested_at);
alter table public.ads_escolha_photo_requests enable row level security;
revoke all on public.ads_escolha_photo_requests from public, anon, authenticated;
grant select, insert, update on public.ads_escolha_photo_requests to service_role;

-- Delivery outbox is separate from photo allowance: drafts/failed photos cannot starve ready notices.
create table public.ads_escolha_ready_notices (
  order_id uuid primary key,
  delivered_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  closed_at timestamptz
);
alter table public.ads_escolha_ready_notices enable row level security;
revoke all on public.ads_escolha_ready_notices from public, anon, authenticated;
grant select, insert, update on public.ads_escolha_ready_notices to service_role;
create index ads_escolha_ready_pending on public.ads_escolha_ready_notices(claimed_at nulls first) where closed_at is null;

create function public.reserve_ads_escolha_photos(p_order_id uuid, p_owner_id uuid, p_actor_id uuid, p_lease_at timestamptz)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.ads_v2_orders%rowtype;
  v_day timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_count integer;
begin
  -- One transaction per authenticated person. No external calls while holding the lock.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ads-escolha:' || p_actor_id::text, 0));
  select * into v_order from public.ads_v2_orders where id = p_order_id and user_id = p_owner_id for update;
  if not found or v_order.status <> 'planned' or v_order.assembly_lease_at is distinct from p_lease_at
    or p_lease_at is null or p_actor_id is null
    or v_order.plan #>> '{escolhaFlow,marker}' is distinct from 'KINEO-ADS-ESCOLHA-2310' then
    return jsonb_build_object('code', 'cena_photo_quota_unavailable');
  end if;
  if exists(select 1 from public.ads_escolha_photo_requests where order_id = p_order_id and owner_id = p_owner_id and request_day = (v_day at time zone 'UTC')::date) then
    return jsonb_build_object('code', 'ok');
  end if;
  select count(*) into v_count from public.ads_escolha_photo_requests
    where actor_id = p_actor_id and requested_at >= v_day and requested_at < v_day + interval '1 day';
  if v_count >= 6 then
    return jsonb_build_object('code', 'cena_photo_daily_limit', 'reset_at', v_day + interval '1 day');
  end if;
  insert into public.ads_escolha_photo_requests(order_id, owner_id, actor_id) values(p_order_id, p_owner_id, p_actor_id);
  return jsonb_build_object('code', 'ok');
end;
$$;
revoke all on function public.reserve_ads_escolha_photos(uuid,uuid,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_ads_escolha_photos(uuid,uuid,uuid,timestamptz) to service_role;
commit;
