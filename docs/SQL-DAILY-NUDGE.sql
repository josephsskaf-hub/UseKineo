-- KINEO-DAILY-NUDGE-2026-08-04 — cron/send-credits-back ("your 3 free Shorts are back")
--
-- POR QUE ESTA COLUNA EXISTE
-- ─────────────────────────
-- Retenção D7 medida em 04/08/2026: 0,4%. Dos 205 usuários que geraram vídeo em
-- 30 dias, 200 geraram SÓ no dia do cadastro. O free tier renova 3 vídeos a cada
-- 24h (janela rolante — app/api/compose/route.ts, FREE_FAST_PREVIEW_LIMIT = 3,
-- FREE_FAST_WINDOW_MS = 24h) e NINGUÉM SABE DISSO. O e-mail avisa.
--
-- Diferente dos outros carimbos de lifecycle (`cap_hit_sent_at`,
-- `video_rescue_sent_at`, ...), este NÃO é "1 por usuário para sempre": o
-- objetivo é hábito diário, então o job pode reenviar depois de
-- CREDITS_BACK_COOLDOWN_DAYS = 3. Por isso é timestamptz e é LIDO como janela,
-- nunca como boolean.
--
-- A coluna também entra em lib/lifecycle/suppression.ts
-- (PROFILE_TIMESTAMP_COLUMNS), para que os outros 5 jobs de e-mail enxerguem
-- este envio dentro da janela cruzada de 24h.
--
-- ADITIVO. Nada de DROP, nada de ALTER destrutivo. Idempotente.
-- Aplicado em 04/08/2026 via MCP Supabase (projeto cqqukkvjjrguayiyjvhh),
-- migration `kineo_daily_nudge_credits_back_stamp`.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_back_sent_at timestamptz;

-- O job filtra por `credits_back_sent_at is null OR < now() - 3 days` em cima de
-- toda a tabela de perfis; o índice mantém isso barato conforme a base cresce.
CREATE INDEX IF NOT EXISTS idx_profiles_credits_back_sent_at
  ON public.profiles (credits_back_sent_at);
