-- KINEO-ADS-MARCAS-1510 — MARCAS (clientes) do Studio Ads: um espaço por marca de cliente (fundador 15/10/2026: "Ads perfeito
-- para agência usar sozinha, hoje"). Regras puras em lib/ads/brands.ts; banco em lib/ads/brandsServer.ts; rota /api/ads/brands.
--
-- ⚠️ NÃO APLICADA (a sessão principal aplica depois da revisão). Sem ela nada quebra: GET /api/ads/brands devolve
-- { ready: false } e a tela /ads/v2 segue EXATAMENTE como antes (o kit único de public.ads_brand_kits); o POST de pedido não
-- manda brand_id (orderBrandId devolve null sem a tabela) e a lista "Seus anúncios" lê sem a coluna.
--
-- DE QUEM É A MARCA: owner_id = o DONO do workspace (lib/ads/workspace.ts). Conta sozinha = ela mesma. Equipe Business = o dono
-- do Business, e as vagas (public.ads_team_members, status 'active', dono com plano 'business' AGORA) veem as mesmas marcas.
-- created_by = o membro que criou (NULL = o próprio dono).
--
-- RLS: ligado. anon não tem NENHUM privilégio. authenticated só tem SELECT, e a policy deixa ver SÓ as marcas vivas do próprio
-- workspace (dono, ou membro ativo da equipe Business do dono). Escrita (insert/update) só pela rota com a chave de serviço,
-- depois de getUser + adsGate + as regras de teto, nome único e logo do dono — nenhuma policy de escrita existe.
-- Idempotente: create if not exists / add column if not exists / drop+create de trigger e policy / on conflict do nothing.

create table if not exists public.ad_brands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  -- id do user_footage DO DONO (a rota confere a posse na escrita e na leitura); apagado o arquivo, o logo some da marca.
  logo_footage_id uuid references public.user_footage (id) on delete set null,
  color text check (color is null or color ~ '^#[0-9a-f]{6}$'),
  color2 text check (color2 is null or color2 ~ '^#[0-9a-f]{6}$'),
  price text check (price is null or char_length(price) <= 60),
  contact text check (contact is null or char_length(contact) <= 80),
  website text check (website is null or (char_length(website) <= 200 and website ~* '^https?://')),
  voice_language text check (voice_language is null or voice_language ~ '^[a-z]{2}$'),
  pronounce_word text check (pronounce_word is null or char_length(pronounce_word) <= 40),
  pronounce_say text check (pronounce_say is null or char_length(pronounce_say) <= 40),
  notes text check (notes is null or char_length(notes) <= 1000),
  -- a 1ª marca nascida do kit antigo (ads_brand_kits); o índice abaixo deixa UMA por dono (migração idempotente)
  from_legacy_kit boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nome único entre as marcas VIVAS do workspace (sem diferença de maiúsculas).
create unique index if not exists ad_brands_owner_name_live on public.ad_brands (owner_id, lower(btrim(name))) where archived_at is null;
-- Uma marca migrada do kit antigo por dono.
create unique index if not exists ad_brands_one_legacy on public.ad_brands (owner_id) where from_legacy_kit;
create index if not exists ad_brands_owner_live on public.ad_brands (owner_id, name) where archived_at is null;

alter table public.ad_brands enable row level security;
revoke all on table public.ad_brands from anon, authenticated, public;
grant select on table public.ad_brands to authenticated;

-- Quem pode VER as marcas de um dono: o próprio dono, ou um membro ATIVO da equipe dele enquanto o plano do dono for 'business'
-- (a mesma régua do resolvedor lib/ads/workspace.ts). security definer: lê ads_team_members/profiles, que não têm grant para
-- authenticated; search_path fixo.
create or replace function public.ad_brands_visible_to_me(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    p_owner = auth.uid()
    or exists (
      select 1
      from public.ads_team_members m
      join public.profiles p on p.id = m.owner_id
      where m.owner_id = p_owner
        and m.member_id = auth.uid()
        and m.status = 'active'
        and lower(btrim(coalesce(p.plan, ''))) = 'business'
    )
  )
$$;
revoke all on function public.ad_brands_visible_to_me(uuid) from public, anon;
grant execute on function public.ad_brands_visible_to_me(uuid) to authenticated;

drop policy if exists ad_brands_select_owner_or_team on public.ad_brands;
create policy ad_brands_select_owner_or_team on public.ad_brands
  for select to authenticated
  using (archived_at is null and public.ad_brands_visible_to_me(owner_id));

create or replace function public.ad_brands_touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ad_brands_touch_updated_at on public.ad_brands;
create trigger ad_brands_touch_updated_at
  before update on public.ad_brands
  for each row execute function public.ad_brands_touch_updated_at();

-- Cada pedido do Ads grava a marca (NULL = sem marca / pedido antigo). Marca arquivada continua apontada; a linha não some.
alter table public.ads_v2_orders add column if not exists brand_id uuid references public.ad_brands (id) on delete set null;
create index if not exists ads_v2_orders_user_brand on public.ads_v2_orders (user_id, brand_id, created_at desc);

-- O kit antigo vira a 1ª marca de cada conta que tem kit com alguma coisa (nome, logo, cor, preço ou contato). Kit sem nome =
-- "My brand". O kit antigo fica intocado. (Conferido em leitura em 15/10: 2 kits na base, ambos só com cor.) A rota faz a
-- mesma coisa na 1ª leitura (migrateLegacyKit) para kit salvo depois desta migration.
insert into public.ad_brands (owner_id, name, logo_footage_id, color, price, contact, from_legacy_kit)
select k.user_id,
       coalesce(nullif(btrim(k.business), ''), 'My brand'),
       k.logo_footage_id,
       k.color,
       nullif(btrim(k.price), ''),
       nullif(btrim(k.contact), ''),
       true
from public.ads_brand_kits k
where (nullif(btrim(k.business), '') is not null or k.logo_footage_id is not null or k.color is not null
       or nullif(btrim(k.price), '') is not null or nullif(btrim(k.contact), '') is not null)
  and not exists (select 1 from public.ad_brands b where b.owner_id = k.user_id)
on conflict do nothing;
