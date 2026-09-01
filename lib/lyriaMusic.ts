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

function lyriaPromptFor(mood: MusicMood): string {
  return `${MOOD_PROMPTS[mood]}. Instrumental only — absolutely no vocals, no singing, no spoken words. Background music bed for a narrated short documentary video, consistent energy, no abrupt stops.`
}

/**
 * Gera a trilha do vídeo com o Lyria 3 Pro. Devolve a URL do MP3 na CDN da
 * fal, ou null para o chamador cair no Pixabay. Nunca lança.
 */
export async function getLyriaMusicUrl(
  niche: string | null | undefined,
  moodOverride?: MusicMood,
): Promise<string | null> {
  try {
    const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
    if (!falKey) return null

    const mood = moodOverride ?? resolveMusicMood(niche)
    const deadline = Date.now() + LYRIA_BUDGET_MS

    const submit = await fetchComPrazo(LYRIA_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: lyriaPromptFor(mood) }),
    }, 10_000)
    if (!submit.ok) {
      console.warn(`[lyria] submit http ${submit.status} — caindo no Pixabay`)
      return null
    }
    const sub = (await submit.json()) as { request_id?: string; status_url?: string; response_url?: string }
    if (!sub.request_id) return null
    const statusUrl = sub.status_url ?? `${LYRIA_ENDPOINT}/requests/${sub.request_id}/status`
    const responseUrl = sub.response_url ?? `${LYRIA_ENDPOINT}/requests/${sub.request_id}`

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      const st = await fetchComPrazo(statusUrl, { headers: { Authorization: `Key ${falKey}` } }, 8_000)
      if (!st.ok) continue
      const stJson = (await st.json()) as { status?: string }
      if (stJson.status === 'COMPLETED') {
        const res = await fetchComPrazo(responseUrl, { headers: { Authorization: `Key ${falKey}` } }, 8_000)
        if (!res.ok) return null
        const out = (await res.json()) as { audio?: { url?: string } }
        const url = out.audio?.url
        if (typeof url === 'string' && url.startsWith('https://')) {
          console.log(`[lyria] trilha pronta mood=${mood}`)
          return url
        }
        return null
      }
    }
    console.warn(`[lyria] estourou o prazo de ${LYRIA_BUDGET_MS}ms — caindo no Pixabay (o job fica na fila da fal, sem cobrança extra nossa)`)
    return null
  } catch (e) {
    console.warn('[lyria] non-fatal:', e instanceof Error ? e.message : String(e))
    return null
  }
}

async function fetchComPrazo(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctl.signal })
  } finally {
    clearTimeout(timer)
  }
}
