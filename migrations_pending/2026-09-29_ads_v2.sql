-- KINEO-ADS-V2-2026-09-28 — tabelas próprias do anúncio v2 (Studio Ads com foto real animada).
--
-- ⚠️ NÃO APLICADA. Aplicar ANTES do deploy das rotas app/api/ads/v2/* (até lá elas devem responder 503 "not ready"
-- via isMissingAdsTable, nunca 500). Idempotente: create ... if not exists / create or replace / drop trigger if exists.
--
-- POR QUE TABELAS PRÓPRIAS (e não ads_orders): o GET do v1 (/api/ads/render) muda para 'failed' todo pedido
-- 'rendering' sem render_id com mais de 6 min — no v2 o render_id fica nulo durante toda a fase fal (Kling O3 ~127 s,
-- H3 até 209 s por plano). O wizard v1 também abriria o pedido v2 na tela do compose, o "um render por conta" do v1
-- contaria o v2 e o CHECK de seconds (35, 60) não aceita 15 s. Este arquivo NÃO toca em ads_orders nem no arquivo
-- migrations_pending/2026-09-25_studio_ads.sql (guardião test-ads-fundacao lê o antigo).
--
-- Especificação: docs/ESPEC-ANUNCIO-V2-2026-09-28.md. Código que lê estes nomes: lib/ads/v2Tiers.ts,
-- lib/ads/v2ShotLists.ts, lib/ads/v2Contract.ts (guardião scripts/test-ads-v2-base-2026-09-28.mjs confere os enums).

create table if not exists public.ads_v2_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'planned', 'generating', 'assembling', 'delivered', 'failed', 'cancelled')),
  tier text not null
    check (tier in ('photo_motion', 'commercial', 'cinema')),
  seconds integer not null default 15
    check (seconds in (15, 20, 30)),
  sector text
    check (sector is null or sector in ('restaurant', 'clinic', 'real_estate', 'gym', 'salon', 'store', 'app_service', 'other')),
  brief jsonb,
  language text,
  narration boolean not null default true,
  logo_footage_id text,
  card_url text,
  plan jsonb,
  music_url text,
  voice_url text,
  -- Chave de cobrança 'adsv2-<order>-<generation>'; é também o videos.render_id da entrega (videos_render_id_unique).
  billing_ref text unique,
  credits_charged integer not null default 0 check (credits_charged >= 0),
  generation_id text,
  creatomate_render_id text,
  video_id uuid,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  -- ETAPA 2 (servidor, 28/09) — colunas que as rotas e o motor de avanço (lib/ads/v2Advance.ts) leem e escrevem.
  -- Fotos do pedido JÁ conferidas no user_footage do dono: [{ footage_id, kind, url }] (3 a 7).
  photos jsonb,
  card_footage_id text,
  voice_seconds numeric(6, 3),
  -- Montagem: a trava de preparo (música/voz) e o carimbo gravado ANTES do POST ao Creatomate. Com o carimbo e sem
  -- creatomate_render_id, o envio é AMBÍGUO: nunca reenviar (passado o prazo, o pedido falha e o crédito volta).
  assembly_lease_at timestamptz,
  assembly_submit_at timestamptz,
  -- Refação cobrada à parte = um pedido NOVO com id determinístico (pai, plano, linha substituída) e chave
  -- 'adsv2redo-<id>'; os planos prontos do pai são copiados e só o plano refeito vai à fal.
  parent_order_id uuid references public.ads_v2_orders (id) on delete set null,
  retake_idx integer check (retake_idx is null or (retake_idx >= 0 and retake_idx <= 31))
);

comment on table public.ads_v2_orders is
  'KINEO-ADS-V2-2026-09-28 — um anúncio v2 por linha (foto real animada, 15/20/30 s). Escrita só pelo servidor (service role); o cliente lê pelas rotas /api/ads/v2/*.';

create table if not exists public.ads_v2_shots (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ads_v2_orders (id) on delete cascade,
  idx integer not null check (idx >= 0 and idx <= 31),
  attempt integer not null default 1 check (attempt >= 1),
  role text,
  kind text not null
    check (kind in ('people', 'place', 'product', 'product_hero', 'text')),
  source text not null
    check (source in ('client_photo', 'generated_scene')),
  source_footage_id text,
  image_url text,
  image_request_id text,
  engine text
    check (engine is null or engine in ('kling_o3', 'seedance_20_fast', 'h3')),
  prompt text,
  gen_seconds numeric(6, 3),
  cut_start numeric(6, 3) check (cut_start is null or cut_start >= 0),
  cut_seconds numeric(6, 3) check (cut_seconds is null or cut_seconds > 0),
  request_id text,
  status text not null default 'pending'
    check (status in ('pending', 'image_submitted', 'image_done', 'submitted', 'ambiguous', 'done', 'failed', 'stuck', 'skipped_text')),
  fal_url text,
  stored_url text,
  measured_seconds numeric(6, 3),
  usd numeric(8, 4) check (usd is null or usd >= 0),
  reason text,
  -- ETAPA 2: classe do motivo (lib/cinematic/sceneDisposition.ts), variante de movimento e os carimbos de envio.
  -- *_claimed_at é gravado ANTES do POST à fal pelo UPDATE condicional que decide quem envia (tela e cron juntos
  -- nunca mandam o mesmo plano duas vezes); sem request_id depois de 20 min = ambíguo vencido → falha.
  reason_class text,
  movement_variant integer not null default 0,
  image_submit_claimed_at timestamptz,
  submit_claimed_at timestamptz,
  submitted_at timestamptz,
  fal_done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, idx, attempt),
  -- REGRA DURA: texto nunca passa por IA de vídeo. Plano 'text' não tem motor nem pedido na fal, em nenhuma tentativa.
  constraint ads_v2_shots_text_never_ai
    check (kind <> 'text' or (engine is null and request_id is null and image_request_id is null)),
  -- Seedance 2.0 (close-herói) só no plano product_hero.
  constraint ads_v2_shots_hero_engine
    check (engine is distinct from 'seedance_20_fast' or kind = 'product_hero')
);

comment on table public.ads_v2_shots is
  'KINEO-ADS-V2-2026-09-28 — um plano (e cada tentativa dele) do anúncio v2. Escrita só pelo servidor (service role).';

-- UM pedido ativo por conta, atômico (o "um por conta" do v1 é contagem, não trava).
create unique index if not exists ads_v2_orders_one_active_per_user
  on public.ads_v2_orders (user_id)
  where status in ('generating', 'assembling');

create index if not exists ads_v2_orders_user_created_idx on public.ads_v2_orders (user_id, created_at desc);
-- Varredura do cron de avanço (app/api/cron/ads-v2-advance): só os pedidos em andamento.
create index if not exists ads_v2_orders_active_status_idx
  on public.ads_v2_orders (status, updated_at)
  where status in ('generating', 'assembling');
-- (Sem índice separado em (order_id, idx, attempt): o unique acima já cria esse índice; um segundo igual só dobraria a escrita.)
-- Planos que o cron precisa consultar na fal.
create index if not exists ads_v2_shots_pending_status_idx
  on public.ads_v2_shots (status, updated_at)
  where status in ('pending', 'image_submitted', 'image_done', 'submitted', 'ambiguous', 'stuck');

-- Mesma postura de public.ads_orders e public.events: RLS ligado e NENHUMA policy. As rotas usam a service key depois
-- de conferir o dono (getUser) e o portão (isAdsInternalEmail enquanto ADS_V2_PUBLIC = false).
alter table public.ads_v2_orders enable row level security;
alter table public.ads_v2_shots enable row level security;
revoke all on table public.ads_v2_orders from anon, authenticated;
revoke all on table public.ads_v2_shots from anon, authenticated;

create or replace function public.ads_v2_touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ads_v2_orders_touch_updated_at on public.ads_v2_orders;
create trigger ads_v2_orders_touch_updated_at
  before update on public.ads_v2_orders
  for each row execute function public.ads_v2_touch_updated_at();

drop trigger if exists ads_v2_shots_touch_updated_at on public.ads_v2_shots;
create trigger ads_v2_shots_touch_updated_at
  before update on public.ads_v2_shots
  for each row execute function public.ads_v2_touch_updated_at();
