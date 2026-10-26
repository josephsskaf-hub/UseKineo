import type { readAll as ReadAllRows } from '../supabase/readAll'
// KINEO-META95-REGUA-1910 — o COLETOR da régua 95: acha as entregas novas de TODOS os produtos e grava as duas notas novas.
//
// Roda no cron /api/cron/regua-95 (a cada 10 min) — DEPOIS da entrega, fora do caminho do cliente, sem tocar em rota de
// render. Cobre o que o fast_coherence nunca viu (34% das entregas de 7 d, diagnóstico §4):
//   · Filmes (videos, todos os motores) ... coherence_v2 (texto, quando há nascimento cinematic) + pixel_score;
//   · Ads v2 / UGC (videos.quality_mode='ads_v2'; UGC = pedido com apresentador) ... pixel_score com o brief e a foto real;
//   · Clipes (videos 'clip' + tabela clips 'done') ... pixel_score com o prompt;
//   · Avatar (avatar_submission_claim 'done' com completed_video_url) ... pixel_score com a fala.
// Chave da entrega (session_id dos eventos): id do vídeo (videos), id do clipe (clips) ou generationId (avatar).
// Idempotente: só julga o que ainda não tem evento NA VERSÃO VIGENTE. Teto por execução (maxJudge) e falha aberta: um juiz
// que cai não derruba os outros, e nada aqui escreve fora da tabela `events`.
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  COHERENCE_V2_EVENT,
  COHERENCE_V2_VERSION,
  evidenceFromBirth,
  scoreCoherenceV2,
  stripFixedPrefix,
  type CoherenceV2Scene,
  type IdeaSource,
  type ProdutoRegua,
} from '@/lib/regua95/coherenceV2'
import { PIXEL_SCORE_EVENT, PIXEL_SCORE_VERSION, extractFramesFal, judgeFrames, type PixelContext } from '@/lib/regua95/pixelScore'
import { contextoDoAnuncio, produtoDoVideo, resolverIdeia, type ScriptWrittenLido } from '@/lib/regua95/contexto'
import { UGC_SCORE_EVENT, UGC_SCORE_VERSION, extractUgcFramesFal, judgeUgcFrames, planUgcFrames, type UgcContext } from '@/lib/regua95/ugcJudge' // KINEO-META95-UGC-1910

/** KINEO-META95-REGUA-AJUSTE-1910 — janela padrão do coletor (7 dias) e a política de nova tentativa de quem falhou. */
export const REGUA95_JANELA_HORAS = 168
export const REGUA95_MAX_FALHAS = 3
export const REGUA95_ESPERA_FALHA_MS = 60 * 60_000

export type EntregaRegua = {
  key: string
  kind: 'video' | 'clip' | 'avatar'
  product: ProdutoRegua
  engine: string
  user_id: string
  delivered_at: string
  video_url: string
  seconds: number | null
  video_id: string | null
  generation_id: string | null
  render_id: string | null
  /** evidência do juiz de coerência (só filmes com nascimento cinematic) */
  coherence: { idea: string; ideaSource: IdeaSource; narration: string; scenes: CoherenceV2Scene[]; filmSeconds: number | null } | null
  pixel: PixelContext
  /** KINEO-META95-UGC-1910 — juiz de UGC/apresentador (olhos no gancho, sorriso de dentes, mão, duplicação, rótulo); só UGC */
  ugc: UgcContext | null
}

type EventRow = { created_at: string; session_id: string | null; user_id: string | null; metadata: Record<string, unknown> | null }
type VideoRow = { id: string; user_id: string; created_at: string; quality_mode: string | null; video_url: string | null; duration: number | null; render_id: string | null; topic: string | null }

const chunks = <T,>(xs: T[], n = 100): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n))
  return out
}
const str = (x: unknown) => (typeof x === 'string' ? x : '')

