// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DODO-2026-09-07 — /api/dodo/webhook: onde o pagamento UPI/Pix vira crédito
// ═══════════════════════════════════════════════════════════════════════════
// Endpoint já registrado na Dodo (handoff de 07/09) assinando TODOS os tipos:
// credit.*, dispute.*, refund.* chegam aqui também e recebem 200 `{ignored}`.
//
// ORDEM QUE NÃO SE INVERTE (a auditoria de 28/08 achou o PayPal com "claim
// antes do grant, erro engolido" — tabela vazia, risco armado):
//   1. corpo CRU antes de qualquer JSON.parse (a assinatura é sobre os bytes);
//   2. sem DODO_WEBHOOK_SECRET → 503, fecha fechado, não concede nada;
//   3. assinatura inválida → 401, zero efeito colateral;
//   4. guard de idempotência (dodo_events) ANTES da concessão;
//   5. concessão; se ESTOURAR, o guard é APAGADO e a resposta é 500 para o
//      fornecedor reenviar. Nunca engolir. Nunca conceder duas vezes.
//
// As escritas de coluna são o espelho do webhook da Stripe (lib/payments/
// grant.ts explica); o evento `payment_success` tem a MESMA forma da Stripe
// com `metadata.rail = 'dodo'`, para o placar separar os trilhos.
//
// Conta apagada (user id do metadata não resolve) → evento
// `dodo_webhook_orphan` + 200: reenviar para sempre não ressuscita ninguém.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import {
  dodoMetadataString,
  dodoMode,
  isDodoSku,
  parseDodoEnvelope,
  verifyDodoWebhook,
  type DodoWebhookEnvelope,
} from '@/lib/dodo'
import { DODO_SKU_TO_TIER, dodoSkuCheckoutMode, dodoSkuCredits, isDodoSubscriptionSku } from '@/lib/dodoCatalog'
import {
  RetryableGrantError,
  grantOneTimePackCredits,
  grantSubscriptionPlan,
  renewSubscriptionCredits,
  revokeSubscriptionPlan,
  type AdminClient,
} from '@/lib/payments/grant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SUBSCRIPTION_COLUMN = 'dodo_subscription_id' as const

type OrphanReason = 'no_user_in_metadata' | 'user_not_found' | 'unknown_sku'

function adminClient(): AdminClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function str(data: Record<string, unknown>, key: string): string | null {
  const v = data[key]
  return typeof v === 'string' && v.length > 0 ? v : null
}

