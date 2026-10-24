// KINEO-KIDS-VENDA-2010 — o PASSE 3 do cron do Autopilot (app/api/cron/autopilot-generate, hora em hora): os desenhos infantis
// vendidos (piloto automático, pack de 30, amostra grátis). Reusa o motor do Autopilot sem fork: lib/autopilot/session.ts
// (o cron age COMO A PESSOA) e as MESMAS rotas da tela — /api/kids-cartoon/story (história) e /api/generate-video-cinematic
// (filme, com `kids_cartoon`); quem monta e grava em `videos` é o cron de resgate da casa (finish-stranded-renders), que também
// manda o "Your video is ready" de sempre — por isso o e-mail daqui só sai quando o da casa não saiu (evento stranded_ready_sent).
//
// DOIS SUB-PASSES, nesta ordem (como o Autopilot: o que já está pago entrega primeiro):
//   A. LIQUIDAR — runs despachadas: achou o filme (stranded_composed.render_id → videos) = entregue (+ e-mail "seu vídeo de hoje
//      está pronto"); estorno da casa no credit_debits = falhou e o cron TIRA de volta o crédito que financiou; 6 h sem filme = morta.
//      Run 'pending' velha (o POST morreu sem resposta): se o débito existe, era despacho vivo → 'dispatched'; senão falhou + estorno.
//   B. DESPACHAR — pedidos devidos (next_run_at ≤ agora), amostra > piloto > pack; pausa inteira com fal_balance_exhausted nas
//      últimas 2 h; teto de crédito por ciclo (videos × custo × 1,25); run gravada ANTES de gastar (unique por posição/tentativa =
//      23505 vira no-op); história → financia EXATAMENTE o custo do filme → POST do filme como a pessoa.
// IDEMPOTÊNCIA: a run nasce com generation_id determinístico (kids-<run id>) ANTES do POST; o débito da rota é idempotente por
// generation_id; a liquidação é guardada pelo status da run; o e-mail por email_sent_at + evento.
import type { SupabaseClient } from '@supabase/supabase-js'
import { callAsUser, mintUserSession, type UserSession } from '@/lib/autopilot/session'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { cinematicClaimId } from '@/lib/cinematic/claim'
import { emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { writeServerEvent } from '@/lib/serverEvents'
import { kidsCharacter, type KidsCartoonLanguage, type KidsCharacterId } from '@/lib/kidsCartoon/kidsCartoon'
import {
  KIDS_EVENTS, KIDS_FAL_BALANCE_EVENT, KIDS_KIND_PRIORITY, KIDS_MAX_ATTEMPTS_PER_SEQ, KIDS_MAX_STARTS_PER_PASS, KIDS_RUN_TIMEOUT_MS, KIDS_SALES_LIVE,
  KIDS_VENDA_ENGINE, kidsAutopilotNextRunMs, kidsCycleCreditCap, kidsCycleKey, kidsEpisodeHashtags, kidsEpisodeTitle, kidsFalPaused, kidsGenerationId,
  kidsIdeaForRun, kidsNextSeq, kidsPriceLabel, kidsReadyEmailCopy, kidsStartsAllowedThisPass, KIDS_PRICES, type KidsOrderKind,
} from '@/lib/kidsVenda/kidsVenda'
import { KIDS_ORDERS_TABLE, KIDS_ORDER_COLUMNS, KIDS_RUNS_TABLE, KIDS_RUN_COLUMNS, isMissingKidsTable, type KidsOrderRow, type KidsRunRow } from '@/lib/kidsVenda/server'

export const KIDS_CRON_PATH = '/api/cron/autopilot-generate'
/** Run 'pending' mais velha que isto sem débito na rota = o POST morreu antes de nascer o claim. */
export const KIDS_PENDING_STALE_MS = 30 * 60 * 1000
/** O e-mail de pronto da casa (finish-stranded-renders): quando já saiu, o daqui não sai. */
export const HOUSE_READY_EVENTS = ['stranded_ready_sent', 'stranded_fast_ready_sent'] as const
export const HOUSE_COMPOSED_EVENT = 'stranded_composed'
const RESEND_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'

export interface KidsPassSummary {
  ready: boolean
  live?: boolean
  paused: boolean
  settled: { checked: number; delivered: number; failed: number; pending: number }
  dispatch: { due: number; started: number; failed: number; skipped: number }
}

type Db = SupabaseClient
const nowIso = () => new Date().toISOString()

async function patchRun(db: Db, id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db.from(KIDS_RUNS_TABLE).update(patch).eq('id', id)
  if (error) console.error('[kids] run update failed:', id, error.message)
}
async function patchOrder(db: Db, id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db.from(KIDS_ORDERS_TABLE).update({ ...patch, updated_at: nowIso() }).eq('id', id)
  if (error) console.error('[kids] order update failed:', id, error.message)
}

// ── crédito: financia / tira de volta (leitura + escrita, o mesmo trilho do /admin/grant-credits) ─────────────────────────
async function fundCredits(db: Db, userId: string, amount: number): Promise<{ ok: boolean; balance: number }> {
  const { data, error } = await db.from('profiles').select('video_credits').eq('id', userId).maybeSingle()
  if (error || !data) return { ok: false, balance: 0 }
  const before = typeof (data as { video_credits?: unknown }).video_credits === 'number' ? (data as { video_credits: number }).video_credits : 0
  const after = before + amount
  const up = await db.from('profiles').update({ video_credits: after }).eq('id', userId)
  return up.error ? { ok: false, balance: before } : { ok: true, balance: after }
}
async function clawBack(db: Db, run: KidsRunRow, reason: string): Promise<number> {
  const owed = Math.max(0, (run.credits_funded ?? 0) - (run.credits_clawed ?? 0))
  if (owed <= 0) return 0
  const { data, error } = await db.from('profiles').select('video_credits').eq('id', run.user_id).maybeSingle()
  if (error || !data) return 0
  const before = typeof (data as { video_credits?: unknown }).video_credits === 'number' ? (data as { video_credits: number }).video_credits : 0
  const take = Math.min(owed, Math.max(0, before))
  if (take > 0) {
    const up = await db.from('profiles').update({ video_credits: before - take }).eq('id', run.user_id)
    if (up.error) return 0
  }
  await patchRun(db, run.id, { credits_clawed: (run.credits_clawed ?? 0) + take })
  await writeServerEvent({ name: KIDS_EVENTS.creditsClawedBack, userId: run.user_id, path: KIDS_CRON_PATH, sessionId: run.generation_id, metadata: { run_id: run.id, order_id: run.order_id, credits: take, owed, reason } }).catch(() => false)
  return take
}

/** O débito da rota do filme para esta geração (credit_debits.render_id = cinematic-<claim>): existe? foi estornado? */
async function debitState(db: Db, userId: string, generationId: string): Promise<'none' | 'live' | 'refunded' | 'unknown'> {
  const { data, error } = await db.from('credit_debits').select('user_id, refunded_at').eq('render_id', `cinematic-${cinematicClaimId(userId, generationId)}`).maybeSingle()
  if (error) return 'unknown'
  if (!data) return 'none'
  return (data as { refunded_at?: string | null }).refunded_at ? 'refunded' : 'live'
}

/** O render final desta geração, se a casa já montou (stranded_composed.metadata.render_id). */
async function composedRenderId(db: Db, generationId: string): Promise<string | null> {
  const { data, error } = await db.from('events').select('metadata').eq('name', HOUSE_COMPOSED_EVENT).eq('session_id', generationId).order('created_at', { ascending: false }).limit(1)
  if (error || !Array.isArray(data) || data.length === 0) return null
  const rid = (data[0] as { metadata?: { render_id?: unknown } | null }).metadata?.render_id
  return typeof rid === 'string' && rid ? rid : null
}

async function houseAlreadyEmailed(db: Db, generationId: string): Promise<boolean> {
  const { data, error } = await db.from('events').select('id').in('name', [...HOUSE_READY_EVENTS]).eq('session_id', generationId).limit(1)
  return !error && Array.isArray(data) && data.length > 0
}

async function sendKidsReadyEmail(db: Db, run: KidsRunRow, order: KidsOrderRow, baseUrl: string): Promise<boolean> {
  if (run.email_sent_at) return false
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  const prof = await db.from('profiles').select('email, email_opted_out').eq('id', order.user_id).maybeSingle()
  const p = prof.data as { email?: string | null; email_opted_out?: boolean | null } | null
  if (prof.error || !p?.email || p.email_opted_out) return false
  if (await houseAlreadyEmailed(db, run.generation_id ?? '')) {
    await patchRun(db, run.id, { email_sent_at: nowIso() })
    await writeServerEvent({ name: KIDS_EVENTS.videoReadySent, userId: order.user_id, path: KIDS_CRON_PATH, sessionId: run.generation_id, metadata: { run_id: run.id, order_id: order.id, email: 'house' } }).catch(() => false)
    return false
  }
  const lang = (order.language === 'pt' || order.language === 'es' ? order.language : 'en') as KidsCartoonLanguage
  const copy = kidsReadyEmailCopy(lang, { title: run.title ?? 'Episode', seq: run.seq, total: order.videos_total, kind: order.kind })
  const link = `${baseUrl}/kids-cartoon?utm_source=kids_ready#my-episodes`
  const offer = order.kind === 'sample'
    ? (lang === 'pt' ? `\n\nGostou? Canal no piloto automático por ${kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor)}/mês (30 episódios) ou pack de 30 por ${kidsPriceLabel(KIDS_PRICES.pack.usdMinor)}: ${link}` : lang === 'es' ? `\n\n¿Te gustó? Canal en piloto automático por ${kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor)}/mes (30 episodios) o pack de 30 por ${kidsPriceLabel(KIDS_PRICES.pack.usdMinor)}: ${link}` : `\n\nLiked it? Channel on autopilot for ${kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor)}/month (30 episodes) or a pack of 30 for ${kidsPriceLabel(KIDS_PRICES.pack.usdMinor)}: ${link}`)
    : order.kind === 'pack' && run.seq >= order.videos_total
      ? (lang === 'pt' ? `\n\nSeus 30 episódios estão completos. Para o canal não parar: piloto automático por ${kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor)}/mês: ${link}` : lang === 'es' ? `\n\nTus 30 episodios están completos. Para que el canal no pare: piloto automático por ${kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor)}/mes: ${link}` : `\n\nYour 30 episodes are complete. To keep the channel going: autopilot for ${kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor)}/month: ${link}`)
      : ''
  const text = `${copy.text}\n\n${link}${offer}`
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: p.email, reply_to: 'joseph@usekineo.com', subject: copy.subject, text: text + emailFooterText(order.user_id), headers: unsubscribeHeaders(order.user_id) }),
    })
    if (!res.ok) return false
  } catch {
    return false
  }
  await patchRun(db, run.id, { email_sent_at: nowIso() })
  await writeServerEvent({ name: KIDS_EVENTS.videoReadySent, userId: order.user_id, path: KIDS_CRON_PATH, sessionId: run.generation_id, metadata: { run_id: run.id, order_id: order.id, seq: run.seq, kind: order.kind, email: 'kids' } }).catch(() => false)
  return true
}

