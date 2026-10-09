-- KINEO-ATOR-ANUNCIO-2026-10-09 — "Person talking about it": o ATOR de IA do anúncio v2 (lib/ads/v2Presenter.ts) mora numa
-- linha EXTRA de ads_v2_shots (idx 31, kind 'presenter', engine 'kling_avatar' = fal-ai/kling-video/ai-avatar/v2/standard).
--
-- ⚠️ NÃO APLICADA. Aplicar ANTES do deploy do código do ator (lib/ads/v2Advance.ts buildInitialShotRows com plan.presenter,
-- app/api/ads/v2/plan/route.ts). Sem ela, o INSERT das linhas no /start de um pedido COM ator recusa o tipo e o motor novos
-- pelos CHECKs ads_v2_shots_kind_check / ads_v2_shots_engine_check → o /start falha com estorno (shots_insert_failed):
-- ninguém perde crédito, mas o anúncio com ator não sai. Pedidos SEM ator não mudam em nada.
--
-- Só ALARGA as regras (um tipo e um motor novos aceitos) e acrescenta uma trava que vale só para o par novo — nenhuma
-- linha existente pode violar: hoje não existe linha com kind 'presenter' nem engine 'kling_avatar'. Idempotente
-- (drop constraint if exists + add). O motor repete a lista da migration dos estilos (2026-10-09_ads_v2_estilos.sql) +
-- 'kling_avatar'; se esta for aplicada depois dela, a lista final é a desta (a dos estilos fica contida).
-- O ator em si mora no plano (ads_v2_orders.plan jsonb: plan.presenter) — nenhuma coluna nova.

alter table public.ads_v2_shots drop constraint if exists ads_v2_shots_kind_check;
alter table public.ads_v2_shots
  add constraint ads_v2_shots_kind_check
  check (kind in ('people', 'place', 'product', 'product_hero', 'text', 'user_video', 'presenter'));

alter table public.ads_v2_shots drop constraint if exists ads_v2_shots_engine_check;
alter table public.ads_v2_shots
  add constraint ads_v2_shots_engine_check
  check (engine is null or engine in ('kling_o3', 'seedance_20_fast', 'h3', 'pixverse_effect', 'kling_avatar'));

-- O motor do ator só na linha do ator, e a linha do ator só com o motor dele (a regra do código repetida no banco).
alter table public.ads_v2_shots drop constraint if exists ads_v2_shots_presenter_engine;
alter table public.ads_v2_shots
  add constraint ads_v2_shots_presenter_engine
  check ((kind = 'presenter') = (engine is not distinct from 'kling_avatar'));
