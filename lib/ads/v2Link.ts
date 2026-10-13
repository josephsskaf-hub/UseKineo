// KINEO-ADS-V2-2026-09-28 — leitura do link do negócio para o anúncio v2 (etapa 2, servidor).
//
// O leitor puro é o do v1 (lib/ads/linkReader.ts: readLinkFacts/linkSentence/safeLinkUrl/isPrivateHost). O download
// seguro (só host público, redirecionamento MANUAL com cada salto revalidado, corpo limitado) é CÓPIA do safeGet de
// app/api/ads/from-link/route.ts — a rota v1 fica intacta até a virada pública (regra da etapa) e o helper de lá não é
// exportado.
// KINEO-ADS-1FOTO-LINK-2026-10-10 — o modo simples ganhou "Or paste your product link": adsV2LinkImport lê a página E baixa
// até 3 fotos do produto (as candidatas de readLinkFacts: JSON-LD Product, <img> grandes, og:image só sem outra), cada uma
// pelo MESMO safeGet (IP/host interno recusado antes e depois do DNS, a cada salto; tempo e bytes limitados; download
// abortado no meio quando passa do teto) e só JPG/PNG pelos BYTES. Quem guarda no user_footage é a rota
// (app/api/ads/v2/link-import), com moderação e cota — aqui nada é gravado. adsV2LinkText (o texto do link) não mudou.
import { lookup } from 'node:dns/promises'
import { isPrivateHost, linkSentence, productImageCandidates, readLinkFacts, safeLinkUrl } from '@/lib/ads/linkReader'
// KINEO-ANUNCIO-CONSERTOS-2026-10-12 — a foto DO PRODUTO primeiro (JSON-LD/og:type product/Shopify), WebP aceito e o porquê da falha.
import { imageFileKey, isShopifyHtml, preferJpegUrl, productPageImages, shopifyProductFromJson, shopifyProductJsonUrl, type LinkFacts, type ShopifyProduct } from '@/lib/ads/linkReader'
import {
  ADS_V2_LINK_FETCH_TIMEOUT_MS,
  ADS_V2_LINK_IMAGE_MAX_BYTES,
  ADS_V2_LINK_IMAGE_MIN_BYTES,
  ADS_V2_LINK_IMPORT_MAX_IMAGES,
  ADS_V2_LINK_IMPORT_MAX_TRIES,
  adsV2ImageKind,
  adsV2LinkFailWhy,
  adsV2LinkPrefill,
  type AdsV2LinkFailWhy,
} from '@/lib/ads/v2LinkImport'

const PAGE_MAX_BYTES = 1_500_000
const FETCH_TIMEOUT_MS = ADS_V2_LINK_FETCH_TIMEOUT_MS
const UA = 'Mozilla/5.0 (compatible; KineoLinkReader/1.0; +https://www.usekineo.com)'

async function publicHost(u: URL): Promise<boolean> {
  if (isPrivateHost(u.hostname)) return false
  try {
    const addrs = await lookup(u.hostname, { all: true })
    return addrs.length > 0 && addrs.every((a) => !isPrivateHost(a.address))
  } catch {
    return false
  }
}

/**
 * GET seguro: cada salto passa por publicHost (antes do pedido), redirecionamento manual revalidado por safeLinkUrl, até 4
 * saltos, tempo limitado. `truncate` = a página: passa do teto, corta e segue. Sem `truncate` (imagem): passa do teto,
 * aborta e devolve null — nunca uma imagem pela metade.
 */
async function safeGet(start: URL, accept: string, maxBytes: number, truncate: boolean, seen?: { status: number | null }): Promise<{ url: URL; type: string; body: Uint8Array } | null> {
  let url = start
  for (let hop = 0; hop < 4; hop++) {
    if (!(await publicHost(url))) return null
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: accept }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: 'no-store' })
    if (seen) seen.status = res.status // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o status final diz à tela POR QUE não abriu
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location')
      const nu = next ? safeLinkUrl(new URL(next, url).toString()) : null
      if (!nu) return null
      url = nu
      continue
    }
    if (!res.ok || !res.body) return null
    const declared = Number(res.headers.get('content-length'))
    if (!truncate && Number.isFinite(declared) && declared > maxBytes) {
      await res.body.cancel().catch(() => {})
      return null
    }
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      chunks.push(value)
      if (size > maxBytes) {
        await reader.cancel().catch(() => {})
        if (!truncate) return null
        break
      }
    }
    const body = new Uint8Array(Math.min(size, maxBytes))
    let off = 0
    for (const c of chunks) { const n = Math.min(c.byteLength, body.length - off); body.set(c.subarray(0, n), off); off += n; if (off >= body.length) break }
    return { url, type: (res.headers.get('content-type') ?? '').toLowerCase(), body }
  }
  return null
}

