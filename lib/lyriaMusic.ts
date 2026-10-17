// KINEO-MOTORES-D1-2026-09-01 — Lyria 3 Pro: trilha sonora GERADA por tema,
// no lugar da biblioteca Pixabay, pelo MESMO slot de mix que já existe.
//
// POR QUE ESTE MOTOR. Temos 4 motores de fala e zero de música. Todo render
// já sai com trilha de fundo (Pixabay) mixada pelo Creatomate — ou seja, o
// encanamento de mix EXISTE; o que falta é a trilha ser feita PARA o vídeo
// em vez de escolhida numa prateleira de 6 humores. O Lyria 3 Pro (Google) é
// o nº 1 do text-to-music da fal (Elo 1.118) e custa US$ 0,08 por faixa de
// até 3 minutos — 0,7% do custo de um render de Kling 3.
//
// SCHEMA CONFERIDO no OpenAPI da fal em 01/09 (lição da casa: parâmetro não
// documentado NÃO existe): input = { prompt (obrigatório, ≤5000) } — SEM
// duração, SEM seed, negative_prompt deprecado; output = { audio: { url }
// (obrigatório, MP3 44.1kHz/192kbps), lyrics }. Marca SynthID invisível.
//
// DESENHO DE FALHA (a regra que fez o Pixabay sobreviver a 2 meses): tudo
// aqui é BEST-EFFORT com prazo. Timeout, erro, chave ausente, resposta sem
// URL → devolve null e o chamador cai no Pixabay de sempre. O pior caso da
// feature é o produto de ontem. NUNCA lançar exceção para fora.
//
// A faixa é INSTRUMENTAL por instrução explícita no prompt: a narração é o
// trilho mestre (C1) e vocal competindo com voz é defeito, não feature.

import { resolveMusicMood, type MusicMood } from '@/lib/pixabayMusic'
import { musicEmotionPrompt, type MusicDirection } from '@/lib/musicDirection'

const LYRIA_ENDPOINT = 'https://queue.fal.run/fal-ai/lyria3/pro'

// Quanto tempo esperamos pela música antes de desistir e usar Pixabay. O
// compose inteiro tem teto de minutos; a trilha não pode ser o gargalo.
const LYRIA_BUDGET_MS = 45_000
const POLL_INTERVAL_MS = 2_500

// Tradução do humor da casa (já derivado do nicho pelo resolveMusicMood) em
// direção musical concreta — gênero, andamento e instrumentação, como a doc
// do Lyria recomenda. Sempre fecha com a exigência de instrumental.
const MOOD_PROMPTS: Record<MusicMood, string> = {
  suspense:
    'Dark cinematic underscore, slow pulsing low strings and deep sub-bass drones, sparse ticking percussion, rising tension swells, 70 BPM, minor key',
  epic:
    'Epic cinematic trailer score, powerful full orchestra with thundering taiko drums and soaring brass, builds from quiet to massive, 110 BPM',
  hustle:
    'Confident modern hip-hop instrumental, punchy 808 bass, crisp hi-hats, dark piano motif, head-nodding groove, 92 BPM',
  tech:
    'Sleek minimal electronic underscore, clean synth arpeggios, soft four-on-the-floor pulse, futuristic and precise, 100 BPM',
  emotional:
    'Intimate emotional underscore, soft felt piano and warm string pads, slow build with gentle swells, 72 BPM, bittersweet major-minor',
  nature:
    'Organic ambient documentary underscore, airy pads, light acoustic textures, subtle hand percussion, spacious and awe-filled, 80 BPM',
}

// KINEO-FILME-RAPIDO-1710 — exportado: o aquecimento do clique (lib/audioNoCliqueServer) pede a trilha com o MESMO
// prompt que a montagem pediria, e a montagem só reaproveita a faixa quando o prompt bate (lib/audioNoClique).
export function lyriaPromptFor(mood: MusicMood, direction?: MusicDirection): string {
  const emotionalDirection = direction ? musicEmotionPrompt(direction) : ''
  return `${emotionalDirection || MOOD_PROMPTS[mood]}. Instrumental only — absolutely no vocals, no singing, no spoken words. Quiet background music beneath narration, no competing lead melody, consistent restrained energy, no abrupt stops.`
}

