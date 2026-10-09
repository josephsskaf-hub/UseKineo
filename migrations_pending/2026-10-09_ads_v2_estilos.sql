-- KINEO-ESTILOS-PRODUTO-2026-10-09 — estilos de produto no anúncio v2: o plano-herói do produto com estilo sai pelo efeito
-- da PixVerse (fal-ai/pixverse/v5/effects), gravado em ads_v2_shots.engine como 'pixverse_effect'.
--
-- ⚠️ NÃO APLICADA. Aplicar ANTES do deploy do código dos estilos (lib/ads/v2Tiers.ts routeShot com `styled`,
-- lib/ads/v2Advance.ts buildInitialShotRows). Sem ela, o INSERT das linhas no /start de um pedido COM estilo recusa o motor
-- novo pelo CHECK ads_v2_shots_engine_check → o /start falha com estorno (shots_insert_failed): ninguém perde crédito, mas
-- o anúncio com estilo não sai. Pedidos SEM estilo ('Auto') não mudam em nada.
--
-- Só ALARGA a regra (um motor novo aceito): nenhuma linha existente pode violar. Idempotente (drop constraint if exists +
-- add). O estilo em si mora no plano (ads_v2_orders.plan jsonb: plan.style e plan.shots[i].effect) — nenhuma coluna nova.

alter table public.ads_v2_shots drop constraint if exists ads_v2_shots_engine_check;
alter table public.ads_v2_shots
  add constraint ads_v2_shots_engine_check
  check (engine is null or engine in ('kling_o3', 'seedance_20_fast', 'h3', 'pixverse_effect'));
