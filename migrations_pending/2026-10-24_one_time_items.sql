-- KINEO-COMPRA-AVULSA-2410 — PROPOSTA, NÃO APLICADA em produção.
-- Autorização de código: [TRAVA 8.2 — vai do fundador 24/10 "vamos fazer do 2 ao 5"].
-- A CLI Supabase não está disponível nesta máquina: arquivo pendente nominal, sem conexão ao banco.
-- Aplicar explicitamente antes de habilitar a venda; o checkout deve falhar fechado sem este RPC/tabela.
-- CONTRATO V1 CONGELADO: anúncio Studio Ads Escolha commercial/15 s = 41 cr, USD 900 / BRL 4490;
-- filme Seedance 1.5/35 s = 21 cr, USD 500 / BRL 2490. Snapshot de lib/ads/v2Tiers.ts,
-- lib/credits/engineCost.ts e settlementAmountMinor na base 7950e411, consultada em 24/10/2026.
-- Alteração futura de motor/preço exige NOVA versão explícita: não reprecificar sessão já aberta.
-- Recibo, soma de saldo, acesso, carimbo e evento são UMA transação. Não existe recibo sem concessão.
-- O webhook verifica a assinatura Stripe E payment_status='paid' antes de chamar (este RPC não faz rede).

begin;

create table if not exists public.one_time_item_purchases (
  stripe_session_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sku text not null check (sku in ('one_time_ad', 'one_time_film35')),
  credits integer not null check (credits > 0),
  amount_total integer not null check (amount_total > 0),
  currency text not null check (currency in ('usd', 'brl')),
  browser_session_id text,
  surface text,
  order_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists one_time_item_purchases_user_created_idx
  on public.one_time_item_purchases (user_id, created_at desc);

alter table public.one_time_item_purchases enable row level security;
revoke all on public.one_time_item_purchases from public, anon, authenticated;
revoke all on public.one_time_item_purchases from service_role;
grant select on public.one_time_item_purchases to service_role;

create or replace function public.fulfill_one_time_item(
  p_session_id text,
  p_user_id uuid,
  p_sku text,
  p_credits integer,
  p_amount_total integer,
  p_currency text,
  p_browser_session_id text default null,
  p_surface text default null,
  p_order_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_inserted integer;
  v_existing public.one_time_item_purchases%rowtype;
begin
  if p_session_id is null or p_session_id !~ '^cs_[A-Za-z0-9_]{1,240}$' or p_user_id is null then
    raise exception 'one_time_item: invalid purchase identity';
  end if;
  if p_browser_session_id is not null and char_length(p_browser_session_id) > 64
     or p_surface is not null and char_length(p_surface) > 64 then
    raise exception 'one_time_item: invalid attribution';
  end if;
  if p_sku is null or p_credits is null or p_amount_total is null or p_currency is null
     or not (
       (p_sku = 'one_time_ad' and p_credits = 41
         and ((p_currency = 'usd' and p_amount_total = 900) or (p_currency = 'brl' and p_amount_total = 4490)))
       or (p_sku = 'one_time_film35' and p_credits = 21
         and ((p_currency = 'usd' and p_amount_total = 500) or (p_currency = 'brl' and p_amount_total = 2490)))
     ) then
    raise exception 'one_time_item: contract v1 mismatch';
  end if;

  insert into public.one_time_item_purchases (
    stripe_session_id, user_id, sku, credits, amount_total, currency, browser_session_id, surface, order_id
  ) values (
    p_session_id, p_user_id, p_sku, p_credits, p_amount_total, p_currency, p_browser_session_id, p_surface, p_order_id
  ) on conflict (stripe_session_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select * into strict v_existing from public.one_time_item_purchases where stripe_session_id = p_session_id;
    if v_existing.user_id is distinct from p_user_id
       or v_existing.sku is distinct from p_sku
       or v_existing.credits is distinct from p_credits
       or v_existing.amount_total is distinct from p_amount_total
       or v_existing.currency is distinct from p_currency
       or v_existing.browser_session_id is distinct from p_browser_session_id
       or v_existing.surface is distinct from p_surface
       or v_existing.order_id is distinct from p_order_id then
      raise exception 'one_time_item: session receipt mismatch';
    end if;
    return false;
  end if;

  -- O recibo bloqueia concorrentes da MESMA sessão. A soma no próprio UPDATE bloqueia a linha do perfil e
  -- preserva outras compras/débitos concorrentes (não há SELECT saldo → SET saldo calculado no cliente).
  update public.profiles
     set video_credits = coalesce(video_credits, 0) + p_credits,
         has_paid = true,
         ads_access_until = case when p_sku = 'one_time_ad'
           then greatest(coalesce(ads_access_until, '-infinity'::timestamptz), now() + interval '365 days')
           else ads_access_until end
   where id = p_user_id;
  if not found then
    raise exception 'one_time_item: profile missing';
  end if;

  -- Receipt sem carimbo não existe; carimbo legado sem receipt é ambíguo, então falha fechado e desfaz a soma.
  insert into public.stripe_events (id) values ('checkout_fulfilled:' || p_session_id);

  -- Evento autoritativo na MESMA transação; falha de analytics aqui reverte recibo, saldo, acesso e carimbo.
  insert into public.events (name, user_id, session_id, path, metadata)
  values (
    'one_time_item_purchased', p_user_id, p_browser_session_id, '/api/stripe/webhook',
    jsonb_build_object(
      'sku', p_sku, 'credits', p_credits, 'mode', 'payment', 'stripe_session_id', p_session_id,
      'amount_total', p_amount_total, 'currency', p_currency,
      'surface', p_surface, 'order_id', p_order_id, 'contract_version', 'one_time_item_v1_2026-10-24'
    )
  );
  return true;
end;
$function$;

revoke all on function public.fulfill_one_time_item(text, uuid, text, integer, integer, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.fulfill_one_time_item(text, uuid, text, integer, integer, text, text, text, uuid)
  to service_role;

commit;
