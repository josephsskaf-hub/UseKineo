// lib/videoDescription.ts — PUSH #100
//
// Loop de aquisição: a descrição que o usuário COPIA e cola embaixo do Short
// precisa carregar o link do Kineo. Antes desta push a linha de marca existia
// inline em UM lugar só (app/api/video-summary/route.ts:150), numa superfície
// secundária (painel de My Videos). O fluxo primário (analyze-idea → next
// steps → upload automático no YouTube) mandava a descrição sem marca nenhuma,
// então todo vídeo publicado por usuário free levava a audiência para lugar
// nenhum.
//
// Este módulo é a ÚNICA fonte da linha de crédito. É puro (sem env vars, sem
// segredos, sem imports de servidor) para poder rodar igual no route handler e
// no client component — o que o usuário copia é byte-a-byte o que subimos.
//
// Regras:
//  - Mesma cópia e mesma convenção de UTM do append inline original (não
//    fragmentar atribuição).
//  - Idempotente: usuário regenera e recopia o tempo todo; anexar duas vezes
//    parece bug.
//  - Respeita o teto de 5000 chars do YouTube truncando a BASE, nunca o
//    crédito — uma linha de marca cortada no meio não gera clique nenhum.

/** Hard cap the YouTube API enforces on a video description. */
export const YOUTUBE_DESCRIPTION_MAX_LENGTH = 5000

/** Domain we look for when deciding whether a description is already branded. */
const KINEO_DOMAIN = 'usekineo.com'

/**
 * The exact credit line appended to a free-plan description.
 * Byte-identical to the original inline append in app/api/video-summary.
 */
export const KINEO_CREDIT_LINE =
  '⚡ Made with Kineo — create Shorts like this, usually in 3–7 minutes: https://www.usekineo.com?utm_source=video_desc'

/** Blank line between the user's description and the credit line. */
const CREDIT_SEPARATOR = '\n\n'

export interface BrandedDescriptionOptions {
  /**
   * Only free/unpaid accounts get the credit line — mirrors the watermark rule
   * (#434): a clean description is part of what a paid plan buys.
   */
  isFreePlan: boolean
  /** Optional 8-char referral code, appended as `&ref=` for attribution. */
  referralCode?: string | null
  /** Optional video id, appended as `&utm_content=` for attribution. */
  videoId?: string | null
  /** Override the 5000-char YouTube cap (tests / other surfaces). */
  maxLength?: number
}

const REFERRAL_CODE = /^[A-HJ-NP-Z2-9]{8}$/

/**
 * Build the credit line, optionally carrying attribution params. With no
 * referralCode and no videoId this returns KINEO_CREDIT_LINE unchanged, so the
 * default output stays byte-identical to the historical string.
 */
export function buildKineoCreditLine(
  opts: Pick<BrandedDescriptionOptions, 'referralCode' | 'videoId'> = {},
): string {
  const extra: string[] = []
  const ref = (opts.referralCode ?? '').trim().toUpperCase()
  if (REFERRAL_CODE.test(ref)) extra.push(`ref=${ref}`)
  // utm_content é livre, mas sanitizamos para não quebrar a URL.
  const vid = (opts.videoId ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '')
  if (vid) extra.push(`utm_content=${vid.slice(0, 64)}`)
  if (extra.length === 0) return KINEO_CREDIT_LINE
  return `${KINEO_CREDIT_LINE}&${extra.join('&')}`
}

/**
 * Returns true when the text already carries a Kineo credit / link, so we do
 * not append a second one.
 */
export function hasKineoCredit(description: string): boolean {
  if (!description) return false
  return description.toLowerCase().includes(KINEO_DOMAIN)
}

/**
 * Append the Kineo credit line to a YouTube description.
 *
 * - Paid plans get the description back untouched (only trimmed).
 * - Idempotent: already-branded text is returned unchanged.
 * - The result never exceeds `maxLength`; the BASE is truncated (on a word
 *   boundary when possible) so the credit line always survives intact.
 */
export function buildBrandedYouTubeDescription(
  baseDescription: string | null | undefined,
  opts: BrandedDescriptionOptions,
): string {
  const maxLength =
    typeof opts.maxLength === 'number' && opts.maxLength > 0
      ? Math.floor(opts.maxLength)
      : YOUTUBE_DESCRIPTION_MAX_LENGTH

  const base = (baseDescription ?? '').trim()

  // Paid plan → clean description, just capped.
  if (!opts.isFreePlan) return base.slice(0, maxLength)

  // Idempotência: já tem link do Kineo, devolve como está.
  if (hasKineoCredit(base)) return base.slice(0, maxLength)

  const creditLine = buildKineoCreditLine(opts)

  // Sem base (ex.: pipeline não gerou descrição) → só o crédito.
  if (!base) return creditLine.slice(0, maxLength)

  // O crédito sozinho já estoura o teto: devolve a base limpa em vez de
  // publicar um link cortado pela metade.
  if (creditLine.length + CREDIT_SEPARATOR.length >= maxLength) {
    return base.slice(0, maxLength)
  }

  const budget = maxLength - creditLine.length - CREDIT_SEPARATOR.length
  let trimmedBase = base
  if (trimmedBase.length > budget) {
    trimmedBase = trimmedBase.slice(0, budget)
    const lastSpace = trimmedBase.lastIndexOf(' ')
    // Só corta na palavra se não jogar fora mais da metade do texto.
    if (lastSpace > budget * 0.5) trimmedBase = trimmedBase.slice(0, lastSpace)
    trimmedBase = trimmedBase.trimEnd()
  }

  if (!trimmedBase) return creditLine.slice(0, maxLength)

  return `${trimmedBase}${CREDIT_SEPARATOR}${creditLine}`
}
