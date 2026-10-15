// KINEO-ADS-FIEL-1510 — PNG sem dependência nova (o package.json não tem sharp, canvas nem jimp — e a regra da casa é não trazer
// infra nova): ler e gravar PNG com o zlib do próprio Node, redimensionar com filtro de área (sem serrilhado) e colar o recorte REAL
// do produto (RGBA, transparência do fal-ai/birefnet/v2) por cima da cena do Nano Banana (PNG pedido por output_format 'png').
//
// Por que PNG nas duas pontas: o recorte vem em PNG com alfa e a cena é pedida em PNG — nada de decodificar JPEG (exigiria um
// decodificador inteiro). A saída é PNG RGB no tamanho do formato do anúncio (1080×1920 · 1080×1350 · 1080×1080), ~3-5 MB:
// cabe no image_url do Kling O3 / H3 / Seedance.
//
// Suporta o que os dois fornecedores entregam: 8 bits (escala de cinza, RGB, paleta, cinza+alfa, RGBA) e 16 bits (fica o byte
// alto), sem entrelaçamento. Qualquer outra coisa LANÇA — o chamador cai na foto real do produto (nunca na cena redesenhada).
// Só node:zlib; nenhuma rede, nenhum banco (o guardião scripts/test-ads-fiel-1510.mjs roda isto cru).
import { deflateSync, inflateSync } from 'node:zlib'
import { ADS_V2_CUTOUT_AREA_MAX, ADS_V2_CUTOUT_AREA_MIN, ADS_V2_FORMAT_CROP, adsV2ProductLockRect, type AdsV2Format, type AdsV2ProductLockMode } from '@/lib/ads/v2ShotLists'
import { adsV2LockPlacement, type AdsV2Box, type AdsV2LockPlacement, type AdsV2SceneLayout } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-3-1510 — o produto pousa na superfície lida, com teto e longe dos rostos
import { adsV2LockReservedRect, type AdsV2LockSide } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-4-1510 — o canto reservado decidido em código (a visão só confere)
import { adsV2LockReservedPlace, adsV2LockTopEdgeTrust, type AdsV2LockReservedPlace } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-5-1510 — a base do produto no tampo lido (confiável) ou a base fixa

/** Imagem em memória: RGBA 8 bits, linha a linha, sem preenchimento. */
export interface AdsV2Rgba { width: number; height: number; data: Uint8Array }

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
/** Teto de pixels decodificados (8K × 8K): imagem maior = recusa (memória da lambda). */
export const ADS_V2_PNG_MAX_PIXELS = 64 * 1024 * 1024

let CRC_TABLE: Uint32Array | null = null
function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function isPng(b: Uint8Array): boolean {
  return b.length > 8 && SIGNATURE.every((v, i) => b[i] === v)
}

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** Lê um PNG para RGBA 8 bits. Lança com o motivo (formato não suportado, CRC, tamanho). */
export function decodePng(input: Uint8Array): AdsV2Rgba {
  const b = input
  if (!isPng(b)) throw new Error('png_bad_signature')
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let pos = 8
  let width = 0, height = 0, depth = 0, color = -1, interlace = 0
  let palette: Uint8Array | null = null
  let trns: Uint8Array | null = null
  const idat: Uint8Array[] = []
  while (pos + 12 <= b.length) {
    const len = view.getUint32(pos)
    const type = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7])
    const dataStart = pos + 8
    const dataEnd = dataStart + len
    if (dataEnd + 4 > b.length) throw new Error('png_truncated')
    if (crc32(b, pos + 4, dataEnd) !== view.getUint32(dataEnd)) throw new Error(`png_bad_crc:${type}`)
    const data = b.subarray(dataStart, dataEnd)
    if (type === 'IHDR') {
      width = view.getUint32(dataStart)
      height = view.getUint32(dataStart + 4)
      depth = b[dataStart + 8]
      color = b[dataStart + 9]
      interlace = b[dataStart + 12]
    } else if (type === 'PLTE') palette = data
    else if (type === 'tRNS') trns = data
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos = dataEnd + 4
  }
  if (!(width > 0 && height > 0)) throw new Error('png_no_ihdr')
  if (width * height > ADS_V2_PNG_MAX_PIXELS) throw new Error('png_too_large')
  if (interlace !== 0) throw new Error('png_interlaced')
  const channels = color === 0 ? 1 : color === 2 ? 3 : color === 3 ? 1 : color === 4 ? 2 : color === 6 ? 4 : 0
  if (!channels) throw new Error(`png_color_type:${color}`)
  const okDepth = color === 3 ? [1, 2, 4, 8].includes(depth) : [8, 16].includes(depth)
  if (!okDepth) throw new Error(`png_depth:${depth}`)
  if (color === 3 && !palette) throw new Error('png_no_palette')
  const bitsPerPixel = channels * depth
  const bpp = Math.max(1, bitsPerPixel >> 3)
  const stride = Math.ceil((width * bitsPerPixel) / 8)
  const raw = inflateSync(Buffer.concat(idat.map((x) => Buffer.from(x.buffer, x.byteOffset, x.byteLength))))
  if (raw.length < (stride + 1) * height) throw new Error('png_short_data')
  const cur = new Uint8Array(stride)
  const prev = new Uint8Array(stride)
  const out = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1)
    const filter = raw[rowStart]
    for (let x = 0; x < stride; x++) {
      const v = raw[rowStart + 1 + x]
      const a = x >= bpp ? cur[x - bpp] : 0
      const up = prev[x]
      const c = x >= bpp ? prev[x - bpp] : 0
      let r: number
      if (filter === 0) r = v
      else if (filter === 1) r = v + a
      else if (filter === 2) r = v + up
      else if (filter === 3) r = v + ((a + up) >> 1)
      else if (filter === 4) r = v + paeth(a, up, c)
      else throw new Error(`png_bad_filter:${filter}`)
      cur[x] = r & 0xff
    }
    const o = y * width * 4
    for (let x = 0; x < width; x++) {
      const p = o + x * 4
      if (color === 3) {
        const bit = x * depth
        const idx = depth === 8 ? cur[x] : (cur[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1)
        out[p] = palette![idx * 3] ?? 0
        out[p + 1] = palette![idx * 3 + 1] ?? 0
        out[p + 2] = palette![idx * 3 + 2] ?? 0
        out[p + 3] = trns && idx < trns.length ? trns[idx] : 255
        continue
      }
      const s = depth === 16 ? 2 : 1
      const at = x * channels * s
      const g = (k: number) => cur[at + k * s]
      if (color === 0) { out[p] = out[p + 1] = out[p + 2] = g(0); out[p + 3] = 255 }
      else if (color === 2) { out[p] = g(0); out[p + 1] = g(1); out[p + 2] = g(2); out[p + 3] = 255 }
      else if (color === 4) { out[p] = out[p + 1] = out[p + 2] = g(0); out[p + 3] = g(1) }
      else { out[p] = g(0); out[p + 1] = g(1); out[p + 2] = g(2); out[p + 3] = g(3) }
    }
    prev.set(cur)
  }
  return { width, height, data: out }
}

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  Buffer.from(data.buffer, data.byteOffset, data.byteLength).copy(out, 8)
  out.writeUInt32BE(crc32(out, 4, 8 + data.length), 8 + data.length)
  return out
}

