// KINEO-CLIPES-2026-09-29 — ENTREGA 1 "CLIPE": UM clipe de vídeo, uma cena, sem narração (fundador 29/09: "vai pra todas
// as 4… é muito mais público que podemos alcançar"). O filme narrado continua sendo o produto principal; o clipe é a porta
// de quem chega procurando o que os concorrentes vendem (5–15 s, texto ou foto → vídeo).
//
// MÓDULO PURO: somente módulos locais puros. Guardiões executam o catálogo isolado, sem rede nem cobrança.
//
// A REGRA DAS DURAÇÕES (fundador 29/09): o cliente pede 5, 7, 10 ou 15 s. Cada motor mostra SÓ o que o schema oficial da
// fal aceita num clipe único (sem emendar dois). Se o motor não aceita o número exato, vale o valor aceito MAIS PRÓXIMO
// (até 3 s de distância; empate → o maior, porque passar do alvo é bom e ficar abaixo é defeito — CLAUDE.md 02/09), e a
// tela mostra o número REAL. Dois alvos que caem no mesmo valor real viram um botão só. Selo honesto: nunca "5 s" para
// entregar 6.
//
// FONTE DE CADA LISTA `falSeconds` (schema OpenAPI da fal, lido em 29/09/2026 em
// https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<id> e nas páginas https://fal.ai/models/<id>/api):
//   Kling 3 ........ v3/pro/text-to-video e o3/pro/image-to-video: duration string '3'..'15'
//   Kling 2.5 ...... v2.5-turbo/pro t2v e i2v: duration '5' | '10'
//   Seedance 1.5 ... v1.5/pro t2v e i2v: duration '4'..'12'
//   Veo 3.1 Fast ... veo3.1/fast (t2v e i2v): duration '4s' | '6s' | '8s'
//   MiniMax H3 ..... minimax/h3 t2v e i2v: duration inteiro 5..15
//   Omni Flash ..... google/gemini-omni-flash/image-to-video: duration inteiro 3..10 (NÃO existe text-to-video)
//   Seedance 2.5 ... fal-ai/seedance-2.5 t2v e i2v: duration string '4'..'30' (e 'auto', que nunca mandamos)
//
// FORMATO: sem foto, o formato pedido vai em `aspect_ratio` onde o schema aceita. Com foto, a foto é o 1º quadro e o
// formato É o da foto — Kling 2.5 i2v, Kling O3 i2v e H3 i2v nem têm `aspect_ratio`; Seedance 1.5/2.5 e Veo i2v recebem
// 'auto'. Única exceção: o Omni exige 16:9 ou 9:16 explícito (sem 'auto'), então lá o cliente escolhe.
//
// SOM: clipe sem narração. Kling 3, Seedance e Veo vão com generate_audio:false (é também o preço mais baixo da fal);
// H3 e Omni não têm chave de áudio no schema — o som nativo deles vem sempre, e a tela não promete nem um nem outro.

// Cadastro preparado, fora da seleção pública e do dispatcher até existir API/custo/schema verificados.
export { PREPARED_CLIP_ENGINES } from './clipKling4'

export type ClipEngineKey = 'hollywood' | 'kling' | 'seedance' | 'veo' | 'h3' | 'omni' | 's25'
export type ClipAspect = '9:16' | '16:9' | '1:1'
export type ClipMode = 't2v' | 'i2v'

/** Alvos que o fundador pediu (29/09). O valor REAL de cada motor sai de offeredSecondsFor(). */
export const CLIP_TARGET_SECONDS: readonly number[] = [5, 7, 10, 15]
/** Distância máxima entre o alvo e o valor aceito pelo motor para o alvo virar botão. */
export const CLIP_NEAREST_MAX_GAP_S = 3

export const CLIP_PROMPT_MIN = 3
export const CLIP_PROMPT_MAX = 1000
/** Sem foto e sem texto não há clipe; com foto, o texto é opcional e ganha esta direção padrão. */
export const CLIP_DEFAULT_I2V_PROMPT = 'subtle natural motion, cinematic, realistic movement'