/** Monta as entregas da janela (mais recentes primeiro), com a evidência de cada juiz. Só leitura. */
export async function listarEntregasRegua(
  admin: SupabaseClient,
  opts: { hours?: number; limit?: number; route?: string },
  readAll: typeof ReadAllRows,
): Promise<EntregaRegua[]> {
  const route = opts.route ?? '/api/cron/regua-95'
  // KINEO-META95-REGUA-AJUSTE-1910 — janela padrão de 7 dias (era 6 h): o estoque da semana sem nota nunca entrava. Em lotes
  // pequenos (maxJudge por giro), do mais novo para o mais velho.
  const hours = Math.max(1, Math.min(24 * 14, opts.hours ?? REGUA95_JANELA_HORAS))
  const limit = Math.max(1, Math.min(400, opts.limit ?? 300))
  const since = new Date(Date.now() - hours * 3600_000).toISOString()
  const ev = (name: string) => admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', name)

  const [vidsR, clipsR, avatarR] = await Promise.all([
    admin.from('videos').select('id, user_id, created_at, quality_mode, video_url, duration, render_id, topic').eq('status', 'completed').gte('created_at', since).order('created_at', { ascending: false }).limit(limit),
    admin.from('clips').select('id, user_id, created_at, engine, seconds, prompt, video_url, status').eq('status', 'done').gte('created_at', since).order('created_at', { ascending: false }).limit(limit),
    readAll(() => ev('avatar_submission_claim').gte('created_at', since), { route, table: 'events' }),
  ])
  const videos = ((vidsR.data ?? []) as VideoRow[]).filter((v) => typeof v.video_url === 'string' && v.video_url)
  const out: EntregaRegua[] = []

  // ── filmes: compose claim (render_id) → nascimento (generation_id) → evidência inteira + ideia original ──
  const filmes = videos.filter((v) => produtoDoVideo(v.quality_mode) === 'filme')
  const renderIds = filmes.map((v) => v.render_id).filter((r): r is string => !!r)
  const claimByRender = new Map<string, EventRow>()
  for (const part of chunks(renderIds)) {
    const r = await readAll(() => ev('compose_submission_claim').in('metadata->>render_id', part), { route, table: 'events' })
    for (const c of (r.data ?? []) as EventRow[]) { const rid = str(c.metadata?.render_id); if (rid && !claimByRender.has(rid)) claimByRender.set(rid, c) }
  }
  const genIds = Array.from(new Set(Array.from(claimByRender.values()).map((c) => str(c.metadata?.generation_id)).filter(Boolean)))
  const birthByGen = new Map<string, EventRow>()
  for (const part of chunks(genIds)) {
    const r = await readAll(() => ev('cinematic_submission_claim').in('session_id', part), { route, table: 'events' })
    for (const b of (r.data ?? []) as EventRow[]) if (b.session_id && !birthByGen.has(b.session_id)) birthByGen.set(b.session_id, b)
  }
  const filmUsers = Array.from(new Set(filmes.map((v) => v.user_id)))
  const writtenByUser = new Map<string, ScriptWrittenLido[]>()
  const sinceIdea = new Date(Date.parse(since) - 3 * 3600_000).toISOString()
  for (const part of chunks(filmUsers)) {
    const r = await readAll(() => ev('script_written').in('user_id', part).gte('created_at', sinceIdea), { route, table: 'events' })
    for (const s of (r.data ?? []) as EventRow[]) {
      const idea = str(s.metadata?.original_idea)
      if (!s.user_id || !idea) continue
      const list = writtenByUser.get(s.user_id) ?? []
      list.push({ created_at: s.created_at, original_idea: idea, script_head: str(s.metadata?.script_head) })
      writtenByUser.set(s.user_id, list)
    }
  }
  for (const v of filmes) {
    const claim = v.render_id ? claimByRender.get(v.render_id) : undefined
    const gen = str(claim?.metadata?.generation_id) || null
    const birth = gen ? birthByGen.get(gen) : undefined
    const evd = evidenceFromBirth((birth?.metadata?.response ?? null) as Record<string, unknown> | null)
    const narration = (evd?.narration || str(claim?.metadata?.narration)).trim()
    let coherence: EntregaRegua['coherence'] = null
    let ideia = { idea: v.topic ?? '', source: 'roteiro' as IdeaSource }
    if (evd && narration) {
      ideia = resolverIdeia({ birthPrompt: evd.prompt || v.topic || '', verbatim: evd.verbatim, birthAt: birth!.created_at, scriptWritten: writtenByUser.get(v.user_id) ?? [] })
      coherence = { idea: ideia.idea, ideaSource: ideia.source, narration, scenes: evd.scenes, filmSeconds: Number(claim?.metadata?.duration) > 0 ? Number(claim?.metadata?.duration) : evd.duration }
    }
    out.push({
      key: v.id, kind: 'video', product: 'filme', engine: v.quality_mode ?? 'unknown', user_id: v.user_id, delivered_at: v.created_at,
      video_url: v.video_url as string, seconds: v.duration, video_id: v.id, generation_id: gen, render_id: v.render_id,
      coherence,
      ugc: null,
      pixel: { product: 'filme', engine: v.quality_mode, asked: ideia.idea || v.topic || '', narration: narration || null, spokenByScene: evd?.scenes.map((s) => s.spoken) ?? null, language: str(claim?.metadata?.language) || null },
    })
  }

  // ── Ads v2 / UGC: o pedido (brief, roteiro escolhido, foto real) pelo video_id ──
  const adsVids = videos.filter((v) => v.quality_mode === 'ads_v2')
  const orderByVideo = new Map<string, Record<string, unknown>>()
  for (const part of chunks(adsVids.map((v) => v.id))) {
    const r = await admin.from('ads_v2_orders').select('id, video_id, brief, plan, photos, language, voice_seconds').in('video_id', part).limit(part.length * 2)
    for (const o of (r.data ?? []) as Array<Record<string, unknown>>) if (str(o.video_id)) orderByVideo.set(str(o.video_id), o)
  }
  for (const v of adsVids) {
    const order = orderByVideo.get(v.id)
    const plan = (order?.plan ?? {}) as Record<string, unknown>
    const produto = produtoDoVideo('ads_v2', !!plan.presenter && typeof plan.presenter === 'object')
    const ctx = order ? contextoDoAnuncio(order, produto) : { product: produto, engine: 'ads_v2', asked: v.topic ?? '' }
    // KINEO-META95-UGC-1910 — UGC = Ads com apresentador: a fala vai de 0 até voice_seconds (o corte da montagem); o pedido não
    // guarda os tempos dos silêncios da voz, então a checagem de boca na pausa fica de fora (pause_check 'sem_tempos').
    const voz = Number(order?.voice_seconds)
    const ugc: UgcContext | null = produto === 'ugc' ? { asked: ctx.asked, narration: ctx.narration ?? null, productPhotoUrls: ctx.productPhotoUrls ?? null, speechSeconds: Number.isFinite(voz) && voz > 0 ? voz : null, pausesSeconds: null, engine: 'ads_v2', language: ctx.language ?? null } : null
    out.push({ key: v.id, kind: 'video', product: produto, engine: 'ads_v2', user_id: v.user_id, delivered_at: v.created_at, video_url: v.video_url as string, seconds: v.duration, video_id: v.id, generation_id: order ? str(order.id) : null, render_id: v.render_id, coherence: null, pixel: ctx, ugc })
  }

  // ── Clipes: "Just this clip" (videos) e o produto Clipes/efeitos (tabela clips) ──
  for (const v of videos.filter((x) => x.quality_mode === 'clip')) {
    out.push({ key: v.id, kind: 'video', product: 'clipe', engine: 'clip', user_id: v.user_id, delivered_at: v.created_at, video_url: v.video_url as string, seconds: v.duration, video_id: v.id, generation_id: null, render_id: v.render_id, coherence: null, ugc: null, pixel: { product: 'clipe', engine: 'clip', asked: v.topic ?? '' } })
  }
  for (const c of (clipsR.data ?? []) as Array<Record<string, unknown>>) {
    if (!str(c.video_url) || !str(c.id) || !str(c.user_id)) continue
    out.push({ key: str(c.id), kind: 'clip', product: 'clipe', engine: str(c.engine) || 'clip', user_id: str(c.user_id), delivered_at: str(c.created_at), video_url: str(c.video_url), seconds: typeof c.seconds === 'number' ? c.seconds : null, video_id: null, generation_id: str(c.id), render_id: null, coherence: null, ugc: null, pixel: { product: 'clipe', engine: str(c.engine) || 'clip', asked: str(c.prompt) } })
  }

  // ── Avatar: o claim 'done' com o MP4 final ──
  for (const a of (avatarR.data ?? []) as EventRow[]) {
    const resp = (a.metadata?.response ?? {}) as Record<string, unknown>
    const url = str(resp.completed_video_url)
    const gen = a.session_id ?? str(resp.generationId)
    if (!url || !gen || !a.user_id || str(a.metadata?.status) !== 'done') continue
    const script = str(resp.voiceover_script)
    out.push({ key: gen, kind: 'avatar', product: 'ugc', engine: 'avatar', user_id: a.user_id, delivered_at: a.created_at, video_url: url, seconds: Number(resp.duration) > 0 ? Number(resp.duration) : null, video_id: null, generation_id: gen, render_id: null, coherence: null, pixel: { product: 'ugc', engine: 'avatar', asked: script, narration: script || null }, ugc: { asked: script, narration: script || null, speechSeconds: null, pausesSeconds: null, engine: 'avatar' } /* KINEO-META95-UGC-1910 — avatar: a pessoa fala o vídeo inteiro */ })
  }
  return out.sort((a, b) => (a.delivered_at < b.delivered_at ? 1 : -1))
}