/** Grava RGBA como PNG (RGB quando `alpha` é false). Filtro por linha escolhido pela menor soma (heurística padrão do libpng). */
export function encodePng(img: AdsV2Rgba, opts: { alpha?: boolean; level?: number } = {}): Uint8Array {
  const { width, height, data } = img
  if (!(width > 0 && height > 0) || data.length !== width * height * 4) throw new Error('png_encode_bad_image')
  const ch = opts.alpha ? 4 : 3
  const stride = width * ch
  const rows = new Uint8Array((stride + 1) * height)
  let prev = new Uint8Array(stride)
  let cur = new Uint8Array(stride)
  const cand = [new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride)]
  for (let y = 0; y < height; y++) {
    const o = y * width * 4
    for (let x = 0; x < width; x++) for (let k = 0; k < ch; k++) cur[x * ch + k] = data[o + x * 4 + k]
    let best = 0
    let bestSum = Infinity
    for (let f = 0; f < 5; f++) {
      const t = cand[f]
      let sum = 0
      for (let x = 0; x < stride; x++) {
        const a = x >= ch ? cur[x - ch] : 0
        const up = prev[x]
        const c = x >= ch ? prev[x - ch] : 0
        const v = cur[x]
        const r = (f === 0 ? v : f === 1 ? v - a : f === 2 ? v - up : f === 3 ? v - ((a + up) >> 1) : v - paeth(a, up, c)) & 0xff
        t[x] = r
        sum += r < 128 ? r : 256 - r
        if (sum >= bestSum) break
      }
      if (sum < bestSum) { bestSum = sum; best = f }
    }
    // A melhor linha pode ter sido interrompida na soma de um filtro pior; recalcula a escolhida inteira.
    const t = cand[best]
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0
      const up = prev[x]
      const c = x >= ch ? prev[x - ch] : 0
      const v = cur[x]
      t[x] = (best === 0 ? v : best === 1 ? v - a : best === 2 ? v - up : best === 3 ? v - ((a + up) >> 1) : v - paeth(a, up, c)) & 0xff
    }
    rows[y * (stride + 1)] = best
    rows.set(t, y * (stride + 1) + 1)
    const swap = prev
    prev = cur
    cur = swap
  }
  const ihdr = new Uint8Array(13)
  const dv = new DataView(ihdr.buffer)
  dv.setUint32(0, width)
  dv.setUint32(4, height)
  ihdr[8] = 8
  ihdr[9] = opts.alpha ? 6 : 2
  return new Uint8Array(Buffer.concat([Buffer.from(SIGNATURE), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: opts.level ?? 6 })), chunk('IEND', new Uint8Array(0))]))
}

/** Pesos de um eixo: filtro triângulo com suporte proporcional à redução (média de área ao reduzir, bilinear ao ampliar). */
function axisWeights(src: number, dst: number, offset: number, span: number): { start: Int32Array; count: Int32Array; w: Float32Array; taps: number } {
  const scale = span / dst
  const support = Math.max(1, scale)
  const taps = Math.ceil(support) * 2 + 2
  const start = new Int32Array(dst)
  const count = new Int32Array(dst)
  const w = new Float32Array(dst * taps)
  for (let i = 0; i < dst; i++) {
    const center = offset + (i + 0.5) * scale - 0.5
    const lo = Math.max(0, Math.floor(center - support))
    const hi = Math.min(src - 1, Math.ceil(center + support))
    let total = 0
    let n = 0
    for (let j = lo; j <= hi && n < taps; j++, n++) {
      const v = Math.max(0, 1 - Math.abs(j - center) / support)
      w[i * taps + n] = v
      total += v
    }
    if (total <= 0) { w[i * taps] = 1; total = 1; n = Math.max(n, 1) }
    for (let k = 0; k < n; k++) w[i * taps + k] /= total
    start[i] = lo
    count[i] = n
  }
  return { start, count, w, taps }
}