async function safeGetPage(start: URL, seen?: { status: number | null }): Promise<{ url: URL; type: string; body: Uint8Array } | null> {
  return safeGet(start, 'text/html,application/xhtml+xml', PAGE_MAX_BYTES, true, seen)
}

/** KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o JSON público do produto Shopify (/products/<handle>.json), pelo MESMO safeGet. */
async function shopifyProduct(pageUrl: string): Promise<ShopifyProduct | null> {
  const j = shopifyProductJsonUrl(pageUrl)
  const u = j ? safeLinkUrl(j) : null
  if (!u) return null
  const got = await safeGet(u, 'application/json', 1_000_000, false).catch(() => null)
  return got ? shopifyProductFromJson(new TextDecoder('utf-8').decode(got.body)) : null
}

/** Os fatos de uma página que não abriu, tirados do JSON do Shopify (só o que ele diz; nunca contato). */
function factsFromShopify(p: ShopifyProduct, url: URL): LinkFacts {
  return { title: p.title, siteName: p.vendor, description: p.description, price: p.price, images: p.images, logo: null, host: url.hostname.replace(/^www\./, ''), lang: null, shareOnly: false }
}

/** A frase do negócio lida do link (null = página inacessível ou não-HTML). */
export async function adsV2LinkText(raw: string): Promise<{ text: string; lang: string | null; host: string } | null> {
  const target = safeLinkUrl(raw)
  if (!target) return null
  const page = await safeGetPage(target).catch(() => null)
  if (!page || !/html|xml/.test(page.type)) {
    // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — loja Shopify que barra a leitura da página: o JSON do produto ainda fala.
    const sp = await shopifyProduct(target.toString())
    if (!sp) return null
    const f = factsFromShopify(sp, target)
    const t = linkSentence(f)
    return t ? { text: t, lang: null, host: f.host } : null
  }
  const facts = readLinkFacts(new TextDecoder('utf-8').decode(page.body), page.url.toString())
  const text = linkSentence(facts)
  return text ? { text, lang: facts.lang, host: facts.host } : null
}

export interface AdsV2LinkImage {
  /** Endereço de onde veio (a página citou). */
  src: string
  /** KINEO-ANUNCIO-CONSERTOS-2026-10-12 — 'webp' NÃO vai ao bucket: a rota o devolve embutido e o navegador converte no recorte. */
  ext: 'jpg' | 'png' | 'webp'
  bytes: Uint8Array
}
export interface AdsV2LinkImportResult {
  /** O endereço final da página (depois dos redirecionamentos) — é ele que vai ao pedido como `link`. */
  link: string
  host: string
  title: string
  price: string | null
  lang: string | null
  /** A frase da página (linkSentence) — a moderação lê esta. */
  text: string
  /** A frase sugerida para "o que você vende" (só quando a pessoa ainda não escreveu). */
  sentence: string
  /** Quantas candidatas a página tinha (antes de baixar). */
  candidates: number
  images: AdsV2LinkImage[]
  /** Candidatas tentadas e puladas (quebrada, pequena, grande demais, WebP/GIF, host interno). */
  skipped: number
}

/**
 * KINEO-ADS-1FOTO-LINK-2026-10-10 — lê a página do produto e baixa até `max` fotos (JPG/PNG pelos bytes, entre
 * ADS_V2_LINK_IMAGE_MIN_BYTES e o teto, que é o menor entre ADS_V2_LINK_IMAGE_MAX_BYTES e `roomBytes`). null = link
 * recusado (interno, porta estranha, credencial) ou página que não abre/não é HTML. Nada é gravado aqui.
 */
