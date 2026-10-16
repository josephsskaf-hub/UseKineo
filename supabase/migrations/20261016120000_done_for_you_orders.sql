-- KINEO-PACOTE-3-FILMES-1610 — pedidos do pacote "3 filmes feitos por nós" (US$ 19, pagamento único).
-- NÃO APLICADA: o coordenador aplica. Sem esta tabela a página /done-for-you mostra "temporarily unavailable" ANTES de
-- qualquer cobrança (a rota do pedido falha e o checkout nunca abre), e o /admin/pedidos mostra "tabela ausente".
--
-- Ciclo: pending_payment (o briefing foi salvo, a Stripe ainda não confirmou) → paid (webhook) → in_production →
-- delivered (/admin). Só o servidor escreve (service role); o dono lê o próprio pedido.
-- Idempotência do webhook: UPDATE guardado por status = 'pending_payment' + stripe_session_id único.

create table if not exists public.done_for_you_orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  email               text,
  topic               text not null check (char_length(topic) between 1 and 1000),
  language            text not null check (char_length(language) between 2 and 8),
  style               text check (style is null or char_length(style) <= 200),
  status              text not null default 'pending_payment'
                        check (status in ('pending_payment', 'paid', 'in_production', 'delivered')),
  price_usd_minor     integer not null default 1900,
  stripe_session_id   text unique,
  amount_total        integer,
  currency            text,
  created_at          timestamptz not null default now(),
  paid_at             timestamptz,
  in_production_at    timestamptz,
  delivered_at        timestamptz,
  delivered_by        text,
  delivery_email      text check (delivery_email is null or delivery_email in ('sent', 'failed', 'skipped'))
);

create index if not exists done_for_you_orders_status_paid on public.done_for_you_orders (status, paid_at desc);
create index if not exists done_for_you_orders_user on public.done_for_you_orders (user_id, created_at desc);

alter table public.done_for_you_orders enable row level security;

drop policy if exists done_for_you_orders_select_own on public.done_for_you_orders;
create policy done_for_you_orders_select_own on public.done_for_you_orders
  for select to authenticated using (auth.uid() = user_id);

revoke all on public.done_for_you_orders from anon;
revoke insert, update, delete on public.done_for_you_orders from authenticated;
grant select on public.done_for_you_orders to authenticated;
grant select, insert, update on public.done_for_you_orders to service_role;
