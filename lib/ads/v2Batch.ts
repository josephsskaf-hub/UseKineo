// KINEO-ADS-LOTE-1310 — o modo LOTE do Studio Ads no servidor (as regras puras e o porquê: lib/ads/v2BatchRules.ts).
//
// NENHUM CAMINHO DE DINHEIRO NOVO. Este arquivo só:
//   · chama adsV2PlanFor (lib/ads/v2PlanCore.ts) uma vez por linha — moderação, teto diário, posse das fotos, régua
//     anti-invenção e o ator com as regras da FTC (KINEO-ATOR-FTC-2026-10-13) moram lá, valem para cada linha;
//   · chama adsV2StartFor (lib/ads/v2StartCore.ts) para começar a PRÓXIMA linha da fila — saldo, trava, débito, estorno
//     e envio à fal moram lá. Uma linha é cobrada inteira quando começa, ou não é cobrada;
//   · grava a FILA no brief do próprio pedido (brief.batch: id, posição, quem montou, na fila desde, parada) e lê o estado.
// O guardião scripts/test-ads-lote-1310.mjs confere que nada aqui debita, estorna, consulta saldo ou fala com a fal, que o
// lote nunca passa de 10 linhas, que a conta free (amostra) não entra e que a fila PARA na 1ª recusa.
//
// Por que fila e não rajada: o índice único parcial ads_v2_orders_one_active_per_user_slot deixa UM anúncio comum em
// andamento por conta. Começar 10 de uma vez daria 1 começado e 9 'another_active'. A fila começa a 1ª agora e cada próxima
// quando a anterior termina: pela tela aberta (POST tick a cada consulta) ou, com a aba fechada, pelo cron de avanço
// (/api/cron/ads-v2-advance chama drainAdsV2Batches depois de avançar os pedidos).
import { randomUUID } from 'crypto'
import { writeServerEvent } from '@/lib/serverEvents'
import { adsGate, loadAdsAccess, type AdsAccessLoad } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { adsV2Credits, isAdsV2Seconds, isAdsV2Tier } from '@/lib/ads/v2Tiers'
import { adsV2PlanFor, type AdsV2Caller } from '@/lib/ads/v2PlanCore'
import { adsV2StartFor } from '@/lib/ads/v2StartCore'
import {
  ADS_V2_BATCH_MAX_ROWS,
  ADS_V2_BATCH_PLAN_STOP_CODES,
  batchStartOutcome,
  batchStopOf,
  batchTagOf,
  nextQueuedRow,
  type AdsV2BatchPlanRowBody,
  type AdsV2BatchTag,
} from '@/lib/ads/v2BatchRules'

type Admin = AdsAccessLoad['admin']
const PATH = '/api/ads/v2/batch'
/** Folga do plano: depois disto, as linhas que faltam voltam 'time_budget' (a tela planeja de novo; nada cobrado). */
const PLAN_BUDGET_MS = 230_000
/** Quantos lotes o cron drena por passada (cada início pode levar até ~40 s de envio). */
const DRAIN_MAX_BATCHES = 4
/** O cron só abre um início novo se ainda sobra isto até o prazo dele. */
const DRAIN_MIN_LEFT_MS = 60_000

export interface AdsV2BatchResult {
  status: number
  body: Record<string, unknown>
}

interface CoreReply {
  status: number
  json(): Promise<unknown>
}

async function readReply(res: CoreReply): Promise<{ status: number; code: string | null; body: Record<string, unknown> }> {
  let body: Record<string, unknown> = {}
  try {
    const j = await res.json()
    if (j && typeof j === 'object' && !Array.isArray(j)) body = j as Record<string, unknown>
  } catch {
    body = {}
  }
  return { status: res.status, code: typeof body.error === 'string' ? body.error : null, body }
}

/**
 * A porta do lote: SÓ quem tem o Studio Ads de verdade (adsGate 'ok' — assinante, Business, passe, parceiro, casa). A
 * amostra grátis NUNCA é consultada aqui: conta free/trial recebe 'no_access' e a tela mostra o Business.
 */
