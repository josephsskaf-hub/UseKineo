// KINEO-OFFER290-2026-07-07 — central, importable feature flags.
//
// OFFER_290_ENABLED gates the entire first-purchase URGENCY offer
// ($4.90 → $2.90, 10 Fast videos, 24h countdown, 1-per-account). While it is
// `false`:
//   • the <Offer290Banner/> renders nothing,
//   • /api/stripe/checkout?pack=starter290 returns 410 (SKU disabled),
//   • /api/credits does not surface the offer fields.
// The founder flips it to `true` (single line below) to go live. Build-only for now.
// KINEO-SPRINT-OFFER-2026-07-14 — DESLIGADO por ordem do Joseph (sprint de
// oferta única: só intro-month $4.90/$9.90 nas superfícies públicas; o $2.90
// one-time conflitava e não gera MRR). Banner some, SKU volta 410.
export const OFFER_290_ENABLED = false

// KINEO-CINEMATIC-ANCHOR-2026-07-24 — gates the optional anchor + image-to-video
// path for the CLASSIC Kling engine (cross-scene visual consistency: one FLUX
// still per scene sharing the style sheet + per-generation seed, each scene then
// animated via Kling i2v so the clips read as one world instead of independent
// t2v draws). OFF by default: while false, every classic engine stays pure
// text-to-video and behaves BYTE-IDENTICALLY to before this feature existed.
// Flip via env KINEO_CINEMATIC_ANCHOR_ENABLED (truthy = '1' | 'true' | 'yes' | 'on').
export const CINEMATIC_ANCHOR_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  (process.env.KINEO_CINEMATIC_ANCHOR_ENABLED ?? '').trim().toLowerCase(),
)
