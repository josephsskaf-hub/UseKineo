// KINEO-ADS-BOLA-2110 — os consertos do anúncio "— bola de futebol" (fundador 21/10: "o ads que eu tentei está horrível, descobre porquê";
// KINEO-ADS-BOLA-2110 — diagnóstico em docs/ADS-BOLA-DIAGNOSTICO-2026-10-21.md, pedido 618a6680). LIB PURA (só importa lib/ads/v2Simple, também pura): entra no servidor
// KINEO-ADS-BOLA-2110 — (brief, plano, título da Biblioteca) e na tela (título do cartão final, tipo do anúncio) e roda crua no guardião
// KINEO-ADS-BOLA-2110 — scripts/test-ads-bola-2110.mjs.
//   1. O NOME DO NEGÓCIO LIMPO: o brief pedia "<nome> — <o que vende>"; sem nome saía "— bola de futebol" (travessão na frente), sem o que vende
//      "Perfume LUME —" (atrás). 48 de 71 anúncios entregues em 14 dias levaram o travessão solto ao título da Biblioteca; Pedro/Universo recebeu
//      "— estátua colecionável". Agora uma função só limpa (adsV2CleanBusiness) e o brief nasce de {name, sells} (adsV2ComposeBusiness): o
//      travessão só existe quando os DOIS lados existem. Loja de terceiros ("Amazon.com") nunca é a marca: fica o produto.
//   2. O TEXTO-INSTRUÇÃO: a pessoa colou um PROMPT ("Crie uma propaganda de 15 segundos … para a bola de futebol da foto … Narração: “…”"). A
//      frase longa virou "lugar", a fala virou de loja e o cartão final disse "Crie uma propaganda de 15 segundos". adsV2ReadInstruction (em lib/ads/v2Simple.ts, pura e sem import: o título do cartão da tela usa) reconhece
//      a instrução e devolve o PRODUTO e a NARRAÇÃO entre aspas (inteira ou cortada).
//   3. A FOTO PEQUENA: a foto do produto era uma miniatura de 225×225 do Google. adsV2ImageSizeFromHead lê o tamanho real (JPEG/PNG/WebP) dos
//      primeiros bytes; lado menor < 500 px = aviso claro + confirmação (os textos moram aqui para a tela).
//   4. O LIMITE DO TEXTO: a caixa cortava em silêncio no caractere 400; o servidor recusa (sentence_too_long) e o texto do aviso mora aqui.

import { adsV2IsMarketplace } from './v2Simple'
import { adsV2StripUrls } from './v2Simple' // KINEO-ADS-FONTE-LINK-2810 — o link colado nunca vira o nome (pedido 8e8f7ad9: business "https")

// ── 1. o nome do negócio ─────────────────────────────────────────────────────────────────────────────────────────────────
const EDGE_JUNK = /^[\s—–\-−‐‒―:;,|·•/\\]+|[\s—–\-−‐‒―:;,|·•/\\]+$/gu
const SPLIT_PARTS = /\s+[—–\-−‒―|]\s+/u
/**
 * O texto do negócio limpo (pura): sem travessão/hífen/dois-pontos solto na FRENTE ou ATRÁS ("— bola de futebol" → "bola de futebol",
 * "Perfume LUME —" → "Perfume LUME"); loja de terceiros na frente sai ("Amazon.com — mini printer" → "mini printer"); só a loja = ''; sem
 * nenhuma letra/número = ''. O travessão do MEIO ("Perfume LUME — fragrâncias") fica: é o formato que brandName quebra.
 */
export function adsV2CleanBusiness(raw: unknown): string {
  let s = adsV2StripUrls(String(raw ?? '').replace(/\s+/g, ' ').trim()).replace(EDGE_JUNK, '') // KINEO-ADS-FONTE-LINK-2810 — endereço, "https"/"www" e encurtador saem antes de tudo ("https" → '' = sem nome)
  const parts = s.split(SPLIT_PARTS)
  if (parts.length > 1 && adsV2IsMarketplace(parts[0])) s = parts.slice(1).join(' — ').replace(EDGE_JUNK, '')
  if (adsV2IsMarketplace(s)) return ''
  return /[\p{L}\p{N}]/u.test(s) ? s : ''
}
/** O NOME (a parte antes do travessão do meio), limpo dos dois lados (pura). "— bola de futebol" → "bola de futebol"; "Perfume LUME —" → "Perfume LUME". */
export function adsV2BusinessName(raw: unknown): string {
  return adsV2CleanBusiness(adsV2CleanBusiness(raw).split(SPLIT_PARTS)[0])
}
/**
 * O texto do negócio a partir de {name, sells} (pura): "<nome> — <o que vende>" SÓ quando os dois existem e um não contém o outro; senão o
 * que existir. Loja de terceiros como nome = sem nome.
 */
