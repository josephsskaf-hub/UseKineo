// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — o servidor da refação grátis de
// UMA cena de um filme pronto (ver o cabeçalho de lib/freeRedo/core.ts). A rota /api/free-redo/film só liga as peças
// reais (banco, fal, Creatomate, cópia para o bucket, eventos); toda a regra mora aqui, com as dependências injetadas,
// para o guardião scripts/test-meta95-refazer-1910.mjs executar o fluxo inteiro com fornecedores falsos.
//
// ESTADO (na linha-trava FILM_ORDER_EVENT, id = filmOrderId(videoId)):
//   pending → scene (job da fal aceito) → composing (cena pronta, montagem sendo enviada) → rendering (Creatomate) → done
//   qualquer etapa → failed. Cada transição é um UPDATE condicional (status + owner lidos): só uma instância avança.
//   failed com tentativa sobrando (FREE_REDO_MAX_TENTATIVAS, contadas só quando um job da fal PODE existir) volta a pending.
//
// CUSTO: uma cena na fal + uma montagem no Creatomate. Crédito: zero, sempre — nada aqui chama débito, intenção de
// cobrança (render_jobs) ou claim do /api/compose.
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FILM_ORDER_EVENT,
  FILM_SOURCE_EVENT,
  FREE_REDO_EVENTS,
  FREE_REDO_FILM_PATH,
  FREE_REDO_STUCK_MS,
  MARCA_REFAZER_1910,
  cenasDoFilme,
  custoEstimadoUsd,
  decidirPedido,
  estadoPublico,
  etapaParada,
  filmOrderId,
  filmSourceMetadata, // KINEO-REFAZER-GRATIS-2810
  mediaUrlsOf,
  tentativasGastas,
  tituloDaVersaoNova,
  trocarClipe,
  uuidFrom, // KINEO-REFAZER-GRATIS-2810
  variarEntrada,
  verifyFilmChain, // KINEO-REFAZER-GRATIS-2810
  verifyFilmSource,
  type CenaRefazivel,
  type ClaimParaRefazer,
  type FilmChain, // KINEO-REFAZER-GRATIS-2810
  type FreeRedoStatus,
} from '@/lib/freeRedo/core'
import { reservarVagaDoDia } from '@/lib/freeRedo/cap'
import { SCENE_REDO_FUNNEL_EVENTS, FREE_REDO_FIRST_FILM_TOTAL, saldoGratis, versaoNovaGanhaRefacao } from '@/lib/cinematic/refazerGratis2810' // KINEO-REFAZER-GRATIS-2810 — 2 refações grátis no PRIMEIRO filme (o elo assinado da versão nova), saldo na resposta, scene_redo_free_used
import { espelhoSceneRedo } from '@/lib/cinematic/refazerCena' // KINEO-REFAZER-CENA-2710 [TRAVA 8.2 — vai do fundador 27/10 "refazer essa cena liberado"] — scene_redo_* espelham os free_redo_* (controle de qualidade diário)

type Meta = Record<string, unknown>

export interface FreeRedoFilmDeps {
  db: SupabaseClient
  secret: string
  now: () => number
  random: () => number
  newOwner: () => string
  loadClaim: (a: { userId: string; generationId: string }) => Promise<{ ok: true; claim: ClaimParaRefazer | null } | { ok: false; error: string }>
  /** POST único na fila da fal. Lança { ambiguous: boolean } quando falha. */
  submitScene: (model: string, input: Record<string, unknown>) => Promise<string>
  pollScene: (model: string, requestId: string) => Promise<{ status: 'pending' | 'done' | 'failed'; url: string | null; error?: string | null }>
  submitRender: (source: Record<string, unknown>) => Promise<string>
  pollRender: (renderId: string) => Promise<{ status: string; url: string | null; snapshotUrl: string | null; error: string | null; durationSeconds?: number | null }>
  persist: (a: { userId: string; renderId: string; videoUrl: string; snapshotUrl: string | null }) => Promise<{ videoUrl: string; thumbnailUrl: string | null; measuredSeconds: number | null }>
  deadUrls: (urls: string[]) => Promise<string[]>
  event: (e: { name: string; userId: string; path: string; sessionId: string | null; metadata: Record<string, unknown> }) => Promise<boolean>
}

