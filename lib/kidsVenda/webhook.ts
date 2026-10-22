// KINEO-KIDS-VENDA-2010 — o que o webhook da Stripe faz com o AI Kids Cartoon Stories (chamado de app/api/stripe/webhook/route.ts
// com a chave de serviço; cada função devolve { ok, error } e a rota transforma `!ok` em RetryableEntitlementError → 500 → a Stripe
// reenvia; nada aqui lança). Reconhecimento SÓ pela metadata (lib/kidsVenda/kidsVenda.ts), nunca pelo valor.
//   · PACK (Path A, mode 'payment'): guard `checkout_fulfilled:<sessão>` (a rota insere ANTES de chamar) → pedido 'pack' (30 em fila)
//     + has_paid=true. NENHUM crédito é concedido: o cron financia filme a filme.
//   · PILOTO (Path B, mode 'subscription'): assinatura lida na Stripe (dono = metadata.supabase_user_id; estado active/trialing) →
//     pedido 'autopilot' com o ciclo de 30 dias a partir da assinatura + has_paid=true. O `plan` da pessoa NÃO muda (ela pode
//     ter Creator/Studio ao mesmo tempo; o piloto é um produto à parte, com a própria assinatura na Stripe).
//   · FATURA PAGA (subscription_cycle): ciclo novo (zera a contagem; idempotente por invoice).
//   · subscription.updated / deleted: pausa (sem acesso) / reativa / cancela o pedido — e a rota NÃO toca em profiles para estas
//     assinaturas (sem isto, o Path de sempre linkaria stripe_subscription_id da pessoa ao piloto infantil e rebaixaria o plano).
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { stripeSubscriptionKeepsAccess } from '@/lib/billing/subscriptionAccess'
import { kidsSeriesFromMetadata } from '@/lib/kidsVenda/kidsVenda'
import { KIDS_PATH_WEBHOOK, createKidsOrder, markKidsBuyerPaid, renewKidsCycle, setKidsOrderBySubscription } from '@/lib/kidsVenda/server'

export type KidsWebhookResult = { ok: true; detail: string } | { ok: false; error: string }

/** Path A — a sessão do pack (mode 'payment', metadata.pack = 'kids_pack'). A rota já gravou o guard da sessão. */
export async function fulfillKidsPack(db: SupabaseClient, session: Stripe.Checkout.Session): Promise<KidsWebhookResult> {
  const userId = session.metadata?.supabase_user_id ?? session.client_reference_id ?? null
  if (!userId) return { ok: false, error: `kids pack session without user (${session.id})` }
  const created = await createKidsOrder(db, {
    userId, kind: 'pack', series: kidsSeriesFromMetadata(session.metadata),
    stripeSessionId: session.id, stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
    priceMinor: session.amount_total ?? null, currency: session.currency ?? null, cycleFromMs: Date.now(), path: KIDS_PATH_WEBHOOK,
  })
  if (!created.ok) return { ok: false, error: `kids pack order not recorded (${session.id}): ${created.error}` }
  const paid = await markKidsBuyerPaid(db, userId)
  if (!paid.ok) return { ok: false, error: `kids pack has_paid not set (${userId}): ${paid.error}` }
  return { ok: true, detail: `${created.created ? 'created' : 'existing'} order ${created.orderId}` }
}

/** Path B — a sessão do piloto (mode 'subscription', metadata.kids_product = 'kids_autopilot'). */
export async function fulfillKidsAutopilot(db: SupabaseClient, session: Stripe.Checkout.Session, subscription: Stripe.Subscription): Promise<KidsWebhookResult> {
  const userId = session.metadata?.supabase_user_id ?? null
  if (!userId) return { ok: false, error: `kids autopilot session without user (${session.id})` }
  if ((subscription.metadata?.supabase_user_id ?? null) !== userId) return { ok: false, error: `kids autopilot subscription owner mismatch (${session.id})` }
  if (!stripeSubscriptionKeepsAccess(subscription.status)) return { ok: true, detail: `subscription ${subscription.id} is ${subscription.status}; no order` }
  const fromMs = typeof subscription.current_period_start === 'number' ? subscription.current_period_start * 1000 : Date.now()
  const created = await createKidsOrder(db, {
    userId, kind: 'autopilot', series: kidsSeriesFromMetadata(subscription.metadata ?? session.metadata),
    stripeSessionId: session.id, stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null,
    priceMinor: session.amount_total ?? null, currency: session.currency ?? null, cycleFromMs: fromMs, path: KIDS_PATH_WEBHOOK,
  })
  if (!created.ok) return { ok: false, error: `kids autopilot order not recorded (${session.id}): ${created.error}` }
  const paid = await markKidsBuyerPaid(db, userId)
  if (!paid.ok) return { ok: false, error: `kids autopilot has_paid not set (${userId}): ${paid.error}` }
  return { ok: true, detail: `${created.created ? 'created' : 'existing'} order ${created.orderId}` }
}

/** invoice.payment_succeeded de uma assinatura do piloto (fora de subscription_create): ciclo novo, idempotente por fatura. */
export async function kidsInvoicePaid(db: SupabaseClient, subscription: Stripe.Subscription, invoice: { id?: string | null; created?: number | null; billing_reason?: string | null }): Promise<KidsWebhookResult> {
  if (!invoice.id) return { ok: true, detail: 'invoice without id; ignored' }
  if (!stripeSubscriptionKeepsAccess(subscription.status)) return { ok: true, detail: `subscription ${subscription.id} is ${subscription.status}; no renewal` }
  const fromMs = typeof subscription.current_period_start === 'number' ? subscription.current_period_start * 1000 : typeof invoice.created === 'number' ? invoice.created * 1000 : Date.now()
  const r = await renewKidsCycle(db, { subscriptionId: subscription.id, invoiceId: invoice.id, fromMs, path: KIDS_PATH_WEBHOOK })
  if (!r.ok) return { ok: false, error: `kids cycle not renewed (${subscription.id}, ${invoice.id}): ${r.error}` }
  return { ok: true, detail: r.renewed ? 'renewed' : 'already renewed or no order' }
}

/** customer.subscription.updated (estado VIVO lido na Stripe): com acesso = 'active'; sem acesso = 'paused'. */
export async function kidsSubscriptionUpdated(db: SupabaseClient, subscription: Stripe.Subscription): Promise<KidsWebhookResult> {
  const active = stripeSubscriptionKeepsAccess(subscription.status)
  const r = await setKidsOrderBySubscription(db, { subscriptionId: subscription.id, status: active ? 'active' : 'paused', reason: `stripe_${subscription.status}`, path: KIDS_PATH_WEBHOOK })
  if (!r.ok) return { ok: false, error: `kids order not updated (${subscription.id}): ${r.error}` }
  return { ok: true, detail: r.found ? (active ? 'active' : 'paused') : 'no order' }
}

/** customer.subscription.deleted: o pedido é cancelado (o que já foi entregue fica na biblioteca). */
export async function kidsSubscriptionDeleted(db: SupabaseClient, subscription: Stripe.Subscription): Promise<KidsWebhookResult> {
  const r = await setKidsOrderBySubscription(db, { subscriptionId: subscription.id, status: 'cancelled', reason: subscription.cancellation_details?.reason ?? 'stripe_deleted', path: KIDS_PATH_WEBHOOK })
  if (!r.ok) return { ok: false, error: `kids order not cancelled (${subscription.id}): ${r.error}` }
  return { ok: true, detail: r.found ? 'cancelled' : 'no order' }
}
