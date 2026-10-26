import type { readAll as ReadAllRows } from '../supabase/readAll'
// KINEO-META95-REGUA-1910 — leitura do PLACAR DA RÉGUA 95 para o /admin/coerencia (só leitura; quem julga é o cron
// /api/cron/regua-95). Por produto (Filmes / Ads / UGC / Clipes) e por motor: n, média e "% ≥ 95" das notas NOVAS
// (coherence_v2 e pixel_score) e da nota combinada (a menor das duas — o vídeo só é 95 se o texto E o pixel forem 95),
// com corte por data de entrega (padrão: o dia do deploy desta régua). Contas da casa fora por padrão (lib/internalAccounts).
import type { SupabaseClient } from '@supabase/supabase-js'
import { COHERENCE_V2_EVENT, COHERENCE_V2_VERSION, type ProdutoRegua } from '@/lib/regua95/coherenceV2'
import { PIXEL_SCORE_EVENT, PIXEL_SCORE_VERSION } from '@/lib/regua95/pixelScore'
import { UGC_SCORE_EVENT, UGC_SCORE_VERSION } from '@/lib/regua95/ugcJudge' // KINEO-META95-UGC-1910
import { PRODUTOS_REGUA, REGUA95_DEPLOY_DESDE, notaRegua, placar, type LinhaPlacar } from '@/lib/regua95/contexto'
import { isInternalEmail } from '@/lib/internalAccounts'
import { combineQualityEvidence, readJudgeEvidence, readSavedTaskResult, type JudgeReadout, type QualityJudge, type QualityReadout, type TaskCanaryTarget } from '@/lib/admin/qualityEvidence'
import { TASK_FULFILLMENT_VERSION, type FulfillmentResult } from '@/lib/regua95/taskFulfillmentCanary'

export type NotaRegua95 = {
  key: string
  user_id: string | null
  product: ProdutoRegua
  engine: string
  delivered_at: string
  video_id: string | null
  video_url: string | null
  coerencia: number | null
  pixel: number | null
  /** KINEO-META95-UGC-1910 — juiz de UGC/apresentador (olhos no gancho, sorriso, mão, duplicação, rótulo); só UGC */
  ugc: number | null
  nota: number | null
  /** Raw historical arithmetic is preserved for inspection, never counted as a validated final grade. */
  nota_historica: number | null
  judges: Partial<Record<QualityJudge, JudgeReadout>>
  quality: QualityReadout
  generation_id: string | null
  judge_event_ids: Partial<Record<QualityJudge, string>>
  canary_target: TaskCanaryTarget | null
  canary_result: FulfillmentResult | null
  idea_source: string | null
  pixel_caps: string[]
  pixel_summary: string
  coerencia_problems: string[]
  ugc_caps: string[]
  ugc_motivos: string[]
  usd: number
}

export type LinhaRegua95 = { rotulo: string; coerencia: LinhaPlacar; pixel: LinhaPlacar; ugc: LinhaPlacar; nota: LinhaPlacar; usd: number; entregas: number; incompletas: number; historicas: number }

type EventRow = { id?: string | null; created_at: string; session_id: string | null; user_id: string | null; metadata: Record<string, unknown> | null }

const str = (x: unknown) => (typeof x === 'string' ? x : '')
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null)

/**
 * Eventos (os juízes, versão vigente; o mais recente por entrega vence) → uma nota por entrega. Pura.
 * KINEO-META95-UGC-1910 — no UGC entra o 3º juiz (ugc_score) e a nota = a menor entre coerência, pixel e UGC.
 */
