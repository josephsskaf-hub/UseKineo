// ═══ KINEO-DOWNLOAD-OFERTA-2810 — "Download without watermark + in HD", NO instante do download ═══
//
// Pedido do fundador (28/10): quando a conta grátis/trial BAIXA o filme pronto, a oferta aparece ali, naquela hora:
// "Remove watermark + HD". O download grátis COM marca continua livre e primeiro (norma do mercado e o nosso sinal
// "download = gostou"). Nada aqui bloqueia, adia ou condiciona o arquivo.
//
// MEDIDO antes de construir (events, 30 d até 28/10):
//   · o gêmeo "Download clean — Starter" (clean_download_twin, 18/09) teve 203 impressões e 0 cliques — e desde o
//     upsell do Filme15 (26/10) ele some para a coorte do filme grátis de 15 s (a maioria): 0 impressões em 28/10;
//   · /library e /history: 42 pessoas baixaram filme e NENHUMA viu oferta — o card só reconhece marca d'água em
//     `quality_mode='fast'` com 0 crédito, e 95% dos filmes grátis hoje são Seedance (`cinematic_ai`).
//
// O QUE NÃO FOI CONSTRUÍDO (já existia): o checkout (Starter, `return=wm`, preço da fonte única), a remontagem limpa
// do MESMO filme (`/api/compose/unlock` com os insumos em `kineo_wm_unlock`) e o HD (✨ Enhance, `/api/enhance`,
// Topaz, 10 créditos). Esta peça só decide QUANDO mostrar, O QUE dizer e guarda os insumos para a estante.

export const DOWNLOAD_UPSELL_VERSION = 'download_upsell_v1'

/** O MESMO checkout do "remove watermark" da tela do filme (handleRemoveWatermark). Nada de preço novo. */
export const DOWNLOAD_UPSELL_CHECKOUT_PATH = '/api/stripe/checkout?tier=starter&intro=1&return=wm'

// KINEO-AVULSO-GARANTIA-2810 — a SEGUNDA opção do cartão, tão visível quanto a do plano: "só este filme, sem marca,
// pagamento único". É o MESMO passe avulso que a tela do filme já vende ("Just this video", handleBuyThisVideoOnly):
// `?pack=starter&return=wm` → sessão `metadata.pack='starter10'` (aceita por /api/compose/unlock) → volta para
// /generate?wm_unlock=1, que remonta ESTE filme limpo com os insumos de `kineo_wm_unlock`. Preço e créditos vêm do
// chamador (packPriceLabel / PACK_CREDITS.starter de lib/checkoutPricing.ts) — esta lib não crava número nenhum.
export const DOWNLOAD_UPSELL_ONE_TIME_CHECKOUT_PATH = '/api/stripe/checkout?pack=starter&return=wm'

/** Qual botão do cartão foi apertado (vai no `download_upsell_clicked`). */
export type DownloadUpsellOption = 'plan' | 'one_time'

/** Custo do ✨ Enhance HD (app/api/enhance/route.ts ENHANCE_COST). O guardião confere que os dois não divergem. */
export const MAKE_IT_HD_COST = 10

export type DownloadUpsellSurface = 'done_screen_top' | 'done_screen_main' | 'library_card' | 'library_lightbox'

export interface DownloadUpsellInput {
  /** A pessoa apertou Download NESTE filme (o gatilho é o clique — o instante). */
  downloadClicked: boolean
  /** O arquivo carrega a marca (veredito do servidor na tela do filme; na estante, a regra de conta+motor abaixo). */
  hasWatermark: boolean
  /** Prova positiva de pagamento. `null` = ainda não lido → não mostra (falha fechada). */
  hasPaid: boolean | null
  /** A remontagem limpa pós-checkout já está rodando. */
  unlocking: boolean
  /** A pessoa fechou a oferta deste filme ("Keep the free copy"). */
  dismissed: boolean
}

export type DownloadUpsellReason =
  | 'no_download_yet'
  | 'no_watermark'
  | 'paid_unknown'
  | 'already_paid'
  | 'unlocking'
  | 'dismissed'
  | 'ok'

export interface DownloadUpsellDecision {
  visible: boolean
  reason: DownloadUpsellReason
  version: typeof DOWNLOAD_UPSELL_VERSION
}

export function decideDownloadUpsell(input: DownloadUpsellInput): DownloadUpsellDecision {
  const version = DOWNLOAD_UPSELL_VERSION
  if (!input.downloadClicked) return { visible: false, reason: 'no_download_yet', version }
  if (!input.hasWatermark) return { visible: false, reason: 'no_watermark', version }
  if (input.hasPaid === null) return { visible: false, reason: 'paid_unknown', version }
  if (input.hasPaid) return { visible: false, reason: 'already_paid', version }
  if (input.unlocking) return { visible: false, reason: 'unlocking', version }
  if (input.dismissed) return { visible: false, reason: 'dismissed', version }
  return { visible: true, reason: 'ok', version }
}

