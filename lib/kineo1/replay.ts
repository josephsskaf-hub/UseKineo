// ═══ KINEO1-IMAGEM-V2-2026-09-28 — REPLAY OFFLINE da escolha de imagem do Kineo 1 (nada renderiza, nada grava) ═══
//
// Para provar a v2 ANTES de mexer na rota travada (parte B, trava 8.2): pega um filme de cliente já julgado, lê a
// evidência gravada (fast_scene_plan: fala, busca, origem, tags; fast_coherence: a nota; compose_submission_claim: a
// narração e a duração — como lib/admin/fastCoherence.ts), refaz SÓ a escolha de imagem com as peças v2 —
// planSceneQueries → cofre v2 → pool da Pixabay com o portão v2 (dryRun: não grava no cofre) → cena fraca pela regra
// da parte B vira clipe de IA simulado (fonte 'aiVideo', busca 'AI clip: <prompt>', do jeito que o painel já simula
// em lib/admin/fastCoherence.ts:202-207, mas no modo TROCA: o stock da cena sai) — e chama o MESMO juiz
// (scoreFastCoherence, versão vigente) sobre a evidência nova. Custo por filme: 1 gpt-4o-mini das buscas + 1 do juiz
// (+ o diretor de clipes da Pixabay, ~US$ 0,0002 por cena, que faz parte da escolha real), ~US$ 0,002-0,003. Por padrão
// roda as DUAS variantes do portão v2 (a regra 2 pura, pedida, e a regra 5 da âncora — ver lib/pixabay.ts), +1 juiz.
//
// Limites honestos (o juiz lê TEXTO, não pixel — ver o risco no scout):
//   · a cena que vira clipe de IA sai sem tags, e o juiz tende a aceitar "gerado" por construção: a nota nova precisa
//     do olho do fundador numa amostra renderizada antes de a rota mudar;
//   · os stills são mantidos como estavam, exceto os de 'character_story' quando o detector v2 diz que não há
//     personagem (a rota v2 não os geraria); o still que a rota tentaria depois de um pool vazio não é simulado — a cena
//     fica com o clipe reciclado (o pior caso);
//   · a Pixabay de hoje não é a Pixabay do dia do filme: o pool pode ter mudado.
// A Pixabay tem 100 req/min por CHAVE, dividida com a produção: o replay se limita a `pixabayRpm` (padrão 40).
import type { SupabaseClient } from '@supabase/supabase-js'
import { PEOPLE_LIFESTYLE_RE } from '@/lib/broll/aesthetic-packs'
import { searchVault } from '@/lib/clipVault'
import { buildSceneClipPrompt, FIRST_FILM_AI_CLIPS_EVENT, FIRST_FILM_AI_CLIPS_RESULT_EVENT } from '@/lib/fastAiClips'
import { characterStoryName } from '@/lib/fastAiScene'
import {
  FAST_COHERENCE_EVENT,
  FAST_COHERENCE_VERSION,
  FAST_SCENE_PLAN_EVENT,
  scoreFastCoherence,
  type FastCoherenceResult,
  type FastSceneEvidence,
} from '@/lib/fastCoherence'
import { getPixabayClipsForScene, readPixabayHealth, stripCameraPhrases, type ScenePoolReport } from '@/lib/pixabay'
import { commaPlanQueryParts, pickAiClipScenesV2, planSceneQueries, weakSceneReason, type SceneQueryPlan, type StockOrigin, type WeakReason } from './sceneQueries'

type EventRow = { created_at: string; session_id: string | null; user_id: string | null; metadata: Record<string, unknown> | null }

export type ReplayFilm = {
  generation_id: string
  user_id: string | null
  created_at: string
  topic: string
  verbatim: boolean
  scenes: FastSceneEvidence[]
  narration: string
  narration_source: 'compose_claim' | 'scene_plan'
  film_seconds: number | null
  before: { score: number; narration_vs_visuals: number | null; problems: string[]; version: string; at: string } | null
  ai: { eligible: boolean; hookPrompt: string | null; hookReady: boolean; clipPrompts: Record<number, string>; clipReady: number[] }
  stills: { character: string | null; byScene: Record<number, string> }
}