/**
 * Recorta a janela (sx, sy, sw, sh) de `img` e a leva a dw×dh, em alfa PRÉ-MULTIPLICADO (sem franja escura na borda do
 * recorte). Devolve RGBA normal.
 */
export function resampleRgba(img: AdsV2Rgba, dw: number, dh: number, win?: { sx: number; sy: number; sw: number; sh: number }): AdsV2Rgba {
  const { width: W, height: H, data } = img
  const sx = win?.sx ?? 0, sy = win?.sy ?? 0, sw = win?.sw ?? W, sh = win?.sh ?? H
  if (!(dw > 0 && dh > 0 && sw > 0 && sh > 0)) throw new Error('png_resample_bad_size')
  const xs = axisWeights(W, dw, sx, sw)
  const ys = axisWeights(H, dh, sy, sh)
  // Passo 1 (horizontal): H linhas × dw colunas, pré-multiplicado, em ponto flutuante.
  let first = H
  let rows = 0
  for (let i = 0; i < dh; i++) { first = Math.min(first, ys.start[i]); rows = Math.max(rows, ys.start[i] + ys.count[i]) }
  const tmp = new Float32Array((rows - first) * dw * 4)
  for (let y = first; y < rows; y++) {
    const ro = y * W * 4
    const to = (y - first) * dw * 4
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, bl = 0, a = 0
      const s0 = xs.start[x]
      for (let k = 0; k < xs.count[x]; k++) {
        const wt = xs.w[x * xs.taps + k]
        const p = ro + (s0 + k) * 4
        const al = data[p + 3] * wt
        r += data[p] * al; g += data[p + 1] * al; bl += data[p + 2] * al; a += al
      }
      const q = to + x * 4
      tmp[q] = r; tmp[q + 1] = g; tmp[q + 2] = bl; tmp[q + 3] = a
    }
  }
  // Passo 2 (vertical) e volta do pré-multiplicado.
  const out = new Uint8Array(dw * dh * 4)
  for (let y = 0; y < dh; y++) {
    const s0 = ys.start[y]
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, bl = 0, a = 0
      for (let k = 0; k < ys.count[y]; k++) {
        const wt = ys.w[y * ys.taps + k]
        const q = ((s0 + k - first) * dw + x) * 4
        r += tmp[q] * wt; g += tmp[q + 1] * wt; bl += tmp[q + 2] * wt; a += tmp[q + 3] * wt
      }
      const o = (y * dw + x) * 4
      if (a > 0.5) {
        out[o] = Math.min(255, Math.round(r / a)); out[o + 1] = Math.min(255, Math.round(g / a)); out[o + 2] = Math.min(255, Math.round(bl / a))
      }
      out[o + 3] = Math.min(255, Math.round(a))
    }
  }
  return { width: dw, height: dh, data: out }
}

