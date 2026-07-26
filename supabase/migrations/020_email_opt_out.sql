-- KINEO-UNSUBSCRIBE-2026-07-26 — CAN-SPAM §7704(a)(3)/(a)(5): até hoje NENHUM
-- email de marketing do Kineo tinha link de descadastro, header
-- List-Unsubscribe ou coluna de opt-out. 365 pessoas receberam o "avatar
-- launch" e 300 o "feature announce" sem saída — violação legal e o motivo de
-- a reputação do domínio usekineo.com estar queimando.
--
-- Esta migration cria o estado de opt-out que TODA rota de email passa a
-- respeitar (`.eq('email_opted_out', false)` em toda query de coorte).
--
-- IDEMPOTENTE de propósito: as 8 flags de email anteriores
-- (pack_offer_emailed, dfy_offer_emailed, abandon_emailed, free_upsell_emailed,
-- avatar_launch_emailed, feature_announce_emailed, ...) foram aplicadas À MÃO
-- em produção, então o banco real diverge do histórico de migrations. Tudo
-- aqui é `if not exists` e pode rodar quantas vezes for preciso.

alter table public.profiles
  add column if not exists email_opted_out boolean not null default false;

alter table public.profiles
  add column if not exists email_opted_out_at timestamptz;

-- Index PARCIAL em `false`: toda query de coorte filtra por
-- email_opted_out = false, e o conjunto opted-out tende a ser pequeno.
-- O índice parcial cobre exatamente o predicado usado e fica muito menor que
-- um índice cheio na coluna booleana.
create index if not exists profiles_email_opted_out_false_idx
  on public.profiles (id)
  where email_opted_out = false;
