// KINEO-SERIE-AUTO-ETAPA1-0111 — o PASSE 4 do cron do Autopilot (app/api/cron/autopilot-generate, de hora em hora): a série automática
// semanal. Molde: o passe 3 dos desenhos (lib/kidsVenda/cron.ts) — Seedance pela rota da tela, agindo COMO A PESSOA (callAsUser), a
// montagem pela casa (finish-stranded-renders, que também manda o "Your video is ready"), a liquidação pelo débito da rota e a trava
// com unique ANTES de gastar. Diferença: NÃO financia crédito — o episódio gasta o saldo do plano; sem saldo, a semana é pulada.
//
// INTERRUPTOR: SERIE_AUTO_ENABLED=false (lib/serieAuto/serieAuto.ts) → o passe devolve { enabled: false } ANTES de abrir o banco.
// Ligado, só roda para os e-mails EXATOS das contas da casa (SERIE_AUTO_INTERNAL_EMAILS). Nenhuma tela de cliente nesta etapa.
//
// DOIS SUB-PASSES, nesta ordem (o que já está em voo liquida primeiro):
//   A. LIQUIDAR — episódios 'pending'/'dispatched': filme montado e em `videos` = entregue (a série anda: último episódio, contagem);
//      débito estornado = falhou (a rota já devolveu o crédito); 6 h sem filme = falhou; 'pending' velho sem débito = o POST morreu.
//   B. DESPACHAR — séries devidas (next_run_at ≤ agora): pausa inteira com fal_balance_exhausted nas últimas 2 h; a semana ISO já
//      tem episódio vivo/entregue/pulado = no-op (a agenda só anda); sem crédito = linha 'skipped' + serie_skipped_no_credits (2 seguidas
//      = pausa); senão a ficha é preservada, a ideia sai pela régua do motor, o episódio nasce 'pending' (unique (série, semana,
//      tentativa) = 23505 vira no-op) e SÓ ENTÃO vai o POST para /api/generate-video-cinematic com generation_id determinístico.
import type { SupabaseClient } from '@supabase/supabase-js'
import { callAsUser as callAsUserReal, mintUserSession as mintUserSessionReal, type ApiCallResult, type UserSession } from '@/lib/autopilot/session'
import { cinematicClaimId } from '@/lib/cinematic/claim'
import { elencoDeterministico } from '@/lib/cinematic/folhaDePersonagem'
import { writeServerEvent } from '@/lib/serverEvents'
import { kidsFalPaused, KIDS_FAL_BALANCE_EVENT } from '@/lib/kidsVenda/kidsVenda'
import { HOUSE_COMPOSED_EVENT } from '@/lib/kidsVenda/cron'
import {
  SERIE_AUTO_CRON_PATH, SERIE_AUTO_ENABLED, SERIE_AUTO_EPISODES_TABLE, SERIE_AUTO_EVENTS, SERIE_AUTO_MAX_ATTEMPTS_PER_WEEK, SERIE_AUTO_MAX_STARTS_PER_PASS,
  SERIE_AUTO_PENDING_STALE_MS, SERIE_AUTO_RETRY_MS, SERIE_AUTO_RUN_TIMEOUT_MS, SERIE_AUTO_SKIPS_TO_PAUSE, SERIE_AUTO_TABLE, serieAutoAtivaPara,
  serieCorpoDoDespacho, serieDuration, serieEpisodeCost, serieFichaPreservada, serieGenerationId, serieIdeiaDoEpisodio, serieNextRunMs, serieWeekKey,
  type SerieFicha,
} from '@/lib/serieAuto/serieAuto'

export interface SerieRow {
  id: string
  user_id: string
  status: 'active' | 'paused' | 'cancelled'
  theme: string
  engine: string
  duration: number
  language: string
  weekday: number
  hour_utc: number
  next_run_at: string | null
  ficha: unknown
  source_script: string | null
  anchor: string | null
  episodes_delivered: number
  last_episode_seq: number
  last_episode_idea: string | null
  consecutive_skips: number
}
export interface SerieEpisodeRow {
  id: string
  serie_id: string
  user_id: string
  week_key: string
  seq: number
  attempt: number
  status: 'pending' | 'dispatched' | 'delivered' | 'failed' | 'skipped'
  generation_id: string | null
  render_id: string | null
  started_at: string
  dispatched_at: string | null
}
export const SERIE_COLUMNS = 'id, user_id, status, theme, engine, duration, language, weekday, hour_utc, next_run_at, ficha, source_script, anchor, episodes_delivered, last_episode_seq, last_episode_idea, consecutive_skips'
export const SERIE_EPISODE_COLUMNS = 'id, serie_id, user_id, week_key, seq, attempt, status, generation_id, render_id, started_at, dispatched_at'

