// KINEO-KIDS-VENDA-2010 — o BANCO das 3 formas de venda do AI Kids Cartoon Stories (tabelas kids_orders / kids_runs, migration
// migrations_pending/2026-10-20_kids_venda.sql). Só a chave de serviço escreve; a tela lê as próprias linhas por RLS.
// Quem chama: o webhook da Stripe (pedido nasce / ciclo renova / pausa / cancela), a rota da amostra, a rota de status, a rota do
// filme (admissão do pedido grátis) e o passe do cron (lib/kidsVenda/cron.ts). Regras puras em lib/kidsVenda/kidsVenda.ts.
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { isDisposableEmail } from '@/lib/emailValidation'
import { adsSampleTrialStatusBlocked } from '@/lib/ads/sample'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  KIDS_EVENTS, KIDS_VENDA_DURATION, KIDS_VIDEOS, kidsCycleBounds, kidsDayStartIso, kidsSampleDecision, type KidsOrderKind, type KidsOrderStatus,
  type KidsSampleRefusal, type KidsSeriesRequest,
} from '@/lib/kidsVenda/kidsVenda'

export const KIDS_ORDERS_TABLE = 'kids_orders'
export const KIDS_RUNS_TABLE = 'kids_runs'
export const KIDS_PATH_WEBHOOK = '/api/stripe/webhook'

export interface KidsOrderRow {
  id: string
  user_id: string
  kind: KidsOrderKind
  status: KidsOrderStatus
  character: string
  language: string
  theme: string
  duration: number
  videos_total: number
  videos_delivered: number
  cycle_index: number
  cycle_start: string
  cycle_end: string | null
  cycle_credits_funded: number
  next_run_at: string | null
  stripe_session_id: string | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  last_invoice_id: string | null
  price_minor: number | null
  currency: string | null
  pause_reason: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
}
export interface KidsRunRow {
  id: string
  order_id: string
  user_id: string
  cycle_key: string
  seq: number
  attempt: number
  status: 'pending' | 'dispatched' | 'delivered' | 'failed'
  generation_id: string | null
  credits_funded: number
  credits_clawed: number
  script: string | null
  title: string | null
  caption: string | null
  hashtags: string[] | null
  render_id: string | null
  video_id: string | null
  error: string | null
  started_at: string
  dispatched_at: string | null
  finished_at: string | null
  email_sent_at: string | null
}

export const KIDS_ORDER_COLUMNS = 'id, user_id, kind, status, character, language, theme, duration, videos_total, videos_delivered, cycle_index, cycle_start, cycle_end, cycle_credits_funded, next_run_at, stripe_session_id, stripe_subscription_id, stripe_customer_id, last_invoice_id, price_minor, currency, pause_reason, completed_at, cancelled_at, created_at'
export const KIDS_RUN_COLUMNS = 'id, order_id, user_id, cycle_key, seq, attempt, status, generation_id, credits_funded, credits_clawed, script, title, caption, hashtags, render_id, video_id, error, started_at, dispatched_at, finished_at, email_sent_at'

/** Cliente de serviço (null sem env — quem chama trata como "não pronto"). */
export function kidsServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
export const isMissingKidsTable = (code: string | undefined) => code === '42P01' || code === 'PGRST205'

// ── o pedido nasce (webhook: pack e piloto; rota: amostra) ───────────────────────────────────────────────────────────────
export interface CreateKidsOrderInput {
  userId: string
  kind: KidsOrderKind
  series: KidsSeriesRequest
  stripeSessionId?: string | null
  stripeSubscriptionId?: string | null
  stripeCustomerId?: string | null
  priceMinor?: number | null
  currency?: string | null
  /** Início do ciclo (assinatura/fatura/compra). */
  cycleFromMs: number
  path: string
}
export type CreateKidsOrderResult = { ok: true; orderId: string; created: boolean } | { ok: false; error: string }

