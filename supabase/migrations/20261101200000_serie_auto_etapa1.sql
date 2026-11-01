-- KINEO-SERIE-AUTO-ETAPA1-0111 — a série automática semanal, Etapa 1 (motor interno). Desenho: docs/SERIE-AUTOMATICA-DESENHO-2026-11-01.md.
-- Regras puras em lib/serieAuto/serieAuto.ts; passe 4 do cron do Autopilot em lib/serieAuto/cron.ts.
--
-- NÃO APLICADA. Fica para a sessão principal (apply_migration serie_auto_etapa1_2026_11_01). Idempotente: create if not exists /
-- drop+create de policy. Sem ela nada quebra: o passe responde { ready: false } quando o interruptor estiver ligado, e com o
-- interruptor desligado (SERIE_AUTO_ENABLED=false) o passe nem abre o banco.
--
-- RLS: ligado. anon não tem NENHUM privilégio. authenticated só SELECT das PRÓPRIAS linhas (a Etapa 2 mostra o cartão "Minha série").
-- Toda escrita é pela chave de serviço (o cron) — nenhuma policy de escrita existe.

create table if not exists public.serie_auto (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  theme text not null check (char_length(theme) between 1 and 200),
  -- MVP: Seedance 1.5 (desenho §1). Outro motor = Etapa 3, com a régua dele.
  engine text not null default 'seedance' check (engine in ('seedance')),
  duration smallint not null default 60 check (duration in (35, 60, 90)),
  language text not null default 'en' check (language ~ '^[a-z]{2}$'),
  -- 0 = domingo … 6 = sábado (como Date.getUTCDay); padrão segunda 10:00 UTC (07:00 BRT)
  weekday smallint not null default 1 check (weekday between 0 and 6),
  hour_utc smallint not null default 10 check (hour_utc between 0 and 23),
  next_run_at timestamptz,
  -- a ficha canônica do personagem (do episódio 1, determinística). Gravada uma vez; o cron NUNCA sobrescreve ficha existente.
  ficha jsonb,
  source_video_id uuid,
  source_script text,
  anchor text,
  episodes_delivered integer not null default 0,
  -- o episódio 1 é o filme de origem; o primeiro automático é o 2
  last_episode_seq integer not null default 1,
  last_episode_at timestamptz,
  last_episode_video_id uuid,
  last_episode_idea text,
  consecutive_skips smallint not null default 0,
  pause_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists serie_auto_due on public.serie_auto (status, next_run_at) where status = 'active';
create index if not exists serie_auto_user on public.serie_auto (user_id, created_at desc);

create table if not exists public.serie_auto_episodios (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references public.serie_auto (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- semana ISO-8601 ('2026-W45'): a idempotência é por (série, semana)
  week_key text not null check (week_key ~ '^[0-9]{4}-W[0-9]{2}$'),
  seq integer not null,
  attempt smallint not null default 1 check (attempt between 1 and 10),
  status text not null default 'pending' check (status in ('pending', 'dispatched', 'delivered', 'failed', 'skipped')),
  generation_id text,
  idea text,
  credits_cost integer,
  render_id text,
  video_id uuid,
  error text,
  started_at timestamptz not null default now(),
  dispatched_at timestamptz,
  finished_at timestamptz,
  email_sent_at timestamptz,
  -- a trava anti-duplo-despacho: a mesma semana da mesma série só nasce uma vez por tentativa (23505 = outra passada chegou antes)
  constraint serie_auto_episodios_semana_unique unique (serie_id, week_key, attempt)
);
create unique index if not exists serie_auto_episodios_generation_unique on public.serie_auto_episodios (generation_id) where generation_id is not null;
create index if not exists serie_auto_episodios_open on public.serie_auto_episodios (status, started_at) where status in ('pending', 'dispatched');
create index if not exists serie_auto_episodios_serie on public.serie_auto_episodios (serie_id, week_key);

alter table public.serie_auto enable row level security;
alter table public.serie_auto_episodios enable row level security;
revoke all on table public.serie_auto from anon, authenticated, public;
revoke all on table public.serie_auto_episodios from anon, authenticated, public;
grant select on table public.serie_auto to authenticated;
grant select on table public.serie_auto_episodios to authenticated;

drop policy if exists serie_auto_select_own on public.serie_auto;
create policy serie_auto_select_own on public.serie_auto for select to authenticated using (user_id = auth.uid());
drop policy if exists serie_auto_episodios_select_own on public.serie_auto_episodios;
create policy serie_auto_episodios_select_own on public.serie_auto_episodios for select to authenticated using (user_id = auth.uid());
