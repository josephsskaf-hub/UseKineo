-- ═══════════════════════════════════════════════════════════════════════════
-- KINEO-ATRIBUICAO-POUSO-2026-10-02 — profiles.signup_landing_path
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ESTA COLUNA EXISTE
--
-- O perfil sabia DE ONDE a pessoa veio (signup_utm_source / signup_referrer) e
-- em que TELA nossa ela clicou (signup_surface), mas não em que PÁGINA ela
-- entrou no site. As páginas de SEO compensavam isso cravando
-- `utm_source=seo` no link de cadastro (lib/growth/publicCreationIntent.ts) —
-- uma origem inventada: quem chegou do ChatGPT ou direto e clicou numa página
-- dessas virava "seo" se ainda não tinha origem gravada.
--
-- A partir daqui o primeiro toque grava também o CAMINHO da página de entrada
-- (só o pathname: sem query, sem host, até ~200 caracteres; lib/analytics.ts
-- captureSourceOnce). A rota app/api/track-signup-source grava a coluna só
-- quando ela ainda está nula — primeiro toque vence, nunca sobrescreve.
--
-- ORDEM: a rota TOLERA a coluna ainda não existir (escreve a coluna num UPDATE
-- separado, filtrado por `signup_landing_path is null`; erro de coluna
-- inexistente é engolido e o resto da atribuição segue gravando). Então esta
-- migração pode rodar antes OU depois do deploy — mas só depois dela a coluna
-- começa a encher.
--
-- Aditiva e reversível: coluna nova, nullable, sem default, sem backfill (não
-- há como reconstruir a página de entrada de quem já se cadastrou).

alter table public.profiles
  add column if not exists signup_landing_path text;

comment on column public.profiles.signup_landing_path is
  'KINEO-ATRIBUICAO-POUSO-2026-10-02 — pathname da primeira pagina do site que este navegador abriu (primeiro toque; sem query, sem host, ate 200 chars). Gravado por app/api/track-signup-source so quando nulo. Complementa signup_utm_source/signup_referrer (origem) e signup_surface (tela do clique).';
