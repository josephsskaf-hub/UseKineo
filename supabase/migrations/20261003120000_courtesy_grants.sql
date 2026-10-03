-- KINEO-CORTESIA-2026-10-03 — conta cortesia (regra em lib/courtesy.ts, escritas em lib/courtesyStore.ts).
-- NÃO APLICADA: o CEO aplica depois do ok. Sem esta tabela a rota /api/admin/courtesy responde 503 e o painel segue
-- igual (loadActiveCourtesyGrants devolve lista vazia) — nada quebra antes da aplicação.
--
-- Uma linha por cortesia concedida. Guarda o plano ANTERIOR e a data de FIM, que é o que o remendo de 02/10
-- ("muda o plano à mão para *_trial") não guardava. Só nível *_trial: plano cheio é o que a Stripe vende.
-- Escrita só pelo servidor (service_role ignora RLS); RLS ligada sem política = ninguém de fora lê nem escreve.

create table if not exists public.courtesy_grants (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  level            text not null check (level in ('creator_trial', 'studio_trial')),
  previous_plan    text,
  credits_granted  integer not null default 0 check (credits_granted between 0 and 1000),
  credits_before   integer not null default 0,
  had_paid_before  boolean not null default false,
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz not null,
  reason           text not null check (char_length(btrim(reason)) between 3 and 500),
  granted_by       text not null,
  source           text not null default 'admin' check (source in ('admin', 'partner_pack')),
  status           text not null default 'active' check (status in ('active', 'expired', 'superseded', 'revoked')),
  ended_at         timestamptz,
  credits_removed  integer,
  created_at       timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Uma cortesia ATIVA por pessoa: o clique duplo no admin vira 23505, não duas cortesias.
create unique index if not exists courtesy_grants_one_active_per_user
  on public.courtesy_grants (user_id) where status = 'active';

-- O cron de validade lê "ativas com prazo vencido, mais antigas primeiro".
create index if not exists courtesy_grants_active_due
  on public.courtesy_grants (ends_at) where status = 'active';

alter table public.courtesy_grants enable row level security;