export function adsV2BatchGate(user: AdsV2Caller, access: AdsAccessLoad): 'ok' | 'no_access' | 'closed' | 'v2_closed' {
  const gate = adsGate(access.reason)
  if (gate !== 'ok') return gate
  if (!adsV2Visible(user.email)) return 'v2_closed'
  return 'ok'
}

const ownerOf = (user: AdsV2Caller, access: AdsAccessLoad): string => access.ownerId ?? user.id

interface BatchOrderRow {
  id: string
  status: string
  tier: string
  seconds: number
  brief: Record<string, unknown> | null
  plan: { narration?: unknown; presenter?: unknown; overlays?: unknown } | null
  video_id: string | null
  error: string | null
  credits_charged: number | null
}

const ORDER_COLS = 'id, status, tier, seconds, brief, plan, video_id, error, credits_charged'

function creditsOf(tier: unknown, seconds: unknown): number | null {
  return isAdsV2Tier(tier) && isAdsV2Seconds(seconds) ? adsV2Credits(tier, seconds) : null
}

/** As linhas do lote `batchId` da conta `uid`, na ordem da fila. null = leitura falhou. */
async function loadBatchRows(admin: Admin, uid: string, batchId: string): Promise<(BatchOrderRow & { tag: AdsV2BatchTag })[] | null> {
  const { data, error } = await admin.from('ads_v2_orders').select(ORDER_COLS).eq('user_id', uid).eq('brief->batch->>id', batchId).limit(ADS_V2_BATCH_MAX_ROWS * 2)
  if (error) return null
  return ((data ?? []) as BatchOrderRow[])
    .map((r) => ({ ...r, tag: batchTagOf(r.brief) as AdsV2BatchTag }))
    .filter((r) => r.tag && r.tag.id === batchId)
    .sort((a, b) => a.tag.row - b.tag.row)
}

/** Regrava brief.batch de UM pedido, só enquanto ele ainda está 'planned' (nunca mexe em pedido que já começou). */
async function writeTag(admin: Admin, uid: string, row: { id: string; brief: Record<string, unknown> | null }, tag: AdsV2BatchTag): Promise<boolean> {
  const upd = await admin
    .from('ads_v2_orders')
    .update({ brief: { ...(row.brief ?? {}), batch: tag } })
    .eq('id', row.id)
    .eq('user_id', uid)
    .eq('status', 'planned')
    .select('id')
    .maybeSingle()
  return !upd.error && !!upd.data
}

// ═══ 1. ESCREVER TODOS OS ROTEIROS — N × adsV2PlanFor ═══════════════════════════════════════════════════════════════════

