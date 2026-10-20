// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — "REFAZEMOS 1× DE GRAÇA".
//
// Decisão do fundador (19/10): todo filme ganha UMA refação grátis de UMA cena. Arcads, Higgsfield e HeyGen cobram cada
// refação; para nós é diferencial. Custo medido no estudo: ~US$ 0,17 por troca (uma cena clássica de 5 s na fal).
//
// COMO FUNCIONA (filme pronto → uma cena nova → filme remontado → versão nova; a antiga fica intacta):
//   1. No compose, todo filme dos motores clássicos (Seedance 1.5, Kling 2.5, Veo 3.1) grava o PRÓPRIO RenderScript, assinado
//      com HMAC (evento FILM_SOURCE_EVENT). Sem a assinatura, ninguém (nem o navegador, que escreve em `events` pelo
//      /api/events) consegue fabricar um roteiro de montagem para a rota remontar.
//   2. A pessoa escolhe a cena. O servidor pega, no claim de nascimento ASSINADO (lib/cinematic/claim.ts), o payload EXATO que
//      a fal aceitou para aquela cena (response.scene_fal_inputs[i]) — mesmo motor, mesma duração, mesmo quadro, mesma
//      âncora, mesma fala (a narração não mora no clipe) — e só varia o prompt (e a semente, se o motor tiver uma).
//   3. Cena nova pronta: o RenderScript guardado troca a URL do clipe antigo pela nova (todas as ocorrências: um clipe
//      cortado em dois planos continua cortado igual) e vai direto ao Creatomate. Sem TTS, sem Whisper, sem música nova,
//      sem claim de compose, sem render_jobs: /api/compose/status nem conhece este render — não há por onde cobrar.
//   4. Pronto: a versão nova vira uma linha NOVA em `videos` (credits_used 0, título com " · v2"); a original não é tocada.
//
// O SERVIDOR DECIDE (o cliente só manda videoId + sceneIndex): dono, filme pronto, motor coberto, cena válida, 1× por
// filme (id DETERMINÍSTICO por filme na tabela events — a PK é a trava entre instâncias e contra o duplo clique), teto
// GLOBAL por dia (FREE_REDO_DAILY_CAP vagas com id determinístico por dia: no máximo N linhas existem, por construção).
// Débito: NENHUM. Esta lib, a rota e o servidor não importam nada de crédito (o guardião confere).
//
// LIB PURA (só node:crypto + constantes de lib/classicSceneRetry): o guardião scripts/test-meta95-refazer-1910.mjs a executa.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { CLASSIC, CLASSIC_I2V, SEEDANCE_MODEL, SEEDANCE_I2V_MODEL, KLING_MODEL, KLING_I2V_MODEL, VEO_MODEL, VEO_I2V_MODEL } from '@/lib/classicSceneRetry'
import { FREE_REDO_FILM_PATH, FREE_REDO_FILM_QUALITIES, filmQualityCovered } from '@/lib/freeRedo/public'

export const MARCA_REFAZER_1910 = 'KINEO-META95-REFAZER-1910'

/** Teto GLOBAL de refações grátis por dia (UTC), somando Filmes, Ads e UGC. É o teto de custo (~200 × US$ 0,17). */
export const FREE_REDO_DAILY_CAP = 200
/** Quantas vezes uma refação que FALHOU pode ser tentada de novo (a 1ª não entregou nada; não gastou a vez). */
export const FREE_REDO_MAX_TENTATIVAS = 2
/** Etapa parada há mais que isto (lambda morta / envio ambíguo) deixa de prender o pedido. */
export const FREE_REDO_STALE_MS = 10 * 60_000
/** Cena (fal) ou montagem (Creatomate) que não termina em 30 min = falha (a vez volta, se ainda houver tentativa). */
export const FREE_REDO_STUCK_MS = 30 * 60_000
/** RenderScript maior que isto não é guardado (mesmo teto da versão B sem legenda). */
export const FILM_SOURCE_MAX_CHARS = 400_000

export const FREE_REDO_EVENTS = {
  requested: 'free_redo_requested',
  delivered: 'free_redo_delivered',
  failed: 'free_redo_failed',
} as const
/** O RenderScript assinado de cada filme clássico (gravado pelo /api/compose). */
export const FILM_SOURCE_EVENT = 'free_redo_film_source'
/** A linha-trava (e o estado) da refação grátis de UM filme. id = filmOrderId(videoId). */
export const FILM_ORDER_EVENT = 'free_redo_film_order'
/** Uma vaga do teto diário. id = capSlotId(dia, k), k < FREE_REDO_DAILY_CAP. */
export const CAP_SLOT_EVENT = 'free_redo_cap_slot'
export { FREE_REDO_FILM_PATH, FREE_REDO_FILM_QUALITIES, filmQualityCovered }

