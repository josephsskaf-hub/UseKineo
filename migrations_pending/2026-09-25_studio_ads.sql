-- KINEO-STUDIO-ADS-2026-09-25 — acesso por passe e tabela de pedidos do Studio Ads.
--
-- ⚠️ APLICAR ANTES DA PRIMEIRA VENDA (bloco 08-10 de 25/09). Até rodar, o SKU `ads_pass` é
-- INERTE de propósito: o webhook escreve `ads_access_until` no MESMO UPDATE que grava crédito e
-- has_paid; sem a coluna o UPDATE inteiro falha (42703) → RetryableEntitlementError → a Stripe
-- reenvia até a coluna existir. Nunca cobra sem conceder (molde: 2026-07-26_autopilot_pilot_plan_expiry.sql).
--
-- O QUE O CÓDIGO LÊ (nomes exatos; guardião scripts/test-ads-fundacao-2026-09-25.mjs confere):
--   profiles.ads_access_until  timestamptz null  → lib/ads/access.ts (ADS_ACCESS_COLUMN) e webhook Path A
--   public.ads_orders          → lib/ads/types.ts (AdsOrder) e /api/ads/orders

alter table public.profiles
  add column if not exists ads_access_until timestamptz;

comment on column public.profiles.ads_access_until is
  'KINEO-STUDIO-ADS-2026-09-25 — fim do acesso ao Studio Ads comprado pelo passe ads_pass (now()+365d no webhook). NULL = nunca comprou; assinante pago entra sem passe (lib/ads/access.ts).';

-- KINEO-STUDIO-ADS-REVISAO-2026-09-24 — a policy "Users own profile" (FOR ALL, auth.uid() = id) e o UPDATE de tabela
-- para authenticated deixam o dono editar a própria linha; a guarda enforce_profile_client_guard protege créditos,
-- plano e has_paid, mas não conhece esta coluna. Sem a guarda abaixo, qualquer conta logada se daria o passe com um
-- PATCH direto no PostgREST (achado CONFIRMADO pela revisão adversarial de 24/09). Guarda SEPARADA de propósito: não
-- reescreve a função compartilhada. Mesma regra de papel: só authenticated/anon são contidos; service_role passa.
create or replace function public.ads_access_client_guard()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.ads_access_until := null;
  elsif new.ads_access_until is distinct from old.ads_access_until then
    new.ads_access_until := old.ads_access_until;
  end if;
  return new;
end $$;

drop trigger if exists ads_access_client_guard on public.profiles;
create trigger ads_access_client_guard
  before insert or update on public.profiles
  for each row execute function public.ads_access_client_guard();

create index if not exists profiles_ads_access_until_idx
  on public.profiles (ads_access_until)
  where ads_access_until is not null;

create table if not exists public.ads_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'rendering', 'delivered', 'reviewed', 'failed', 'cancelled')),
  template text,
  seconds integer check (seconds is null or seconds in (35, 60)),
  brief jsonb,
  media jsonb not null default '[]'::jsonb,
  script text,
  script_angle text,
  voice text,
  storyboard jsonb not null default '[]'::jsonb,
  card_footage_id text,
  video_id uuid,
  consent_at timestamptz,
  qa_by text,
  qa_at timestamptz,
  qa_ok boolean,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ads_orders is
  'KINEO-STUDIO-ADS-2026-09-25 — um pedido do Studio Ads por linha; estado do fluxo /ads/new vive aqui (nunca no navegador). Escrita só pelo servidor (service role); o cliente lê pelas rotas /api/ads/*.';

create index if not exists ads_orders_user_created_idx on public.ads_orders (user_id, created_at desc);
create index if not exists ads_orders_status_idx on public.ads_orders (status) where status in ('rendering', 'delivered');

-- Mesma postura de public.events (lockdown 26-27/08): RLS ligado e NENHUMA policy para anon/
-- authenticated. As rotas usam a service key depois de conferir o dono (getUser) e o gate
-- (lib/ads/access.ts). Sem policy = sem leitura/escrita direta do navegador.
alter table public.ads_orders enable row level security;

-- updated_at automático (padrão das tabelas novas da casa).
create or replace function public.ads_orders_touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ads_orders_touch_updated_at on public.ads_orders;
create trigger ads_orders_touch_updated_at
  before update on public.ads_orders
  for each row execute function public.ads_orders_touch_updated_at();
