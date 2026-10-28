-- KINEO-ADS-SIMPLES-2810 — teto do dia da amostra grátis do anúncio: US$ 10 → US$ 25 (fundador 28/10; antes pediu 15, depois 25).
-- PREPARADA, NÃO APLICADA. Só muda o número do teto: a estimativa por amostra segue 150 c, a trava por pessoa, o dia UTC,
-- o evento e a ordem dos locks são os da função de 20261024175246_ads_escolha_sample.sql (copiada linha a linha).
-- Nunca reaplicar a migration de 24/10; esta substitui a função (CREATE OR REPLACE) e afrouxa o CHECK do livro do dia.
begin;
alter table public.ads_escolha_sample_days drop constraint if exists ads_escolha_sample_days_reserved_cents_check;
alter table public.ads_escolha_sample_days add constraint ads_escolha_sample_days_reserved_cents_check check (reserved_cents between 0 and 2500);

create or replace function public.reserve_ads_escolha_sample(p_order_id uuid, p_actor_id uuid, p_owner_id uuid, p_lease_at timestamptz, p_is_internal boolean)
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
  -- KINEO-ADS-SIMPLES-2810 — o teto do dia: 2500 c (era 1000). A estimativa por amostra segue 150 c.
  if v_cents + 150 > 2500 then
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
commit;
