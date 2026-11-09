// Existing Put your face in it and two-photo effect recipes, reused without changing the public /clips client.
export async function compressPhoto(file: File, remix = false): Promise<File> { // KINEO-ROSTO-QUADRO-CHAVE-2810 — + remix: a foto do rosto SEMPRE é normalizada
  // Mesmo tratamento do /animate: o upload aceita JPG/PNG ≤ 8 MB; webp ou foto grande vira JPEG ≤ 1600 px.
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — no remix ("Put your face in it") a foto passa SEMPRE pelo canvas: selfie de celular (7,5 MB PNG,
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — barras pretas em cima e embaixo) vira JPEG ≤ 1600 px sem o letterbox — é o que a fal recebe.
  const needs = remix || file.size >= 2 * 1024 * 1024 || !/^image\/(jpeg|png)$/.test(file.type) // KINEO-ROSTO-QUADRO-CHAVE-2810
  if (!needs) return file
  try {
    const bitmap = await createImageBitmap(file)
    const box = remix ? letterboxCrop(bitmap) : { x: 0, y: 0, w: bitmap.width, h: bitmap.height } // KINEO-ROSTO-QUADRO-CHAVE-2810
    const scale = Math.min(1, 1600 / Math.max(box.w, box.h)) // KINEO-ROSTO-QUADRO-CHAVE-2810 — era bitmap.width/height
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(box.w * scale) // KINEO-ROSTO-QUADRO-CHAVE-2810
    canvas.height = Math.round(box.h * scale) // KINEO-ROSTO-QUADRO-CHAVE-2810
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, box.x, box.y, box.w, box.h, 0, 0, canvas.width, canvas.height) // KINEO-ROSTO-QUADRO-CHAVE-2810 — recorte de origem
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

function letterboxCrop(bitmap: ImageBitmap): { x: number; y: number; w: number; h: number } { // KINEO-ROSTO-QUADRO-CHAVE-2810
  const full = { x: 0, y: 0, w: bitmap.width, h: bitmap.height } // KINEO-ROSTO-QUADRO-CHAVE-2810
  try { // KINEO-ROSTO-QUADRO-CHAVE-2810
    const sw = Math.min(256, bitmap.width), sh = Math.max(1, Math.round(bitmap.height * (sw / bitmap.width))) // KINEO-ROSTO-QUADRO-CHAVE-2810
    const c = document.createElement('canvas'); c.width = sw; c.height = sh // KINEO-ROSTO-QUADRO-CHAVE-2810
    const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) return full // KINEO-ROSTO-QUADRO-CHAVE-2810
    ctx.drawImage(bitmap, 0, 0, sw, sh) // KINEO-ROSTO-QUADRO-CHAVE-2810
    const px = ctx.getImageData(0, 0, sw, sh).data // KINEO-ROSTO-QUADRO-CHAVE-2810
    const dark = (row: number) => { // KINEO-ROSTO-QUADRO-CHAVE-2810
      let sum = 0, max = 0 // KINEO-ROSTO-QUADRO-CHAVE-2810
      for (let x = 0; x < sw; x++) { const i = (row * sw + x) * 4; const l = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000; sum += l; if (l > max) max = l } // KINEO-ROSTO-QUADRO-CHAVE-2810
      return sum / sw < 18 && max < 40 // KINEO-ROSTO-QUADRO-CHAVE-2810
    } // KINEO-ROSTO-QUADRO-CHAVE-2810
    let top = 0; while (top < sh && dark(top)) top++ // KINEO-ROSTO-QUADRO-CHAVE-2810
    let bottom = 0; while (bottom < sh - top && dark(sh - 1 - bottom)) bottom++ // KINEO-ROSTO-QUADRO-CHAVE-2810
    const ok = (n: number) => n >= sh * 0.02 && n <= sh * 0.45 // KINEO-ROSTO-QUADRO-CHAVE-2810
    const t = ok(top) ? top : 0, b = ok(bottom) ? bottom : 0 // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (!t && !b) return full // KINEO-ROSTO-QUADRO-CHAVE-2810
    const k = bitmap.height / sh // KINEO-ROSTO-QUADRO-CHAVE-2810
    const y = Math.round(t * k), h = Math.max(1, Math.round(bitmap.height - (t + b) * k)) // KINEO-ROSTO-QUADRO-CHAVE-2810
    return { x: 0, y, w: bitmap.width, h } // KINEO-ROSTO-QUADRO-CHAVE-2810
  } catch { return full } // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

export async function cropFace(file: File): Promise<File | null> { // KINEO-ROSTO-QUADRO-CHAVE-2810
  try { // KINEO-ROSTO-QUADRO-CHAVE-2810
    const bitmap = await createImageBitmap(file) // KINEO-ROSTO-QUADRO-CHAVE-2810
    const W = bitmap.width, H = bitmap.height // KINEO-ROSTO-QUADRO-CHAVE-2810
    let side = Math.round(Math.min(W, H * 0.55)), cx = W / 2, cy = Math.round(H * 0.04) + side / 2 // KINEO-ROSTO-QUADRO-CHAVE-2810 — heurística de selfie
    const FD = (window as unknown as { FaceDetector?: new (o: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect(i: ImageBitmap): Promise<Array<{ boundingBox: { x: number; y: number; width: number; height: number } }>> } }).FaceDetector // KINEO-ROSTO-QUADRO-CHAVE-2810
    if (FD) { // KINEO-ROSTO-QUADRO-CHAVE-2810
      try { // KINEO-ROSTO-QUADRO-CHAVE-2810
        const faces = await new FD({ fastMode: true, maxDetectedFaces: 1 }).detect(bitmap) // KINEO-ROSTO-QUADRO-CHAVE-2810
        const f = faces?.[0]?.boundingBox // KINEO-ROSTO-QUADRO-CHAVE-2810
        if (f && f.width > 24 && f.height > 24) { side = Math.round(Math.max(f.width, f.height) * 1.9); cx = f.x + f.width / 2; cy = f.y + f.height / 2 + f.height * 0.12 } // KINEO-ROSTO-QUADRO-CHAVE-2810 — 1,9× cobre cabelo e barba
      } catch {} // KINEO-ROSTO-QUADRO-CHAVE-2810 — detector indisponível/negado: fica a heurística
    } // KINEO-ROSTO-QUADRO-CHAVE-2810
    side = Math.max(64, Math.min(side, W, H)) // KINEO-ROSTO-QUADRO-CHAVE-2810
    const x = Math.round(Math.min(Math.max(0, cx - side / 2), W - side)), y = Math.round(Math.min(Math.max(0, cy - side / 2), H - side)) // KINEO-ROSTO-QUADRO-CHAVE-2810
    const out = Math.min(768, side) // KINEO-ROSTO-QUADRO-CHAVE-2810
    const canvas = document.createElement('canvas'); canvas.width = out; canvas.height = out // KINEO-ROSTO-QUADRO-CHAVE-2810
    const ctx = canvas.getContext('2d'); if (!ctx) return null // KINEO-ROSTO-QUADRO-CHAVE-2810
    ctx.drawImage(bitmap, x, y, side, side, 0, 0, out, out) // KINEO-ROSTO-QUADRO-CHAVE-2810
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92)) // KINEO-ROSTO-QUADRO-CHAVE-2810
    return blob ? new File([blob], 'face.jpg', { type: 'image/jpeg' }) : null // KINEO-ROSTO-QUADRO-CHAVE-2810
  } catch { return null } // KINEO-ROSTO-QUADRO-CHAVE-2810
} // KINEO-ROSTO-QUADRO-CHAVE-2810

export async function composePairPhoto(a: File, b: File): Promise<File> {
  const W = 720, H = 1280
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas')
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
  for (const [i, f] of [a, b].entries()) {
    const im = await createImageBitmap(f)
    const tw = W / 2, s = Math.max(tw / im.width, H / im.height), sw = tw / s, sh = H / s
    const sx = (im.width - sw) / 2, sy = Math.max(0, Math.min(im.height - sh, (im.height - sh) * 0.2))
    ctx.drawImage(im, sx, sy, sw, sh, i * tw, 0, tw, H)
  }
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) throw new Error('compose')
  return new File([blob], 'pair.jpg', { type: 'image/jpeg' })
}
