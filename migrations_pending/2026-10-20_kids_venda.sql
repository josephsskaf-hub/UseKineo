-- KINEO-KIDS-VENDA-2010 — as 3 formas de vender o "AI Kids Cartoon Stories": piloto automático (assinatura mensal, 30 desenhos
-- por ciclo), pack de 30 (compra única, em fila) e 1º episódio grátis com marca-d'água. Regras puras em lib/kidsVenda/kidsVenda.ts;
-- banco em lib/kidsVenda/server.ts; cron dentro de app/api/cron/autopilot-generate (passe 3).
--
-- APLICADA em produção em 20/10/2026 pela sessão (apply_migration kids_venda_2026_10_20). Idempotente: create if not exists /
-- drop+create de policy. Sem ela nada quebra: as rotas respondem { ready: false } e o cron não acha pedidos.
--
-- RLS: ligado. anon não tem NENHUM privilégio. authenticated só SELECT das PRÓPRIAS linhas (a tela /kids-cartoon lista os pedidos e
-- os episódios). Toda escrita (webhook, cron, rota da amostra) é pela chave de serviço — nenhuma policy de escrita existe.

create table if not exists public.kids_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('autopilot', 'pack', 'sample')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  character text not null,
  language text not null check (language ~ '^[a-z]{2}$'),
  theme text not null default '' check (char_length(theme) <= 120),
  duration smallint not null default 15,
  videos_total integer not null check (videos_total between 1 and 100),
  videos_delivered integer not null default 0,
  -- o ciclo do piloto (30 dias contados da assinatura/fatura); pack e amostra têm um ciclo só
  cycle_index integer not null default 0,
  cycle_start timestamptz not null default now(),
  cycle_end timestamptz,
  cycle_credits_funded integer not null default 0,
  next_run_at timestamptz,
  stripe_session_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  last_invoice_id text,
  price_minor integer,
  currency text,
  pause_reason text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists kids_orders_session_unique on public.kids_orders (stripe_session_id) where stripe_session_id is not null;
create unique index if not exists kids_orders_subscription_unique on public.kids_orders (stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists kids_orders_due on public.kids_orders (status, next_run_at) where status = 'active';
create index if not exists kids_orders_user on public.kids_orders (user_id, created_at desc);

create table if not exists public.kids_runs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.kids_orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cycle_key text not null default '',
  seq integer not null,
  attempt smallint not null default 1,
  status text not null default 'pending' check (status in ('pending', 'dispatched', 'delivered', 'failed')),
  generation_id text,
  credits_funded integer not null default 0,
  credits_clawed integer not null default 0,
  script text,
  title text,
  caption text,
  hashtags jsonb,
  render_id text,
  video_id uuid,
  error text,
  started_at timestamptz not null default now(),
  dispatched_at timestamptz,
  finished_at timestamptz,
  email_sent_at timestamptz,
  -- a trava anti-duplo-despacho: a mesma posição do mesmo ciclo só nasce uma vez por tentativa (23505 = outra passada chegou antes)
  constraint kids_runs_slot_unique unique (order_id, cycle_key, seq, attempt)
);
create unique index if not exists kids_runs_generation_unique on public.kids_runs (generation_id) where generation_id is not null;
create index if not exists kids_runs_open on public.kids_runs (status, started_at) where status in ('pending', 'dispatched');
create index if not exists kids_runs_order on public.kids_runs (order_id, seq);

alter table public.kids_orders enable row level security;
alter table public.kids_runs enable row level security;
revoke all on table public.kids_orders from anon, authenticated, public;
revoke all on table public.kids_runs from anon, authenticated, public;
grant select on table public.kids_orders to authenticated;
grant select on table public.kids_runs to authenticated;

drop policy if exists kids_orders_select_own on public.kids_orders;
create policy kids_orders_select_own on public.kids_orders for select to authenticated using (user_id = auth.uid());
drop policy if exists kids_runs_select_own on public.kids_runs;
create policy kids_runs_select_own on public.kids_runs for select to authenticated using (user_id = auth.uid());
