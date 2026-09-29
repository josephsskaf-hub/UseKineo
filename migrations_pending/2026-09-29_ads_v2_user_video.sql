-- KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo do cliente entra no anúncio v2 como plano 'user_video'.
--
-- ⚠️ NÃO APLICADA. Aplicar ANTES do deploy do código que planeja 'user_video' (lib/ads/v2ShotLists.ts,
-- app/api/ads/v2/plan/route.ts). Sem ela, o INSERT das linhas no /start recusa o tipo novo pelo CHECK
-- ads_v2_shots_kind_check → o /start falha com estorno (shots_insert_failed): ninguém perde crédito, mas o anúncio com
-- vídeo não sai. Pedidos SEM vídeo não mudam em nada.
--
-- Só ALARGA regra (tipo novo aceito) e acrescenta uma trava nova que vale só para o tipo novo: nenhuma linha existente
-- pode violar. Idempotente (drop constraint if exists + add).
--
-- A trava no banco repete a regra do código (lib/ads/v2Tiers.ts routeShot → null; lib/ads/v2Advance.ts
-- buildInitialShotRows → nasce 'done'): o vídeo do cliente NUNCA vai à fal — sem motor, sem request_id, sem imagem.

alter table public.ads_v2_shots drop constraint if exists ads_v2_shots_kind_check;
alter table public.ads_v2_shots
  add constraint ads_v2_shots_kind_check
  check (kind in ('people', 'place', 'product', 'product_hero', 'text', 'user_video'));

alter table public.ads_v2_shots drop constraint if exists ads_v2_shots_user_video_never_ai;
alter table public.ads_v2_shots
  add constraint ads_v2_shots_user_video_never_ai
  check (kind <> 'user_video' or (engine is null and request_id is null and image_request_id is null));