// ═══ A. LIQUIDAR ═══════════════════════════════════════════════════════════════════════════════════════════════════════
async function settlePass(db: Db, baseUrl: string, deadline: number): Promise<KidsPassSummary['settled']> {
  const out = { checked: 0, delivered: 0, failed: 0, pending: 0 }
  const { data, error } = await db.from(KIDS_RUNS_TABLE).select(KIDS_RUN_COLUMNS).in('status', ['pending', 'dispatched']).order('started_at', { ascending: true }).range(0, 199)
  if (error) { console.error('[kids] settle select failed:', error.message); return out }
  const runs = (data ?? []) as KidsRunRow[]
  const orders = new Map<string, KidsOrderRow>()
  for (const run of runs) {
    if (Date.now() > deadline) break
    out.checked++
    if (!orders.has(run.order_id)) {
      const o = await db.from(KIDS_ORDERS_TABLE).select(KIDS_ORDER_COLUMNS).eq('id', run.order_id).maybeSingle()
      if (o.data) orders.set(run.order_id, o.data as KidsOrderRow)
    }
    const order = orders.get(run.order_id)
    if (!order || !run.generation_id) { out.pending++; continue }
    const ageMs = Date.now() - Date.parse(run.dispatched_at ?? run.started_at)
    const debit = await debitState(db, run.user_id, run.generation_id)

    const fail = async (reason: string, claw: boolean) => {
      out.failed++
      const taken = claw ? await clawBack(db, run, reason) : 0
      await patchRun(db, run.id, { status: 'failed', error: reason, finished_at: nowIso() })
      await writeServerEvent({ name: KIDS_EVENTS.runFailed, userId: run.user_id, path: KIDS_CRON_PATH, sessionId: run.generation_id, metadata: { run_id: run.id, order_id: run.order_id, seq: run.seq, attempt: run.attempt, reason, credits_clawed: taken, debit } }).catch(() => false)
      // a posição volta para a fila na próxima passada (tentativa + 1), sem esperar o dia seguinte
      if (order.status === 'active') await patchOrder(db, order.id, { next_run_at: nowIso() })
    }

    if (run.status === 'pending') {
      if (debit === 'live') { await patchRun(db, run.id, { status: 'dispatched', dispatched_at: run.dispatched_at ?? nowIso() }); out.pending++; continue }
      if (ageMs > KIDS_PENDING_STALE_MS) { await fail(debit === 'refunded' ? 'dispatch_refunded' : 'dispatch_lost', true); continue }
      out.pending++
      continue
    }
    // dispatched
    if (debit === 'refunded') { await fail('render_refunded', true); continue }
    const renderId = run.render_id ?? await composedRenderId(db, run.generation_id)
    if (renderId) {
      if (!run.render_id) await patchRun(db, run.id, { render_id: renderId })
      const v = await db.from('videos').select('id, status, video_url, final_video_url').eq('user_id', run.user_id).eq('render_id', renderId).maybeSingle()
      const vid = v.data as { id: string; status?: string | null; video_url?: string | null; final_video_url?: string | null } | null
      if (!v.error && vid && vid.status === 'completed' && (vid.final_video_url || vid.video_url)) {
        out.delivered++
        await patchRun(db, run.id, { status: 'delivered', video_id: vid.id, finished_at: nowIso() })
        const cnt = await db.from(KIDS_RUNS_TABLE).select('id', { count: 'exact', head: true }).eq('order_id', order.id).eq('status', 'delivered').eq('cycle_key', run.cycle_key)
        const delivered = typeof cnt.count === 'number' ? cnt.count : order.videos_delivered + 1
        const done = order.kind !== 'autopilot' && delivered >= order.videos_total
        await patchOrder(db, order.id, { videos_delivered: delivered, ...(done ? { status: 'completed', completed_at: nowIso(), next_run_at: null } : {}) })
        order.videos_delivered = delivered
        await writeServerEvent({ name: KIDS_EVENTS.runDelivered, userId: run.user_id, path: KIDS_CRON_PATH, sessionId: run.generation_id, metadata: { run_id: run.id, order_id: order.id, kind: order.kind, seq: run.seq, delivered, total: order.videos_total, video_id: vid.id, render_id: renderId } }).catch(() => false)
        if (done) await writeServerEvent({ name: KIDS_EVENTS.packDone, userId: run.user_id, path: KIDS_CRON_PATH, metadata: { order_id: order.id, kind: order.kind, delivered } }).catch(() => false)
        await sendKidsReadyEmail(db, { ...run, status: 'delivered', video_id: vid.id }, order, baseUrl)
        continue
      }
    }
    if (ageMs > KIDS_RUN_TIMEOUT_MS) { await fail('render_timeout', debit !== 'live'); continue }
    out.pending++
  }
  return out
}

