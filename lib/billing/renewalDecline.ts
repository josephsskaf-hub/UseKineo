// ═══ KINEO-CARTAO-RECUSADO-1510 — "por que o banco recusou?" para a carta de renovação recusada ═══
// Lê o motivo da recusa na PRÓPRIA fatura (invoice.payment_intent → last_payment_error) e devolve só a CATEGORIA de
// lib/stripeCheckoutFailure.ts ('insufficient_funds', 'card_restricted', ...). Nunca devolve número, bandeira, final
// do cartão nem a mensagem crua do banco: a carta transforma a categoria numa frase (lib/billing/renewalFailedEmail.ts).
//
// NUNCA LANÇA e tem teto de tempo: roda dentro do webhook da Stripe e do cron do lembrete. Qualquer falha → null, e a
// carta diz a frase genérica ("o banco recusou a cobrança").
import { stripe } from '@/lib/stripe'
import { classifyStripeFailureReason } from '@/lib/stripeCheckoutFailure'

export const RENEWAL_DECLINE_READ_TIMEOUT_MS = 2500

// KINEO-CARTAO-RECUSADO-0111 — + o PAÍS do cartão recusado (payment_method.card.country), só para decidir a dica do
// "cartão brasileiro em cobrança em dólar" (isBrazilianCardInUsd). O país nunca vai para o texto da carta.
type PaymentErrorShape = {
  decline_code?: string | null
  code?: string | null
  payment_method?: { card?: { country?: string | null } | null } | string | null
} | null | undefined
type InvoiceWithPaymentIntent = {
  payment_intent?: string | { id?: string; last_payment_error?: PaymentErrorShape } | null
}

export interface InvoiceDecline {
  category: string | null
  /** ISO-2 do cartão recusado ('BR', 'ES'…) ou null. */
  cardCountry: string | null
}

const NO_DECLINE: InvoiceDecline = { category: null, cardCountry: null }

function categoryFrom(err: PaymentErrorShape): string | null {
  if (!err) return null
  const category = classifyStripeFailureReason(err.decline_code ?? null, err.code ?? null)
  return category === 'unknown' ? null : category
}

function declineFrom(err: PaymentErrorShape): InvoiceDecline {
  if (!err) return NO_DECLINE
  const pm = err.payment_method
  const raw = pm && typeof pm === 'object' ? pm.card?.country : null
  const cardCountry = typeof raw === 'string' && /^[A-Za-z]{2}$/.test(raw.trim()) ? raw.trim().toUpperCase() : null
  return { category: categoryFrom(err), cardCountry }
}

/** KINEO-CARTAO-RECUSADO-0111 — motivo + país do cartão numa leitura só (nunca lança; teto de tempo). */
export async function readInvoiceDecline(invoice: InvoiceWithPaymentIntent): Promise<InvoiceDecline> {
  try {
    const pi = invoice.payment_intent
    if (!pi) return NO_DECLINE
    if (typeof pi === 'object' && pi.last_payment_error !== undefined) return declineFrom(pi.last_payment_error)
    const id = typeof pi === 'string' ? pi : pi.id
    if (!id) return NO_DECLINE
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), RENEWAL_DECLINE_READ_TIMEOUT_MS))
    const live = await Promise.race([stripe.paymentIntents.retrieve(id), timeout])
    if (!live) return NO_DECLINE
    return declineFrom(live.last_payment_error as PaymentErrorShape)
  } catch (err) {
    console.warn('[renewal-decline] could not read the decline reason:', err instanceof Error ? err.message : String(err))
    return NO_DECLINE
  }
}

export async function readInvoiceDeclineCategory(invoice: InvoiceWithPaymentIntent): Promise<string | null> {
  return (await readInvoiceDecline(invoice)).category
}