/** US$ por segundo de clipe (estimativa para o evento; docs/PRECOS-MOTORES-V4.md). */
export const FREE_REDO_USD_PER_SECOND: Record<string, number> = {
  [SEEDANCE_MODEL]: 0.026, [SEEDANCE_I2V_MODEL]: 0.026,
  [KLING_MODEL]: 0.07, [KLING_I2V_MODEL]: 0.07,
  [VEO_MODEL]: 0.15, [VEO_I2V_MODEL]: 0.15,
}
export const FREE_REDO_TITLE_SUFFIX = ' · v2'
/** O pedido de variação que entra no fim do prompt assinado (o resto do prompt fica byte a byte). */
export const FREE_REDO_VARIATION = ' Alternate take: same subject, same action and same setting, filmed from a different camera angle with a fresh composition.'

export type FreeRedoStatus = 'pending' | 'scene' | 'composing' | 'rendering' | 'done' | 'failed'
export type FreeRedoPublic = 'available' | 'unavailable' | 'working' | 'done' | 'failed_retry' | 'used'

/** UUID determinístico (o formato que a coluna events.id aceita). */
export function uuidFrom(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** A trava da refação grátis de UM filme: o id não depende da cena, nem do clique — dois cliques = o mesmo id. */
export function filmOrderId(videoId: string): string {
  return uuidFrom(`kineo:free-redo:film:v1:${videoId}`)
}

/** Dia UTC (AAAA-MM-DD) — a janela do teto global. */
export function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10)
}

export function capSlotId(day: string, k: number): string {
  return uuidFrom(`kineo:free-redo:cap:v1:${day}:${k}`)
}

