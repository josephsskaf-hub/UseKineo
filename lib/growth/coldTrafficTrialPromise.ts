import { normalizeInternalRedirect } from '@/lib/authRedirect'
import { CARD_ENTRY_COPY } from '@/lib/entryPolicy'

/**
 * KINEO-SPRINT-FRIO-2026-09-09 r3 — A PROMESSA QUE PAGOU O CLIQUE TEM QUE
 * SOBREVIVER AO CADASTRO.
 *
 * Medido em produção nesta rotação, 7 dias, por sessão: das 27 pessoas que
 * chegaram na tela de cadastro vindas de um checkout, **24 (89%) foram
 * levadas ao Google automaticamente** (`checkout_auth_method_selected` com
 * `selection_kind='automatic'`) e só 3 escolheram alguma coisa. 8 voltaram
 * logadas; 19 não.
 *
 * Quer dizer: para 89% dessa gente a tela de cadastro NÃO é uma página que se
 * lê — é um piscar antes do seletor de contas do Google. E o que estava
 * escrito nela, para quem clicou "Try 7 days for $1" na /ph, era:
 *
 *   h1     "Create your account for Creator"
 *   chip   "Creator · monthly"
 *   botão  "Continue to Creator checkout →"
 *   overlay "One tap and we'll bring you straight back to secure checkout."
 *
 * Em lugar nenhum: $1, 7 dias, 80 créditos. A pessoa clicou um teste de $1 e a
 * tela seguinte fala de uma assinatura mensal. `readCheckoutPasswordRecoveryContext`
 * lê `tier`, `billing` e `intent_campaign` do destino — **`trial` nunca foi
 * lido por ninguém**, então a promessa se perdia por construção, não por copy.
 *
 * Este módulo lê exatamente esse parâmetro e devolve a promessa em texto de
 * FONTE ÚNICA (`CARD_ENTRY_COPY`, cujos literais o guardião de preço já amarra
 * a `lib/checkoutPricing`). Nada aqui digita preço, prazo ou crédito à mão:
 * preço público é decisão do fundador e esta sprint não o toca.
 *
 * Falha FECHADA: sem `trial=1` no destino não há promessa nenhuma. Anunciar
 * teste a quem escolheu plano cheio seria mentir na direção cara.
 */
export const COLD_TRIAL_PROMISE_VERSION = 'cold_trial_promise_v1' as const

const CHECKOUT_PATH = /^\/api\/(?:stripe|paypal|mercadopago)\/checkout$/

export type ColdTrialPromise = {
  version: typeof COLD_TRIAL_PROMISE_VERSION
  /** Selo curto: o que a pessoa leva. Fonte única. */
  chip: string
  /** Uma frase inteira, para a tela que a pessoa consegue ler. */
  sentence: string
  /** Rótulo do botão que continua a compra. */
  cta: string
  /** Campanha que trouxe a pessoa, quando declarada — só para telemetria. */
  campaign: string | null
}

function boundedCategory(value: string | null): string | null {
  const clean = (value ?? '').trim()
  return /^[A-Za-z0-9._~-]{1,100}$/.test(clean) ? clean : null
}

/**
 * Devolve a promessa do trial de $1 quando — e somente quando — o destino
 * preservado é um checkout marcado com `trial=1`.
 */
export function readColdTrialPromise(
  rawDestination: string | null | undefined,
): ColdTrialPromise | null {
  const destination = normalizeInternalRedirect(rawDestination)
  if (!destination) return null

  const parsed = new URL(destination, 'https://kineo.local')
  if (!CHECKOUT_PATH.test(parsed.pathname)) return null
  if (parsed.searchParams.get('trial') !== '1') return null

  return {
    version: COLD_TRIAL_PROMISE_VERSION,
    chip: CARD_ENTRY_COPY.chip,
    sentence: CARD_ENTRY_COPY.sentence,
    cta: CARD_ENTRY_COPY.ctaLong,
    campaign: boundedCategory(parsed.searchParams.get('intent_campaign')),
  }
}

/** Telemetria da promessa — o carimbo de bundle que a r4 usa para cortar. */
export function coldTrialPromiseTelemetry(
  promise: ColdTrialPromise,
  surface: string,
): Record<string, string | null> {
  return {
    version: promise.version,
    surface,
    intent_campaign: promise.campaign,
  }
}
