// ═══ KINEO-TROCA-BUSINESS-2026-10-10 — a troca de plano de/para o Business, sem crédito de graça ═══════════════════════
//
// POR QUE EXISTE: o Business (US$ 84/mês, 500 créditos — KINEO-BUSINESS-84-2026-10-09) nasceu sem troca self-serve.
// Quem já assinava Starter/Creator/Studio e clicava "Get Business" recebia "escreva para o suporte", porque a troca
// de sempre (app/api/stripe/change-plan) credita a diferença de créditos NA HORA e deixa a proration para a PRÓXIMA
// fatura. No Business isso daria ~440 créditos de graça a quem subisse, gastasse e descesse antes da fatura (a descida
// imediata devolve o rateio como crédito na Stripe). Este módulo fecha as duas pontas:
//
//   · SUBIDA para o Business (assinatura mensal ATIVA em Starter/Creator/Studio):
//       a Stripe cobra AGORA (proration 'always_invoice' + payment_behavior 'error_if_incomplete': cartão recusado ou
//       3DS pendente = nada muda, 402). A rota NÃO mexe no saldo. Os créditos (TIER_CREDITS.business − TIER_CREDITS
//       do plano de antes) só entram quando a FATURA DA TROCA está paga: o webhook (invoice.payment_succeeded,
//       billing_reason 'subscription_update') chama applyBusinessUpgradeGrant, idempotente por troca
//       (troca_business_granted:<assinatura>:<business_upgrade_at>).
//   · DESCIDA do Business (para Studio/Creator/Starter): NUNCA imediata. A troca vira um Subscription Schedule que
//       mantém o Business até o fim do período pago e entra no plano novo na renovação (proration 'none': nada é
//       devolvido, nada é cobrado hoje, nenhum crédito é retirado). A renovação de sempre do webhook concede a cota do
//       plano novo (a metadata da fase carimba tier/plan_credits na assinatura quando a fase começa).
//   · Anual: o Business não tem anual — a rota recusa (409 business_annual_needs_support) e o suporte segue o caminho.
//   · Teste de 7 dias (*_trial): não existe 'business_trial' (app/api/admin/_shared/mrr.ts) — recusa
//       (409 business_after_trial).
//
// Módulo de SERVIDOR (node:crypto para o id determinístico do razão em `events`). Nenhum componente 'use client'
// importa este arquivo: os textos da tela moram em lib/growth/planSwitch.ts.
import { createHash } from 'node:crypto'
import { TIER_CREDITS, type CheckoutTier } from '@/lib/checkoutPricing'

export const TROCA_BUSINESS_TAG = 'KINEO-TROCA-BUSINESS-2026-10-10'
export const TROCA_BUSINESS_VERSION = 'troca_business_v1'
export const BUSINESS_TIER = 'business' as const

/** De onde se sobe para o Business (e para onde se desce dele): a escada self-serve. */
export const BUSINESS_SWITCH_LADDER: readonly CheckoutTier[] = ['starter', 'basic', 'pro']

/** Subida: cobra a proration AGORA, numa fatura própria (billing_reason 'subscription_update'). */
export const BUSINESS_UPGRADE_PRORATION = 'always_invoice' as const
/** Subida: cartão recusado / 3DS pendente = a Stripe NÃO aplica a troca (402). Nada de assinatura pela metade. */
export const BUSINESS_UPGRADE_PAYMENT_BEHAVIOR = 'error_if_incomplete' as const
/** Descida: na virada do período, sem rateio (nada devolvido, nada cobrado hoje). */
export const BUSINESS_DOWNGRADE_PRORATION = 'none' as const

/**
 * O Business não aceita promoção (NO_PROMOTION_PLAN_TIERS em lib/checkoutPricing.ts): na subida, todo desconto que a
 * assinatura carregava (cupom do Creator/Studio, WELCOME20, código de afiliado…) é REMOVIDO — na assinatura e no item.
 * Na API da Stripe, '' num campo Emptyable apaga a lista. A prévia usa o mesmo '' (não herda desconto nenhum), então
 * o "você paga X agora" já é o preço cheio.
 */
export const BUSINESS_CLEAR_DISCOUNTS = '' as const

