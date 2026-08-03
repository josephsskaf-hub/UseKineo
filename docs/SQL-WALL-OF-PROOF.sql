-- docs/SQL-WALL-OF-PROOF.sql — KINEO-WALL-2026-08-03
--
-- Wall of Proof (/wall) precisa de metadados PÚBLICOS por Short publicado.
-- A tabela `posted_shorts` (criada em 31/07, KINEO-POSTED-SHORTS-2026-07-31)
-- guardava só a ponte: id, user_id, video_id, url, youtube_video_id, source,
-- created_at. Nada renderizável — sem título, sem autor, sem views.
--
-- Este arquivo é PURAMENTE ADITIVO. Não existe DROP, não existe ALTER de
-- coluna existente, não existe backfill destrutivo. Rodar duas vezes é
-- inofensivo (todo statement usa IF NOT EXISTS).
--
-- Quem escreve nas colunas novas: app/api/wall/refresh/route.ts (service role,
-- protegida por CRON_SECRET). Quem lê: lib/wallOfProof.ts (service role, com
-- allow-list de colunas — o mesmo padrão de lib/publicVideos.ts).

-- ── Metadados públicos do vídeo ─────────────────────────────────────────────

-- Contagem de views. NULL = ainda não sabemos (é o estado normal enquanto não
-- houver YOUTUBE_API_KEY no ambiente: o caminho sem chave, oEmbed, devolve
-- título e autor mas NÃO devolve views). Nunca escrever 0 para "desconhecido" —
-- 0 é um número e a página o exibiria como se fosse verdade.
ALTER TABLE public.posted_shorts ADD COLUMN IF NOT EXISTS views bigint;

-- Título do vídeo no YouTube (oEmbed `title` ou snippet.title da Data API).
ALTER TABLE public.posted_shorts ADD COLUMN IF NOT EXISTS title text;

-- Nome do canal (oEmbed `author_name` ou snippet.channelTitle). É o crédito
-- público preferido: só caímos no nome/e-mail mascarado do perfil quando isto
-- estiver vazio. Assim a página NUNCA precisa expor e-mail.
ALTER TABLE public.posted_shorts ADD COLUMN IF NOT EXISTS channel_title text;

-- Thumbnail. A pública i.ytimg.com/vi/<id>/hqdefault.jpg sempre existe e é
-- derivável do id, então esta coluna só guarda uma URL MELHOR quando a Data API
-- devolver uma (maxres/standard). A página faz o fallback sozinha.
ALTER TABLE public.posted_shorts ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Última vez que a rota de refresh conseguiu ler este vídeo. NULL = nunca
-- checado; a rota prioriza os NULL e depois os mais antigos.
ALTER TABLE public.posted_shorts ADD COLUMN IF NOT EXISTS checked_at timestamptz;

-- ── Moderação ───────────────────────────────────────────────────────────────
-- /wall é uma página PÚBLICA alimentada por links que qualquer usuário cola.
-- Sem um botão de desligar, a única forma de tirar um link problemático do ar
-- seria deletar a linha (e perder a métrica de ativação). Default false: nada
-- muda para as linhas existentes.
ALTER TABLE public.posted_shorts ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- ── Índices ─────────────────────────────────────────────────────────────────
-- Ranking da página: views desc (NULLs por último) e, dentro do recorte
-- "This week", created_at desc.
CREATE INDEX IF NOT EXISTS posted_shorts_views_idx
  ON public.posted_shorts (views DESC NULLS LAST, created_at DESC);

-- Fila da rota de refresh: nunca-checados primeiro, depois os mais velhos.
CREATE INDEX IF NOT EXISTS posted_shorts_checked_at_idx
  ON public.posted_shorts (checked_at NULLS FIRST);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- INTENCIONALMENTE INTOCADA. As duas policies existentes
-- (posted_shorts_insert_own / posted_shorts_select_own) continuam valendo:
-- um usuário logado só enxerga as próprias linhas. A página pública e a rota de
-- refresh leem/escrevem com SUPABASE_SERVICE_ROLE_KEY, que passa por cima de
-- RLS — por isso lib/wallOfProof.ts usa uma allow-list explícita de colunas e
-- NUNCA seleciona `*` nem `user_id` para renderizar.
