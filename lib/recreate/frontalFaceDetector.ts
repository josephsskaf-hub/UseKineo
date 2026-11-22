/* Pico cascade evaluation adapted from Nenad Markus's picojs (MIT).
   License and pinned cascade are in public/models/recreate. */
type Candidate = { row: number; column: number; side: number; score: number }

export function readFrontalFaceCascade(buffer: ArrayBuffer) {
  if (buffer.byteLength < 16) throw new Error('Invalid face cascade.')
  const data = new DataView(buffer)
  const depth = data.getInt32(8, true)
  const treeCount = data.getInt32(12, true)
  if (depth !== 6 || treeCount !== 468) throw new Error('Unexpected face cascade.')
  const leaves = 2 ** depth
  const treeBytes = leaves * 8
  if (16 + treeCount * treeBytes !== buffer.byteLength) throw new Error('Incomplete face cascade.')
  const codes = new Int8Array(buffer)
  const values = new Float32Array(treeCount * leaves)
  const thresholds = new Float32Array(treeCount)
  for (let tree = 0; tree < treeCount; tree++) {
    const leafStart = 16 + tree * treeBytes + (leaves - 1) * 4
    for (let i = 0; i < leaves; i++) values[tree * leaves + i] = data.getFloat32(leafStart + i * 4, true)
    thresholds[tree] = data.getFloat32(leafStart + leaves * 4, true)
  }

  return (pixels: Uint8Array, stride: number, row: number, column: number, side: number): number => {
    // The trained offsets are in units of 1/256 of the scan window.
    const r = row * 256
    const c = column * 256
    let score = 0
    for (let tree = 0; tree < treeCount; tree++) {
      const start = 16 + tree * treeBytes - 4
      let node = 1
      for (let level = 0; level < depth; level++) {
        const offset = start + node * 4
        const a = ((r + codes[offset] * side) >> 8) * stride + ((c + codes[offset + 1] * side) >> 8)
        const b = ((r + codes[offset + 2] * side) >> 8) * stride + ((c + codes[offset + 3] * side) >> 8)
        node = node * 2 + Number(pixels[a] <= pixels[b])
      }
      score += values[tree * leaves + node - leaves]
      if (score <= thresholds[tree]) return -1
    }
    return score - thresholds[treeCount - 1]
  }
}

export function detectFrontalFaceWidth(pixels: Uint8Array, width: number, height: number, classify: ReturnType<typeof readFrontalFaceCascade>): number | null {
  const candidates: Candidate[] = []
  for (let scale = 20; scale <= Math.min(width, height); scale *= 1.12) {
    const side = Math.floor(scale)
    const step = Math.max(2, Math.floor(side * 0.12))
    const margin = Math.floor(side / 2) + 1
    for (let row = margin; row < height - margin; row += step) {
      for (let column = margin; column < width - margin; column += step) {
        const score = classify(pixels, width, row, column, side)
        if (score > 0) candidates.push({ row, column, side, score })
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score)
  const strongest = candidates[0]
  if (!strongest) return null
  let weightedWidth = 0
  let confidence = 0
  for (const candidate of candidates) {
    const half = (strongest.side + candidate.side) / 2
    const overlapX = Math.max(0, Math.min(candidate.side, strongest.side, half - Math.abs(candidate.column - strongest.column)))
    const overlapY = Math.max(0, Math.min(candidate.side, strongest.side, half - Math.abs(candidate.row - strongest.row)))
    const intersection = overlapX * overlapY
    if (intersection / (candidate.side ** 2 + strongest.side ** 2 - intersection) < 0.2) continue
    weightedWidth += candidate.side * candidate.score
    confidence += candidate.score
  }
  return confidence >= 5 ? weightedWidth / confidence : null
}
