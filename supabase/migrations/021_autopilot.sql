-- KINEO-AUTOPILOT-2026-07-26 — fundação do Kineo Autopilot.
--
-- O QUE ISSO CRIA:
--   public.channels             — N canais YouTube por usuário (hoje é 1 só,
--                                 guardado em profiles.youtube_tokens JSONB).
--   public.autopilot_schedules  — a agenda: 1 Short por canal por dia.
--   public.autopilot_runs       — o ledger de execuções do cron, com a trava
--                                 anti-duplo-post.
--
-- ⚠️ APLICAR NO SUPABASE ANTES DO DEPLOY. O código novo (cron + lib/autopilot)
--    lê estas tabelas; sem elas o cron simplesmente não acha schedules e faz
--    no-op — não quebra nada que já roda hoje, mas o produto não existe.
--
-- IDEMPOTENTE DE PONTA A PONTA (`create table if not exists`, `add column if
-- not exists`, `drop policy if exists` antes de `create policy`). Motivo: como
-- registrado na 020, supabase/migrations DIVERGE da produção (várias colunas
-- foram aplicadas à mão). Esta migration precisa poder rodar N vezes sem erro.
--
-- RLS: o cron roda com service_role, que BYPASSA RLS por definição. As policies
-- abaixo existem para o acesso do próprio dono (UI/dashboard), defense-in-depth,
-- no mesmo estilo da 012_characters / 017_credit_render_intent.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. public.channels — conexões de canal, uma linha por canal conectado.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.channels (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  provider            text not null default 'youtube',
  external_channel_id text,
  title               text,
  thumbnail_url       text,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamptz,
  scopes              text,
  connected_at        timestamptz not null default now(),
  revoked_at          timestamptz
);

-- Colunas adicionadas de forma tolerante caso a tabela já exista numa forma
-- anterior (mesma defensiva da 020).
alter table public.channels add column if not exists provider            text not null default 'youtube';
alter table public.channels add column if not exists external_channel_id text;
alter table public.channels add column if not exists title               text;
alter table public.channels add column if not exists thumbnail_url       text;
alter table public.channels add column if not exists access_token        text;
alter table public.channels add column if not exists refresh_token       text;
alter table public.channels add column if not exists token_expires_at    timestamptz;
alter table public.channels add column if not exists scopes              text;
alter table public.channels add column if not exists connected_at        timestamptz not null default now();
alter table public.channels add column if not exists revoked_at          timestamptz;

-- A unique pedida no contrato: (user_id, provider, external_channel_id).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'channels_user_provider_external_key'
      and conrelid = 'public.channels'::regclass
  ) then
    alter table public.channels
      add constraint channels_user_provider_external_key
      unique (user_id, provider, external_channel_id);
  end if;
end
$$;

-- ⚠️ A constraint acima NÃO protege as linhas do backfill. No Postgres, NULLs
-- são distintos entre si numa unique: com external_channel_id IS NULL o mesmo
-- usuário poderia acumular infinitas linhas 'youtube'. O backfill legado NÃO
-- tem o channel id (profiles.youtube_tokens só guarda tokens), então ele nasce
-- NULL. Este índice em coalesce() é o que realmente garante "um canal legado
-- por usuário" e torna o backfill re-executável.
create unique index if not exists channels_user_provider_external_coalesced_idx
  on public.channels (user_id, provider, coalesce(external_channel_id, ''));

create index if not exists channels_user_idx
  on public.channels (user_id)
  where revoked_at is null;

alter table public.channels enable row level security;

drop policy if exists "channels_select_own" on public.channels;
create policy "channels_select_own" on public.channels
  for select using (auth.uid() = user_id);

drop policy if exists "channels_update_own" on public.channels;
create policy "channels_update_own" on public.channels
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "channels_delete_own" on public.channels;
create policy "channels_delete_own" on public.channels
  for delete using (auth.uid() = user_id);