/**
 * O que NÃO julgar agora: Set de `${evento}:${chave}`.
 * KINEO-META95-REGUA-AJUSTE-1910 — a FALHA também vira evento (mesmo nome, score null, campo `falha`). Sem isso, uma entrega cujo MP4
 * a fal não fatia voltava ao topo da fila a cada giro e travava o lote inteiro (sempre as mesmas 4, nenhuma outra julgada).
 * Regra: nota de verdade = feito; falha = espera REGUA95_ESPERA_FALHA_MS e tenta de novo, até REGUA95_MAX_FALHAS; depois, desiste.
 */
export async function notasExistentes(admin: SupabaseClient, keys: string[], readAll: typeof ReadAllRows, route = '/api/cron/regua-95', agora: number = Date.now()): Promise<Set<string>> {
  const done = new Set<string>()
  const falhas = new Map<string, { n: number; ultima: number }>()
  for (const part of chunks(Array.from(new Set(keys)))) {
    const r = await readAll(() => admin.from('events').select('created_at, session_id, user_id, metadata').in('name', [COHERENCE_V2_EVENT, PIXEL_SCORE_EVENT, UGC_SCORE_EVENT /* KINEO-META95-UGC-1910 */]).in('session_id', part), { route, table: 'events' })
    for (const e of (r.data ?? []) as EventRow[]) {
      const v = str(e.metadata?.version)
      if (!e.session_id) continue
      const nome = v === COHERENCE_V2_VERSION ? COHERENCE_V2_EVENT : v === PIXEL_SCORE_VERSION ? PIXEL_SCORE_EVENT : v === UGC_SCORE_VERSION ? UGC_SCORE_EVENT /* KINEO-META95-UGC-1910 */ : null
      if (!nome) continue
      const marca = `${nome}:${e.session_id}`
      // A completed validation attempt is recorded, not automatically bought again. Historical scores stay untouched.
      if (typeof e.metadata?.score === 'number') { done.add(marca); continue }
      if (e.metadata?.evidence_validation === '2026-10-26') { done.add(marca); continue }
      const f = falhas.get(marca) ?? { n: 0, ultima: 0 }
      f.n += 1
      f.ultima = Math.max(f.ultima, Date.parse(e.created_at) || 0)
      falhas.set(marca, f)
    }
  }
  for (const [marca, f] of Array.from(falhas.entries())) if (f.n >= REGUA95_MAX_FALHAS || agora - f.ultima < REGUA95_ESPERA_FALHA_MS) done.add(marca)
  return done
}

