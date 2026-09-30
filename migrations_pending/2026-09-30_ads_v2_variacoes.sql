-- KINEO-ADS-3-VARIACOES-2026-09-30 — "3 variações" do anúncio v2: o GRUPO que liga os 3 pedidos irmãos.
--
-- ⚠️ NÃO APLICADA. Aplicar ANTES do deploy de app/api/ads/v2/variations (até lá a rota responde 503 'not_ready' ANTES
-- de qualquer débito; o anúncio comum não lê nada daqui). Idempotente e numa transação só.
--
-- O QUE MUDA:
--   1. public.ads_v2_variation_groups: um grupo por pedido-âncora (a variação A), com o preço do grupo (2,5 × o nível),
--      as 3 partes do débito único e a variação escolhida ("Escolher esta").
--   2. ads_v2_orders.variation_group_id / variation_slot ('A' | 'B' | 'C'): cada variação continua sendo um pedido v2
--      NORMAL (avanço, status, refação, montagem e estorno próprios); o grupo só liga os três.
--   3. "Um anúncio ativo por conta" vira "um ativo por conta E por letra": o índice antigo (user_id) impediria as 3
--      variações de rodarem juntas. O pedido comum e a refação contam como 'A' (coalesce), então quem não usa variações
--      continua com UM ativo por vez, exatamente como hoje; um grupo roda no máximo 3 ao mesmo tempo.
-- Código que lê estes nomes: app/api/ads/v2/variations/route.ts, lib/ads/v2Variations.ts. O motor (lib/ads/v2Advance.ts)
-- NÃO depende deles: a marca da variação também mora em ads_v2_orders.brief.variation (coluna jsonb que já existe).

begin;

create table if not exists public.ads_v2_variation_groups (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- O pedido que virou a variação A (um grupo por âncora).
  anchor_order_id uuid not null unique references public.ads_v2_orders (id) on delete cascade,
  tier text not null
    check (tier in ('photo_motion', 'commercial', 'cinema')),
  seconds integer not null
    check (seconds in (15, 20, 30)),
  -- Preço do grupo (2,5 × adsV2Credits, arredondado para cima) e as 3 partes do débito (somam credits_total).
  credits_total integer not null check (credits_total > 0),
  shares jsonb not null,
  chosen_order_id uuid references public.ads_v2_orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ads_v2_variation_groups is
  'KINEO-ADS-3-VARIACOES-2026-09-30 — grupo de 3 variações do anúncio v2 (um pedido ads_v2_orders por letra). Escrita só pelo servidor (service role).';

alter table public.ads_v2_orders add column if not exists variation_group_id uuid
  references public.ads_v2_variation_groups (id) on delete set null;
alter table public.ads_v2_orders add column if not exists variation_slot text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ads_v2_orders_variation_slot_check') then
    alter table public.ads_v2_orders add constraint ads_v2_orders_variation_slot_check
      check (variation_slot is null or variation_slot in ('A', 'B', 'C'));
  end if;
  -- Letra e grupo andam juntos.
  if not exists (select 1 from pg_constraint where conname = 'ads_v2_orders_variation_pair_check') then
    alter table public.ads_v2_orders add constraint ads_v2_orders_variation_pair_check
      check ((variation_group_id is null) = (variation_slot is null));
  end if;
end $$;

-- Uma letra por grupo.
create unique index if not exists ads_v2_orders_variation_slot_unique
  on public.ads_v2_orders (variation_group_id, variation_slot)
  where variation_group_id is not null;
create index if not exists ads_v2_orders_variation_group_idx
  on public.ads_v2_orders (variation_group_id)
  where variation_group_id is not null;
create index if not exists ads_v2_variation_groups_user_created_idx
  on public.ads_v2_variation_groups (user_id, created_at desc);

-- UM pedido ativo por conta E por letra (pedido comum e refação = 'A'). Troca o índice antigo na mesma transação.
create unique index if not exists ads_v2_orders_one_active_per_user_slot
  on public.ads_v2_orders (user_id, (coalesce(variation_slot, 'A')))
  where status in ('generating', 'assembling');
drop index if exists public.ads_v2_orders_one_active_per_user;

-- Mesma postura das tabelas do v2: RLS ligado e NENHUMA policy; as rotas usam a service key depois do getUser.
alter table public.ads_v2_variation_groups enable row level security;
revoke all on table public.ads_v2_variation_groups from anon, authenticated;

drop trigger if exists ads_v2_variation_groups_touch_updated_at on public.ads_v2_variation_groups;
create trigger ads_v2_variation_groups_touch_updated_at
  before update on public.ads_v2_variation_groups
  for each row execute function public.ads_v2_touch_updated_at();

commit;
