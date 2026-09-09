/**
 * KINEO-PORTA-ERRO-VISIVEL-2026-09-09 (rotina noite r8)
 *
 * POR QUE ESTE ARQUIVO EXISTE.
 *
 * Quando a criacao da sessao da Stripe falha, o handler GET devolve
 * `302 /pricing?checkout_error=<a frase inteira>`. A frase que a Stripe
 * escreveu chega ao NAVEGADOR do cliente e e renderizada na tela dele.
 *
 * O que NAO chega a nos e o porque. O servidor grava o evento
 * `checkout_failed` com `checkoutFailureReason(msg)`, que corta a mensagem no
 * primeiro ':' — de proposito, para que o codigo de motivo nunca carregue id
 * de cliente, e-mail ou dado de pagamento. O efeito colateral e que
 * "Payment session failed: <o que a Stripe disse>" vira `payment_session_failed`
 * e a explicacao inteira e jogada fora.
 *
 * Custo medido disso, na noite de 08→09/09: a taxa de entrada de $1 falhou
 * em 100% das tentativas (3 linhas, 2 pessoas, uma delas vinda de anuncio
 * pago) e foi preciso uma rotacao inteira sondando os tipos do SDK para
 * descobrir uma coisa que a Stripe ja tinha dito por escrito, na tela, para
 * as duas pessoas.
 *
 * Esta biblioteca fecha o buraco pelo lado do CLIENTE, sem tocar na rota:
 * a pagina que ja EXIBE a frase passa a gravar (a) uma classe estavel derivada
 * da frase INTEIRA e (b) uma versao redigida dela.
 *
 * A regra de privacidade do servidor continua valendo aqui e e o motivo de
 * `redactCheckoutError` existir: identificador de objeto da Stripe, e-mail,
 * cartao e sequencia longa de digitos saem ANTES de virar evento.
 */

export const CHECKOUT_ERROR_SIGNAL_VERSION = 'checkout_error_signal_v1' as const

/** Teto do texto redigido. Frase de erro de API cabe folgado; log nao e dump. */
export const CHECKOUT_ERROR_DETAIL_MAX = 240

export type CheckoutErrorClass =
  | 'unknown_parameter'
  | 'no_such_price'
  | 'no_such_customer'
  | 'invalid_api_key'
  | 'amount_too_small'
  | 'currency_mismatch'
  | 'rate_limited'
  | 'already_subscribed'
  | 'setup_failure'
  | 'unclassified'

/**
 * Assinaturas de erro da Stripe que a casa ja viu ou que sao previsiveis no
 * caminho de assinatura. A ordem importa: a primeira que casar vence, e as
 * mais especificas vem primeiro.
 *
 * `unknown_parameter` esta no topo por causa do defeito de 09/09: um parametro
 * que o SDK nao conhece derruba a sessao inteira e, sem esta classe, aparece
 * como o mesmo `payment_session_failed` generico de qualquer outra falha.
 */
const SIGNATURES: ReadonlyArray<readonly [CheckoutErrorClass, RegExp]> = [
  ['unknown_parameter', /received unknown parameter|unknown parameter/i],
  ['no_such_price', /no such (price|plan|product)/i],
  ['no_such_customer', /no such customer/i],
  ['invalid_api_key', /invalid api key|no api key provided|expired api key/i],
  ['amount_too_small', /amount must be at least|amount_too_small/i],
  ['currency_mismatch', /currenc(y|ies) .*(match|combine)|must all be in the same currency/i],
  ['rate_limited', /rate limit|too many requests/i],
  ['already_subscribed', /already (has|have) an active subscription|already subscribed/i],
  ['setup_failure', /could not open secure checkout/i],
]

/**
 * Classifica pela frase INTEIRA — que e exatamente o que o corte no ':' do
 * servidor impede. Uma frase vazia nao e "outra coisa": e ausencia de sinal.
 */
