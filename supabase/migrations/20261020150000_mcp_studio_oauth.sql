-- KINEO-MCP-STUDIO-2010 — tabelas do conector "Kineo Studio" (OAuth 2.1 do servidor MCP /api/mcp/studio).
--
-- Aplicada em produção em 20/10/2026 via apply_migration (projeto cqqukkvjjrguayiyjvhh) com este MESMO nome; o
-- arquivo existe para o repositório saber o que há no banco. IF NOT EXISTS em tudo: rodar de novo não faz nada.
--
-- Quatro tabelas, TODAS fechadas (RLS ligado, nenhuma policy, nenhum privilégio para anon/authenticated): só a
-- chave de serviço — ou seja, só as rotas do servidor — lê e escreve. Nenhum token vai em claro: só o sha256.
--   mcp_oauth_clients — clientes registrados por DCR (o Claude registra um por conexão; o Claude Code outro).
--   mcp_oauth_codes   — códigos de autorização (10 min, uso único, PKCE S256 guardado como code_challenge).
--   mcp_oauth_tokens  — access (1 h) + refresh (30 d, rotacionado); revoked_at = revogação.
--   mcp_studio_jobs   — o pedido de filme que o Claude fez: idempotência por (user, chave do cliente), teto de
--                       simultâneos por conta e a ponte job_id → generation_id do /api/generate-video-cinematic.

create table if not exists public.mcp_oauth_clients (
  client_id text primary key,
  client_name text,
  client_uri text,
  redirect_uris jsonb not null,
  token_endpoint_auth_method text not null default 'none',
  client_secret_hash text,
  grant_types jsonb not null default '["authorization_code","refresh_token"]'::jsonb,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists public.mcp_oauth_codes (
  code_hash text primary key,
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null,
  redirect_uri text not null,
  code_challenge text not null,
  scope text not null,
  resource text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mcp_oauth_codes_expires_idx on public.mcp_oauth_codes (expires_at);

create table if not exists public.mcp_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  access_hash text not null unique,
  refresh_hash text unique,
  code_hash text,
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null,
  scope text not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists mcp_oauth_tokens_user_idx on public.mcp_oauth_tokens (user_id, created_at desc);
create index if not exists mcp_oauth_tokens_code_idx on public.mcp_oauth_tokens (code_hash);

create table if not exists public.mcp_studio_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  idempotency_key text,
  generation_id text not null,
  format text not null,
  engine text not null,
  duration integer not null,
  credits integer,
  status text not null default 'processing',
  dispatch jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mcp_studio_jobs_user_generation_key unique (user_id, generation_id)
);
create unique index if not exists mcp_studio_jobs_user_idem_key on public.mcp_studio_jobs (user_id, idempotency_key) where idempotency_key is not null;
create index if not exists mcp_studio_jobs_user_created_idx on public.mcp_studio_jobs (user_id, created_at desc);

alter table public.mcp_oauth_clients enable row level security;
alter table public.mcp_oauth_codes enable row level security;
alter table public.mcp_oauth_tokens enable row level security;
alter table public.mcp_studio_jobs enable row level security;

revoke all on public.mcp_oauth_clients from anon, authenticated, public;
revoke all on public.mcp_oauth_codes from anon, authenticated, public;
revoke all on public.mcp_oauth_tokens from anon, authenticated, public;
revoke all on public.mcp_studio_jobs from anon, authenticated, public;

grant select, insert, update, delete on public.mcp_oauth_clients to service_role;
grant select, insert, update, delete on public.mcp_oauth_codes to service_role;
grant select, insert, update, delete on public.mcp_oauth_tokens to service_role;
grant select, insert, update, delete on public.mcp_studio_jobs to service_role;
