-- KINEO-AMOSTRA-ANUNCIO-2410. Prepared only; never reapply the registered photo-quota migration.
-- An irrevocable personal claim reserves the entire estimated cost BEFORE either preview is submitted.
-- No foreign keys/cascades: deleting a user, order or video cannot buy another free sample or refund our spend.
begin;
create table public.ads_escolha_sample_days (
  request_day date primary key,
  reserved_cents integer not null default 0 check (reserved_cents between 0 and 1000),
  samples integer not null default 0 check (samples >= 0)
);
create table public.ads_escolha_samples (
  actor_id uuid primary key,
  owner_id uuid not null check (owner_id = actor_id),
  order_id uuid not null unique,
  reserved_at timestamptz not null default now(),
  request_day date not null,
  estimate_cents integer not null check (estimate_cents = 150),
  is_internal boolean not null,
  delivered_at timestamptz,
  upsell_clicked_at timestamptz,
  purchased_at timestamptz,
  stripe_session_id text
);
create index ads_escolha_samples_mature on public.ads_escolha_samples(delivered_at, actor_id)
  where is_internal = false and delivered_at is not null;
create table public.ads_escolha_sample_alerts (
  alert_key text primary key,
  actor_ids uuid[] not null,
  first_delivered_at timestamptz not null,
  last_delivered_at timestamptz not null,
  measured_at timestamptz not null default now(),
  claimed_at timestamptz,
  claim_token uuid,
  sent_at timestamptz
);
alter table public.ads_escolha_sample_days enable row level security;
alter table public.ads_escolha_samples enable row level security;
alter table public.ads_escolha_sample_alerts enable row level security;
revoke all on public.ads_escolha_sample_days, public.ads_escolha_samples, public.ads_escolha_sample_alerts from public, anon, authenticated, service_role;
-- UPDATE is needed only for lifecycle fields and alert leases. Default ACLs are reset; DELETE and TRUNCATE are not granted.
grant select, insert, update on public.ads_escolha_sample_days, public.ads_escolha_samples, public.ads_escolha_sample_alerts to service_role;