/** A caixa dos pixels com alfa ≥ `threshold` (null = imagem toda transparente). */
export function alphaBox(img: AdsV2Rgba, threshold = 16): { x: number; y: number; w: number; h: number } | null {
  const { width: W, height: H, data } = img
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y++) {
    const o = y * W * 4
    for (let x = 0; x < W; x++) {
      if (data[o + x * 4 + 3] >= threshold) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Corta `img` na caixa (cópia). */
export function cropRgba(img: AdsV2Rgba, box: { x: number; y: number; w: number; h: number }): AdsV2Rgba {
  const out = new Uint8Array(box.w * box.h * 4)
  for (let y = 0; y < box.h; y++) {
    const from = ((box.y + y) * img.width + box.x) * 4
    out.set(img.data.subarray(from, from + box.w * 4), y * box.w * 4)
  }
  return { width: box.w, height: box.h, data: out }
}

/**
 * O recorte pronto para colar: só o contorno do produto (sem a margem transparente). Recorte que não é produto (área do
 * contorno abaixo de ADS_V2_CUTOUT_AREA_MIN ou acima de ADS_V2_CUTOUT_AREA_MAX da foto, ou sem nenhuma transparência) LANÇA.
 */
export function trimCutout(cut: AdsV2Rgba): AdsV2Rgba {
  const box = alphaBox(cut)
  if (!box) throw new Error('cutout_empty')
  let opaque = 0
  for (let i = 3; i < cut.data.length; i += 4) if (cut.data[i] >= 128) opaque++
  const area = opaque / (cut.width * cut.height)
  if (area < ADS_V2_CUTOUT_AREA_MIN) throw new Error(`cutout_too_small:${area.toFixed(3)}`)
  if (area > ADS_V2_CUTOUT_AREA_MAX) throw new Error(`cutout_not_a_product:${area.toFixed(3)}`)
  return cropRgba(cut, box)
}

/** Cola `top` (RGBA, alfa normal) sobre `base` em (x, y), já no tamanho final. Muta `base`. */
export function pasteOver(base: AdsV2Rgba, top: AdsV2Rgba, x: number, y: number): void {
  for (let ty = 0; ty < top.height; ty++) {
    const by = y + ty
    if (by < 0 || by >= base.height) continue
    for (let tx = 0; tx < top.width; tx++) {
      const bx = x + tx
      if (bx < 0 || bx >= base.width) continue
      const t = (ty * top.width + tx) * 4
      const a = top.data[t + 3]
      if (a === 0) continue
      const o = (by * base.width + bx) * 4
      if (a === 255) {
        base.data[o] = top.data[t]; base.data[o + 1] = top.data[t + 1]; base.data[o + 2] = top.data[t + 2]; base.data[o + 3] = 255
        continue
      }
      const k = a / 255
      base.data[o] = Math.round(top.data[t] * k + base.data[o] * (1 - k))
      base.data[o + 1] = Math.round(top.data[t + 1] * k + base.data[o + 1] * (1 - k))
      base.data[o + 2] = Math.round(top.data[t + 2] * k + base.data[o + 2] * (1 - k))
      base.data[o + 3] = Math.max(base.data[o + 3], a)
    }
  }
}

/** Onde o recorte entra num quadro W×H (o MESMO cálculo no esboço e no quadro final — é o que faz os dois baterem). */
function placeCutout(frameW: number, frameH: number, cut: AdsV2Rgba, mode: AdsV2ProductLockMode): { rect: { x: number; y: number; w: number; h: number }; piece: AdsV2Rgba } {
  const rect = adsV2ProductLockRect(frameW, frameH, cut.width, cut.height, mode)
  return { rect, piece: resampleRgba(cut, rect.w, rect.h) }
}

/** Cinza neutro do esboço (nem branco nem preto: o Nano Banana troca o fundo inteiro e não "acende" nem "apaga" a cena). */
export const ADS_V2_LAYOUT_GREY = 0x9a
/** Largura do esboço (referência de layout: não precisa da resolução final). */
export const ADS_V2_LAYOUT_WIDTH = 720

/** O ESBOÇO (PNG RGB): o recorte já aparado, no lugar e tamanho da trava, sobre cinza, no formato do anúncio. */
export function adsV2LayoutPng(cutTrimmed: AdsV2Rgba, format: AdsV2Format, mode: AdsV2ProductLockMode): Uint8Array {
  const crop = ADS_V2_FORMAT_CROP[format] ?? ADS_V2_FORMAT_CROP['9:16']
  const W = ADS_V2_LAYOUT_WIDTH
  const H = Math.round((W * crop.height) / crop.width)
  const data = new Uint8Array(W * H * 4)
  for (let i = 0; i < data.length; i += 4) { data[i] = data[i + 1] = data[i + 2] = ADS_V2_LAYOUT_GREY; data[i + 3] = 255 }
  const canvas = { width: W, height: H, data }
  const { rect, piece } = placeCutout(W, H, cutTrimmed, mode)
  pasteOver(canvas, piece, rect.x, rect.y)
  return encodePng(canvas)
}

/**
 * O QUADRO TRAVADO (PNG RGB, no tamanho do formato do anúncio): a cena do Nano Banana em `cover` (centro) + o recorte REAL colado
 * no MESMO retângulo do esboço. Devolve também o retângulo (para o evento e para a montagem, se um dia quiser sobrepor).
 */
export function adsV2LockedFramePng(scene: AdsV2Rgba, cutTrimmed: AdsV2Rgba, format: AdsV2Format, mode: AdsV2ProductLockMode, opts: { shade?: boolean; place?: { sceneIdx: number; layout?: AdsV2SceneLayout | null } } = {}): { png: Uint8Array; rect: { x: number; y: number; w: number; h: number }; width: number; height: number; shade?: AdsV2Shade; placement?: AdsV2LockPlacement; faces?: AdsV2Box[] } { // KINEO-ADS-FIEL-2-1510 — opts.shade: sombra de contato + tom da cena (sem a opção = o quadro de antes, pixel a pixel) · KINEO-ADS-FIEL-3-1510 — opts.place: onde pousar
  const crop = ADS_V2_FORMAT_CROP[format] ?? ADS_V2_FORMAT_CROP['9:16']
  const W = crop.width
  const H = crop.height
  const ratio = W / H
  let sw = scene.width
  let sh = sw / ratio
  if (sh > scene.height) { sh = scene.height; sw = sh * ratio }
  const frame = resampleRgba(scene, W, H, { sx: (scene.width - sw) / 2, sy: (scene.height - sh) / 2, sw, sh })
  for (let i = 3; i < frame.data.length; i += 4) frame.data[i] = 255
  const seen = opts.place && mode === 'scene' ? adsV2LayoutToFrame(opts.place.layout ?? null, scene.width, scene.height, { sx: (scene.width - sw) / 2, sy: (scene.height - sh) / 2, sw, sh }) : null // KINEO-ADS-FIEL-3-1510 — a leitura da visão no quadro final
  const placed = opts.place && mode === 'scene' ? adsV2LockPlacement({ frameW: W, frameH: H, cutW: cutTrimmed.width, cutH: cutTrimmed.height, format, sceneIdx: opts.place.sceneIdx, layout: seen }) : null // KINEO-ADS-FIEL-3-1510 — cena de gente: superfície + rostos (sem a opção = a caixa fixa de antes)
  const { rect, piece } = placed ? { rect: placed.rect, piece: resampleRgba(cutTrimmed, placed.rect.w, placed.rect.h) } : placeCutout(W, H, cutTrimmed, mode) // KINEO-ADS-FIEL-3-1510
  const shade = opts.shade === true ? adsV2ShadeAndMatch(frame, piece, rect, mode) : undefined // KINEO-ADS-FIEL-2-1510
  pasteOver(frame, piece, rect.x, rect.y)
  return { png: encodePng(frame), rect, width: W, height: H, ...(shade ? { shade } : {}), ...(placed ? { placement: placed, faces: seen ? seen.faces : [] } : {}) } // KINEO-ADS-FIEL-2-1510 · KINEO-ADS-FIEL-3-1510 — + onde pousou (evento e as frases de tela)
}

/** KINEO-ADS-FIEL-3-1510 — a leitura da visão (frações da IMAGEM da cena) levada ao quadro final (a mesma janela `cover` do recorte). Pura. */
export function adsV2LayoutToFrame(layout: AdsV2SceneLayout | null, sceneW: number, sceneH: number, win: { sx: number; sy: number; sw: number; sh: number }): AdsV2SceneLayout | null { // KINEO-ADS-FIEL-3-1510
  if (!layout) return null // KINEO-ADS-FIEL-3-1510
  const map = (b: AdsV2Box): AdsV2Box | null => { // KINEO-ADS-FIEL-3-1510
    const c = (v: number) => Math.min(1, Math.max(0, v)) // KINEO-ADS-FIEL-3-1510
    const r = { x0: c((b.x0 * sceneW - win.sx) / win.sw), y0: c((b.y0 * sceneH - win.sy) / win.sh), x1: c((b.x1 * sceneW - win.sx) / win.sw), y1: c((b.y1 * sceneH - win.sy) / win.sh) } // KINEO-ADS-FIEL-3-1510
    return r.x1 - r.x0 > 0.005 && r.y1 - r.y0 > 0.005 ? r : null // KINEO-ADS-FIEL-3-1510 — caiu fora da janela
  } // KINEO-ADS-FIEL-3-1510
  return { surface: layout.surface ? map(layout.surface) : null, faces: layout.faces.map(map).filter((b): b is AdsV2Box => !!b) } // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510

// ── KINEO-ADS-FIEL-2-1510 — o recorte "colado" ganha a luz da cena (QA 15/10: "parece recortado e colado") ─────────────────────
// KINEO-ADS-FIEL-2-1510 — barato e em JS puro sobre o RGBA já decodificado (sem sharp/canvas): (1) TOM — a luminância média e a
// KINEO-ADS-FIEL-2-1510 — temperatura (R−B) da área da cena onde o produto pousa puxam o recorte de leve, com teto (o produto continua o
// KINEO-ADS-FIEL-2-1510 — do cliente: ganho entre ADS_V2_SHADE_GAIN_MIN e _MAX, temperatura no máximo ±ADS_V2_SHADE_WARM_MAX níveis);
// KINEO-ADS-FIEL-2-1510 — (2) SOMBRA — uma elipse de contato na base (só 'scene': na mão não há mesa) + a silhueta do recorte borrada e
// KINEO-ADS-FIEL-2-1510 — deslocada (sombra projetada suave). Tudo antes de colar: o recorte cobre a sombra onde ele está.
export interface AdsV2Shade { gain: number; warm: number; contact: boolean; drop: boolean } // KINEO-ADS-FIEL-2-1510
export const ADS_V2_SHADE_GAIN_MIN = 0.82 // KINEO-ADS-FIEL-2-1510
export const ADS_V2_SHADE_GAIN_MAX = 1.08 // KINEO-ADS-FIEL-2-1510
export const ADS_V2_SHADE_WARM_MAX = 10 // KINEO-ADS-FIEL-2-1510 — níveis (0-255) somados ao R e tirados do B
export const ADS_V2_SHADE_CONTACT = 0.55 // KINEO-ADS-FIEL-2-1510 — escurecimento máximo no centro da elipse de contato
export const ADS_V2_SHADE_DROP = 0.32 // KINEO-ADS-FIEL-2-1510 — escurecimento máximo da sombra projetada
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b // KINEO-ADS-FIEL-2-1510

/** KINEO-ADS-FIEL-2-1510 — média (R, G, B, luminância) de uma caixa da imagem; `alphaMin` > 0 = só os pixels opacos (o recorte). */
export function adsV2MeanRgb(img: AdsV2Rgba, box: { x: number; y: number; w: number; h: number }, alphaMin = 0): { r: number; g: number; b: number; l: number; n: number } {
  let r = 0, g = 0, b = 0, n = 0
  const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y))
  const x1 = Math.min(img.width, Math.ceil(box.x + box.w)), y1 = Math.min(img.height, Math.ceil(box.y + box.h))
  const step = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 40000)))
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
    const o = (y * img.width + x) * 4
    if (img.data[o + 3] < alphaMin) continue
    r += img.data[o]; g += img.data[o + 1]; b += img.data[o + 2]; n++
  }
  if (!n) return { r: 0, g: 0, b: 0, l: 0, n: 0 }
  return { r: r / n, g: g / n, b: b / n, l: luma(r / n, g / n, b / n), n }
}