/** Ids dos descontos que a assinatura carrega hoje (assinatura + item, sem dobrar o legado `discount`). */
export function discountRefsOf(
  sub: { discount?: unknown; discounts?: readonly unknown[] | null },
  item?: { discounts?: readonly unknown[] | null } | null,
): string[] {
  const idOf = (v: unknown): string | null =>
    typeof v === 'string' ? v : v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string' ? (v as { id: string }).id : null
  const ids = [idOf(sub.discount), ...(sub.discounts ?? []).map(idOf), ...(item?.discounts ?? []).map(idOf)].filter((x): x is string => Boolean(x))
  return [...new Set(ids)]
}

/** Janela da chave de idempotência da Stripe: dois cliques juntos = uma cobrança; cartão trocado = tenta de novo em 2 min. */
export const BUSINESS_IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000
/** Folga de relógio entre o servidor e a Stripe ao conferir que a fatura é DESTA troca. */
export const BUSINESS_UPGRADE_SKEW_MS = 15 * 60 * 1000

/** Razão (events) da concessão da subida — id determinístico por troca. */
export const BUSINESS_UPGRADE_GRANTED_EVENT = 'business_upgrade_credits_granted'
/** Evento da descida agendada. */
export const BUSINESS_DOWNGRADE_SCHEDULED_EVENT = 'plan_change_scheduled'
/** Quem criou o Schedule (só os nossos são liberados automaticamente antes de outra troca). */
export const BUSINESS_SCHEDULE_SOURCE = 'change-plan'

export type BusinessSwitchDirection = 'upgrade' | 'downgrade'

export function isBusinessLadderTier(t: unknown): t is CheckoutTier {
  return typeof t === 'string' && (BUSINESS_SWITCH_LADDER as readonly string[]).includes(t)
}

/** 'upgrade' (escada → business), 'downgrade' (business → escada) ou null (não é troca do Business). */
export function businessSwitchDirection(from: unknown, to: unknown): BusinessSwitchDirection | null {
  if (to === BUSINESS_TIER && isBusinessLadderTier(from)) return 'upgrade'
  if (from === BUSINESS_TIER && isBusinessLadderTier(to)) return 'downgrade'
  return null
}

/** Créditos que a subida concede DEPOIS da fatura paga: a diferença de cota (nunca negativa). */
export function businessUpgradeCredits(from: CheckoutTier): number {
  const delta = Math.floor(TIER_CREDITS[BUSINESS_TIER]) - Math.floor(TIER_CREDITS[from])
  return Number.isFinite(delta) && delta > 0 ? delta : 0
}

/** Início da janela de idempotência (ms) — também é o carimbo business_upgrade_at (mesmo pedido = mesmos parâmetros). */
export function businessWindowStartMs(nowMs: number): number {
  return Math.floor(nowMs / BUSINESS_IDEMPOTENCY_WINDOW_MS) * BUSINESS_IDEMPOTENCY_WINDOW_MS
}

export function businessUpgradeIdempotencyKey(subscriptionId: string, itemId: string, from: CheckoutTier, amountMinor: number, nowMs: number): string {
  return `kineo-troca-business-v1:${subscriptionId}:${itemId}:${from}:${amountMinor}:${Math.floor(nowMs / BUSINESS_IDEMPOTENCY_WINDOW_MS)}`
}

/** Com a janela de 2 min: um Schedule liberado (outra troca no meio) nunca volta como resposta guardada da Stripe. */
export function businessDowngradeIdempotencyKey(subscriptionId: string, target: CheckoutTier, periodEndSec: number, nowMs: number): string {
  return `kineo-troca-business-desce-v1:${subscriptionId}:${target}:${periodEndSec}:${Math.floor(nowMs / BUSINESS_IDEMPOTENCY_WINDOW_MS)}`
}

/**
 * A metadata da assinatura na subida: a de sempre (tier/plan_credits — é dela que a renovação lê) + o carimbo da troca
 * que o webhook usa para conceder UMA vez (business_upgrade_from / business_upgrade_at / business_upgrade_credits).
 */
