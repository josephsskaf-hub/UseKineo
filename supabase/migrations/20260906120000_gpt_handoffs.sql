-- KINEO-GPT-HANDOFF-2026-09-06
-- Caixa postal do GPT da loja da OpenAI: o GPT escreve o roteiro no formato da
-- casa, chama POST /api/gpt/handoff (público, sem chave), e recebe um link
-- curto /go/<token> que abre o Studio já preenchido com UM clique.
--
-- POR QUE UMA TABELA E NÃO A QUERY DA URL: 57% dos cadastros vêm de
-- chatgpt.com e o roteiro hoje viaja colado à mão. Um link com o roteiro na
-- query se perde no cadastro (OAuth devolve sem a query); o token não — ele é
-- o portador durável, e a rota do clique remonta a URL do Studio a partir da
-- linha. Também é o que permite CONTAR: criado → visto → clicado.
--
-- O QUE NUNCA ACONTECE POR CAUSA DESTA TABELA: conta nova, débito de crédito,
-- chamada a fornecedor. É texto guardado por 7 dias.
create table if not exists public.gpt_handoffs (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,                 -- randomBytes(18) base64url, >= 16 chars
  script text not null,                       -- <= 5000 chars = teto do Studio (ANALYZE_PROMPT_MAX_CHARS)
  duration_sec int not null,                  -- 35 | 60 | 90
  aspect text not null,                       -- '9:16' | '16:9' | '1:1' | '4:5' — a lista de lib/aspect.ts (sem CHECK: a lib valida)
  engine_hint text not null,                  -- id real do Studio: fast|seedance|kling|veo|hollywood|h3|omni
  language text not null,                     -- 'en', 'pt-BR'…
  topic text,                                 -- <= 200 chars, opcional
  words int not null,                         -- palavras faladas (marcadores fora)
  seconds numeric not null,                   -- words / régua do motor (3,1 clássico · 2,3 hollywood)
  fit text not null,                          -- 'short' | 'ok' | 'long'
  created_at timestamptz default now(),
  expires_at timestamptz not null,            -- created_at + 7 dias
  viewed_at timestamptz,                      -- primeira visita humana em /go/<token>
  clicked_at timestamptz,                     -- último clique em "Make this video"
  click_count int default 0,
  ip_hash text,                               -- sha256(salt|ip) — nunca IP cru
  user_agent text,
  -- A DONA do handoff: a PRIMEIRA pessoa que clicou COM sessao. O handoff
  -- nasce anonimo (o GPT nao tem a conta do cliente); sem esta coluna os
  -- degraus cadastro/filme/pagamento so se juntariam por DATA, que e juncao
  -- fraca. Quem chega deslogado volta ao /go/<token> depois do cadastro e
  -- clica de novo, ja com sessao, e o laco fecha sozinho. Sem chave
  -- estrangeira de proposito: apagar uma conta nao pode derrubar a linha do
  -- funil nem falhar a escrita do contador.
  user_id uuid
);

-- Rate limit é contado NO BANCO (linhas da última hora por ip_hash e no total),
-- porque memória de lambda não é compartilhada entre instâncias.
create index if not exists gpt_handoffs_ip_hash_created_idx
  on public.gpt_handoffs (ip_hash, created_at);
create index if not exists gpt_handoffs_created_idx
  on public.gpt_handoffs (created_at);
-- Faxina futura: apagar expiradas (delete where expires_at < now() - interval '30 days').
create index if not exists gpt_handoffs_user_id_idx
  on public.gpt_handoffs (user_id) where user_id is not null;
create index if not exists gpt_handoffs_expires_idx
  on public.gpt_handoffs (expires_at);

-- Deny-all para o navegador (padrão events_lockdown_service_role_only, 27/08):
-- RLS ligado, NENHUMA policy — sem policy, anon/authenticated não leem nem
-- escrevem uma linha mesmo que algum grant sobre. E os grants também saem.
alter table public.gpt_handoffs enable row level security;

revoke all privileges on table public.gpt_handoffs from public;
revoke all privileges on table public.gpt_handoffs from anon;
revoke all privileges on table public.gpt_handoffs from authenticated;

-- service_role faz BYPASSRLS; privilégio mínimo do que o código usa hoje
-- (insert na ação, select/update na página e na rota do clique). DELETE entra
-- junto com o sweep de expiradas quando ele existir.
revoke all privileges on table public.gpt_handoffs from service_role;
grant select, insert, update on table public.gpt_handoffs to service_role;
