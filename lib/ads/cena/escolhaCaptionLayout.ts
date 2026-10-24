// KINEO-ADS-ESCOLHA-PUBLICO-2410 — use observed preview geometry, never a category-based guessed product position.
export type EscolhaBox = [number, number, number, number]
export interface EscolhaCaptionGrounding {
  source: 'preview_judge'; imageUrl: string; product: EscolhaBox[]; face: EscolhaBox[];
}
function boxes(raw: unknown): EscolhaBox[] {
  if (!Array.isArray(raw) || raw.length > 8) return []
  const valid = raw.every(box => Array.isArray(box) && box.length === 4 && box.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1) && box[0] < box[2] && box[1] < box[3])
  return valid ? raw as EscolhaBox[] : []
}
/** The same existing image judge observes image3; these boxes never pretend to measure later moving video frames. */
export function parseEscolhaGrounding(raw: unknown, imageUrl: string): EscolhaCaptionGrounding | undefined {
  try {
    const r = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { product_boxes?: unknown; face_boxes?: unknown } | null
    const product = boxes(r?.product_boxes), face = boxes(r?.face_boxes)
    return product.length ? { source: 'preview_judge', imageUrl, product, face } : undefined
  } catch { return undefined }
}
/** Full caption rectangle, including stroke/shadow clearance, fits in an observed empty vertical interval. */
export function escolhaCaptionLayout(preferred: 'top' | 'bottom', grounding?: EscolhaCaptionGrounding, height = 204, targetPercent?: number): { center: number; height: number } | null {
  if (grounding?.source !== 'preview_judge' || !boxes(grounding.product).length) return null
  if (!(Number.isFinite(height) && height > 0)) return null
  const half = height / 1920 / 2, margin = 0.025
  const occupied = [...boxes(grounding.product), ...boxes(grounding.face)]
    .filter(box => box[2] + margin > 0.08 && box[0] - margin < 0.92)
    .map(box => [Math.max(0.06, box[1] - margin), Math.min(0.94, box[3] + margin)] as [number, number])
    .filter(([start, end]) => start < end).sort((a, b) => a[0] - b[0])
  const gaps: [number, number][] = []; let cursor = 0.06
  for (const [start, end] of occupied) { if (start > cursor) gaps.push([cursor, start]); cursor = Math.max(cursor, end) }
  if (cursor < 0.94) gaps.push([cursor, 0.94])
  const target = typeof targetPercent === 'number' && Number.isFinite(targetPercent) && targetPercent >= 0 && targetPercent <= 100 ? targetPercent / 100 : preferred === 'top' ? 0.62 : 0.70
  const centers = gaps.filter(([start, end]) => end - start >= half * 2).map(([start, end]) => Math.max(start + half, Math.min(end - half, target)))
  centers.sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b)
  return centers.length ? { center: centers[0] * 100, height } : null
}