export type ResultadoRegua = { key: string; product: ProdutoRegua; engine: string; coerencia: number | null; pixel: number | null; ugc?: number | null; usd: number; erro?: string; frame_via?: string | null }

/**
 * KINEO-META95-REGUA-AJUSTE-1910 — UMA linha de log por giro, com as contagens, mesmo quando não há nada a julgar. Antes a rota
 * só escrevia no log quando quebrava: a Vercel só guarda o que a função imprime, e um giro silencioso era indistinguível de um
 * giro que nunca aconteceu (o 1º diagnóstico pós-deploy, 19/10 23h, não conseguiu dizer se o cron rodava).
 */
export function resumoRegua95(r: { candidatas: number; pendentes: number; julgadas: ResultadoRegua[]; porProduto?: Record<string, { candidatas: number; pendentes: number }> } | null | 'tempo', ms: number): string {
  if (r === 'tempo') return JSON.stringify({ regua95: 'tempo_esgotado', ms })
  if (!r) return JSON.stringify({ regua95: 'falhou', ms })
  return JSON.stringify({
    candidatas: r.candidatas,
    pendentes: r.pendentes,
    por_produto: r.porProduto ?? {},
    julgadas: r.julgadas.map((j) => ({ k: j.key.slice(0, 8), p: j.product, c: j.coerencia, px: j.pixel, ...(j.ugc != null ? { ugc: j.ugc } : {}) /* KINEO-META95-UGC-1910 */, via: j.frame_via ?? null, usd: Math.round(j.usd * 1e4) / 1e4, ...(j.erro ? { erro: j.erro } : {}) })),
    ms,
  })
}

