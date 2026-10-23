// KINEO-ADS-CENA-SEGUE-2110 — quality is reviewable evidence, never a cancellation policy.
export interface AjusteQualityNote {
  stage: 'classification' | 'script' | 'keyframe' | 'voice' | 'preflight' | 'montage';
  code: string; message: string; score?: number; candidate?: number; slot?: number; round?: number; selected?: boolean; reasons?: string[];
}
export function addAjusteQuality(target: { quality_notes?: AjusteQualityNote[] }, note: AjusteQualityNote): void {
  const normalized = { ...note, message: note.message.slice(0, 1000), ...(note.reasons ? { reasons: note.reasons.map(r => r.slice(0, 300)) } : {}) }
  const notes = target.quality_notes ??= []
  if (!notes.some(existing => JSON.stringify(existing) === JSON.stringify(normalized))) notes.push(normalized)
  if (notes.length > 200) notes.splice(0, notes.length - 200)
}
