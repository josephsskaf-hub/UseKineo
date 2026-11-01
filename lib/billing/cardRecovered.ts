// ═══ KINEO-CARTAO-RECUSADO-0111 — "o cartão voltou": a fatura de assinatura PAGA depois de ter falhado ═══
//
// Sem este evento o laço do cartão recusado não tinha fim medido: sabíamos quantos e-mails saíram
// (`card_failed_email_sent`, attempt 1/2/3) e não quantos assinantes VOLTARAM a pagar. Medido em 13/10: 3 de 4 perdas na
// 1ª renovação foram cartão recusado — é aqui que se vê se a régua dia 1 · dia 3 · dia 7 salva alguém.
//
// Chamado pelo webhook da Stripe (invoice.payment_succeeded, caminho da renovação, DEPOIS do crédito dado e do
// `subscription_invoice_paid`). Regras:
//   1. NUNCA LANÇA. Medição não pode virar 500 nem mudar a resposta à Stripe.
//   2. "Depois de falha" = a Stripe tentou mais de uma vez (`attempt_count > 1`) OU existe e-mail nosso de cartão recusado
//      para ESTA fatura. Pagamento de primeira não é recuperação.
//   3. Uma linha por fatura: o caminho que chama só roda uma vez por fatura (chave renewal_granted:<fatura>), e a
//      gravação ainda leva sessionId por fatura com dedupe de 24 h.
//   4. Só LÊ `events` (uma consulta `.eq` por nome, `.limit`): nada de `.in()` que trunca.
import type { SupabaseClient } from '@supabase/supabase-js'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  CARD_RECOVERED_EVENT,
  RENEWAL_FAILED_EMAIL_EVENT,
  RENEWAL_FAILED_FINAL_EVENT,
  RENEWAL_FAILED_REMINDER_EVENT,
} from '@/lib/billing/renewalFailedEmail'

export const CARD_RECOVERED_VERSION = 'card_recovered_v1'

export interface CardRecoveredFacts {
  /** invoice.attempt_count da fatura paga. */
  attemptCount: number | null | undefined
  /** Quantos e-mails de cartão recusado (1º aviso, lembrete, último) saíram para esta fatura. null = leitura falhou. */
  emailsSent: number | null
}

export type CardRecoveredDecision =
  | { record: true; reason: 'retried' | 'emailed' }
  | { record: false; reason: 'first_try' }

/** Puro. Leitura de e-mails que falhou não apaga a recuperação: attempt_count > 1 já basta. */
export function decideCardRecovered(f: CardRecoveredFacts): CardRecoveredDecision {
  if (typeof f.emailsSent === 'number' && f.emailsSent > 0) return { record: true, reason: 'emailed' }
  if (typeof f.attemptCount === 'number' && f.attemptCount > 1) return { record: true, reason: 'retried' }
  return { record: false, reason: 'first_try' }
}

const STAMPS: Array<[string, 'first' | 'reminder' | 'final']> = [
  [RENEWAL_FAILED_EMAIL_EVENT, 'first'],
  [RENEWAL_FAILED_REMINDER_EVENT, 'reminder'],
  [RENEWAL_FAILED_FINAL_EVENT, 'final'],
]

export async function recordCardRecoveredIfAny(
  admin: SupabaseClient,
  input: {
    invoiceId: string | null | undefined
    attemptCount: number | null | undefined
    userId: string
    subscriptionId: string
    tier: string | null
    amountPaid: number | null | undefined
    currency: string | null | undefined
    billingReason: string | null | undefined
    nowMs?: number
  },
): Promise<boolean> {
  try {
    const invoiceId = typeof input.invoiceId === 'string' && input.invoiceId ? input.invoiceId : null
    let emailsSent: number | null = invoiceId ? 0 : null
    let firstEmailAt: string | null = null
    let lastStage: 'first' | 'reminder' | 'final' | null = null
    if (invoiceId) {
      for (const [name, stage] of STAMPS) {
        const { data, error } = await admin
          .from('events')
          .select('created_at')
          .eq('name', name)
          .eq('metadata->>invoice_id', invoiceId)
          .order('created_at', { ascending: true })
          .limit(1)
        if (error) { emailsSent = null; break }
        const at = (data ?? [])[0] as { created_at?: string } | undefined
        if (typeof at?.created_at === 'string') {
          if (emailsSent !== null) emailsSent++
          lastStage = stage
          if (stage === 'first') firstEmailAt = at.created_at
        }
      }
    }
    const decision = decideCardRecovered({ attemptCount: input.attemptCount, emailsSent })
    if (!decision.record) return false
    const nowMs = input.nowMs ?? Date.now()
    const firstMs = firstEmailAt ? Date.parse(firstEmailAt) : NaN
    return await writeServerEvent({
      name: CARD_RECOVERED_EVENT,
      userId: input.userId,
      path: '/api/stripe/webhook',
      sessionId: invoiceId ? `card_recovered:${invoiceId}` : null,
      dedupeMinutes: 24 * 60,
      metadata: {
        version: CARD_RECOVERED_VERSION,
        source: 'stripe_webhook',
        reason: decision.reason,
        invoice_id: invoiceId,
        subscription_ref: input.subscriptionId,
        tier: input.tier,
        billing_reason: input.billingReason ?? null,
        stripe_attempts: typeof input.attemptCount === 'number' ? input.attemptCount : null,
        emails_sent: emailsSent,
        last_email_stage: lastStage,
        hours_since_first_email: Number.isFinite(firstMs) ? Math.round((nowMs - firstMs) / 3_600_000) : null,
        amount_paid: input.amountPaid ?? null,
        currency: input.currency ?? null,
      },
    })
  } catch (err) {
    console.warn('[card-recovered] could not record (webhook continues):', err instanceof Error ? err.message : String(err))
    return false
  }
}