/** Idempotente pela sessão/assinatura da Stripe (índices únicos parciais): a reentrega acha a linha de antes e não cria outra. */
export async function createKidsOrder(db: SupabaseClient, i: CreateKidsOrderInput): Promise<CreateKidsOrderResult> {
  const cycle = kidsCycleBounds(i.cycleFromMs)
  const row = {
    user_id: i.userId,
    kind: i.kind,
    status: 'active',
    character: i.series.character,
    language: i.series.language,
    theme: i.series.theme,
    duration: KIDS_VENDA_DURATION,
    videos_total: KIDS_VIDEOS[i.kind],
    cycle_index: 0,
    cycle_start: cycle.start,
    cycle_end: i.kind === 'autopilot' ? cycle.end : null,
    next_run_at: new Date().toISOString(),
    stripe_session_id: i.stripeSessionId ?? null,
    stripe_subscription_id: i.stripeSubscriptionId ?? null,
    stripe_customer_id: i.stripeCustomerId ?? null,
    price_minor: i.priceMinor ?? null,
    currency: i.currency ?? null,
  }
  const ins = await db.from(KIDS_ORDERS_TABLE).insert(row).select('id').maybeSingle()
  if (!ins.error && ins.data?.id) {
    await writeServerEvent({ name: KIDS_EVENTS.orderCreated, userId: i.userId, path: i.path, metadata: { order_id: ins.data.id, kind: i.kind, character: i.series.character, language: i.series.language, theme_len: i.series.theme.length, videos_total: KIDS_VIDEOS[i.kind], stripe_session_id: i.stripeSessionId ?? null, stripe_subscription_id: i.stripeSubscriptionId ?? null, price_minor: i.priceMinor ?? null, currency: i.currency ?? null } }).catch(() => false)
    return { ok: true, orderId: String(ins.data.id), created: true }
  }
  if ((ins.error as { code?: string } | null)?.code === '23505') {
    const col = i.stripeSubscriptionId ? 'stripe_subscription_id' : 'stripe_session_id'
    const val = i.stripeSubscriptionId ?? i.stripeSessionId ?? ''
    const ex = await db.from(KIDS_ORDERS_TABLE).select('id').eq(col, val).maybeSingle()
    if (!ex.error && ex.data?.id) return { ok: true, orderId: String(ex.data.id), created: false }
    return { ok: false, error: `kids order exists but could not be read (${ex.error?.message ?? 'no row'})` }
  }
  return { ok: false, error: ins.error?.message ?? 'kids order insert failed' }
}