/**
 * Na estante não há veredito do servidor por arquivo. A marca sai nos filmes que o BUILDER CLÁSSICO monta para conta
 * que não paga (Kineo 1 = 'fast', Seedance = 'cinematic_ai' — a mesma lista REBUILD_QUALITIES de compose/unlock);
 * Kling/Veo/H3/Omni/S25 saem limpos. Conta não lida = não (falha fechada).
 */
export function libraryFilmCarriesWatermark(input: { qualityMode: unknown; accountNonPaying: boolean | null }): boolean {
  if (input.accountNonPaying !== true) return false
  return input.qualityMode === 'fast' || input.qualityMode === 'cinematic_ai'
}

export interface DownloadUpsellCopy {
  eyebrow: string
  title: string
  button: string
  sub: string
  /** KINEO-AVULSO-GARANTIA-2810 — o botão do pagamento único (o passe avulso). */
  oneTimeButton: string
  oneTimeSub: string
  dismiss: string
  pending: string
}

/**
 * KINEO-AVULSO-GARANTIA-2810 — a copy do avulso. "this film" só com os insumos da remontagem na mão (tela do filme ou
 * estante com `kineo_wm_rebuild_v1`); sem eles o pagamento vale para o PRÓXIMO filme (o passe concede créditos e
 * has_paid — o próximo sai limpo), então a promessa é "your next film", igual à opção do plano. Sem preço, sem número.
 */
function oneTimeCopy(lang: string | undefined, thisFilm: boolean, price: string | null, credits: number | null): { oneTimeButton: string; oneTimeSub: string } {
  const cr = typeof credits === 'number' && credits > 0 ? credits : null
  if (lang === 'pt') {
    return {
      oneTimeButton: `${thisFilm ? 'Só este filme' : 'Só o seu próximo filme'} — sem marca d’água · ${price ? `${price} pagamento único` : 'pagamento único'}`,
      oneTimeSub: thisFilm
        ? `Este mesmo filme, refeito limpo · sem assinatura${cr ? ` · ${cr} créditos` : ''}`
        : `Sem assinatura${cr ? ` · ${cr} créditos para o próximo filme` : ''}`,
    }
  }
  if (lang === 'es') {
    return {
      oneTimeButton: `${thisFilm ? 'Solo esta película' : 'Solo tu próxima película'} — sin marca de agua · ${price ? `${price} pago único` : 'pago único'}`,
      oneTimeSub: thisFilm
        ? `Esta misma película, rehecha limpia · sin suscripción${cr ? ` · ${cr} créditos` : ''}`
        : `Sin suscripción${cr ? ` · ${cr} créditos para tu próxima película` : ''}`,
    }
  }
  return {
    oneTimeButton: `${thisFilm ? 'Just this film' : 'Just your next film'} — no watermark · ${price ? `${price} one-time` : 'one-time'}`,
    oneTimeSub: thisFilm
      ? `This same film, re-made clean · no subscription${cr ? ` · ${cr} credits` : ''}`
      : `No subscription${cr ? ` · ${cr} credits for your next film` : ''}`,
  }
}

/**
 * Copy em inglês por padrão (a tela do filme não localiza); pt/es para a estante, que já localiza. `thisFilm` = os
 * insumos da remontagem estão na mão: só então a promessa é "este filme limpo". Sem preço resolvido, sem número —
 * nunca um preço errado.
 */
