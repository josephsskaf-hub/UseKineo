-- ═══════════════════════════════════════════════════════════════════════════
-- KINEO-ATTRIBUTION-SURFACE-2026-08-12 — profiles.signup_surface
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ESTA COLUNA EXISTE
--
-- `profiles.signup_utm_source` responde "DE ONDE a pessoa veio". Dois CTAs
-- nossos estavam escrevendo nela o nome da TELA em que a pessoa clicou depois
-- de já estar no site:
--   · app/HomeTopicForm.tsx          → ?utm_source=homepage
--   · components/StickyFreeShortCTA  → ?utm_source=sticky_cta
--
-- Medido em 10/08 (docs/CAC-POR-CANAL-2026-08-10.md): 42 dos 47 perfis com
-- rótulo interno têm `signup_referrer` NULO — a origem externa dessa gente é
-- irrecuperável, e a ÚNICA conversão da história do produto está nesse balde.
-- Enquanto isso valer, nenhum investimento pago é avaliável DEPOIS de gasto.
--
-- A partir daqui o rótulo de tela vive aqui e a coluna de origem fica NULA
-- quando não sabemos — que o funil já lê como `(direct)`. Um "não sabemos"
-- honesto é instrumento; um "sticky_cta" falso é ruído que se parece com sinal.
--
-- ⚠️ ESTA MIGRAÇÃO RODA ANTES DO DEPLOY, NÃO DEPOIS.
-- app/api/track-signup-source/route.ts passa a incluir `signup_surface` no
-- SELECT de first-touch. Sem a coluna, o SELECT falha, `profile` vira null e a
-- rota tenta escrever atribuição para TODO MUNDO num UPDATE que também falha —
-- ou seja, a atribuição inteira quebraria em silêncio, que é exatamente a
-- classe de defeito que esta correção existe para acabar.
--
-- Aditiva e reversível: coluna nova, nullable, sem default, sem backfill.
-- NÃO há backfill possível: os 47 perfis afetados perderam a origem externa
-- antes de qualquer gravação. O rótulo interno deles segue em
-- `signup_utm_source` e continua legível para o histórico.

alter table public.profiles
  add column if not exists signup_surface text;

comment on column public.profiles.signup_surface is
  'KINEO-ATTRIBUTION-SURFACE-2026-08-12 — tela NOSSA onde o clique de cadastro comecou (homepage | sticky_cta). NUNCA e origem de aquisicao: para isso existe signup_utm_source. Lista canonica em lib/acquisitionSource.ts (INTERNAL_SURFACE_LABELS).';

-- Só as linhas rotuladas entram no índice: a coluna é nula para a esmagadora
-- maioria dos perfis e um índice cheio de nulos custa escrita sem pagar leitura.
create index if not exists profiles_signup_surface_idx
  on public.profiles (signup_surface)
  where signup_surface is not null;
