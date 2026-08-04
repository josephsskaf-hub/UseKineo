-- docs/SQL-POST-TO-EARN.sql — KINEO-POST-TO-EARN-2026-08-04
--
-- POST TO EARN: a marca d'água deixa de ser imposto e vira MOEDA. Quem publica
-- o Short com o credit link e cola a URL ganha 3 créditos (≈1 dia de free,
-- custo real ~$0.30). Resolve três problemas com um só loop: retenção (D7 de
-- 0,4% ganha um motivo de voltar), distribuição (cada Short postado é um
-- outdoor) e prova social (o /wall enche sozinho).
--
-- ⚠️ ISTO MEXE COM CRÉDITOS = CUSTO REAL. Esta migração existe porque o
-- esquema atual NÃO consegue impedir a fraude óbvia:
--
--   `posted_shorts` tem UNIQUE (user_id, youtube_video_id) — dedupe POR
--   USUÁRIO. Ou seja: dez contas podem colar O MESMO vídeo e, se o crédito
--   fosse concedido a partir dessa tabela, o mesmo Short pagaria dez vezes.
--   Um "rewarded_at" solto em posted_shorts herdaria exatamente esse buraco.
--
-- Por isso a concessão mora numa tabela-livro própria, com dedupe GLOBAL:
--
--   post_to_earn_claims.youtube_video_id é UNIQUE no mundo inteiro.
--
-- Esse índice é a trava de idempotência: o INSERT do claim é a operação
-- atômica que autoriza o crédito. Quem perde a corrida recebe 23505 e NÃO
-- credita. Duas requisições simultâneas, dois deploys, um duplo-clique, um
-- retry de rede — todos convergem para uma única linha e um único pagamento.
--
-- PURAMENTE ADITIVO. Nenhum DROP, nenhum ALTER destrutivo, nenhum backfill.
-- Rodar duas vezes é inofensivo (IF NOT EXISTS em tudo, policies em DO block).
--
-- Quem escreve: app/api/posted-shorts/route.ts via lib/postToEarn.ts, sempre
-- com service role. Quem lê no cliente: ninguém — o usuário só vê o veredito
-- da resposta HTTP.

-- ── Livro-razão das concessões ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.post_to_earn_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Id do vídeo no YouTube, normalizado. É a chave da idempotência global.
  youtube_video_id text NOT NULL,
  -- Linha correspondente em posted_shorts, quando conhecida. ON DELETE SET NULL
  -- de propósito: apagar o card do wall NUNCA pode liberar o vídeo para ser
  -- recompensado de novo — o claim sobrevive ao card.
  posted_short_id uuid REFERENCES public.posted_shorts(id) ON DELETE SET NULL,
  -- Quantos créditos esta linha pagou. Guardado (e não inferido de uma
  -- constante do código) porque o valor da recompensa pode mudar amanhã e o
  -- teto vitalício por usuário é uma SOMA histórica: precisa do valor de então.
  credits integer NOT NULL DEFAULT 0,
  -- Canal que publicou, colhido do oEmbed no momento da validação. Serve para
  -- auditar fazendas de conta: N contas Kineo, um só canal do YouTube.
  channel_title text,
  -- IP de origem da concessão. Mesmo propósito de auditoria.
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A TRAVA. Um vídeo do YouTube paga UMA vez na história do produto, não
-- importa quem cole, quantas contas existam ou quantas vezes tentem.
CREATE UNIQUE INDEX IF NOT EXISTS post_to_earn_claims_video_unique
  ON public.post_to_earn_claims (youtube_video_id);

-- Janela rolante de 7 dias por usuário (máx. 2 recompensas) e soma vitalícia.
CREATE INDEX IF NOT EXISTS post_to_earn_claims_user_created_idx
  ON public.post_to_earn_claims (user_id, created_at DESC);

-- Teto global diário de segurança: um COUNT/SUM por data em toda a tabela.
CREATE INDEX IF NOT EXISTS post_to_earn_claims_created_idx
  ON public.post_to_earn_claims (created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Ligado, e com UMA única policy: SELECT da própria linha. Não existe policy
-- de INSERT/UPDATE/DELETE — nem para o dono. Isso é deliberado: se a chave
-- anon pudesse inserir aqui, qualquer pessoa com o DevTools aberto escreveria
-- o próprio direito a crédito. Só o service role (server-side) escreve.
ALTER TABLE public.post_to_earn_claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_to_earn_claims'
      AND policyname = 'post_to_earn_claims_select_own'
  ) THEN
    CREATE POLICY post_to_earn_claims_select_own
      ON public.post_to_earn_claims
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- ── Espelho legível em posted_shorts (aditivo, NÃO é a fonte de verdade) ────
-- A fonte de verdade da concessão é post_to_earn_claims. Estas duas colunas
-- existem só para que o /wall e o histórico possam mostrar "+3 credits" no
-- card sem um JOIN extra. Se um dia divergirem, o livro-razão manda.
ALTER TABLE public.posted_shorts ADD COLUMN IF NOT EXISTS rewarded_at timestamptz;
ALTER TABLE public.posted_shorts ADD COLUMN IF NOT EXISTS reward_credits integer;
