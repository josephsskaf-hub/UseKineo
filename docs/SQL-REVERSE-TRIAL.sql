-- KINEO-REVERSE-TRIAL-P1-2026-08-06 — ESPELHO da migração aplicada via MCP
-- Supabase (projeto cqqukkvjjrguayiyjvhh, migração
-- `reverse_trial_p1_profiles_columns`, aplicada em 06/08/2026).
--
-- SOMENTE aditiva: ADD COLUMN IF NOT EXISTS + índice. Idempotente — rodar de
-- novo é um no-op. Nenhuma linha existente muda de comportamento: todo o
-- código que lê estes campos está atrás de KINEO_REVERSE_TRIAL_ENABLED
-- (env, default OFF), lida num único helper: lib/reverseTrial.ts.
--
-- Semântica dos campos:
--   trial_status        null = nunca teve trial (única condição que permite
--                       ativar — 1 trial por conta, PARA SEMPRE)
--                       | 'active' | 'expired' | 'converted'
--   trial_ends_at       fim do trial (now()+3d ou +7d na ativação)
--   trial_credits_used  soma de TODO débito de crédito durante o trial;
--                       ao atingir 60 o servidor grava trial_status='expired'
--                       na mesma escrita (hard cap no backend, não na UI)
--   trial_extended      reservado para a extensão única (fase 2)
--   trial_variant       braço do A/B: '3d' | '7d' (hash determinístico
--                       FNV-1a do user_id → 50/50; ver trialVariantFor)

alter table public.profiles add column if not exists trial_status text;
alter table public.profiles add column if not exists trial_ends_at timestamptz;
alter table public.profiles add column if not exists trial_credits_used integer not null default 0;
alter table public.profiles add column if not exists trial_extended boolean not null default false;
alter table public.profiles add column if not exists trial_variant text;
create index if not exists idx_profiles_trial_ends_at on public.profiles (trial_ends_at);

-- ── FASE 2, ITEM 2 (cron de downgrade) — migração `reverse_trial_p2_downgrade_columns`
-- APLICADA em 06/08/2026 no projeto cqqukkvjjrguayiyjvhh (verificada por
-- information_schema pós-apply). Migração ANTES do deploy, a ordem certa.
alter table public.profiles add column if not exists trial_credits_granted integer not null default 0;
alter table public.profiles add column if not exists trial_downgraded_at timestamptz;
create index if not exists idx_profiles_trial_pending_downgrade
  on public.profiles (trial_ends_at)
  where trial_status in ('active', 'expired');

-- trial_credits_granted: registro POR LINHA do que a conta recebeu. Se o teto
--   40 mudar um dia, trials antigos revogam o que de fato receberam — número de
--   dinheiro que envelhece mora na linha, não na constante.
-- trial_downgraded_at: instante em que o cron processou o fim do trial. É a
--   coorte dos e-mails D3+, SEMPRE combinada com trial_status='downgraded'
--   (a coluna também é carimbada em quem CONVERTEU).
--
-- Estados de trial_status: null (nunca teve) → 'active' → 'expired' (teto
-- atingido, escrito pelo débito) → 'downgraded' | 'converted' (terminais,
-- escritos pelo cron). Só 'active' e 'expired' entram na coorte do cron.

-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2, ANTI-ABUSO — KINEO-TRIAL-ABUSE-PMP-2026-08-07
-- Migração `trial_signup_fingerprints` (projeto cqqukkvjjrguayiyjvhh).
-- SOMENTE ADITIVA: cria uma tabela NOVA. Nenhuma coluna, índice, policy ou
-- linha existente é tocada — desligar a feature é remover a env do salt.
--
-- O QUE ESTA TABELA GUARDA — e o que ela deliberadamente NÃO guarda:
--   fingerprint_hash  SHA-256 de (SALT | ip | user-agent | accept-language).
--                     O IP CRU NUNCA É GRAVADO, aqui nem em log. O salt vem de
--                     KINEO_TRIAL_FINGERPRINT_SALT (env, server-only); sem ele
--                     lib/trialFingerprint.ts devolve null e NADA é inserido.
--                     Trocar o salt invalida a base inteira de propósito.
--   user_id           quem foi avaliado. ON DELETE SET NULL: apagar a conta
--                     (LGPD/GDPR) não pode ser bloqueado por esta tabela, e o
--                     hash sobrevive como contador anônimo.
--   outcome           'activated' (trial concedido — é ESTE que conta para o
--                     limite) | 'blocked' (bateu no limite, conta criada sem
--                     trial e SEM aviso ao usuário).
--
-- REGRA: no máximo TRIAL_FINGERPRINT_MAX_ACTIVATIONS (2) linhas 'activated'
-- por hash em TRIAL_FINGERPRINT_WINDOW_DAYS (30). Acima disso, o signup segue
-- normal porém sem trial. Qualquer erro de leitura CONCEDE o trial e grava o
-- evento trial_fingerprint_check_failed — falha aberto por ordem do fundador
-- ("é melhor errar concedendo do que barrar cliente real").
--
-- RLS ligada SEM POLICY = ninguém lê pelo anon/authenticated key; só o
-- service-role (a rota de signup e o painel /admin/trial-abuse) enxerga.

create table if not exists public.trial_signup_fingerprints (
  id uuid primary key default gen_random_uuid(),
  fingerprint_hash text not null,
  user_id uuid references auth.users(id) on delete set null,
  outcome text not null default 'activated',
  created_at timestamptz not null default now()
);

-- A ÚNICA query quente: count por hash + outcome dentro da janela.
create index if not exists idx_trial_fp_hash_created
  on public.trial_signup_fingerprints (fingerprint_hash, created_at desc);
-- Painel: bloqueios recentes em ordem cronológica.
create index if not exists idx_trial_fp_outcome_created
  on public.trial_signup_fingerprints (outcome, created_at desc);

alter table public.trial_signup_fingerprints enable row level security;
