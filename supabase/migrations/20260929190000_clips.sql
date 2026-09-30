-- KINEO-CLIPES-2026-09-29 — tabela do clipe avulso (/clips). NÃO APLICADA: o CEO aplica depois do ok.
--
-- Por que tabela própria (e não `videos` nem `events`):
--   · `videos` é o FILME: 40+ leituras (painel, funil, e-mails "você fez N vídeos", /history, /v/, wall, séries) contam
--     cada linha como filme narrado. Um clipe de 5 s ali inflaria "primeiro vídeo", ativação e campanhas.
--   · `events` guarda a posse do Animate por assinatura (lib/animate/claim.ts), mas não tem estado mutável nem
--     unicidade por pedido. O clipe precisa de UMA linha que muda de estado (pending → processing → done|failed) com
--     trava de idempotência no banco.
-- Dinheiro continua no ledger de sempre: credit_debits.render_id = billing_reference ('clips-<uuid>'), débito por
-- debit_video_credits e estorno por refund_render_credits (idempotente).
--
-- Escrita só pelo servidor (service_role, que ignora RLS). O dono só LÊ as próprias linhas.

create table if not exists public.clips (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  idempotency_key   text not null check (char_length(idempotency_key) between 8 and 100),
  fingerprint       text not null,
  billing_reference text not null unique check (billing_reference like 'clips-%'),
  engine            text not null check (engine in ('hollywood','kling','seedance','veo','h3','omni','s25')),
  mode              text not null check (mode in ('text','image')),
  model             text not null,
  seconds           integer not null check (seconds between 1 and 30),
  aspect            text not null check (aspect in ('9:16','16:9','1:1','image')),
  prompt            text not null check (char_length(prompt) <= 1000),
  image_url         text,
  credits           integer not null check (credits > 0),
  fal_usd           numeric(8,4) not null default 0,
  status            text not null default 'pending' check (status in ('pending','processing','done','failed')),
  fal_request_id    text,
  video_url         text,
  failure_reason    text,
  credits_refunded  integer not null default 0,
  created_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  settled_at        timestamptz,
  -- A trava contra dois débitos do MESMO pedido (mesma aba reenviando, duplo clique, retry de rede).
  unique (user_id, idempotency_key)
);

create index if not exists clips_user_created_idx on public.clips (user_id, created_at desc);
-- A rede do cron (sweepClipJobs) só olha o que está no meio do caminho.
create index if not exists clips_open_created_idx on public.clips (created_at) where status in ('pending','processing');

alter table public.clips enable row level security;

revoke all on public.clips from anon;
revoke all on public.clips from authenticated;
grant select on public.clips to authenticated;
grant select, insert, update, delete on public.clips to service_role;

drop policy if exists clips_select_own on public.clips;
create policy clips_select_own on public.clips
  for select to authenticated
  using (auth.uid() = user_id);