export function downloadUpsellCopy(input: {
  priceLabel: string | null
  monthlyCredits: number
  thisFilm: boolean
  lang?: string
  /** KINEO-AVULSO-GARANTIA-2810 — preço do passe avulso (packPriceLabel()); null = botão sem número. */
  oneTimePriceLabel?: string | null
  /** Créditos que o passe concede (PACK_CREDITS.starter). */
  oneTimeCredits?: number | null
}): DownloadUpsellCopy {
  const hd = MAKE_IT_HD_COST
  const cr = input.monthlyCredits
  const p = input.priceLabel
  const oneTime = oneTimeCopy(input.lang, input.thisFilm, input.oneTimePriceLabel ?? null, input.oneTimeCredits ?? null)
  if (input.lang === 'pt') {
    return {
      ...oneTime,
      eyebrow: '✓ Sua cópia grátis está baixando (com marca d’água)',
      title: input.thisFilm ? 'Quer este filme sem marca d’água — e em HD?' : 'Quer seus filmes sem marca d’água — e em HD?',
      button: `✨ Tirar a marca + HD${p ? ` — Starter ${p}/mês` : ' — plano Starter'}`,
      sub: input.thisFilm
        ? `Este mesmo filme, refeito limpo · depois HD em 1 toque (${hd} dos seus ${cr} créditos do mês) · cancele quando quiser`
        : `Seus próximos filmes limpos · HD em 1 toque (${hd} dos seus ${cr} créditos do mês) · cancele quando quiser`,
      dismiss: 'Ficar com a cópia grátis',
      pending: 'Abrindo o pagamento seguro…',
    }
  }
  if (input.lang === 'es') {
    return {
      ...oneTime,
      eyebrow: '✓ Tu copia gratis se está descargando (con marca de agua)',
      title: input.thisFilm ? '¿Quieres esta película sin marca de agua — y en HD?' : '¿Quieres tus películas sin marca de agua — y en HD?',
      button: `✨ Quitar la marca + HD${p ? ` — Starter ${p}/mes` : ' — plan Starter'}`,
      sub: input.thisFilm
        ? `Esta misma película, rehecha limpia · luego HD en un toque (${hd} de tus ${cr} créditos al mes) · cancela cuando quieras`
        : `Tus próximas películas limpias · HD en un toque (${hd} de tus ${cr} créditos al mes) · cancela cuando quieras`,
      dismiss: 'Quedarme con la copia gratis',
      pending: 'Abriendo el pago seguro…',
    }
  }
  return {
    ...oneTime,
    eyebrow: '✓ Your free copy is downloading (with watermark)',
    title: input.thisFilm ? 'Want this film without the watermark — and in HD?' : 'Want your films without the watermark — and in HD?',
    button: `✨ Remove watermark + HD${p ? ` — Starter ${p}/mo` : ' — Starter plan'}`,
    sub: input.thisFilm
      ? `This same film, re-made clean · then one tap to HD (${hd} of your ${cr} monthly credits) · cancel anytime`
      : `Your next films clean · one tap to HD (${hd} of your ${cr} monthly credits) · cancel anytime`,
    dismiss: 'Keep the free copy',
    pending: 'Opening secure checkout…',
  }
}

/** "Make it HD" (o ✨ Enhance de sempre) aparece só em filme limpo entregue, de quem pagou, com id de vídeo. */
export function decideMakeItHd(input: { delivered: boolean; hasWatermark: boolean; hasPaid: boolean | null; videoId: string | null }): boolean {
  return input.delivered && !input.hasWatermark && input.hasPaid === true && Boolean(input.videoId)
}

// ── Insumos da remontagem, por filme, para a estante ─────────────────────────────────────────────────────────────
// `kineo_wm_unlock` só guarda o filme do clique e só no clique. A estante precisa saber, por vídeo, se dá para
// remontar AQUELE filme limpo. A tela do filme grava aqui os insumos de todo filme marcado entregue (5 mais
// recentes, 14 dias). Mesmo navegador, mesma origem; são as URLs dos clipes do nosso bucket e o texto do roteiro
// que a própria pessoa escreveu — o mesmo conteúdo que `kineo_wm_unlock` já guarda hoje.
export const WM_REBUILD_STORE_KEY = 'kineo_wm_rebuild_v1'
export const WM_REBUILD_MAX_ENTRIES = 5
export const WM_REBUILD_TTL_MS = 14 * 24 * 60 * 60 * 1000

type RebuildEntry = { at: number; inputs: Record<string, unknown> }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function validInputs(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const v = value as { clip_urls?: unknown; voiceover_script?: unknown }
  return Array.isArray(v.clip_urls) && v.clip_urls.length > 0 && typeof v.voiceover_script === 'string' && v.voiceover_script.length > 0
}

function readStore(storage: StorageLike, now: number): Record<string, RebuildEntry> {
  try {
    const raw = storage.getItem(WM_REBUILD_STORE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, RebuildEntry> = {}
    for (const [id, entry] of Object.entries(parsed as Record<string, unknown>)) {
      const e = entry as Partial<RebuildEntry> | null
      if (!e || typeof e.at !== 'number' || now - e.at > WM_REBUILD_TTL_MS || now - e.at < 0) continue
      if (!validInputs(e.inputs)) continue
      out[id] = { at: e.at, inputs: e.inputs }
    }
    return out
  } catch {
    return {}
  }
}

export function rememberRebuildInputs(storage: StorageLike, videoId: string, inputs: unknown, now = Date.now()): boolean {
  if (!videoId || !validInputs(inputs)) return false
  try {
    const store = readStore(storage, now)
    store[videoId] = { at: now, inputs }
    const kept = Object.entries(store).sort((a, b) => b[1].at - a[1].at).slice(0, WM_REBUILD_MAX_ENTRIES)
    storage.setItem(WM_REBUILD_STORE_KEY, JSON.stringify(Object.fromEntries(kept)))
    return true
  } catch {
    return false
  }
}

export function recallRebuildInputs(storage: StorageLike, videoId: string, now = Date.now()): Record<string, unknown> | null {
  if (!videoId) return null
  return readStore(storage, now)[videoId]?.inputs ?? null
}