export interface FreeRedoResposta {
  status: number
  body: Record<string, unknown>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type VideoRow = {
  id: string
  user_id: string
  status: string | null
  render_id: string | null
  title: string | null
  topic: string | null
  quality_mode: string | null
  duration: number | null
  platform: string | null
  youtube_description: string | null
  video_url: string | null
}

function r(status: number, body: Record<string, unknown>): FreeRedoResposta {
  return { status, body: { marca: MARCA_REFAZER_1910, credits: 0, ...body } }
}

async function lerVideo(d: FreeRedoFilmDeps, userId: string, videoId: string): Promise<VideoRow | null | 'erro'> {
  const { data, error } = await d.db
    .from('videos')
    .select('id, user_id, status, render_id, title, topic, quality_mode, duration, platform, youtube_description, video_url')
    .eq('id', videoId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return 'erro'
  const v = (data ?? null) as VideoRow | null
  // Só o dono: a consulta já filtra pelo dono, e a linha é conferida de novo (nunca confiar num filtro só).
  return v && v.user_id === userId && v.id === videoId ? v : null
}

async function lerPedido(d: FreeRedoFilmDeps, userId: string, videoId: string): Promise<{ meta: Meta | null } | 'erro'> {
  const { data, error } = await d.db
    .from('events')
    .select('id, metadata, created_at')
    .eq('id', filmOrderId(videoId))
    .eq('user_id', userId)
    .eq('name', FILM_ORDER_EVENT)
    .maybeSingle()
  if (error) return 'erro'
  const meta = data && data.metadata && typeof data.metadata === 'object' ? (data.metadata as Meta) : null
  return { meta: data ? (meta ?? {}) : null }
}

/** UPDATE condicional: só avança se a linha ainda estiver no status (e com o dono) que foi lido. */
async function mover(d: FreeRedoFilmDeps, userId: string, videoId: string, de: Meta, para: Meta): Promise<boolean> {
  try {
    const { data, error } = await d.db
      .from('events')
      .update({ metadata: { ...de, ...para, updated_at: new Date(d.now()).toISOString() } })
      .eq('id', filmOrderId(videoId))
      .eq('user_id', userId)
      .eq('name', FILM_ORDER_EVENT)
      .eq('metadata->>status', String(de.status ?? ''))
      .eq('metadata->>owner', String(de.owner ?? ''))
      .select('id')
      .maybeSingle()
    return !error && data?.id === filmOrderId(videoId)
  } catch {
    return false
  }
}

async function lerFonte(d: FreeRedoFilmDeps, userId: string, renderId: string) {
  const { data, error } = await d.db
    .from('events')
    .select('metadata, created_at')
    .eq('name', FILM_SOURCE_EVENT)
    .eq('user_id', userId)
    .eq('metadata->>render_id', renderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return 'erro' as const
  const v = verifyFilmSource(d.secret, userId, renderId, data?.metadata ?? null)
  if (!v.ok) return v // KINEO-REFAZER-GRATIS-2810
  const elo = verifyFilmChain(d.secret, userId, renderId, data?.metadata ?? null) // KINEO-REFAZER-GRATIS-2810 — elo presente e inválido = sem fonte
  if (!elo.ok) return { ok: false as const, motivo: 'elo_invalido' } // KINEO-REFAZER-GRATIS-2810
  return { ...v, chain: elo.chain } // KINEO-REFAZER-GRATIS-2810
}

// KINEO-REFAZER-GRATIS-2810 — o PRIMEIRO filme da conta: o vídeo concluído mais antigo dela é este. Leitura que falha =
// "não é o primeiro" (fecha para o lado do custo: a regra de 1 refação de 19/10 continua valendo).
async function primeiroFilme(d: FreeRedoFilmDeps, userId: string, videoId: string): Promise<boolean> {
  try {
    const { data, error } = await d.db
      .from('videos')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    return !error && !!data && (data as { id?: unknown }).id === videoId
  } catch {
    return false
  }
}

// KINEO-REFAZER-GRATIS-2810 — a linha-trava da refação de OUTRA versão já foi entregue? (para o saldo do filme raiz)
async function pedidoEntregue(d: FreeRedoFilmDeps, userId: string, videoId: unknown): Promise<boolean> {
  if (typeof videoId !== 'string' || !UUID.test(videoId)) return false
  try {
    const lido = await lerPedido(d, userId, videoId)
    return lido !== 'erro' && String(lido.meta?.status ?? '') === 'done'
  } catch {
    return false
  }
}

// KINEO-REFAZER-GRATIS-2810 — o saldo de refações grátis desta versão (o servidor calcula; a tela só mostra).
async function saldoDaVersao(d: FreeRedoFilmDeps, userId: string, videoId: string, meta: Meta | null, chain: FilmChain | null) {
  const usadaAqui = String(meta?.status ?? '') === 'done'
  if (chain) return saldoGratis({ primeiroFilme: true, seq: chain.seq, usadaAqui })
  const primeiro = await primeiroFilme(d, userId, videoId)
  const usadaNaSeguinte = primeiro && usadaAqui ? await pedidoEntregue(d, userId, meta?.new_video_id) : false
  return saldoGratis({ primeiroFilme: primeiro, seq: 1, usadaAqui, usadaNaSeguinte })
}

type Contexto = { video: VideoRow; source: Record<string, unknown>; generationId: string; quality: string; cenas: CenaRefazivel[]; chain: FilmChain | null } // KINEO-REFAZER-GRATIS-2810 — chain

/** Dono → filme pronto → render → RenderScript assinado → claim assinado → cenas refazíveis. */
async function contexto(d: FreeRedoFilmDeps, userId: string, videoId: string): Promise<{ ok: true; ctx: Contexto } | { ok: false; resp: FreeRedoResposta }> {
  if (!UUID.test(videoId)) return { ok: false, resp: r(400, { ok: false, motivo: 'video_id_invalido' }) }
  const video = await lerVideo(d, userId, videoId)
  if (video === 'erro') return { ok: false, resp: r(503, { ok: false, motivo: 'banco_indisponivel' }) }
  if (!video) return { ok: false, resp: r(404, { ok: false, motivo: 'video_nao_encontrado' }) }
  if (video.status !== 'completed') return { ok: false, resp: r(409, { ok: false, motivo: 'video_nao_concluido', estado: 'unavailable' }) }
  if (!video.render_id) return { ok: false, resp: r(409, { ok: false, motivo: 'video_sem_render', estado: 'unavailable' }) }
  const fonte = await lerFonte(d, userId, video.render_id)
  if (fonte === 'erro') return { ok: false, resp: r(503, { ok: false, motivo: 'banco_indisponivel' }) }
  if (!fonte.ok) return { ok: false, resp: r(409, { ok: false, motivo: 'sem_fonte', detalhe: fonte.motivo, estado: 'unavailable' }) }
  const chain = fonte.chain ?? null // KINEO-REFAZER-GRATIS-2810
  if (chain && (chain.seq > FREE_REDO_FIRST_FILM_TOTAL || chain.parentVideoId === videoId)) return { ok: false, resp: r(409, { ok: false, motivo: 'teto_da_cadeia', estado: 'unavailable' }) } // KINEO-REFAZER-GRATIS-2810 — a 3ª refação grátis não existe
  const claim = await d.loadClaim({ userId, generationId: fonte.generationId })
  if (!claim.ok) return { ok: false, resp: r(503, { ok: false, motivo: 'claim_indisponivel' }) }
  const cenas = cenasDoFilme(claim.claim, userId, fonte.source, chain ? { [chain.sceneIndex]: chain.clipUrl } : null) // KINEO-REFAZER-GRATIS-2810 — a cena já refeita pode ser refeita de novo
  if (cenas.length === 0) return { ok: false, resp: r(409, { ok: false, motivo: 'sem_cena_refazivel', estado: 'unavailable' }) }
  return { ok: true, ctx: { video, source: fonte.source, generationId: fonte.generationId, quality: fonte.quality, cenas, chain } } // KINEO-REFAZER-GRATIS-2810 — chain
}

function cenasPublicas(cenas: CenaRefazivel[]) {
  return cenas.map((c) => ({ index: c.index, number: c.index + 1, text: c.text, clip_url: c.clipUrl, seconds: c.seconds }))
}

function corpoDoPedido(meta: Meta | null, temFonte: boolean): Record<string, unknown> {
  const estado = estadoPublico(meta, temFonte)
  return {
    ok: true,
    estado,
    status: meta ? String(meta.status ?? '') : null,
    scene_index: meta && typeof meta.scene_index === 'number' ? meta.scene_index : null,
    new_video_id: meta?.new_video_id ?? null,
    new_video_url: meta?.new_video_url ?? null,
    previous_video_url: meta?.previous_video_url ?? null,
    retry: estado === 'failed_retry',
    error: meta && meta.status === 'failed' ? meta.error ?? null : null,
  }
}

async function evento(d: FreeRedoFilmDeps, userId: string, videoId: string, name: string, metadata: Record<string, unknown>): Promise<void> {
  try {
    await d.event({ name, userId, path: FREE_REDO_FILM_PATH, sessionId: videoId, metadata: { marca: MARCA_REFAZER_1910, product: 'film', video_id: videoId, ...metadata } })
  } catch { /* evento nunca derruba a refação */ }
  try { // KINEO-REFAZER-CENA-2710 — o espelho scene_redo_{requested,delivered,failed} (video_id, scene_index, ms, reason) no MESMO ponto, só pelo servidor
    const espelho = espelhoSceneRedo({ name, videoId, metadata, nowMs: d.now() }) // KINEO-REFAZER-CENA-2710
    if (espelho) await d.event({ name: espelho.name, userId, path: FREE_REDO_FILM_PATH, sessionId: videoId, metadata: espelho.metadata }) // KINEO-REFAZER-CENA-2710
  } catch { /* idem: o espelho nunca derruba a refação */ } // KINEO-REFAZER-CENA-2710
}

/**
 * POST — começa a refação grátis da cena `sceneIndex` do filme `videoId`. Idempotente: o duplo clique (ou a corrida
 * entre instâncias) cai na MESMA linha-trava e recebe o estado dela, sem segundo envio à fal.
 */
export async function iniciarRefacaoFilme(d: FreeRedoFilmDeps, a: { userId: string; videoId: unknown; sceneIndex: unknown }): Promise<FreeRedoResposta> {
  const videoId = typeof a.videoId === 'string' ? a.videoId.trim() : ''
  if (!Number.isInteger(a.sceneIndex) || (a.sceneIndex as number) < 0) return r(400, { ok: false, motivo: 'cena_invalida' })
  const sceneIndex = a.sceneIndex as number
  const c = await contexto(d, a.userId, videoId)
  if (!c.ok) return c.resp
  const { video, source, quality, cenas, chain } = c.ctx // KINEO-REFAZER-GRATIS-2810 — chain
  const cena = cenas.find((x) => x.index === sceneIndex)
  if (!cena) return r(400, { ok: false, motivo: 'cena_invalida', scenes: cenasPublicas(cenas) })

  const lido = await lerPedido(d, a.userId, videoId)
  if (lido === 'erro') return r(503, { ok: false, motivo: 'banco_indisponivel' })
  const decisao = decidirPedido(lido.meta)
  if (decisao === 'andamento') return r(202, corpoDoPedido(lido.meta, true))
  if (decisao === 'usada') return r(409, { ...corpoDoPedido(lido.meta, true), ok: false, motivo: 'ja_usada' })

  // Antes de gastar qualquer coisa: o resto do filme ainda existe no fornecedor? (clipe expirado = a remontagem falharia)
  const mortas = await d.deadUrls(mediaUrlsOf(source).filter((u) => u !== cena.clipUrl))
  if (mortas.length > 0) return r(409, { ok: false, motivo: 'arquivo_expirou', estado: 'unavailable' })

  const primeiro = chain ? true : await primeiroFilme(d, a.userId, videoId) // KINEO-REFAZER-GRATIS-2810 — gravado na linha-trava: a entrega decide por ele se a versão nova ganha a refação nº 2
  const owner = d.newOwner()
  const agora = new Date(d.now()).toISOString()
  const base: Meta = {
    marca: MARCA_REFAZER_1910,
    product: 'film',
    original_video_id: video.id,
    original_render_id: video.render_id,
    previous_video_url: video.video_url,
    quality,
    scene_index: sceneIndex,
    model: cena.model,
    seconds: cena.seconds,
    old_clip_url: cena.clipUrl,
    estimated_usd: custoEstimadoUsd(cena.model, cena.seconds),
    owner,
    status: 'pending' as FreeRedoStatus,
    free_seq: chain ? chain.seq : 1, // KINEO-REFAZER-GRATIS-2810
    root_video_id: chain ? chain.rootVideoId : video.id, // KINEO-REFAZER-GRATIS-2810
    first_film: primeiro, // KINEO-REFAZER-GRATIS-2810
    requested_at: agora, // KINEO-REFAZER-CENA-2710 — a hora deste pedido (o `ms` do scene_redo_delivered mede a partir daqui; na retomada é a hora nova)
    gastas: tentativasGastas(lido.meta),
    error: null,
    fal_request_id: null,
    render_id: null,
  }
  let meu: Meta
  if (decisao === 'criar') {
    const { error } = await d.db.from('events').insert({
      id: filmOrderId(videoId), user_id: a.userId, name: FILM_ORDER_EVENT, path: FREE_REDO_FILM_PATH, session_id: videoId,
      metadata: { ...base, created_at: agora, updated_at: agora },
    })
    if (error) {
      if ((error as { code?: string }).code !== '23505') return r(503, { ok: false, motivo: 'banco_indisponivel' })
      const outro = await lerPedido(d, a.userId, videoId) // o outro clique ganhou: devolve o estado dele
      return r(202, corpoDoPedido(outro === 'erro' ? null : outro.meta, true))
    }
    meu = { ...base, created_at: agora, updated_at: agora }
  } else {
    const de = lido.meta as Meta
    if (!await mover(d, a.userId, videoId, de, base)) {
      const outro = await lerPedido(d, a.userId, videoId)
      return r(202, corpoDoPedido(outro === 'erro' ? null : outro.meta, true))
    }
    meu = { ...de, ...base }
  }

  // O teto GLOBAL do dia (custo). Sem vaga: o pedido falha SEM gastar a vez (gastas não sobe) — amanhã dá de novo.
  const vaga = await reservarVagaDoDia(d.db, { userId: a.userId, product: 'film', ref: videoId, path: FREE_REDO_FILM_PATH, nowMs: d.now() })
  if (!vaga.ok) {
    await mover(d, a.userId, videoId, meu, { status: 'failed', error: vaga.motivo === 'teto' ? 'daily_cap' : 'cap_unavailable' })
    await evento(d, a.userId, videoId, FREE_REDO_EVENTS.failed, { engine: cena.model, quality, scene_index: sceneIndex, estimated_usd: 0, stage: 'gate', reason: vaga.motivo === 'teto' ? 'daily_cap' : 'cap_unavailable' })
    return r(vaga.motivo === 'teto' ? 429 : 503, { ok: false, motivo: vaga.motivo === 'teto' ? 'teto_do_dia' : 'teto_indisponivel', estado: 'failed_retry', retry: true })
  }

  await evento(d, a.userId, videoId, FREE_REDO_EVENTS.requested, { engine: cena.model, quality, scene_index: sceneIndex, estimated_usd: base.estimated_usd, seconds: cena.seconds, attempt: tentativasGastas(meu) + 1, cap_slot: vaga.k })

  const input = variarEntrada(cena.input, Math.floor(d.random() * 2_147_483_646) + 1)
  let requestId: string
  try {
    requestId = await d.submitScene(cena.model, input)
  } catch (err) {
    const ambiguo = !(err && typeof err === 'object' && (err as { ambiguous?: unknown }).ambiguous === false)
    const msg = err instanceof Error ? err.message.slice(0, 300) : 'submit_failed'
    // Ambíguo: o job PODE existir (e custar) — gasta uma tentativa. Recusa explícita: nada foi enfileirado, não gasta.
    await mover(d, a.userId, videoId, meu, { status: 'failed', error: ambiguo ? 'scene_submit_ambiguous' : 'scene_submit_refused', detail: msg, gastas: tentativasGastas(meu) + (ambiguo ? 1 : 0) })
    await evento(d, a.userId, videoId, FREE_REDO_EVENTS.failed, { engine: cena.model, quality, scene_index: sceneIndex, estimated_usd: ambiguo ? base.estimated_usd : 0, stage: 'scene_submit', reason: msg, ambiguous: ambiguo })
    return r(502, { ok: false, motivo: 'cena_nao_enviada', estado: 'failed_retry', retry: true })
  }
  const moveu = await mover(d, a.userId, videoId, meu, { status: 'scene', fal_request_id: requestId, gastas: tentativasGastas(meu) + 1 })
  return r(202, { ...corpoDoPedido({ ...meu, status: 'scene' }, true), moved: moveu })
}

/**
 * GET — o estado da refação deste filme, e o passo seguinte quando é a vez dele (a tela consulta a cada poucos
 * segundos): cena pronta → monta; montagem pronta → copia para o bucket e cria a versão nova. `lite` = só o estado
 * (para os cartões da biblioteca), sem ler o claim.
 */
export async function acompanharRefacaoFilme(d: FreeRedoFilmDeps, a: { userId: string; videoId: unknown; lite?: boolean }): Promise<FreeRedoResposta> { // KINEO-REFAZER-GRATIS-2810 — a resposta ganha o saldo de refações grátis (first_film, free_left…)
  const resp = await acompanharSemSaldo(d, a) // KINEO-REFAZER-GRATIS-2810
  if (!resp.body || resp.body.ok !== true || typeof a.videoId !== 'string' || resp.body.estado === 'working' || resp.body.estado === 'unavailable') return resp // KINEO-REFAZER-GRATIS-2810 — em andamento (a consulta de 7 em 7 s) ou sem refação: não relê a fonte
  try { // KINEO-REFAZER-GRATIS-2810
    const videoId = a.videoId.trim() // KINEO-REFAZER-GRATIS-2810
    const lido = await lerPedido(d, a.userId, videoId) // KINEO-REFAZER-GRATIS-2810
    const meta = lido === 'erro' ? null : lido.meta // KINEO-REFAZER-GRATIS-2810
    const video = await lerVideo(d, a.userId, videoId) // KINEO-REFAZER-GRATIS-2810
    const fonte = video && video !== 'erro' && video.render_id ? await lerFonte(d, a.userId, video.render_id) : null // KINEO-REFAZER-GRATIS-2810
    const chain = fonte && fonte !== 'erro' && fonte.ok ? fonte.chain ?? null : null // KINEO-REFAZER-GRATIS-2810
    return { status: resp.status, body: { ...resp.body, ...(await saldoDaVersao(d, a.userId, videoId, meta, chain)) } } // KINEO-REFAZER-GRATIS-2810
  } catch { // KINEO-REFAZER-GRATIS-2810
    return resp // KINEO-REFAZER-GRATIS-2810 — o saldo nunca derruba a consulta
  } // KINEO-REFAZER-GRATIS-2810
} // KINEO-REFAZER-GRATIS-2810

async function acompanharSemSaldo(d: FreeRedoFilmDeps, a: { userId: string; videoId: unknown; lite?: boolean }): Promise<FreeRedoResposta> { // KINEO-REFAZER-GRATIS-2810
  const videoId = typeof a.videoId === 'string' ? a.videoId.trim() : ''
  if (!UUID.test(videoId)) return r(400, { ok: false, motivo: 'video_id_invalido' })
  const lido = await lerPedido(d, a.userId, videoId)
  if (lido === 'erro') return r(503, { ok: false, motivo: 'banco_indisponivel' })
  const meta = lido.meta

  if (!meta) {
    if (a.lite) {
      const video = await lerVideo(d, a.userId, videoId)
      if (video === 'erro') return r(503, { ok: false, motivo: 'banco_indisponivel' })
      if (!video) return r(404, { ok: false, motivo: 'video_nao_encontrado' })
      if (video.status !== 'completed' || !video.render_id) return r(200, corpoDoPedido(null, false))
      const fonte = await lerFonte(d, a.userId, video.render_id)
      return r(200, corpoDoPedido(null, fonte !== 'erro' && fonte.ok))
    }
    const c = await contexto(d, a.userId, videoId)
    if (!c.ok) return c.resp
    return r(200, { ...corpoDoPedido(null, true), scenes: cenasPublicas(c.ctx.cenas) })
  }

  const status = String(meta.status ?? '') as FreeRedoStatus
  if (status === 'done' || status === 'failed') return r(200, corpoDoPedido(meta, true))
  if (a.lite && !etapaParada(meta, d.now()) && status === 'pending') return r(200, corpoDoPedido(meta, true))

  if (status === 'pending') {
    // Envio à fal que nunca respondeu (lambda morta): o job pode existir — vira falha que gasta uma tentativa.
    if (!etapaParada(meta, d.now())) return r(200, corpoDoPedido(meta, true))
    const novo = { status: 'failed', error: 'scene_submit_stale', gastas: tentativasGastas(meta) + 1 }
    if (await mover(d, a.userId, videoId, meta, novo)) await falhou(d, a.userId, videoId, meta, 'scene_submit_stale')
    return r(200, corpoDoPedido({ ...meta, ...novo }, true))
  }

  if (status === 'scene') {
    let st: Awaited<ReturnType<FreeRedoFilmDeps['pollScene']>>
    try { st = await d.pollScene(String(meta.model), String(meta.fal_request_id)) } catch { return r(200, corpoDoPedido(meta, true)) }
    const presa = st.status === 'pending' && etapaParada(meta, d.now(), FREE_REDO_STUCK_MS)
    if (st.status === 'pending' && !presa) return r(200, corpoDoPedido(meta, true))
    if (presa || st.status === 'failed' || !st.url) {
      const novo = { status: 'failed', error: presa ? 'scene_stuck' : 'scene_failed', detail: st.error ?? null }
      if (await mover(d, a.userId, videoId, meta, novo)) await falhou(d, a.userId, videoId, meta, novo.error)
      return r(200, corpoDoPedido({ ...meta, ...novo }, true))
    }
    const composing = { status: 'composing', owner: d.newOwner(), new_clip_url: st.url }
    if (!await mover(d, a.userId, videoId, meta, composing)) {
      const outro = await lerPedido(d, a.userId, videoId)
      return r(200, corpoDoPedido(outro === 'erro' ? meta : outro.meta, true))
    }
    return montar(d, a.userId, videoId, { ...meta, ...composing })
  }

  if (status === 'composing') {
    // Montagem que ficou pela metade há tempo demais: retoma (custo máximo: uma montagem a mais no Creatomate).
    if (!etapaParada(meta, d.now())) return r(200, corpoDoPedido(meta, true))
    const retomada = { owner: d.newOwner() }
    if (!await mover(d, a.userId, videoId, meta, retomada)) return r(200, corpoDoPedido(meta, true))
    return montar(d, a.userId, videoId, { ...meta, ...retomada })
  }

  if (status === 'rendering') {
    let est: Awaited<ReturnType<FreeRedoFilmDeps['pollRender']>>
    try { est = await d.pollRender(String(meta.render_id)) } catch { return r(200, corpoDoPedido(meta, true)) }
    if (est.status === 'failed' || est.status === 'cancelled') {
      const novo = { status: 'failed', error: 'render_failed', detail: est.error ?? est.status }
      if (await mover(d, a.userId, videoId, meta, novo)) await falhou(d, a.userId, videoId, meta, 'render_failed')
      return r(200, corpoDoPedido({ ...meta, ...novo }, true))
    }
    if (est.status !== 'succeeded' || !est.url) {
      if (!etapaParada(meta, d.now(), FREE_REDO_STUCK_MS)) return r(200, corpoDoPedido(meta, true))
      const novo = { status: 'failed', error: 'render_stuck' }
      if (await mover(d, a.userId, videoId, meta, novo)) await falhou(d, a.userId, videoId, meta, 'render_stuck')
      return r(200, corpoDoPedido({ ...meta, ...novo }, true))
    }
    return entregar(d, a.userId, videoId, meta, est)
  }
  return r(200, corpoDoPedido(meta, true))
}

async function falhou(d: FreeRedoFilmDeps, userId: string, videoId: string, meta: Meta, reason: string): Promise<void> {
  await evento(d, userId, videoId, FREE_REDO_EVENTS.failed, {
    engine: meta.model ?? null, quality: meta.quality ?? null, scene_index: meta.scene_index ?? null,
    estimated_usd: meta.estimated_usd ?? null, stage: String(meta.status ?? ''), reason,
  })
}

/** Cena nova pronta (status composing, este owner): troca o clipe no RenderScript assinado e envia ao Creatomate. */
async function montar(d: FreeRedoFilmDeps, userId: string, videoId: string, meta: Meta): Promise<FreeRedoResposta> {
  const fonte = await lerFonte(d, userId, String(meta.original_render_id ?? ''))
  const falha = async (error: string) => {
    const novo = { status: 'failed', error }
    if (await mover(d, userId, videoId, meta, novo)) await falhou(d, userId, videoId, meta, error)
    return r(200, corpoDoPedido({ ...meta, ...novo }, true))
  }
  if (fonte === 'erro') return r(200, corpoDoPedido(meta, true)) // banco piscou: a próxima consulta retoma (etapa parada)
  if (!fonte.ok) return falha('source_invalid')
  const troca = trocarClipe(fonte.source, String(meta.old_clip_url ?? ''), String(meta.new_clip_url ?? ''))
  if (troca.trocados === 0) return falha('scene_not_in_source')
  let renderId: string
  try {
    renderId = await d.submitRender(troca.source)
  } catch (err) {
    return falha(err instanceof Error ? `render_submit: ${err.message.slice(0, 200)}` : 'render_submit')
  }
  const rendering = { status: 'rendering', render_id: renderId, swapped: troca.trocados }
  await mover(d, userId, videoId, meta, rendering)
  return r(202, corpoDoPedido({ ...meta, ...rendering }, true))
}

/** Montagem pronta: copia o MP4 para o bucket, cria a versão NOVA em `videos` (0 crédito) e fecha o pedido. */
async function entregar(d: FreeRedoFilmDeps, userId: string, videoId: string, meta: Meta, est: { url: string | null; snapshotUrl: string | null; durationSeconds?: number | null }): Promise<FreeRedoResposta> {
  const renderId = String(meta.render_id)
  const { data: origData } = await d.db
    .from('videos')
    .select('id, user_id, title, topic, quality_mode, duration, platform, youtube_description')
    .eq('id', videoId).eq('user_id', userId).maybeSingle()
  const orig = (origData ?? {}) as Partial<VideoRow>
  const assets = await d.persist({ userId, renderId, videoUrl: String(est.url), snapshotUrl: est.snapshotUrl })
  const segundos = [assets.measuredSeconds, est.durationSeconds, orig.duration].find((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
  const row: Record<string, unknown> = {
    user_id: userId,
    status: 'completed',
    video_url: assets.videoUrl,
    thumbnail_url: assets.thumbnailUrl,
    render_id: renderId,
    topic: orig.topic ?? null,
    title: tituloDaVersaoNova(orig.title, orig.topic),
    platform: orig.platform ?? 'YouTube Shorts',
    duration: typeof segundos === 'number' ? Math.round(segundos) : null,
    quality_mode: orig.quality_mode ?? meta.quality ?? null,
    // Refação grátis: o filme já foi pago; a versão nova não custa crédito.
    credits_used: 0,
  }
  if (orig.youtube_description) row.youtube_description = orig.youtube_description
  let novoId: string | null = null
  const ins = await d.db.from('videos').insert(row).select('id').maybeSingle()
  if (!ins.error && ins.data?.id) novoId = String(ins.data.id)
  else if ((ins.error as { code?: string } | null)?.code === '23505') {
    const ex = await d.db.from('videos').select('id').eq('render_id', renderId).eq('user_id', userId).maybeSingle()
    novoId = ex.data?.id ? String(ex.data.id) : null
  }
  if (!novoId) return r(200, corpoDoPedido(meta, true)) // a próxima consulta tenta de novo (a cópia é idempotente)
  const done = { status: 'done', new_video_id: novoId, new_video_url: assets.videoUrl, done_at: new Date(d.now()).toISOString() }
  if (await mover(d, userId, videoId, meta, done)) {
    await evento(d, userId, videoId, FREE_REDO_EVENTS.delivered, {
      engine: meta.model ?? null, quality: meta.quality ?? null, scene_index: meta.scene_index ?? null,
      estimated_usd: meta.estimated_usd ?? null, new_video_id: novoId, render_id: renderId, previous_video_url: meta.previous_video_url ?? null,
      requested_at: meta.requested_at ?? meta.created_at ?? null, // KINEO-REFAZER-CENA-2710 — o espelho scene_redo_delivered calcula `ms` daqui
    })
    const ganhou = await guardarElo(d, userId, videoId, meta, renderId) // KINEO-REFAZER-GRATIS-2810
    await evento(d, userId, videoId, SCENE_REDO_FUNNEL_EVENTS.freeUsed, { // KINEO-REFAZER-GRATIS-2810
      film_id: typeof meta.root_video_id === 'string' ? meta.root_video_id : videoId, scene_index: meta.scene_index ?? null, // KINEO-REFAZER-GRATIS-2810
      free_seq: typeof meta.free_seq === 'number' ? meta.free_seq : 1, first_film: meta.first_film === true, new_video_id: novoId, next_free_redo: ganhou, // KINEO-REFAZER-GRATIS-2810
    }) // KINEO-REFAZER-GRATIS-2810
  }
  return r(200, corpoDoPedido({ ...meta, ...done }, true))
}

/**
 * KINEO-REFAZER-GRATIS-2810 — refação nº 1 do PRIMEIRO filme entregue: a versão nova ganha o RenderScript assinado (o
 * mesmo que foi ao Creatomate) com o elo de cadeia (seq 2). É isto — e só isto — que dá à versão nova a sua linha-trava de
 * refação grátis. Id DETERMINÍSTICO pelo render novo: duas entregas concorrentes = uma linha (23505). Qualquer falha = a
 * versão nova fica sem a refação nº 2 (fecha para o lado do custo); nada aqui toca crédito.
 */
async function guardarElo(d: FreeRedoFilmDeps, userId: string, videoId: string, meta: Meta, renderId: string): Promise<boolean> {
  try {
    if (!versaoNovaGanhaRefacao({ primeiroFilme: meta.first_film === true, seq: meta.free_seq })) return false
    const sceneIndex = meta.scene_index
    const novoClipe = String(meta.new_clip_url ?? '')
    if (typeof sceneIndex !== 'number' || !Number.isInteger(sceneIndex) || !novoClipe.startsWith('https://')) return false
    const fonte = await lerFonte(d, userId, String(meta.original_render_id ?? ''))
    if (fonte === 'erro' || !fonte.ok) return false
    const troca = trocarClipe(fonte.source, String(meta.old_clip_url ?? ''), novoClipe)
    if (troca.trocados === 0) return false
    const seq = (typeof meta.free_seq === 'number' && Number.isInteger(meta.free_seq) && meta.free_seq > 0 ? meta.free_seq : 1) + 1
    const metadata = filmSourceMetadata({
      secret: d.secret, userId, renderId, generationId: fonte.generationId, quality: fonte.quality, source: troca.source,
      chain: { seq, parentVideoId: videoId, rootVideoId: typeof meta.root_video_id === 'string' ? meta.root_video_id : videoId, sceneIndex, clipUrl: novoClipe },
    })
    if (!metadata) return false
    const { error } = await d.db.from('events').insert({
      id: uuidFrom(`kineo:free-redo:film-chain:v1:${renderId}`), user_id: userId, name: FILM_SOURCE_EVENT, path: FREE_REDO_FILM_PATH,
      session_id: fonte.generationId, metadata,
    })
    return !error || (error as { code?: string }).code === '23505'
  } catch {
    return false
  }
}
