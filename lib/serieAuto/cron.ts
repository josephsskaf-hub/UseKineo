// KINEO-SERIE-AUTO-ETAPA1-0111 — o PASSE 4 do cron do Autopilot (app/api/cron/autopilot-generate, de hora em hora): a série automática
// semanal. Molde: o passe 3 dos desenhos (lib/kidsVenda/cron.ts) — Seedance pela rota da tela, agindo COMO A PESSOA (callAsUser), a
// montagem pela casa (finish-stranded-renders, que também manda o "Your video is ready"), a liquidação pelo débito da rota e a trava
// com unique ANTES de gastar. Diferença: NÃO financia crédito — o episódio gasta o saldo do plano; sem saldo, a semana é pulada.
//
// INTERRUPTOR: SERIE_AUTO_ENABLED=false (lib/serieAuto/serieAuto.ts) → o passe devolve { enabled: false } ANTES de abrir o banco.
// Ligado, só roda para os e-mails EXATOS das contas da casa (SERIE_AUTO_INTERNAL_EMAILS). Nenhuma tela de cliente nesta etapa.
//
// DOIS SUB-PASSES, nesta ordem (o que já está em voo liquida primeiro):
//   A. LIQUIDAR — episódios 'pending'/'dispatched'/'stuck': filme montado (stranded_composed OU stranded_recovery_composed) e em
//      `videos` = entregue (a série anda: último episódio, contagem); débito estornado = falhou (a rota já devolveu o crédito);
//      débito ILEGÍVEL = não decide nada nesta passada; 6 h sem filme SEM débito = falhou (retenta); 6 h sem filme COM débito vivo =
//      'stuck' (trava a semana: retentar cobraria o cliente duas vezes) e, 7 dias depois, falha terminal sem retentativa;
//      'pending' velho SEM débito = o POST morreu (retenta).
//      ESTACIONADO ('parked': a rota respondeu 503 queued/parked, ou o passe A achou o `render_parked` do generation_id antes de
//      falhar): ocupa a semana e NUNCA abre outra tentativa — o cron resume-parked-renders retoma. Fechamento 'resumed' (ou aluguel
//      'started') = o id 'parked-…' da retomada vira o episódio (resume_generation_id; débito e montagem passam a ser lidos por ele);
//      fechamento expired/superseded/failed/invalid = nada cobrado, falha que retenta; sem fechamento depois de 30 h = falha, salvo
//      'parked-…' de aluguel com débito vivo (adotado; aluguel sem desfecho = o id da tentativa N, idDaRetomada). 503 queued SEM
//      `render_parked` = ninguém retoma: falha que retenta. O resume-parked-renders só retoma o ORIGINAL (a linha filha que a rota
//      grava ao re-estacionar uma retomada é ignorada) e nunca fecha episódio da série como 'superseded'.
//   B. DESPACHAR — séries devidas (next_run_at ≤ agora): pausa inteira com fal_balance_exhausted nas últimas 2 h; a semana ISO já
//      tem episódio vivo/entregue/pulado = no-op (a agenda só anda); sem crédito = linha 'skipped' + serie_skipped_no_credits (2 seguidas
//      = pausa); senão a ficha é preservada, a ideia sai pela régua do motor, o episódio nasce 'pending' (unique (série, semana,
//      tentativa) = 23505 vira no-op) e SÓ ENTÃO vai o POST para /api/generate-video-cinematic com generation_id determinístico.
//      Recusa que não seja 402 nem estacionada NÃO prova que nada foi cobrado ("refund is still being confirmed", 500 depois do
//      débito): o débito é LIDO antes de qualquer falha — ausente/estornado = falha que retenta; vivo = despachado; ilegível = pending.
import type { SupabaseClient } from '@supabase/supabase-js'
import { callAsUser as callAsUserReal, mintUserSession as mintUserSessionReal, type ApiCallResult, type UserSession } from '@/lib/autopilot/session'
import { cinematicClaimId } from '@/lib/cinematic/claim'
import { elencoDeterministico } from '@/lib/cinematic/folhaDePersonagem'
import { writeServerEvent } from '@/lib/serverEvents'
import { kidsFalPaused, KIDS_FAL_BALANCE_EVENT } from '@/lib/kidsVenda/kidsVenda'
import { HOUSE_COMPOSED_EVENT } from '@/lib/kidsVenda/cron'
import { PARKED_EVENT, PARKED_CLOSED_EVENT, PARKED_LEASE_EVENT } from '@/lib/filaQuedaFal'
import { idDaRetomada } from '@/lib/filaQuedaFalIds'
import {
  SERIE_AUTO_CRON_PATH, SERIE_AUTO_ENABLED, SERIE_AUTO_EPISODES_TABLE, SERIE_AUTO_EVENTS, SERIE_AUTO_MAX_ATTEMPTS_PER_WEEK, SERIE_AUTO_MAX_STARTS_PER_PASS,
  SERIE_AUTO_PENDING_STALE_MS, SERIE_AUTO_RETRY_MS, SERIE_AUTO_RUN_TIMEOUT_MS, SERIE_AUTO_SKIPS_TO_PAUSE, SERIE_AUTO_TABLE, serieAutoAtivaPara,
  SERIE_AUTO_STUCK_CLOSE_MS, SERIE_AUTO_ERRO_DEBITO_VIVO, serieEpisodioOcupaSemana,
  SERIE_AUTO_PARKED_LOST_MS, SERIE_AUTO_SKIP_BACKOFF_MS, serieRespostaEstacionada, serieFichaValida,
  serieCorpoDoDespacho, serieDuration, serieEpisodeCost, serieFichaPreservada, serieGenerationId, serieIdeiaDoEpisodio, serieNextRunMs, serieWeekKey,
  type SerieFicha,
} from '@/lib/serieAuto/serieAuto'
/** A casa monta por dois caminhos em app/api/cron/finish-stranded-renders (COMPOSED_EVENT e RECOVERY_COMPOSED_EVENT): os dois provam o filme. */
export const SERIE_COMPOSED_EVENTS: readonly string[] = [HOUSE_COMPOSED_EVENT, 'stranded_recovery_composed']

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
  status: 'pending' | 'dispatched' | 'parked' | 'stuck' | 'delivered' | 'failed' | 'skipped'
  generation_id: string | null
  render_id: string | null
  started_at: string
  dispatched_at: string | null
  error?: string | null
  /** Quando a rota estacionou o pedido (render_parked com session_id = generation_id). */
  parked_at?: string | null
  /** O id 'parked-…' com que o resume-parked-renders retomou o pedido: daqui em diante, o débito e o filme do episódio são DELE. */
  resume_generation_id?: string | null
}
export const SERIE_COLUMNS = 'id, user_id, status, theme, engine, duration, language, weekday, hour_utc, next_run_at, ficha, source_script, anchor, episodes_delivered, last_episode_seq, last_episode_idea, consecutive_skips'
export const SERIE_EPISODE_COLUMNS = 'id, serie_id, user_id, week_key, seq, attempt, status, generation_id, render_id, started_at, dispatched_at, error, parked_at, resume_generation_id'
/** Os estados que o passe A confere a cada hora. */
export const SERIE_OPEN_STATUSES: readonly string[] = ['pending', 'dispatched', 'parked', 'stuck']