/** has_paid=true: a rota do filme admite motores de IA para quem tem pedido pago (o cron financia o crédito de cada filme). */
export async function markKidsBuyerPaid(db: SupabaseClient, userId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db.from('profiles').update({ has_paid: true }).eq('id', userId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** A fatura paga de um ciclo novo do piloto: zera a contagem e abre 30 dias a partir da fatura. Idempotente por invoice (last_invoice_id). */
export async function renewKidsCycle(db: SupabaseClient, i: { subscriptionId: string; invoiceId: string; fromMs: number; path: string }): Promise<{ ok: boolean; renewed: boolean; error?: string }> {
  const cur = await db.from(KIDS_ORDERS_TABLE).select('id, user_id, cycle_index, last_invoice_id, status, videos_delivered').eq('stripe_subscription_id', i.subscriptionId).maybeSingle()
  if (cur.error) return { ok: false, renewed: false, error: cur.error.message }
  const row = cur.data as { id: string; user_id: string; cycle_index: number; last_invoice_id: string | null; status: string; videos_delivered: number } | null
  if (!row) return { ok: true, renewed: false }
  if (row.last_invoice_id === i.invoiceId) return { ok: true, renewed: false }
  const cycle = kidsCycleBounds(i.fromMs)
  const { error } = await db.from(KIDS_ORDERS_TABLE).update({
    status: row.status === 'cancelled' ? 'cancelled' : 'active',
    cycle_index: (row.cycle_index ?? 0) + 1,
    cycle_start: cycle.start,
    cycle_end: cycle.end,
    cycle_credits_funded: 0,
    videos_delivered: 0,
    last_invoice_id: i.invoiceId,
    next_run_at: new Date().toISOString(),
    pause_reason: null,
    updated_at: new Date().toISOString(),
  }).eq('id', row.id).eq('cycle_index', row.cycle_index ?? 0)
  if (error) return { ok: false, renewed: false, error: error.message }
  await writeServerEvent({ name: KIDS_EVENTS.cycleRenewed, userId: row.user_id, path: i.path, metadata: { order_id: row.id, cycle_index: (row.cycle_index ?? 0) + 1, invoice_id: i.invoiceId, delivered_last_cycle: row.videos_delivered } }).catch(() => false)
  return { ok: true, renewed: true }
}

/** A assinatura mudou de estado na Stripe: ativa volta a 'active'; sem acesso vira 'paused'; apagada vira 'cancelled'. */
export async function setKidsOrderBySubscription(db: SupabaseClient, i: { subscriptionId: string; status: 'active' | 'paused' | 'cancelled'; reason: string; path: string }): Promise<{ ok: boolean; found: boolean; error?: string }> {
  const cur = await db.from(KIDS_ORDERS_TABLE).select('id, user_id, status').eq('stripe_subscription_id', i.subscriptionId).maybeSingle()
  if (cur.error) return { ok: false, found: false, error: cur.error.message }
  const row = cur.data as { id: string; user_id: string; status: string } | null
  if (!row) return { ok: true, found: false }
  if (row.status === 'cancelled' || row.status === i.status) return { ok: true, found: true }
  const patch: Record<string, unknown> = { status: i.status, pause_reason: i.status === 'active' ? null : i.reason, updated_at: new Date().toISOString() }
  if (i.status === 'cancelled') patch.cancelled_at = new Date().toISOString()
  const { error } = await db.from(KIDS_ORDERS_TABLE).update(patch).eq('id', row.id)
  if (error) return { ok: false, found: true, error: error.message }
  await writeServerEvent({ name: i.status === 'cancelled' ? KIDS_EVENTS.orderCancelled : KIDS_EVENTS.orderPaused, userId: row.user_id, path: i.path, metadata: { order_id: row.id, status: i.status, reason: i.reason, subscription_ref: i.subscriptionId } }).catch(() => false)
  return { ok: true, found: true }
}

// ── a admissão do pedido na rota do filme (só a amostra precisa: conta sem plano) ─────────────────────────────────────────
/**
 * `kids_order` no corpo do despacho do cron: o pedido é desta pessoa, está ativo e tem uma run PENDENTE presa a ESTE generationId
 * (gravada pelo cron antes do POST). Qualquer outra coisa = false (a rota segue pelo portão de sempre). Erro de leitura = false.
 */
export async function kidsOrderAdmits(i: { raw: unknown; userId: string; generationId: string; engine: unknown; duration: unknown }): Promise<boolean> {
  try {
    if (typeof i.raw !== 'string' || !/^[0-9a-f-]{36}$/i.test(i.raw)) return false
    const engine = typeof i.engine === 'string' && i.engine.trim() ? i.engine.trim().toLowerCase() : 'seedance'
    if (engine !== 'seedance' || Number(i.duration) !== KIDS_VENDA_DURATION) return false
    const db = kidsServiceClient()
    if (!db) return false
    const o = await db.from(KIDS_ORDERS_TABLE).select('id, user_id, status').eq('id', i.raw).maybeSingle()
    const order = o.data as { id: string; user_id: string; status: string } | null
    if (o.error || !order || order.user_id !== i.userId || order.status !== 'active') return false
    const r = await db.from(KIDS_RUNS_TABLE).select('id, status').eq('order_id', order.id).eq('generation_id', i.generationId).maybeSingle()
    const run = r.data as { id: string; status: string } | null
    return !r.error && !!run && run.status === 'pending'
  } catch {
    return false
  }
}

// ── a amostra: quem ganha (lê o banco; decide com kidsSampleDecision) ───────────────────────────────────────────────────
export async function kidsSampleEligibility(db: SupabaseClient, i: { userId: string; live: boolean; internal: boolean; now?: Date }): Promise<{ ok: true } | { ok: false; reason: KidsSampleRefusal | 'read_failed' }> {
  try {
    const prof = await db.from('profiles').select('trial_status').eq('id', i.userId).maybeSingle()
    if (prof.error) return { ok: false, reason: 'read_failed' }
    const u = await db.auth.admin.getUserById(i.userId)
    const email = u.error ? null : u.data?.user?.email ?? null
    if (!email) return { ok: false, reason: 'read_failed' }
    const mine = await db.from(KIDS_ORDERS_TABLE).select('kind, status').eq('user_id', i.userId).limit(50)
    if (mine.error) return { ok: false, reason: 'read_failed' }
    const rows = (mine.data ?? []) as { kind: string; status: string }[]
    const today = await db.from(KIDS_ORDERS_TABLE).select('id', { count: 'exact', head: true }).eq('kind', 'sample').gte('created_at', kidsDayStartIso(i.now ?? new Date()))
    if (today.error || typeof today.count !== 'number') return { ok: false, reason: 'read_failed' }
    return kidsSampleDecision({
      live: i.live, internal: i.internal,
      disposable: isDisposableEmail(email),
      trialBlocked: adsSampleTrialStatusBlocked((prof.data as { trial_status?: unknown } | null)?.trial_status),
      samplesUsed: rows.filter((r) => r.kind === 'sample' && r.status !== 'cancelled').length,
      paidOrders: rows.filter((r) => r.kind !== 'sample').length,
      startedToday: today.count,
    })
  } catch {
    return { ok: false, reason: 'read_failed' }
  }
}

/** Já existe um piloto ATIVO/PAUSADO desta pessoa? (o checkout recusa uma 2ª assinatura do mesmo produto). */
export async function kidsActiveAutopilotExists(db: SupabaseClient, userId: string): Promise<boolean | null> {
  const r = await db.from(KIDS_ORDERS_TABLE).select('id').eq('user_id', userId).eq('kind', 'autopilot').in('status', ['active', 'paused']).limit(1)
  if (r.error) return null
  return Array.isArray(r.data) && r.data.length > 0
}

// ── o que a tela mostra (os pedidos da pessoa e os episódios entregues, com o vídeo) ──────────────────────────────────────
export interface KidsStatusVideo { runId: string; seq: number; title: string | null; caption: string | null; hashtags: string[]; videoId: string | null; videoUrl: string | null; posterUrl: string | null; deliveredAt: string | null }
export interface KidsStatusOrder { id: string; kind: KidsOrderKind; status: KidsOrderStatus; character: string; language: string; theme: string; total: number; delivered: number; inFlight: number; cycleEnd: string | null; nextRunAt: string | null; createdAt: string; videos: KidsStatusVideo[] }

export async function loadKidsStatus(db: SupabaseClient, userId: string): Promise<{ ready: boolean; orders: KidsStatusOrder[] }> {
  const o = await db.from(KIDS_ORDERS_TABLE).select(KIDS_ORDER_COLUMNS).eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
  if (o.error) return { ready: !isMissingKidsTable((o.error as { code?: string }).code), orders: [] }
  const orders = (o.data ?? []) as KidsOrderRow[]
  if (orders.length === 0) return { ready: true, orders: [] }
  const r = await db.from(KIDS_RUNS_TABLE).select(KIDS_RUN_COLUMNS).eq('user_id', userId).in('order_id', orders.map((x) => x.id)).order('seq', { ascending: true }).limit(500)
  const runs = (r.error ? [] : (r.data ?? [])) as KidsRunRow[]
  const videoIds = runs.map((x) => x.video_id).filter((v): v is string => !!v)
  const vids = videoIds.length ? await db.from('videos').select('id, video_url, final_video_url, thumbnail_url').eq('user_id', userId).in('id', videoIds).limit(500) : { data: [], error: null }
  const byVideo = new Map<string, { url: string | null; poster: string | null }>()
  for (const v of (vids.error ? [] : (vids.data ?? [])) as { id: string; video_url?: string | null; final_video_url?: string | null; thumbnail_url?: string | null }[]) {
    byVideo.set(String(v.id), { url: v.final_video_url ?? v.video_url ?? null, poster: v.thumbnail_url ?? null })
  }
  return {
    ready: true,
    orders: orders.map((od) => {
      const mine = runs.filter((x) => x.order_id === od.id)
      return {
        id: od.id, kind: od.kind, status: od.status, character: od.character, language: od.language, theme: od.theme,
        total: od.videos_total, delivered: od.videos_delivered,
        inFlight: mine.filter((x) => (x.status === 'pending' || x.status === 'dispatched') && (od.kind !== 'autopilot' || x.cycle_key === String(od.cycle_start).slice(0, 10))).length,
        cycleEnd: od.cycle_end, nextRunAt: od.next_run_at, createdAt: od.created_at,
        videos: mine.filter((x) => x.status === 'delivered').map((x) => ({
          runId: x.id, seq: x.seq, title: x.title, caption: x.caption, hashtags: Array.isArray(x.hashtags) ? x.hashtags : [],
          videoId: x.video_id, videoUrl: x.video_id ? byVideo.get(x.video_id)?.url ?? null : null, posterUrl: x.video_id ? byVideo.get(x.video_id)?.poster ?? null : null,
          deliveredAt: x.finished_at,
        })),
      }
    }),
  }
}
