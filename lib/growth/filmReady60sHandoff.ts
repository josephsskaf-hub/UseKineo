// KINEO-VERSAO-60S-2026-10-13 — a parte LEVE da "versão de 60 s deste filme": nomes, links e o bilhete da volta.
// Sem import nenhum de propósito: entra na /checkout/success, no Studio e na ponte /film-60 sem arrastar a régua de preço
// (buyCreatorOffer → checkoutPricing/engineCost). A decisão de quem vê e a copy com preço moram em lib/growth/filmReady60s.ts,
// que reexporta tudo daqui. O bilhete vive na sessionStorage (mesma aba, mesma origem) e o texto do filme NUNCA vai na URL.

export const FILM60_VERSION = 'film_ready_60s_upsell_v1' as const
/** intent_campaign do botão da tela de filme pronto (vira metadata do checkout → payment_success). */
export const FILM60_CAMPAIGN = 'film_ready_60s_upsell' as const
/** intent_campaign do link no e-mail "seu filme está pronto" (mesmo prefixo: `like 'film_ready_60s_upsell%'`). */
export const FILM60_EMAIL_CAMPAIGN = 'film_ready_60s_upsell_email' as const
export const FILM60_SHOWN_EVENT = 'film_ready_60s_upsell_shown' as const
export const FILM60_CLICKED_EVENT = 'film_ready_60s_upsell_clicked' as const
export const FILM60_ARRIVED_EVENT = 'film_ready_60s_upsell_arrived' as const
/** A duração da versão longa. É a MESMA de BUY_CREATOR_FILM_SECONDS (a promessa "N films of 60 s"): o guardião
 *  scripts/test-versao-60s-1310.mjs confere as duas — aqui fica literal só para este módulo não importar a régua de preço. */
export const FILM60_TARGET_SECONDS = 60
/** O motor da versão longa: Seedance 1.5, o mesmo do filme curto. */
export const FILM60_ENGINE = 'seedance' as const
/** "Let AI structure my text" — o roteiro cresce pelo caminho normal de geração de roteiro. */
export const FILM60_SCRIPT_MODE = 'ai' as const

/** O bilhete da volta (sessionStorage). Vale 3 h: cobre a ida à Stripe e uma volta lenta, sem ressuscitar dias depois. */
export const FILM60_HANDOFF_KEY = 'kineo:film60:v1'
export const FILM60_HANDOFF_TTL_MS = 3 * 60 * 60 * 1000
/** Teto do texto guardado (a caixa do Studio aceita mais; o filme de 15 s tem ~47 palavras). */
export const FILM60_PROMPT_MAX_CHARS = 1500

export type Film60Surface = 'film_ready' | 'email'

/** O checkout do Creator mensal, sem cupom manual (o WELCOME20 automático aplica no servidor). */
export function film60CheckoutHref(campaign: string = FILM60_CAMPAIGN): string {
  return `/api/stripe/checkout?tier=basic&billing=monthly&intent_campaign=${encodeURIComponent(campaign)}`
}

/** O Studio da volta: Seedance · 60 s · Let AI structure · a campanha atravessa até o próximo despacho. Sem texto na URL. */
export function film60StudioHref(): string {
  const q = new URLSearchParams({
    film60: '1',
    engine: FILM60_ENGINE,
    duration: String(FILM60_TARGET_SECONDS),
    script_mode: FILM60_SCRIPT_MODE,
    intent_campaign: FILM60_CAMPAIGN,
  })
  return `/studio?${q.toString()}`
}

/** O link do e-mail: a página-ponte /film-60 guarda o bilhete (com o título do filme) e segue para o checkout. */
export function film60EmailHref(appUrl: string, videoId: string | null): string {
  const q = new URLSearchParams()
  if (typeof videoId === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(videoId)) q.set('v', videoId)
  q.set('utm_source', 'lifecycle')
  q.set('utm_medium', 'email')
  q.set('utm_campaign', FILM60_EMAIL_CAMPAIGN)
  return `${appUrl}/film-60?${q.toString()}`
}

export interface Film60Handoff {
  prompt: string
  videoId: string | null
  surface: Film60Surface
  at: number
}

function cleanPrompt(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, FILM60_PROMPT_MAX_CHARS) : ''
}

export function serializeFilm60Handoff(input: { prompt: unknown; videoId: unknown; surface: Film60Surface; at: number }): string {
  return JSON.stringify({
    prompt: cleanPrompt(input.prompt),
    videoId: typeof input.videoId === 'string' && input.videoId ? input.videoId.slice(0, 64) : null,
    surface: input.surface === 'email' ? 'email' : 'film_ready',
    at: input.at,
  })
}

/** Lê o bilhete; vencido, futuro, malformado ou ausente = null (a volta cai no /studio de sempre). Nunca lança. */
export function readFilm60Handoff(raw: string | null | undefined, now: number): Film60Handoff | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<Film60Handoff> | null
    if (!p || typeof p !== 'object') return null
    const at = typeof p.at === 'number' && Number.isFinite(p.at) ? p.at : NaN
    if (!Number.isFinite(at) || at > now + 60_000 || now - at > FILM60_HANDOFF_TTL_MS) return null
    return {
      prompt: cleanPrompt(p.prompt),
      videoId: typeof p.videoId === 'string' && p.videoId ? p.videoId.slice(0, 64) : null,
      surface: p.surface === 'email' ? 'email' : 'film_ready',
      at,
    }
  } catch {
    return null
  }
}
