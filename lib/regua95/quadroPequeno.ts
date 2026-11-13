// KINEO-NOTA-AUTO-CUSTO-1311 — os quadros do juiz em 432 px de largura, como no ensaio (ordem da CEO, 13/11 noite).
//
// Por quê: o 1º filme julgado em produção pelo juiz da régua inteira custou US$ 0,10 — 5× o ensaio (US$ 0,02). O ensaio mediu
// quadros de 432 px (ffmpeg local); em produção a fal entrega o quadro no tamanho do vídeo (até 1080×1920) e o modelo cobra pela
// área. Aqui o servidor baixa cada quadro da fal, reduz para 432 px de largura (média por área, como um downscale de qualidade) e
// manda ao modelo como data URL JPEG. Sem serviço novo: só jpeg-js (JavaScript puro, sem binário nativo).
// Falha aberta: quadro que não baixa ou não decodifica segue com a URL original (o juiz continua; só custa mais).
import { decode, encode } from 'jpeg-js'
import type { QuadroCena } from '@/lib/regua95/notaPorCena'

export const LARGURA_QUADRO_JUIZ = 432
export const QUALIDADE_QUADRO_JUIZ = 82

/** Reduz um JPEG para `largura` px (altura proporcional, par). Já pequeno = devolve igual. null = não deu para decodificar. */
export function reduzirJpeg(jpeg: Uint8Array, largura = LARGURA_QUADRO_JUIZ, qualidade = QUALIDADE_QUADRO_JUIZ): Uint8Array | null {
  try {
    const img = decode(jpeg, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 40, maxMemoryUsageInMB: 512 })
    if (!img.width || !img.height) return null
    if (img.width <= largura) return jpeg
    const w = largura
    const h = Math.max(2, Math.round((img.height * w) / img.width / 2) * 2)
    const out = new Uint8Array(w * h * 4)
    const sx = img.width / w
    const sy = img.height / h
    const src = img.data
    for (let y = 0; y < h; y++) {
      const y0 = Math.floor(y * sy)
      const y1 = Math.min(img.height, Math.max(y0 + 1, Math.floor((y + 1) * sy)))
      for (let x = 0; x < w; x++) {
        const x0 = Math.floor(x * sx)
        const x1 = Math.min(img.width, Math.max(x0 + 1, Math.floor((x + 1) * sx)))
        let r = 0, g = 0, b = 0, n = 0
        for (let yy = y0; yy < y1; yy++) {
          let i = (yy * img.width + x0) * 4
          for (let xx = x0; xx < x1; xx++, i += 4) { r += src[i]; g += src[i + 1]; b += src[i + 2]; n++ }
        }
        const o = (y * w + x) * 4
        out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255
      }
    }
    return encode({ width: w, height: h, data: out }, qualidade).data
  } catch {
    return null
  }
}

/** Baixa e reduz os quadros (em paralelo). Quadro que falha segue com a URL original. Nunca lança. */
export async function quadrosDoJuizPequenos(quadros: QuadroCena[], opts?: { fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<{ quadros: QuadroCena[]; reduzidos: number }> {
  const doFetch = opts?.fetchImpl ?? fetch
  let reduzidos = 0
  const novos = await Promise.all(quadros.map(async (q) => {
    if (q.url.startsWith('data:')) return q
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 20_000)
    try {
      const res = await doFetch(q.url, { signal: ctrl.signal })
      if (!res.ok) return q
      const bytes = new Uint8Array(await res.arrayBuffer())
      const pequeno = reduzirJpeg(bytes)
      if (!pequeno) return q
      reduzidos++
      return { ...q, url: `data:image/jpeg;base64,${Buffer.from(pequeno).toString('base64')}` }
    } catch {
      return q
    } finally {
      clearTimeout(timer)
    }
  }))
  return { quadros: novos, reduzidos }
}