export async function adsV2BatchPlan(user: AdsV2Caller, access: AdsAccessLoad, rows: readonly AdsV2BatchPlanRowBody[], started: number = Date.now()): Promise<AdsV2BatchResult> {
  const uid = ownerOf(user, access)
  const outcomes: Record<string, unknown>[] = []
  let stoppedBy: string | null = null
  for (const [i, row] of rows.entries()) {
    if (stoppedBy) {
      outcomes.push({ row: i, order_id: row.order_id, ok: false, code: 'skipped', skipped_because: stoppedBy })
      continue
    }
    if (Date.now() - started > PLAN_BUDGET_MS) {
      outcomes.push({ row: i, order_id: row.order_id, ok: false, code: 'time_budget' })
      continue
    }
    const r = await readReply(await adsV2PlanFor(user, access, async () => row.body, Date.now()))
    if (r.status === 200) {
      const b = r.body
      outcomes.push({
        row: i, order_id: row.order_id, ok: true, credits: b.credits, narration: b.narration ?? null, overlays: b.overlays ?? [], total_seconds: b.total_seconds,
        sector: b.sector, language: b.language, style: b.style ?? null, style_asked: b.style_asked ?? null, presenter: b.presenter === true, presenter_asked: b.presenter_asked === true,
      })
      continue
    }
    const code = r.code ?? `http_${r.status}`
    outcomes.push({ row: i, order_id: row.order_id, ok: false, status: r.status, code, ...(typeof r.body.message === 'string' ? { message: r.body.message } : {}), ...(typeof r.body.hint === 'string' ? { hint: r.body.hint } : {}), ...(typeof r.body.footage_id === 'string' ? { footage_id: r.body.footage_id } : {}) })
    if (ADS_V2_BATCH_PLAN_STOP_CODES.includes(code)) stoppedBy = code
  }
  const planned = outcomes.filter((o) => o.ok === true)
  const creditsTotal = planned.reduce((s, o) => s + (typeof o.credits === 'number' ? o.credits : 0), 0)
  await writeServerEvent({
    name: 'ads_batch_planned',
    userId: uid,
    path: PATH,
    metadata: {
      rows: rows.length, planned: planned.length, failed: outcomes.filter((o) => o.ok === false && o.code !== 'skipped' && o.code !== 'time_budget').length,
      skipped: outcomes.filter((o) => o.code === 'skipped' || o.code === 'time_budget').length, stopped_by: stoppedBy, credits_total: creditsTotal, ms: Date.now() - started,
      outcomes: outcomes.map((o) => ({ row: o.row, order_id: o.order_id, ok: o.ok, code: o.code ?? null })),
      ...(access.role === 'member' ? { member_id: user.id } : {}),
    },
  })
  return { status: 200, body: { rows: outcomes, planned: planned.length, credits_total: creditsTotal, stopped_by: stoppedBy } }
}

// ═══ 2. A FILA — o próximo da fila começa pelo /start de sempre ═════════════════════════════════════════════════════════

export type AdsV2BatchTrigger = 'click' | 'tick' | 'cron'

export interface AdsV2BatchTickResult {
  state: 'started' | 'waiting' | 'stopped' | 'done' | 'blocked' | 'error'
  order_id?: string
  row?: number
  code?: string
  needed?: number
  balance?: number
}

/**
 * Para a fila: toda linha ainda na fila (planejada) SAI da fila e ganha o motivo da recusa. Nada é cobrado aqui (nem foi).
 * Sair da fila (queued_at null) também tira o lote parado da varredura do cron — lote parado nunca entope a drenagem.
 */
async function stopQueue(admin: Admin, uid: string, rows: readonly (BatchOrderRow & { tag: AdsV2BatchTag })[], code: string, atRow: number): Promise<void> {
  const at = new Date().toISOString()
  for (const r of rows) {
    if (r.status !== 'planned' || !r.tag.queued_at) continue
    await writeTag(admin, uid, r, { ...r.tag, queued_at: null, stopped: { code, at, row: atRow } })
  }
}

