// KINEO-FILME15-PERFEITO-2610 — narration length planning only.
/** The existing scene writer can be followed by filters that remove whole sentences.
 * Recheck the accepted narration before buying footage; only AI narration may receive
 * an appended sentence. The author's words are never rewritten or cut. */
export function planoDeAcrescimo15(falas: readonly string[], wordsOf: (text: string) => number, wordsPerSecond: number): { index: number; text: string; addWords: number; maxWords: number }[] {
  if (!falas.length || !Number.isFinite(wordsPerSecond) || wordsPerSecond <= 0) return []
  const counts = falas.map(wordsOf)
  const total = counts.reduce((sum, count) => sum + count, 0)
  if (total / wordsPerSecond >= 14) return []
  const index = counts.indexOf(Math.min(...counts))
  const addWords = Math.max(3, Math.ceil(15 * wordsPerSecond) - total)
  return [{ index, text: falas[index], addWords, maxWords: counts[index] + addWords + 3 }]
}

/** Admit only an append to the exact accepted line. A model rewrite is rejected. */
export function aceitarAcrescimo15(base: string, candidate: string | null | undefined): string {
  if (typeof candidate !== 'string') return base
  const original = base.trim()
  const appended = candidate.startsWith(`${original} `) || (!/[.!?…]$/.test(original) && candidate.startsWith(`${original}. `))
  return original.length > 0 && appended ? candidate : base
}
