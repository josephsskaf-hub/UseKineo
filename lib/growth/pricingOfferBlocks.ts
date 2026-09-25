// KINEO-FLUXO-NOVO-2026-09-25 — peça D da ordem do fundador (25/09): o /pricing ganha, ABAIXO dos planos, dois blocos
// de compra única — "Anúncios" (passe do Studio Ads + Express/Pro) e "Créditos avulsos" (a barra de 50 a 2.000).
// Até hoje o /pricing não mostrava anúncio nem recarga: quem chegava pelo item "Preços" do menu novo não achava
// dois dos três jeitos de pagar a Kineo.
//
// POR QUE ESTE MÓDULO É PURO: ele só LÊ as fontes únicas (lib/ads/offer, lib/growth/dfyOffer, lib/credits/creditSlider,
// lib/growth/topupEligibility). Nenhum número de preço é digitado aqui nem nos dois componentes — preço congelado até
// 09/10. Os dois componentes (components/pricing/PricingAdsBlock e PricingCreditsBlock) só pintam o que sai daqui, e o
// guardião scripts/test-pricing-3-blocos-2026-09-25.mjs roda este arquivo de verdade (transpile + vm).
//
// DESTINOS, NUNCA CHECKOUT: o passe vai para /ads (é lá, no servidor, que se decide "já incluso no seu plano", "abrir"
// ou "cheio" pelo teto de revisões — um ?pack=ads_pass direto pularia os dois). Express/Pro vão para
// /business-video-ads#packages (é lá que o link da Stripe ganha a identidade da conta, o escopo e o reembolso; um
// buy.stripe.com daqui sairia sem client_reference_id e o pedido chegaria anônimo).
import { ADS_PASS_ACCESS_DAYS, ADS_PASS_CREDITS, ADS_PASS_USD_MINOR, adsPassCopy, adsPassLive } from '@/lib/ads/offer'
import { liveDfyTiers, type DfyTier, type DfyTierSpec } from '@/lib/growth/dfyOffer'
import { CREDIT_SLIDER_MAX, CREDIT_SLIDER_MIN, sliderPriceUsdMinor } from '@/lib/credits/creditSlider'
import { canPurchaseCreditTopup } from '@/lib/growth/topupEligibility'
import { CREDITS_READ_FAILED_FIELD } from '@/lib/creditsReadFailure'

export const PRICING_BLOCKS_VERSION = 'pricing_3_blocks_v1' as const
export const PRICING_BLOCK_SHOWN_EVENT = 'pricing_block_shown' as const
export const PRICING_BLOCK_CLICKED_EVENT = 'pricing_block_clicked' as const
/** O seletor Mensal/Anual fica logo acima e o padrão é ANUAL: sem esta etiqueta, a recarga e o passe pareceriam preço anual. */
export const PRICING_ONE_TIME_LABEL = 'One-time · separate from your plan'
export const PRICING_ADS_PASS_HREF = '/ads?from=pricing'
export const PRICING_DFY_HREF = '/business-video-ads?from=pricing#packages'
export const PRICING_PLANS_HREF = '#plans'
export const PRICING_ADS_BLOCK_ID = 'pricing-ads-block'
export const PRICING_CREDITS_BLOCK_ID = 'pricing-credits-block'
/** Vira `credits_topup_modal_pricing_block` no checkout_attempted do modal — separa esta porta do chip da barra lateral. */
export const PRICING_TOPUP_SURFACE = 'pricing_block' as const
/** Mesmo limiar do PricingBusinessPathTelemetry: metade do bloco na tela conta como visto. */
export const PRICING_BLOCK_VIEW_THRESHOLD = 0.5

export type PricingBlock = 'ads' | 'credits'
export type PricingBlockCta = 'ads_pass' | `dfy_${DfyTier}` | 'credits_open' | 'credits_choose_plan'