export interface SeriePassSummary {
  enabled: boolean
  ready: boolean
  paused: boolean
  settled: { checked: number; delivered: number; failed: number; pending: number }
  dispatch: { due: number; started: number; failed: number; skipped: number; noCredits: number }
}

type Db = SupabaseClient
interface DispatchResponse { error?: string; charged?: boolean; refunded?: boolean; credits_charged?: number; reason?: string }
export interface SerieEvent { name: string; userId?: string; path: string; sessionId?: string | null; metadata: Record<string, unknown> }
/** Injeções (o guardião troca rede, sessão, evento e relógio; produção usa as reais). */
export interface SerieDeps {
  callAsUser: <T>(args: { baseUrl: string; path: string; session: UserSession; method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number }) => Promise<ApiCallResult<T>>
  mintUserSession: (userId: string) => Promise<UserSession | null>
  writeEvent: (e: SerieEvent) => Promise<unknown>
  now: () => number
  derivarFicha: (script: string) => SerieFicha[]
}
const fichaDoRoteiro = (script: string): SerieFicha[] =>
  elencoDeterministico(script).map((f) => ({ nome: f.nome, canonica: f.canonica, tipo: f.tipo, protagonista: f.protagonista }))
const DEPS_REAIS: SerieDeps = {
  callAsUser: <T>(a: Parameters<SerieDeps['callAsUser']>[0]) => callAsUserReal<T>(a),
  mintUserSession: mintUserSessionReal,
  writeEvent: (e) => writeServerEvent({ name: e.name, userId: e.userId, path: e.path, sessionId: e.sessionId ?? undefined, metadata: e.metadata }),
  now: () => Date.now(),
  derivarFicha: fichaDoRoteiro,
}

const isMissingTable = (code: string | undefined) => code === '42P01' || code === 'PGRST205'