export function businessUpgradeMetadata(existing: Record<string, string> | null | undefined, from: CheckoutTier, upgradeAtIso: string): Record<string, string> {
  return {
    ...(existing ?? {}),
    tier: BUSINESS_TIER,
    plan_credits: String(TIER_CREDITS[BUSINESS_TIER]),
    plan_changed_from: from,
    plan_changed_at: upgradeAtIso,
    business_upgrade_from: from,
    business_upgrade_at: upgradeAtIso,
    business_upgrade_credits: String(businessUpgradeCredits(from)),
    business_upgrade_version: TROCA_BUSINESS_VERSION,
  }
}

/** Metadata da fase nova da descida: a Stripe carimba na assinatura quando a fase começa (a renovação lê o tier). */
export function businessDowngradePhaseMetadata(target: CheckoutTier, effectiveAtIso: string, scheduledAtIso: string): Record<string, string> {
  return {
    tier: target,
    plan_credits: String(TIER_CREDITS[target]),
    plan_changed_from: BUSINESS_TIER,
    plan_changed_at: effectiveAtIso,
    plan_change_scheduled_at: scheduledAtIso,
  }
}

/** As duas fases do Schedule da descida: o Business até o fim do período pago; depois o plano novo, sem rateio. */
export function businessDowngradePhases(input: {
  currentPriceId: string
  currentStart: number
  currentEnd: number
  target: CheckoutTier
  currency: string
  productId: string
  unitAmount: number
  phaseMetadata: Record<string, string>
}) {
  return [
    {
      items: [{ price: input.currentPriceId, quantity: 1 }],
      start_date: input.currentStart,
      end_date: input.currentEnd,
      proration_behavior: BUSINESS_DOWNGRADE_PRORATION,
    },
    {
      items: [{
        price_data: { currency: input.currency, product: input.productId, unit_amount: input.unitAmount, recurring: { interval: 'month' as const } },
        quantity: 1,
      }],
      iterations: 1,
      proration_behavior: BUSINESS_DOWNGRADE_PRORATION,
      metadata: input.phaseMetadata,
    },
  ]
}

export function isOwnBusinessSchedule(metadata: Record<string, string> | null | undefined): boolean {
  return metadata?.kineo_source === BUSINESS_SCHEDULE_SOURCE
}

/** Chave da concessão: UMA por troca (assinatura + carimbo da troca), nunca por entrega do webhook. */
export function businessUpgradeGrantKey(subscriptionId: string, upgradeAtIso: string): string {
  return `troca_business_granted:${subscriptionId}:${upgradeAtIso}`
}

