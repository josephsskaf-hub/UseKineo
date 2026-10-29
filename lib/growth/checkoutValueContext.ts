import type { CheckoutPlanTier } from '@/lib/checkoutPricing'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import {
  TRIAL_BALANCE_BRIDGE_COST,
  TRIAL_BALANCE_BRIDGE_DURATION,
  TRIAL_BALANCE_BRIDGE_VERSION,
} from '@/lib/growth/trialBalanceBridge'

export const CHECKOUT_VALUE_CONTEXT_VERSION = 'checkout_value_context_v3' as const

/**
 * KINEO-ANUAL-40OFF-2026-10-05 — espelho LITERAL de ANNUAL_REFUND_POLICY (lib/checkoutPricing.ts). Este módulo não
 * importa valores de checkoutPricing de propósito (os guardiões o executam com mocks fechados);
 * scripts/test-pacote2-precos-2026-10-05.mjs confere que as duas frases são idênticas.
 */
export const CHECKOUT_ANNUAL_REFUND_SENTENCE =
  'Annual plans are refundable in full within 14 days of purchase; after that, no refund.'

/**
 * KINEO-AVULSO-GARANTIA-2810 — espelho LITERAL de FIRST_FILM_GUARANTEE.en (lib/growth/firstFilmGuarantee.ts), pelo
 * mesmo motivo da frase do anual acima (os guardiões executam este módulo com mocks fechados). Fecha o texto do botão
 * de pagar da Stripe no MENSAL; o anual fica de fora porque a política dele diz "depois de 14 dias, nenhum reembolso".
 * scripts/test-avulso-garantia-2810.mjs confere que as duas frases são idênticas.
 */
export const CHECKOUT_FIRST_FILM_GUARANTEE_SENTENCE =
  "Not happy with your first film? We'll redo it or refund you — just reply to your receipt."

export type CheckoutValueContextInput = {
  billing: 'monthly' | 'annual'
  credits: number
  intentCampaign: string | undefined
  tier: CheckoutPlanTier
  /** KINEO-VENDER-3-2910 — promo do Kling 4.0 viva no servidor (kling4PromoPolicyReason === 'ok'). Só copy. */
  kling4Promo?: boolean
  /** KINEO-VENDER-3-2910 — Kling 4.0 substituiu o Kling 3 no plano pago (KLING4_PAID_LIVE). Só o nome muda. */
  kling4Paid?: boolean
}

/**
 * KINEO-VENDER-3-2910 — a frase da promo no checkout da Stripe. Medido 29/10: 86 pessoas abriram o checkout em 14 d e 1
 * pagou; a promo (qualquer plano até 30/11 → Kling 4.0 grátis 30 dias, até 3 filmes/dia) não aparecia na página onde a
 * pessoa decide. Espelha KLING4_PAID_COPY.offer/terms (lib/kling4PaidPresentation.ts) sem importar de lá (guardiões
 * executam este módulo com mocks fechados).
 */
export const CHECKOUT_KLING4_PROMO_SENTENCE =
  'Includes Kling 4.0 free for 30 days — up to 3 films or ads a day, up to 60 s each.'
export const CHECKOUT_KLING4_PROMO_LINE = 'Kling 4.0 free for 30 days (up to 3 films a day)'

export type CheckoutValueContext = {
  lineItemDescription: string | null
  outputCount: number | null
  submitMessage: string
  variant: 'standard_result_count' | 'trial_balance_seedance'
  version: typeof CHECKOUT_VALUE_CONTEXT_VERSION
}