/** As N vagas do dia, em ordem. Só estes ids contam: linha forjada com o nome do evento não ocupa vaga. */
export function capSlotIds(day: string, cap: number = FREE_REDO_DAILY_CAP): string[] {
  const n = Math.max(0, Math.min(1000, Math.floor(cap)))
  return Array.from({ length: n }, (_, k) => capSlotId(day, k))
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function sourceSignature(secret: string, a: { userId: string; renderId: string; generationId: string; quality: string; sourceHash: string }): string {
  return createHmac('sha256', secret)
    .update(JSON.stringify(['kineo:free-redo-film-source:v1', a.userId, a.renderId, a.generationId, a.quality, a.sourceHash]))
    .digest('hex')
}

/**
 * Metadados do FILM_SOURCE_EVENT (o RenderScript inteiro + a assinatura). null = não guarda (motor não coberto, sem
 * geração, sem segredo, source sem elementos ou grande demais) — o filme sai igual, só não ganha a refação.
 */
export function filmSourceMetadata(a: {
  secret: string | null | undefined
  userId: string
  renderId: string
  generationId: string | null
  quality: string | null
  source: unknown
}): Record<string, unknown> | null {
  if (!a.secret || !a.userId || !a.renderId || !a.generationId || !filmQualityCovered(a.quality)) return null
  const src = a.source
  if (!src || typeof src !== 'object' || Array.isArray(src)) return null
  const els = (src as { elements?: unknown }).elements
  if (!Array.isArray(els) || els.length === 0) return null
  const json = JSON.stringify(src)
  if (json.length > FILM_SOURCE_MAX_CHARS) return null
  const sourceHash = sha256(json)
  return {
    marca: MARCA_REFAZER_1910,
    render_id: a.renderId,
    generation_id: a.generationId,
    quality: a.quality,
    chars: json.length,
    source_hash: sourceHash,
    source: JSON.parse(json),
    authority: sourceSignature(a.secret, { userId: a.userId, renderId: a.renderId, generationId: a.generationId, quality: a.quality as string, sourceHash }),
  }
}

export type FonteVerificada =
  | { ok: true; source: Record<string, unknown>; generationId: string; quality: string }
  | { ok: false; motivo: string }

/** Confere a assinatura do RenderScript guardado contra o DONO e o render do filme. Qualquer divergência = recusa. */
export function verifyFilmSource(secret: string | null | undefined, userId: string, renderId: string, metadata: unknown): FonteVerificada {
  if (!secret) return { ok: false, motivo: 'sem_segredo' }
  if (!metadata || typeof metadata !== 'object') return { ok: false, motivo: 'sem_fonte' }
  const m = metadata as Record<string, unknown>
  const source = m.source
  const generationId = m.generation_id, quality = m.quality, authority = m.authority
  if (m.render_id !== renderId || typeof generationId !== 'string' || !generationId || typeof quality !== 'string' ||
    !filmQualityCovered(quality) || typeof authority !== 'string' || !source || typeof source !== 'object' || Array.isArray(source)) {
    return { ok: false, motivo: 'fonte_invalida' }
  }
  const sourceHash = sha256(JSON.stringify(source))
  const esperado = sourceSignature(secret, { userId, renderId, generationId, quality, sourceHash })
  const a = Buffer.from(esperado, 'utf8'), b = Buffer.from(authority, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, motivo: 'assinatura_invalida' }
  return { ok: true, source: source as Record<string, unknown>, generationId, quality }
}

/** As URLs de vídeo do RenderScript (os clipes), sem repetição, na ordem em que aparecem. */
export function videoUrlsOf(source: unknown): string[] {
  const els = source && typeof source === 'object' ? (source as { elements?: unknown }).elements : undefined
  if (!Array.isArray(els)) return []
  const out: string[] = []
  const walk = (list: unknown[]) => {
    for (const e of list) {
      if (!e || typeof e !== 'object') continue
      const x = e as { type?: unknown; source?: unknown; elements?: unknown }
      if (x.type === 'video' && typeof x.source === 'string' && !out.includes(x.source)) out.push(x.source)
      if (Array.isArray(x.elements)) walk(x.elements)
    }
  }
  walk(els)
  return out
}

/** Todas as URLs de mídia (vídeo, áudio, imagem) — o que tem de continuar vivo para a remontagem dar certo. */
export function mediaUrlsOf(source: unknown): string[] {
  const els = source && typeof source === 'object' ? (source as { elements?: unknown }).elements : undefined
  if (!Array.isArray(els)) return []
  const out: string[] = []
  const walk = (list: unknown[]) => {
    for (const e of list) {
      if (!e || typeof e !== 'object') continue
      const x = e as { type?: unknown; source?: unknown; elements?: unknown }
      if ((x.type === 'video' || x.type === 'audio' || x.type === 'image') && typeof x.source === 'string' && !out.includes(x.source)) out.push(x.source)
      if (Array.isArray(x.elements)) walk(x.elements)
    }
  }
  walk(els)
  return out
}

export interface ClaimParaRefazer {
  status: string
  userId: string
  falModels: string[]
  authorizedCompletedUrls: Array<string | null>
  response: Record<string, unknown> | null
}

export interface CenaRefazivel {
  index: number
  model: string
  seconds: number | null
  text: string
  clipUrl: string
  input: Record<string, unknown>
}

function textoDaCena(response: Record<string, unknown>, i: number): string {
  for (const k of ['scene_captions', 'scene_narrations', 'scenes']) {
    const list = response[k]
    const v = Array.isArray(list) ? list[i] : undefined
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 280)
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      for (const f of ['voiceover', 'narration', 'caption', 'text', 'description']) {
        if (typeof o[f] === 'string' && (o[f] as string).trim()) return (o[f] as string).trim().slice(0, 280)
      }
    }
  }
  return ''
}

/** O payload assinado da cena vale para reenviar? (mesma régua de signedClassic em /api/retry-hollywood-scene.) */
export function entradaAssinadaValida(model: string, raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const input = raw as Record<string, unknown>
  const prompt = input.prompt
  if (typeof prompt !== 'string' || prompt.trim().length < 20 || prompt.length > 6000) return false
  const image = input.image_url
  return CLASSIC_I2V.has(model) ? typeof image === 'string' && image.startsWith('https://') : image === undefined
}

/**
 * As cenas que podem ser refeitas: claim do DONO, liquidado (ou estornado entregável), motor clássico, clipe pronto e
 * presente no RenderScript, payload assinado válido. Qualquer coisa fora disso simplesmente não aparece na lista.
 */
export function cenasDoFilme(claim: ClaimParaRefazer | null | undefined, userId: string, source: unknown): CenaRefazivel[] {
  if (!claim || claim.userId !== userId || (claim.status !== 'settled' && claim.status !== 'released')) return []
  const response = claim.response && typeof claim.response === 'object' ? claim.response : null
  if (!response) return []
  const inputs = Array.isArray(response.scene_fal_inputs) ? (response.scene_fal_inputs as unknown[]) : []
  const urls = new Set(videoUrlsOf(source))
  const out: CenaRefazivel[] = []
  const models = Array.isArray(claim.falModels) ? claim.falModels : []
  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    const clipUrl = claim.authorizedCompletedUrls?.[i]
    if (typeof model !== 'string' || !CLASSIC.has(model)) continue
    if (typeof clipUrl !== 'string' || !clipUrl.startsWith('https://') || !urls.has(clipUrl)) continue
    const raw = inputs[i]
    if (!entradaAssinadaValida(model, raw)) continue
    const dur = Number((raw as Record<string, unknown>).duration)
    out.push({ index: i, model, seconds: Number.isFinite(dur) && dur > 0 ? dur : null, text: textoDaCena(response, i), clipUrl, input: raw as Record<string, unknown> })
  }
  return out
}

