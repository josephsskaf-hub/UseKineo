// KINEO1-PRIMEIRO-FILME-VIDEO-2026-09-17 — VÍDEO gerado nas cenas fracas do primeiro filme (teto US$ 0,50).
//
// Fundador (16/09 noite): "todo primeiro vídeo eu quero poder gastar mais 50 centavos de dólar… para tornar
// as imagens melhores". A sessão de 16/09 leu "imagens" como foto e o primeiro filme virou slideshow.
// Fundador (17/09 madrugada): "era VÍDEO que era para ser melhor… colocar um pedaço de Seedance nas cenas
// fracas e fortalecer… max 0.5 teto!!".
//
// O que já existia e NUNCA chegou ao filme: o AI hook (lib/fastAiHook.ts) submete um Seedance de 5 s para a
// cena 1 do primeiro filme de conta gratuita e espera 15 s na rota do Kineo 1. A Seedance leva 60-120 s.
// Medido em 17/09: 0 de 142 filmes em 12 dias saíram com o hook ("budget exhausted (15000ms)" em todo log),
// e cada um foi PAGO. A espera certa é onde o tempo já existe: no /api/compose, que gera TTS + Whisper por
// 30-60 s antes de montar o filme.
//
// Desenho:
//   rota fast (primeiro filme + conta gratuita): submete os clipes (cena 1 + as N cenas mais fracas pelo
//     relevanceScore do plano) SEM esperar; grava o evento `fast_ai_clips_pending` (session_id =
//     generation_id) com request_id + posição de cada clipe no clip_urls entregue ao cliente.
//   compose (quality 'fast'): depois do TTS/Whisper lê o evento pelo generation_id + user_id (só o servidor
//     escreve), espera os clipes com um teto de tempo, copia para o nosso bucket e encaixa cada um ABRINDO a
//     sua cena (o stock segue nos cortes seguintes). Falha aberta em tudo: sem clipe, o filme é o de sempre.
//
// Orçamento (fal, Seedance 1.5 Pro, SEM áudio: US$ 1,2 por milhão de tokens; 720×1280×24 fps×5 s/1024 =
// 108k tokens = US$ 0,13/clipe; com áudio seria 0,26 — não usamos): 3 clipes = 0,39 + até 3 stills do
// híbrido (0,03 cada) = 0,48 ≤ 0,50.

import { fal } from '@fal-ai/client'
import { persistHookClip } from './fastAiHook'
import type { StyleAnchor } from '@/lib/cinematic/sceneStyle' // KINEO1-FILME-DESENHADO-2026-09-21 (só tipo)

export const FIRST_FILM_BUDGET_USD = 0.5
export const SEEDANCE_720P_5S_USD = 0.13
export const FIRST_FILM_STILL_USD = 0.03
/** Stills do híbrido no primeiro filme com clipes de IA: 3 × 0,03 = 0,09. */
export const FIRST_FILM_STILLS_WITH_CLIPS_MAX = 3
export const FIRST_FILM_AI_CLIPS_EVENT = 'fast_ai_clips_pending'
export const FIRST_FILM_AI_CLIPS_RESULT_EVENT = 'fast_ai_clips_result'
/** Teto de espera no compose (o TTS/Whisper já consumiu 30-60 s; a Seedance costuma fechar em 60-120 s). */
export const FIRST_FILM_AI_CLIPS_AWAIT_MS = 60_000
const SEEDANCE_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const POLL_MS = 2500
const FAL_URL_RE = /^https:\/\/([a-z0-9-]+\.)*fal\.(media|run|ai)\//i

/** Interruptor: KINEO_FIRST_FILM_AI_CLIPS=off desliga (nasce LIGADO — decisão do fundador 17/09). */
export const FIRST_FILM_AI_CLIPS_ENABLED = !['0', 'false', 'no', 'off'].includes(
  (process.env.KINEO_FIRST_FILM_AI_CLIPS ?? '').trim().toLowerCase(),
)

/** Quantos clipes Seedance cabem no teto, descontando a reserva de stills. */
export function firstFilmAiClipCount(stillsMax: number = FIRST_FILM_STILLS_WITH_CLIPS_MAX): number {
  const reserva = Math.max(0, stillsMax) * FIRST_FILM_STILL_USD
  const n = Math.floor((FIRST_FILM_BUDGET_USD - reserva) / SEEDANCE_720P_5S_USD + 1e-9)
  return Math.max(0, Math.min(3, n))
}

export interface SceneRelevance {
  scene: number
  relevance: number | null
}

/**
 * As N cenas mais fracas para receber clipe gerado. A cena 1 fica de fora (é o hook). Relevância
 * desconhecida vale 75 (neutra); se NENHUMA cena tem nota, escolhe cenas espalhadas pelo filme
 * (o meio e o fim, onde o stock costuma repetir). Empate → cena mais tardia primeiro (o final é
 * onde a pessoa decide se compartilha).
 */
export function pickWeakScenes(scenes: SceneRelevance[], count: number): number[] {
  const elig = scenes.filter((s) => s.scene > 1)
  if (count <= 0 || elig.length === 0) return []
  const temNota = elig.some((s) => typeof s.relevance === 'number')
  if (!temNota) {
    const n = elig.length
    const alvos = [Math.round(n * 0.5), n].map((k) => elig[Math.max(0, Math.min(n - 1, k - 1))].scene)
    return Array.from(new Set(alvos)).slice(0, count)
  }
  return [...elig]
    .sort((a, b) => (a.relevance ?? 75) - (b.relevance ?? 75) || b.scene - a.scene)
    .slice(0, count)
    .map((s) => s.scene)
    .sort((a, b) => a - b)
}