export interface PricingAdsPassModel {
  name: string
  headline: string
  priceMinor: number
  credits: number
  accessDays: number
  href: string
  cta: 'ads_pass'
}

export interface PricingDfyTierModel {
  tier: DfyTier
  name: string
  priceMinor: number
  hours: number
  revisions: number
  engines: string
  href: string
  cta: PricingBlockCta
}

export interface PricingAdsBlockModel {
  /** false = nenhuma das duas portas está ligada; o bloco inteiro some. */
  visible: boolean
  /** null quando adsPassLive() é false: a coluna "Make it yourself" some. */
  pass: PricingAdsPassModel | null
  /** Só degraus LIGADOS (liveDfyTiers). Sem `url`: o link de pagamento nunca sai do /pricing. */
  dfy: PricingDfyTierModel[]
  state: string
}

/** Modelo do bloco "Anúncios". `passLive`/`dfyTiers` só existem para o guardião simular interruptores. */
export function pricingAdsBlockModel(input: { passLive?: boolean; dfyTiers?: readonly DfyTierSpec[] } = {}): PricingAdsBlockModel {
  const passLive = input.passLive ?? adsPassLive()
  const tiers = input.dfyTiers ?? liveDfyTiers()
  const copy = adsPassCopy()
  const pass: PricingAdsPassModel | null = passLive
    ? {
        name: copy.name,
        headline: copy.headline,
        priceMinor: ADS_PASS_USD_MINOR,
        credits: ADS_PASS_CREDITS,
        accessDays: ADS_PASS_ACCESS_DAYS,
        href: PRICING_ADS_PASS_HREF,
        cta: 'ads_pass',
      }
    : null
  const dfy: PricingDfyTierModel[] = tiers.map((t) => ({
    tier: t.tier,
    name: t.name,
    priceMinor: t.priceMinor,
    hours: t.hours,
    revisions: t.revisions,
    engines: t.engines,
    href: PRICING_DFY_HREF,
    cta: `dfy_${t.tier}` as PricingBlockCta,
  }))
  return {
    visible: pass !== null || dfy.length > 0,
    pass,
    dfy,
    state: `${pass ? 'pass_live' : 'pass_off'}_dfy_${dfy.length}`,
  }
}

// ── Créditos avulsos ────────────────────────────────────────────────────────────────────────────────────────────
// 'anon' e 'read_error' existem separados de 'ineligible' só para a medição: os três FECHAM a compra igual.
export type PricingCreditsState = 'loading' | 'eligible' | 'ineligible' | 'anon' | 'read_error'

/**
 * Leitura de GET /api/credits → estado do bloco. Por que /api/credits e não /api/me/plan: o checkout decide a recarga
 * por `profiles.plan` CRU (app/api/stripe/checkout, buildTopupAndRedirect → canPurchaseCreditTopup), e é esse mesmo
 * campo que /api/credits devolve em `plan`. O /api/me/plan devolve o tier achatado de lib/plan (autopilot com is_pro
 * vira 'pro'), e a tela ofereceria um botão que o checkout recusa. Falha fechada: 401 = sem conta; qualquer outro
 * não-2xx, corpo sem `plan` ou marca de leitura falha = sem botão.
 */
export function pricingCreditsStateFromRead(read: { status: number; body: unknown } | null | undefined): PricingCreditsState {
  if (!read || typeof read.status !== 'number') return 'read_error'
  if (read.status === 401) return 'anon'
  if (read.status < 200 || read.status >= 300) return 'read_error'
  const body = read.body
  if (!body || typeof body !== 'object') return 'read_error'
  if ((body as Record<string, unknown>)[CREDITS_READ_FAILED_FIELD] === true) return 'read_error'
  const plan = (body as { plan?: unknown }).plan
  if (typeof plan !== 'string' || !plan.trim()) return 'read_error'
  return canPurchaseCreditTopup(plan) ? 'eligible' : 'ineligible'
}