export async function seriePass(args: {
  db: Db
  baseUrl: string
  deadline: number
  sessions: Map<string, UserSession | null>
  /** Só o guardião passa; produção lê o interruptor do código. */
  enabled?: boolean
  deps?: Partial<SerieDeps>
}): Promise<SeriePassSummary> {
  const enabled = args.enabled ?? SERIE_AUTO_ENABLED
  const empty: SeriePassSummary = { enabled, ready: true, paused: false, settled: { checked: 0, delivered: 0, failed: 0, pending: 0 }, dispatch: { due: 0, started: 0, failed: 0, skipped: 0, noCredits: 0 } }
  if (!enabled) return empty // interruptor desligado: nenhuma leitura, nenhum POST
  const deps: SerieDeps = { ...DEPS_REAIS, ...(args.deps ?? {}) }
  const { db } = args
  const nowIso = () => new Date(deps.now()).toISOString()
  const ev = (e: SerieEvent) => deps.writeEvent(e).catch(() => false)
  const patchSerie = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await db.from(SERIE_AUTO_TABLE).update({ ...patch, updated_at: nowIso() }).eq('id', id)
    if (error) console.error('[serie] serie update failed:', id, error.message)
  }
  const patchEp = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await db.from(SERIE_AUTO_EPISODES_TABLE).update(patch).eq('id', id)
    if (error) console.error('[serie] episode update failed:', id, error.message)
  }

  try {
    const probe = await db.from(SERIE_AUTO_TABLE).select('id').limit(0)
    if (probe.error) return { ...empty, ready: !isMissingTable((probe.error as { code?: string }).code) }

    // ═══ A. LIQUIDAR ═════════════════════════════════════════════════════════════════════════════════════════════════
    const settled = { checked: 0, delivered: 0, failed: 0, pending: 0 }
    const openQ = await db.from(SERIE_AUTO_EPISODES_TABLE).select(SERIE_EPISODE_COLUMNS).in('status', ['pending', 'dispatched']).order('started_at', { ascending: true }).range(0, 99)
    if (openQ.error) console.error('[serie] settle select failed:', openQ.error.message)
    for (const ep of ((openQ.data ?? []) as SerieEpisodeRow[])) {
      if (deps.now() > args.deadline) break
      settled.checked++
      if (!ep.generation_id) { settled.pending++; continue }
      const ageMs = deps.now() - Date.parse(ep.dispatched_at ?? ep.started_at)
      const debitQ = await db.from('credit_debits').select('user_id, refunded_at').eq('render_id', `cinematic-${cinematicClaimId(ep.user_id, ep.generation_id)}`).maybeSingle()
      const debit = debitQ.error ? 'unknown' : !debitQ.data ? 'none' : (debitQ.data as { refunded_at?: string | null }).refunded_at ? 'refunded' : 'live'
      const fail = async (reason: string) => {
        settled.failed++
        await patchEp(ep.id, { status: 'failed', error: reason, finished_at: nowIso() })
        await ev({ name: SERIE_AUTO_EVENTS.failed, userId: ep.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: ep.generation_id, metadata: { serie_id: ep.serie_id, week_key: ep.week_key, seq: ep.seq, attempt: ep.attempt, reason, debit } })
        // a semana volta para a fila na próxima passada (tentativa + 1, até o teto); o passe B decide
        await patchSerie(ep.serie_id, { next_run_at: nowIso() })
      }
      if (ep.status === 'pending') {
        if (debit === 'live') { await patchEp(ep.id, { status: 'dispatched', dispatched_at: ep.dispatched_at ?? nowIso() }); settled.pending++; continue }
        if (ageMs > SERIE_AUTO_PENDING_STALE_MS) { await fail(debit === 'refunded' ? 'dispatch_refunded' : 'dispatch_lost'); continue }
        settled.pending++
        continue
      }
      if (debit === 'refunded') { await fail('render_refunded'); continue }
      let renderId = ep.render_id
      if (!renderId) {
        const c = await db.from('events').select('metadata').eq('name', HOUSE_COMPOSED_EVENT).eq('session_id', ep.generation_id).order('created_at', { ascending: false }).limit(1)
        const rid = !c.error && Array.isArray(c.data) && c.data.length > 0 ? (c.data[0] as { metadata?: { render_id?: unknown } | null }).metadata?.render_id : null
        renderId = typeof rid === 'string' && rid ? rid : null
        if (renderId) await patchEp(ep.id, { render_id: renderId })
      }
      if (renderId) {
        const v = await db.from('videos').select('id, status, video_url, final_video_url').eq('user_id', ep.user_id).eq('render_id', renderId).maybeSingle()
        const vid = v.data as { id: string; status?: string | null; video_url?: string | null; final_video_url?: string | null } | null
        if (!v.error && vid && vid.status === 'completed' && (vid.final_video_url || vid.video_url)) {
          settled.delivered++
          await patchEp(ep.id, { status: 'delivered', video_id: vid.id, finished_at: nowIso() })
          const s = await db.from(SERIE_AUTO_TABLE).select(SERIE_COLUMNS).eq('id', ep.serie_id).maybeSingle()
          const serie = s.data as SerieRow | null
          if (serie) {
            const ideaQ = await db.from(SERIE_AUTO_EPISODES_TABLE).select('idea').eq('id', ep.id).maybeSingle()
            const idea = (ideaQ.data as { idea?: string | null } | null)?.idea ?? null
            await patchSerie(serie.id, {
              episodes_delivered: (serie.episodes_delivered ?? 0) + 1,
              last_episode_seq: Math.max(serie.last_episode_seq ?? 1, ep.seq),
              last_episode_at: nowIso(),
              last_episode_video_id: vid.id,
              ...(idea ? { last_episode_idea: idea } : {}),
            })
          }
          await ev({ name: SERIE_AUTO_EVENTS.delivered, userId: ep.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: ep.generation_id, metadata: { serie_id: ep.serie_id, week_key: ep.week_key, seq: ep.seq, video_id: vid.id, render_id: renderId } })
          continue
        }
      }
      if (ageMs > SERIE_AUTO_RUN_TIMEOUT_MS) { await fail('render_timeout'); continue }
      settled.pending++
    }

    // ═══ B. DESPACHAR ════════════════════════════════════════════════════════════════════════════════════════════════
    const dispatch = { due: 0, started: 0, failed: 0, skipped: 0, noCredits: 0 }
    const nowMs = deps.now()
    const dueQ = await db.from(SERIE_AUTO_TABLE).select(SERIE_COLUMNS).eq('status', 'active').order('next_run_at', { ascending: true, nullsFirst: true }).range(0, 99)
    if (dueQ.error) { console.error('[serie] due select failed:', dueQ.error.message); return { ...empty, settled } }
    const due = ((dueQ.data ?? []) as SerieRow[]).filter((s) => !s.next_run_at || Date.parse(s.next_run_at) <= nowMs)
    dispatch.due = due.length
    if (due.length === 0) return { ...empty, settled, dispatch }
    const fal = await db.from('events').select('created_at').eq('name', KIDS_FAL_BALANCE_EVENT).order('created_at', { ascending: false }).limit(1)
    const lastExhausted = !fal.error && Array.isArray(fal.data) && fal.data.length > 0 ? String((fal.data[0] as { created_at: string }).created_at) : null
    if (kidsFalPaused(lastExhausted, nowMs)) {
      await ev({ name: SERIE_AUTO_EVENTS.passPaused, path: SERIE_AUTO_CRON_PATH, metadata: { reason: 'fal_balance_exhausted', last_exhausted_at: lastExhausted, due: due.length } })
      dispatch.skipped = due.length
      return { ...empty, paused: true, settled, dispatch }
    }

    for (const serie of due) {
      if (dispatch.started + dispatch.failed >= SERIE_AUTO_MAX_STARTS_PER_PASS) break
      if (deps.now() > args.deadline) break
      const proximaSemana = new Date(serieNextRunMs({ weekday: serie.weekday, hourUtc: serie.hour_utc, nowMs: deps.now() })).toISOString()
      // ── quem pode (interruptor + conta da casa) e quanto tem ──
      const prof = await db.from('profiles').select('email, video_credits').eq('id', serie.user_id).maybeSingle()
      const p = prof.data as { email?: string | null; video_credits?: number | null } | null
      if (prof.error || !p || !serieAutoAtivaPara({ enabled, email: p.email })) { dispatch.skipped++; continue }
      // ── a semana: já tem episódio vivo, entregue ou pulado? então só a agenda anda ──
      const weekKey = serieWeekKey(deps.now())
      const semanaQ = await db.from(SERIE_AUTO_EPISODES_TABLE).select('attempt, status').eq('serie_id', serie.id).eq('week_key', weekKey).range(0, 49)
      if (semanaQ.error) { dispatch.skipped++; continue }
      const semana = (semanaQ.data ?? []) as { attempt: number; status: string }[]
      if (semana.some((r) => r.status !== 'failed')) { await patchSerie(serie.id, { next_run_at: proximaSemana }); dispatch.skipped++; continue }
      const attempt = 1 + semana.length
      if (attempt > SERIE_AUTO_MAX_ATTEMPTS_PER_WEEK) {
        await patchSerie(serie.id, { next_run_at: proximaSemana })
        await ev({ name: SERIE_AUTO_EVENTS.weekExhausted, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, metadata: { serie_id: serie.id, week_key: weekKey, attempts: semana.length } })
        dispatch.skipped++
        continue
      }
      const duration = serieDuration(serie.duration)
      const cost = serieEpisodeCost(duration)
      const seq = Math.max(1, serie.last_episode_seq ?? 1) + 1
      // ── sem crédito: pula a semana (linha 'skipped' = a trava da semana) ──
      const saldo = typeof p.video_credits === 'number' ? p.video_credits : 0
      if (saldo < cost) {
        const ins = await db.from(SERIE_AUTO_EPISODES_TABLE).insert({ serie_id: serie.id, user_id: serie.user_id, week_key: weekKey, seq, attempt, status: 'skipped', credits_cost: cost, error: 'no_credits', finished_at: nowIso() }).select('id').maybeSingle()
        if (ins.error) { dispatch.skipped++; continue } // 23505: outra passada já registrou a semana
        dispatch.noCredits++
        const skips = (serie.consecutive_skips ?? 0) + 1
        const pausa = skips >= SERIE_AUTO_SKIPS_TO_PAUSE
        await patchSerie(serie.id, pausa ? { consecutive_skips: skips, status: 'paused', pause_reason: 'no_credits_twice', next_run_at: null } : { consecutive_skips: skips, next_run_at: proximaSemana })
        await ev({ name: SERIE_AUTO_EVENTS.skippedNoCredits, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, metadata: { serie_id: serie.id, week_key: weekKey, seq, credits: saldo, cost, duration, consecutive_skips: skips } })
        if (pausa) await ev({ name: SERIE_AUTO_EVENTS.paused, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, metadata: { serie_id: serie.id, reason: 'no_credits_twice' } })
        continue
      }
      // ── a ficha: a gravada vence sempre; sem ficha, deriva UMA vez do episódio 1 e grava (só onde ainda é nula) ──
      const fichaAtual = serieFichaPreservada(serie.ficha, serie.ficha ? null : (serie.source_script ? deps.derivarFicha(serie.source_script) : null))
      if (fichaAtual.nova) {
        const up = await db.from(SERIE_AUTO_TABLE).update({ ficha: fichaAtual.ficha, updated_at: nowIso() }).eq('id', serie.id).is('ficha', null)
        if (!up.error) await ev({ name: SERIE_AUTO_EVENTS.fichaFixed, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, metadata: { serie_id: serie.id, nomes: fichaAtual.ficha.map((f) => f.nome).slice(0, 6) } })
      }
      // ── a ideia (régua do motor fica com o escritor da rota) e o episódio nasce ANTES de qualquer gasto ──
      const idea = serieIdeiaDoEpisodio({ theme: serie.theme, seq, ficha: fichaAtual.ficha, sourceScript: serie.source_script, anchor: serie.anchor, lastIdea: serie.last_episode_idea })
      const generationId = serieGenerationId(serie.id, weekKey, attempt)
      const claim = await db.from(SERIE_AUTO_EPISODES_TABLE).insert({ serie_id: serie.id, user_id: serie.user_id, week_key: weekKey, seq, attempt, status: 'pending', generation_id: generationId, idea, credits_cost: cost }).select('id').maybeSingle()
      if (claim.error || !claim.data) {
        if ((claim.error as { code?: string } | null)?.code !== '23505') console.error('[serie] episode claim failed:', claim.error?.message)
        dispatch.skipped++
        continue
      }
      const epId = (claim.data as { id: string }).id
      const failEp = async (reason: string, meta: Record<string, unknown> = {}) => {
        dispatch.failed++
        await patchEp(epId, { status: 'failed', error: reason.slice(0, 500), finished_at: nowIso() })
        await ev({ name: SERIE_AUTO_EVENTS.failed, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: generationId, metadata: { serie_id: serie.id, week_key: weekKey, seq, attempt, reason: reason.slice(0, 200), ...meta } })
        await patchSerie(serie.id, { next_run_at: new Date(deps.now() + SERIE_AUTO_RETRY_MS).toISOString() })
      }
      if (!args.sessions.has(serie.user_id)) args.sessions.set(serie.user_id, await deps.mintUserSession(serie.user_id))
      const session = args.sessions.get(serie.user_id) ?? null
      if (!session) { await failEp('session_unavailable'); continue }
      const budget = Math.max(15_000, Math.min(170_000, args.deadline - deps.now() - 5_000))
      const res = await deps.callAsUser<DispatchResponse>({ baseUrl: args.baseUrl, session, path: '/api/generate-video-cinematic', method: 'POST', timeoutMs: budget, body: serieCorpoDoDespacho({ generationId, idea, duration, language: serie.language }) })
      if (res.status === 0) {
        // sem resposta (prazo/rede): o POST pode seguir vivo na Vercel — o passe A decide pelo débito na próxima hora
        dispatch.started++
        await ev({ name: SERIE_AUTO_EVENTS.dispatched, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: generationId, metadata: { serie_id: serie.id, week_key: weekKey, seq, attempt, http: 0, unconfirmed: true } })
      } else if (!res.ok) {
        const charged = res.body?.charged === true && res.body?.refunded !== true
        if (!charged) { await failEp(`dispatch_${res.status}: ${res.body?.error ?? res.errorText ?? ''}`, { reason_code: res.body?.reason ?? null }); continue }
        dispatch.started++
        await patchEp(epId, { status: 'dispatched', dispatched_at: nowIso(), error: `http_${res.status}_charged` })
      } else {
        dispatch.started++
        await patchEp(epId, { status: 'dispatched', dispatched_at: nowIso(), error: null })
        await ev({ name: SERIE_AUTO_EVENTS.dispatched, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: generationId, metadata: { serie_id: serie.id, week_key: weekKey, seq, attempt, cost, duration, engine: 'seedance', credits_charged: res.body?.credits_charged ?? null } })
      }
      await patchSerie(serie.id, { next_run_at: proximaSemana, consecutive_skips: 0 })
    }
    return { enabled, ready: true, paused: false, settled, dispatch }
  } catch (e) {
    console.error('[serie] pass threw:', e instanceof Error ? e.message : String(e))
    return empty
  }
}
