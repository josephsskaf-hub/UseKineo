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
/** Order ownership stays with the existing GET routes; old engines keep their exact response shape. */
export function ajusteReviewOf(stored: unknown): { narration_used?: string; quality_notes?: AjusteQualityNote[] } {
  const state = stored && typeof stored === 'object' ? (stored as { cena?: { plan?: { ajusteLive?: { version?: string }; script?: { narration?: string }; quality_notes?: AjusteQualityNote[] }; quality_notes?: AjusteQualityNote[] } }).cena : undefined
  if (state?.plan?.ajusteLive?.version !== 'KINEO-ADS-CENA-RETOMADA-2110') return {}
  const target: { quality_notes?: AjusteQualityNote[] } = { quality_notes: [] }
  for (const note of [...(state.plan.quality_notes ?? []), ...(state.quality_notes ?? [])]) addAjusteQuality(target, note)
  return { narration_used: state.plan.script?.narration ?? '', quality_notes: target.quality_notes }
}
