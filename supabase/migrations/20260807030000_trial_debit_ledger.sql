-- KINEO-TRIAL-DOUBLECOUNT-2026-08-07
-- Idempotencia POR RENDER da contabilidade do teto do reverse trial.
-- `public.debit_video_credits` e idempotente (PK render_id em credit_debits):
-- um replay do MESMO render devolve o saldo e NAO debita. O wrapper contava o
-- custo no teto em todo retorno sem erro, inclusive nesse no-op -> o trial
-- morria com metade dos creditos. Esta tabela e a prova factual de "ja contei
-- este render": o INSERT e a trava, unique_violation = replay = nao soma.
-- Aditiva: nenhuma tabela existente e tocada. RLS ON sem policy = so service role.
create table if not exists public.trial_debit_ledger (
  render_id  text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  cost       integer not null check (cost > 0),
  created_at timestamptz not null default now()
);

create index if not exists trial_debit_ledger_user_created_idx
  on public.trial_debit_ledger (user_id, created_at desc);

alter table public.trial_debit_ledger enable row level security;

revoke all on public.trial_debit_ledger from anon, authenticated;
