-- KINEO-SHOPIFY-2026-10-13 — o app da Shopify (Studio Ads para lojistas): uma linha por loja instalada.
-- NÃO APLICADA. Aplicar só com o "vai" do fundador, junto com SHOPIFY_APP_LIVE=true.
--
-- · O token da loja NUNCA fica em claro: access_token_enc/refresh_token_enc são AES-256-GCM (lib/shopify/core.ts encryptToken,
--   chave SHOPIFY_TOKEN_ENC_KEY na Vercel). Quem lê o banco sem a chave não chama a Shopify.
-- · Só a chave de serviço toca as tabelas: RLS ligado, NENHUMA policy, e anon/authenticated sem privilégio algum.
-- · owner_user_id = a conta Kineo que paga/recebe os anúncios da loja (ETAPA 2: conta criada na instalação ou vinculada).
-- · plan_handle/plan_status = o plano da Shopify App Pricing (o handle volta na URL depois da escolha do plano; a verdade
--   ao vivo é a Partner API activeSubscription). Nada de Stripe aqui: app público cobra SÓ pela Shopify.
-- · shop/redact (48 h depois da desinstalação) apaga a linha; app/uninstalled apaga os tokens na hora.

create table if not exists public.shopify_shops (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null unique
    check (shop_domain ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
  access_token_enc text,
  access_token_expires_at timestamptz,
  refresh_token_enc text,
  refresh_token_expires_at timestamptz,
  scopes text,
  owner_user_id uuid references public.profiles(id) on delete set null,
  plan_handle text,
  plan_status text not null default 'none'
    check (plan_status in ('none', 'trial', 'active', 'frozen', 'cancelled')),
  status text not null default 'installed'
    check (status in ('installed', 'uninstalled')),
  installed_at timestamptz not null default now(),
  uninstalled_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists shopify_shops_owner_idx on public.shopify_shops (owner_user_id) where owner_user_id is not null;

create table if not exists public.shopify_webhook_receipts (
  webhook_id text primary key,
  topic text not null,
  shop_domain text not null,
  received_at timestamptz not null default now()
);

create index if not exists shopify_webhook_receipts_shop_idx on public.shopify_webhook_receipts (shop_domain);

alter table public.shopify_shops enable row level security;
alter table public.shopify_webhook_receipts enable row level security;

revoke all on public.shopify_shops from anon, authenticated, public;
revoke all on public.shopify_webhook_receipts from anon, authenticated, public;
grant select, insert, update, delete on public.shopify_shops to service_role;
grant select, insert, update, delete on public.shopify_webhook_receipts to service_role;
