-- KINEO-EMAIL-QUOTA-2026-08-17
--
-- POR QUE ISSO EXISTE: o check-up de fornecedores de 17/08 fechou com a linha
-- "nao consegui medir: total real de envios do Resend" pelo 5o dia seguido. O
-- unico ledger de e-mail da empresa e `trial_emails_log`, que so ve os 6 kinds
-- do trial; os crons send-video-ready / send-recovery / send-reminders /
-- send-activation-nudge / send-post-nudge / send-welcome enviam sem registrar
-- NADA. No dia recorde (97 cadastros) o piso medido foi 72 de 100 e-mails do
-- plano free — ou seja, o teto pode ter estourado ontem e nao existe linha
-- nenhuma que prove ou negue.
--
-- E um estouro de cota do Resend e a pior classe de falha que esta operacao
-- tem: o e-mail que morre e justamente o de conversao (D2 "seu trial acaba
-- hoje", D3, D5 50% off, resgate de checkout), a resposta e um 429 que ninguem
-- le, e o funil continua bonito porque `trial_lifecycle_email_sent` so e
-- gravado no ramo `res.ok`. Falha silenciosa, sem grafico.
--
-- ESTA TABELA E O DENOMINADOR. Uma linha por TENTATIVA de envio (não por
-- sucesso), de qualquer remetente que passe pelo gate de lib/email/quota.ts.
--
-- DECISOES DE ESQUEMA, todas pagas com erro anterior deste repo:
--   * SEM FOREIGN KEY em user_id. A licao esta no commit 1259f48 (instrumento
--     do checkout): conta apagada derruba o INSERT inteiro pela FK e leva junto
--     o dado que era o ponto. Aqui o dado que importa e a CONTAGEM DO DIA, e
--     ela nao pode depender da existencia do perfil.
--   * `ok` e nullable de proposito: NULL = tentativa cujo desfecho nao foi
--     observado (crash entre o fetch e o log). Contar NULL como sucesso seria
--     inventar cota gasta; contar como falha seria liberar cota que talvez nao
--     exista. Fica explicito.
--   * `http_status` cru, sem traducao. 429 e o unico numero que importa e ele
--     tem de aparecer sem interpretacao no meio.
--   * `priority` como texto e nao smallint: o relatorio le esta tabela direto
--     no SQL do dia e "revenue" nao precisa de legenda.
--
-- Aditiva e reversivel: nenhuma tabela existente e tocada, nenhum caminho de
-- envio depende dela para funcionar (o gate falha ABERTO por construcao).

create table if not exists public.email_send_log (
  id bigserial primary key,
  sent_at timestamptz not null default now(),
  -- ex.: 'trial_d2_ending_soon', 'checkout_recovery', 'video_ready'
  kind text not null,
  -- 'revenue' | 'product' | 'growth' — ver lib/email/quota.ts
  priority text not null,
  -- sem FK de proposito (ver cabecalho)
  user_id uuid,
  -- true = Resend aceitou (2xx) e a cota do dia FOI gasta
  -- false = Resend recusou (a cota nao conta, mas a tentativa conta pro alarme)
  -- null  = desfecho nao observado
  ok boolean,
  http_status integer,
  -- true quando o proprio gate recusou o envio para preservar a reserva dos
  -- e-mails de receita. Estas linhas NAO gastaram cota do Resend.
  yielded boolean not null default false,
  detail text
);

-- A unica consulta do caminho quente: "quantos e-mails aceitos hoje (UTC)".
create index if not exists email_send_log_sent_at_idx
  on public.email_send_log (sent_at desc);

-- Leitura do relatorio: quebra do dia por prioridade/kind.
--
-- ⚠️ `(sent_at::date)` NAO COMPILA. Esta migracao foi commitada as 13h de 17/08
-- com esse cast e o Postgres recusa: "42P17: functions in index expression must
-- be marked IMMUTABLE" — o cast de timestamptz para date depende do TimeZone da
-- sessao, logo e STABLE, nao IMMUTABLE. Consequencia real: a migracao ficou 3h
-- no repo SEM NUNCA TER SIDO APLICADA (to_regclass devolvia null as 13:50Z), e
-- o gate de cota inteiro estava inerte no dia em que o Resend estourou.
-- `at time zone 'UTC'` fixa o fuso no proprio indice e volta a ser IMMUTABLE.
-- O teto do Resend e diario em UTC, entao o UTC explicito e tambem o correto.
create index if not exists email_send_log_day_priority_idx
  on public.email_send_log (((sent_at at time zone 'UTC')::date), priority);

-- Tabela de servico: so o service role escreve e le. RLS LIGADO sem policy
-- nenhuma = anon key nao ve nada (o advisor de 13/08 pegou exatamente uma
-- tabela nova sem RLS; nao repetir).
alter table public.email_send_log enable row level security;

comment on table public.email_send_log is
  'KINEO-EMAIL-QUOTA-2026-08-17 — ledger central de tentativas de envio de e-mail. Denominador da cota diaria do Resend. Escrito por lib/email/quota.ts.';
