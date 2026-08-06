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

-- ═══════════════════════════════════════════════════════════════════════════
-- KINEO-P2E-FIX-2026-08-07 — o programa NUNCA pagou ninguém
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Diagnóstico (07/08/2026, produção): post_to_earn_claims com 0 linhas e 3
-- Shorts reais no /wall. O motor lib/postToEarnGrant.ts só era chamado por
-- app/api/posted-shorts (link COLADO); as 2 entradas do fundador vieram do
-- upload direto (app/api/youtube/upload), que gravava em posted_shorts e não
-- chamava o motor, e a 1 entrada colada é de 01/08 — anterior ao commit que
-- criou o Post to Earn (04/08). O único caminho que pagava nunca recebeu
-- tráfego. Não foi RLS, não foi try/catch, não foi API key: era um caminho
-- desconectado.
--
-- Esta seção é PURAMENTE ADITIVA e idempotente. Ela acrescenta o que faltava
-- para o programa ser honesto e auditável:
--
--   status        granted | pending | rejected  (pending = fila de revisão)
--   source        pasted | direct_upload        (de onde veio o link)
--   verification  COMO se provou a autoria      (direct_upload, description_match:…)
--   reason        POR QUE não foi automático    (no_youtube_api_key, …)
--   granted_at / reviewed_at / reviewed_by      (trilha da decisão)
--
-- Por que `pending` existe: sem YOUTUBE_API_KEY o servidor NÃO consegue ler a
-- descrição do vídeo e portanto não consegue provar que o Short é da Kineo.
-- Pagar assim mesmo é convite para fazenda de contas (qualquer vídeo antigo do
-- canal serviria); recusar é injusto com quem fez tudo certo. Então o claim
-- fica de pé, com motivo, e um humano decide. A copy pública diz esse prazo.
--
-- PARA O CRÉDITO VOLTAR A SER 100% AUTOMÁTICO: definir YOUTUBE_API_KEY no
-- ambiente (a mesma chave que app/api/wall/refresh já usa). Com ela, o motor
-- lê o snippet do vídeo e credita na hora quando encontra o credit link.

ALTER TABLE public.post_to_earn_claims
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'granted';
ALTER TABLE public.post_to_earn_claims ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.post_to_earn_claims ADD COLUMN IF NOT EXISTS verification text;
ALTER TABLE public.post_to_earn_claims ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.post_to_earn_claims ADD COLUMN IF NOT EXISTS granted_at timestamptz;
ALTER TABLE public.post_to_earn_claims ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.post_to_earn_claims ADD COLUMN IF NOT EXISTS reviewed_by text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_to_earn_claims_status_check'
  ) THEN
    ALTER TABLE public.post_to_earn_claims
      ADD CONSTRAINT post_to_earn_claims_status_check
      CHECK (status IN ('granted', 'pending', 'rejected'));
  END IF;
END
$$;

-- A trava de dedupe global vira PARCIAL. Motivo: um claim recusado na revisão
-- não pode queimar o vídeo para sempre — se o usuário corrigir a descrição e
-- colar de novo, o vídeo tem que poder ser avaliado outra vez. `granted` e
-- `pending` continuam ocupando a vaga única (é o que impede pagamento duplo e
-- é o que impede duas contas disputarem o mesmo Short enquanto um está na
-- fila). Criado ANTES do DROP do índice antigo: em nenhum instante a tabela
-- fica sem proteção contra duplicata.
CREATE UNIQUE INDEX IF NOT EXISTS post_to_earn_claims_video_active_unique
  ON public.post_to_earn_claims (youtube_video_id)
  WHERE status <> 'rejected';

DROP INDEX IF EXISTS public.post_to_earn_claims_video_unique;

-- Fila de revisão: "o que está pendente, mais antigo primeiro".
CREATE INDEX IF NOT EXISTS post_to_earn_claims_pending_idx
  ON public.post_to_earn_claims (created_at)
  WHERE status = 'pending';

-- ── A AÇÃO da revisão manual ────────────────────────────────────────────────
-- Aprovar/recusar um claim pendente com UMA chamada, sem UPDATE solto na mão
-- (um UPDATE manual creditaria duas vezes se rodasse duas vezes, e é
-- exatamente isso que acontece quando alguém revisa a fila cansado).
--
-- IDEMPOTENTE POR CONSTRUÇÃO: o UPDATE só casa quando status = 'pending', e o
-- crédito só roda se o UPDATE devolveu linha. Chamar de novo devolve
-- 'noop:<status atual>' e não paga nada.
--
-- SECURITY DEFINER + revoke geral: só o service role (ou o SQL editor do dono)
-- executa. Se `authenticated` pudesse chamar, qualquer usuário aprovaria o
-- próprio claim pelo DevTools — que é a versão mais cara possível deste bug.
CREATE OR REPLACE FUNCTION public.post_to_earn_review(
  p_claim uuid,
  p_approve boolean,
  p_note text DEFAULT NULL,
  p_credits integer DEFAULT 3
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_status text;
BEGIN
  IF p_approve THEN
    UPDATE public.post_to_earn_claims
       SET status = 'granted',
           credits = GREATEST(p_credits, 0),
           granted_at = now(),
           reviewed_at = now(),
           reviewed_by = COALESCE(p_note, 'manual_review')
     WHERE id = p_claim AND status = 'pending'
     RETURNING user_id INTO v_user;

    IF v_user IS NULL THEN
      SELECT status INTO v_status FROM public.post_to_earn_claims WHERE id = p_claim;
      RETURN 'noop:' || COALESCE(v_status, 'not_found');
    END IF;

    PERFORM public.add_video_credits(v_user, GREATEST(p_credits, 0));

    UPDATE public.posted_shorts
       SET rewarded_at = now(), reward_credits = GREATEST(p_credits, 0)
     WHERE user_id = v_user
       AND youtube_video_id = (SELECT youtube_video_id FROM public.post_to_earn_claims WHERE id = p_claim);

    RETURN 'granted';
  ELSE
    UPDATE public.post_to_earn_claims
       SET status = 'rejected',
           credits = 0,
           reviewed_at = now(),
           reviewed_by = COALESCE(p_note, 'manual_review')
     WHERE id = p_claim AND status = 'pending'
     RETURNING user_id INTO v_user;

    IF v_user IS NULL THEN
      SELECT status INTO v_status FROM public.post_to_earn_claims WHERE id = p_claim;
      RETURN 'noop:' || COALESCE(v_status, 'not_found');
    END IF;

    RETURN 'rejected';
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.post_to_earn_review(uuid, boolean, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_to_earn_review(uuid, boolean, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.post_to_earn_review(uuid, boolean, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.post_to_earn_review(uuid, boolean, text, integer) TO service_role;

-- ── A fila, pronta para revisar ─────────────────────────────────────────────
--   SELECT c.id, c.youtube_video_id, c.channel_title, c.reason, c.created_at,
--          'https://youtube.com/watch?v=' || c.youtube_video_id AS watch
--     FROM public.post_to_earn_claims c
--    WHERE c.status = 'pending'
--    ORDER BY c.created_at;
--
--   SELECT public.post_to_earn_review('<claim id>', true,  'checked: has credit link');
--   SELECT public.post_to_earn_review('<claim id>', false, 'not a Kineo video');