/** Julga as pendentes (até maxJudge entregas), grava um evento por nota. Nunca lança. */
export async function julgarPendentesRegua(
  admin: SupabaseClient,
  opts: { hours?: number; limit?: number; maxJudge?: number; route?: string; fetchImpl?: typeof fetch },
  readAll: typeof ReadAllRows,
): Promise<{ candidatas: number; pendentes: number; julgadas: ResultadoRegua[]; porProduto: Record<string, { candidatas: number; pendentes: number }> }> {
  const route = opts.route ?? '/api/cron/regua-95'
  const entregas = await listarEntregasRegua(admin, { hours: opts.hours, limit: opts.limit, route }, readAll)
  const done = await notasExistentes(admin, entregas.map((e) => e.key), readAll, route)
  const pendentes = entregas.filter((e) => !done.has(`${PIXEL_SCORE_EVENT}:${e.key}`) || (e.coherence && !done.has(`${COHERENCE_V2_EVENT}:${e.key}`)) || (e.ugc && !done.has(`${UGC_SCORE_EVENT}:${e.key}`)) /* KINEO-META95-UGC-1910 */)
  const maxJudge = Math.max(0, Math.min(12, opts.maxJudge ?? 4))
  const lote = pendentes.slice(0, maxJudge)
  const deploySha = process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'
  const julgadas: ResultadoRegua[] = []
  // 2 por vez: cada pixel leva ~10-30 s (fal + visão); 4 entregas cabem com folga em maxDuration 300.
  for (let i = 0; i < lote.length; i += 2) {
    await Promise.all(lote.slice(i, i + 2).map(async (e) => {
      const base = { product: e.product, engine: e.engine, video_id: e.video_id, generation_id: e.generation_id, render_id: e.render_id, delivered_at: e.delivered_at, deploy_sha: deploySha, kind: e.kind }
      const r: ResultadoRegua = { key: e.key, product: e.product, engine: e.engine, coerencia: null, pixel: null, usd: 0 }
      // KINEO-META95-REGUA-AJUSTE-1910 — UM ponto de escrita, que confere o erro do insert (antes ignorado: um insert recusado sumia
      // sem rastro) e o devolve no resumo que a rota loga.
      const gravar = async (name: string, metadata: Record<string, unknown>) => {
        const { error } = await admin.from('events').insert({ name, user_id: e.user_id, session_id: e.key, path: route, metadata })
        if (error) r.erro = [r.erro, `insert_${name}: ${String(error.message).slice(0, 120)}`].filter(Boolean).join(' · ')
      }
      try {
        if (e.coherence && !done.has(`${COHERENCE_V2_EVENT}:${e.key}`)) {
          const c = await scoreCoherenceV2({ idea: e.coherence.idea, ideaSource: e.coherence.ideaSource, narration: e.coherence.narration, scenes: e.coherence.scenes, engine: e.engine, filmSeconds: e.coherence.filmSeconds }, { fetchImpl: opts.fetchImpl })
          if (c) {
            r.coerencia = c.score
            r.usd += c.usd
            // item 1 da meta 95: a evidência INTEIRA vai junto (ideia original, fala e prompt de cada cena, sem o corte de 240).
            await gravar(COHERENCE_V2_EVENT, { ...c, ...base, evidence: { idea: e.coherence.idea.slice(0, 4000), idea_source: e.coherence.ideaSource, narration: e.coherence.narration.slice(0, 3000), scenes: e.coherence.scenes.map((s) => ({ scene: s.scene, spoken: s.spoken.slice(0, 800), prompt: s.prompt.slice(0, 3000), prompt_sem_prefixo_chars: stripFixedPrefix(s.prompt).length })) } })
          } else {
            r.erro = 'coerencia_sem_resposta'
            await gravar(COHERENCE_V2_EVENT, { version: COHERENCE_V2_VERSION, score: null, falha: 'coerencia_sem_resposta', ...base })
          }
        }
        if (!done.has(`${PIXEL_SCORE_EVENT}:${e.key}`)) {
          // KINEO-META95-REGUA-AJUSTE-1910 — quadros e visão separados: o resumo e o evento de falha dizem QUAL dos dois falhou.
          const inicio = Date.now()
          const ex = await extractFramesFal(e.video_url, e.seconds, { fetchImpl: opts.fetchImpl })
          r.frame_via = ex?.via ?? null
          const p = ex ? await judgeFrames(e.pixel, ex.frames, { fetchImpl: opts.fetchImpl, via: ex.via, usdFrames: ex.usd, startedAt: inicio }) : null
          if (p) {
            r.pixel = p.score
            r.usd += p.usd
            await gravar(PIXEL_SCORE_EVENT, { ...p, ...base, video_url: e.video_url, asked: String(e.pixel.asked ?? '').slice(0, 600) })
          } else {
            const falha = ex ? 'visao_sem_resposta' : 'quadros_indisponiveis'
            r.erro = [r.erro, falha].filter(Boolean).join(' · ')
            await gravar(PIXEL_SCORE_EVENT, { version: PIXEL_SCORE_VERSION, score: null, falha, frame_via: ex?.via ?? null, frame_count: ex?.frames.length ?? 0, ...base, video_url: e.video_url })
          }
        }
        // KINEO-META95-UGC-1910 — juiz de UGC/apresentador (só registra): olhos no gancho, sorriso de dentes, mão, duplicação,
        // rótulo × foto do pedido. O painel combina: nota UGC = a menor entre o pixel e este juiz. Mesmo fluxo do pixel
        // (KINEO-META95-REGUA-AJUSTE-1910): quadros e visão separados, gravação pelo ponto único (confere o erro do banco) e a
        // FALHA vira evento ugc_score com score null — espera e retentativa por notasExistentes, sem travar o lote.
        if (e.ugc && !done.has(`${UGC_SCORE_EVENT}:${e.key}`)) {
          const inicioUgc = Date.now()
          const plano = planUgcFrames({ seconds: e.seconds, speechSeconds: e.ugc.speechSeconds, pausesSeconds: e.ugc.pausesSeconds })
          const exU = await extractUgcFramesFal(e.video_url, plano, { fetchImpl: opts.fetchImpl })
          const u = exU ? await judgeUgcFrames(e.ugc, exU.frames, { fetchImpl: opts.fetchImpl, via: exU.via, usdFrames: exU.usd, startedAt: inicioUgc, expectedFrames: plano.length }) : null
          if (u) {
            r.ugc = u.score
            r.usd += u.usd
            await gravar(UGC_SCORE_EVENT, { ...u, ...base, video_url: e.video_url, asked: String(e.ugc.asked ?? '').slice(0, 600) })
          } else {
            const falha = exU ? 'ugc_visao_sem_resposta' : 'ugc_quadros_indisponiveis'
            r.erro = [r.erro, falha].filter(Boolean).join(' · ')
            await gravar(UGC_SCORE_EVENT, { version: UGC_SCORE_VERSION, score: null, falha, frame_via: exU?.via ?? null, frame_count: exU?.frames.length ?? 0, ...base, video_url: e.video_url })
          }
        }
      } catch (err) {
        r.erro = err instanceof Error ? err.message.slice(0, 160) : 'erro'
      }
      julgadas.push(r)
    }))
  }
  // KINEO-META95-REGUA-AJUSTE-1910 — contagens por produto para a linha de log de cada giro (candidatas na janela × pendentes).
  const porProduto: Record<string, { candidatas: number; pendentes: number }> = {}
  for (const e of entregas) { const k = porProduto[e.product] ?? { candidatas: 0, pendentes: 0 }; k.candidatas++; porProduto[e.product] = k }
  for (const e of pendentes) porProduto[e.product].pendentes++
  return { candidatas: entregas.length, pendentes: pendentes.length, julgadas, porProduto }
}
