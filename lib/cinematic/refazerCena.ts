// KINEO-REFAZER-CENA-2710 [TRAVA 8.2 — vai do fundador 27/10 "refazer essa cena liberado"] — "Redo this scene — free" na
// TELA DO FILME PRONTO (Studio), por cima do mecanismo que já existe desde 19/10 (lib/freeRedo/*: 1 refação grátis por
// filme, só o dono, só filme concluído, cena validada no claim assinado, linha-trava com id determinístico = idempotente,
// débito ZERO). Esta lib é PURA (sem React, sem rede, sem banco): o guardião scripts/test-refazer-cena-2710.mjs a executa.
//
// O QUE ESTA ENTREGA ACRESCENTA (nada aqui muda a regra de 19/10):
//   1. O painel na tela do filme pronto (components/video/SceneRedoPanel.tsx, montado por components/FilmReadyExits.tsx):
//      miniaturas das cenas (o clipe de cada cena, do claim) + "Redo this scene — free"; em andamento mostra o progresso;
//      pronto → avisa a tela (evento DOM SCENE_REDO_SWAP_EVENT) e o player troca para a versão nova sem perder o ponto.
//   2. Os eventos do controle de qualidade diário (quais cenas o cliente refaz = o que a esteira erra):
//      scene_redo_requested {video_id, scene_index} · scene_redo_delivered {video_id, scene_index, ms} ·
//      scene_redo_failed {video_id, scene_index, reason}. São ESPELHOS dos free_redo_* que o servidor já grava — o servidor
//      grava os dois no mesmo ponto (lib/freeRedo/filmServer.ts), nunca o navegador.
//
// CUSTO POR USO (estimativa, docs/PRECOS-MOTORES-V4.md): uma cena clássica de 5-10 s na fal (Seedance ≈ US$0,13-0,26;
// Kling 2.5 ≈ US$0,35-0,70; Veo ≈ US$0,75-1,50) + uma remontagem no Creatomate (≈ US$0,05). Sem TTS, sem música, sem
// legenda nova. Teto global de FREE_REDO_DAILY_CAP (200) refações/dia continua valendo.
export const MARCA_REFAZER_CENA_2710 = 'KINEO-REFAZER-CENA-2710'

/** Os três eventos do controle de qualidade (gravados pelo servidor, ao lado dos free_redo_*). */
export const SCENE_REDO_EVENTS = {
  requested: 'scene_redo_requested',
  delivered: 'scene_redo_delivered',
  failed: 'scene_redo_failed',
} as const

/** free_redo_* → scene_redo_* (a mesma transição, os dois nomes). */
export const SCENE_REDO_MIRROR: Readonly<Record<string, (typeof SCENE_REDO_EVENTS)[keyof typeof SCENE_REDO_EVENTS]>> = {
  free_redo_requested: SCENE_REDO_EVENTS.requested,
  free_redo_delivered: SCENE_REDO_EVENTS.delivered,
  free_redo_failed: SCENE_REDO_EVENTS.failed,
}

/** O evento DOM que o painel dispara quando a versão nova está pronta; a tela do Studio troca o player ao ouvi-lo. */
export const SCENE_REDO_SWAP_EVENT = 'kineo:scene-redo-delivered'
/** O painel pergunta ao servidor a cada tantos ms enquanto a refação anda (é a consulta que faz a refação andar). */
export const SCENE_REDO_POLL_MS = 7000
/** Custo médio estimado por uso (uma cena Seedance/Kling + uma remontagem), para o evento e para o painel do admin. */
export const SCENE_REDO_USD_PER_USE = 0.3

export interface EspelhoSceneRedo {
  name: string
  metadata: Record<string, unknown>
}

function inteiroOuNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null
}

/**
 * O espelho de um evento free_redo_* (ou null quando o nome não é um dos três). `ms` = agora − requested_at (a hora do
 * pedido, gravada na linha-trava); sem hora válida = null, nunca um número inventado.
 */