// ═══ B. DESPACHAR ══════════════════════════════════════════════════════════════════════════════════════════════════════
interface StoryResponse { script?: string; caption?: string; error?: string }
interface DispatchResponse { error?: string; charged?: boolean; refunded?: boolean; credits_charged?: number; reason?: string }

async function dispatchPass(db: Db, baseUrl: string, deadline: number, sessions: Map<string, UserSession | null>): Promise<{ paused: boolean; dispatch: KidsPassSummary['dispatch'] }> {
  const out = { due: 0, started: 0, failed: 0, skipped: 0 }
  const now = Date.now()
  // pausa da fal
  const fal = await db.from('events').select('created_at').eq('name', KIDS_FAL_BALANCE_EVENT).order('created_at', { ascending: false }).limit(1)
  const lastExhausted = !fal.error && Array.isArray(fal.data) && fal.data.length > 0 ? String((fal.data[0] as { created_at: string }).created_at) : null
  const dueQ = await db.from(KIDS_ORDERS_TABLE).select(KIDS_ORDER_COLUMNS).eq('status', 'active').or(`next_run_at.is.null,next_run_at.lte.${new Date(now).toISOString()}`).order('next_run_at', { ascending: true, nullsFirst: true }).range(0, 99)
  if (dueQ.error) { console.error('[kids] due select failed:', dueQ.error.message); return { paused: false, dispatch: out } }
  const due = ((dueQ.data ?? []) as KidsOrderRow[]).sort((a, b) => KIDS_KIND_PRIORITY[a.kind] - KIDS_KIND_PRIORITY[b.kind])
  out.due = due.length
  if (due.length === 0) return { paused: false, dispatch: out }
  if (kidsFalPaused(lastExhausted, now)) {
    await writeServerEvent({ name: KIDS_EVENTS.passPaused, path: KIDS_CRON_PATH, metadata: { reason: 'fal_balance_exhausted', last_exhausted_at: lastExhausted, due: due.length } }).catch(() => false)
    out.skipped = due.length
    return { paused: true, dispatch: out }
  }
  const cost = creditCostForDuration('cinematic_ai', true, due[0].duration)

  for (const order of due) {
    if (out.started + out.failed >= KIDS_MAX_STARTS_PER_PASS) break
    if (Date.now() > deadline) break
    const cycleKey = order.kind === 'autopilot' ? kidsCycleKey(order.cycle_start) : ''
    if (order.kind === 'autopilot' && order.cycle_end && Date.parse(order.cycle_end) < Date.now()) { out.skipped++; continue } // ciclo pago acabou: espera a fatura
    const openQ = await db.from(KIDS_RUNS_TABLE).select('seq, attempt, status, credits_funded').eq('order_id', order.id).eq('cycle_key', cycleKey).in('status', ['pending', 'dispatched', 'failed']).range(0, 499) // KINEO-CARTOON-CONSISTENCIA-2210 — o gasto possível sobrevive a estorno e reativação da assinatura
    if (openQ.error) { out.skipped++; continue }
    const open = (openQ.data ?? []) as { seq: number; attempt: number; status: string }[]
    let inFlight = open.filter((r) => r.status !== 'failed').length
    let funded = order.cycle_credits_funded ?? 0
    let starts = 0
    while (starts < kidsStartsAllowedThisPass(order.kind) && out.started + out.failed < KIDS_MAX_STARTS_PER_PASS && Date.now() < deadline) {
      const seq = kidsNextSeq({ total: order.videos_total, delivered: order.videos_delivered, inFlight })
      if (seq === null) { if (order.kind !== 'autopilot' && inFlight === 0 && order.videos_delivered >= order.videos_total) await patchOrder(db, order.id, { status: 'completed', completed_at: nowIso(), next_run_at: null }); break }
      if (order.duration === 15 && open.some(r => r.seq === seq && r.status === 'failed' && ((r as { credits_funded?: number }).credits_funded ?? 0) > 0)) { // KINEO-CARTOON-CONSISTENCIA-2210 — custo já possível nesta posição/ciclo: nunca iniciar outro filme automaticamente
        await patchOrder(db, order.id, { status: 'paused', pause_reason: `provider_budget_review_seq_${seq}`, next_run_at: null }) // KINEO-CARTOON-CONSISTENCIA-2210 — preserva a obrigação de entrega para revisão; não inventa episódio entregue
        await writeServerEvent({ name: KIDS_EVENTS.orderPaused, userId: order.user_id, path: KIDS_CRON_PATH, metadata: { order_id: order.id, reason: 'provider_budget_review', seq, cycle_key: cycleKey } }).catch(() => false) // KINEO-CARTOON-CONSISTENCIA-2210
        out.skipped++ // KINEO-CARTOON-CONSISTENCIA-2210
        break // KINEO-CARTOON-CONSISTENCIA-2210
      } // KINEO-CARTOON-CONSISTENCIA-2210
      const attempt = 1 + open.filter((r) => r.seq === seq && r.status === 'failed').length
      if (attempt > KIDS_MAX_ATTEMPTS_PER_SEQ) {
        await patchOrder(db, order.id, { status: 'paused', pause_reason: `attempts_exhausted_seq_${seq}`, next_run_at: null })
        await writeServerEvent({ name: KIDS_EVENTS.orderPaused, userId: order.user_id, path: KIDS_CRON_PATH, metadata: { order_id: order.id, reason: 'attempts_exhausted', seq } }).catch(() => false)
        out.skipped++
        break
      }
      if (funded + cost > kidsCycleCreditCap(order.videos_total, cost)) {
        await patchOrder(db, order.id, { status: 'paused', pause_reason: 'credit_cap', next_run_at: null })
        await writeServerEvent({ name: KIDS_EVENTS.capHit, userId: order.user_id, path: KIDS_CRON_PATH, metadata: { order_id: order.id, funded, cost, cap: kidsCycleCreditCap(order.videos_total, cost) } }).catch(() => false)
        out.skipped++
        break
      }
      // ── a run nasce ANTES de qualquer gasto (unique = trava) ──
      const runId = crypto.randomUUID()
      const generationId = kidsGenerationId(runId)
      const claim = await db.from(KIDS_RUNS_TABLE).insert({ id: runId, order_id: order.id, user_id: order.user_id, cycle_key: cycleKey, seq, attempt, status: 'pending', generation_id: generationId }).select('id').maybeSingle()
      if (claim.error) { if ((claim.error as { code?: string }).code !== '23505') console.error('[kids] run claim failed:', claim.error.message); out.skipped++; break }
      inFlight++
      starts++
      const runRow: KidsRunRow = { id: runId, order_id: order.id, user_id: order.user_id, cycle_key: cycleKey, seq, attempt, status: 'pending', generation_id: generationId, credits_funded: 0, credits_clawed: 0, script: null, title: null, caption: null, hashtags: null, render_id: null, video_id: null, error: null, started_at: nowIso(), dispatched_at: null, finished_at: null, email_sent_at: null }
      const failRun = async (reason: string, meta: Record<string, unknown> = {}) => {
        out.failed++
        const taken = await clawBack(db, runRow, reason)
        await patchRun(db, runId, { status: 'failed', error: reason.slice(0, 500), finished_at: nowIso() })
        await writeServerEvent({ name: KIDS_EVENTS.runFailed, userId: order.user_id, path: KIDS_CRON_PATH, sessionId: generationId, metadata: { run_id: runId, order_id: order.id, seq, attempt, reason: reason.slice(0, 200), credits_clawed: taken, ...meta } }).catch(() => false)
        await patchOrder(db, order.id, { next_run_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
      }
      // ── sessão ──
      if (!sessions.has(order.user_id)) sessions.set(order.user_id, await mintUserSession(order.user_id))
      const session = sessions.get(order.user_id) ?? null
      if (!session) { await failRun('session_unavailable'); break }
      // ── história (a MESMA rota do template: moderação + regra infantil + régua do Seedance 1.5) ──
      const lang = (order.language === 'pt' || order.language === 'es' ? order.language : 'en') as KidsCartoonLanguage
      const character = (kidsCharacter(order.character)?.id ?? 'leo') as KidsCharacterId
      const story = await callAsUser<StoryResponse>({ baseUrl, session, path: '/api/kids-cartoon/story', method: 'POST', body: { character, language: lang, duration: order.duration, idea: kidsIdeaForRun({ theme: order.theme, seq, cycleIndex: order.cycle_index }), ideaId: null }, timeoutMs: 60_000 })
      const script = (story.body?.script ?? '').trim()
      if (!story.ok || !script) { await failRun(`story_${story.status}: ${story.body?.error ?? story.errorText ?? 'no script'}`); break }
      const title = kidsEpisodeTitle({ script, characterId: character, seq, language: lang })
      const hashtags = kidsEpisodeHashtags(lang)
      await patchRun(db, runId, { script, title, caption: story.body?.caption ?? null, hashtags })
      // ── financia EXATAMENTE o custo do filme, e só então despacha ──
      const fundedNow = await fundCredits(db, order.user_id, cost)
      if (!fundedNow.ok) { await failRun('fund_failed'); break }
      runRow.credits_funded = cost
      funded += cost
      await patchRun(db, runId, { credits_funded: cost })
      const fundedRecord = await db.from(KIDS_RUNS_TABLE).select('credits_funded').eq('id', runId).maybeSingle() // KINEO-CARTOON-CONSISTENCIA-2210 — confirma a trilha persistente antes de qualquer POST do filme
      if (fundedRecord.error || (fundedRecord.data as { credits_funded?: number } | null)?.credits_funded !== cost) { await failRun('funding_record_unconfirmed'); break } // KINEO-CARTOON-CONSISTENCIA-2210 — sem confirmação, sem fornecedor; o crédito em memória volta pelo clawBack existente
      await patchOrder(db, order.id, { cycle_credits_funded: funded })
      await writeServerEvent({ name: KIDS_EVENTS.creditsFunded, userId: order.user_id, path: KIDS_CRON_PATH, sessionId: generationId, metadata: { run_id: runId, order_id: order.id, credits: cost, balance_after: fundedNow.balance, seq } }).catch(() => false)
      const budget = Math.max(15_000, Math.min(170_000, deadline - Date.now() - 5_000))
      const res = await callAsUser<DispatchResponse>({ baseUrl, session, path: '/api/generate-video-cinematic', method: 'POST', timeoutMs: budget, body: {
        generationId, prompt: script, duration: order.duration, language: lang, script_mode: 'verbatim', engine: KIDS_VENDA_ENGINE,
        kids_cartoon: character, kids_order: order.id, intent_campaign: order.kind === 'sample' ? 'kids_sample' : `kids_${order.kind}`,
      } })
      if (res.status === 0) {
        // sem resposta (prazo/rede): o POST pode seguir vivo na Vercel — o passe A decide pelo débito na próxima hora
        out.started++
        await writeServerEvent({ name: KIDS_EVENTS.runDispatched, userId: order.user_id, path: KIDS_CRON_PATH, sessionId: generationId, metadata: { run_id: runId, order_id: order.id, seq, attempt, http: 0, unconfirmed: true } }).catch(() => false)
      } else if (!res.ok) {
        const charged = res.body?.charged === true && res.body?.refunded !== true
        if (charged) { out.started++; await patchRun(db, runId, { status: 'dispatched', dispatched_at: nowIso(), error: `http_${res.status}_charged` }) }
        else { await failRun(`dispatch_${res.status}: ${res.body?.error ?? res.errorText ?? ''}`, { reason_code: res.body?.reason ?? null }); break }
      } else {
        out.started++
        await patchRun(db, runId, { status: 'dispatched', dispatched_at: nowIso(), error: null })
        await writeServerEvent({ name: KIDS_EVENTS.runDispatched, userId: order.user_id, path: KIDS_CRON_PATH, sessionId: generationId, metadata: { run_id: runId, order_id: order.id, kind: order.kind, seq, attempt, cost, credits_charged: res.body?.credits_charged ?? null } }).catch(() => false)
      }
      // ── a agenda anda (sempre, inclusive quando falhou: uma agenda travada é pior que um dia pulado) ──
      const remaining = Math.max(0, order.videos_total - order.videos_delivered - inFlight)
      const next = order.kind === 'autopilot'
        ? new Date(kidsAutopilotNextRunMs({ nowMs: Date.now(), remaining, cycleEndMs: order.cycle_end ? Date.parse(order.cycle_end) : Date.now() + 30 * 86_400_000 })).toISOString()
        : remaining > 0 ? nowIso() : null
      await patchOrder(db, order.id, { next_run_at: next })
      if (order.kind === 'autopilot') break // 1 por passada no piloto
    }
  }
  return { paused: false, dispatch: out }
}

/** O passe inteiro (chamado pelo cron do Autopilot depois dos dois passes dele). Nunca lança. */
export async function kidsPass(args: { db: Db; baseUrl: string; deadline: number; sessions: Map<string, UserSession | null> }): Promise<KidsPassSummary> {
  const empty: KidsPassSummary = { ready: true, paused: false, settled: { checked: 0, delivered: 0, failed: 0, pending: 0 }, dispatch: { due: 0, started: 0, failed: 0, skipped: 0 } }
  try {
    const probe = await args.db.from(KIDS_ORDERS_TABLE).select('id').limit(0)
    if (probe.error) return { ...empty, ready: !isMissingKidsTable((probe.error as { code?: string }).code) }
    const settled = await settlePass(args.db, args.baseUrl, args.deadline)
    // Com KIDS_SALES_LIVE=false só existe pedido da casa (checkout/amostra recusam quem é de fora): o passe B entrega o que
    // existe no banco e, sem pedido, não acha nada — o interruptor mora nas portas de entrada, não aqui.
    const d = await dispatchPass(args.db, args.baseUrl, args.deadline, args.sessions)
    return { ready: true, paused: d.paused, settled, dispatch: d.dispatch, live: KIDS_SALES_LIVE }
  } catch (e) {
    console.error('[kids] pass threw:', e instanceof Error ? e.message : String(e))
    return empty
  }
}
export type { KidsOrderKind }
