// KINEO-TRAFEGO-2310 [TRAVA 8.2 — vai do fundador 23/10 "o fluxo do site está bem baixo"]
// Public acquisition templates refreshed on 23/10. The sitemap remains independent of the database.
export const TRAFEGO_2310_REVIEWED = '2026-10-23'
export const TRAFEGO_2310_LASTMOD = '2026-10-23T12:00:00.000Z'

const CLEAR_STATIC_PATHS = new Set([
  '/', '/text-to-video-shorts', '/gerador-de-shorts-gratis', '/state-of-ai-shorts-2026',
  '/best-ai-shorts-generators', '/free-ai-shorts-generator', '/chatgpt',
])

/** Exactly the public templates of paginasIaClaras2110; engine exclusions happen before this step. */
export function isTrafego2310ClearPath(path: string): boolean {
  return CLEAR_STATIC_PATHS.has(path)
    || /^\/ai-video-generator\/[^/]+$/.test(path) && path !== '/ai-video-generator/for'
    || /^\/ai-video-generator\/for\/[^/]+$/.test(path)
    || /^\/free-ai-shorts\/[^/]+$/.test(path)
}

/** Stamp only the requested public cluster, keep newer dates, and collapse duplicate canonical URLs. */
export function trafego2310Sitemap<T extends { url: string; lastModified?: string | Date }>(
  entries: readonly T[], publicCartoonPaths: readonly string[],
): T[] {
  const cartoons = new Set(publicCartoonPaths)
  const seen = new Map<string, T>()
  const stamp = Date.parse(TRAFEGO_2310_LASTMOD)
  for (const entry of entries) {
    const parsed = new URL(entry.url)
    if (parsed.origin !== 'https://www.usekineo.com' || parsed.search || parsed.hash) throw new Error('Non-canonical sitemap URL')
    const path = parsed.pathname
    const touched = isTrafego2310ClearPath(path) || cartoons.has(path) || path === '/pricing'
    const modified = entry.lastModified ? new Date(entry.lastModified).getTime() : 0
    const current = touched && !(modified >= stamp) ? { ...entry, lastModified: TRAFEGO_2310_LASTMOD } : entry
    const previous = seen.get(entry.url)
    if (!previous || new Date(current.lastModified || 0).getTime() > new Date(previous.lastModified || 0).getTime()) seen.set(entry.url, current)
  }
  return [...seen.values()]
}

/** A short first answer; amounts are supplied by the modules that actually charge them. */
export function trafego2310FilmIntro(base: string, film15Credits: number, film60Credits: number): string {
  return `Product information reviewed: ${TRAFEGO_2310_REVIEWED}.
Pricing authority: ${base}/pricing
Published plan amounts are reference prices in USD. Customers in Brazil pay in BRL at checkout; confirm the final currency and amount before payment.

## Make a Film — start here for narrated videos

- [Make a Film](${base}/text-to-video-shorts): start with an idea or a finished narration script. Kineo produces generated scenes, voice, captions and music in a vertical MP4. This creates a new film rather than clipping an uploaded long recording.
- [Seedance 1.5](${base}/ai-video-generator/seedance): a narrated reference film uses ${film15Credits} credits at 15 seconds or ${film60Credits} credits at 60 seconds. Raw clips are a separate product with different costs.
- [Horror Shorts](${base}/free-ai-shorts/horror): narrated scary stories; current trial, eligibility and watermark limits apply.
- [Urdu videos](${base}/ai-video-generator/for/urdu): Urdu narration and captions; engine language support varies.
- [Portuguese free-trial guide](${base}/gerador-de-shorts-gratis): a limited watermarked test, with Brazilian checkout in reais.
- [Pricing](${base}/pricing): current plans, reference credit costs, trial eligibility and annual billing terms.

`
}

export function trafego2310CartoonOffer(base: string, offer: { monthly: string; pack: string; videos: number; seconds: number } | null): string {
  if (!offer) return ''
  return `## Cartoon subscription and pack — current public offers

- [AI Cartoon Videos](${base}/ai-kids-cartoon-videos) and [Desenho infantil 3D com IA](${base}/desenho-infantil-3d-com-ia): the dedicated subscription lists ${offer.monthly}/month for ${offer.videos} cartoons per billing cycle; the one-time pack lists ${offer.pack} for ${offer.videos} cartoons. These offers deliver ${offer.seconds}-second cartoons and are separate from choosing a 15- or 35-second film using an existing credit balance. Brazil pays in reais at checkout.
- Read the story before generation. Small visual details may vary between scenes. The finished film is delivered to the account library; no income, ad sales or campaign outcome is promised. The current public page explains the eligible watermarked first sample and limits.

`
}