/** Prompt cinematográfico e sem rosto para a cena (mesma família do hook, com movimento de câmera explícito). */
export function buildSceneClipPrompt(description: string, voiceover: string, query: string, look?: StyleAnchor | null): string {
  // KINEO1-FILME-DESENHADO-2026-09-21 — pedido de desenho: o clipe nasce no look pedido (não "photorealistic") e o
  // personagem desenhado pode aparecer inteiro (a silhueta é regra de pessoa REAL; caso jonathanschwapp 21/09).
  if (look && look.look !== 'photoreal' && look.look !== 'noir') {
    const drawn = `${description || query || voiceover}`.replace(/\s+/g, ' ').trim().slice(0, 300)
    return (
      `${drawn}, ${look.lookPhrase}, gentle camera movement, soft lighting, high detail, ` +
      `no text, no captions, no logos, no real person's likeness${look.suffix}`
    )
  }
  const base = `${description || query || voiceover}`
    .replace(/\b(man|woman|person|people|guy|girl|boy|kid|child|influencer|model)\b/gi, 'distant silhouetted figure')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
  return (
    `${base}, cinematic shot, slow camera movement, photorealistic, dramatic lighting, ` +
    `high detail, no text, no captions, no logos, no recognizable human faces`
  )
}

export interface PendingAiClip {
  request_id: string
  scene: number
  /** Posição no clip_urls FINAL entregue ao cliente (o clipe entra ANTES desse índice). */
  at_index: number
  prompt: string
  usd: number
}

export interface ReadyAiClip {
  scene: number
  at_index: number
  url: string | null
  ms: number
}

/** Submete um clipe Seedance 5 s 720p sem áudio. Nunca lança; null = não submeteu. */
export async function submitSceneClip(prompt: string): Promise<string | null> {
  try {
    const falKey = process.env.FAL_KEY
    if (!falKey) return null
    fal.config({ credentials: falKey })
    const { request_id } = await fal.queue.submit(SEEDANCE_MODEL, {
      input: { prompt, aspect_ratio: '9:16', resolution: '720p', duration: '5', generate_audio: false },
    })
    return request_id || null
  } catch (err) {
    console.warn('[ai-clips] submit failed (non-blocking):', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Espera os clipes pendentes até o teto de tempo (compartilhado), copia cada um para o nosso bucket e devolve
 * a URL durável (ou null). Nunca lança. Um clipe que não chega no tempo fica de fora — o stock cobre a cena.
 */
export async function awaitPendingAiClips(pending: PendingAiClip[], budgetMs = FIRST_FILM_AI_CLIPS_AWAIT_MS): Promise<ReadyAiClip[]> {
  const falKey = process.env.FAL_KEY
  if (!falKey || pending.length === 0) return pending.map((p) => ({ scene: p.scene, at_index: p.at_index, url: null, ms: 0 }))
  fal.config({ credentials: falKey })
  const t0 = Date.now()
  const deadline = t0 + budgetMs
  return Promise.all(
    pending.map(async (p): Promise<ReadyAiClip> => {
      try {
        while (Date.now() < deadline) {
          const status = await fal.queue.status(SEEDANCE_MODEL, { requestId: p.request_id, logs: false })
          if (status.status === 'COMPLETED') {
            const result = await fal.queue.result(SEEDANCE_MODEL, { requestId: p.request_id })
            const falUrl = (result?.data as { video?: { url?: string } } | undefined)?.video?.url ?? null
            if (!falUrl) return { scene: p.scene, at_index: p.at_index, url: null, ms: Date.now() - t0 }
            const durable = await persistHookClip(falUrl, 20_000, 'ai-scene')
            const ok = durable && !FAL_URL_RE.test(durable) ? durable : null
            return { scene: p.scene, at_index: p.at_index, url: ok, ms: Date.now() - t0 }
          }
          await new Promise((r) => setTimeout(r, POLL_MS))
        }
      } catch (err) {
        console.warn(`[ai-clips] await scene=${p.scene} failed (non-blocking):`, err instanceof Error ? err.message : String(err))
      }
      return { scene: p.scene, at_index: p.at_index, url: null, ms: Date.now() - t0 }
    }),
  )
}

/**
 * Encaixa os clipes prontos ABRINDO a sua cena: cada um entra antes de `at_index` (índice do clip_urls
 * ORIGINAL). Ordem crescente de índice; o deslocamento dos anteriores é somado. Clipes sem URL são ignorados.
 */
export function spliceAiClips(clipUrls: string[], ready: ReadyAiClip[]): string[] {
  const out = [...clipUrls]
  const prontos = ready.filter((r) => !!r.url).sort((a, b) => a.at_index - b.at_index)
  let shift = 0
  for (const r of prontos) {
    const at = Math.max(0, Math.min(out.length, r.at_index + shift))
    out.splice(at, 0, r.url as string)
    shift++
  }
  return out
}

/** Forma do evento pendente (validação do que vem do banco). */
export function parsePendingAiClips(raw: unknown): PendingAiClip[] {
  const m = raw && typeof raw === 'object' ? (raw as { clips?: unknown }) : null
  if (!m || !Array.isArray(m.clips)) return []
  const out: PendingAiClip[] = []
  for (const c of m.clips) {
    if (!c || typeof c !== 'object') continue
    const o = c as Record<string, unknown>
    if (typeof o.request_id !== 'string' || !o.request_id) continue
    if (typeof o.scene !== 'number' || typeof o.at_index !== 'number') continue
    out.push({ request_id: o.request_id, scene: o.scene, at_index: o.at_index, prompt: typeof o.prompt === 'string' ? o.prompt : '', usd: typeof o.usd === 'number' ? o.usd : SEEDANCE_720P_5S_USD })
  }
  return out.slice(0, 3)
}
