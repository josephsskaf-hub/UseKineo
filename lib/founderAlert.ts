// KINEO-FLUXO-NOVO-2026-09-25 — o fundador fica sabendo do pedido pago NA HORA.
//
// POR QUÊ. Dois produtos prometem gente de verdade depois do pagamento: Express/Pro (Kineo Empresas,
// entrega em 48/72 h por um humano) e o passe do Studio Ads ("um editor humano revisa o seu 1º anúncio
// em 24 h", lib/ads/offer.ts). Até 25/09 nenhum dos dois avisava ninguém: o pedido virava uma linha em
// `events` que o fundador só achava por SQL. Promessa com prazo e sem alarme é promessa que vence calada
// (regra de 24/08: nunca prometer o que o produto não sabe executar sozinho).
//
// COMO CHEGA. Reusa notifyFounder (lib/supplier/notify.ts): Resend + KINEO_ALERT_WEBHOOK_URL em paralelo,
// destinatário KINEO_ALERT_EMAIL. Nada de transporte novo.
//
// TRÊS REGRAS, todas porque isto roda DENTRO do webhook da Stripe:
//  1. NUNCA LANÇA. Alerta que falha não pode virar 500 no webhook (a Stripe reenviaria um pagamento já
//     concedido). Toda saída é um valor de FounderAlertOutcome.
//  2. TETO DE 3 s. notifyFounder espera até 8 s por canal e o Next 14.2.5 não tem waitUntil; o webhook
//     não pode ficar refém do Resend. Estourou o teto = 'timeout' gravado, e o /admin/ads mostra o pedido.
//  3. UMA VEZ POR SESSÃO. Antes de enviar, uma linha `founder_order_alerted` com id determinístico
//     (tipo + sessão da Stripe) é inserida: reentrega da Stripe ou retomada do webhook dá 23505 e não
//     reenvia. Se o banco falhar ao reservar, o alerta SAI mesmo assim — dois e-mails custam menos que
//     um pedido pago que ninguém viu.
import { createHash } from 'node:crypto'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { notifyFounder } from '@/lib/supplier/notify'
import { DFY_TIERS, type DfyTier } from '@/lib/growth/dfyOffer'
import { dfySessionTier } from '@/lib/growth/dfySession'
import { dfyBriefUrl, paymentLinkFields, type DfyBrief } from '@/lib/growth/dfyBrief'
import { DFY_SERVICE_FACT } from '@/lib/growth/dfyServiceFacts'
import { ADS_PRODUCT_NAME } from '@/lib/ads/offer'

export const FOUNDER_ALERT_EVENT = 'founder_order_alerted' as const
export const FOUNDER_ALERT_TIMEOUT_MS = 3000
export type FounderAlertKind = 'dfy_order' | 'ads_pass' | 'dfy_brief'
export type FounderAlertOutcome = 'sent' | 'failed' | 'timeout' | 'duplicate' | 'error'

/** Origem pública do site: a mesma URL que a página /business-video-ads declara (fonte única, sem domínio redigitado). */
const SITE_ORIGIN = new URL(DFY_SERVICE_FACT.url).origin
const ADMIN_ADS_URL = `${SITE_ORIGIN}/admin/ads`