export interface SeriePassSummary {
  enabled: boolean
  ready: boolean
  paused: boolean
  settled: { checked: number; delivered: number; failed: number; pending: number; stuck: number; parked: number; resumed: number }
  dispatch: { due: number; started: number; failed: number; skipped: number; noCredits: number; parked: number }
}

type Db = SupabaseClient
interface DispatchResponse { error?: string; charged?: boolean; refunded?: boolean; credits_charged?: number; reason?: string; queued?: boolean; parked?: boolean }
type Debito = 'unknown' | 'none' | 'refunded' | 'live'
/** O que o resume-parked-renders já disse sobre um pedido estacionado (lido de `events`, as chaves dele). */
interface Estacionado {
  parkedAtMs: number
  closed: { outcome: string; resumeId: string | null; atMs: number } | null
  leases: { outcome: string | null; resumeId: string | null; atMs: number }[]
}
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
  const empty: SeriePassSummary = { enabled, ready: true, paused: false, settled: { checked: 0, delivered: 0, failed: 0, pending: 0, stuck: 0, parked: 0, resumed: 0 }, dispatch: { due: 0, started: 0, failed: 0, skipped: 0, noCredits: 0, parked: 0 } }
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

  /** O débito da rota para (conta, generation_id): o mesmo render_id que a rota grava. Leitura que falha = 'unknown' (não decide nada). */
  const lerDebitoDe = async (userId: string, g: string): Promise<Debito> => {
    const q = await db.from('credit_debits').select('user_id, refunded_at').eq('render_id', `cinematic-${cinematicClaimId(userId, g)}`).maybeSingle()
    return q.error ? 'unknown' : !q.data ? 'none' : (q.data as { refunded_at?: string | null }).refunded_at ? 'refunded' : 'live'
  }

  try {
    const probe = await db.from(SERIE_AUTO_TABLE).select('id').limit(0)
    if (probe.error) return { ...empty, ready: !isMissingTable((probe.error as { code?: string }).code) }

    // ═══ A. LIQUIDAR ═════════════════════════════════════════════════════════════════════════════════════════════════
    const settled = { checked: 0, delivered: 0, failed: 0, pending: 0, stuck: 0, parked: 0, resumed: 0 }
    const openQ = await db.from(SERIE_AUTO_EPISODES_TABLE).select(SERIE_EPISODE_COLUMNS).in('status', SERIE_OPEN_STATUSES as string[]).order('started_at', { ascending: true }).range(0, 99)
    if (openQ.error) console.error('[serie] settle select failed:', openQ.error.message)
    for (const ep of ((openQ.data ?? []) as SerieEpisodeRow[])) {
      if (deps.now() > args.deadline) break
      settled.checked++
      if (!ep.generation_id) { settled.pending++; continue }
      const lerDebito = (g: string): Promise<Debito> => lerDebitoDe(ep.user_id, g)
      // o id que manda AGORA: o da retomada do resume-parked-renders, se houve; senão o do despacho da série
      let gen = ep.resume_generation_id || ep.generation_id
      let debit = await lerDebito(gen)
      /** A rota estacionou este id? (render_parked + o que o resume-parked-renders já gravou sobre ele). 'unknown' = leitura falhou. */
      const lerEstacionado = async (g: string): Promise<Estacionado | null | 'unknown'> => {
        const p = await db.from('events').select('created_at').eq('name', PARKED_EVENT).eq('session_id', g).eq('user_id', ep.user_id).order('created_at', { ascending: true }).limit(1)
        if (p.error) return 'unknown'
        const row = Array.isArray(p.data) && p.data.length > 0 ? (p.data[0] as { created_at?: string }) : null
        if (!row) return null
        const c = await db.from('events').select('created_at, metadata').eq('name', PARKED_CLOSED_EVENT).eq('session_id', g).order('created_at', { ascending: false }).limit(1)
        const l = await db.from('events').select('created_at, metadata').eq('name', PARKED_LEASE_EVENT).eq('session_id', g).order('created_at', { ascending: false }).limit(20)
        if (c.error || l.error) return 'unknown'
        const md = (x: unknown) => ((x && typeof x === 'object' ? x : {}) as { outcome?: unknown; resume_generation_id?: unknown; attempt?: unknown })
        const idOk = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null)
        // aluguel sem resume_generation_id (o cron morreu no meio do POST): o id da tentativa N é determinístico — o débito dele é lido igual
        const idDaTentativa = (m: ReturnType<typeof md>) => idOk(m.resume_generation_id) ?? (Number.isInteger(Number(m.attempt)) && Number(m.attempt) >= 1 ? idDaRetomada(g, Number(m.attempt)) : null)
        const cRow = Array.isArray(c.data) && c.data.length > 0 ? (c.data[0] as { created_at?: string; metadata?: unknown }) : null
        return {
          parkedAtMs: Date.parse(String(row.created_at ?? '')) || deps.now(),
          closed: cRow ? { outcome: String(md(cRow.metadata).outcome ?? ''), resumeId: idOk(md(cRow.metadata).resume_generation_id), atMs: Date.parse(String(cRow.created_at ?? '')) || deps.now() } : null,
          leases: ((l.data ?? []) as { created_at?: string; metadata?: unknown }[]).map((x) => ({ outcome: typeof md(x.metadata).outcome === 'string' ? String(md(x.metadata).outcome) : null, resumeId: idDaTentativa(md(x.metadata)), atMs: Date.parse(String(x.created_at ?? '')) || deps.now() })),
        }
      }
      const fail = async (reason: string) => {
        settled.failed++
        await patchEp(ep.id, { status: 'failed', error: reason, finished_at: nowIso() })
        await ev({ name: SERIE_AUTO_EVENTS.failed, userId: ep.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: ep.generation_id, metadata: { serie_id: ep.serie_id, week_key: ep.week_key, seq: ep.seq, attempt: ep.attempt, reason, debit } })
        // nada foi cobrado (débito ausente ou estornado): a semana volta para a fila (tentativa + 1, até o teto) — só se ainda for a
        // semana DESTE episódio; semana passada não reabre (o horário da semana atual cuida dela)
        if (ep.week_key === serieWeekKey(deps.now())) await patchSerie(ep.serie_id, { next_run_at: nowIso() })
      }
      /**
       * Antes de QUALQUER falha com o débito não vivo: a rota estacionou este id? Então o estorno foi o do estacionamento e o
       * resume-parked-renders vai retomar e cobrar de novo — falhar aqui abriria a tentativa 2 (cobrança e filme duplicados).
       * true = não falhe (virou 'parked', ou a leitura falhou e nada é decidido às cegas).
       */
      const estacionouAgora = async (): Promise<boolean> => {
        const est = await lerEstacionado(gen)
        if (est === 'unknown') { settled.pending++; return true }
        if (!est) return false
        settled.parked++
        await patchEp(ep.id, { status: 'parked', parked_at: new Date(est.parkedAtMs).toISOString(), error: 'parked_seen_by_settle' })
        await ev({ name: SERIE_AUTO_EVENTS.parked, userId: ep.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: ep.generation_id, metadata: { serie_id: ep.serie_id, week_key: ep.week_key, seq: ep.seq, attempt: ep.attempt, parked_generation_id: gen, phase: 'settle', from: ep.status } })
        return true
      }
      if (ep.status === 'parked') {
        const est = await lerEstacionado(gen)
        if (est === 'unknown') { settled.parked++; continue }
        if (!est) {
          // a rota disse queued mas NÃO guardou o pedido (alta demanda sem render_parked): ninguém vai retomar. Os 503 queued da rota
          // estornam antes de responder; débito vivo aqui = trata como despachado (o passe A segue conferindo), ilegível = espera.
          if (debit === 'unknown') { settled.pending++; continue }
          if (debit === 'live') { await patchEp(ep.id, { status: 'dispatched', error: 'queued_debit_live' }); settled.pending++; continue }
          await fail('dispatch_queued_not_parked')
          continue
        }
        let retomada: { id: string; atMs: number } | null = null
        if (est.closed?.outcome === 'resumed' && est.closed.resumeId) retomada = { id: est.closed.resumeId, atMs: est.closed.atMs }
        if (!retomada) { const s = est.leases.find((x) => x.outcome === 'started' && x.resumeId); if (s?.resumeId) retomada = { id: s.resumeId, atMs: s.atMs } }
        // fechado sem retomada (expired / superseded / failed / invalid_request): o crédito voltou no estacionamento, nada cobrado
        // 'expired_unverified' = o resume-parked-renders desistiu SEM ler a cobrança limpa (pode haver débito vivo): não é "nada cobrado" — // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        // segue estacionado até SERIE_AUTO_PARKED_LOST_MS, quando os aluguéis são lidos aqui (débito vivo = episódio; ilegível = espera). // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        if (!retomada && est.closed && est.closed.outcome !== 'expired_unverified') { await fail(`parked_${est.closed.outcome || 'closed'}`.slice(0, 80)); continue } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        if (!retomada && deps.now() - est.parkedAtMs > SERIE_AUTO_PARKED_LOST_MS) {
          // o resume-parked-renders já não o enxerga. Um aluguel cujo POST cobrou (débito vivo) É o episódio; ilegível = espera.
          let ilegivel = false
          for (const x of est.leases) {
            if (!x.resumeId) continue
            const d = await lerDebito(x.resumeId)
            if (d === 'unknown') ilegivel = true
            if (d === 'live') { retomada = { id: x.resumeId, atMs: x.atMs }; break }
          }
          if (!retomada) {
            if (ilegivel) { settled.parked++; continue }
            await fail('parked_never_resumed')
            continue
          }
        }
        if (!retomada) { settled.parked++; continue } // ainda estacionado: o resume-parked-renders retoma quando a fal voltar
        // RETOMADO: o filme 'parked-…' é o episódio da série. Daqui em diante tudo (débito, montagem, prazo) é lido por ele.
        settled.resumed++
        gen = retomada.id
        ep.resume_generation_id = retomada.id
        ep.status = 'dispatched'
        ep.dispatched_at = new Date(retomada.atMs).toISOString()
        ep.render_id = null
        await patchEp(ep.id, { status: 'dispatched', resume_generation_id: retomada.id, dispatched_at: ep.dispatched_at, render_id: null, error: null })
        await ev({ name: SERIE_AUTO_EVENTS.resumed, userId: ep.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: ep.generation_id, metadata: { serie_id: ep.serie_id, week_key: ep.week_key, seq: ep.seq, attempt: ep.attempt, parked_generation_id: ep.generation_id, resume_generation_id: retomada.id } })
        debit = await lerDebito(gen)
      }
      const ageMs = deps.now() - Date.parse(ep.dispatched_at ?? ep.started_at)
      if (ep.status === 'pending') {
        // débito ilegível: não dá para saber se o cliente pagou — retentar poderia cobrar duas vezes. Nada muda; a próxima hora relê.
        if (debit === 'unknown') { settled.pending++; continue }
        if (debit === 'live') { await patchEp(ep.id, { status: 'dispatched', dispatched_at: ep.dispatched_at ?? nowIso() }); settled.pending++; continue }
        if (ageMs > SERIE_AUTO_PENDING_STALE_MS) {
          if (await estacionouAgora()) continue // o POST sem resposta foi estacionado pela rota: em andamento, não perdido
          await fail(debit === 'refunded' ? 'dispatch_refunded' : 'dispatch_lost')
          continue
        }
        settled.pending++
        continue
      }
      if (debit === 'refunded') {
        if (await estacionouAgora()) continue // estorno do estacionamento, não do filme: o resume-parked-renders retoma
        await fail('render_refunded')
        continue
      }
      let renderId = ep.render_id
      if (!renderId) {
        const c = await db.from('events').select('metadata').in('name', SERIE_COMPOSED_EVENTS as string[]).eq('session_id', gen).order('created_at', { ascending: false }).limit(1)
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
          await ev({ name: SERIE_AUTO_EVENTS.delivered, userId: ep.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: ep.generation_id, metadata: { serie_id: ep.serie_id, week_key: ep.week_key, seq: ep.seq, video_id: vid.id, render_id: renderId, resume_generation_id: ep.resume_generation_id ?? null } })
          continue
        }
      }
      // débito ilegível: o filme ainda pode ser reconhecido acima, mas nenhuma falha/retentativa é decidida às cegas (cobraria 2x)
      if (debit === 'unknown') { settled.pending++; continue }
      if (ageMs > SERIE_AUTO_RUN_TIMEOUT_MS) {
        if (debit === 'live') {
          // o cliente JÁ PAGOU este episódio: nunca abrir outra tentativa (outro generation_id = outro débito)
          if (ep.status !== 'stuck') {
            settled.stuck++
            await patchEp(ep.id, { status: 'stuck', error: 'render_timeout_debit_live' })
            await ev({ name: SERIE_AUTO_EVENTS.stuck, userId: ep.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: ep.generation_id, metadata: { serie_id: ep.serie_id, week_key: ep.week_key, seq: ep.seq, attempt: ep.attempt, debit, phase: 'timeout' } })
            continue
          }
          if (ageMs > SERIE_AUTO_STUCK_CLOSE_MS) {
            settled.failed++
            await patchEp(ep.id, { status: 'failed', error: SERIE_AUTO_ERRO_DEBITO_VIVO, finished_at: nowIso() })
            await ev({ name: SERIE_AUTO_EVENTS.stuck, userId: ep.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: ep.generation_id, metadata: { serie_id: ep.serie_id, week_key: ep.week_key, seq: ep.seq, attempt: ep.attempt, debit, phase: 'closed_without_retry' } })
            continue
          }
          settled.stuck++
          continue
        }
        if (await estacionouAgora()) continue
        await fail('render_timeout') // débito ausente: nada cobrado, pode retentar
        continue
      }
      settled.pending++
    }

    // ═══ B. DESPACHAR ════════════════════════════════════════════════════════════════════════════════════════════════
    const dispatch = { due: 0, started: 0, failed: 0, skipped: 0, noCredits: 0, parked: 0 }
    const nowMs = deps.now()
    // só as DEVIDAS vêm do banco (nula ou ≤ agora): a fatia de 100 nunca é gasta com séries do futuro; e toda série pulada abaixo empurra
    // a própria agenda, então as travadas não voltam à frente da fila a cada hora
    const dueQ = await db.from(SERIE_AUTO_TABLE).select(SERIE_COLUMNS).eq('status', 'active').or(`next_run_at.is.null,next_run_at.lte.${new Date(nowMs).toISOString()}`).order('next_run_at', { ascending: true, nullsFirst: true }).range(0, 99)
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
      if (dispatch.started + dispatch.failed + dispatch.parked >= SERIE_AUTO_MAX_STARTS_PER_PASS) break
      if (deps.now() > args.deadline) break
      const proximaSemanaMs = serieNextRunMs({ weekday: serie.weekday, hourUtc: serie.hour_utc, nowMs: deps.now() })
      const proximaSemana = new Date(proximaSemanaMs).toISOString()
      /** Pulada por erro transitório: a agenda anda (sem passar do horário da próxima semana), para não ficar devida a cada hora. */
      const adiar = async (ms: number, motivo: string) => {
        dispatch.skipped++
        await patchSerie(serie.id, { next_run_at: new Date(Math.min(deps.now() + ms, proximaSemanaMs)).toISOString() })
        console.warn('[serie] série adiada:', serie.id, motivo)
      }
      // ── quem pode (interruptor + conta da casa) e quanto tem ──
      const prof = await db.from('profiles').select('email, video_credits').eq('id', serie.user_id).maybeSingle()
      const p = prof.data as { email?: string | null; video_credits?: number | null } | null
      if (prof.error) { await adiar(SERIE_AUTO_SKIP_BACKOFF_MS, 'profile_read_error'); continue }
      // conta sem perfil ou fora da casa: não é erro transitório — a série só volta a ser olhada no horário da semana que vem
      if (!p || !serieAutoAtivaPara({ enabled, email: p.email })) { dispatch.skipped++; await patchSerie(serie.id, { next_run_at: proximaSemana }); continue }
      // ── a semana: já tem episódio vivo, entregue ou pulado? então só a agenda anda ──
      const weekKey = serieWeekKey(deps.now())
      const semanaQ = await db.from(SERIE_AUTO_EPISODES_TABLE).select('attempt, status, error').eq('serie_id', serie.id).eq('week_key', weekKey).range(0, 49)
      if (semanaQ.error) { await adiar(SERIE_AUTO_SKIP_BACKOFF_MS, 'week_read_error'); continue }
      const semana = (semanaQ.data ?? []) as { attempt: number; status: string; error?: string | null }[]
      if (semana.some(serieEpisodioOcupaSemana)) { await patchSerie(serie.id, { next_run_at: proximaSemana }); dispatch.skipped++; continue }
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
      // a semana pulada (pelo saldo aqui ou pela recusa 402 da rota): 1 evento, contagem de semanas seguidas, 2 = pausa; nunca retenta
      const pularSemana = async (via: 'saldo' | 'rota', extra: Record<string, unknown> = {}) => {
        dispatch.noCredits++
        const skips = (serie.consecutive_skips ?? 0) + 1
        const pausa = skips >= SERIE_AUTO_SKIPS_TO_PAUSE
        await patchSerie(serie.id, pausa ? { consecutive_skips: skips, status: 'paused', pause_reason: 'no_credits_twice', next_run_at: null } : { consecutive_skips: skips, next_run_at: proximaSemana })
        await ev({ name: SERIE_AUTO_EVENTS.skippedNoCredits, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, metadata: { serie_id: serie.id, week_key: weekKey, seq, credits: saldo, cost, duration, consecutive_skips: skips, via, ...extra } })
        if (pausa) await ev({ name: SERIE_AUTO_EVENTS.paused, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, metadata: { serie_id: serie.id, reason: 'no_credits_twice' } })
      }
      if (saldo < cost) {
        const ins = await db.from(SERIE_AUTO_EPISODES_TABLE).insert({ serie_id: serie.id, user_id: serie.user_id, week_key: weekKey, seq, attempt, status: 'skipped', credits_cost: cost, error: 'no_credits', finished_at: nowIso() }).select('id').maybeSingle()
        if (ins.error) { await adiar(SERIE_AUTO_RETRY_MS, 'skip_claim_error'); continue } // 23505: outra passada já registrou a semana
        await pularSemana('saldo')
        continue
      }
      // ── a ficha: a gravada VÁLIDA vence sempre; nula, [] ou malformada = deriva do episódio 1 e grava (só sobre o MESMO valor lido) ──
      const gravadaValida = serieFichaValida(serie.ficha).length > 0
      const fichaAtual = serieFichaPreservada(serie.ficha, gravadaValida ? null : (serie.source_script ? deps.derivarFicha(serie.source_script) : null))
      let fichaUsada = fichaAtual.ficha
      if (fichaAtual.nova) {
        const base = db.from(SERIE_AUTO_TABLE).update({ ficha: fichaAtual.ficha, updated_at: nowIso() }).eq('id', serie.id)
        // a troca só pega se ninguém gravou outra ficha entre a leitura e aqui (jsonb comparado ao texto que foi lido); .select conta as linhas
        const up = await (serie.ficha === null || serie.ficha === undefined ? base.is('ficha', null) : base.eq('ficha', JSON.stringify(serie.ficha))).select('id')
        const pegou = !up.error && Array.isArray(up.data) && up.data.length > 0
        if (!pegou) {
          // 0 linhas (outra escrita venceu) ou erro: nenhum evento de ficha, e a ficha que vale é a GRAVADA, se válida
          const rel = await db.from(SERIE_AUTO_TABLE).select('ficha').eq('id', serie.id).maybeSingle()
          const banco = rel.error ? [] : serieFichaValida((rel.data as { ficha?: unknown } | null)?.ficha)
          if (banco.length > 0) fichaUsada = banco
        }
        if (pegou) await ev({ name: SERIE_AUTO_EVENTS.fichaFixed, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, metadata: { serie_id: serie.id, nomes: fichaAtual.ficha.map((f) => f.nome).slice(0, 6), replaced: gravadaValida ? null : (serie.ficha === null || serie.ficha === undefined ? 'null' : 'invalid') } })
      }
      // ── a ideia (régua do motor fica com o escritor da rota) e o episódio nasce ANTES de qualquer gasto ──
      const idea = serieIdeiaDoEpisodio({ theme: serie.theme, seq, ficha: fichaUsada, sourceScript: serie.source_script, anchor: serie.anchor, lastIdea: serie.last_episode_idea })
      const generationId = serieGenerationId(serie.id, weekKey, attempt)
      const claim = await db.from(SERIE_AUTO_EPISODES_TABLE).insert({ serie_id: serie.id, user_id: serie.user_id, week_key: weekKey, seq, attempt, status: 'pending', generation_id: generationId, idea, credits_cost: cost }).select('id').maybeSingle()
      if (claim.error || !claim.data) {
        if ((claim.error as { code?: string } | null)?.code !== '23505') console.error('[serie] episode claim failed:', claim.error?.message)
        await adiar(SERIE_AUTO_RETRY_MS, 'episode_claim_error')
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
        if (!charged && res.status === 402) {
          // a ROTA recusou por crédito/plano (402 = nada cobrado): é semana pulada, não falha — retentar 3x não muda o saldo
          await patchEp(epId, { status: 'skipped', error: `route_402: ${String(res.body?.reason ?? res.body?.error ?? '').slice(0, 200)}`, finished_at: nowIso() })
          await pularSemana('rota', { http: 402, reason_code: res.body?.reason ?? null })
          continue
        }
        if (!charged && serieRespostaEstacionada(res.status, res.body)) {
          // ESTACIONADO pela rota (fal sem saldo/capacidade): o resume-parked-renders retoma e cobra quando a fal voltar. É o episódio
          // da semana EM ANDAMENTO — nunca falha, nunca tentativa 2 (seriam 2 débitos, 2 filmes, 2 e-mails). O passe A segue o 'parked-…'.
          dispatch.parked++
          await patchEp(epId, { status: 'parked', dispatched_at: nowIso(), parked_at: nowIso(), error: `parked_${String(res.body?.reason ?? (res.body?.parked === true ? 'route' : 'queued')).slice(0, 60)}` })
          await ev({ name: SERIE_AUTO_EVENTS.parked, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: generationId, metadata: { serie_id: serie.id, week_key: weekKey, seq, attempt, http: res.status, parked: res.body?.parked === true, queued: res.body?.queued === true, reason_code: res.body?.reason ?? null, phase: 'dispatch' } })
        } else if (!charged) {
          // Qualquer outra recusa (5xx, 4xx, 503 "refund is still being confirmed"): a resposta NÃO prova que nada foi cobrado — o estorno
          // pode ter falhado com o débito vivo. A tentativa 2 (outro generation_id = outro débito) só abre com o débito LIDO ausente/estornado.
          const motivo = `dispatch_${res.status}: ${res.body?.error ?? res.errorText ?? ''}`
          const debito = await lerDebitoDe(serie.user_id, generationId)
          if (debito === 'none' || debito === 'refunded') { await failEp(motivo, { reason_code: res.body?.reason ?? null, debit: debito }); continue }
          // vivo = o cliente pagou: o passe A segue (filme tardio = entregue; prazo = stuck, nunca tentativa 2); ilegível = pending (o passe A relê)
          dispatch.started++
          await patchEp(epId, debito === 'live' ? { status: 'dispatched', dispatched_at: nowIso(), error: `http_${res.status}_debit_live` } : { status: 'pending', error: `http_${res.status}_debit_unknown` })
          await ev({ name: SERIE_AUTO_EVENTS.dispatched, userId: serie.user_id, path: SERIE_AUTO_CRON_PATH, sessionId: generationId, metadata: { serie_id: serie.id, week_key: weekKey, seq, attempt, http: res.status, debit: debito, unconfirmed: true, error: motivo.slice(0, 200) } })
        }
        else {
          dispatch.started++
          await patchEp(epId, { status: 'dispatched', dispatched_at: nowIso(), error: `http_${res.status}_charged` })
        }
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