-- Sem policy de INSERT de propósito: quem escreve tokens é o callback OAuth,
-- que roda com service_role (bypassa RLS). Mesma decisão da 017.

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. public.autopilot_schedules — a agenda por canal.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.autopilot_schedules (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  channel_id     uuid not null references public.channels(id) on delete cascade,
  enabled        boolean not null default true,
  niche          text,
  tone           text,
  language       text not null default 'en',
  -- ENGINE: default 'fast' (o motor BARATO, ~$0.02-0.05/render). NUNCA
  -- 'cinematic_hollywood' (~$8.90-10.20) nem 'cinematic_ai' (~$1.56-2.34):
  -- 90 renders/mês de Hollywood custam $800+ num plano de $299 = prejuízo.
  -- O cron aplica o mesmo teto server-side (lib/autopilot/config.ts), então
  -- um UPDATE direto nesta coluna NÃO consegue escalar o custo.
  engine         text not null default 'fast',
  post_hour_utc  smallint not null default 14 check (post_hour_utc between 0 and 23),
  posts_per_day  smallint not null default 1 check (posts_per_day between 1 and 3),
  privacy_status text not null default 'public' check (privacy_status in ('public', 'private', 'unlisted')),
  last_run_at    timestamptz,
  next_run_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.autopilot_schedules add column if not exists enabled        boolean not null default true;
alter table public.autopilot_schedules add column if not exists niche          text;
alter table public.autopilot_schedules add column if not exists tone           text;
alter table public.autopilot_schedules add column if not exists language       text not null default 'en';
alter table public.autopilot_schedules add column if not exists engine         text not null default 'fast';
alter table public.autopilot_schedules add column if not exists post_hour_utc  smallint not null default 14;
alter table public.autopilot_schedules add column if not exists posts_per_day  smallint not null default 1;
alter table public.autopilot_schedules add column if not exists privacy_status text not null default 'public';
alter table public.autopilot_schedules add column if not exists last_run_at    timestamptz;
alter table public.autopilot_schedules add column if not exists next_run_at    timestamptz;
alter table public.autopilot_schedules add column if not exists created_at     timestamptz not null default now();
alter table public.autopilot_schedules add column if not exists updated_at     timestamptz not null default now();

-- ESTE é o índice que o cron usa para achar schedules devidas. Parcial em
-- enabled porque o cron NUNCA olha schedules desligadas.
create index if not exists autopilot_schedules_due_idx
  on public.autopilot_schedules (next_run_at)
  where enabled = true;

create index if not exists autopilot_schedules_user_idx
  on public.autopilot_schedules (user_id);

alter table public.autopilot_schedules enable row level security;

drop policy if exists "autopilot_schedules_select_own" on public.autopilot_schedules;
create policy "autopilot_schedules_select_own" on public.autopilot_schedules
  for select using (auth.uid() = user_id);

drop policy if exists "autopilot_schedules_insert_own" on public.autopilot_schedules;
create policy "autopilot_schedules_insert_own" on public.autopilot_schedules
  for insert with check (auth.uid() = user_id);

drop policy if exists "autopilot_schedules_update_own" on public.autopilot_schedules;
create policy "autopilot_schedules_update_own" on public.autopilot_schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "autopilot_schedules_delete_own" on public.autopilot_schedules;
create policy "autopilot_schedules_delete_own" on public.autopilot_schedules
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. public.autopilot_runs — o ledger de execuções + a trava anti-duplo-post.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.autopilot_runs (
  id                 uuid primary key default gen_random_uuid(),
  schedule_id        uuid not null references public.autopilot_schedules(id) on delete cascade,
  channel_id         uuid references public.channels(id) on delete set null,
  user_id            uuid not null references auth.users(id) on delete cascade,
  -- A CHAVE DA IDEMPOTÊNCIA: o dia (UTC) e o slot do dia que esta execução
  -- representa. Ambos derivam do next_run_at AGENDADO (não de now()), então
  -- duas invocações concorrentes do cron calculam exatamente o mesmo par.
  scheduled_for_date date not null,
  slot               smallint not null default 0 check (slot between 0 and 2),
  status             text not null default 'pending'
                       check (status in ('pending','generating','uploading','succeeded','failed','skipped')),
  reason             text,
  topic              text,
  render_id          text,
  video_id           uuid,
  youtube_video_id   text,
  credits_charged    int,
  error              text,
  -- Lease do passe de PUBLICAÇÃO. A unique lá embaixo impede um segundo RENDER,
  -- mas não impediria duas PUBLICAÇÕES do mesmo render se o cron rodasse duas
  -- vezes em paralelo. O cron toma este lease com um UPDATE condicional antes de
  -- chamar o YouTube; o perdedor da corrida recebe 0 linhas e desiste.
  publish_lock_at    timestamptz,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz
);

alter table public.autopilot_runs add column if not exists channel_id         uuid;
alter table public.autopilot_runs add column if not exists scheduled_for_date date;
alter table public.autopilot_runs add column if not exists slot               smallint not null default 0;
alter table public.autopilot_runs add column if not exists reason             text;
alter table public.autopilot_runs add column if not exists topic              text;
alter table public.autopilot_runs add column if not exists render_id          text;
alter table public.autopilot_runs add column if not exists video_id           uuid;
alter table public.autopilot_runs add column if not exists youtube_video_id   text;
alter table public.autopilot_runs add column if not exists credits_charged    int;
alter table public.autopilot_runs add column if not exists error              text;
alter table public.autopilot_runs add column if not exists publish_lock_at    timestamptz;
alter table public.autopilot_runs add column if not exists started_at         timestamptz not null default now();
alter table public.autopilot_runs add column if not exists finished_at        timestamptz;

-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║ A CONSTRAINT MAIS IMPORTANTE DESTE ARQUIVO.                             ║
-- ║                                                                         ║
-- ║ O cron CLAIMA antes de trabalhar: ele INSERE a linha de run ANTES de    ║
-- ║ gastar crédito ou chamar provider. Se a Vercel disparar o mesmo cron    ║
-- ║ duas vezes na mesma hora (retry, redeploy, invocação manual), o segundo ║
-- ║ INSERT bate 23505 aqui e o loop trata como no-op. Sem esta unique, um   ║
-- ║ duplo disparo = dois renders cobrados e DOIS vídeos publicados no canal ║
-- ║ do cliente no mesmo dia.                                                ║
-- ║                                                                         ║
-- ║ Inclui `slot` porque posts_per_day vai até 3: sem ele a agenda de 3x/   ║
-- ║ dia ficaria travada em 1 post/dia. slot é derivado deterministicamente  ║
-- ║ da hora agendada, então NÃO enfraquece a trava.                         ║
-- ╚═════════════════════════════════════════════════════════════════════════╝
create unique index if not exists autopilot_runs_schedule_day_slot_key
  on public.autopilot_runs (schedule_id, scheduled_for_date, slot);

-- Fila do segundo passo (publicação): runs que já têm render em voo.
create index if not exists autopilot_runs_pending_publish_idx
  on public.autopilot_runs (started_at)
  where status in ('generating', 'uploading');

create index if not exists autopilot_runs_user_started_idx
  on public.autopilot_runs (user_id, started_at desc);

-- Anti-repetição de tema: o cron lê os últimos N topics desta schedule.
create index if not exists autopilot_runs_schedule_started_idx
  on public.autopilot_runs (schedule_id, started_at desc);

alter table public.autopilot_runs enable row level security;

drop policy if exists "autopilot_runs_select_own" on public.autopilot_runs;
create policy "autopilot_runs_select_own" on public.autopilot_runs
  for select using (auth.uid() = user_id);

-- Sem INSERT/UPDATE para o usuário: só o cron (service_role) escreve runs.
-- Deixar o dono editar o próprio ledger de execução permitiria forjar
-- "succeeded" ou apagar o claim que impede o duplo post.

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. BACKFILL — ninguém perde a conexão YouTube que já tem.
-- ═══════════════════════════════════════════════════════════════════════════
-- ONDE OS TOKENS VIVEM HOJE (verificado no repo, não chutado):
--   migration 010_youtube_tokens.sql  → ALTER TABLE profiles ADD COLUMN
--                                        youtube_tokens JSONB
--   lib/youtube.ts saveYouTubeTokens  → profiles.update({ youtube_tokens })
--   lib/youtube.ts loadYouTubeTokens  → profiles.select('youtube_tokens')
--
-- FORMATO DO JSONB (interface YouTubeTokens em lib/youtube.ts):
--   { access_token: string, refresh_token: string,
--     expires_at: number  /* UNIX MILISSEGUNDOS */, scope: string }
--
-- ⚠️ expires_at é em MILISSEGUNDOS (Date.now() + expires_in*1000), por isso o
--    to_timestamp(... / 1000.0). Converter como segundos jogaria o vencimento
--    para 1970 e forçaria um refresh desnecessário em todo canal migrado.
--
-- external_channel_id fica NULL: o JSONB legado NÃO guarda o id do canal.
-- lib/youtubeChannels.ts preenche esse campo na primeira chamada à YouTube
-- Data API (fetchChannelStats) — até lá o índice coalesced acima é o que
-- garante uma única linha legada por usuário.
insert into public.channels (
  user_id, provider, external_channel_id, access_token, refresh_token,
  token_expires_at, scopes, connected_at
)
select
  p.id,
  'youtube',
  null,
  p.youtube_tokens ->> 'access_token',
  p.youtube_tokens ->> 'refresh_token',
  case
    when (p.youtube_tokens ->> 'expires_at') ~ '^[0-9]+$'
      then to_timestamp((p.youtube_tokens ->> 'expires_at')::bigint / 1000.0)
    else null
  end,
  p.youtube_tokens ->> 'scope',
  now()
from public.profiles p
where p.youtube_tokens is not null
  and jsonb_typeof(p.youtube_tokens) = 'object'
  and coalesce(p.youtube_tokens ->> 'refresh_token', '') <> ''
  -- Re-executável: se o backfill já rodou, nada é reinserido. O NOT EXISTS
  -- cobre o caso normal; o `on conflict do nothing` (sem alvo, para não
  -- depender de inferência sobre índice por expressão) cobre a corrida.
  and not exists (
    select 1 from public.channels c
    where c.user_id = p.id and c.provider = 'youtube'
  )
on conflict do nothing;
