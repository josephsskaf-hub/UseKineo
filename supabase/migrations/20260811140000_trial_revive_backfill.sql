-- KINEO-TRIAL-REVIVE-RACE-2026-08-11 — BACKFILL DAS VÍTIMAS JÁ PRESAS
--
-- POR QUE ESTA MIGRAÇÃO EXISTE (2ª revisão adversarial, defeito NOVO-1):
-- a correção em lib/reverseTrial.ts só age em estornos FUTUROS. As contas que
-- já foram queimadas são inalcançáveis por código, e não por descuido:
-- recordReverseTrialRefundForRender apaga a linha de `trial_debit_ledger`
-- (DELETE ... RETURNING) ANTES de olhar o status. Nos estornos de 09–11/08 ela
-- apagou a linha, viu 'downgraded' e retornou 'not_counted'. Hoje não há linha
-- no ledger para reprocessar, e `refund_render_credits` já carimbou
-- `refunded_at`, então `refundRenderCredits` devolve 0 e nunca mais chama a
-- contabilidade. Sem este SQL, o commit conserta o futuro e abandona as vítimas
-- que o motivaram.
--
-- O QUE ACONTECEU COM ESSAS CONTAS (medido em 11/08, produção):
-- o Creatomate recusou todo render entre 09/08 16:21Z e 11/08 02:00Z. Cada
-- recusa debitou créditos, o teto de 40 disparou e o cron trial-downgrade
-- (de hora em hora, :55) rebaixou a conta em 26–55 min. O refund-sweep só varre
-- débitos com mais de 2h e rodou 2h35–3h36 DEPOIS — sempre tarde demais. As
-- pessoas receberam os créditos de volta e continuaram fora do trial, com
-- trial_credits_used = 40 travado por créditos que já não devem nada.
-- 6 das 7 nunca receberam UM vídeo.
--
-- ⚠️ AS GUARDAS ABAIXO SÃO AS MESMAS SEIS DO CÓDIGO, TRADUZIDAS PARA SQL.
-- Se divergirem, o código é a fonte da verdade — esta migração roda uma vez.
--   1. trial_status = 'downgraded'            (só quem está preso)
--   2. trial_ends_at > now()                  (relógio vivo — prazo é prazo)
--   3. has_paid = false AND plan IN ('','free') (nunca rebaixar quem paga)
--   4. video_credits > 0                      (não criar trial zumbi)
--   5. granted - used <= 0                    (o cron não revogou crédito;
--                                              morte por TETO, não por relógio)
--   6. existe estorno de verdade no ledger contábil
--
-- IDEMPOTENTE: roda duas vezes sem efeito extra — depois da primeira passada o
-- status deixa de ser 'downgraded' e a guarda 1 não casa mais.
--
-- REVERSÍVEL: o bloco comentado no fim restaura o estado anterior a partir de
-- `trial_revive_backfill_20260811`, que é gravada ANTES de qualquer UPDATE.

BEGIN;

-- ── 1) Fotografia do estado atual, para auditoria e rollback ────────────────
CREATE TABLE IF NOT EXISTS trial_revive_backfill_20260811 (
  user_id                uuid PRIMARY KEY,
  old_trial_status       text,
  old_trial_credits_used integer,
  old_trial_downgraded_at timestamptz,
  new_trial_credits_used integer,
  credits_refunded       integer,
  credits_kept           integer,
  videos_delivered       integer,
  captured_at            timestamptz NOT NULL DEFAULT now()
);

