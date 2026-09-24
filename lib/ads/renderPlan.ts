// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — qual mídia aparece em cada tomada do anúncio. Módulo PURO.
//
// O montador do Kineo 1 (lib/compose buildCreatomateSource, quality 'fast', trava 8.2 — só chamado) corta o filme em
// tomadas de 2,5-4,5 s, encaixa o corte no começo de frase da narração e GIRA a lista de clipes (tomada i mostra
// clip_urls[i % n]). Ele não conhece batidas. Então o servidor faz o caminho inverso: simula o montador com URLs
// falsas para saber onde cada tomada cai no tempo, descobre em que batida da narração está o meio de cada tomada e
// escreve a lista de clipes tomada a tomada — a foto da batida 2 aparece enquanto a batida 2 é falada, e o cartão
// final aparece na última batida. A lista tem folga no fim (repete o cartão), então nunca "dá a volta" e mostra a
// primeira foto de novo no fim.

export interface PlanSlot {
  time: number
  duration: number
}
export interface PlanMedia {
  url: string
  kind: 'image' | 'video'
}

/** Tempo de início de cada batida, pela fração de palavras já faladas, mapeada nas palavras que o Whisper ouviu.
 *  Sem palavras (Whisper falhou): proporção das palavras sobre a duração total. Nunca decresce. */
export function beatStartTimes(beatWordCounts: readonly number[], words: readonly { start: number }[], totalSeconds: number): number[] {
  const n = beatWordCounts.length
  if (n === 0) return []
  const total = beatWordCounts.reduce((a, b) => a + Math.max(0, b), 0)
  const starts: number[] = [0]
  let cum = 0
  for (let i = 1; i < n; i++) {
    cum += Math.max(0, beatWordCounts[i - 1])
    const frac = total > 0 ? cum / total : i / n
    let t: number
    if (words.length > 0) {
      const idx = Math.min(words.length - 1, Math.max(0, Math.round(frac * words.length)))
      t = Number(words[idx]?.start) || 0
    } else {
      t = frac * totalSeconds
    }
    starts.push(Math.max(starts[i - 1], t))
  }
  return starts
}

/** A batida em que cai o instante `t`: a última cujo início é <= t. */
export function beatAt(t: number, starts: readonly number[]): number {
  let b = 0
  for (let i = 0; i < starts.length; i++) if (starts[i] <= t) b = i
  return b
}

/** Tamanho da lista de clipes: com n > total/2,5 o montador trava a tomada no mínimo (2,5 s) e o número de
 *  tomadas não depende de n — a lista nunca é menor que o número de tomadas (não gira). */
export function adsClipListLength(totalSeconds: number): number {
  return Math.floor(Math.max(5, totalSeconds) / 2.5) + 2
}

/** Duração da linha do tempo que o montador vai usar (espelho de buildCreatomateSource: a voz real manda, 5-90 s,
 *  e pedido >= 60 s nunca sai abaixo de 61,5 s). Só dimensiona a lista; a posição das tomadas vem da simulação. */
export function adsTimelineSeconds(narrationSeconds: number, requestedSeconds: number): number {
  const master = narrationSeconds > 4 && narrationSeconds < 120 ? narrationSeconds : requestedSeconds
  let total = Math.min(90, Math.max(5, Math.ceil(master * 10) / 10))
  if (requestedSeconds >= 60 && total < 61.5) total = 61.5
  return total
}

/** A lista de clipes, tomada a tomada. `beatMedia[i]` = mídia da batida i (todas menos a do cartão, que é a última
 *  batida). Fotos giram dentro da batida; um vídeo entra no máximo uma vez por batida (repetir reinicia o clipe do
 *  zero e parece gagueira), a não ser que a batida só tenha vídeo. Folga final = cartão. */
export function planClipUrls(opts: {
  slots: readonly PlanSlot[]
  beatStarts: readonly number[]
  beatMedia: readonly (readonly PlanMedia[])[]
  cardUrl: string
  listLength: number
}): string[] {
  const { slots, beatStarts, beatMedia, cardUrl } = opts
  const cardBeat = beatMedia.length // a batida do cartão é a seguinte à última com mídia
  const cursor = new Map<number, number>()
  const videoUsed = new Map<number, Set<string>>()
  const out: string[] = []
  for (const s of slots) {
    const mid = s.time + Math.max(0, s.duration) / 2
    const b = Math.min(beatAt(mid, beatStarts), cardBeat)
    if (b >= cardBeat) {
      out.push(cardUrl)
      continue
    }
    const list = beatMedia[b] ?? []
    if (list.length === 0) {
      out.push(cardUrl)
      continue
    }
    const used = videoUsed.get(b) ?? new Set<string>()
    const hasImage = list.some((m) => m.kind === 'image')
    let k = cursor.get(b) ?? 0
    let pick: PlanMedia | null = null
    for (let tries = 0; tries < list.length; tries++) {
      const m = list[(k + tries) % list.length]
      if (m.kind === 'video' && used.has(m.url) && hasImage) continue
      pick = m
      k = k + tries + 1
      break
    }
    if (!pick) {
      pick = list[k % list.length]
      k += 1
    }
    cursor.set(b, k)
    if (pick.kind === 'video') used.add(pick.url)
    videoUsed.set(b, used)
    out.push(pick.url)
  }
  while (out.length < opts.listLength) out.push(cardUrl)
  return out
}