export function espelhoSceneRedo(a: { name: string; videoId: string; metadata: Record<string, unknown>; nowMs: number }): EspelhoSceneRedo | null {
  const name = SCENE_REDO_MIRROR[a.name]
  if (!name) return null
  const m = a.metadata ?? {}
  const base: Record<string, unknown> = {
    marca: MARCA_REFAZER_CENA_2710,
    product: 'film',
    video_id: a.videoId,
    scene_index: inteiroOuNull(m.scene_index),
    engine: typeof m.engine === 'string' ? m.engine : null,
  }
  if (name === SCENE_REDO_EVENTS.delivered) {
    const t0 = Date.parse(String(m.requested_at ?? ''))
    const ms = Number.isFinite(t0) && a.nowMs >= t0 ? Math.round(a.nowMs - t0) : null
    return { name, metadata: { ...base, ms, new_video_id: m.new_video_id ?? null } }
  }
  if (name === SCENE_REDO_EVENTS.failed) {
    const reason = typeof m.reason === 'string' && m.reason.trim() ? m.reason.trim().slice(0, 120) : 'unknown'
    return { name, metadata: { ...base, reason, stage: typeof m.stage === 'string' ? m.stage : null } }
  }
  return { name, metadata: base }
}

// ── o painel (lado do navegador; só funções puras aqui) ──────────────────────────────────────────────────────────────

export type SceneRedoEstado = 'available' | 'unavailable' | 'working' | 'done' | 'failed_retry' | 'used'
export type SceneRedoFase = 'hidden' | 'pick' | 'working' | 'done' | 'retry'

export interface SceneRedoCena {
  index: number
  number: number
  text: string
  clip_url: string
  seconds: number | null
  preview_start?: number
}

export interface SceneRedoResposta {
  ok?: boolean
  estado?: SceneRedoEstado | string
  motivo?: string
  scenes?: SceneRedoCena[]
  new_video_url?: string | null
  scene_index?: number | null
  retry?: boolean
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ESTADOS: ReadonlySet<string> = new Set(['available', 'unavailable', 'working', 'done', 'failed_retry', 'used'])

/** A fase do painel a partir da resposta do servidor (o servidor decide; a tela só traduz em "o que mostrar"). */
export function faseDoPainel(r: SceneRedoResposta | null | undefined): SceneRedoFase {
  const e = r && typeof r.estado === 'string' && ESTADOS.has(r.estado) ? (r.estado as SceneRedoEstado) : null
  if (!e || e === 'unavailable') return 'hidden'
  if (e === 'working') return 'working'
  if (e === 'done' || e === 'used') return 'done'
  if (e === 'failed_retry') return 'retry'
  return 'pick'
}

/** As cenas que a tela pode oferecer: só as que o servidor listou, com clipe https e índice inteiro (nada inventado). */
export function cenasDoPainel(r: SceneRedoResposta | null | undefined): SceneRedoCena[] {
  const list = r && Array.isArray(r.scenes) ? r.scenes : []
  const out: SceneRedoCena[] = []
  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    const index = inteiroOuNull((c as SceneRedoCena).index)
    const clip = (c as SceneRedoCena).clip_url
    if (index === null || typeof clip !== 'string' || !clip.startsWith('https://')) continue
    out.push({ index, number: index + 1, text: typeof c.text === 'string' ? c.text : '', clip_url: clip, seconds: typeof c.seconds === 'number' ? c.seconds : null,
      ...(typeof c.preview_start === 'number' && Number.isFinite(c.preview_start) && c.preview_start >= 0 && c.preview_start < 90 ? { preview_start: c.preview_start } : {}),
    })
  }
  return out
}

/** O corpo do POST: SÓ o filme e a cena. Preço, "grátis", motor e prompt são decididos no servidor — a tela não manda. */
export function corpoDoPedidoDeCena(videoId: string, sceneIndex: number): string | null {
  if (!UUID.test(videoId) || !Number.isInteger(sceneIndex) || sceneIndex < 0) return null
  return JSON.stringify({ videoId, sceneIndex })
}

/** A URL de consulta (lite = só o estado, sem ler o claim; é o que a tela pergunta primeiro). */
export function urlDeConsulta(path: string, videoId: string, lite: boolean): string {
  return `${path}?videoId=${encodeURIComponent(videoId)}${lite ? '&lite=1' : ''}`
}

/** O detalhe do evento DOM de troca; a tela só aceita link https do filme pedido. */
export function detalheDaTroca(detail: unknown, videoId: string | null): string | null {
  if (!detail || typeof detail !== 'object') return null
  const d = detail as { videoId?: unknown; url?: unknown }
  if (typeof d.url !== 'string' || !d.url.startsWith('https://')) return null
  if (videoId && d.videoId !== videoId) return null
  return d.url
}

export function montarDetalheDaTroca(videoId: string, url: string): { videoId: string; url: string } {
  return { videoId, url }
}