/** KINEO-ADS-FIEL-2-1510 — o ajuste de tom (puro, com teto): o ganho de luminância e o desvio de temperatura do recorte rumo à cena. */
export function adsV2ToneMatch(sceneMean: { r: number; b: number; l: number }, cutMean: { r: number; b: number; l: number }): { gain: number; warm: number } {
  const ratio = cutMean.l > 1 ? Math.max(0.05, sceneMean.l) / cutMean.l : 1
  const gain = Math.min(ADS_V2_SHADE_GAIN_MAX, Math.max(ADS_V2_SHADE_GAIN_MIN, Math.pow(ratio, 0.35)))
  const warm = Math.max(-ADS_V2_SHADE_WARM_MAX, Math.min(ADS_V2_SHADE_WARM_MAX, ((sceneMean.r - sceneMean.b) - (cutMean.r - cutMean.b)) * 0.25))
  return { gain: Math.round(gain * 1000) / 1000, warm: Math.round(warm * 10) / 10 }
}

/** KINEO-ADS-FIEL-2-1510 — caixa borrada (2 passadas, separável) de um canal em ponto flutuante. Muta `a`. */
function boxBlur(a: Float32Array, w: number, h: number, radius: number): void {
  const tmp = new Float32Array(a.length)
  const pass = (src: Float32Array, dst: Float32Array, horiz: boolean) => {
    const len = horiz ? w : h
    const lines = horiz ? h : w
    for (let l = 0; l < lines; l++) {
      let acc = 0
      const at = (k: number) => (horiz ? l * w + k : k * w + l)
      for (let k = -radius; k <= radius; k++) acc += src[at(Math.min(len - 1, Math.max(0, k)))]
      for (let k = 0; k < len; k++) {
        dst[at(k)] = acc / (2 * radius + 1)
        acc += src[at(Math.min(len - 1, k + radius + 1))] - src[at(Math.max(0, k - radius))]
      }
    }
  }
  for (let i = 0; i < 2; i++) { pass(a, tmp, true); pass(tmp, a, false) }
}