function num(data: Record<string, unknown>, key: string): number | null {
  const v = data[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function deterministicUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function browserSessionFrom(data: DodoWebhookEnvelope['data']): string | null {
  const raw = dodoMetadataString(data, 'browser_session_id') ?? ''
  return /^[A-Za-z0-9_-]{8,64}$/.test(raw) ? raw : null
}

async function recordEvent(
  admin: AdminClient,
  name: 'dodo_webhook_orphan' | 'dodo_payment_failed' | 'dodo_subscription_revoked',
  userId: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await admin.from('events').insert({
      name,
      user_id: userId,
      path: '/api/dodo/webhook',
      session_id: null,
      metadata,
    })
    if (error) console.error('[dodo webhook] event insert failed:', name, error.code, error.message)
  } catch (err) {
    console.error('[dodo webhook] event insert threw:', name, err)
  }
}

/**
 * Espelho de recordPaymentSuccess do webhook da Stripe: uma linha canônica por
 * pagamento, id determinístico, dedupe por `dodo_payment_id`, e `rail: 'dodo'`.
 * Não é retentável de propósito: analytics não segura crédito.
 */
async function recordPaymentSuccess(
  admin: AdminClient,
  webhookId: string,
  data: DodoWebhookEnvelope['data'],
  userId: string | null,
): Promise<void> {
  const paymentId = str(data, 'payment_id')
  if (!paymentId) return
  const { data: existing, error: existingError } = await admin
    .from('events')
    .select('id')
    .eq('name', 'payment_success')
    .contains('metadata', { dodo_payment_id: paymentId })
    .limit(1)
  if (!existingError && existing && existing.length > 0) return
  if (existingError) {
    console.error('[dodo webhook] payment_success dedupe lookup error:', existingError.code, existingError.message)
  }

  const sku = dodoMetadataString(data, 'sku')
  const tier = dodoMetadataString(data, 'tier')
  const pack = dodoMetadataString(data, 'pack')
  const subscriptionId = str(data, 'subscription_id')
  const customer = data.customer && typeof data.customer === 'object' ? (data.customer as Record<string, unknown>) : {}
  const row = {
    id: deterministicUuid(`payment_success:dodo:${paymentId}`),
    name: 'payment_success',
    user_id: userId,
    path: '/api/dodo/webhook',
    session_id: browserSessionFrom(data),
    metadata: {
      source: 'dodo_webhook',
      rail: 'dodo',
      dodo_mode: dodoMode(),
      dodo_event_id: webhookId,
      dodo_payment_id: paymentId,
      dodo_subscription_id: subscriptionId,
      dodo_customer_id: str(customer, 'customer_id'),
      checkout_mode: subscriptionId ? 'subscription' : sku && isDodoSku(sku) ? dodoSkuCheckoutMode(sku) : null,
      tier: tier || null,
      billing: subscriptionId ? 'monthly' : null,
      pack: pack || null,
      sku,
      ip_country: dodoMetadataString(data, 'ip_country'),
      intro: false,
      // A Dodo cobra INR/BRL na tela e nos paga em USD; `total_amount` vem em
      // centavos da moeda de liquidação. Gravamos o que veio, sem converter.
      amount_total: num(data, 'total_amount') ?? 0,
      currency: (str(data, 'currency') ?? 'USD').toLowerCase(),
      payment_method: str(data, 'payment_method'),
      payment_method_type: str(data, 'payment_method_type'),
    },
  }
  const { error } = await admin.from('events').insert(row)
  if (!error || error.code === '23505') return
  if (userId && error.code === '23503') {
    const { error: anonymousError } = await admin.from('events').insert({ ...row, user_id: null })
    if (!anonymousError || anonymousError.code === '23505') return
    console.error('[dodo webhook] payment_success fallback insert error:', anonymousError.code, anonymousError.message)
    return
  }
  console.error('[dodo webhook] payment_success insert error:', error.code, error.message)
}

/** Resolve a conta do metadata. null = órfão (não retentável). */
async function resolveUser(
  admin: AdminClient,
  data: DodoWebhookEnvelope['data'],
): Promise<{ userId: string } | { orphan: OrphanReason }> {
  const userId = dodoMetadataString(data, 'supabase_user_id')
  if (!userId) return { orphan: 'no_user_in_metadata' }
  const { data: profile, error } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (error) {
    // Banco indisponível é retentável; conta inexistente não.
    throw new RetryableGrantError(`profile lookup failed (${userId}): ${error.message}`)
  }
  if (!profile?.id) return { orphan: 'user_not_found' }
  return { userId }
}

export async function POST(req: NextRequest) {
  // 1. Corpo cru ANTES de qualquer parse — a assinatura cobre os bytes exatos.
  const rawBody = await req.text()

  // 2. Sem segredo, fecha fechado. 503, não 500: é estado esperado enquanto o
  //    fundador não colar DODO_WEBHOOK_SECRET; nada é concedido sem verificação.
  const secret = process.env.DODO_WEBHOOK_SECRET
  if (!secret || !secret.trim()) {
    return NextResponse.json(
      { error: 'Webhook secret is not configured', missing_env: ['DODO_WEBHOOK_SECRET'] },
      { status: 503 },
    )
  }

  // 3. Assinatura. Inválida → 401 sem efeito colateral algum.
  const signatureOk = verifyDodoWebhook(rawBody, req.headers, secret)
  if (!signatureOk) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const envelope = parseDodoEnvelope(rawBody)
  if (!envelope) {
    return NextResponse.json({ error: 'Malformed envelope' }, { status: 400 })
  }
  const webhookId = req.headers.get('webhook-id') ?? ''
  const eventType = envelope.type
  const data = envelope.data

  const admin = adminClient()
  if (!admin) {
    console.error('[dodo webhook] SUPABASE service credentials missing')
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 500 })
  }

  // 4. Guard de idempotência ANTES de qualquer concessão. `webhook-id` é
  //    estável entre reenvios do mesmo evento (Standard Webhooks).
  let guardAcquired = false
  try {
    const { error: guardErr } = await admin.from('dodo_events').insert({ id: webhookId, event_type: eventType })
    if (!guardErr) {
      guardAcquired = true
    } else if (guardErr.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    } else {
      console.error('[dodo webhook] guard insert error:', guardErr.code, guardErr.message)
      return NextResponse.json({ error: 'Webhook idempotency unavailable' }, { status: 500 })
    }
  } catch (err) {
    console.error('[dodo webhook] guard threw:', err)
    return NextResponse.json({ error: 'Webhook idempotency unavailable' }, { status: 500 })
  }

  // 5. Concessão. Qualquer estouro abaixo SOLTA o guard e responde 500.
  try {
    switch (eventType) {
      case 'payment.succeeded': {
        const resolved = await resolveUser(admin, data)
        if ('orphan' in resolved) {
          console.error('[dodo webhook] ORPHAN payment.succeeded — nobody to credit:', resolved.orphan, webhookId)
          await recordEvent(admin, 'dodo_webhook_orphan', null, { event_type: eventType, reason: resolved.orphan, dodo_event_id: webhookId, dodo_payment_id: str(data, 'payment_id') })
          return NextResponse.json({ received: true, orphan: resolved.orphan })
        }
        const sku = dodoMetadataString(data, 'sku')
        const subscriptionId = str(data, 'subscription_id')
        if (!subscriptionId) {
          // Pagamento ÚNICO: só o pacote de $4,90 existe neste trilho.
          if (sku !== 'first_pack') {
            console.error('[dodo webhook] one-time payment with unknown sku:', sku, webhookId)
            await recordEvent(admin, 'dodo_webhook_orphan', resolved.userId, { event_type: eventType, reason: 'unknown_sku' satisfies OrphanReason, sku, dodo_event_id: webhookId })
            return NextResponse.json({ received: true, orphan: 'unknown_sku' })
          }
          // Crédito vem do CATÁLOGO (checkoutPricing), nunca do metadata.
          await grantOneTimePackCredits(admin, { userId: resolved.userId, credits: dodoSkuCredits('first_pack') })
        }
        // Assinatura: a concessão do plano vem por subscription.active/renewed;
        // aqui só a receita é registrada.
        await recordPaymentSuccess(admin, webhookId, data, resolved.userId)
        return NextResponse.json({ received: true })
      }

      case 'subscription.active':
      case 'subscription.renewed': {
        const resolved = await resolveUser(admin, data)
        if ('orphan' in resolved) {
          console.error('[dodo webhook] ORPHAN', eventType, '— nobody to grant:', resolved.orphan, webhookId)
          await recordEvent(admin, 'dodo_webhook_orphan', null, { event_type: eventType, reason: resolved.orphan, dodo_event_id: webhookId, dodo_subscription_id: str(data, 'subscription_id') })
          return NextResponse.json({ received: true, orphan: resolved.orphan })
        }
        const sku = dodoMetadataString(data, 'sku')
        const subscriptionId = str(data, 'subscription_id')
        if (!sku || !isDodoSku(sku) || !isDodoSubscriptionSku(sku) || !subscriptionId) {
          console.error('[dodo webhook]', eventType, 'without a subscription sku/id:', sku, webhookId)
          await recordEvent(admin, 'dodo_webhook_orphan', resolved.userId, { event_type: eventType, reason: 'unknown_sku' satisfies OrphanReason, sku, dodo_event_id: webhookId })
          return NextResponse.json({ received: true, orphan: 'unknown_sku' })
        }
        const tier = DODO_SKU_TO_TIER[sku]
        const result = eventType === 'subscription.active'
          ? await grantSubscriptionPlan(admin, { userId: resolved.userId, tier, subscriptionId, subscriptionColumn: SUBSCRIPTION_COLUMN })
          : await renewSubscriptionCredits(admin, { userId: resolved.userId, tier, subscriptionId, subscriptionColumn: SUBSCRIPTION_COLUMN })
        return NextResponse.json({ received: true, tier, resumed: result.resumed })
      }

      case 'subscription.cancelled':
      case 'subscription.expired': {
        const subscriptionId = str(data, 'subscription_id')
        if (!subscriptionId) return NextResponse.json({ received: true, ignored: eventType })
        const { revoked } = await revokeSubscriptionPlan(admin, { subscriptionId, subscriptionColumn: SUBSCRIPTION_COLUMN })
        await recordEvent(admin, 'dodo_subscription_revoked', dodoMetadataString(data, 'supabase_user_id'), { event_type: eventType, dodo_subscription_id: subscriptionId, revoked, dodo_event_id: webhookId })
        return NextResponse.json({ received: true, revoked })
      }

      case 'payment.failed': {
        // Diferente da Stripe (memória "desfecho anônimo não tem remédio"): aqui
        // o metadata traz a conta, então a recusa fica com dono.
        await recordEvent(admin, 'dodo_payment_failed', dodoMetadataString(data, 'supabase_user_id'), {
          event_type: eventType,
          rail: 'dodo',
          dodo_event_id: webhookId,
          dodo_payment_id: str(data, 'payment_id'),
          sku: dodoMetadataString(data, 'sku'),
          ip_country: dodoMetadataString(data, 'ip_country'),
          error_code: str(data, 'error_code'),
          error_message: str(data, 'error_message'),
        })
        return NextResponse.json({ received: true })
      }

      default:
        // Assinamos TODOS os tipos na Dodo; o que não move crédito é reconhecido
        // e ignorado com 200 — 4xx/5xx aqui só geraria reenvio inútil.
        return NextResponse.json({ received: true, ignored: eventType })
    }
  } catch (error) {
    // Soltar o guard para o fornecedor reenviar. Este é o passo que faltava no
    // PayPal: sem ele, o claim fica gravado e o crédito nunca chega.
    if (guardAcquired) {
      try {
        const { error: releaseError } = await admin.from('dodo_events').delete().eq('id', webhookId)
        if (releaseError) {
          console.error('[dodo webhook] failed to release guard for retry:', releaseError.code, releaseError.message, webhookId)
        } else {
          guardAcquired = false
          console.warn('[dodo webhook] released guard; provider retry required:', webhookId)
        }
      } catch (releaseThrown) {
        console.error('[dodo webhook] guard release threw:', releaseThrown, webhookId)
      }
    }
    const reason = error instanceof RetryableGrantError ? error.message : 'unexpected'
    console.error('[dodo webhook] handler failed, asking for retry:', eventType, reason)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
