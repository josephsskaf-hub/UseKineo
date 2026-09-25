// KINEO-FLUXO-NOVO-2026-09-25 — as contas do /admin/ads (módulo puro: sem Supabase, sem React).
//
// POR QUÊ. Duas promessas com relógio e nenhuma tela: o Studio Ads diz "um editor humano revisa o seu
// 1º anúncio em 24 h" (lib/ads/offer.ts) e o Express/Pro promete entrega em DFY_TIERS[degrau].hours.
// Até 25/09 o fundador revisava por SQL. Aqui mora a regra de "o que está esperando gente e há quanto
// tempo"; a página só lê o banco e desenha, e a rota /api/admin/ads só valida e grava.
import { DFY_TIERS, type DfyTier } from '@/lib/growth/dfyOffer'

/** A promessa de revisão do Studio Ads ("within 24 hours", lib/ads/offer.ts e app/ads/page.tsx REVIEW_WINDOW_MS). */
export const ADS_REVIEW_PROMISE_HOURS = 24
/** 'rendering' parado há mais que isto quase sempre é aba fechada: o pedido só vira 'delivered' quando a tela do cliente consulta o render. */
export const STALE_RENDERING_MINUTES = 30

const HOUR = 3600_000

type Meta = Record<string, unknown> | null | undefined
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function asTier(v: unknown): DfyTier | null {
  return v === 'express' || v === 'pro' ? v : null
}

export interface DfyPaidEvent { created_at: string; user_id: string | null; metadata: Meta }
export interface DfyBriefEvent { created_at: string; metadata: Meta }

export interface DfyOrderRow {
  stripeSessionId: string
  paidAt: string
  tier: DfyTier | null
  tierName: string | null
  hours: number | null
  deadlineAt: string | null
  /** Horas até o prazo (negativo = atrasado). Null quando o degrau é desconhecido. */
  hoursLeft: number | null
  late: boolean
  userId: string | null
  email: string | null
  name: string | null
  amountTotal: number | null
  currency: string | null
  customFields: { label: string | null; value: string | null }[]
  brief: Record<string, unknown> | null
  briefUpdatedAt: string | null
}

export interface OrphanBrief { stripeSessionId: string; submittedAt: string; tier: DfyTier | null; email: string | null; brief: Record<string, unknown> | null }

/**
 * Junta cada dfy_order_paid ao seu briefing (pela sessão da Stripe) e calcula o prazo = pago_em + horas do degrau.
 * Briefing sem pedido gravado vai para `orphanBriefs`: o redirect da Stripe pode chegar antes do webhook, e um
 * webhook que falhou não pode esconder um cliente que JÁ mandou o briefing.
 */
export function buildDfyOrderRows(paid: DfyPaidEvent[], briefs: DfyBriefEvent[], now: Date): { orders: DfyOrderRow[]; orphanBriefs: OrphanBrief[] } {
  const bySession = new Map<string, DfyBriefEvent>()
  for (const b of briefs) {
    const sid = str(b.metadata?.stripe_session_id)
    if (sid) bySession.set(sid, b)
  }
  const seen = new Set<string>()
  const orders: DfyOrderRow[] = []
  for (const p of paid) {
    const m = p.metadata ?? {}
    const sid = str(m.stripe_session_id)
    if (!sid || seen.has(sid)) continue
    seen.add(sid)
    const tier = asTier(m.tier)
    const spec = tier ? DFY_TIERS[tier] : null
    const paidMs = Date.parse(p.created_at)
    const deadlineMs = spec && Number.isFinite(paidMs) ? paidMs + spec.hours * HOUR : null
    const hoursLeft = deadlineMs === null ? null : Math.round(((deadlineMs - now.getTime()) / HOUR) * 10) / 10
    const b = bySession.get(sid)
    const bm = b?.metadata ?? null
    const rawFields = Array.isArray(m.custom_fields) ? (m.custom_fields as { label?: unknown; key?: unknown; value?: unknown }[]) : []
    orders.push({
      stripeSessionId: sid,
      paidAt: p.created_at,
      tier,
      tierName: spec?.name ?? null,
      hours: spec?.hours ?? null,
      deadlineAt: deadlineMs === null ? null : new Date(deadlineMs).toISOString(),
      hoursLeft,
      late: hoursLeft !== null && hoursLeft < 0,
      userId: p.user_id ?? null,
      email: str(m.customer_email),
      name: str(m.customer_name),
      amountTotal: num(m.amount_total),
      currency: str(m.currency),
      customFields: rawFields.map((f) => ({ label: str(f?.label) ?? str(f?.key), value: str(f?.value) })),
      brief: bm && typeof bm.brief === 'object' && bm.brief ? (bm.brief as Record<string, unknown>) : null,
      briefUpdatedAt: bm ? str(bm.updated_at) ?? b?.created_at ?? null : null,
    })
  }
  orders.sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt))
  const orphanBriefs: OrphanBrief[] = []
  for (const [sid, b] of Array.from(bySession.entries())) {
    if (seen.has(sid)) continue
    const bm = b.metadata ?? {}
    orphanBriefs.push({
      stripeSessionId: sid,
      submittedAt: str(bm.first_submitted_at) ?? b.created_at,
      tier: asTier(bm.tier),
      email: str(bm.customer_email),
      brief: typeof bm.brief === 'object' && bm.brief ? (bm.brief as Record<string, unknown>) : null,
    })
  }
  return { orders, orphanBriefs }
}