/** Um passo da fila: se nada da conta está em andamento, começa a próxima linha com adsV2StartFor. Nunca lança. */
export async function adsV2BatchTick(user: AdsV2Caller, access: AdsAccessLoad, batchId: string, trigger: AdsV2BatchTrigger): Promise<AdsV2BatchTickResult> {
  try {
    const gate = adsV2BatchGate(user, access)
    if (gate !== 'ok') return { state: 'blocked', code: gate }
    const admin = access.admin
    const uid = ownerOf(user, access)
    const rows = await loadBatchRows(admin, uid, batchId)
    if (!rows) return { state: 'error', code: 'batch_read_failed' }
    const stopped = batchStopOf(rows)
    if (stopped) return { state: 'stopped', code: stopped.code, row: stopped.row }
    const next = nextQueuedRow(rows)
    if (!next) return { state: 'done' }
    // Ocupado = outro anúncio da conta em andamento (do lote ou não): a fila espera, sem chamar o /start (nem a moderação).
    const busy = await admin.from('ads_v2_orders').select('id').eq('user_id', uid).in('status', ['generating', 'assembling']).limit(1)
    if (busy.error) return { state: 'error', code: 'busy_read_failed' }
    if ((busy.data ?? []).length > 0) return { state: 'waiting', row: next.tag.row }

    const r = await readReply(await adsV2StartFor(user, access, async () => ({ order_id: next.id }), Date.now()))
    const outcome = batchStartOutcome(r.status, r.code)
    if (outcome === 'busy') return { state: 'waiting', row: next.tag.row, code: r.code ?? undefined }
    const extra = { ...(typeof r.body.needed === 'number' ? { needed: r.body.needed } : {}), ...(typeof r.body.balance === 'number' ? { balance: r.body.balance } : {}) }
    await writeServerEvent({
      name: 'ads_batch_row',
      userId: uid,
      path: PATH,
      metadata: { batch_id: batchId, row: next.tag.row, order_id: next.id, outcome, code: r.code, http: r.status, trigger, credits: creditsOf(next.tier, next.seconds), ...extra, ...(access.role === 'member' ? { member_id: user.id } : {}) },
    })
    if (outcome === 'started') return { state: 'started', order_id: next.id, row: next.tag.row }
    const code = r.code ?? `http_${r.status}`
    await stopQueue(admin, uid, rows, code, next.tag.row)
    return { state: 'stopped', order_id: next.id, row: next.tag.row, code, ...extra }
  } catch (e) {
    console.warn('[ads/v2/batch tick] falhou:', e instanceof Error ? e.message : String(e))
    return { state: 'error', code: 'tick_failed' }
  }
}

// ═══ 3. GERAR N ANÚNCIOS — grava a fila e começa a 1ª ═══════════════════════════════════════════════════════════════════

export async function adsV2BatchStart(user: AdsV2Caller, access: AdsAccessLoad, input: { batch_id: string | null; order_ids: readonly string[]; expected_credits: number }): Promise<AdsV2BatchResult> {
  const admin = access.admin
  const uid = ownerOf(user, access)
  const q = await admin.from('ads_v2_orders').select(ORDER_COLS).eq('user_id', uid).in('id', [...input.order_ids])
  if (q.error) return { status: 502, body: { error: 'batch_failed' } }
  const byId = new Map(((q.data ?? []) as BatchOrderRow[]).map((r) => [r.id, r]))
  const chosen: BatchOrderRow[] = []
  for (const id of input.order_ids) {
    const r = byId.get(id)
    if (!r) return { status: 404, body: { error: 'order_not_found', order_id: id } }
    if (r.status !== 'planned') return { status: 409, body: { error: 'not_startable', order_id: id, status: r.status } }
    const tag = batchTagOf(r.brief)
    // Pedido na fila VIVA de outro lote não muda de lote; o de um lote parado/cancelado (ou nunca enfileirado) pode.
    if (tag && tag.id !== input.batch_id && tag.queued_at && !tag.stopped) return { status: 409, body: { error: 'in_other_batch', order_id: id, batch_id: tag.id } }
    chosen.push(r)
  }
  // Retomar/ampliar o mesmo lote: as linhas que já estão nele contam no teto de 10.
  const existing = input.batch_id ? await loadBatchRows(admin, uid, input.batch_id) : []
  if (!existing) return { status: 502, body: { error: 'batch_failed' } }
  const ids = new Set([...existing.map((r) => r.id), ...chosen.map((r) => r.id)])
  if (ids.size > ADS_V2_BATCH_MAX_ROWS) return { status: 400, body: { error: 'too_many_rows', max: ADS_V2_BATCH_MAX_ROWS } }

  // O total EXATO que a tela mostrou: a soma do preço de cada linha (a mesma função que o /start debita).
  const costs = chosen.map((r) => creditsOf(r.tier, r.seconds))
  if (costs.some((c) => c === null)) return { status: 409, body: { error: 'not_startable' } }
  const total = (costs as number[]).reduce((s, c) => s + c, 0)
  if (input.expected_credits !== total) return { status: 409, body: { error: 'price_changed', credits: total } }

  const batchId = input.batch_id ?? randomUUID()
  const now = new Date().toISOString()
  let nextRow = existing.reduce((m, r) => Math.max(m, r.tag.row + 1), 0)
  const chosenIds = new Set(chosen.map((r) => r.id))
  const tagged: { id: string; brief: Record<string, unknown> | null; tag: AdsV2BatchTag }[] = []
  for (const r of chosen) {
    const prev = existing.find((x) => x.id === r.id)?.tag ?? null // só as linhas DESTE lote mantêm a posição
    const tag: AdsV2BatchTag = { id: batchId, row: prev ? prev.row : nextRow++, by: user.id, queued_at: now, stopped: null }
    if (!(await writeTag(admin, uid, r, tag))) {
      // Desfaz a fila desta chamada (nada começou: a 1ª linha só começa depois deste laço).
      for (const t of tagged) await writeTag(admin, uid, { id: t.id, brief: t.brief }, { ...t.tag, queued_at: null })
      return { status: 409, body: { error: 'not_startable', order_id: r.id } }
    }
    tagged.push({ id: r.id, brief: { ...(r.brief ?? {}), batch: tag }, tag })
  }
  // Retomada: linhas planejadas do lote que a pessoa NÃO pôs de volta saem da fila; a parada antiga some de todas.
  for (const r of existing) {
    if (chosenIds.has(r.id) || r.status !== 'planned' || (!r.tag.queued_at && !r.tag.stopped)) continue
    await writeTag(admin, uid, r, { ...r.tag, queued_at: null, stopped: null })
  }

  const tick = await adsV2BatchTick(user, access, batchId, 'click')
  await writeServerEvent({
    name: 'ads_batch_started',
    userId: uid,
    path: PATH,
    metadata: {
      batch_id: batchId, rows: chosen.length, credits_total: total, resumed: !!input.batch_id, started_now: tick.state === 'started' ? 1 : 0,
      queued: chosen.length - (tick.state === 'started' ? 1 : 0), refused: tick.state === 'stopped' ? 1 : 0, tick: tick.state, code: tick.code ?? null,
      outcomes: tagged.map((t) => ({ row: t.tag.row, order_id: t.id, outcome: tick.order_id === t.id ? tick.state : 'queued' })),
      ...(access.role === 'member' ? { member_id: user.id } : {}),
    },
  })
  return { status: 202, body: { batch_id: batchId, credits_total: total, tick } }
}

