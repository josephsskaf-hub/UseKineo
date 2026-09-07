-- KINEO-DODO-2026-09-07 — trilho Dodo Payments (UPI / RuPay / Pix)
--
-- NÃO APLICADA AO BANCO NESTA ROTAÇÃO (07/09). Aplicar quando o fundador
-- colar as chaves DODO_* na Vercel — o webhook /api/dodo/webhook responde
-- 500 "Webhook idempotency unavailable" até esta tabela existir, de
-- propósito: concessão sem livro de idempotência é como se concede duas vezes.
--
-- 1) dodo_events: o guard de idempotência do webhook. Uma linha por
--    `webhook-id` (Standard Webhooks; estável entre reenvios). Inserida ANTES
--    da concessão e APAGADA se a concessão estourar, para o reenvio passar.
--    Mesmo papel de public.stripe_events (id text primary key, received_at).
create table if not exists public.dodo_events (
  id text primary key,                 -- header webhook-id
  event_type text,                     -- payment.succeeded, subscription.active, ...
  received_at timestamptz default now()
);

-- Deny-all para o navegador (padrão events_lockdown_service_role_only, 27/08):
-- RLS ligado, NENHUMA policy, grants públicos removidos. Só a service role
-- (que ignora RLS) escreve — e é só o webhook que a usa.
alter table public.dodo_events enable row level security;
revoke all privileges on table public.dodo_events from public;
revoke all privileges on table public.dodo_events from anon;
revoke all privileges on table public.dodo_events from authenticated;

-- 2) profiles.dodo_subscription_id: o id da assinatura na Dodo, para a
--    concessão ser idempotente por assinatura (reenvio do mesmo id não soma
--    crédito de novo) e para cancelamento/expiração acharem a conta certa.
--    Espelho de paypal_subscription_id / stripe_subscription_id. Sem esta
--    coluna, subscription.active falha com 42703 e o webhook pede reenvio —
--    fail-closed, como o autopilot_pilot da Stripe.
alter table public.profiles
  add column if not exists dodo_subscription_id text;

create index if not exists profiles_dodo_subscription_id_idx
  on public.profiles (dodo_subscription_id)
  where dodo_subscription_id is not null;