export async function adsV2LinkImport(raw: string, opts: { max?: number; roomBytes?: number; why?: { value?: AdsV2LinkFailWhy } } = {}): Promise<AdsV2LinkImportResult | null> {
  const target = safeLinkUrl(raw)
  if (!target) return null
  const seen = { status: null as number | null }
  const page = await safeGetPage(target, seen).catch(() => null)
  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — a página abriu (HTML) → os fatos dela; loja Shopify (na página ou, se a página
  // barrou a leitura, pelo caminho /products/<handle>) → o JSON do produto completa as FOTOS DESTE produto. Nada abriu =
  // null com o porquê (bloqueou / não existe / não é página) para a tela dizer a coisa certa.
  const pageOk = !!page && /html|xml/.test(page.type)
  const html = pageOk && page ? new TextDecoder('utf-8').decode(page.body) : ''
  const finalUrl = pageOk && page ? page.url : target
  const sp = (!pageOk || isShopifyHtml(html)) ? await shopifyProduct(finalUrl.toString()) : null
  const facts: LinkFacts | null = pageOk ? readLinkFacts(html, finalUrl.toString()) : sp ? factsFromShopify(sp, finalUrl) : null
  if (!facts) {
    if (opts.why) opts.why.value = adsV2LinkFailWhy(seen.status, !!page)
    return null
  }
  const max = Math.max(0, Math.min(ADS_V2_LINK_IMPORT_MAX_IMAGES, Math.floor(opts.max ?? ADS_V2_LINK_IMPORT_MAX_IMAGES)))
  let room = typeof opts.roomBytes === 'number' && Number.isFinite(opts.roomBytes) ? Math.max(0, opts.roomBytes) : Number.POSITIVE_INFINITY
  // As fotos que a página DECLARA do produto (+ as do JSON do Shopify), sem o logo e sem repetir o arquivo; as <img> soltas
  // da página (relacionados, banners, equipe — a pessoa e o "outro pote" da Black Chicken) só quando nenhuma declarada baixou.
  const logoKey = facts.logo ? imageFileKey(facts.logo) : null
  const byFile = new Set<string>()
  const declared = [...productPageImages(html, finalUrl.toString()), ...(sp?.images ?? [])].filter((u) => {
    const k = imageFileKey(u)
    if (!k || k === logoKey || byFile.has(k)) return false
    byFile.add(k)
    return true
  })
  const primary = productImageCandidates(declared.map(preferJpegUrl), ADS_V2_LINK_IMPORT_MAX_TRIES)
  const general = productImageCandidates(facts.images.filter((u) => !logoKey || imageFileKey(u) !== logoKey).map(preferJpegUrl), ADS_V2_LINK_IMPORT_MAX_TRIES)
  const images: AdsV2LinkImage[] = []
  const tried = new Set<string>()
  let skipped = 0
  const take = async (list: readonly string[]) => {
    for (const src of list) {
      if (images.length >= max) break
      const key = src.split('?')[0].toLowerCase()
      if (tried.has(key)) continue
      tried.add(key)
      const cap = Math.min(ADS_V2_LINK_IMAGE_MAX_BYTES, room)
      const u = safeLinkUrl(src)
      const img = u && cap >= ADS_V2_LINK_IMAGE_MIN_BYTES ? await safeGet(u, 'image/jpeg,image/png;q=0.9,*/*;q=0.1', cap, false).catch(() => null) : null
      const ext = img ? adsV2ImageKind(img.body) : null
      if (!img || !ext || img.body.byteLength < ADS_V2_LINK_IMAGE_MIN_BYTES) { skipped++; continue }
      room -= img.body.byteLength
      images.push({ src, ext, bytes: img.body })
    }
  }
  await take(primary)
  if (!images.length) await take(general)
  return {
    link: finalUrl.toString(),
    host: facts.host,
    title: facts.title,
    price: facts.price,
    lang: facts.lang,
    text: linkSentence(facts),
    sentence: adsV2LinkPrefill(facts),
    candidates: primary.length || general.length,
    images,
    skipped,
  }
}

/**
 * KINEO-SHOPIFY-2026-10-13 (etapa 2) — UMA foto por URL, pelo MESMO safeGet do link-import (host público antes e depois do DNS, a
 * cada salto; tempo e bytes limitados; download abortado no meio quando passa do teto) e só JPG/PNG/WebP pelos BYTES. É a porta
 * das fotos do produto que o app da Shopify lê na Admin API (o chamador ainda exige o host do CDN da Shopify). Nada é gravado aqui.
 */
export async function adsV2FetchImage(raw: string, maxBytes: number): Promise<{ ext: 'jpg' | 'png' | 'webp'; bytes: Uint8Array } | null> {
  const u = safeLinkUrl(raw)
  const cap = Math.min(ADS_V2_LINK_IMAGE_MAX_BYTES, Math.max(0, maxBytes))
  if (!u || cap < ADS_V2_LINK_IMAGE_MIN_BYTES) return null
  const img = await safeGet(u, 'image/jpeg,image/png;q=0.9,*/*;q=0.1', cap, false).catch(() => null)
  const ext = img ? adsV2ImageKind(img.body) : null
  if (!img || !ext || img.body.byteLength < ADS_V2_LINK_IMAGE_MIN_BYTES) return null
  return { ext, bytes: img.body }
}
