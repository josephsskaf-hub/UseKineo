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
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ads_orders_touch_updated_at on public.ads_orders;
create trigger ads_orders_touch_updated_at
  before update on public.ads_orders
  for each row execute function public.ads_orders_touch_updated_at();
