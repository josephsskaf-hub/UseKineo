type VerbatimSegment = {
  voiceover: string
  pexelsQuery: string
}

type VerbatimSource = {
  segments: VerbatimSegment[]
  narration: string
}

// ═══ KINEO-PARCEIRO-EYEBIBLE-1410 — a cena começa onde a FRASE começa ═══
// Robert (EyeBible, 14/10): 108 palavras em 7 blocos de 15-16 cortados no meio da frase ("…Enemy soldiers are getting closer. [KINEO-PARCEIRO-EYEBIBLE-1410]
// CAPTAIN Help me carry him They run" | "to their friend and lift him…"): a cena desenhava metade de uma ação e metade da outra. [KINEO-PARCEIRO-EYEBIBLE-1410]
// Agora cada corte ideal (o mesmo de antes: tamanhos equilibrados, o mesmo número de cenas, todas as palavras) escorrega até [KINEO-PARCEIRO-EYEBIBLE-1410]
// meia cena para o fim de frase mais próximo; sem frase no alcance, para a vírgula/ponto-e-vírgula; sem nenhum, fica onde estava. [KINEO-PARCEIRO-EYEBIBLE-1410]
// Texto sem pontuação sai byte a byte igual ao de antes. [KINEO-PARCEIRO-EYEBIBLE-1410]
const FIM_DE_FRASE = /[.!?…]["”»’')\]]*$/u // KINEO-PARCEIRO-EYEBIBLE-1410
const FIM_DE_ORACAO = /[,;:—–]["”»’')\]]*$/u // KINEO-PARCEIRO-EYEBIBLE-1410
function cortesNaFrase(words: string[], beatCount: number, baseSize: number, extra: number): number[] { // KINEO-PARCEIRO-EYEBIBLE-1410
  const n = words.length // KINEO-PARCEIRO-EYEBIBLE-1410
  const tol = Math.max(1, Math.floor(baseSize / 2)) // KINEO-PARCEIRO-EYEBIBLE-1410
  const cuts = [0] // KINEO-PARCEIRO-EYEBIBLE-1410
  let ideal = 0 // KINEO-PARCEIRO-EYEBIBLE-1410
  for (let k = 1; k < beatCount; k++) { // KINEO-PARCEIRO-EYEBIBLE-1410
    ideal += baseSize + (k - 1 < extra ? 1 : 0) // KINEO-PARCEIRO-EYEBIBLE-1410 — o corte de antes
    const lo = Math.max(cuts[k - 1] + 1, ideal - tol) // KINEO-PARCEIRO-EYEBIBLE-1410
    const hi = Math.min(n - (beatCount - k), ideal + tol) // KINEO-PARCEIRO-EYEBIBLE-1410 — sobra ao menos 1 palavra por cena
    const perto = (teste: RegExp): number | null => { // KINEO-PARCEIRO-EYEBIBLE-1410
      let melhor: number | null = null // KINEO-PARCEIRO-EYEBIBLE-1410
      for (let i = lo; i <= hi; i++) if (teste.test(words[i - 1]) && (melhor === null || Math.abs(i - ideal) < Math.abs(melhor - ideal))) melhor = i // KINEO-PARCEIRO-EYEBIBLE-1410
      return melhor // KINEO-PARCEIRO-EYEBIBLE-1410
    } // KINEO-PARCEIRO-EYEBIBLE-1410
    cuts.push(perto(FIM_DE_FRASE) ?? perto(FIM_DE_ORACAO) ?? Math.min(hi, Math.max(lo, ideal))) // KINEO-PARCEIRO-EYEBIBLE-1410
  } // KINEO-PARCEIRO-EYEBIBLE-1410
  cuts.push(n) // KINEO-PARCEIRO-EYEBIBLE-1410
  return cuts // KINEO-PARCEIRO-EYEBIBLE-1410
} // KINEO-PARCEIRO-EYEBIBLE-1410
/**
 * Resolve the visual beats for verbatim mode without changing the author's
 * spoken text. Marked scripts keep the historical first/last sampling policy;
 * clean prose is split into balanced word-boundary chunks.
 */
export function resolveVerbatimSegments(
  parsed: VerbatimSource,
  desiredCount: number,
): VerbatimSegment[] {
  const count = Number.isFinite(desiredCount)
    ? Math.max(1, Math.min(9, Math.trunc(desiredCount)))
    : 1

  if (parsed.segments.length > 0) {
    if (parsed.segments.length <= count) return parsed.segments
    if (count === 1) return [parsed.segments[0]]
    return Array.from({ length: count }, (_, index) =>
      parsed.segments[Math.round((index * (parsed.segments.length - 1)) / (count - 1))],
    )
  }

  const narration = (parsed.narration ?? '').trim().replace(/\s+/gu, ' ')
  if (!narration) return []

  const words = narration.split(' ')
  const beatCount = Math.min(count, words.length)
  const baseSize = Math.floor(words.length / beatCount)
  const extra = words.length % beatCount
  const cortes = cortesNaFrase(words, beatCount, baseSize, extra) // KINEO-PARCEIRO-EYEBIBLE-1410

  return Array.from({ length: beatCount }, (_, index) => {
    const voiceover = words.slice(cortes[index], cortes[index + 1]).join(' ') // KINEO-PARCEIRO-EYEBIBLE-1410 — o corte cai no fim da frase
    const visualWords = voiceover
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 24)

    return {
      voiceover,
      pexelsQuery: visualWords.join(' ') || 'cinematic documentary scene',
    }
  })
}