/**
 * KINEO-ADS-FIEL-2-1510 — sombra + tom, ANTES de colar: escurece `frame` (a cena) com a elipse de contato na base do retângulo (só no
 * modo 'scene') e a sombra projetada (a silhueta de `piece` borrada, deslocada para baixo/direita), e ajusta `piece` (o recorte já no
 * tamanho final) pelo tom da área da cena sob ele. Muta os dois. Devolve o que foi aplicado (vai no evento ads_v2_product_locked).
 */
export function adsV2ShadeAndMatch(frame: AdsV2Rgba, piece: AdsV2Rgba, rect: { x: number; y: number; w: number; h: number }, mode: AdsV2ProductLockMode): AdsV2Shade {
  // 1. tom: a área da cena onde o produto pousa (o retângulo + uma faixa em volta) contra os pixels opacos do recorte.
  const pad = Math.round(Math.max(rect.w, rect.h) * 0.25)
  const sceneMean = adsV2MeanRgb(frame, { x: rect.x - pad, y: rect.y - pad, w: rect.w + 2 * pad, h: rect.h + 2 * pad })
  const cutMean = adsV2MeanRgb(piece, { x: 0, y: 0, w: piece.width, h: piece.height }, 128)
  const { gain, warm } = cutMean.n > 0 && sceneMean.n > 0 ? adsV2ToneMatch(sceneMean, cutMean) : { gain: 1, warm: 0 }
  if (gain !== 1 || warm !== 0) {
    const d = piece.data
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue
      d[i] = Math.max(0, Math.min(255, Math.round(d[i] * gain + warm)))
      d[i + 1] = Math.max(0, Math.min(255, Math.round(d[i + 1] * gain)))
      d[i + 2] = Math.max(0, Math.min(255, Math.round(d[i + 2] * gain - warm)))
    }
  }
  const darken = (x: number, y: number, k: number) => {
    if (x < 0 || y < 0 || x >= frame.width || y >= frame.height || k <= 0) return
    const o = (y * frame.width + x) * 4
    const m = 1 - Math.min(0.9, k)
    frame.data[o] = Math.round(frame.data[o] * m); frame.data[o + 1] = Math.round(frame.data[o + 1] * m); frame.data[o + 2] = Math.round(frame.data[o + 2] * m)
  }
  // 2. sombra projetada: a silhueta borrada, deslocada (luz de cima, um pouco da esquerda).
  const r = Math.max(2, Math.round(rect.w * 0.025))
  const dx = Math.round(rect.w * 0.035), dy = Math.round(rect.h * 0.015)
  const W = piece.width + 4 * r, H = piece.height + 4 * r
  const a = new Float32Array(W * H)
  for (let y = 0; y < piece.height; y++) for (let x = 0; x < piece.width; x++) a[(y + 2 * r) * W + (x + 2 * r)] = piece.data[(y * piece.width + x) * 4 + 3] / 255
  boxBlur(a, W, H, r)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = a[y * W + x]
    if (v > 0.003) darken(rect.x - 2 * r + x + dx, rect.y - 2 * r + y + dy, v * ADS_V2_SHADE_DROP)
  }
  // 3. contato: elipse achatada na base (o produto POUSA na superfície). Na mão (holds/ator) não há superfície.
  const contact = mode === 'scene'
  if (contact) {
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h - rect.h * 0.01
    const rx = rect.w * 0.55, ry = Math.max(4, rect.h * 0.045)
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
      if (q < 1) darken(x, y, Math.pow(1 - q, 1.5) * ADS_V2_SHADE_CONTACT)
    }
  }
  return { gain, warm, contact, drop: true }
}