/** A entrada da cena nova: o payload assinado, com o pedido de variação no fim do prompt e semente nova (se houver). */
export function variarEntrada(input: Record<string, unknown>, seed: number): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input }
  const prompt = String(input.prompt ?? '')
  out.prompt = prompt.length + FREE_REDO_VARIATION.length <= 6000 && !prompt.endsWith(FREE_REDO_VARIATION) ? prompt + FREE_REDO_VARIATION : prompt
  if (Object.prototype.hasOwnProperty.call(input, 'seed')) out.seed = Math.max(1, Math.floor(Math.abs(seed)) % 2_147_483_647)
  return out
}

/** Troca o clipe antigo pelo novo em TODAS as ocorrências (cópia profunda; o original não muda). */
export function trocarClipe(source: Record<string, unknown>, oldUrl: string, newUrl: string): { source: Record<string, unknown>; trocados: number } {
  const copia = JSON.parse(JSON.stringify(source)) as Record<string, unknown>
  let trocados = 0
  const walk = (list: unknown) => {
    if (!Array.isArray(list)) return
    for (const e of list) {
      if (!e || typeof e !== 'object') continue
      const x = e as Record<string, unknown>
      if (x.type === 'video' && x.source === oldUrl) { x.source = newUrl; trocados++ }
      walk(x.elements)
    }
  }
  walk(copia.elements)
  return { source: copia, trocados }
}

export function custoEstimadoUsd(model: string, seconds: number | null | undefined): number {
  const s = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds : 5
  const r = FREE_REDO_USD_PER_SECOND[model] ?? 0.05
  return Math.round(r * s * 1000) / 1000
}

export function tituloDaVersaoNova(title: unknown, topic: unknown): string {
  const base = String(title ?? '').trim() || String(topic ?? '').trim().slice(0, 100) || 'Untitled Short'
  const limpo = base.endsWith(FREE_REDO_TITLE_SUFFIX) ? base.slice(0, -FREE_REDO_TITLE_SUFFIX.length) : base
  return (limpo.slice(0, 140 - FREE_REDO_TITLE_SUFFIX.length) + FREE_REDO_TITLE_SUFFIX)
}

export interface PedidoMeta {
  status?: unknown
  owner?: unknown
  gastas?: unknown
  updated_at?: unknown
  error?: unknown
}

/** Quantas tentativas deste filme já podem ter gerado custo na fal (envio aceito ou ambíguo). */
export function tentativasGastas(meta: PedidoMeta | null | undefined): number {
  const n = Number(meta?.gastas)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * O que fazer com um pedido de refação deste filme (o servidor decide; o cliente nunca diz se é grátis):
 *   · sem pedido → 'criar' (a PK do id determinístico decide quem ganha entre dois cliques);
 *   · falhou e ainda há tentativa → 'retomar' (CAS no status lido);
 *   · em andamento → 'andamento'; entregue ou sem tentativa → 'usada'.
 */
export function decidirPedido(meta: PedidoMeta | null | undefined): 'criar' | 'retomar' | 'andamento' | 'usada' {
  if (!meta) return 'criar'
  const s = String(meta.status ?? '')
  if (s === 'done') return 'usada'
  if (s === 'failed') return tentativasGastas(meta) < FREE_REDO_MAX_TENTATIVAS ? 'retomar' : 'usada'
  return 'andamento'
}

/** O estado que a tela mostra. */
export function estadoPublico(meta: PedidoMeta | null | undefined, temFonte: boolean): FreeRedoPublic {
  const d = decidirPedido(meta)
  if (d === 'criar') return temFonte ? 'available' : 'unavailable'
  if (d === 'andamento') return 'working'
  if (d === 'retomar') return 'failed_retry'
  return String(meta?.status ?? '') === 'done' ? 'done' : 'used'
}

/** Etapa parada há tempo demais? (sem data = parada, para nunca prender o pedido para sempre). */
export function etapaParada(meta: PedidoMeta | null | undefined, nowMs: number, limiteMs: number = FREE_REDO_STALE_MS): boolean {
  const t = Date.parse(String(meta?.updated_at ?? ''))
  return !Number.isFinite(t) || nowMs - t > limiteMs
}
