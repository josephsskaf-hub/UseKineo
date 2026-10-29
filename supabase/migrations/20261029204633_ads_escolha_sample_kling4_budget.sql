-- KINEO-AMOSTRA-ANUNCIO-K4-2910 — PREPARED, NOT APPLIED.
-- Apply before serving Kling4 samples. Never reapply or edit the 24/10 and 28/10 migrations.
-- fal.ai/models/kling/v4/image-to-video, checked 2026-10-29: 8 * $0.157 + 2 * $0.15 + $0.304 = $1.86.
-- Old samples use SILENT Kling3 ($0.112/s): keep their $1.50 estimate and lifetime claim untouched.
begin;
alter table public.ads_escolha_samples drop constraint if exists ads_escolha_samples_estimate_cents_check;
alter table public.ads_escolha_samples add constraint ads_escolha_samples_estimate_cents_check check (estimate_cents in (150, 186));

create or replace function public.reserve_ads_escolha_sample(p_order_id uuid, p_actor_id uuid, p_owner_id uuid, p_lease_at timestamptz, p_is_internal boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.ads_v2_orders%rowtype;
  v_claim public.ads_escolha_samples%rowtype;
  v_day date := (now() at time zone 'UTC')::date;
  v_cents integer;
  v_route text;
  v_estimate integer;
begin
  if p_actor_id is null or p_owner_id is distinct from p_actor_id or p_lease_at is null or p_is_internal is null then
    return jsonb_build_object('code', 'ads_sample_unavailable');
  end if;
  -- Same lock order: actor, order, UTC day. No network while the transaction holds locks.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ads-escolha-sample:' || p_actor_id::text, 0));
  select * into v_order from public.ads_v2_orders where id = p_order_id and user_id = p_owner_id for update;
  if not found or v_order.status <> 'planned' or v_order.assembly_lease_at is distinct from p_lease_at
    or v_order.plan #>> '{cena,plan,escolha,sample}' is distinct from 'KINEO-AMOSTRA-ANUNCIO-2410' then
    return jsonb_build_object('code', 'ads_sample_unavailable');
  end if;
  -- The order persisted by the server is authoritative. No new amount argument or client override.
  -- Pre-Kling4 legacy orders without a route retain the old cost; unknown explicit engines fail closed.
  v_route := coalesce(v_order.plan #>> '{cena,route}', 'kling3');
  v_estimate := case v_route when 'kling3' then 150 when 'kling4' then 186 else null end;
  if v_estimate is null then return jsonb_build_object('code', 'ads_sample_unavailable'); end if;
  select * into v_claim from public.ads_escolha_samples where actor_id = p_actor_id;
  if found then
    if v_claim.order_id = p_order_id and v_claim.owner_id = p_owner_id then
      if v_claim.estimate_cents <> v_estimate then return jsonb_build_object('code', 'ads_sample_unavailable'); end if;
      return jsonb_build_object('code', 'ok', 'replay', true, 'estimate_cents', v_claim.estimate_cents);
    end if;
    return jsonb_build_object('code', 'ads_sample_used');
  end if;
  insert into public.ads_escolha_sample_days(request_day) values(v_day) on conflict (request_day) do nothing;
  select reserved_cents into v_cents from public.ads_escolha_sample_days where request_day = v_day for update;
  if v_cents + v_estimate > 2500 then
    return jsonb_build_object('code', 'ads_sample_cap', 'reset_at', ((v_day + 1)::timestamp at time zone 'UTC'));
  end if;
  insert into public.ads_escolha_samples(actor_id, owner_id, order_id, request_day, estimate_cents, is_internal)
    values(p_actor_id, p_owner_id, p_order_id, v_day, v_estimate, p_is_internal);
  update public.ads_escolha_sample_days set reserved_cents = reserved_cents + v_estimate, samples = samples + 1 where request_day = v_day;
  if not p_is_internal then
    insert into public.events(id, name, user_id, path, metadata)
      values(md5('ads_sample_started:' || p_actor_id::text)::uuid, 'ads_sample_started', p_actor_id, '/ads/v2',
        jsonb_build_object('sample_version', 'KINEO-AMOSTRA-ANUNCIO-2410', 'order_id', p_order_id, 'estimate_cents', v_estimate, 'engine', v_route, 'seconds', 8, 'photos', 2, 'credits', 0)) on conflict (id) do nothing;
  end if;
  return jsonb_build_object('code', 'ok', 'replay', false, 'estimate_cents', v_estimate);
end;
$$;
-- CREATE OR REPLACE retains the existing ACL; reiterate the service-only boundary explicitly.
revoke all on function public.reserve_ads_escolha_sample(uuid, uuid, uuid, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.reserve_ads_escolha_sample(uuid, uuid, uuid, timestamptz, boolean) to service_role;
commit;