export interface ClipEngineSpec {
  key: ClipEngineKey
  label: string
  t2vModel: string | null
  i2vModel: string | null
  /** Durações que o schema oficial aceita (segundos inteiros). */
  falSeconds: readonly number[]
  t2vAspects: readonly ClipAspect[]
  /** 'image' = o formato é o da foto (o cliente não escolhe). */
  i2vAspects: 'image' | readonly ClipAspect[]
}

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i)

export const CLIP_ENGINE_ORDER: readonly ClipEngineKey[] = ['seedance', 'kling', 'hollywood', 'veo', 'h3', 'omni', 's25']

export const CLIP_ENGINES: Record<ClipEngineKey, ClipEngineSpec> = {
  hollywood: {
    key: 'hollywood',
    label: 'Kling 3',
    t2vModel: 'fal-ai/kling-video/v3/pro/text-to-video',
    i2vModel: 'fal-ai/kling-video/o3/pro/image-to-video',
    falSeconds: range(3, 15),
    t2vAspects: ['9:16', '16:9', '1:1'],
    i2vAspects: 'image',
  },
  kling: {
    key: 'kling',
    label: 'Kling 2.5',
    t2vModel: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
    i2vModel: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    falSeconds: [5, 10],
    t2vAspects: ['9:16', '16:9', '1:1'],
    i2vAspects: 'image',
  },
  seedance: {
    key: 'seedance',
    label: 'Seedance 1.5',
    t2vModel: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video',
    i2vModel: 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video',
    falSeconds: range(4, 12),
    t2vAspects: ['9:16', '16:9', '1:1'],
    i2vAspects: 'image',
  },
  veo: {
    key: 'veo',
    label: 'Veo 3.1',
    t2vModel: 'fal-ai/veo3.1/fast',
    i2vModel: 'fal-ai/veo3.1/fast/image-to-video',
    falSeconds: [4, 6, 8],
    t2vAspects: ['9:16', '16:9'],
    i2vAspects: 'image',
  },
  h3: {
    key: 'h3',
    label: 'MiniMax H3',
    t2vModel: 'minimax/h3/text-to-video',
    i2vModel: 'minimax/h3/image-to-video',
    falSeconds: range(5, 15),
    t2vAspects: ['9:16', '16:9', '1:1'],
    i2vAspects: 'image',
  },
  omni: {
    key: 'omni',
    label: 'Omni Flash',
    t2vModel: null,
    i2vModel: 'google/gemini-omni-flash/image-to-video',
    falSeconds: range(3, 10),
    t2vAspects: [],
    i2vAspects: ['9:16', '16:9'],
  },
  s25: {
    key: 's25',
    label: 'Seedance 2.5',
    t2vModel: 'fal-ai/seedance-2.5/text-to-video',
    i2vModel: 'fal-ai/seedance-2.5/image-to-video',
    falSeconds: range(4, 30),
    t2vAspects: ['9:16', '16:9', '1:1'],
    i2vAspects: 'image',
  },
}

export function isClipEngineKey(value: unknown): value is ClipEngineKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CLIP_ENGINES, value)
}

/** Valor real que o motor entrega para um alvo, ou null quando nada aceito fica a ≤3 s. */
export function nearestAcceptedSeconds(falSeconds: readonly number[], target: number): number | null {
  let best: number | null = null
  for (const s of falSeconds) {
    const gap = Math.abs(s - target)
    if (gap > CLIP_NEAREST_MAX_GAP_S) continue
    if (best === null) { best = s; continue }
    const bestGap = Math.abs(best - target)
    if (gap < bestGap || (gap === bestGap && s > best)) best = s
  }
  return best
}

/** Durações REAIS que o motor oferece (ordenadas, sem repetição). */
export function offeredSecondsFor(engine: ClipEngineKey): number[] {
  const out = new Set<number>()
  for (const target of CLIP_TARGET_SECONDS) {
    const real = nearestAcceptedSeconds(CLIP_ENGINES[engine].falSeconds, target)
    if (real !== null) out.add(real)
  }
  return Array.from(out).sort((a, b) => a - b)
}

export function modesFor(engine: ClipEngineKey): ClipMode[] {
  const spec = CLIP_ENGINES[engine]
  return [...(spec.t2vModel ? ['t2v' as const] : []), ...(spec.i2vModel ? ['i2v' as const] : [])]
}