export function juntarNotasRegua(eventos: Array<EventRow & { name: string }>, desdeIso: string): NotaRegua95[] {
  const porChave = new Map<string, NotaRegua95>()
  const visto = new Set<string>()
  const canaryResults = new Map<string, FulfillmentResult>()
  const identityConflicts = new Set<string>()
  const identityKey = (key: string, video: string | null, generation: string | null, owner: string | null) => JSON.stringify([key, video, generation, owner])
  const ordenados = [...eventos].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  for (const e of ordenados) {
    const m = e.metadata ?? {}
    const key = e.session_id
    if (!key) continue
    if (e.name === 'task_fulfillment_canary' && m.version === TASK_FULFILLMENT_VERSION && str(m.video_id) === key) {
      const resultKey = identityKey(key, str(m.video_id) || null, str(m.generation_id) || null, e.user_id)
      const result = readSavedTaskResult(m.result)
      if (result && str(m.generation_id) && e.user_id && !canaryResults.has(resultKey)) canaryResults.set(resultKey, result)
      continue
    }
    const ehCoer = e.name === COHERENCE_V2_EVENT && m.version === COHERENCE_V2_VERSION
    const ehPix = e.name === PIXEL_SCORE_EVENT && m.version === PIXEL_SCORE_VERSION
    const ehUgc = e.name === UGC_SCORE_EVENT && m.version === UGC_SCORE_VERSION // KINEO-META95-UGC-1910
    if (!ehCoer && !ehPix && !ehUgc) continue
    // Latest failure/partial evidence must remain visible; never resurrect an older successful grade.
    const marca = `${e.name}:${key}`
    if (visto.has(marca)) continue
    visto.add(marca)
    const entregue = str(m.delivered_at) || e.created_at
    if (entregue < desdeIso) continue
    const produto = (PRODUTOS_REGUA as string[]).includes(str(m.product)) ? (str(m.product) as ProdutoRegua) : 'filme'
    const n: NotaRegua95 = porChave.get(key) ?? { key, user_id: e.user_id, product: produto, engine: str(m.engine) || 'unknown', delivered_at: entregue, video_id: str(m.video_id) || null, video_url: null, coerencia: null, pixel: null, ugc: null, nota: null, nota_historica: null, judges: {}, quality: combineQualityEvidence(produto, {}), generation_id: str(m.generation_id) || null, judge_event_ids: {}, canary_target: null, canary_result: null, idea_source: null, pixel_caps: [], pixel_summary: '', coerencia_problems: [], ugc_caps: [], ugc_motivos: [], usd: 0 }
    const judgeName = ehCoer ? 'coerencia' : ehUgc ? 'ugc' : 'pixel'
    // A shared session_id is not proof of the same delivery. Never borrow a
    // score, problem or source ID from another generation/owner/video.
    if (n.user_id !== e.user_id || n.video_id !== (str(m.video_id) || null) || n.generation_id !== (str(m.generation_id) || null)) {
      identityConflicts.add(key)
      n.judges[judgeName] = { state: 'incomplete', score: null, reasons: ['delivery_evidence_identity_mismatch'], coverage: null, fidelityBasis: null }
      porChave.set(key, n)
      continue
    }
    n.judges[judgeName] = readJudgeEvidence(m, judgeName)
    if (e.id) n.judge_event_ids[judgeName] = e.id
    if (ehCoer) {
      n.coerencia = num(m.score)
      n.idea_source = str(m.idea_source) || null
      n.coerencia_problems = Array.isArray(m.problems) ? (m.problems as unknown[]).filter((p): p is string => typeof p === 'string').slice(0, 4) : []
    } else if (ehUgc) {
      n.ugc = num(m.score)
      n.video_url = n.video_url || str(m.video_url) || null
      n.ugc_caps = Array.isArray(m.caps) ? (m.caps as unknown[]).filter((p): p is string => typeof p === 'string').slice(0, 6) : []
      n.ugc_motivos = Array.isArray(m.motivos) ? (m.motivos as unknown[]).filter((p): p is string => typeof p === 'string').slice(0, 6) : []
    } else {
      n.pixel = num(m.score)
      n.video_url = str(m.video_url) || n.video_url
      n.pixel_caps = Array.isArray(m.caps) ? (m.caps as unknown[]).filter((p): p is string => typeof p === 'string').slice(0, 6) : []
      n.pixel_summary = str(m.summary)
    }
    n.usd += num(m.usd) ?? 0
    n.nota_historica = notaRegua(n.coerencia, notaRegua(n.pixel, n.ugc))
    n.quality = combineQualityEvidence(n.product, n.judges)
    n.nota = n.quality.score
    porChave.set(key, n)
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return Array.from(porChave.values()).map((n) => {
    const conflicting = identityConflicts.has(n.key)
    const identityKnown = !!n.user_id && (n.video_id === null || n.video_id === n.key) && (n.product !== 'filme' && n.product !== 'ugc' || !!n.generation_id) && (n.product !== 'filme' || n.video_id === n.key)
    if (conflicting || !identityKnown) {
      for (const name of Object.keys(n.judges) as QualityJudge[]) {
        const judge = n.judges[name]!
        // Missing identity must not relabel a historical score as validated;
        // preserve its raw number and null generation for historical review.
        if (conflicting || judge.state === 'complete') n.judges[name] = { ...judge, state: 'incomplete', reasons: [...new Set([...judge.reasons, conflicting ? 'delivery_evidence_identity_mismatch' : 'delivery_identity_unverified'])] }
      }
    }
    n.quality = combineQualityEvidence(n.product, n.judges)
    n.nota = n.quality.score
    if (!conflicting && identityKnown && n.product === 'filme' && [n.video_id, n.generation_id, n.judge_event_ids.coerencia, n.judge_event_ids.pixel].every((value) => typeof value === 'string' && uuid.test(value))) n.canary_target = { videoId: n.video_id!, generationId: n.generation_id!, coherenceEventId: n.judge_event_ids.coerencia!, pixelEventId: n.judge_event_ids.pixel! }
    const saved = !conflicting && identityKnown && n.video_id ? canaryResults.get(identityKey(n.key, n.video_id, n.generation_id, n.user_id)) : null
    if (saved) n.canary_result = saved
    return n
  }).sort((a, b) => (a.delivered_at < b.delivered_at ? 1 : -1))
}

/** Placar por um campo (produto ou produto·motor). Pura. */
export function placarRegua(notas: NotaRegua95[], chave: (n: NotaRegua95) => string): LinhaRegua95[] {
  const grupos = new Map<string, NotaRegua95[]>()
  for (const n of notas) { const k = chave(n); grupos.set(k, [...(grupos.get(k) ?? []), n]) }
  return Array.from(grupos.entries())
    .map(([rotulo, xs]) => ({ rotulo, coerencia: placar(xs.map((x) => x.judges.coerencia?.state === 'complete' ? x.coerencia : null)), pixel: placar(xs.map((x) => x.judges.pixel?.state === 'complete' ? x.pixel : null)), ugc: placar(xs.map((x) => x.judges.ugc?.state === 'complete' ? x.ugc : null)), nota: placar(xs.map((x) => x.nota)), entregas: xs.length, incompletas: xs.filter((x) => x.quality.state === 'incomplete').length, historicas: xs.filter((x) => x.quality.state === 'historical').length, usd: Math.round(xs.reduce((a, x) => a + x.usd, 0) * 1e4) / 1e4 }))
    .sort((a, b) => b.nota.n - a.nota.n || a.rotulo.localeCompare(b.rotulo))
}

/** Lê o placar no banco (service role). `desde` ISO; `incluirCasa` = contas internas entram. */
export async function lerRegua95(
  admin: SupabaseClient,
  opts: { desde?: string; incluirCasa?: boolean; route?: string },
  readAll: typeof ReadAllRows,
): Promise<{ notas: NotaRegua95[]; desde: string; casaFora: number }> {
  const desde = opts.desde && !Number.isNaN(Date.parse(opts.desde)) ? new Date(opts.desde).toISOString() : REGUA95_DEPLOY_DESDE
  const route = opts.route ?? '/admin/coerencia'
  const r = await readAll(() => admin.from('events').select('id, name, created_at, session_id, user_id, metadata').in('name', [COHERENCE_V2_EVENT, PIXEL_SCORE_EVENT, UGC_SCORE_EVENT, 'task_fulfillment_canary']).gte('created_at', desde), { route, table: 'events' })
  let notas = juntarNotasRegua((r.data ?? []) as Array<EventRow & { name: string }>, desde)
  let casaFora = 0
  if (!opts.incluirCasa && notas.length > 0) {
    const ids = Array.from(new Set(notas.map((n) => n.user_id).filter((x): x is string => !!x)))
    const interno = new Set<string>()
    for (let i = 0; i < ids.length; i += 100) {
      const part = ids.slice(i, i + 100)
      const p = await admin.from('profiles').select('id, email').in('id', part).limit(part.length)
      for (const row of (p.data ?? []) as Array<{ id: string; email: string | null }>) if (isInternalEmail(row.email)) interno.add(row.id)
    }
    const antes = notas.length
    notas = notas.filter((n) => !n.user_id || !interno.has(n.user_id))
    casaFora = antes - notas.length
  }
  return { notas, desde, casaFora }
}