/** KINEO-ADS-FIEL-2-1510 — o ESBOÇO da cena SEM produto: só a tela cinza no formato (a cena nasce vazia; o recorte real entra depois). */
export function adsV2EmptyLayoutPng(format: AdsV2Format): Uint8Array {
  const crop = ADS_V2_FORMAT_CROP[format] ?? ADS_V2_FORMAT_CROP['9:16']
  const W = ADS_V2_LAYOUT_WIDTH
  const H = Math.round((W * crop.height) / crop.width)
  const data = new Uint8Array(W * H * 4)
  for (let i = 0; i < data.length; i += 4) { data[i] = data[i + 1] = data[i + 2] = ADS_V2_LAYOUT_GREY; data[i + 3] = 255 }
  return encodePng({ width: W, height: H, data })
}

// ── KINEO-ADS-FIEL-4-1510 — o quadro travado com o CANTO reservado (reteste 15/10: o produto boiou em 7/7 e cobriu um rosto) ──────────
/** KINEO-ADS-FIEL-4-1510 — o quadro do formato e a janela `cover` (centro) da cena nele: a MESMA conta de adsV2LockedFramePng. Pura. */
export function adsV2CoverWindow(sceneW: number, sceneH: number, format: AdsV2Format): { W: number; H: number; win: { sx: number; sy: number; sw: number; sh: number } } { // KINEO-ADS-FIEL-4-1510
  const crop = ADS_V2_FORMAT_CROP[format] ?? ADS_V2_FORMAT_CROP['9:16'] // KINEO-ADS-FIEL-4-1510
  const ratio = crop.width / crop.height // KINEO-ADS-FIEL-4-1510
  let sw = sceneW // KINEO-ADS-FIEL-4-1510
  let sh = sw / ratio // KINEO-ADS-FIEL-4-1510
  if (sh > sceneH) { sh = sceneH; sw = sh * ratio } // KINEO-ADS-FIEL-4-1510
  return { W: crop.width, H: crop.height, win: { sx: (sceneW - sw) / 2, sy: (sceneH - sh) / 2, sw, sh } } // KINEO-ADS-FIEL-4-1510
} // KINEO-ADS-FIEL-4-1510
/** KINEO-ADS-FIEL-4-1510 — ONDE o produto entra (o canto reservado, só pelo formato e pelo lado) e os rostos da conferência levados ao quadro —
 *  decidido ANTES de pintar um pixel (canto ocupado = nada é gravado). Pura. */
export function adsV2ReservedLayout(i: { sceneW: number; sceneH: number; cutW: number; cutH: number; format: AdsV2Format; side: AdsV2LockSide; faces?: readonly AdsV2Box[] | null }): { W: number; H: number; rect: { x: number; y: number; w: number; h: number }; faces: AdsV2Box[] } { // KINEO-ADS-FIEL-4-1510
  const { W, H, win } = adsV2CoverWindow(i.sceneW, i.sceneH, i.format) // KINEO-ADS-FIEL-4-1510
  const rect = adsV2LockReservedRect({ frameW: W, frameH: H, cutW: i.cutW, cutH: i.cutH, format: i.format, side: i.side }) // KINEO-ADS-FIEL-4-1510 — a leitura NÃO entra aqui
  const seen = adsV2LayoutToFrame({ surface: null, faces: Array.isArray(i.faces) ? [...i.faces] : [] }, i.sceneW, i.sceneH, win) // KINEO-ADS-FIEL-4-1510
  return { W, H, rect, faces: seen ? seen.faces : [] } // KINEO-ADS-FIEL-4-1510
} // KINEO-ADS-FIEL-4-1510
/** KINEO-ADS-FIEL-4-1510 — o QUADRO TRAVADO no canto reservado (PNG RGB no tamanho do formato): a cena em `cover`, a sombra de contato
 *  encostada na BASE do produto + o tom da cena (adsV2ShadeAndMatch, modo 'scene') e o recorte REAL colado no retângulo do canto. */
