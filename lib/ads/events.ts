// KINEO-STUDIO-ADS-2026-09-25 — lista FECHADA de eventos do Studio Ads (fonte única).
// Regras (memórias da casa): todo evento leva `order_id` a partir do brief (é o carimbo do deploy:
// `metadata ? 'order_id'`, nunca relógio); servidor grava com `await`, nunca `void`; só
// `payment_success` com pack='ads_pass' é dinheiro; impressões se comparam com o evento do
// PRIMEIRO gesto (ads_cta_clicked), nunca com montagem. Módulo puro.

export const ADS_EVENTS = [
  // porta e compra
  'ads_page_viewed',
  'ads_cta_clicked',
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
  'ads_card_rendered',
  'ads_preview_confirmed',
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
] as const

export type AdsEventName = (typeof ADS_EVENTS)[number]

/** Eventos que só o SERVIDOR pode gravar (nunca o navegador). */
export const ADS_SERVER_ONLY_EVENTS: readonly AdsEventName[] = [
  'ads_access_granted',
  'ads_access_denied',
  'ads_script_served',
  'ads_render_requested',
  'ads_render_served',
  'ads_render_failed',
  'ads_delivered',
  'ads_email_sent',
  'ads_qa_decided',
  'ads_open_orders_capped',
]

export function isAdsEvent(name: string): name is AdsEventName {
  return (ADS_EVENTS as readonly string[]).includes(name)
}

/** Teto de pedidos em revisão humana aberta (decisão 5: entrega imediata + revisão em 24 h; acima disso a página fecha a venda). */
export const ADS_MAX_OPEN_REVIEWS = 5