function resultCountDescription(input: CheckoutValueContextInput): {
  lineItemDescription: string | null
  outputCount: number | null
} {
  if (input.billing !== 'monthly') return { lineItemDescription: null, outputCount: null }

  // KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — a linha do produto na Stripe é o que o comprador lê no checkout (o botão "Get
  // Creator" das páginas citadas leva direto para lá). Ela prometia curtas do motor rápido — o Kineo 1, que a conta nova não vê desde
  // 29/09 — e o Studio ainda prometia uma fila prioritária, que não existe. Agora só o que a conta nova recebe: filmes de Seedance
  // 1.5 (e, no Studio, de Kling 3), contados pela MESMA função que cobra.
  if (input.tier === 'starter') {
    const seedanceCost = creditCostForDuration('cinematic_ai', true, 60)
    const seedanceShortCost = creditCostForDuration('cinematic_ai', true, 35)
    const outputCount = Math.floor(input.credits / seedanceCost)
    const shortCount = Math.floor(input.credits / seedanceShortCost)
    return {
      lineItemDescription:
        `${input.credits} credits / month — up to ${outputCount} Seedance 60s AI film${outputCount === 1 ? '' : 's'} ` +
        `or ${shortCount} of 35s, with AI voiceover, captions and no watermark`,
      outputCount,
    }
  }

  if (input.tier === 'basic') {
    const seedanceCost = creditCostForDuration('cinematic_ai', true, 60)
    const outputCount = Math.floor(input.credits / seedanceCost)
    return {
      lineItemDescription:
        `${input.credits} credits / month — up to ${outputCount} Seedance 60s AI films, ` +
        'with voiceover, captions and no watermark',
      outputCount,
    }
  }

  if (input.tier === 'pro') {
    const klingCost = creditCostForDuration('cinematic_hollywood', true, 60)
    const seedanceCost = creditCostForDuration('cinematic_ai', true, 60)
    const klingFilms = Math.floor(input.credits / klingCost)
    const seedanceFilms = Math.floor(input.credits / seedanceCost)
    return {
      lineItemDescription:
        `${input.credits} credits / month — ${klingFilms} ${input.kling4Paid ? 'Kling 4.0' : 'Kling 3'} 60s film` + // KINEO-VENDER-3-2910
        `${klingFilms === 1 ? '' : 's'} or up to ${seedanceFilms} Seedance 60s AI films, with voiceover, captions and no watermark`,
      outputCount: klingFilms,
    }
  }

  return { lineItemDescription: null, outputCount: null }
}

/**
 * Turns an abstract recurring-credit purchase into the exact output the buyer
 * has already shown intent to make. It never changes price, grant or access.
 */
export function buildCheckoutValueContext(input: CheckoutValueContextInput): CheckoutValueContext {
  const renewal = input.billing === 'annual' ? 'yearly' : 'monthly'
  // KINEO-ANUAL-40OFF-2026-10-05 — o anual tem política própria (fundador 05/10): reembolso integral em 14 dias,
  // depois nenhum; e os créditos chegam mês a mês. O texto do anual era o do mensal ("7-day money-back").
  const submitMessage = input.billing === 'annual'
    ? `Credits are added after payment succeeds and arrive month by month. Renews ${renewal} at the price shown. ` +
      `Cancel anytime from Account. ${CHECKOUT_ANNUAL_REFUND_SENTENCE}`
    : `Credits are added after payment succeeds. Renews ${renewal} at the price shown. ` +
      'Cancel anytime from Account. 7-day money-back guarantee.' + ` ${CHECKOUT_FIRST_FILM_GUARANTEE_SENTENCE}` // KINEO-AVULSO-GARANTIA-2810

  // KINEO-VENDER-3-2910 — a promo abre a frase do botão de pagar e fecha a linha do produto (quando há linha).
  const promoSubmit = input.kling4Promo ? `${CHECKOUT_KLING4_PROMO_SENTENCE} ${submitMessage}` : submitMessage
  const withPromoLine = (line: string | null) => (line && input.kling4Promo ? `${line} · ${CHECKOUT_KLING4_PROMO_LINE}` : line)

  const bridgeEligibleTier = input.tier === 'basic' || input.tier === 'pro'
  const bridgeContext =
    input.intentCampaign === TRIAL_BALANCE_BRIDGE_VERSION &&
    input.billing === 'monthly' &&
    bridgeEligibleTier

  if (!bridgeContext) {
    const standard = resultCountDescription(input)
    return {
      lineItemDescription: withPromoLine(standard.lineItemDescription),
      outputCount: standard.outputCount,
      submitMessage: promoSubmit,
      variant: 'standard_result_count',
      version: CHECKOUT_VALUE_CONTEXT_VERSION,
    }
  }

  const outputCount = Math.floor(input.credits / TRIAL_BALANCE_BRIDGE_COST)
  return {
    lineItemDescription: withPromoLine(
      `${input.credits} credits / month — up to ${outputCount} Seedance ${TRIAL_BALANCE_BRIDGE_DURATION}s films ` +
      `(${TRIAL_BALANCE_BRIDGE_COST} credits each), watermark-free`),
    outputCount,
    submitMessage: promoSubmit,
    variant: 'trial_balance_seedance',
    version: CHECKOUT_VALUE_CONTEXT_VERSION,
  }
}