export function adsV2ComposeBusiness(name: unknown, sells: unknown): string {
  const n0 = adsV2CleanBusiness(name)
  const n = adsV2IsMarketplace(n0) ? '' : n0
  const s = adsV2CleanBusiness(sells)
  if (n && s) {
    const nl = n.toLowerCase(), sl = s.toLowerCase()
    if (sl.includes(nl)) return s
    if (nl.includes(sl)) return n
    return `${n} — ${s}`
  }
  return n || s
}

// ── 3. a foto do produto pequena ────────────────────────────────────────────────────────────────────────────────────────
/** O lado menor mínimo da foto do produto (px): abaixo disso o close de 1080 px fica borrado e o modelo copia um produto mole. */
export const ADS_V2_PRODUCT_PHOTO_MIN_SIDE = 500
/** KINEO-ADS-QUALIDADE-2110 — O LIMITE ÚNICO de "foto pequena" (lado menor < 500 px) da tela e do servidor: o aviso do /plan, o aviso da tela foco (v2Nota9) e o aviso do cartão da foto (/ads/v2 simples e completo). */ // KINEO-ADS-QUALIDADE-2110
export const ADS_V2_SMALL_PHOTO_MIN_SIDE: number = ADS_V2_PRODUCT_PHOTO_MIN_SIDE // KINEO-ADS-QUALIDADE-2110 — = 500; o valor mora na linha de cima (a mutação do guardião da bola continua valendo para todos)
/** KINEO-ADS-QUALIDADE-2110 — A foto (largura × altura reais) é pequena? Lado menor < ADS_V2_SMALL_PHOTO_MIN_SIDE. Dimensão desconhecida (0) não acusa. Pura. */ // KINEO-ADS-QUALIDADE-2110
export function adsV2SmallPhotoSide(w: number, h: number): boolean { const s = Math.min(Number(w) || 0, Number(h) || 0); return s > 0 && s < ADS_V2_SMALL_PHOTO_MIN_SIDE } // KINEO-ADS-QUALIDADE-2110
/** Interruptor: true = o /plan RECUSA foto pequena sem a confirmação da pessoa (body.small_photo_ok); false = só avisa (resposta + evento).
 *  Virar para true quando a tela nova mostrar o aviso com o botão de confirmar (KINEO-ADS-NOTA9-2110). */
export const ADS_V2_SMALL_PHOTO_CONFIRM_REQUIRED: boolean = false
/** Largura × altura pelos primeiros bytes de um JPEG, PNG ou WebP (pura). null = não reconheceu (ou os bytes acabaram antes). */
export function adsV2ImageSizeFromHead(bytes: Uint8Array | null | undefined): { width: number; height: number } | null {
  const b = bytes && ArrayBuffer.isView(bytes) ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) : null // vale para bytes de outro "realm" (o carregador do guardião roda num vm)
  if (!b || b.length < 16) return null
  const be16 = (o: number) => (b[o] << 8) | b[o + 1]
  const be32 = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0
  const ok = (w: number, h: number) => (w > 0 && h > 0 && w < 100000 && h < 100000 ? { width: w, height: h } : null)
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return b.length >= 24 ? ok(be32(16), be32(20)) : null
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const mk = b[i + 1]
      if (mk === 0xff) { i++; continue }
      if (mk === 0xd8 || mk === 0x01 || (mk >= 0xd0 && mk <= 0xd7)) { i += 2; continue }
      if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) return ok(be16(i + 7), be16(i + 5))
      if (mk === 0xd9 || mk === 0xda) return null
      i += 2 + be16(i + 2)
    }
    return null
  }
  if (b.length >= 30 && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP') {
    const kind = String.fromCharCode(b[12], b[13], b[14], b[15])
    if (kind === 'VP8X') return ok(1 + (b[24] | (b[25] << 8) | (b[26] << 16)), 1 + (b[27] | (b[28] << 8) | (b[29] << 16)))
    if (kind === 'VP8L' && b[20] === 0x2f) { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return ok(1 + (v & 0x3fff), 1 + ((v >>> 14) & 0x3fff)) }
    if (kind === 'VP8 ' && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return ok((b[26] | (b[27] << 8)) & 0x3fff, (b[28] | (b[29] << 8)) & 0x3fff)
  }
  return null
}
/** A foto do produto é pequena demais? (pura) null/ilegível = false (nunca bloqueia sem medir). */
export function adsV2ProductPhotoSmall(size: { width: number; height: number } | null | undefined): boolean {
  return !!size && Math.min(size.width, size.height) < ADS_V2_PRODUCT_PHOTO_MIN_SIDE
}
/** Os textos do aviso da foto pequena (a tela nova mostra; o /plan devolve o da língua do pedido). */
export const ADS_V2_PRODUCT_PHOTO_SMALL_TEXT: Readonly<Record<'en' | 'pt' | 'es', { title: string; body: string; confirm: string; replace: string }>> = {
  en: { title: 'This product photo is very small', body: 'It is {w}×{h} px. In a 1080p ad the product will look blurry and the AI copies a blurry product. Send a bigger photo (at least 500 px on the short side) or paste the product link.', confirm: 'Use this photo anyway', replace: 'Send a bigger photo' },
  pt: { title: 'Esta foto do produto é muito pequena', body: 'Ela tem {w}×{h} px. Num anúncio em 1080p o produto fica borrado e a IA copia um produto borrado. Envie uma foto maior (pelo menos 500 px no lado menor) ou cole o link do produto.', confirm: 'Usar esta foto mesmo assim', replace: 'Enviar uma foto maior' },
  es: { title: 'Esta foto del producto es muy pequeña', body: 'Mide {w}×{h} px. En un anuncio en 1080p el producto se verá borroso y la IA copia un producto borroso. Envía una foto más grande (al menos 500 px en el lado corto) o pega el enlace del producto.', confirm: 'Usar esta foto de todos modos', replace: 'Enviar una foto más grande' },
}
/** O aviso na língua (desconhecida = inglês), com o tamanho medido. Pura. */
export function adsV2ProductPhotoSmallText(lang: unknown, size: { width: number; height: number }): { title: string; body: string; confirm: string; replace: string } {
  const k = String(lang ?? '').toLowerCase().slice(0, 2)
  const t = (ADS_V2_PRODUCT_PHOTO_SMALL_TEXT as Record<string, { title: string; body: string; confirm: string; replace: string }>)[k] ?? ADS_V2_PRODUCT_PHOTO_SMALL_TEXT.en
  return { ...t, body: t.body.replace('{w}', String(size.width)).replace('{h}', String(size.height)) }
}