/** Formatos que o cliente escolhe neste modo; [] com foto = formato da foto. */
export function aspectsFor(engine: ClipEngineKey, mode: ClipMode): ClipAspect[] {
  const spec = CLIP_ENGINES[engine]
  if (mode === 't2v') return [...spec.t2vAspects]
  return spec.i2vAspects === 'image' ? [] : [...spec.i2vAspects]
}

// ─── Visibilidade ────────────────────────────────────────────────────────────
// Os fatos vêm do servidor (lib/engineLaunch.ts: enginePaused / s25Visible; lib/enginePlanGate.ts: decideEngineGate).
// Aqui só a régua: motor pausado, motor interno para conta de fora e motor fora do plano ficam de fora do catálogo E
// são recusados na rota, antes de qualquer débito — a tela e o servidor leem a mesma resposta.
export interface ClipEngineFacts {
  paused: boolean
  /** false só para o Seedance 2.5 fora das contas da casa enquanto S25_PUBLIC=false. */
  launchVisible: boolean
  planAllowed: boolean
}

export type ClipEngineAccess =
  | { ok: true }
  | { ok: false; reason: 'paused' | 'hidden' | 'plan'; status: number }

export function clipEngineAccess(facts: ClipEngineFacts): ClipEngineAccess {
  if (!facts.launchVisible) return { ok: false, reason: 'hidden', status: 404 }
  if (facts.paused) return { ok: false, reason: 'paused', status: 409 }
  if (!facts.planAllowed) return { ok: false, reason: 'plan', status: 402 }
  return { ok: true }
}

// ─── Posse da foto ───────────────────────────────────────────────────────────
// Mesma régua do Animate (lib/animate/service.ts assertOwnedAnimateImageUrl): a foto sobe por /api/avatar/upload
// (purpose=animate, já moderada no upload) e mora em avatars/<uid>/ no NOSSO storage. Qualquer outra origem, outro uid,
// '..' ou pasta que só COMEÇA com o uid é recusada.
export function ownedClipImageUrl(imageUrl: string, userId: string, supabaseUrl: string): string | null {
  if (!imageUrl || !userId || !supabaseUrl) return null
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null
  let parsed: URL
  let origin: string
  try {
    parsed = new URL(imageUrl)
    origin = new URL(supabaseUrl).origin
  } catch {
    return null
  }
  if (parsed.origin !== origin || parsed.username || parsed.password) return null
  if (parsed.search || parsed.hash) return null
  let path: string
  try { path = decodeURIComponent(parsed.pathname) } catch { return null }
  if (path.includes('..') || path.includes('\\') || path.includes('//')) return null
  // KINEO-PRODUCAO-ADS-2026-10-01 — além da foto enviada (avatars/<uid>/), a imagem GERADA pela própria conta no /images
  // (renders/images/<uid>/, já moderada e cobrada no gerador) pode virar clipe: é o "dar vida" dos planos da Produção.
  const prefixes = [`/storage/v1/object/public/avatars/${userId}/`, `/storage/v1/object/public/renders/images/${userId}/`]
  if (!prefixes.some((prefix) => path.startsWith(prefix) && path.length > prefix.length)) return null
  return parsed.toString()
}

// ─── Pedido ──────────────────────────────────────────────────────────────────
export interface ClipRequestInput {
  engine: unknown
  seconds: unknown
  aspect: unknown
  prompt: unknown
  imageUrl: unknown
}

export interface ClipRequest {
  engine: ClipEngineKey
  mode: ClipMode
  model: string
  seconds: number
  /** Formato pedido, ou 'image' quando o formato é o da foto. */
  aspect: ClipAspect | 'image'
  prompt: string
  imageUrl: string | null
}

export type ClipRequestCheck = { ok: true; request: ClipRequest } | { ok: false; status: number; code: string; error: string }

const bad = (code: string, error: string, status = 400): ClipRequestCheck => ({ ok: false, status, code, error })

