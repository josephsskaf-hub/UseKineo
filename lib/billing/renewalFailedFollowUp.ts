// ═══ KINEO-CARTAO-RECUSADO-1510 — a rodada do cron: 1º aviso que faltou + lembrete do dia 2, fatura a fatura ═══
//
// O webhook (app/api/stripe/webhook/route.ts, sendRenewalFailedEmailOnce) manda o 1º aviso na 1ª falha de cada fatura
// de renovação. Esta rodada, 2×/dia, cobre o que o webhook não cobre:
//   · LEMBRETE do dia 2 — 1 por fatura, ≥ 20 h depois do 1º aviso, só se a fatura AINDA está aberta;
//   · 1º AVISO QUE FALTOU — o webhook não conseguiu mandar (Resend fora do ar, fatura de antes de 06/10).
// SE manda e O QUE manda: lib/billing/renewalFailedEmail.ts (puro). Aqui só o I/O, com as regras da casa:
//   1. A FONTE é a Stripe viva: `subscriptions.list({ status: 'past_due' })` com paginação automática (a Stripe pagina
//      por data de criação; teto de RENEWAL_FOLLOWUP_MAX_SUBSCRIPTIONS, e o relatório diz se cortou). Nada de `.in()`
//      gigante nem lista do banco que trunca em 1000 sem erro.
//   2. DEDUPE POR FATURA, uma leitura por fatura (`.eq` no nome + `metadata->>invoice_id`, `.limit(1)`): não trunca.
//      Leitura que falha = desconhecido = não envia agora.
//   3. CONFERE NO ENVIO SE JÁ PAGOU: a fatura é RELIDA na Stripe (`invoices.retrieve`) na mesma volta do laço, logo
//      antes do POST no Resend. Fatura que não está 'open' (paga, anulada, incobrável) não recebe nada.
//   4. DRY-RUN POR PADRÃO: sem `confirm` nada sai e nada é carimbado; o relatório diz quem receberia e por quê.
//   5. CARIMBO SÓ COM O RESEND DIZENDO OK; falha vira evento `_failed` (sem carimbo, a próxima rodada tenta de novo).
//   6. Nada aqui muda preço, cupom, plano, crédito ou cobrança: só LÊ a Stripe e manda e-mail.
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import { recordResendResponse, recordEmailSend } from '@/lib/email/quota'
import { isInternalEmail } from '@/lib/internalAccounts'
import { readInvoiceDeclineCategory } from '@/lib/billing/renewalDecline'
import {
  RENEWAL_FAILED_EMAIL_EVENT,
  RENEWAL_FAILED_EMAIL_FAILED_EVENT,
  RENEWAL_FAILED_EMAIL_FROM,
  RENEWAL_FAILED_EMAIL_KIND,
  RENEWAL_FAILED_EMAIL_LIVE,
  RENEWAL_FAILED_EMAIL_REPLY_TO,
  RENEWAL_FAILED_EMAIL_VERSION,
  RENEWAL_FAILED_REMINDER_EVENT,
  RENEWAL_FAILED_REMINDER_FAILED_EVENT,
  RENEWAL_FAILED_REMINDER_KIND,
  RENEWAL_FAILED_UPDATE_CARD_URL,
  decideRenewalFollowUp,
  renewalEmailLanguage,
  renewalFailedEmailMessage,
  renewalPayUrl,
  type RenewalFollowUpDecision,
} from '@/lib/billing/renewalFailedEmail'

/** `?etapa=lembrete` na rota admin/send-renewal-declined liga esta rodada (o cron do vercel.json usa este valor). */
export const RENEWAL_FOLLOWUP_STAGE_PARAM = 'etapa'
export const RENEWAL_FOLLOWUP_STAGE_VALUE = 'lembrete'
export const RENEWAL_FOLLOWUP_MAX_SUBSCRIPTIONS = 300
export const RENEWAL_FOLLOWUP_MAX_BATCH = 30
const RENEWAL_FOLLOWUP_SEND_TIMEOUT_MS = 8000
const RENEWAL_FOLLOWUP_PATH = '/api/admin/send-renewal-declined'

type FollowUpRow = {
  email: string | null
  subscription_ref: string
  invoice_id: string | null
  invoice_status: string | null
  decision: string
  stage: 'first' | 'reminder' | null
  outcome?: 'sent' | 'failed' | 'held_by_limit'
}

