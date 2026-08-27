type VerbatimSegment = {
  voiceover: string
  pexelsQuery: string
}

type VerbatimSource = {
  segments: VerbatimSegment[]
  narration: string
}

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
  let offset = 0

  return Array.from({ length: beatCount }, (_, index) => {
    const size = baseSize + (index < extra ? 1 : 0)
    const voiceover = words.slice(offset, offset + size).join(' ')
    offset += size
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