export type ReplaySceneRow = {
  scene: number
  voiceover: string
  before: { query: string | null; sources: string[]; tags: string | null }
  plan: { subject: string; stockable: boolean | null; queries: string[] } | null
  after: { queries: string[]; origin: StockOrigin | 'kept'; picked_query: string | null; sources: string[]; tags: string[]; weak: WeakReason | null; ai_clip: boolean }
}

export type ReplayFilmResult = {
  generation_id: string
  created_at: string
  topic: string
  character: { v1: string | null; v2: string | null }
  /** variante do portão de `after`/`per_scene`: 'strict' = regra 2 pura (o pedido); 'fallback' = com a regra 5 (âncora) */
  variant: 'strict' | 'fallback'
  before: ReplayFilm['before']
  before_rejudge: Pick<FastCoherenceResult, 'score' | 'narration_vs_visuals' | 'problems'> | null
  after: Pick<FastCoherenceResult, 'score' | 'narration_vs_visuals' | 'problems' | 'summary'> | null
  /** a mesma escolha com a regra 5 do portão (só quando as duas variantes rodam) */
  after_fallback: Pick<FastCoherenceResult, 'score' | 'narration_vs_visuals' | 'problems' | 'summary'> | null
  ai_scenes: number[]
  ai_scenes_fallback: number[] | null
  plan_ok: boolean
  per_scene: ReplaySceneRow[]
  per_scene_fallback: Array<{ scene: number; origin: StockOrigin | 'kept'; tags: string | null; weak: WeakReason | null; ai_clip: boolean }> | null
  cost: { openai_calls: number; pixabay_requests: number; ms: number }
}

export type ReplayOptions = {
  /** clipes de IA nas cenas fracas (padrão 2 = os extras de hoje; 4 simula a proposta 4c do scout) */
  aiMax?: number
  /** 'eligible' = só filmes que hoje ganham clipe (1º filme de conta gratuita, com hook); 'all' = todos */
  aiScope?: 'eligible' | 'all'
  /** também re-julga a evidência GRAVADA (mede o ruído do juiz; +1 chamada) */
  rejudgeBefore?: boolean
  /** teto de requisições por minuto à Pixabay (padrão 40 de 100: o resto é da produção) */
  pixabayRpm?: number
  /** variantes do portão v2: 'strict' (regra 2 pura), 'fallback' (com a regra 5), 'both' (padrão: as duas, +1 juiz) */
  variants?: 'strict' | 'fallback' | 'both'
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null)