/** Id da reserva do alerta: o MESMO tipo + a MESMA sessão caem sempre na mesma linha. */
export function founderAlertEventId(kind: FounderAlertKind, stripeSessionId: string): string {
  const hex = createHash('sha256').update(`${FOUNDER_ALERT_EVENT}:${kind}:${stripeSessionId}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export interface FounderAlertInput {
  kind: FounderAlertKind
  stripeSessionId: string
  subject: string
  text: string
  path?: string
}

/**
 * Reserva → envia (≤ FOUNDER_ALERT_TIMEOUT_MS) → anota o desfecho na reserva. Nunca lança.
 * 'duplicate' = já havia reserva para este tipo + sessão (nada foi enviado de novo).
 */
export async function alertFounderOnce(input: FounderAlertInput): Promise<FounderAlertOutcome> {
  try {
    const id = founderAlertEventId(input.kind, input.stripeSessionId)
    const db = adminDb()
    const baseMeta = { kind: input.kind, stripe_session_id: input.stripeSessionId, source: 'founder_alert' }
    let reserved = false
    if (db) {
      try {
        const { error } = await db.from('events').insert({
          id,
          name: FOUNDER_ALERT_EVENT,
          user_id: null,
          path: input.path ?? '/api/stripe/webhook',
          metadata: { ...baseMeta, state: 'reserved' },
        })
        if (error?.code === '23505') return 'duplicate'
        if (error) console.error('[founder-alert] reserva falhou, envio segue sem dedupe:', error.code, error.message)
        reserved = !error
      } catch (e) {
        console.error('[founder-alert] reserva lançou, envio segue sem dedupe:', e instanceof Error ? e.message : String(e))
      }
    } else {
      console.error('[founder-alert] Supabase service role ausente — envio segue sem dedupe')
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    const timeout = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), FOUNDER_ALERT_TIMEOUT_MS) })
    let outcome: FounderAlertOutcome
    let channels: { email: string; webhook: string } | null = null
    try {
      const res = await Promise.race([notifyFounder(input.subject, input.text), timeout])
      if (res === 'timeout') outcome = 'timeout'
      else {
        channels = { email: res.email, webhook: res.webhook }
        outcome = res.delivered ? 'sent' : 'failed'
      }
    } catch (e) {
      console.error('[founder-alert] envio lançou:', e instanceof Error ? e.message : String(e))
      outcome = 'failed'
    } finally {
      if (timer) clearTimeout(timer)
    }

    if (db && reserved) {
      try {
        await db.from('events').update({ metadata: { ...baseMeta, state: outcome, ...(channels ?? {}) } }).eq('id', id)
      } catch { /* o desfecho é anotação; o alerta já saiu (ou não) */ }
    }
    if (outcome !== 'sent') console.error(`[founder-alert] ${input.kind} ${input.stripeSessionId}: ${outcome}`)
    return outcome
  } catch (e) {
    console.error('[founder-alert] falha inesperada:', e instanceof Error ? e.message : String(e))
    return 'error'
  }
}

// Moedas sem casa decimal na Stripe (a conta tem Adaptive Pricing: o comprador pode pagar em moeda local).
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'])

/** Valor pago como a Stripe cobrou (moeda da sessão), sem conversão nem arredondamento inventado. */
export function paidAmountLabel(amountMinor: number | null | undefined, currency: string | null | undefined): string {
  const cur = (currency ?? '').toLowerCase()
  if (typeof amountMinor !== 'number' || !Number.isFinite(amountMinor) || !cur) return 'valor não informado'
  return ZERO_DECIMAL.has(cur) ? `${amountMinor} ${cur.toUpperCase()}` : `${(amountMinor / 100).toFixed(2)} ${cur.toUpperCase()}`
}

function buyerLine(session: Pick<Stripe.Checkout.Session, 'customer_details' | 'customer_email'>): string {
  const email = session.customer_details?.email ?? session.customer_email ?? '(sem e-mail)'
  const name = session.customer_details?.name
  return name ? `${name} <${email}>` : email
}

/** Texto do alerta de pedido Express/Pro pago (puro: a sessão entra, o e-mail sai). */
export function dfyOrderAlertMessage(session: Stripe.Checkout.Session, now: Date = new Date()): { subject: string; text: string } {
  const tier: DfyTier | null = dfySessionTier(session)
  const spec = tier ? DFY_TIERS[tier] : null
  const deadline = spec ? new Date(now.getTime() + spec.hours * 3600_000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : null
  const fields = paymentLinkFields(session.custom_fields).map((f) => `  · ${f.label ?? f.key ?? 'campo'}: ${f.value ?? '(vazio)'}`)
  const subject = `[Kineo] Pedido Empresas pago: ${spec ? `${spec.name}, prazo ${spec.hours} h` : 'degrau desconhecido (link legado?)'}`
  const text = [
    'Pedido Kineo Empresas PAGO. Entrega por gente: o relógio começou.',
    spec ? `Degrau: ${spec.name} · prazo ${spec.hours} h (até ${deadline}) · ${spec.revisions} ${spec.revisions === 1 ? 'revisão' : 'revisões'}` : 'Degrau: desconhecido — conferir o link na Stripe.',
    `Valor: ${paidAmountLabel(session.amount_total, session.currency)}`,
    `Comprador: ${buyerLine(session)}`,
    'Campos do Payment Link:',
    ...(fields.length ? fields : ['  (nenhum)']),
    '',
    `Briefing (mande ao cliente se ele não chegou lá sozinho): ${dfyBriefUrl(SITE_ORIGIN, session.id)}`,
    `Painel: ${ADMIN_ADS_URL}`,
    `Sessão Stripe: ${session.id}`,
    'Não produza na conta do fundador: ela força marca d\'água e cartão final da Kineo (decisão 25/09).',
  ].join('\n')
  return { subject, text }
}

/** Pedido Express/Pro pago — chamado pelo webhook DEPOIS de dfy_order_paid gravado. Nunca lança. */
export async function alertFounderDfyOrder(session: Stripe.Checkout.Session): Promise<FounderAlertOutcome> {
  try {
    const { subject, text } = dfyOrderAlertMessage(session)
    return await alertFounderOnce({ kind: 'dfy_order', stripeSessionId: session.id, subject, text })
  } catch {
    return 'error'
  }
}

/** Passe do Studio Ads pago E concedido — chamado pelo webhook DEPOIS de ads_access_granted. Nunca lança. */
export async function alertFounderAdsPass(input: { session: Stripe.Checkout.Session; userId: string; credits: number; until: string | null }): Promise<FounderAlertOutcome> {
  try {
    const { session } = input
    const subject = `[Kineo] ${ADS_PRODUCT_NAME}: passe pago e concedido`
    const text = [
      `Passe do ${ADS_PRODUCT_NAME} PAGO e concedido.`,
      `Conta: ${input.userId} · ${buyerLine(session)}`,
      `Créditos: ${input.credits} · acesso até ${input.until ?? '(sem data)'}`,
      `Valor: ${paidAmountLabel(session.amount_total, session.currency)}`,
      'A página promete revisão humana do 1º anúncio em 24 h: ele aparece no painel quando for entregue.',
      `Painel: ${ADMIN_ADS_URL}`,
      `Sessão Stripe: ${session.id}`,
    ].join('\n')
    return await alertFounderOnce({ kind: 'ads_pass', stripeSessionId: session.id, subject, text })
  } catch {
    return 'error'
  }
}

/** Primeiro briefing de um pedido Express/Pro — chamado pela rota do briefing. Nunca lança. */
export async function alertFounderDfyBrief(input: { stripeSessionId: string; tier: DfyTier | null; email: string | null; brief: DfyBrief }): Promise<FounderAlertOutcome> {
  try {
    const b = input.brief
    const spec = input.tier ? DFY_TIERS[input.tier] : null
    const subject = `[Kineo] Briefing recebido: ${spec ? spec.name : 'pedido Empresas'}`
    const text = [
      `Briefing do pedido ${spec ? `${spec.name} (prazo ${spec.hours} h desde o pagamento)` : 'Empresas'} chegou.`,
      `Comprador: ${input.email ?? '(sem e-mail)'}`,
      `Negócio: ${b.business}`,
      `Objetivo: ${b.goal}`,
      `Público: ${b.audience || '(não informado)'}`,
      `Idioma: ${b.language}`,
      `CTA: ${b.cta}`,
      `Fatos aprovados: ${b.facts || '(nenhum)'}`,
      `Links: ${b.links.length ? b.links.join(' ') : '(nenhum — arquivos podem chegar como resposta ao recibo)'}`,
      `Painel: ${ADMIN_ADS_URL}`,
      `Sessão Stripe: ${input.stripeSessionId}`,
    ].join('\n')
    return await alertFounderOnce({ kind: 'dfy_brief', stripeSessionId: input.stripeSessionId, subject, text, path: '/api/dfy/brief' })
  } catch {
    return 'error'
  }
}