create function public.reserve_ads_escolha_sample(p_order_id uuid, p_actor_id uuid, p_owner_id uuid, p_lease_at timestamptz, p_is_internal boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.ads_v2_orders%rowtype;
  v_claim public.ads_escolha_samples%rowtype;
  v_day date := (now() at time zone 'UTC')::date;
  v_cents integer;
begin
  if p_actor_id is null or p_owner_id is distinct from p_actor_id or p_lease_at is null or p_is_internal is null then
    return jsonb_build_object('code', 'ads_sample_unavailable');
  end if;
  -- Consistent lock order: one actor, then the shared UTC-day row. No network while the transaction holds locks.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ads-escolha-sample:' || p_actor_id::text, 0));
  select * into v_order from public.ads_v2_orders where id = p_order_id and user_id = p_owner_id for update;
  if not found or v_order.status <> 'planned' or v_order.assembly_lease_at is distinct from p_lease_at
    or v_order.plan #>> '{cena,plan,escolha,sample}' is distinct from 'KINEO-AMOSTRA-ANUNCIO-2410' then
    return jsonb_build_object('code', 'ads_sample_unavailable');
  end if;
  select * into v_claim from public.ads_escolha_samples where actor_id = p_actor_id;
  if found then
    if v_claim.order_id = p_order_id and v_claim.owner_id = p_owner_id then
      return jsonb_build_object('code', 'ok', 'replay', true, 'estimate_cents', v_claim.estimate_cents);
    end if;
    return jsonb_build_object('code', 'ads_sample_used');
  end if;
  insert into public.ads_escolha_sample_days(request_day) values(v_day) on conflict (request_day) do nothing;
  select reserved_cents into v_cents from public.ads_escolha_sample_days where request_day = v_day for update;
  if v_cents + 150 > 1000 then
    return jsonb_build_object('code', 'ads_sample_cap', 'reset_at', ((v_day + 1)::timestamp at time zone 'UTC'));
  end if;
  insert into public.ads_escolha_samples(actor_id, owner_id, order_id, request_day, estimate_cents, is_internal)
    values(p_actor_id, p_owner_id, p_order_id, v_day, 150, p_is_internal);
  update public.ads_escolha_sample_days set reserved_cents = reserved_cents + 150, samples = samples + 1 where request_day = v_day;
  if not p_is_internal then
    insert into public.events(id, name, user_id, path, metadata)
      values(md5('ads_sample_started:' || p_actor_id::text)::uuid, 'ads_sample_started', p_actor_id, '/ads/v2',
        jsonb_build_object('sample_version', 'KINEO-AMOSTRA-ANUNCIO-2410', 'order_id', p_order_id, 'estimate_cents', 150, 'seconds', 8, 'photos', 2, 'credits', 0)) on conflict (id) do nothing;
  end if;
  return jsonb_build_object('code', 'ok', 'replay', false, 'estimate_cents', 150);
end;
$$;

-- Delivery and its event commit together, even when the render lambda dies immediately after the order update.
create function public.mark_ads_escolha_sample_delivered(p_order_id uuid, p_actor_id uuid, p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_claim public.ads_escolha_samples%rowtype;
begin
  if p_actor_id is null or p_owner_id is distinct from p_actor_id then return jsonb_build_object('code', 'ads_sample_unavailable'); end if;
  if not exists(select 1 from public.ads_v2_orders where id = p_order_id and user_id = p_owner_id and status = 'delivered'
      and video_id is not null and credits_charged = 0 and billing_ref like 'adssample-escolha-%'
      and plan #>> '{cena,plan,escolha,sample}' = 'KINEO-AMOSTRA-ANUNCIO-2410') then return jsonb_build_object('code', 'ads_sample_unavailable'); end if;
  update public.ads_escolha_samples set delivered_at = now()
    where order_id = p_order_id and actor_id = p_actor_id and owner_id = p_owner_id and delivered_at is null returning * into v_claim;
  if not found then return jsonb_build_object('code', 'unchanged'); end if;
  if not v_claim.is_internal then
    insert into public.events(id, name, user_id, path, metadata)
      values(md5('ads_sample_delivered:' || p_actor_id::text)::uuid, 'ads_sample_delivered', p_actor_id, '/ads/v2',
        jsonb_build_object('sample_version', 'KINEO-AMOSTRA-ANUNCIO-2410', 'order_id', p_order_id, 'seconds', 8, 'watermark', true)) on conflict (id) do nothing;
  end if;
  return jsonb_build_object('code', 'ok');
end;
$$;
create function public.ads_escolha_sample_delivery_trigger()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'delivered' and old.status is distinct from new.status
      and new.plan #>> '{cena,plan,escolha,sample}' = 'KINEO-AMOSTRA-ANUNCIO-2410' then
    perform public.mark_ads_escolha_sample_delivered(new.id, new.user_id, new.user_id);
  end if;
  return new;
end;
$$;
create trigger ads_escolha_sample_delivery after update of status on public.ads_v2_orders
  for each row execute function public.ads_escolha_sample_delivery_trigger();

create function public.mark_ads_escolha_sample_upsell(p_order_id uuid, p_actor_id uuid, p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_claim public.ads_escolha_samples%rowtype;
begin
  if p_actor_id is null or p_owner_id is distinct from p_actor_id then return jsonb_build_object('code', 'ads_sample_unavailable'); end if;
  update public.ads_escolha_samples set upsell_clicked_at = now()
    where order_id = p_order_id and actor_id = p_actor_id and owner_id = p_owner_id and delivered_at is not null
      and upsell_clicked_at is null returning * into v_claim;
  if not found then return jsonb_build_object('code', 'unchanged'); end if;
  if not v_claim.is_internal then
    insert into public.events(id, name, user_id, path, metadata)
      values(md5('ads_sample_upsell_clicked:' || p_actor_id::text)::uuid, 'ads_sample_upsell_clicked', p_actor_id, '/ads/v2',
        jsonb_build_object('sample_version', 'KINEO-AMOSTRA-ANUNCIO-2410', 'order_id', p_order_id)) on conflict (id) do nothing;
  end if;
  return jsonb_build_object('code', 'ok');
end;
$$;

-- Only a real, signed Stripe webhook writes this canonical payment row. Test-mode and zero-dollar trials do not convert.
-- The timestamp is the signed Stripe event time, not the time a delayed webhook happens to reach our lambda.
create function public.record_ads_escolha_sample_purchase(p_event_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_paid_at timestamptz; v_claim public.ads_escolha_samples%rowtype; v_event public.events%rowtype;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.name <> 'payment_success' or v_event.user_id is null or v_event.metadata->>'source' is distinct from 'stripe_webhook'
    or v_event.metadata->>'stripe_livemode' is distinct from 'true' or v_event.metadata->>'stripe_payment_status' is distinct from 'paid'
    or coalesce(v_event.metadata->>'amount_total', '') !~ '^[0-9]+$' then return false; end if;
  if (v_event.metadata->>'amount_total')::numeric <= 0 or nullif(v_event.metadata->>'stripe_session_id', '') is null then return false; end if;
  begin v_paid_at := (v_event.metadata->>'stripe_paid_at')::timestamptz; exception when others then return false; end;
  update public.ads_escolha_samples set purchased_at = v_paid_at, stripe_session_id = v_event.metadata->>'stripe_session_id'
    where actor_id = v_event.user_id and is_internal = false and purchased_at is null and delivered_at is not null
      and v_paid_at >= delivered_at and v_paid_at <= delivered_at + interval '7 days' returning * into v_claim;
  if not found then return false; end if;
  insert into public.events(id, name, user_id, path, metadata)
    values(md5('ads_sample_purchased_7d:' || v_event.user_id::text)::uuid, 'ads_sample_purchased_7d', v_event.user_id, '/api/stripe/webhook',
      jsonb_build_object('sample_version', 'KINEO-AMOSTRA-ANUNCIO-2410', 'order_id', v_claim.order_id,
        'stripe_session_id', v_claim.stripe_session_id, 'paid_at', v_paid_at, 'amount_total', v_event.metadata->'amount_total', 'currency', v_event.metadata->>'currency')) on conflict (id) do nothing;
  return true;
end;
$$;
create function public.ads_escolha_sample_purchase_trigger()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform public.record_ads_escolha_sample_purchase(new.id);
  return new;
end;
$$;
create trigger ads_escolha_sample_purchase after insert on public.events for each row
  when (new.name = 'payment_success') execute function public.ads_escolha_sample_purchase_trigger();

-- Repairs a payment/delivery race or a late signed webhook before making the stopping decision.
create function public.reconcile_ads_escolha_sample_purchases()
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_count integer := 0;
begin
  for v_id in select e.id from public.events e join public.ads_escolha_samples s on e.user_id = s.actor_id
      where e.name = 'payment_success' and s.is_internal = false and s.delivered_at is not null and s.purchased_at is null
        and e.metadata->>'source' = 'stripe_webhook' and e.metadata->>'stripe_livemode' = 'true' loop
    if public.record_ads_escolha_sample_purchase(v_id) then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

-- First 50 EXTERNAL delivered people, each with a complete seven-day observation window; one lifetime alert.
create function public.claim_ads_escolha_sample_alert(p_claim_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_alert public.ads_escolha_sample_alerts%rowtype; v_ids uuid[]; v_first timestamptz; v_last timestamptz;
begin
  if p_claim_token is null then return jsonb_build_object('code', 'unavailable'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ads-escolha-sample-alert', 0));
  select * into v_alert from public.ads_escolha_sample_alerts where alert_key = '50-without-purchase-7d-v1' for update;
  if not found then
    select array_agg(actor_id order by delivered_at, actor_id), min(delivered_at), max(delivered_at) into v_ids, v_first, v_last
      from (select actor_id, delivered_at from public.ads_escolha_samples where is_internal = false
        and delivered_at <= now() - interval '7 days' order by delivered_at, actor_id limit 50) cohort;
    if coalesce(cardinality(v_ids), 0) < 50 then return jsonb_build_object('code', 'not_ready'); end if;
    if exists(select 1 from public.ads_escolha_samples where actor_id = any(v_ids) and purchased_at is not null) then return jsonb_build_object('code', 'converted'); end if;
    insert into public.ads_escolha_sample_alerts(alert_key, actor_ids, first_delivered_at, last_delivered_at)
      values('50-without-purchase-7d-v1', v_ids, v_first, v_last) returning * into v_alert;
  end if;
  if v_alert.sent_at is not null then return jsonb_build_object('code', 'sent'); end if;
  -- A late signed webhook can arrive after the first measurement. Cancel unsent alerts once it proves conversion.
  if exists(select 1 from public.ads_escolha_samples where actor_id = any(v_alert.actor_ids) and purchased_at is not null) then return jsonb_build_object('code', 'converted'); end if;
  if v_alert.claimed_at > now() - interval '5 minutes' then return jsonb_build_object('code', 'busy'); end if;
  update public.ads_escolha_sample_alerts set claimed_at = now(), claim_token = p_claim_token where alert_key = v_alert.alert_key;
  return jsonb_build_object('code', 'ok', 'claim_token', p_claim_token, 'people', cardinality(v_alert.actor_ids),
    'first_delivered_at', v_alert.first_delivered_at, 'last_delivered_at', v_alert.last_delivered_at, 'measured_at', v_alert.measured_at);
end;
$$;
create function public.finish_ads_escolha_sample_alert(p_claim_token uuid, p_sent boolean)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.ads_escolha_sample_alerts set sent_at = case when p_sent then now() else null end,
    claimed_at = case when p_sent then claimed_at else null end, claim_token = null
    where alert_key = '50-without-purchase-7d-v1' and claim_token = p_claim_token and sent_at is null;
  return found;
end;
$$;

revoke all on function public.reserve_ads_escolha_sample(uuid,uuid,uuid,timestamptz,boolean),
  public.mark_ads_escolha_sample_delivered(uuid,uuid,uuid), public.mark_ads_escolha_sample_upsell(uuid,uuid,uuid),
  public.record_ads_escolha_sample_purchase(uuid), public.reconcile_ads_escolha_sample_purchases(),
  public.ads_escolha_sample_delivery_trigger(), public.ads_escolha_sample_purchase_trigger(),
  public.claim_ads_escolha_sample_alert(uuid), public.finish_ads_escolha_sample_alert(uuid,boolean) from public, anon, authenticated;
grant execute on function public.reserve_ads_escolha_sample(uuid,uuid,uuid,timestamptz,boolean),
  public.mark_ads_escolha_sample_delivered(uuid,uuid,uuid), public.mark_ads_escolha_sample_upsell(uuid,uuid,uuid),
  public.record_ads_escolha_sample_purchase(uuid), public.reconcile_ads_escolha_sample_purchases(),
  public.ads_escolha_sample_delivery_trigger(), public.ads_escolha_sample_purchase_trigger(),
  public.claim_ads_escolha_sample_alert(uuid), public.finish_ads_escolha_sample_alert(uuid,boolean) to service_role;
commit;