export type RenewalFollowUpReport = {
  mode: 'DRY_RUN' | 'SENT'
  trigger: 'cron' | 'admin'
  past_due_subscriptions: number
  truncated: boolean
  would_send: number
  sent: number
  failed: number
  counts: Record<string, number>
  rows: FollowUpRow[]
  hint: string
}

async function readStamp(
  admin: SupabaseClient,
  name: string,
  invoiceId: string,
): Promise<{ ok: true; createdAt: string | null } | { ok: false }> {
  const { data, error } = await admin
    .from('events')
    .select('created_at')
    .eq('name', name)
    .eq('metadata->>invoice_id', invoiceId)
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) {
    console.error('[renewal-followup] stamp read failed:', name, invoiceId, error.message)
    return { ok: false }
  }
  const first = (data ?? [])[0] as { created_at?: string } | undefined
  return { ok: true, createdAt: typeof first?.created_at === 'string' ? first.created_at : null }
}

export async function runRenewalFollowUp(params: {
  admin: SupabaseClient
  confirm: boolean
  limit: number
  trigger: 'cron' | 'admin'
  resendApiKey: string
  nowMs?: number
}): Promise<RenewalFollowUpReport> {
  const { admin, confirm, trigger, resendApiKey } = params
  const limit = Number.isFinite(params.limit) && params.limit > 0 ? Math.min(Math.floor(params.limit), RENEWAL_FOLLOWUP_MAX_BATCH) : RENEWAL_FOLLOWUP_MAX_BATCH
  const nowMs = params.nowMs ?? Date.now()

  // 1. Fonte: a Stripe viva. Uma falha aqui LANÇA — a rota devolve 500 e a próxima rodada tenta; nada foi enviado.
  const subscriptions: Stripe.Subscription[] = []
  let truncated = false
  for await (const sub of stripe.subscriptions.list({ status: 'past_due', limit: 100 })) {
    if (subscriptions.length >= RENEWAL_FOLLOWUP_MAX_SUBSCRIPTIONS) { truncated = true; break }
    subscriptions.push(sub)
  }

  const rows: FollowUpRow[] = []
  const counts: Record<string, number> = {}
  let wouldSend = 0
  let sent = 0
  let failed = 0
  const bump = (key: string) => { counts[key] = (counts[key] ?? 0) + 1 }

  for (const sub of subscriptions) {
    const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id ?? null
    const row: FollowUpRow = { email: null, subscription_ref: sub.id, invoice_id: invoiceId, invoice_status: null, decision: '', stage: null }

    // 2. Dono pela assinatura (uma linha, `.eq`).
    const { data: owner, error: ownerErr } = await admin
      .from('profiles')
      .select('id, email, has_paid, plan, signup_country, last_country')
      .eq('stripe_subscription_id', sub.id)
      .maybeSingle()
    if (ownerErr) {
      row.decision = 'profile_unavailable'
      bump(row.decision)
      rows.push(row)
      continue
    }
    const email = typeof owner?.email === 'string' ? owner.email.trim() : ''
    row.email = email || null

    // 3. Carimbos desta fatura (1º aviso e lembrete).
    let firstSentAt: string | null = null
    let reminderSent = false
    let dedupeReadable = false
    if (invoiceId) {
      const [firstStamp, reminderStamp] = await Promise.all([
        readStamp(admin, RENEWAL_FAILED_EMAIL_EVENT, invoiceId),
        readStamp(admin, RENEWAL_FAILED_REMINDER_EVENT, invoiceId),
      ])
      dedupeReadable = firstStamp.ok && reminderStamp.ok
      firstSentAt = firstStamp.ok ? firstStamp.createdAt : null
      reminderSent = reminderStamp.ok ? reminderStamp.createdAt !== null : false
    }

    // 4. A fatura RELIDA agora: é o "já pagou?" do momento do envio.
    let invoice: Stripe.Invoice | null = null
    if (invoiceId) {
      try {
        invoice = await stripe.invoices.retrieve(invoiceId)
      } catch (err) {
        console.error('[renewal-followup] invoice retrieve failed:', invoiceId, err instanceof Error ? err.message : String(err))
        row.decision = 'stripe_unavailable'
        bump(row.decision)
        rows.push(row)
        continue
      }
    }
    row.invoice_status = invoice?.status ?? null

    const decision: RenewalFollowUpDecision = decideRenewalFollowUp({
      live: RENEWAL_FAILED_EMAIL_LIVE,
      billingReason: invoice?.billing_reason ?? null,
      invoiceId,
      invoiceStatus: invoice?.status ?? null,
      subscriptionStatus: sub.status,
      ownerId: typeof owner?.id === 'string' ? owner.id : null,
      ownerHasPaid: owner?.has_paid === true,
      internal: isInternalEmail(email),
      dedupeReadable,
      firstSentAt,
      reminderSent,
      recipientEmail: email,
      nowMs,
    })
    row.decision = decision.reason
    bump(decision.reason)
    if (!decision.send || !invoice || !owner?.id) { rows.push(row); continue }
    row.stage = decision.stage
    wouldSend++

    if (!confirm) { rows.push(row); continue }
    if (sent + failed >= limit) { row.outcome = 'held_by_limit'; rows.push(row); continue }

    // 5. Envio. Motivo e link saem da fatura relida; a carta é a mesma do webhook (+ lembrete).
    const ownerId = String(owner.id)
    const reasonCategory = await readInvoiceDeclineCategory(invoice)
    const payLink = renewalPayUrl(invoice.hosted_invoice_url)
    const message = renewalFailedEmailMessage({
      language: renewalEmailLanguage((owner.last_country as string | null) || (owner.signup_country as string | null)),
      tier: (typeof sub.metadata?.tier === 'string' ? sub.metadata.tier : null) ?? (owner.plan as string | null) ?? null,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      reasonCategory,
      stage: decision.stage,
    })
    const kind = decision.stage === 'reminder' ? RENEWAL_FAILED_REMINDER_KIND : RENEWAL_FAILED_EMAIL_KIND
    const base = {
      version: RENEWAL_FAILED_EMAIL_VERSION,
      source: 'renewal_followup_cron',
      trigger,
      invoice_id: invoiceId,
      subscription_ref: sub.id,
      attempt: typeof invoice.attempt_count === 'number' ? invoice.attempt_count : null,
      billing_reason: invoice.billing_reason ?? null,
      stage: decision.stage,
      language: message.language,
      link: payLink === RENEWAL_FAILED_UPDATE_CARD_URL ? 'portal' : 'hosted_invoice',
      reason_category: reasonCategory,
    }
    let res: Response | null = null
    let sendError: string | null = null
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(RENEWAL_FOLLOWUP_SEND_TIMEOUT_MS),
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: RENEWAL_FAILED_EMAIL_FROM,
          to: [email],
          reply_to: RENEWAL_FAILED_EMAIL_REPLY_TO,
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      })
    } catch (err) {
      sendError = (err instanceof Error ? err.message : String(err)).slice(0, 200)
    }
    if (res) await recordResendResponse({ kind, priority: 'revenue', userId: ownerId, res, admin })
    else await recordEmailSend({ kind, priority: 'revenue', userId: ownerId, ok: false, detail: sendError, admin })

    if (!res || !res.ok) {
      failed++
      row.outcome = 'failed'
      await writeServerEvent({
        name: decision.stage === 'reminder' ? RENEWAL_FAILED_REMINDER_FAILED_EVENT : RENEWAL_FAILED_EMAIL_FAILED_EVENT,
        userId: ownerId,
        path: RENEWAL_FOLLOWUP_PATH,
        metadata: { ...base, http_status: res?.status ?? null, error: sendError },
      })
      rows.push(row)
      continue
    }

    const receipt = (await res.json().catch(() => null)) as { id?: unknown } | null
    const stamped = await writeServerEvent({
      name: decision.stage === 'reminder' ? RENEWAL_FAILED_REMINDER_EVENT : RENEWAL_FAILED_EMAIL_EVENT,
      userId: ownerId,
      path: RENEWAL_FOLLOWUP_PATH,
      metadata: { ...base, provider_id: typeof receipt?.id === 'string' ? receipt.id : null },
    })
    if (!stamped) console.error('[renewal-followup] SENT but not stamped — the next round may resend:', invoiceId, decision.stage)
    sent++
    row.outcome = 'sent'
    rows.push(row)
    await new Promise((resolve) => setTimeout(resolve, 600))
  }

  return {
    mode: confirm ? 'SENT' : 'DRY_RUN',
    trigger,
    past_due_subscriptions: subscriptions.length,
    truncated,
    would_send: wouldSend,
    sent,
    failed,
    counts,
    rows,
    hint: confirm
      ? 'Enviado. Cada envio tem carimbo por fatura (1º aviso ou lembrete); nada de preço, plano, crédito ou cobrança foi tocado.'
      : 'DRY-RUN: nada saiu. Acrescente &confirm=SEND (e opcionalmente &limit=N, teto 30) para enviar.',
  }
}