/** Validação de forma (sem banco): motor, modo, duração oferecida, formato, texto e posse da foto. */
export function validateClipRequest(input: ClipRequestInput, ctx: { userId: string; supabaseUrl: string }): ClipRequestCheck {
  if (!isClipEngineKey(input.engine)) return bad('engine', 'Choose one of the listed engines.')
  const engine = input.engine
  const spec = CLIP_ENGINES[engine]
  const rawImage = typeof input.imageUrl === 'string' ? input.imageUrl.trim() : ''
  const mode: ClipMode = rawImage ? 'i2v' : 't2v'
  const model = mode === 'i2v' ? spec.i2vModel : spec.t2vModel
  if (!model) {
    return bad('mode', mode === 'i2v' ? `${spec.label} cannot start from a photo.` : `${spec.label} needs a photo as the first frame.`)
  }
  const seconds = typeof input.seconds === 'number' ? input.seconds : Number(input.seconds)
  if (!Number.isInteger(seconds) || !offeredSecondsFor(engine).includes(seconds)) {
    return bad('seconds', `${spec.label} makes ${offeredSecondsFor(engine).join(' · ')} s clips.`)
  }
  const choices = aspectsFor(engine, mode)
  let aspect: ClipAspect | 'image'
  if (choices.length === 0) {
    aspect = 'image'
  } else {
    const raw = typeof input.aspect === 'string' ? input.aspect : '9:16'
    if (!(choices as string[]).includes(raw)) return bad('aspect', `${spec.label} makes ${choices.join(' · ')} clips.`)
    aspect = raw as ClipAspect
  }
  const text = typeof input.prompt === 'string' ? input.prompt.trim() : ''
  if (text.length > CLIP_PROMPT_MAX) return bad('prompt', `Keep the description under ${CLIP_PROMPT_MAX} characters.`)
  if (mode === 't2v' && text.length < CLIP_PROMPT_MIN) return bad('prompt', 'Describe your clip (3–1000 characters) or add a photo.')
  if (mode === 'i2v' && text.length > 0 && text.length < CLIP_PROMPT_MIN) return bad('prompt', 'Describe the motion in at least 3 characters.')
  let imageUrl: string | null = null
  if (mode === 'i2v') {
    imageUrl = ownedClipImageUrl(rawImage, ctx.userId, ctx.supabaseUrl)
    if (!imageUrl) return bad('image', 'Upload your photo again — only photos uploaded to your own account can be used.', 403)
  }
  return {
    ok: true,
    request: { engine, mode, model, seconds, aspect, prompt: text || CLIP_DEFAULT_I2V_PROMPT, imageUrl },
  }
}

// ─── Payload da fal ──────────────────────────────────────────────────────────
// Só campos conferidos no schema oficial (ver o cabeçalho). Nada de negative_prompt/cfg herdados do filme: o clipe é o
// pedido do cliente, não o plano de cena da casa.
export function buildClipFalInput(req: ClipRequest): Record<string, unknown> {
  const s = req.seconds
  const image = req.mode === 'i2v' ? { image_url: req.imageUrl } : {}
  const aspect = req.aspect === 'image' ? null : req.aspect
  switch (req.engine) {
    case 'hollywood':
      return { prompt: req.prompt, ...image, duration: String(s), generate_audio: false, ...(req.mode === 't2v' && aspect ? { aspect_ratio: aspect } : {}) }
    case 'kling':
      return { prompt: req.prompt, ...image, duration: String(s), ...(req.mode === 't2v' && aspect ? { aspect_ratio: aspect } : {}) }
    case 'seedance':
      return { prompt: req.prompt, ...image, duration: String(s), resolution: '720p', generate_audio: false, aspect_ratio: aspect ?? 'auto' }
    case 'veo':
      return { prompt: req.prompt, ...image, duration: `${s}s`, resolution: '1080p', generate_audio: false, aspect_ratio: aspect ?? 'auto' }
    case 'h3':
      return { prompt: req.prompt, ...image, duration: s, resolution: '768P', ...(req.mode === 't2v' && aspect ? { aspect_ratio: aspect } : {}) }
    case 'omni':
      return { prompt: req.prompt, ...image, duration: s, aspect_ratio: aspect ?? '9:16' }
    case 's25':
      return { prompt: req.prompt, ...image, duration: String(s), resolution: '480p', generate_audio: false, aspect_ratio: aspect ?? 'auto' }
  }
}
