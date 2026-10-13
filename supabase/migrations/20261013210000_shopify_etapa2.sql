-- KINEO-SHOPIFY-2026-10-13 (etapa 2) — conta da loja, crédito do ciclo da App Pricing e uso extra (US$ 7).
-- NÃO APLICADA. Aplicar só com o "vai" do fundador, DEPOIS de 20261013200000_shopify_shops.sql, junto com SHOPIFY_APP_LIVE=true.
--
-- · shopify_shops ganha o id da loja na Shopify (gid, para a Partner API e o App Events API), se é loja de DESENVOLVIMENTO (plano
--   pago sai a US$ 0 lá: sem crédito, salvo a lista SHOPIFY_TEST_SHOPS do fundador) e a última leitura do plano.
-- · shopify_credit_grants: o RECIBO de cada concessão (PK loja + ciclo). A função shopify_grant_credits grava o recibo E soma o
--   crédito na MESMA transação: o mesmo ciclo nunca soma duas vezes (reenvio, cron e tela juntos), e um recibo sem crédito não existe.
-- · shopify_usage_charges: cada anúncio extra cobrado pelo medidor `extra_ad`. Os tetos (dia/mês por loja) contam pending + sent.
-- · Só a chave de serviço: RLS ligado, NENHUMA policy, anon/authenticated sem privilégio; a função só executa como service_role.

alter table public.shopify_shops
  add column if not exists shop_gid text,
  add column if not exists partner_development boolean,
  add column if not exists plan_checked_at timestamptz;

create table if not exists public.shopify_credit_grants (
  shop_domain text not null,
  cycle_key text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  credits integer not null check (credits > 0 and credits <= 1000),
  reason text not null check (reason in ('plan_cycle', 'extra_ad')),
  plan_handle text,
  created_at timestamptz not null default now(),
  primary key (shop_domain, cycle_key)
);

create index if not exists shopify_credit_grants_user_idx on public.shopify_credit_grants (user_id, created_at desc);

create table if not exists public.shopify_usage_charges (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null,
  usage_key text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid,
  credits integer not null check (credits > 0 and credits <= 41),
  usd numeric(6, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  day date not null,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopify_usage_charges_caps_idx on public.shopify_usage_charges (shop_domain, month, day) where status in ('pending', 'sent');

alter table public.shopify_credit_grants enable row level security;
alter table public.shopify_usage_charges enable row level security;
revoke all on public.shopify_credit_grants from anon, authenticated, public;
revoke all on public.shopify_usage_charges from anon, authenticated, public;
grant select, insert, update, delete on public.shopify_credit_grants to service_role;
grant select, insert, update, delete on public.shopify_usage_charges to service_role;

-- Recibo + crédito na MESMA transação. Devolve true quando somou agora, false quando o recibo já existia (nada soma).
-- Perfil ausente = exceção (a transação desfaz o recibo: nunca fica recibo sem crédito).
create or replace function public.shopify_grant_credits(p_shop text, p_cycle text, p_user uuid, p_amount integer, p_reason text, p_plan text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_inserted integer;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 1000 then
    raise exception 'shopify_grant_credits: amount fora da faixa';
  end if;
  insert into public.shopify_credit_grants (shop_domain, cycle_key, user_id, credits, reason, plan_handle)
  values (p_shop, p_cycle, p_user, p_amount, p_reason, p_plan)
  on conflict (shop_domain, cycle_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;
  update public.profiles set video_credits = coalesce(video_credits, 0) + p_amount where id = p_user;
  if not found then
    raise exception 'shopify_grant_credits: perfil ausente';
  end if;
  return true;
end;
$$;

revoke all on function public.shopify_grant_credits(text, text, uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.shopify_grant_credits(text, text, uuid, integer, text, text) to service_role;