export function classifyCheckoutError(raw: string | null | undefined): CheckoutErrorClass | null {
  const msg = (raw ?? '').trim()
  if (!msg) return null
  for (const [code, pattern] of SIGNATURES) {
    if (pattern.test(msg)) return code
  }
  return 'unclassified'
}

/**
 * Remove de uma frase de erro tudo que possa identificar uma pessoa ou um
 * pagamento, preservando o vocabulario tecnico que explica a falha.
 *
 * O que sai: e-mail, identificador de objeto da Stripe (cus_/sub_/pi_/cs_/
 * price_/prod_/in_/seti_/ch_/card_/src_/evt_/req_), chave de API, e qualquer
 * corrida de 6+ digitos (numero de cartao, telefone, valor com centavos em
 * unidade minima nao chega perto disso).
 */
export function redactCheckoutError(raw: string | null | undefined): string {
  const msg = (raw ?? '').trim()
  if (!msg) return ''
  return msg
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<email>')
    .replace(/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]+/g, '<key>')
    .replace(
      /\b(?:cus|sub|pi|cs|price|prod|in|seti|ch|card|src|evt|req|tok|py|txn|il|si)_[A-Za-z0-9]{6,}/g,
      '<id>',
    )
    .replace(/\b\d{6,}\b/g, '<num>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHECKOUT_ERROR_DETAIL_MAX)
}

export type CheckoutErrorSignal = {
  version: typeof CHECKOUT_ERROR_SIGNAL_VERSION
  /** Classe estavel derivada da frase inteira. */
  error_class: CheckoutErrorClass
  /** A frase, redigida. E o campo que faltava para explicar uma falha. */
  reason_detail: string
  /** Tamanho do ORIGINAL — denuncia truncamento na redacao. */
  error_len: number
  /** De onde veio a intencao de compra; a rota devolve na volta. */
  intent_campaign: string | null
  /**
   * A falha veio de uma superficie da taxa de entrada de $1?
   * Decide o texto que a pessoa le e permite separar a coorte na consulta.
   */
  from_card_entry: boolean
}

/** As campanhas que a porta de $1 e a sua faixa carimbam na ida ao checkout. */
const CARD_ENTRY_CAMPAIGNS = new Set(['door_v2', 'card_entry'])

/**
 * Le a volta de um checkout que falhou. Devolve null quando nao ha erro na
 * URL — a pagina de precos e visitada muito mais vezes sem falha do que com.
 */
export function readCheckoutErrorSignal(
  rawSearch: string | null | undefined,
): CheckoutErrorSignal | null {
  const params = new URLSearchParams(rawSearch ?? '')
  const raw = params.get('checkout_error')
  const error_class = classifyCheckoutError(raw)
  if (!error_class) return null

  const rawCampaign = (params.get('intent_campaign') ?? '').trim()
  const intent_campaign = /^[A-Za-z0-9._~-]{1,100}$/.test(rawCampaign) ? rawCampaign : null

  return {
    version: CHECKOUT_ERROR_SIGNAL_VERSION,
    error_class,
    reason_detail: redactCheckoutError(raw),
    error_len: (raw ?? '').trim().length,
    intent_campaign,
    from_card_entry: intent_campaign !== null && CARD_ENTRY_CAMPAIGNS.has(intent_campaign),
  }
}

export function checkoutErrorSignalTelemetry(
  signal: CheckoutErrorSignal,
): Record<string, string | number | boolean | null> {
  return {
    version: signal.version,
    error_class: signal.error_class,
    reason_detail: signal.reason_detail,
    error_len: signal.error_len,
    intent_campaign: signal.intent_campaign,
    from_card_entry: signal.from_card_entry,
  }
}

/** Uma linha por sessao e por classe: a pessoa recarrega, o fato nao muda. */
export function checkoutErrorSignalStorageKey(signal: CheckoutErrorSignal): string {
  return `kineo_checkout_error_signal_${signal.error_class}`
}