export function adsV2ReservedFramePng(scene: AdsV2Rgba, cutTrimmed: AdsV2Rgba, format: AdsV2Format, side: AdsV2LockSide): { png: Uint8Array; rect: { x: number; y: number; w: number; h: number }; width: number; height: number; shade: AdsV2Shade } { // KINEO-ADS-FIEL-4-1510
  const { W, H, win } = adsV2CoverWindow(scene.width, scene.height, format) // KINEO-ADS-FIEL-4-1510
  const frame = resampleRgba(scene, W, H, win) // KINEO-ADS-FIEL-4-1510
  for (let i = 3; i < frame.data.length; i += 4) frame.data[i] = 255 // KINEO-ADS-FIEL-4-1510
  const rect = adsV2LockReservedRect({ frameW: W, frameH: H, cutW: cutTrimmed.width, cutH: cutTrimmed.height, format, side }) // KINEO-ADS-FIEL-4-1510
  const piece = resampleRgba(cutTrimmed, rect.w, rect.h) // KINEO-ADS-FIEL-4-1510
  const shade = adsV2ShadeAndMatch(frame, piece, rect, 'scene') // KINEO-ADS-FIEL-4-1510 — a elipse de contato nasce NA base do retângulo: o produto pousa
  pasteOver(frame, piece, rect.x, rect.y) // KINEO-ADS-FIEL-4-1510
  return { png: encodePng(frame), rect, width: W, height: H, shade } // KINEO-ADS-FIEL-4-1510
} // KINEO-ADS-FIEL-4-1510
// ── KINEO-ADS-FIEL-5-1510 — o produto POUSA no tampo lido (reteste 15/10 08ef80e5: tampo em 59–71%, base fixa em 85% = na frente do móvel) ─
/** KINEO-ADS-FIEL-5-1510 — a borda do tampo que a conferência leu (fração da IMAGEM da cena) levada ao QUADRO pela MESMA janela `cover`. Pura. */
export function adsV2TopEdgeToFrame(raw: number | null | undefined, sceneH: number, win: { sy: number; sh: number }): number | null { // KINEO-ADS-FIEL-5-1510
  if (typeof raw !== 'number' || !Number.isFinite(raw) || !(sceneH > 0) || !(win.sh > 0)) return null // KINEO-ADS-FIEL-5-1510
  return (raw * sceneH - win.sy) / win.sh // KINEO-ADS-FIEL-5-1510
} // KINEO-ADS-FIEL-5-1510
/** KINEO-ADS-FIEL-5-1510 — ONDE o produto entra no canto reservado: os rostos da conferência no quadro (como a Fiel 4), a borda do tampo no
 *  quadro e o veredito dela (adsV2LockTopEdgeTrust: redonda, fora de [0,50; 0,93] ou sem corner_surface=true = base fixa) e o lugar
 *  (adsV2LockReservedPlace; `trustedFaces` = os rostos entram na proteção de "subir não tapa rosto"). Pura. */
export function adsV2ReservedLayoutTop(i: { sceneW: number; sceneH: number; cutW: number; cutH: number; format: AdsV2Format; side: AdsV2LockSide; faces?: readonly AdsV2Box[] | null; topEdgeY?: number | null; cornerSurface?: boolean | null; trustedFaces: boolean }): { W: number; H: number; rect: { x: number; y: number; w: number; h: number }; faces: AdsV2Box[]; place: AdsV2LockReservedPlace; top: { raw: number | null; y: number | null; ok: boolean; why: string | null } } { // KINEO-ADS-FIEL-5-1510
  const { W, H, win } = adsV2CoverWindow(i.sceneW, i.sceneH, i.format) // KINEO-ADS-FIEL-5-1510
  const seen = adsV2LayoutToFrame({ surface: null, faces: Array.isArray(i.faces) ? [...i.faces] : [] }, i.sceneW, i.sceneH, win) // KINEO-ADS-FIEL-5-1510
  const faces = seen ? seen.faces : [] // KINEO-ADS-FIEL-5-1510
  const raw = typeof i.topEdgeY === 'number' && Number.isFinite(i.topEdgeY) ? i.topEdgeY : null // KINEO-ADS-FIEL-5-1510
  const verdict = adsV2LockTopEdgeTrust({ raw, frameY: adsV2TopEdgeToFrame(raw, i.sceneH, win), cornerSurface: i.cornerSurface ?? null }) // KINEO-ADS-FIEL-5-1510
  const place = adsV2LockReservedPlace({ frameW: W, frameH: H, cutW: i.cutW, cutH: i.cutH, format: i.format, side: i.side, topEdgeY: verdict.ok ? verdict.y : null, faces: i.trustedFaces ? faces : [] }) // KINEO-ADS-FIEL-5-1510
  return { W, H, rect: place.rect, faces, place, top: { raw, y: verdict.y, ok: verdict.ok, why: verdict.why } } // KINEO-ADS-FIEL-5-1510
} // KINEO-ADS-FIEL-5-1510
/** KINEO-ADS-FIEL-5-1510 — o QUADRO TRAVADO com o produto no retângulo JÁ decidido (adsV2ReservedLayoutTop): a cena em `cover`, a sombra de
 *  contato nascendo NA base desse retângulo (no tampo, quando a base veio do tampo) e o recorte real por cima. Pura. */
export function adsV2PlacedFramePng(scene: AdsV2Rgba, cutTrimmed: AdsV2Rgba, format: AdsV2Format, rect: { x: number; y: number; w: number; h: number }): { png: Uint8Array; rect: { x: number; y: number; w: number; h: number }; width: number; height: number; shade: AdsV2Shade } { // KINEO-ADS-FIEL-5-1510
  const { W, H, win } = adsV2CoverWindow(scene.width, scene.height, format) // KINEO-ADS-FIEL-5-1510
  const frame = resampleRgba(scene, W, H, win) // KINEO-ADS-FIEL-5-1510
  for (let i = 3; i < frame.data.length; i += 4) frame.data[i] = 255 // KINEO-ADS-FIEL-5-1510
  const piece = resampleRgba(cutTrimmed, rect.w, rect.h) // KINEO-ADS-FIEL-5-1510
  const shade = adsV2ShadeAndMatch(frame, piece, rect, 'scene') // KINEO-ADS-FIEL-5-1510 — a elipse de contato nasce na base do retângulo: no tampo
  pasteOver(frame, piece, rect.x, rect.y) // KINEO-ADS-FIEL-5-1510
  return { png: encodePng(frame), rect, width: W, height: H, shade } // KINEO-ADS-FIEL-5-1510
} // KINEO-ADS-FIEL-5-1510