/** A ÚNICA variável que abre o botão e o modal de recarga. Só 'eligible' compra. */
export function pricingCreditsCanBuy(state: PricingCreditsState): boolean {
  return state === 'eligible'
}

export interface PricingCreditsBlockModel {
  state: PricingCreditsState
  canBuy: boolean
  min: number
  max: number
  /** Preço do MÍNIMO da barra, pela mesma função que a Stripe cobra. null = faixa inválida (não mostra "from"). */
  fromPriceMinor: number | null
}

export function pricingCreditsBlockModel(state: PricingCreditsState): PricingCreditsBlockModel {
  return {
    state,
    canBuy: pricingCreditsCanBuy(state),
    min: CREDIT_SLIDER_MIN,
    max: CREDIT_SLIDER_MAX,
    fromPriceMinor: sliderPriceUsdMinor(CREDIT_SLIDER_MIN),
  }
}

// ── Medição ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Sem impressão, um bloco com zero cliques não se distingue de um bloco que ninguém viu (memória
// "peça escrita para muitos, vista por poucos"). Uma impressão e um clique por bloco/CTA por sessão.
export function pricingBlockEventMetadata(block: PricingBlock, state: string, cta?: PricingBlockCta): Record<string, unknown> {
  return cta ? { block, version: PRICING_BLOCKS_VERSION, state, cta } : { block, version: PRICING_BLOCKS_VERSION, state }
}

export function pricingBlockMarker(eventName: string, block: PricingBlock, cta?: PricingBlockCta): string {
  return `kineo_${eventName}_${block}${cta ? `_${cta}` : ''}_${PRICING_BLOCKS_VERSION}`
}

export interface PricingBlockRecorderDeps {
  send: (eventName: string, metadata: Record<string, unknown>) => Promise<boolean>
  storage: () => { getItem(key: string): string | null; setItem(key: string, value: string): void } | null
}

/**
 * Trava de uma vez por sessão, copiada do PricingBusinessPathTelemetry: a marca só é gravada DEPOIS que o servidor
 * guardou o evento (um envio que falhou pode tentar de novo) e o `inFlight` impede dois envios simultâneos.
 */
export function createPricingBlockRecorder(deps: PricingBlockRecorderDeps) {
  const inFlight = new Set<string>()
  const recorded = new Set<string>()
  function wasRecorded(marker: string): boolean {
    if (recorded.has(marker)) return true
    try {
      if (deps.storage()?.getItem(marker) === '1') {
        recorded.add(marker)
        return true
      }
    } catch {
      // Modo privado pode negar o sessionStorage; a trava em memória segue valendo.
    }
    return false
  }
  async function recordOnce(marker: string, eventName: string, metadata: Record<string, unknown>): Promise<boolean> {
    if (wasRecorded(marker) || inFlight.has(marker)) return false
    inFlight.add(marker)
    let stored = false
    try {
      stored = await deps.send(eventName, metadata)
    } catch {
      stored = false
    } finally {
      inFlight.delete(marker)
    }
    if (!stored) return false
    recorded.add(marker)
    try {
      deps.storage()?.setItem(marker, '1')
    } catch {
      // Evento guardado continua travado em memória nesta página.
    }
    return true
  }
  return { wasRecorded, recordOnce }
}

/** Observa o bloco até a impressão ser guardada; devolve a limpeza do efeito. Sem IntersectionObserver, não mede. */
export function observePricingBlockOnce(
  target: Element,
  onVisible: () => Promise<boolean>,
  isDone: () => boolean,
): () => void {
  if (typeof IntersectionObserver === 'undefined' || isDone()) return () => {}
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (!entry?.isIntersecting || entry.intersectionRatio < PRICING_BLOCK_VIEW_THRESHOLD) return
    void onVisible().then((stored) => {
      if (stored || isDone()) observer.disconnect()
    })
  }, { threshold: [PRICING_BLOCK_VIEW_THRESHOLD] })
  observer.observe(target)
  return () => observer.disconnect()
}