export interface AdsOrderLite {
  id: string
  user_id: string
  status: string
  template: string | null
  seconds: number | null
  video_id: string | null
  qa_at?: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
  brief?: unknown
}

export interface ReviewRow {
  id: string
  userId: string
  status: string
  template: string | null
  seconds: number | null
  videoId: string | null
  business: string | null
  since: string
  /** Horas desde a entrega (fila de revisão) ou desde a última mudança (render parado). */
  ageHours: number
  dueAt: string
  hoursLeft: number
  late: boolean
}

function businessOf(brief: unknown): string | null {
  return brief && typeof brief === 'object' ? str((brief as { business?: unknown }).business) : null
}

/** Fila de revisão humana: entregue e ainda sem qa_at, a mais antiga primeiro, prazo = entregue_em + 24 h. */
export function buildReviewQueue(orders: AdsOrderLite[], now: Date): ReviewRow[] {
  const rows: ReviewRow[] = []
  for (const o of orders) {
    if (o.status !== 'delivered' || o.qa_at) continue
    const since = o.delivered_at ?? o.updated_at
    const sinceMs = Date.parse(since)
    if (!Number.isFinite(sinceMs)) continue
    const dueMs = sinceMs + ADS_REVIEW_PROMISE_HOURS * HOUR
    const hoursLeft = Math.round(((dueMs - now.getTime()) / HOUR) * 10) / 10
    rows.push({
      id: o.id, userId: o.user_id, status: o.status, template: o.template, seconds: o.seconds, videoId: o.video_id,
      business: businessOf(o.brief), since, ageHours: Math.round(((now.getTime() - sinceMs) / HOUR) * 10) / 10,
      dueAt: new Date(dueMs).toISOString(), hoursLeft, late: hoursLeft < 0,
    })
  }
  return rows.sort((a, b) => Date.parse(a.since) - Date.parse(b.since))
}

/** 'rendering' sem mudança há mais de STALE_RENDERING_MINUTES: provavelmente pronto e ninguém consultou (aba fechada). */
export function staleRendering(orders: AdsOrderLite[], now: Date, minutes: number = STALE_RENDERING_MINUTES): ReviewRow[] {
  const cut = now.getTime() - minutes * 60_000
  const rows: ReviewRow[] = []
  for (const o of orders) {
    if (o.status !== 'rendering') continue
    const sinceMs = Date.parse(o.updated_at)
    if (!Number.isFinite(sinceMs) || sinceMs > cut) continue
    const dueMs = sinceMs + ADS_REVIEW_PROMISE_HOURS * HOUR
    const hoursLeft = Math.round(((dueMs - now.getTime()) / HOUR) * 10) / 10
    rows.push({
      id: o.id, userId: o.user_id, status: o.status, template: o.template, seconds: o.seconds, videoId: o.video_id,
      business: businessOf(o.brief), since: o.updated_at, ageHours: Math.round(((now.getTime() - sinceMs) / HOUR) * 10) / 10,
      dueAt: new Date(dueMs).toISOString(), hoursLeft, late: hoursLeft < 0,
    })
  }
  return rows.sort((a, b) => Date.parse(a.since) - Date.parse(b.since))
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Corpo do POST /api/admin/ads. Só uma ação na v1: marcar a revisão de um pedido do Studio Ads. */
export function parseQaAction(body: unknown): { ok: true; orderId: string; approved: boolean; note: string | null } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as { action?: unknown; order_id?: unknown; ok?: unknown; note?: unknown }
  if (b.action !== 'qa') return { ok: false, error: 'Ação desconhecida.' }
  if (typeof b.order_id !== 'string' || !UUID.test(b.order_id)) return { ok: false, error: 'order_id inválido.' }
  if (typeof b.ok !== 'boolean') return { ok: false, error: 'Diga se o anúncio foi aprovado (ok: true/false).' }
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 500) : ''
  if (!b.ok && note.length < 3) return { ok: false, error: 'Reprovar exige o motivo (vai no histórico).' }
  return { ok: true, orderId: b.order_id, approved: b.ok, note: note || null }
}
