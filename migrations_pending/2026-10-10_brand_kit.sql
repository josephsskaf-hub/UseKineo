-- KINEO-ADS-UX-MARCA-2026-10-10 — o KIT DA MARCA do Studio Ads (/ads/v2, modo simples): logo, cor, nome, preço e contato
-- do cartão final, salvos por conta ao fazer um anúncio e preenchidos na próxima visita.
--
-- ⚠️ NÃO APLICADA. Sem ela nada quebra: GET /api/ads/brand-kit devolve { kit: null, ready: false } e o PUT devolve 503
-- 'not_ready' — a tela ignora as duas (o kit é conforto, nunca trava o anúncio nem o dinheiro).
--
-- Mesma postura de public.ads_v2_orders e public.events: RLS ligado, NENHUMA policy e nenhum privilégio para anon e
-- authenticated. Só a rota (chave de serviço, depois de getUser + adsGate) lê e grava, sempre com user_id = o da sessão;
-- o navegador não consegue ler nem escrever o kit de ninguém (nem o próprio) direto pelo PostgREST.
-- Idempotente: create if not exists + drop/create da trigger.

create table if not exists public.ads_brand_kits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- id do user_footage DO DONO (a rota confere a posse na leitura e na escrita); apagado o arquivo, o logo some do kit.
  logo_footage_id uuid references public.user_footage (id) on delete set null,
  color text check (color is null or color ~ '^#[0-9a-f]{6}$'),
  business text check (business is null or char_length(business) <= 60),
  price text check (price is null or char_length(price) <= 60),
  contact text check (contact is null or char_length(contact) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ads_brand_kits enable row level security;
revoke all on table public.ads_brand_kits from anon, authenticated;

create or replace function public.ads_brand_kits_touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ads_brand_kits_touch_updated_at on public.ads_brand_kits;
create trigger ads_brand_kits_touch_updated_at
  before update on public.ads_brand_kits
  for each row execute function public.ads_brand_kits_touch_updated_at();