/** uuid determinístico (sha256 da chave) — o mesmo desenho do razão da troca anual (lib/billing/annualSwitchCore.ts). */
export function businessLedgerId(key: string): string {
  const h = createHash('sha256').update(key).digest('hex').slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export type BusinessGrantDecision =
  | { grant: false; reason: 'not_subscription_update' | 'not_business_upgrade' | 'no_charge' | 'invoice_before_upgrade' | 'no_credits' }
  | { grant: true; from: CheckoutTier; credits: number; upgradeAt: string; key: string; ledgerId: string }

/**
 * O webhook pergunta: esta fatura paga é a cobrança de uma subida para o Business? Só concede se TODAS valem:
 *   billing_reason 'subscription_update' · metadata viva tier=business + business_upgrade_from da escada + carimbo
 *   business_upgrade_at · fatura com total > 0 (cobrança de verdade, não ajuste zerado) · fatura criada depois do carimbo
 *   (com folga de relógio). A chave é por troca: duas faturas da mesma troca nunca concedem duas vezes.
 */
export function businessUpgradeGrantDecision(input: {
  billingReason: string | null | undefined
  invoice: { total?: number | null; created?: number | null }
  subscription: { id: string; metadata?: Record<string, string> | null }
}): BusinessGrantDecision {
  if (input.billingReason !== 'subscription_update') return { grant: false, reason: 'not_subscription_update' }
  const meta = input.subscription.metadata ?? {}
  const from = meta.business_upgrade_from
  const upgradeAt = meta.business_upgrade_at
  const upgradeAtMs = typeof upgradeAt === 'string' ? Date.parse(upgradeAt) : NaN
  if (meta.tier !== BUSINESS_TIER || !isBusinessLadderTier(from) || !Number.isFinite(upgradeAtMs)) {
    return { grant: false, reason: 'not_business_upgrade' }
  }
  const total = typeof input.invoice.total === 'number' ? input.invoice.total : 0
  if (!(total > 0)) return { grant: false, reason: 'no_charge' }
  const createdMs = typeof input.invoice.created === 'number' ? input.invoice.created * 1000 : NaN
  if (!Number.isFinite(createdMs) || createdMs < upgradeAtMs - BUSINESS_UPGRADE_SKEW_MS) return { grant: false, reason: 'invoice_before_upgrade' }
  const credits = businessUpgradeCredits(from)
  if (credits <= 0) return { grant: false, reason: 'no_credits' }
  const key = businessUpgradeGrantKey(input.subscription.id, upgradeAt as string)
  return { grant: true, from, credits, upgradeAt: upgradeAt as string, key, ledgerId: businessLedgerId(key) }
}

// ─── a concessão (o webhook chama; o banco entra por injeção, para o guardião executar com um banco de mentira) ─────

type DbError = { code?: string; message?: string } | null
type DbLike = {
  from(table: string): any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type BusinessGrantResult =
  | { status: 'granted'; creditsBefore: number; creditsAfter: number }
  | { status: 'already_granted' }
  | { status: 'concurrent' }
  | { status: 'ambiguous'; creditsBefore: number; creditsAfter: number; creditsNow: number | null }

const MAX_CAS_ATTEMPTS = 3

/**
 * Concede os créditos da subida UMA vez, na ordem do razão da troca anual:
 *   (1) razão já existe com credits_granted=true → nada (reentrega da Stripe);
 *       razão pendente (credits_granted=false) → termina por compare-and-set no saldo de ANTES; saldo diferente do de
 *       antes e do de depois = ambíguo → não concede (não dobra), volta 'ambiguous' para o webhook avisar;
 *   (2) saldo lido; (3) RAZÃO gravado ANTES do saldo (id determinístico = a reserva; 23505 = outro pedido concede);
 *   (4) saldo por compare-and-set (eq video_credits = antes), com plano business; corrida com gasto = relê e tenta de
 *       novo (até 3); (5) marca credits_granted=true. Erro de banco = lança: o webhook devolve 500 e a Stripe reenvia.
 */
export async function applyBusinessUpgradeGrant(db: DbLike, input: {
  userId: string
  subscriptionId: string
  invoiceId: string | null
  amountPaid: number | null
  currency: string | null
  decision: Extract<BusinessGrantDecision, { grant: true }>
  path: string
}): Promise<BusinessGrantResult> {
  const { decision } = input
  const ledger = await db.from('events').select('id, metadata').eq('id', decision.ledgerId).maybeSingle() as { data: { id: string; metadata: Record<string, unknown> | null } | null; error: DbError }
  if (ledger.error) throw new Error(`ledger read failed: ${ledger.error.message ?? ledger.error.code ?? 'unknown'}`)
  if (ledger.data) {
    const record = (ledger.data.metadata ?? {}) as Record<string, unknown>
    if (record.credits_granted === true) return { status: 'already_granted' }
    return finishPendingBusinessGrant(db, input.userId, decision.ledgerId, record)
  }

  const fresh = await db.from('profiles').select('video_credits').eq('id', input.userId).maybeSingle() as { data: { video_credits: number | null } | null; error: DbError }
  if (fresh.error || !fresh.data) throw new Error(`profile read failed: ${fresh.error?.message ?? 'profile row missing'}`)
  let before = Math.max(0, Math.floor(Number(fresh.data.video_credits ?? 0)))
  let after = before + decision.credits
  const baseMetadata: Record<string, unknown> = {
    tag: TROCA_BUSINESS_TAG,
    version: TROCA_BUSINESS_VERSION,
    grant_key: decision.key,
    stripe_subscription_id: input.subscriptionId,
    stripe_invoice_id: input.invoiceId,
    amount_paid: input.amountPaid,
    currency: input.currency,
    from: decision.from,
    to: BUSINESS_TIER,
    business_upgrade_at: decision.upgradeAt,
    credits_delta: decision.credits,
  }
  const inserted = await db.from('events').insert({
    id: decision.ledgerId,
    name: BUSINESS_UPGRADE_GRANTED_EVENT,
    user_id: input.userId,
    path: input.path,
    session_id: null,
    metadata: { ...baseMetadata, credits_before: before, credits_after: after, credits_granted: false },
  }) as { error: DbError }
  if (inserted.error) {
    if (inserted.error.code === '23505') return { status: 'concurrent' }
    throw new Error(`ledger insert failed: ${inserted.error.message ?? inserted.error.code ?? 'unknown'}`)
  }

  for (let attempt = 1; attempt <= MAX_CAS_ATTEMPTS; attempt++) {
    const upd = await db.from('profiles')
      .update({ video_credits: after, plan: BUSINESS_TIER, is_pro: true })
      .eq('id', input.userId)
      .eq('video_credits', before)
      .select('id') as { data: unknown[] | null; error: DbError }
    if (upd.error) throw new Error(`profile update failed: ${upd.error.message ?? upd.error.code ?? 'unknown'}`)
    if (Array.isArray(upd.data) && upd.data.length > 0) {
      await db.from('events').update({ metadata: { ...baseMetadata, credits_before: before, credits_after: after, credits_granted: true, credits_granted_at: new Date().toISOString(), attempts: attempt } }).eq('id', decision.ledgerId)
      return { status: 'granted', creditsBefore: before, creditsAfter: after }
    }
    // o saldo mudou entre a leitura e a escrita (a pessoa gastou): relê, regrava o razão com os números novos, tenta de novo
    const again = await db.from('profiles').select('video_credits').eq('id', input.userId).maybeSingle() as { data: { video_credits: number | null } | null; error: DbError }
    if (again.error || !again.data) throw new Error(`profile re-read failed: ${again.error?.message ?? 'profile row missing'}`)
    before = Math.max(0, Math.floor(Number(again.data.video_credits ?? 0)))
    after = before + decision.credits
    const remark = await db.from('events').update({ metadata: { ...baseMetadata, credits_before: before, credits_after: after, credits_granted: false } }).eq('id', decision.ledgerId) as { error: DbError }
    if (remark.error) throw new Error(`ledger re-mark failed: ${remark.error.message ?? 'unknown'}`)
  }
  throw new Error('profile balance kept changing; grant left pending in the ledger for the Stripe retry')
}

/** Razão pendente: compare-and-set no saldo de ANTES; já no de DEPOIS = só marca; outro saldo = ambíguo (não concede). */
async function finishPendingBusinessGrant(db: DbLike, userId: string, ledgerId: string, record: Record<string, unknown>): Promise<BusinessGrantResult> {
  const before = record.credits_before
  const after = record.credits_after
  if (typeof before !== 'number' || typeof after !== 'number') {
    return { status: 'ambiguous', creditsBefore: Number(before) || 0, creditsAfter: Number(after) || 0, creditsNow: null }
  }
  const upd = await db.from('profiles')
    .update({ video_credits: after, plan: BUSINESS_TIER, is_pro: true })
    .eq('id', userId)
    .eq('video_credits', before)
    .select('id') as { data: unknown[] | null; error: DbError }
  if (upd.error) throw new Error(`profile update failed: ${upd.error.message ?? upd.error.code ?? 'unknown'}`)
  let granted = Array.isArray(upd.data) && upd.data.length > 0
  let now: number | null = null
  if (!granted) {
    const read = await db.from('profiles').select('video_credits').eq('id', userId).maybeSingle() as { data: { video_credits: number | null } | null; error: DbError }
    if (read.error) throw new Error(`profile read failed: ${read.error.message ?? 'unknown'}`)
    now = read.data ? Number(read.data.video_credits) : null
    granted = now === after
    if (!granted) return { status: 'ambiguous', creditsBefore: before, creditsAfter: after, creditsNow: now }
  }
  await db.from('events').update({ metadata: { ...record, credits_granted: true, credits_granted_at: new Date().toISOString(), credits_granted_on_retry: true } }).eq('id', ledgerId)
  return { status: 'granted', creditsBefore: before, creditsAfter: after }
}
