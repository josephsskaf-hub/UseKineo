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

type PaymentErrorShape = { decline_code?: string | null; code?: string | null } | null | undefined
type InvoiceWithPaymentIntent = {
  payment_intent?: string | { id?: string; last_payment_error?: PaymentErrorShape } | null
}

function categoryFrom(err: PaymentErrorShape): string | null {
  if (!err) return null
  const category = classifyStripeFailureReason(err.decline_code ?? null, err.code ?? null)
  return category === 'unknown' ? null : category
}

export async function readInvoiceDeclineCategory(invoice: InvoiceWithPaymentIntent): Promise<string | null> {
  try {
    const pi = invoice.payment_intent
    if (!pi) return null
    if (typeof pi === 'object' && pi.last_payment_error !== undefined) return categoryFrom(pi.last_payment_error)
    const id = typeof pi === 'string' ? pi : pi.id
    if (!id) return null
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), RENEWAL_DECLINE_READ_TIMEOUT_MS))
    const live = await Promise.race([stripe.paymentIntents.retrieve(id), timeout])
    if (!live) return null
    return categoryFrom(live.last_payment_error as PaymentErrorShape)
  } catch (err) {
    console.warn('[renewal-decline] could not read the decline reason:', err instanceof Error ? err.message : String(err))
    return null
  }
}