// ── 4. o limite do texto (nunca cortar em silêncio) ──────────────────────────────────────────────────────────────────────
const SENTENCE_LIMIT_TEXT: Readonly<Record<'en' | 'pt' | 'es', string>> = {
  en: 'Your text has {n} characters; the limit is {max}. Nothing was cut. Write what you sell and, if you want, the narration in quotes.',
  pt: 'Seu texto tem {n} caracteres; o limite é {max}. Nada foi cortado. Escreva o que você vende e, se quiser, a narração entre aspas.',
  es: 'Tu texto tiene {n} caracteres; el límite es {max}. No se cortó nada. Escribe lo que vendes y, si quieres, la narración entre comillas.',
}
/** O aviso do texto longo demais (a tela mostra no lugar de cortar no caractere `max`). Pura. */
export function adsV2SentenceLimitText(lang: unknown, length: number, max: number): string {
  const k = String(lang ?? '').toLowerCase().slice(0, 2)
  const t = (SENTENCE_LIMIT_TEXT as Record<string, string>)[k] ?? SENTENCE_LIMIT_TEXT.en
  return t.replace('{n}', String(Math.max(0, Math.floor(length)))).replace('{max}', String(Math.max(0, Math.floor(max))))
}

// ── 5. medir a foto do produto no servidor (só os primeiros bytes) ─────────────────────────────────────────────────────────
/** Quantos bytes do começo do arquivo bastam para achar o tamanho (o EXIF de celular pode passar de 64 KB antes do SOF do JPEG). */
export const ADS_V2_IMAGE_HEAD_BYTES = 262144
/** O tamanho real da imagem pela URL (lê só o começo; Range quando o servidor aceita). null = não deu (rede, formato, tempo): nunca bloqueia. */
export async function adsV2MeasureImage(url: unknown, doFetch: typeof fetch = fetch, timeoutMs = 4000): Promise<{ width: number; height: number } | null> {
  const u = typeof url === 'string' ? url.trim() : ''
  if (!/^https:\/\/\S+$/i.test(u)) return null
  try {
    const res = await doFetch(u, { headers: { Range: `bytes=0-${ADS_V2_IMAGE_HEAD_BYTES - 1}` }, ...(typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(timeoutMs) } : {}) })
    if (!res.ok) return null
    const reader = res.body && typeof res.body.getReader === 'function' ? res.body.getReader() : null
    if (!reader) return adsV2ImageSizeFromHead(new Uint8Array((await res.arrayBuffer()).slice(0, ADS_V2_IMAGE_HEAD_BYTES)))
    const chunks: Uint8Array[] = []
    let n = 0
    while (n < ADS_V2_IMAGE_HEAD_BYTES) {
      const { done, value } = await reader.read()
      if (done || !value) break
      chunks.push(value)
      n += value.length
    }
    try { await reader.cancel() } catch { /* já terminou */ }
    const head = new Uint8Array(Math.min(n, ADS_V2_IMAGE_HEAD_BYTES))
    let o = 0
    for (const c of chunks) { if (o >= head.length) break; const part = c.subarray(0, head.length - o); head.set(part, o); o += part.length }
    return adsV2ImageSizeFromHead(head)
  } catch {
    return null
  }
}