// ═══ 4. PARAR A FILA (as linhas que já começaram seguem; as da fila não começam) ════════════════════════════════════════

export async function adsV2BatchCancel(user: AdsV2Caller, access: AdsAccessLoad, batchId: string): Promise<AdsV2BatchResult> {
  const uid = ownerOf(user, access)
  const rows = await loadBatchRows(access.admin, uid, batchId)
  if (!rows) return { status: 502, body: { error: 'batch_failed' } }
  if (!rows.length) return { status: 404, body: { error: 'batch_not_found' } }
  await stopQueue(access.admin, uid, rows, 'cancelled', -1)
  return { status: 200, body: { batch_id: batchId, cancelled: true } }
}

// ═══ 5. O ESTADO DO LOTE (só leitura; a tela consulta cada pedido em andamento no /api/ads/v2/status) ═══════════════════

export async function adsV2BatchView(user: AdsV2Caller, access: AdsAccessLoad, batchId: string | null): Promise<AdsV2BatchResult> {
  const admin = access.admin
  const uid = ownerOf(user, access)
  let id = batchId
  if (!id) {
    const last = await admin.from('ads_v2_orders').select('brief, updated_at').eq('user_id', uid).not('brief->batch->>id', 'is', null).order('updated_at', { ascending: false }).limit(1)
    if (last.error) return { status: 502, body: { error: 'batch_failed' } }
    const tag = batchTagOf(((last.data ?? [])[0] as { brief?: unknown } | undefined)?.brief)
    if (!tag) return { status: 200, body: { batch: null } }
    id = tag.id
  }
  const rows = await loadBatchRows(admin, uid, id)
  if (!rows) return { status: 502, body: { error: 'batch_failed' } }
  if (!rows.length) return { status: 404, body: { error: 'batch_not_found' } }
  const stopped = batchStopOf(rows)
  const view = rows.map((r) => {
    const b = r.brief ?? {}
    return {
      row: r.tag.row,
      order_id: r.id,
      status: r.status,
      tier: r.tier,
      seconds: r.seconds,
      credits: creditsOf(r.tier, r.seconds),
      charged: r.credits_charged ?? 0,
      queued: !!r.tag.queued_at,
      sentence: typeof b.sentence === 'string' ? b.sentence.slice(0, 160) : null,
      business: typeof b.business === 'string' ? b.business.slice(0, 80) : null,
      narration: typeof r.plan?.narration === 'string' ? r.plan.narration : null,
      presenter: !!r.plan?.presenter,
      video_id: r.video_id,
      error: r.status === 'failed' ? (r.error ?? 'failed') : null,
    }
  })
  const waiting = view.filter((r) => r.queued && r.status === 'planned')
  return {
    status: 200,
    body: {
      batch: {
        batch_id: id,
        rows: view,
        stopped,
        active: view.some((r) => r.status === 'generating' || r.status === 'assembling'),
        queued_left: stopped ? 0 : waiting.length,
        credits_queued: stopped ? 0 : waiting.reduce((s, r) => s + (r.credits ?? 0), 0),
      },
    },
  }
}

