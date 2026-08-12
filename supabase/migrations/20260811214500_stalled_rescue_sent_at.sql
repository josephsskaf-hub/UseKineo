-- KINEO-STALLED-RESCUE-ORPHAN-2026-08-11 — carimbo temporal da campanha
-- admin/send-stalled-rescue, para que ela participe da supressao cruzada de 24h.
--
-- Ja aplicada em producao via MCP em 11/08/2026; este arquivo existe para que a
-- coluna sobreviva a um `db reset` e a qualquer ambiente novo. Mesmo motivo,
-- mesma forma e mesmo precedente de 20260805235500_post_nudge_sent_at.sql, que
-- registra: "a tabela posted_shorts foi criada fora do versionamento em 31/07 e
-- ate hoje nao tem DDL no repo - o mesmo buraco, uma vez so, ja basta".
--
-- POR QUE ESTE ARQUIVO E OBRIGATORIO, E NAO ZELO:
-- lib/lifecycle/suppression.ts seleciona PROFILE_TIMESTAMP_COLUMNS inteira, de
-- uma vez, para TODOS os jobs de ciclo de vida, e falha FECHADA. Num ambiente
-- onde esta coluna nao exista, a consulta inteira retorna erro, `degraded` vira
-- true e os 8 jobs suprimem a coorte toda - o e-mail da casa inteira cala, com
-- um unico console.error. O custo de esquecer esta migracao nao e esta campanha
-- ficar sem carimbo: e o lifecycle inteiro parar em silencio.
--
-- Aditiva e anulavel: NULL = nunca recebeu, exatamente como as outras 7 colunas
-- datadas. Nenhuma linha existente muda de comportamento.
alter table public.profiles
  add column if not exists stalled_rescue_sent_at timestamptz;

comment on column public.profiles.stalled_rescue_sent_at is
  'Quando o e-mail da campanha send-stalled-rescue REALMENTE saiu. Participa da supressao cruzada de 24h (lib/lifecycle/suppression.ts). O boolean stalled_rescue_emailed continua sendo a flag de idempotencia vitalicia; esta coluna e o carimbo temporal.';