/** Carrega a evidência gravada de UM filme do Kineo 1. null = não é um filme do Kineo 1 com plano gravado. */
export async function loadReplayFilm(admin: SupabaseClient, generationId: string): Promise<ReplayFilm | null> {
  const { data: planRows } = await admin
    .from('events')
    .select('created_at, session_id, user_id, metadata')
    .eq('name', FAST_SCENE_PLAN_EVENT)
    .eq('session_id', generationId)
    .order('created_at', { ascending: false })
    .limit(1)
  const plan = ((planRows ?? []) as EventRow[])[0]
  const scenes = Array.isArray(plan?.metadata?.scenes) ? (plan!.metadata!.scenes as FastSceneEvidence[]) : null
  if (!plan || !scenes || scenes.length === 0) return null
  const uid = plan.user_id
  const t = Date.parse(plan.created_at)
  const [coh, claims, ai, stills] = await Promise.all([
    admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', FAST_COHERENCE_EVENT).eq('session_id', generationId).order('created_at', { ascending: false }).limit(10),
    uid
      ? admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', 'compose_submission_claim').eq('user_id', uid).eq('metadata->>generation_id', generationId).order('created_at', { ascending: false }).limit(1)
      : Promise.resolve({ data: [] as EventRow[] }),
    admin.from('events').select('created_at, session_id, user_id, metadata').in('name', [FIRST_FILM_AI_CLIPS_EVENT, FIRST_FILM_AI_CLIPS_RESULT_EVENT]).eq('session_id', generationId).limit(10),
    uid && Number.isFinite(t)
      ? admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', 'fast_ai_still').eq('user_id', uid).gte('created_at', new Date(t - 15_000).toISOString()).lte('created_at', new Date(t + 15_000).toISOString()).limit(5)
      : Promise.resolve({ data: [] as EventRow[] }),
  ])
  const cohRows = (coh.data ?? []) as EventRow[]
  const cohRow = cohRows.find((r) => r.metadata?.version === FAST_COHERENCE_VERSION) ?? cohRows[0]
  const claim = ((claims.data ?? []) as EventRow[])[0]
  const narrationClaim = typeof claim?.metadata?.narration === 'string' ? (claim.metadata.narration as string).trim() : ''
  const narrationPlan = scenes.map((s) => (typeof s?.voiceover === 'string' ? s.voiceover : '')).filter(Boolean).join(' ')
  const clipPrompts: Record<number, string> = {}
  const clipReady: number[] = []
  let eligible = false
  for (const r of (ai.data ?? []) as EventRow[]) {
    const md = r.metadata ?? {}
    if (Array.isArray(md.clips)) {
      eligible = true
      for (const c of md.clips as Array<{ scene?: unknown; prompt?: unknown }>) if (typeof c?.scene === 'number' && typeof c?.prompt === 'string') clipPrompts[c.scene] = c.prompt
    }
    if (Array.isArray(md.scenes)) for (const s of md.scenes as Array<{ scene?: unknown; ok?: unknown }>) if (s?.ok === true && typeof s?.scene === 'number') clipReady.push(s.scene)
  }
  const stillRow = ((stills.data ?? []) as EventRow[]).sort((a, b) => Math.abs(Date.parse(a.created_at) - t) - Math.abs(Date.parse(b.created_at) - t))[0]
  const byScene: Record<number, string> = {}
  if (Array.isArray(stillRow?.metadata?.log)) for (const l of stillRow!.metadata!.log as Array<{ scene?: unknown; reason?: unknown; ok?: unknown }>) if (l?.ok === true && typeof l.scene === 'number' && typeof l.reason === 'string') byScene[l.scene] = l.reason
  const topic = typeof plan.metadata?.topic === 'string' ? (plan.metadata.topic as string) : ''
  const cm = cohRow?.metadata ?? null
  return {
    generation_id: generationId,
    user_id: uid,
    created_at: plan.created_at,
    topic,
    verbatim: plan.metadata?.verbatim === true,
    scenes,
    narration: narrationClaim || narrationPlan,
    narration_source: narrationClaim ? 'compose_claim' : 'scene_plan',
    film_seconds: num(claim?.metadata?.duration),
    before: cm && typeof cm.score === 'number'
      ? { score: cm.score as number, narration_vs_visuals: num(cm.narration_vs_visuals), problems: Array.isArray(cm.problems) ? (cm.problems as unknown[]).filter((p): p is string => typeof p === 'string') : [], version: String(cm.version ?? ''), at: cohRow!.created_at }
      : null,
    ai: { eligible, hookPrompt: clipPrompts[1] ?? null, hookReady: clipReady.includes(1), clipPrompts, clipReady },
    stills: { character: typeof stillRow?.metadata?.character === 'string' ? (stillRow.metadata.character as string) : null, byScene },
  }
}

// Pixabay: janela deslizante de 60 s por instância (o replay divide a chave com a produção).
const janela: Array<{ at: number; n: number }> = []
const reqCount = () => { const h = readPixabayHealth(); return h.ok + h.transient + h.hard }
async function esperarVaga(rpm: number, deadlineAt?: number): Promise<void> {
  for (;;) {
    const agora = Date.now()
    while (janela.length > 0 && agora - janela[0].at > 60_000) janela.shift()
    const usadas = janela.reduce((a, j) => a + j.n, 0)
    if (usadas < rpm || janela.length === 0) return
    const espera = Math.min(60_000 - (agora - janela[0].at) + 50, 15_000)
    if (deadlineAt && agora + espera > deadlineAt) return
    await new Promise((r) => setTimeout(r, espera))
  }
}