/**
 * Gera a trilha do vídeo com o Lyria 3 Pro. Devolve a URL do MP3 na CDN da
 * fal, ou null para o chamador cair no Pixabay. Nunca lança.
 */
export async function getLyriaMusicUrl(
  niche: string | null | undefined,
  moodOverride?: MusicMood,
  direction?: MusicDirection,
): Promise<string | null> {
  try {
    if (direction?.enabled === false) return null
    const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
    if (!falKey) return null

    const mood = moodOverride ?? resolveMusicMood(niche)
    const deadline = Date.now() + LYRIA_BUDGET_MS

    // KINEO-FILME-RAPIDO-1710 — o mesmo POST e a mesma espera de sempre, agora em duas metades reaproveitáveis.
    const handle = await submeterLyria(lyriaPromptFor(mood, direction))
    if (!handle) return null
    const url = await esperarLyria(handle, deadline)
    if (url) console.log(`[lyria] trilha pronta mood=${mood}`)
    else if (Date.now() >= deadline) console.warn(`[lyria] estourou o prazo de ${LYRIA_BUDGET_MS}ms — caindo no Pixabay (o job fica na fila da fal, sem cobrança extra nossa)`)
    return url
  } catch {
    // Provider/network error strings can echo user prompts or signed asset URLs.
    console.warn('[lyria] non-fatal; using compatible fallback')
    return null
  }
}

/** O job da trilha na fila da fal: com ele, quem chegar depois espera o MESMO job (sem pagar outro). */
export type LyriaHandle = { requestId: string; statusUrl: string; responseUrl: string }

/** KINEO-FILME-RAPIDO-1710 — o POST da trilha (o mesmo de sempre). null = sem chave, recusa ou erro. Nunca lança. */
export async function submeterLyria(prompt: string): Promise<LyriaHandle | null> {
  try {
    const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
    if (!falKey) return null
    const submit = await fetchComPrazo(LYRIA_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    }, 10_000)
    if (!submit.ok) {
      console.warn(`[lyria] submit http ${submit.status} — caindo no Pixabay`)
      return null
    }
    const sub = (await submit.json()) as { request_id?: string; status_url?: string; response_url?: string }
    if (!sub.request_id) return null
    return {
      requestId: sub.request_id,
      statusUrl: sub.status_url ?? `${LYRIA_ENDPOINT}/requests/${sub.request_id}/status`,
      responseUrl: sub.response_url ?? `${LYRIA_ENDPOINT}/requests/${sub.request_id}`,
    }
  } catch {
    console.warn('[lyria] submit non-fatal; using compatible fallback')
    return null
  }
}

/**
 * KINEO-FILME-RAPIDO-1710 — espera o job até `deadlineMs` (relógio absoluto), consultando a cada 2,5 s como sempre.
 * URL do MP3 ou null (prazo, erro, resposta sem URL). Nunca lança.
 */
export async function esperarLyria(handle: LyriaHandle, deadlineMs: number): Promise<string | null> {
  try {
    const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
    if (!falKey) return null
    while (Date.now() < deadlineMs) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      const st = await fetchComPrazo(handle.statusUrl, { headers: { Authorization: `Key ${falKey}` } }, 8_000)
      if (!st.ok) continue
      const stJson = (await st.json()) as { status?: string }
      if (stJson.status === 'COMPLETED') {
        const res = await fetchComPrazo(handle.responseUrl, { headers: { Authorization: `Key ${falKey}` } }, 8_000)
        if (!res.ok) return null
        const out = (await res.json()) as { audio?: { url?: string } }
        const url = out.audio?.url
        return typeof url === 'string' && url.startsWith('https://') ? url : null
      }
    }
    return null
  } catch {
    console.warn('[lyria] wait non-fatal; using compatible fallback')
    return null
  }
}

/** O orçamento de espera da trilha na montagem (o mesmo de sempre), para quem espera o job do aquecimento. */
export const LYRIA_WAIT_BUDGET_MS = LYRIA_BUDGET_MS

async function fetchComPrazo(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctl.signal })
  } finally {
    clearTimeout(timer)
  }
}