// ═══ 6. O CRON DRENA A FILA COM A ABA FECHADA ═══════════════════════════════════════════════════════════════════════════

/**
 * Chamado pelo /api/cron/ads-v2-advance DEPOIS de avançar os pedidos. Para cada lote com linha na fila: age como quem
 * montou o lote (o e-mail VERIFICADO do auth e o acesso de HOJE dele — assinatura cancelada = 'blocked', nada começa) e dá
 * um passo da fila. Membro que saiu da equipe: o dono dele não é mais o dono do pedido = pula. Nunca lança.
 */
export async function drainAdsV2Batches(admin: Admin, opts: { deadlineMs: number }): Promise<{ batches: number; results: { batch_id: string; state: string; code?: string }[] }> {
  const results: { batch_id: string; state: string; code?: string }[] = []
  try {
    const { data, error } = await admin
      .from('ads_v2_orders')
      .select('id, user_id, status, brief, updated_at')
      .eq('status', 'planned')
      .not('brief->batch->>queued_at', 'is', null)
      .order('updated_at', { ascending: true })
      .limit(50)
    if (error) return { batches: 0, results }
    const seen = new Set<string>()
    for (const r of (data ?? []) as { id: string; user_id: string; brief: unknown }[]) {
      if (results.length >= DRAIN_MAX_BATCHES || Date.now() > opts.deadlineMs - DRAIN_MIN_LEFT_MS) break
      const tag = batchTagOf(r.brief)
      if (!tag || tag.stopped || seen.has(tag.id)) continue
      seen.add(tag.id)
      const who = await admin.auth.admin.getUserById(tag.by)
      const email = who.error ? null : who.data?.user?.email ?? null
      if (who.error || !who.data?.user) {
        results.push({ batch_id: tag.id, state: 'blocked', code: 'caller_unknown' })
        continue
      }
      const access = await loadAdsAccess(tag.by, email, { workspace: true })
      if ((access.ownerId ?? tag.by) !== r.user_id) {
        results.push({ batch_id: tag.id, state: 'blocked', code: 'owner_changed' })
        continue
      }
      const t = await adsV2BatchTick({ id: tag.by, email }, access, tag.id, 'cron')
      results.push({ batch_id: tag.id, state: t.state, ...(t.code ? { code: t.code } : {}) })
    }
  } catch (e) {
    console.warn('[ads/v2/batch drain] falhou:', e instanceof Error ? e.message : String(e))
  }
  return { batches: results.length, results }
}