/** Evidência gravada com os clipes de IA prontos simulados no modo de HOJE (inserção), como o painel julga. */
export function storedEvidenceAsJudged(film: ReplayFilm): FastSceneEvidence[] {
  return film.scenes.map((s) => (film.ai.clipReady.includes(s.scene) && film.ai.clipPrompts[s.scene]
    ? { ...s, query: `AI clip: ${film.ai.clipPrompts[s.scene]}`, sources: ['aiVideo', ...s.sources.filter((x) => x !== 'aiVideo')] }
    : s))
}

/** Refaz a escolha de imagem de UM filme com as peças v2 e julga de novo. Nunca grava nada. */
export async function replayFilm(admin: SupabaseClient, film: ReplayFilm, opts: ReplayOptions & { deadlineAt?: number } = {}): Promise<ReplayFilmResult> {
  const t0 = Date.now()
  const rpm = Math.max(10, Math.min(80, opts.pixabayRpm ?? 40))
  let openaiCalls = 0
  let pixabayRequests = 0
  const falas = film.scenes.map((s) => s.voiceover ?? '').join(' ').trim()
  const charV1 = film.stills.character ?? characterStoryName(falas || film.topic)
  const charV2 = characterStoryName(falas || film.topic, { v2: true })
  const plans = await planSceneQueries(film.scenes.map((s) => ({ voiceover: s.voiceover ?? '', planQuery: s.query })), { topic: film.topic, language: null })
  openaiCalls++
  const handPicked = /\[(?:pexels|stock|b-?roll)\s*:/i.test(film.topic)
  const planOf: Array<SceneQueryPlan | null> = film.scenes.map((_, i) => plans?.[i] ?? null)

  /** A escolha de imagem v2 do filme inteiro; `headFallback` liga a regra 5 do portão (âncora como segunda linha). */
  const escolher = async (headFallback: boolean) => {
    const used = new Set<string>()
    const rows: ReplaySceneRow[] = []
    const after: FastSceneEvidence[] = []
    const weak: Array<{ scene: number; reason: WeakReason | null }> = []
    for (let i = 0; i < film.scenes.length; i++) {
      const s = film.scenes[i]
      const plan = planOf[i]
      const fala = s.voiceover ?? ''
      const antes = { query: s.query ?? null, sources: s.sources ?? [], tags: (s.tags ?? [])[0] ?? null }
      const motivoStill = film.stills.byScene[s.scene]
      // Cena do cliente, ou desenho (a rota fecha a cena no still desenhado): fica como estava.
      if (((s.sources ?? []).length > 0 && (s.sources ?? []).every((x) => x === 'user')) || motivoStill === 'drawn') {
        after.push({ ...s })
        weak.push({ scene: s.scene, reason: null })
        rows.push({ scene: s.scene, voiceover: fala.slice(0, 160), before: antes, plan: plan ? { subject: plan.subject, stockable: plan.stockable, queries: plan.queries } : null, after: { queries: [], origin: 'kept', picked_query: null, sources: s.sources ?? [], tags: (s.tags ?? []).slice(0, 2), weak: null, ai_clip: false } })
        continue
      }
      // Stills: ficam, menos os de 'character_story' quando o detector v2 não vê personagem.
      const stills = (s.sources ?? []).filter((x) => x === 'aiStill' || x === 'aiHook').filter((x) => !(x === 'aiStill' && charV1 && !charV2 && motivoStill === 'character_story'))
      const temVisualGerado = stills.length > 0
      // Buscas v2: as do plano novo; depois os pedaços da busca antiga que a fala menciona; a do cliente ([Pexels: …]) na frente.
      const antigas = commaPlanQueryParts(s.query, fala)
      const minhas = handPicked && s.query ? [stripCameraPhrases(s.query)] : []
      const queries = Array.from(new Set([...minhas, ...(plan?.queries ?? []), ...antigas].map((q) => q.trim()).filter(Boolean)))
      if (queries.length === 0 && s.query) queries.push(stripCameraPhrases(s.query))
      const maxClips = temVisualGerado ? 1 : i === 0 ? 3 : 2
      const sceneNeedsPeople = PEOPLE_LIFESTYLE_RE.test(fala)
      const picks: Array<{ url: string; tags: string; query: string | null }> = []
      let origin: StockOrigin = 'none'
      await esperarVaga(rpm, opts.deadlineAt)
      const antesReq = reqCount()
      if (!film.verbatim && !charV2 && !temVisualGerado && queries[0]) {
        const hits = await searchVault(queries[0], { v2: true, client: admin, exclude: used, limit: maxClips, sceneText: fala, sceneNeedsPeople })
        for (const h of hits) { picks.push({ url: h.storageUrl, tags: h.tags, query: queries[0] }); used.add(h.storageUrl) }
        if (hits.length > 0) origin = 'vault'
      }
      if (picks.length < maxClips && queries.length > 0) {
        let rel: ScenePoolReport | null = null
        await getPixabayClipsForScene(queries, sceneNeedsPeople, fala, {
          exact: film.verbatim, exclude: used, maxClips: maxClips - picks.length, aspect: '9:16', strictSubject: !!charV2,
          v2: true, dryRun: true, headFallback, onReport: (r) => { rel = r },
        })
        const r = rel as ScenePoolReport | null
        for (const p of r?.picks ?? []) { picks.push({ url: p.url, tags: p.tags, query: p.query }); used.add(p.url) }
        if (r && r.picks.length > 0) origin = origin === 'vault' ? 'pool' : r.origin === 'none' ? 'none' : r.origin
      }
      const delta = Math.max(0, reqCount() - antesReq)
      pixabayRequests += delta
      janela.push({ at: Date.now(), n: delta })
      if (picks.length === 0) origin = 'recycled'
      const reason = weakSceneReason({ origin, stockable: plan?.stockable ?? null, subject: plan?.subject ?? null, pickedTags: picks[0]?.tags ?? null })
      weak.push({ scene: s.scene, reason })
      after.push({
        scene: s.scene,
        voiceover: s.voiceover,
        query: picks[0]?.query ?? queries[0] ?? s.query ?? null,
        from: typeof s.from === 'number' ? s.from : i,
        sources: [...stills, ...(picks.length > 0 ? picks.map(() => 'pixabay') : ['fallbackA'])],
        tags: picks.map((p) => p.tags).filter(Boolean),
      })
      rows.push({
        scene: s.scene, voiceover: fala.slice(0, 160), before: antes,
        plan: plan ? { subject: plan.subject, stockable: plan.stockable, queries: plan.queries } : null,
        after: { queries, origin, picked_query: picks[0]?.query ?? null, sources: after[after.length - 1].sources, tags: picks.slice(0, 2).map((p) => p.tags.slice(0, 160)), weak: reason, ai_clip: false },
      })
    }
    // Clipes de IA: as cenas fracas (regra da parte B), no modo TROCA — o stock da cena sai.
    const elegivel = film.ai.eligible || opts.aiScope === 'all'
    const aiScenes = elegivel ? pickAiClipScenesV2(weak, Math.max(0, Math.min(6, opts.aiMax ?? 2)), { skipScene1: film.ai.eligible }) : []
    for (const sceneNo of aiScenes) {
      const idx = after.findIndex((e) => e.scene === sceneNo)
      if (idx < 0) continue
      const plan = planOf[idx]
      const prompt = buildSceneClipPrompt(plan?.aiPrompt ?? '', after[idx].voiceover ?? '', plan?.subject ?? '')
      const stills = after[idx].sources.filter((x) => x === 'aiStill' || x === 'aiHook')
      after[idx] = { ...after[idx], query: `AI clip: ${prompt}`, sources: [...stills, 'aiVideo'], tags: [] }
      rows[idx].after = { ...rows[idx].after, sources: after[idx].sources, tags: [], ai_clip: true }
    }
    // O hook da cena 1 (quando ficou pronto no filme real) segue no modo de hoje (inserção), como o painel julga.
    if (film.ai.hookReady && film.ai.hookPrompt && after[0] && !aiScenes.includes(after[0].scene)) {
      after[0] = { ...after[0], query: `AI clip: ${film.ai.hookPrompt}`, sources: ['aiVideo', ...after[0].sources.filter((x) => x !== 'aiVideo')] }
    }
    return { after, rows, aiScenes }
  }

  // As duas variantes do portão v2 rodam na MESMA instância: a busca da Pixabay fica no cache de 24 h do módulo, então
  // a segunda custa quase só o juiz. Padrão: as duas (a regra 2 pura, pedida, e a regra 5, medida no replay offline).
  const variantes = opts.variants ?? 'both'
  const estrito = variantes === 'fallback' ? null : await escolher(false)
  const ancora = variantes === 'strict' ? null : await escolher(true)
  const principal = (estrito ?? ancora)!
  const julgar = (scenes: FastSceneEvidence[]) => scoreFastCoherence({ prompt: film.topic, narration: film.narration, scenes, promptMayBeTruncated: false, engine: 'fast', filmSeconds: film.film_seconds })
  const [depois, depoisAncora, rejulgado] = await Promise.all([
    julgar(principal.after),
    estrito && ancora ? julgar(ancora.after) : Promise.resolve(null),
    opts.rejudgeBefore ? julgar(storedEvidenceAsJudged(film)) : Promise.resolve(null),
  ])
  openaiCalls += 1 + (estrito && ancora ? 1 : 0) + (opts.rejudgeBefore ? 1 : 0)
  const resumo = (r: Awaited<ReturnType<typeof julgar>>) => (r ? { score: r.score, narration_vs_visuals: r.narration_vs_visuals, problems: r.problems, summary: r.summary } : null)
  return {
    generation_id: film.generation_id,
    created_at: film.created_at,
    topic: film.topic.slice(0, 160),
    character: { v1: charV1, v2: charV2 },
    variant: estrito ? 'strict' : 'fallback',
    before: film.before,
    before_rejudge: rejulgado ? { score: rejulgado.score, narration_vs_visuals: rejulgado.narration_vs_visuals, problems: rejulgado.problems } : null,
    after: resumo(depois),
    after_fallback: estrito && ancora ? resumo(depoisAncora) : null,
    ai_scenes: principal.aiScenes,
    ai_scenes_fallback: estrito && ancora ? ancora.aiScenes : null,
    plan_ok: !!plans,
    per_scene: principal.rows,
    per_scene_fallback: estrito && ancora ? ancora.rows.map((r) => ({ scene: r.scene, origin: r.after.origin, tags: r.after.tags[0] ?? null, weak: r.after.weak, ai_clip: r.after.ai_clip })) : null,
    cost: { openai_calls: openaiCalls, pixabay_requests: pixabayRequests, ms: Date.now() - t0 },
  }
}

/** Distribuição de notas (a régua do juiz só produz 40/60/80+ na imagem; as faixas cobrem qualquer valor). */
export function coherenceDistribution(values: Array<number | null | undefined>): { n: number; mean: number | null; buckets: Record<'<=40' | '41-60' | '61-79' | '>=80' | 'null', number> } {
  const buckets = { '<=40': 0, '41-60': 0, '61-79': 0, '>=80': 0, null: 0 }
  const nums: number[] = []
  for (const v of values) {
    if (typeof v !== 'number' || !Number.isFinite(v)) { buckets.null++; continue }
    nums.push(v)
    if (v <= 40) buckets['<=40']++
    else if (v <= 60) buckets['41-60']++
    else if (v < 80) buckets['61-79']++
    else buckets['>=80']++
  }
  return { n: values.length, mean: nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null, buckets }
}

/** Resumo do lote: antes × depois (imagem e nota geral) e quantos filmes subiram/caíram na imagem. */
export function summarizeReplay(results: ReplayFilmResult[]) {
  const conta = (depois: (r: ReplayFilmResult) => number | null | undefined) => {
    let subiu = 0, caiu = 0, igual = 0
    for (const r of results) {
      const a = r.before?.narration_vs_visuals, d = depois(r)
      if (typeof a !== 'number' || typeof d !== 'number') continue
      if (d > a) subiu++
      else if (d < a) caiu++
      else igual++
    }
    return { subiu, caiu, igual }
  }
  const { subiu, caiu, igual } = conta((r) => r.after?.narration_vs_visuals)
  const temAncora = results.some((r) => r.after_fallback)
  const ancora = conta((r) => r.after_fallback?.narration_vs_visuals)
  return {
    image_before: coherenceDistribution(results.map((r) => r.before?.narration_vs_visuals ?? null)),
    image_after: coherenceDistribution(results.map((r) => r.after?.narration_vs_visuals ?? null)),
    score_before: coherenceDistribution(results.map((r) => r.before?.score ?? null)),
    score_after: coherenceDistribution(results.map((r) => r.after?.score ?? null)),
    image_rejudge: results.some((r) => r.before_rejudge) ? coherenceDistribution(results.map((r) => r.before_rejudge?.narration_vs_visuals ?? null)) : null,
    image_up: subiu,
    image_down: caiu,
    image_same: igual,
    image_after_fallback: temAncora ? coherenceDistribution(results.map((r) => r.after_fallback?.narration_vs_visuals ?? null)) : null,
    score_after_fallback: temAncora ? coherenceDistribution(results.map((r) => r.after_fallback?.score ?? null)) : null,
    image_up_fallback: temAncora ? ancora.subiu : null,
    image_down_fallback: temAncora ? ancora.caiu : null,
  }
}

/**
 * Filmes de cliente do Kineo 1 para o lote: nota vigente do juiz com imagem ≤ `maxImage`, mais recentes primeiro,
 * sem as contas do fundador. `offset` continua um lote que parou no teto de tempo.
 */
export async function pickReplayBatch(
  admin: SupabaseClient,
  opts: { last: number; maxImage: number; offset?: number; days?: number; excludeEmails: string[] },
): Promise<{ ids: string[]; eligible: number }> {
  const since = new Date(Date.now() - Math.max(1, Math.min(30, opts.days ?? 10)) * 86_400_000).toISOString()
  const { data } = await admin
    .from('events')
    .select('created_at, session_id, user_id, metadata')
    .eq('name', FAST_COHERENCE_EVENT)
    .eq('metadata->>version', FAST_COHERENCE_VERSION)
    .eq('metadata->>engine', 'fast')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000)
  const latest = new Map<string, EventRow>()
  for (const r of (data ?? []) as EventRow[]) if (r.session_id && !latest.has(r.session_id)) latest.set(r.session_id, r)
  const rows = Array.from(latest.values()).filter((r) => {
    const v = num(r.metadata?.narration_vs_visuals)
    return v !== null && v <= opts.maxImage
  })
  const uids = Array.from(new Set(rows.map((r) => r.user_id).filter((u): u is string => !!u)))
  const excl = new Set(opts.excludeEmails.map((e) => e.toLowerCase()))
  const emailOf = new Map<string, string>()
  for (let i = 0; i < uids.length; i += 200) {
    const { data: profs } = await admin.from('profiles').select('id, email').in('id', uids.slice(i, i + 200))
    for (const p of (profs ?? []) as Array<{ id: string; email: string | null }>) emailOf.set(p.id, (p.email ?? '').toLowerCase())
  }
  const clientes = rows.filter((r) => !r.user_id || !excl.has(emailOf.get(r.user_id) ?? ''))
  const off = Math.max(0, opts.offset ?? 0)
  return { ids: clientes.slice(off, off + Math.max(1, opts.last)).map((r) => r.session_id as string), eligible: clientes.length }
}
