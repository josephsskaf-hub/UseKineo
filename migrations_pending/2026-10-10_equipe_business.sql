-- KINEO-EQUIPE-BUSINESS-2026-10-10 — EQUIPE do plano Business no Studio Ads (decisão do fundador, 10/10/2026).
--
-- O dono de um plano 'business' convida até 3 colegas (BUSINESS_SEATS em lib/ads/team.ts, incluídos no preço). O colega
-- entra com a PRÓPRIA conta Kineo pelo link do convite (assinado, uso único, 7 dias) e passa a fazer anúncio DENTRO do
-- workspace do dono: o pedido nasce com user_id = dono, o débito sai do saldo do dono, a entrega cai na biblioteca do dono.
-- Quem fez fica em created_by (auditoria). Filmes, clipes e imagens continuam estritamente por conta.
--
-- ⚠️ NÃO APLICADA. Sem ela nada quebra: o resolvedor (lib/ads/workspace.ts) trata tabela ausente como "sem equipe" e
-- todo mundo segue na própria conta; /api/ads/team devolve 503 'not_ready' para convite e aceite.
-- created_by só é enviado pelo código quando quem age é MEMBRO — e só existe membro com esta migration aplicada, então
-- as colunas novas nunca são exigidas antes de existir.
--
-- Mesma postura de public.ads_v2_orders e public.ads_brand_kits: RLS ligado, NENHUMA policy e nenhum privilégio para anon
-- e authenticated. Só as rotas (chave de serviço, depois de getUser) leem e gravam.
-- Idempotente: create if not exists / add column if not exists / drop+create da trigger.

create table if not exists public.ads_team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- e-mail convidado (minúsculo). O aceite exige o MESMO e-mail verificado da conta que clica.
  email text not null check (char_length(email) between 3 and 254 and email = lower(email)),
  -- vaga 1..3: o índice único (owner_id, seat) entre convites vivos faz o teto de vagas ser atômico no banco.
  seat smallint not null check (seat between 1 and 3),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked', 'removed', 'left', 'expired')),
  member_id uuid references auth.users (id) on delete cascade,
  -- sha256 do token do link. O token em si nunca é gravado; o aceite apaga o hash (uso único).
  token_hash text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  check (status <> 'active' or member_id is not null),
  check (member_id is null or member_id <> owner_id)
);

-- Teto de vagas: no máximo uma linha viva por vaga e por dono (vagas 1..3 → no máximo 3 convites/membros vivos).
create unique index if not exists ads_team_members_live_seat
  on public.ads_team_members (owner_id, seat)
  where status in ('pending', 'active');

-- Um e-mail não recebe dois convites vivos do mesmo dono.
create unique index if not exists ads_team_members_live_email
  on public.ads_team_members (owner_id, email)
  where status in ('pending', 'active');

-- Uma conta é membro ativo de UMA equipe só (o resolvedor nunca vê dois donos).
create unique index if not exists ads_team_members_one_team
  on public.ads_team_members (member_id)
  where status = 'active';

create index if not exists ads_team_members_owner on public.ads_team_members (owner_id, status);

alter table public.ads_team_members enable row level security;
revoke all on table public.ads_team_members from anon, authenticated;

create or replace function public.ads_team_members_touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ads_team_members_touch_updated_at on public.ads_team_members;
create trigger ads_team_members_touch_updated_at
  before update on public.ads_team_members
  for each row execute function public.ads_team_members_touch_updated_at();

-- Auditoria: QUEM (membro) criou o pedido e o arquivo dentro do workspace do dono. NULL = o próprio dono.
alter table public.ads_v2_orders add column if not exists created_by uuid references auth.users (id) on delete set null;
alter table public.user_footage add column if not exists created_by uuid references auth.users (id) on delete set null;
