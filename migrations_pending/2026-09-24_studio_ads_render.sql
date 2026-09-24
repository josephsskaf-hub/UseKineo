-- KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — o pedido lembra qual render é dele.
-- /api/ads/render grava generation_id (antes de chamar o compose; o compose é idempotente por esse id) e render_id
-- (a resposta do compose). GET /api/ads/render acha o vídeo por videos.render_id e marca o pedido 'delivered'.
-- Aditiva, sem apagar nada. Colunas escritas SÓ pelo servidor (service role): ads_orders tem RLS sem policy.
alter table public.ads_orders add column if not exists generation_id uuid;
alter table public.ads_orders add column if not exists render_id text;
create index if not exists ads_orders_render_id_idx on public.ads_orders (render_id) where render_id is not null;
