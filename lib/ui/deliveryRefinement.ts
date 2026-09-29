import type { DownloadOutcome } from '@/lib/videoDownload'

export function downloadOutcomeMessage(outcome: DownloadOutcome | null): string {
  switch (outcome) {
    case 'blob': return 'Download started'
    case 'fallback_opened': return 'File opened in another tab. Save it there.'
    case 'popup_blocked': return 'Your browser blocked the download. Use the recovery link.'
    case 'unavailable': return 'This file is no longer available.'
    case 'coalesced': return 'This file is already downloading.'
    default: return 'Download could not be confirmed. Please try again.'
  }
}

export type FilmVersion = 'original' | 'enhanced'
export function filmSource(original: string | null, enhanced: string | undefined, choice?: FilmVersion) {
  return choice === 'original' ? original : enhanced || original
}

export interface ComparablePlan {
  narration: string | null
  overlays: { role: string; start: number; end: number; text: string }[]
  shots: { idx: number; role: string; kind: string; source: string; cut_seconds: number; photo: string | null; beat?: string }[]
}
export function planChanges(before: ComparablePlan, after: ComparablePlan) {
  const indices = [...new Set([...before.shots, ...after.shots].map(s => s.idx))].sort((a,b) => a-b)
  return {
    narration: (before.narration ?? '') !== (after.narration ?? ''),
    overlays: JSON.stringify(before.overlays) !== JSON.stringify(after.overlays),
    shots: indices.filter(idx => {
      const normalize = (p: ComparablePlan) => {
        const s = p.shots.find(v => v.idx === idx)
        return s ? [s.role,s.kind,s.source,s.cut_seconds,s.photo,s.beat ?? ''] : null
      }
      return JSON.stringify(normalize(before)) !== JSON.stringify(normalize(after))
    }),
  }
}