WITH vitimas AS (
  SELECT
    p.id,
    p.trial_status,
    p.trial_credits_used,
    p.trial_downgraded_at,
    -- O consumo HONESTO é o que foi debitado e NÃO devolvido. Para quem só
    -- teve renders recusados isso dá 0; para quem entregou algum vídeo antes
    -- do apagão, sobra exatamente o que aquele vídeo custou. Nunca zeramos às
    -- cegas: o crédito legitimamente gasto continua gasto.
    COALESCE((
      SELECT sum(d.amount) FROM credit_debits d
      WHERE d.user_id = p.id AND d.refunded_at IS NULL
    ), 0) AS gasto_liquido,
    COALESCE((
      SELECT sum(d.amount) FROM credit_debits d
      WHERE d.user_id = p.id AND d.refunded_at IS NOT NULL
    ), 0) AS estornado,
    (SELECT count(*) FROM videos v WHERE v.user_id = p.id) AS vids
  FROM profiles p
  WHERE p.trial_status = 'downgraded'                                  -- guarda 1
    AND p.trial_ends_at > now()                                        -- guarda 2
    AND COALESCE(p.has_paid, false) = false                            -- guarda 3
    AND COALESCE(p.plan, 'free') IN ('', 'free')                       -- guarda 3
    AND COALESCE(p.video_credits, 0) > 0                               -- guarda 4
    AND GREATEST(0, COALESCE(p.trial_credits_granted, 0)
                  - COALESCE(p.trial_credits_used, 0)) = 0             -- guarda 5
    AND EXISTS (                                                       -- guarda 6
      SELECT 1 FROM credit_debits d
      WHERE d.user_id = p.id AND d.refunded_at IS NOT NULL
    )
)
INSERT INTO trial_revive_backfill_20260811 (
  user_id, old_trial_status, old_trial_credits_used, old_trial_downgraded_at,
  new_trial_credits_used, credits_refunded, credits_kept, videos_delivered
)
SELECT
  id, trial_status, trial_credits_used, trial_downgraded_at,
  LEAST(gasto_liquido, COALESCE(trial_credits_used, 0)),
  estornado, gasto_liquido, vids
FROM vitimas
ON CONFLICT (user_id) DO NOTHING;

-- ── 2) A ressurreição ──────────────────────────────────────────────────────
UPDATE profiles p
SET trial_status        = 'active',
    trial_credits_used  = b.new_trial_credits_used,
    -- Sai junto pelo mesmo motivo do código: uma linha 'active' com carimbo de
    -- rebaixamento é uma contradição. O valor antigo está preservado na tabela
    -- de backfill, que é o único registro persistente do primeiro rebaixamento.
    trial_downgraded_at = NULL
FROM trial_revive_backfill_20260811 b
WHERE p.id = b.user_id
  AND p.trial_status = 'downgraded';   -- CAS: não escreve sobre quem mudou

-- ── 3) Reabre o e-mail de perda ────────────────────────────────────────────
-- O dedupe de trial_emails_log é PK(user_id, email_kind) e não expira. Estas
-- contas receberam "Here's what you just lost access to" enquanto o trial
-- ressuscitava. Sem este DELETE, quando elas morrerem DE VERDADE o e-mail de
-- maior aversão à perda do funil — o único que fala com quem já provou
-- intenção — nunca sairia. Só este kind: D5/D10/extensão seguem disparo único.
DELETE FROM trial_emails_log l
USING trial_revive_backfill_20260811 b
WHERE l.user_id = b.user_id
  AND l.email_kind = 'downgraded_loss';

-- ── 4) Trilha de auditoria, no mesmo formato do caminho de código ───────────
INSERT INTO events (user_id, name, path, metadata)
SELECT
  b.user_id,
  'trial_cap_refunded',
  '/supabase/migrations/20260811140000_trial_revive_backfill',
  jsonb_build_object(
    'revived', true,
    'from_status', b.old_trial_status,
    'credits_used', b.new_trial_credits_used,
    'credits_returned', b.credits_refunded,
    'previous_downgraded_at', b.old_trial_downgraded_at,
    'cap', 40,
    'source', 'backfill_KINEO-TRIAL-REVIVE-RACE-2026-08-11',
    'ab_cohort_note', 'revived_after_provider_failure'
  )
FROM trial_revive_backfill_20260811 b;

COMMIT;

-- ── ROLLBACK (colar e rodar se preciso) ────────────────────────────────────
-- UPDATE profiles p
-- SET trial_status = b.old_trial_status,
--     trial_credits_used = b.old_trial_credits_used,
--     trial_downgraded_at = b.old_trial_downgraded_at
-- FROM trial_revive_backfill_20260811 b
-- WHERE p.id = b.user_id;
