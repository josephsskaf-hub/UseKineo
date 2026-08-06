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
