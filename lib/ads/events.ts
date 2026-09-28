// KINEO-STUDIO-ADS-2026-09-25 — lista FECHADA de eventos do Studio Ads (fonte única).
// Regras (memórias da casa): todo evento leva `order_id` a partir do brief (é o carimbo do deploy:
// `metadata ? 'order_id'`, nunca relógio); servidor grava com `await`, nunca `void`; só
// `payment_success` com pack='ads_pass' é dinheiro; impressões se comparam com o evento do
// PRIMEIRO gesto (ads_cta_clicked), nunca com montagem. Módulo puro.

export const ADS_EVENTS = [
  // porta e compra
  'ads_page_viewed',
  'ads_cta_clicked',
  'ads_door_plan_clicked', // KINEO-ADS-PORTA-PLANO-2026-09-27: clique na porta do plano Starter em /ads ({tier, from}); navegador, nunca só-servidor
  'studio_tile_ads_clicked', // KINEO-STUDIO-TILE-ADS-2026-09-27: clique no tile "Business ad" do /studio ({plan, has_access, href_kind}); navegador. Único sem prefixo ads_: é evento da tela /studio (família studio_tile_*), registrado aqui para o funil de anúncios contar a porta
  'ads_checkout_started',
  'ads_access_granted',
  'ads_access_denied',
  // fluxo /ads/new
  'ads_brief_saved',
  'ads_consent_given',
  'ads_media_uploaded',
  'ads_media_refused',
  'ads_template_selected',
  'ads_script_served',
  'ads_script_chosen',
  'ads_voice_previewed',
  'ads_voice_preview_served', // KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24: prévia servida pelo /api/ads/voice (conta o teto diário)
  'ads_card_rendered',
  // KINEO-ADS-IA-FAZ-2026-09-26 — modo "a IA faz o anúncio"
  'ads_auto_started',
  'ads_auto_brief_served',
  'ads_auto_confirmed',
  'ads_link_read', // KINEO-ADS-LINK-2026-09-26
  'ads_preview_confirmed',
  // KINEO-ADS-COMECAR-DO-ZERO-2026-09-29 — /ads/new: 'Start from scratch' e 'Delete old photos and videos' (navegador)
  'ads_started_from_scratch',
  'ads_old_media_deleted',
  // render e entrega
  'ads_render_requested',
  'ads_render_served',
  'ads_render_failed',
  'ads_delivered',
  'ads_email_sent',
  'ads_download_clicked',
  'ads_revision_requested',
  'ads_qa_decided',
  'ads_dfy_upsell_clicked',
  'ads_open_orders_capped',
  // KINEO-ADS-V2-2026-09-28 — anúncio v2 (fotos reais animadas, lib/ads/v2*.ts): todos só-servidor, todos com order_id.
  'ads_v2_order_created',
  'ads_v2_plan_served',
  'ads_v2_dry_run_served',
  'ads_v2_started',
  'ads_v2_retake_started',
  'ads_v2_shot_retried',
  'ads_v2_assembling',
  'ads_v2_delivered',
  'ads_v2_failed',
] as const

export type AdsEventName = (typeof ADS_EVENTS)[number]

/** Eventos que só o SERVIDOR pode gravar (nunca o navegador). */
export const ADS_SERVER_ONLY_EVENTS: readonly AdsEventName[] = [
  'ads_access_granted',
  'ads_access_denied',
  'ads_script_served',
  'ads_voice_preview_served',
  'ads_auto_brief_served',
  'ads_link_read',
  'ads_render_requested',
  'ads_render_served',
  'ads_render_failed',
  'ads_delivered',
  'ads_email_sent',
  'ads_qa_decided',
  'ads_open_orders_capped',
  'ads_v2_order_created',
  'ads_v2_plan_served',
  'ads_v2_dry_run_served',
  'ads_v2_started',
  'ads_v2_retake_started',
  'ads_v2_shot_retried',
  'ads_v2_assembling',
  'ads_v2_delivered',
  'ads_v2_failed',
]

export function isAdsEvent(name: string): name is AdsEventName {
  return (ADS_EVENTS as readonly string[]).includes(name)
}

/** Teto de pedidos em revisão humana aberta (decisão 5: entrega imediata + revisão em 24 h; acima disso a página fecha a venda). */
export const ADS_MAX_OPEN_REVIEWS = 5
