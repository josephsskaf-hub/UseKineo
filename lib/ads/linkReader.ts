// KINEO-ADS-LINK-2026-09-26 — "cole o link do seu site ou produto" (item 1 da pesquisa de concorrentes, 26/09: 8 de 14
// concorrentes têm). Módulo PURO: lê o HTML que o servidor baixou e devolve título, descrição, preço, imagens e o ícone
// que serve de logo. Nenhuma rede aqui — a rota /api/ads/from-link baixa, este módulo só interpreta, e o guardião roda
// com HTML de verdade sem internet.
//
// Regras: só o que a página DIZ (og:, twitter:, JSON-LD Product/Organization, <title>, meta description); nada é
// inventado. O texto devolvido vira a frase do modo IA, que passa pelo mesmo validador (número e contato só se estiverem
// no texto). O contato é o próprio site (domínio) quando a página não traz telefone.

export interface LinkFacts {
  title: string
  siteName: string
  description: string
  price: string | null
  images: string[]
  logo: string | null
  host: string
  /** Idioma declarado pela página (<html lang>), se for um código de 2 letras. */
  lang: string | null
  /** true = as únicas imagens eram a de compartilhamento (og/twitter), que costuma ser logo/banner, não produto. */
  shareOnly: boolean
  /** KINEO-ADS-LINK-LOJAS-1510 — a plataforma, a moeda, a marca, a confiança do leitor e os porquês; a página de robô/login/só-JS. */
  platform?: LinkPlatform
  currency?: string | null
  brand?: string
  confidence?: LinkConfidence
  reasons?: string[]
  blocked?: LinkBlockKind | null
}

const MAX_IMAGES = 6

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : '' })
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { const c = parseInt(h, 16); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : '' }) // KINEO-ADS-LINK-LOJAS-1510 — o Magento escreve og:title "Joust&#x20;Duffle&#x20;Bag"
}
const clean = (s: string | null | undefined, max = 300) => decodeEntities(String(s ?? '')).replace(/\s+/g, ' ').trim().slice(0, max)

/** Atributos de todas as tags <meta> / <link> (ordem de aparição). */
function tags(html: string, tag: 'meta' | 'link'): Record<string, string>[] {
  const out: Record<string, string>[] = []
  const re = new RegExp(`<${tag}\\b([^>]*)>`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < 400) {
    const attrs: Record<string, string> = {}
    const ar = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g
    let a: RegExpExecArray | null
    while ((a = ar.exec(m[1]))) attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? ''
    out.push(attrs)
  }
  return out
}

function metaContent(metas: Record<string, string>[], ...keys: string[]): string[] {
  const want = keys.map((k) => k.toLowerCase())
  return metas.filter((t) => want.includes((t.property ?? t.name ?? '').toLowerCase()) && t.content).map((t) => t.content)
}

function absolute(u: string, base: string): string | null {
  try {
    const url = new URL(decodeEntities(u.trim()), base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch { return null }
}

type Json = Record<string, unknown>
function jsonLdNodes(html: string): Json[] {
  const out: Json[] = []
  const re = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < 30) {
    try {
      const parsed = JSON.parse(m[1].trim())
      const stack: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
      while (stack.length && out.length < 60) {
        const n = stack.shift()
        if (!n || typeof n !== 'object') continue
        if (Array.isArray(n)) { stack.push(...n); continue }
        const node = n as Json
        out.push(node)
        if (Array.isArray(node['@graph'])) stack.push(...(node['@graph'] as unknown[]))
      }
    } catch { /* JSON-LD quebrado: ignora esse bloco */ }
  }
  return out
}
const typeIs = (n: Json, t: string) => {
  const v = n['@type']
  return Array.isArray(v) ? v.includes(t) : v === t
}
const imagesOf = (v: unknown): string[] => {
  if (!v) return []
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.flatMap(imagesOf)
  if (typeof v === 'object') { const o = v as Json; return typeof o.url === 'string' ? [o.url] : typeof o.contentUrl === 'string' ? [o.contentUrl] : [] }
  return []
}

/** Lê os fatos da página. `pageUrl` = o endereço FINAL (depois de redirecionamentos). */
export function readLinkFacts(html: string, pageUrl: string): LinkFacts {
  const head = html.slice(0, 600_000)
  const metas = tags(head, 'meta')
  const links = tags(head, 'link')
  const ld = jsonLdNodes(head)
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? '' // KINEO-ADS-DEMO-UNIVERSO-1410 — lido antes: a conferência do nome usa o título
  const product = pageProduct(pageUrl, ld, metas, links, titleTag) // KINEO-ADS-DEMO-UNIVERSO-1410 — o produto DESTA página (nunca o 1º do carrossel de recomendados)
  const nuvem = nuvemshopProduct(head) // KINEO-ADS-DEMO-UNIVERSO-1410 — LS.product/LS.variants da Nuvemshop
  const core = readProductCore(html, pageUrl) // KINEO-ADS-LINK-LOJAS-1510 — o produto em qualquer plataforma (nome conferido, preço de VENDA ou nenhum, fotos maiores)
  const read = core.read // KINEO-ADS-LINK-LOJAS-1510
  const org = ld.find((n) => typeIs(n, 'Organization') || typeIs(n, 'LocalBusiness') || typeIs(n, 'Restaurant') || typeIs(n, 'Store'))
  let host = ''
  try { host = new URL(pageUrl).hostname.replace(/^www\./, '') } catch { /* fica vazio */ }

  const title = clean(read.name || (product?.name as string) || metaContent(metas, 'og:title', 'twitter:title')[0] || nuvem?.name || titleTag, 160) // KINEO-ADS-DEMO-UNIVERSO-1410 — + o nome da Nuvemshop antes do <title> // KINEO-ADS-LINK-LOJAS-1510 — read.name primeiro
  const siteName = clean(metaContent(metas, 'og:site_name', 'application-name')[0] || (org?.name as string) || '', 80)
  const description = clean(read.description || (product?.description as string) || metaContent(metas, 'og:description', 'description', 'twitter:description')[0] || '', 400) // KINEO-ADS-LINK-LOJAS-1510

  let price: string | null = null
  const offers = product?.offers
  const offer = (Array.isArray(offers) ? offers[0] : offers) as Json | undefined
  const p = nuvem?.price ?? offer?.price ?? offer?.lowPrice ?? metaContent(metas, 'product:price:amount', 'og:price:amount')[0] // KINEO-ADS-DEMO-UNIVERSO-1410 — Nuvemshop: o preço de VENDA (o JSON-LD dela traz o "de")
  const cur = (nuvem?.price ? nuvem.currency : null) ?? offer?.priceCurrency ?? metaContent(metas, 'product:price:currency', 'og:price:currency')[0] // KINEO-ADS-DEMO-UNIVERSO-1410
  if (p !== undefined && p !== null && String(p).trim() && /\d/.test(String(p))) price = `${String(cur ?? '').trim()} ${String(p).trim()}`.trim()
  price = read.price ? `${read.currency ?? ''} ${read.price}`.trim() : null // KINEO-ADS-LINK-LOJAS-1510 — o preço do leitor de plataformas MANDA: o de venda, ou nenhum ("de", faixa ou conflito = sem preço)

  // KINEO-ADS-TESTE1-2026-09-26 — relatório do Cowork: as "2 fotos" da Allbirds eram a MESMA imagem de compartilhamento
  // (logo em fundo branco), com e sem query. Agora: foto de PRODUTO primeiro (JSON-LD, depois <img> grandes da página),
  // a de compartilhamento só se não houver outra; nada com cara de logo/ícone; repetição medida por caminho, sem query.
  const shareImages = metaContent(metas, 'og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src')
  const pageImages = imgTags(head)
  const images: string[] = []
  const seen = new Set<string>()
  const push = (c: string) => {
    const a = absolute(c, pageUrl)
    if (!a || images.length >= MAX_IMAGES || !looksLikePhoto(a)) return
    const key = pathKey(a)
    if (seen.has(key)) return
    seen.add(key)
    images.push(a)
  }
  for (const c of core.declared) push(c) // KINEO-ADS-LINK-LOJAS-1510 — as fotos que a página declara do produto, já na maior versão
  for (const c of imagesOf(product?.image)) push(largestImageVariant(c, head, pageUrl)) // KINEO-ADS-DEMO-UNIVERSO-1410 — a MAIOR versão que a página oferece
  for (const c of nuvem?.images ?? []) push(c) // KINEO-ADS-DEMO-UNIVERSO-1410
  for (const c of pageImages) push(c)
  const beforeShare = images.length
  if (beforeShare === 0) for (const c of shareImages) push(c)
  const shareOnly = beforeShare === 0 && images.length > 0
  const lang = (/<html\b[^>]*\blang\s*=\s*["']?([a-zA-Z]{2})/i.exec(head)?.[1] ?? '').toLowerCase() || null

  // Logo: logo da organização no JSON-LD → apple-touch-icon → ícone grande (nunca favicon .ico de 16 px).
  const icons = links.filter((l) => /(apple-touch-icon|icon)/i.test(l.rel ?? '') && l.href)
  const bigIcon = icons.find((l) => /apple-touch-icon/i.test(l.rel ?? '')) ?? icons.find((l) => /(\d{3,})x\1/.test(l.sizes ?? '') && Number((l.sizes ?? '0x').split('x')[0]) >= 120)
  const logoRaw = imagesOf(org?.logo)[0] ?? bigIcon?.href ?? null
  const logo = logoRaw ? absolute(logoRaw, pageUrl) : null

  return { title, siteName, description, price, images, logo: logo && !/\.(svg|ico)(\?|$)/i.test(logo) ? logo : null, host, lang, shareOnly, platform: read.platform, currency: read.price ? read.currency : null, brand: read.brand, confidence: read.confidence, reasons: read.reasons, blocked: read.blocked } // KINEO-ADS-LINK-LOJAS-1510
}

/** Mesmo arquivo com query ou protocolo diferentes = mesma imagem. */
function pathKey(u: string): string {
  try { const x = new URL(u); return (x.hostname + x.pathname).toLowerCase() } catch { return u }
}

/** Parece foto (e não logo, ícone, sprite, pixel ou vetor)? */
export function looksLikePhoto(u: string): boolean {
  if (/\.(svg|gif|ico)(\?|$)/i.test(u) || /^data:/i.test(u)) return false
  let path = u
  try { path = new URL(u).pathname } catch { /* usa a string */ }
  return !/(logo|brand-?mark|favicon|icon|sprite|placeholder|pixel|spacer|badge|avatar|payment|flag)/i.test(path)
}

/** <img> da página com cara de foto de produto: src/data-src/srcset (o maior), largura declarada ≥ 300 quando houver. */
function imgTags(html: string): string[] {
  const out: string[] = []
  const re = /<img\b([^>]*)>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < 40) {
    const attrs: Record<string, string> = {}
    const ar = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g
    let a: RegExpExecArray | null
    while ((a = ar.exec(m[1]))) attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? ''
    const w = Number(attrs.width)
    if (Number.isFinite(w) && w > 0 && w < 300) continue
    const set = attrs.srcset || attrs['data-srcset'] || ''
    const biggest = set.split(',').map((p) => p.trim().split(/\s+/)).filter((p) => p[0]).sort((x, y) => (parseInt(y[1] ?? '0', 10) || 0) - (parseInt(x[1] ?? '0', 10) || 0))[0]?.[0]
    const src = biggest || attrs['data-src'] || attrs.src
    if (src) out.push(src)
  }
  return out
}

/** A frase do modo IA a partir dos fatos da página (a pessoa pode editar antes de gerar). */
export function linkSentence(f: LinkFacts): string {
  const name = f.siteName && f.title && !f.title.toLowerCase().includes(f.siteName.toLowerCase()) ? `${f.siteName} — ${f.title}` : (f.title || f.siteName || f.host)
  return [
    `${name}.`,
    f.description ? (/[.!?]$/.test(f.description) ? f.description : `${f.description}.`) : '',
    f.price ? `Price: ${f.price}.` : '',
    f.host ? `Website: ${f.host}.` : '',
  ].filter(Boolean).join(' ').slice(0, 1400)
}

/** Endereço que pode ser baixado com segurança: http(s), sem credencial, sem porta estranha, sem IP/host interno. */
export function safeLinkUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null
  let s = raw.trim()
  if (!s || s.length > 2000) return null
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`
  let u: URL
  try { u = new URL(s) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (u.username || u.password) return null
  if (u.port && !['80', '443'].includes(u.port)) return null
  const h = u.hostname.toLowerCase()
  if (!h.includes('.') || h === 'localhost' || /\.(local|internal|localhost|lan|home|corp)$/.test(h)) return null
  if (isPrivateHost(h)) return null
  return u
}

/** IP literal privado/reservado (v4 e v6). Nome de host passa aqui e é conferido de novo depois do DNS. */
export function isPrivateHost(h: string): boolean {
  const host = h.replace(/^\[|\]$/g, '')
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  if (host.includes(':')) return host === '::1' || host === '::' || /^f[cd]/i.test(host) || /^fe80/i.test(host) || /^::ffff:/i.test(host)
  return false
}

/**
 * KINEO-ADS-1FOTO-LINK-2026-10-10 — candidatas a FOTO DO PRODUTO para o "Or paste your product link" do modo simples do
 * /ads/v2: as imagens de readLinkFacts (foto do JSON-LD Product, depois <img> grandes; og:image/twitter:image só quando
 * não há outra), conferidas de novo: só http(s), com cara de foto (looksLikePhoto), sem repetir o mesmo arquivo (pathKey).
 * No máximo `max`. Pura (a rota baixa; aqui só se escolhe).
 */
export function productImageCandidates(images: readonly unknown[], max = MAX_IMAGES): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of Array.isArray(images) ? images : []) {
    if (out.length >= max) break
    if (typeof raw !== 'string' || !/^https?:\/\//i.test(raw) || !looksLikePhoto(raw)) continue
    const key = pathKey(raw)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(raw)
  }
  return out
}

// ── KINEO-ANUNCIO-CONSERTOS-2026-10-12 — a FOTO DO PRODUTO primeiro, nunca o logo nem a pessoa ──────────────────────────
// Prospecção de 12/10: na Black Chicken o link trouxe a foto de uma pessoa e o pote de OUTRO produto (as <img> da página:
// relacionados, banners, equipe) e o anúncio saiu vendendo o produto errado; na East Coast veio o LOGO como "foto". Na
// Graydon a página não abriu e a foto principal era WebP. Regra nova: quando a página DECLARA o produto (JSON-LD Product,
// og:type=product) ou é uma loja Shopify (/products/<handle>.json), só as fotos desse produto entram; as <img> soltas da
// página só servem quando não há nenhuma foto declarada. Puro (a rede mora em lib/ads/v2Link.ts).

/** As fotos que a página diz serem DO PRODUTO: JSON-LD Product.image; sem ela, og:image só se og:type = product. */
export function productPageImages(html: string, pageUrl: string): string[] {
  const head = String(html ?? '').slice(0, 600_000)
  const metas = tags(head, 'meta') // KINEO-ADS-DEMO-UNIVERSO-1410 — lido antes: a escolha do produto confere o nome com og:title
  const product = pageProduct(pageUrl, jsonLdNodes(head), metas, tags(head, 'link'), /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? '') // KINEO-ADS-DEMO-UNIVERSO-1410 — o produto DESTA página
  const nuvem = nuvemshopProduct(head) // KINEO-ADS-DEMO-UNIVERSO-1410
  const fromLd = [...imagesOf(product?.image), ...(nuvem?.images ?? [])].map((u) => absolute(largestImageVariant(u, head, pageUrl), pageUrl)).filter((u): u is string => !!u) // KINEO-ADS-DEMO-UNIVERSO-1410 — a maior versão; + a foto da Nuvemshop
  const declared = readProductCore(head, pageUrl).declared // KINEO-ADS-LINK-LOJAS-1510 — Shopify/Tray/Magento/Amazon/Wix…: as fotos do produto na maior versão
  if (declared.length) return [...new Set([...declared, ...fromLd])] // KINEO-ADS-LINK-LOJAS-1510
  if (fromLd.length) return fromLd
  if (!metaContent(metas, 'og:type').some((t) => /product/i.test(t))) return []
  return metaContent(metas, 'og:image', 'og:image:secure_url', 'og:image:url').map((u) => absolute(largestImageVariant(u, head, pageUrl), pageUrl)).filter((u): u is string => !!u) // KINEO-ADS-DEMO-UNIVERSO-1410 — a maior versão
}

/** A página é de uma loja Shopify (marcas do tema/CDN no HTML). */
export function isShopifyHtml(html: string | null | undefined): boolean {
  return /cdn\.shopify\.com|Shopify\.shop|shopify-section|\/cdn\/shop\//i.test(String(html ?? '').slice(0, 600_000))
}

/** "/products/<handle>" (também dentro de /collections/x/) → o JSON público do produto na MESMA origem. null = não é página de produto. */
export function shopifyProductJsonUrl(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl)
    const m = /\/products\/([a-z0-9][a-z0-9._~%-]*)\/?$/i.exec(u.pathname)
    if (!m || /\.(json|js|xml|oembed)$/i.test(m[1])) return null
    return `${u.origin}/products/${m[1]}.json`
  } catch {
    return null
  }
}

export interface ShopifyProduct {
  title: string
  vendor: string
  description: string
  price: string | null
  images: string[]
}

/** Lê o /products/<handle>.json do Shopify (só o que ele DIZ). JSON ilegível ou sem produto = null. */
export function shopifyProductFromJson(text: string): ShopifyProduct | null {
  let j: unknown
  try { j = JSON.parse(String(text ?? '')) } catch { return null }
  const p = (j && typeof j === 'object' ? (j as Json).product : null) as Json | null
  if (!p || typeof p !== 'object') return null
  const imgs = Array.isArray(p.images) ? (p.images as unknown[]) : []
  const images = imgs.map((i) => (i && typeof i === 'object' && typeof (i as Json).src === 'string' ? String((i as Json).src) : typeof i === 'string' ? i : '')).filter((u) => /^https?:\/\//i.test(u))
  const variants = Array.isArray(p.variants) ? (p.variants as Json[]) : []
  const price = variants[0] && variants[0].price !== undefined && /\d/.test(String(variants[0].price)) ? String(variants[0].price).trim() : null
  const varies = new Set(variants.map((v) => String(v?.price ?? '').trim()).filter((x) => /\d/.test(x))).size > 1 // KINEO-ADS-LINK-LOJAS-1510 — preços diferentes por variante: o 1º seria o "a partir de"
  const description = clean(String(p.body_html ?? '').replace(/<[^>]+>/g, ' '), 400)
  return { title: clean(p.title as string, 160), vendor: clean(p.vendor as string, 80), description, price: varies ? null : price, images } // KINEO-ADS-LINK-LOJAS-1510
}

/** Mesmo arquivo em endereços diferentes (o JSON-LD do tema e o JSON do Shopify): mesma imagem. */
export function imageFileKey(u: string): string {
  try { return decodeURIComponent(new URL(u).pathname.split('/').pop() ?? '').toLowerCase() } catch { return String(u).toLowerCase() }
}

/** WebP do CDN do Shopify: pede o JPG ao próprio CDN (format=jpg). Outra URL = a mesma. */
export function preferJpegUrl(u: string): string {
  try {
    const x = new URL(u)
    const shopify = /(^|\.)cdn\.shopify\.com$/i.test(x.hostname) || /\/cdn\/shop\//i.test(x.pathname)
    if (!shopify || !/\.webp$/i.test(x.pathname) || x.searchParams.has('format')) return u
    x.searchParams.set('format', 'jpg')
    return x.toString()
  } catch {
    return u
  }
}

// ── KINEO-ADS-DEMO-UNIVERSO-1410 — O PRODUTO DESTA PÁGINA, nunca o do carrossel de recomendados ───────────────────────────
// Demo de 14/10 para uma agência: o link de uma loja Nuvemshop (página do perfume Atheeri) virou "Delina – Parfums de Marly,
// R$ 2.750" com foto de 480 px. Causa: o produto da página mora DENTRO do WebPage (mainEntity), que jsonLdNodes não abre, e o
// 1º Product "solto" era o 1º do carrossel de recomendados (cada um declara a página DELE em mainEntityOfPage/offers.url).
// Ordem nova: (1) Product cujo url/@id/offers.url/mainEntityOfPage é ESTA página (o endereço, og:url ou canonical; o mesmo
// último trecho do caminho também vale: /collections/x/products/y = /products/y); (2) o mainEntity de um WebPage; (3) um
// Product que não aponta para página nenhuma. Product que aponta para OUTRA página nunca entra. E o nome escolhido precisa
// dividir uma palavra significativa com og:title/<title>/o slug do endereço; senão é descartado (fica og:title/título).
// Foto: a MAIOR versão que a própria página cita (srcset/imagesrcset, ou o mesmo arquivo da Nuvemshop "-W-H.webp" em outro
// tamanho). Nada é inventado: só endereço citado na página. Nuvemshop: LS.product (nome) e LS.variants (preço de venda, foto).

/** KINEO-ADS-DEMO-UNIVERSO-1410 — "host/caminho" sem www, sem barra final, sem query/âncora; e o último trecho do caminho. */
function pageKey(u: string, base: string): { full: string; last: string } | null {
  try {
    const x = new URL(decodeEntities(String(u).trim()), base)
    const path = x.pathname.replace(/\/+$/, '').toLowerCase()
    return { full: x.hostname.replace(/^www\./, '').toLowerCase() + path, last: path.split('/').pop() ?? '' }
  } catch {
    return null
  }
}

/** KINEO-ADS-DEMO-UNIVERSO-1410 — os endereços que um Product DECLARA (url, @id, mainEntityOfPage, offers.url). */
function productUrls(n: Json): string[] {
  const out: string[] = []
  const add = (v: unknown) => { if (typeof v === 'string' && v.trim() && !/^_:/.test(v) && !/^#/.test(v.trim())) out.push(v.split('#')[0]) }
  add(n.url)
  add(n['@id'])
  const mep = n.mainEntityOfPage
  if (typeof mep === 'string') add(mep)
  else if (mep && typeof mep === 'object') { add((mep as Json)['@id']); add((mep as Json).url) }
  for (const o of Array.isArray(n.offers) ? n.offers : [n.offers]) if (o && typeof o === 'object') add((o as Json).url)
  return out.filter((u) => u.trim())
}

/** KINEO-ADS-DEMO-UNIVERSO-1410 — palavras que não identificam produto nenhum (ligação, "perfume", "feminino", "loja", "oficial"…). */
const GENERIC_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'new', 'para', 'com', 'por', 'del', 'los', 'las', 'des', 'les', 'une', 'und', 'der', 'die', 'das', 'mit', 'von', 'kit', 'set', 'original', 'novo', 'nova', 'nuevo', 'nueva', 'nouveau', 'perfume', 'perfumes', 'parfum', 'parfums', 'eau', 'toilette', 'cologne', 'feminino', 'masculino', 'femenino', 'women', 'woman', 'men', 'man', 'unisex', 'produto', 'producto', 'product', 'produtos', 'productos', 'products', 'shop', 'store', 'loja', 'tienda', 'oficial', 'official', 'lacrado', 'html', 'php', 'www', 'net'])
/** KINEO-ADS-DEMO-UNIVERSO-1410 — palavras significativas: sem acento, minúsculas, 3+ letras, sem número (nem número+unidade: 100ml, 2025) nem palavra genérica. */
function significantWords(s: string): string[] {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3 && !/^\d+[a-z]{0,3}$/.test(w) && !GENERIC_WORDS.has(w))
}

/**
 * KINEO-ADS-DEMO-UNIVERSO-1410 — o nome do produto confere com a página? true = divide pelo menos uma palavra significativa com
 * um dos títulos (og:title, <title>) ou com o slug do endereço (plural/singular: prefixo comum de 5+ letras vale). Página sem
 * título nem slug, ou nome só de palavras genéricas = nada a conferir (true). Puro.
 */
export function productNameMatchesPage(name: string | null | undefined, refs: { titles?: readonly (string | null | undefined)[]; url?: string | null }): boolean {
  const mine = significantWords(decodeEntities(String(name ?? '')))
  if (!mine.length) return true
  let slug = ''
  try { slug = decodeURIComponent(new URL(String(refs.url ?? '')).pathname) } catch { slug = '' }
  const theirs = new Set([...(refs.titles ?? []).flatMap((t) => significantWords(decodeEntities(String(t ?? '')))), ...significantWords(slug.replace(/[-_/.]+/g, ' '))])
  if (!theirs.size) return true
  const same = (a: string, b: string) => a === b || (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a)))
  return mine.some((w) => [...theirs].some((t) => same(w, t)))
}

/**
 * KINEO-ADS-DEMO-UNIVERSO-1410 — o JSON-LD Product DESTA página (endereço igual → mainEntity de um WebPage → Product que não
 * aponta para página nenhuma), já conferido contra og:title/<title>/slug. undefined = nenhum confiável (fica og/título).
 */
function pageProduct(pageUrl: string, ld: Json[], metas: Record<string, string>[], links: Record<string, string>[], titleTag: string): Json | undefined {
  const selves = [pageUrl, ...metaContent(metas, 'og:url'), ...links.filter((l) => /(^|\s)canonical(\s|$)/i.test(l.rel ?? '') && l.href).map((l) => l.href)]
    .map((u) => pageKey(u, pageUrl)).filter((k): k is { full: string; last: string } => !!k)
  const isSelf = (u: string) => { const k = pageKey(u, pageUrl); return !!k && selves.some((s) => s.full === k.full || (!!k.last && k.last === s.last)) }
  const found: { node: Json; main: boolean }[] = []
  for (const n of ld) {
    if (typeIs(n, 'Product') || typeIs(n, 'ProductGroup')) found.push({ node: n, main: false }) // KINEO-ADS-LINK-LOJAS-1510 — Shopify declara ProductGroup
    for (const k of ['mainEntity', 'mainEntityOfPage']) {
      const v = n[k]
      for (const x of Array.isArray(v) ? v : [v]) if (x && typeof x === 'object' && typeIs(x as Json, 'Product')) found.push({ node: x as Json, main: true })
    }
  }
  const pick = found.find((c) => productUrls(c.node).some(isSelf))
    ?? found.find((c) => c.main && productUrls(c.node).every(isSelf))
    ?? found.find((c) => !productUrls(c.node).length)
  if (!pick) return undefined
  const ok = productNameMatchesPage(pick.node.name as string, { titles: [...metaContent(metas, 'og:title', 'twitter:title'), titleTag], url: pageUrl })
  return ok ? pick.node : undefined
}

/** KINEO-ADS-DEMO-UNIVERSO-1410 — texto de string JS ('Atheeri – Lattafa' → "Atheeri – Lattafa"). */
function decodeJsString(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16))).replace(/\\(["'\\/])/g, '$1')
}

/**
 * KINEO-ADS-DEMO-UNIVERSO-1410 — Nuvemshop (Tiendanube): o tema escreve o produto da página em `LS.product = { …name : '…' }` e as
 * variantes em `LS.variants = [ … ]` (JSON: price_number = preço de VENDA, image_url = a foto 1024). null = não é Nuvemshop.
 */
export function nuvemshopProduct(html: string | null | undefined): { name: string; price: string | null; currency: string | null; images: string[] } | null {
  const h = String(html ?? '').slice(0, 600_000)
  const pm = /LS\.product\s*=\s*\{([^;]*?)\}\s*;/.exec(h)
  if (!pm) return null
  const nm = /\bname\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/.exec(pm[1])
  const name = clean(decodeJsString(nm?.[1] ?? nm?.[2] ?? ''), 160)
  const id = /\bid\s*:\s*(\d+)/.exec(pm[1])?.[1] ?? null
  let price: string | null = null
  const images: string[] = []
  const vm = /LS\.variants\s*=\s*(\[[\s\S]*?\])\s*;/.exec(h)
  if (vm) {
    try {
      const vs = (JSON.parse(vm[1]) as unknown[]).filter((v): v is Json => !!v && typeof v === 'object' && (!id || String((v as Json).product_id) === id))
      const v = vs.find((x) => x.available !== false) ?? vs[0]
      if (v && v.price_number !== undefined && v.price_number !== null && /\d/.test(String(v.price_number))) price = String(v.price_number).trim()
      for (const x of vs) if (typeof x.image_url === 'string' && x.image_url.trim()) images.push(x.image_url.trim())
    } catch { /* JSON quebrado: sem preço/foto da Nuvemshop */ }
  }
  const currency = /LS\.currency\s*=\s*\{[^}]*?\bcode\s*:\s*["']([A-Z]{3})["']/.exec(h)?.[1] ?? null
  if (!name && !price && !images.length) return null
  return { name, price, currency, images: [...new Set(images)] }
}

/**
 * KINEO-ADS-DEMO-UNIVERSO-1410 — a MAIOR versão da mesma foto que a página cita: (a) num srcset/imagesrcset/data-srcset que contém o
 * arquivo, a entrada de maior largura; (b) Nuvemshop "<arquivo>-W-H.ext" citado em outro tamanho (também escapado em JSON), o de
 * maior W. Nada citado maior = o endereço de entrada (absoluto). Puro.
 */
export function largestImageVariant(u: string, html: string, base: string): string {
  const abs = absolute(u, base)
  if (!abs) return u
  let file = ''
  try { file = new URL(abs).pathname.split('/').pop() ?? '' } catch { return u }
  if (!file) return abs
  let best = abs
  let bestW = 0
  const sets = /\b(?:srcset|imagesrcset|data-srcset)\s*=\s*("([^"]*)"|'([^']*)')/gi
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = sets.exec(html)) && guard++ < 400) {
    const set = decodeEntities(m[2] ?? m[3] ?? '')
    if (!set.includes(file)) continue
    for (const part of set.split(',')) {
      const [src, d] = part.trim().split(/\s+/)
      const w = /^\d+w$/.test(d ?? '') ? parseInt(d, 10) : 0
      const a = src ? absolute(src, base) : null
      if (a && w > bestW) { best = a; bestW = w }
    }
  }
  const nv = /^(.+)-(\d+)-(\d+)\.(webp|jpe?g|png)$/i.exec(file)
  if (nv) {
    const esc = nv[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`${esc}-(\\d+)-(\\d+)\\.${nv[4]}`, 'gi')
    let top = Math.max(bestW, parseInt(nv[2], 10) || 0)
    let k: RegExpExecArray | null
    let n = 0
    while ((k = re.exec(html)) && n++ < 200) {
      const w = parseInt(k[1], 10) || 0
      if (w <= top) continue
      try {
        const x = new URL(abs)
        x.pathname = x.pathname.replace(/[^/]+$/, `${nv[1]}-${k[1]}-${k[2]}.${nv[4]}`)
        best = x.toString()
        top = w
      } catch { /* fica o melhor até aqui */ }
    }
  }
  return best
}

// ── KINEO-ADS-LINK-LOJAS-1510 — O LEITOR DE LINK EM TODAS AS PLATAFORMAS QUE AS AGÊNCIAS ATENDEM ───────────────────────────
// Fundador, 15/10: o Studio Ads tem de ser "perfeito para as agências usarem sozinhas, hoje". Agência atende loja de toda
// plataforma, e nome, preço ou foto errados matam o negócio. Uma página real de cada plataforma foi lida UMA vez (só leitura,
// 14/10/2026) e virou fixture mínima em scripts/fixtures/ads-link/ (o guardião é scripts/test-ads-link-lojas-1510.mjs).
// O que cada uma ensinou:
//   · Shopify: o JSON-LD é ProductGroup (o leitor só conhecia Product) com a MESMA foto em 4 larguras (&width=100…900); o
//     "var meta" do ShopifyAnalytics traz o preço em centavos e a moeda; o /products/<handle>.js é a porta quando o .json cai.
//   · WooCommerce (Yoast): og:type "article" e <p class="price"> vazio; o JSON-LD Product do WooCommerce é que fala.
//   · VTEX: JSON-LD com price (venda) E listPrice ("de"); a busca pública /api/catalog_system/pub/products/search/<slug>/p
//     dá Price (venda) e ListPrice ("de") por vendedor.
//   · Tray: a página vem em ISO-8859-1 (o leitor decodificava como UTF-8 e o texto saía com "�"); JSON-LD = o "Por" à vista,
//     dataLayer = priceSell (cartão) e price (o "De").
//   · Wix: JSON-LD ImageObject de 500 px de uma foto de 1512 px; o mesmo arquivo em "/v1/fit/w_1600,h_1600" é a versão grande.
//   · Squarespace: o JSON-LD Product leva o TÍTULO DE SEO como name; o nome do produto mora em Static.SQUARESPACE_CONTEXT.
//   · BigCommerce: BCData com o preço; a página cita preços de OUTROS produtos (relacionados).
//   · Magento: a galeria (x-magento-init) tem thumb/img/full; a caixa finalPrice é a venda, oldPrice o "de".
//   · Amazon: sem og nem JSON-LD; #productTitle, data-old-hires; e, da nuvem, quase sempre a página de robô (captcha).
//   · Etsy (DataDome), Loja Integrada ("Acesso Bloqueado"), Cloudflare ("Attention Required!"): 403 de robô.
//   · Mercado Livre: o link redireciona para /gz/account-verification (parede de login).
// Regras: nome conferido contra og:title/<title>/slug (não confere = o título); preço = o de VENDA de agora, nunca o "de"; na
// dúvida, SEM preço (preço errado é pior que nenhum); até 3 fotos, a maior versão que a página cita (ou a original do mesmo
// arquivo no CDN da plataforma); confiança high/medium/low com os porquês; página de robô, de login ou só-JavaScript = um
// aviso honesto (sem navegador headless no servidor). Puro: nenhuma rede aqui (a rede mora em lib/ads/v2Link.ts).

export type LinkPlatform = 'shopify' | 'woocommerce' | 'nuvemshop' | 'vtex' | 'tray' | 'lojaintegrada' | 'wix' | 'squarespace' | 'bigcommerce' | 'magento' | 'amazon' | 'etsy' | 'mercadolivre' | 'generic'
export type LinkBlockKind = 'captcha' | 'login' | 'js_only'
export type LinkConfidence = 'high' | 'medium' | 'low'

export interface ProductRead {
  platform: LinkPlatform
  /** Página de robô/captcha, de login ou só-JavaScript: nada foi lido (e nada é inventado). */
  blocked: LinkBlockKind | null
  name: string
  brand: string
  description: string
  /** O preço de VENDA de agora, só o número ("1410.80"). null = não achou OU não teve certeza. */
  price: string | null
  /** ISO 4217 ("BRL"); null quando a página não diz. */
  currency: string | null
  /** Até 3 fotos do produto, a maior versão de cada. */
  images: string[]
  confidence: LinkConfidence
  /** Os porquês da confiança (códigos curtos: platform_data, jsonld_product, price_conflict, name_from_title…). */
  reasons: string[]
}

export const LINK_READ_MAX_IMAGES = 3

/** KINEO-ADS-LINK-LOJAS-1510 — os bytes da página → texto, no charset que ELA declara (cabeçalho ou <meta>); sem nada, UTF-8. */
export function decodeHtmlBytes(bytes: Uint8Array, contentType?: string | null): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? [])
  let cs = /charset\s*=\s*["']?([\w.:-]+)/i.exec(String(contentType ?? ''))?.[1] ?? ''
  if (!cs) {
    let ascii = ''
    for (let i = 0; i < Math.min(b.length, 4096); i++) ascii += String.fromCharCode(b[i])
    cs = /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(ascii)?.[1] ?? ''
  }
  try { return new TextDecoder((cs || 'utf-8').toLowerCase()).decode(b) } catch { return new TextDecoder('utf-8').decode(b) }
}

/** KINEO-ADS-LINK-LOJAS-1510 — a plataforma da loja: pelo endereço (Amazon, Etsy, Mercado Livre, subdomínios de plataforma) e pelas marcas do HTML. */
export function detectLinkPlatform(html: string | null | undefined, pageUrl: string): LinkPlatform {
  let host = ''
  try { host = new URL(pageUrl).hostname.toLowerCase() } catch { host = '' }
  if (/(^|\.)amazon\.(com|ca|co\.uk|de|fr|it|es|nl|se|pl|in|co\.jp|com\.br|com\.mx|com\.au|com\.tr|ae|sa|sg|eg)$|(^|\.)amzn\.(to|eu)$/.test(host)) return 'amazon'
  if (/(^|\.)etsy\.com$/.test(host)) return 'etsy'
  if (/(^|\.)mercadoli(vre|bre)\.(com|com\.br|com\.ar|com\.mx|cl|com\.co|com\.pe|com\.uy|com\.ve)$/.test(host)) return 'mercadolivre'
  if (/\.myshopify\.com$/.test(host)) return 'shopify'
  if (/\.lojaintegrada\.com\.br$/.test(host)) return 'lojaintegrada'
  if (/\.wixsite\.com$/.test(host)) return 'wix'
  if (/\.squarespace\.com$/.test(host)) return 'squarespace'
  if (/\.mybigcommerce\.com$/.test(host)) return 'bigcommerce'
  if (/\.(vtexcommercestable\.com\.br|myvtex\.com|vtex\.app)$/.test(host)) return 'vtex'
  if (/\.(lojavirtualnuvem\.com\.br|mitiendanube\.com)$/.test(host)) return 'nuvemshop'
  const h = String(html ?? '').slice(0, 600_000)
  if (/LS\.product\s*=|mitiendanube\.com|nuvemshop:product/i.test(h)) return 'nuvemshop'
  if (isShopifyHtml(h)) return 'shopify'
  if (/\.vtexassets\.com|vteximg\.com\.br|io2?\.vtex\.com|vtex\.events|vtex\.render-server|"vtex\.store/i.test(h)) return 'vtex'
  if (/data-tray-theme|images\.tcdn\.com\.br|tray-session-loaded/i.test(h)) return 'tray'
  if (/cdn\.awsli\.com\.br|lojaintegrada/i.test(h)) return 'lojaintegrada'
  if (/static\.wixstatic\.com|static\.parastorage\.com/i.test(h)) return 'wix'
  if (/squarespace-cdn\.com|static1\.squarespace\.com|Static\.SQUARESPACE_CONTEXT/.test(h)) return 'squarespace'
  if (/cdn\d*\.bigcommerce\.com|\bBCData\b/.test(h)) return 'bigcommerce'
  if (/Magento_|\/static\/(version\d+\/)?frontend\/[\w-]+\/[\w-]+\/|x-magento-init|mage\/(cookies|calendar|gallery)/.test(h)) return 'magento'
  if (/woocommerce|\/wp-content\/plugins\/woocommerce|wc-block-/i.test(h)) return 'woocommerce'
  return 'generic'
}

/**
 * KINEO-ADS-LINK-LOJAS-1510 — a página é de robô/captcha, de login ou só-JavaScript? Só vale quando a página NÃO traz produto
 * nenhum (`hasProduct`): loja de verdade cita "captcha" no meio do JS (Shopify, Magento, Squarespace, Wix) e não pode cair aqui.
 * O endereço de login (o Mercado Livre redireciona para /gz/account-verification) vale sempre.
 */
export function detectLinkBlock(html: string | null | undefined, pageUrl: string, hasProduct: boolean): LinkBlockKind | null {
  let path = ''
  try { path = new URL(pageUrl).pathname.toLowerCase() } catch { path = '' }
  if (/(^|\/)(login|signin|sign-in|sign_in|entrar|account-verification|lgz)(\/|$|\.)|\/account\/login|\/customer\/account\/login|\/ap\/signin/.test(path)) return 'login'
  if (hasProduct) return null
  const h = String(html ?? '').slice(0, 300_000)
  const title = clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h)?.[1] ?? '', 200)
  if (/captcha-delivery\.com|\/errors\/validateCaptcha|_cf_chl_opt|cf-chl-widget|px-captcha|distil_r_captcha|Incapsula incident|request foi bloqueado|Enter the characters you see below/i.test(h)
    || /^(Robot Check|Attention Required! \| Cloudflare|Just a moment\.{3}|Access Denied|Acesso Bloqueado|Pardon Our Interruption|Are you a robot\??)$/i.test(title)) return 'captcha'
  if (/<input\b[^>]*type\s*=\s*["']?password/i.test(h) && /(log ?in|sign ?in|entrar|iniciar sesi[oó]n|acessar sua conta|minha conta)/i.test(title)) return 'login'
  const visible = h.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const noOg = !metaContent(tags(h, 'meta'), 'og:title', 'og:image').length
  if (noOg && visible.length < 400 && (/<noscript[^>]*>[\s\S]{0,400}?(enable|ative|ativar|habilit|activa)[\s\S]{0,60}?javascript/i.test(h) || /<div\b[^>]*id\s*=\s*["'](root|app|__next|___gatsby|__nuxt)["'][^>]*>\s*<\/div>/i.test(h) || /please enable (js|javascript)/i.test(h))) return 'js_only'
  return null
}

/** KINEO-ADS-LINK-LOJAS-1510 — o aviso honesto (inglês; a tela traduz pelo `why`) para a página que não deu para ler. */
export function linkBlockMessage(platform: LinkPlatform | null | undefined, kind: LinkBlockKind | null | undefined): string {
  if (platform === 'amazon') return 'Amazon blocks automatic reading. Upload the product photo instead.'
  if (platform === 'etsy') return 'Etsy blocks automatic reading. Upload the product photo instead.'
  if (platform === 'mercadolivre') return 'Mercado Livre asks for a login before showing this page. Upload the product photo instead.'
  if (kind === 'login') return 'This page asks for a login, so we cannot read it. Upload the product photo instead.'
  if (kind === 'js_only') return 'This page only shows the product after running JavaScript, which we do not do. Upload the product photo instead.'
  return 'This site blocks automatic reading. Upload the product photo instead.'
}

/** KINEO-ADS-LINK-LOJAS-1510 — o JSON (objeto/lista) que começa em `start`, contado por chaves e respeitando strings. null = quebrado. */
function jsonAt(text: string, start: number): unknown {
  let i = start
  while (i < text.length && /\s/.test(text[i])) i++
  const open = text[i]
  if (open !== '{' && open !== '[') return null
  let depth = 0
  let inStr = false
  for (let j = i; j < text.length && j - i < 400_000; j++) {
    const c = text[j]
    if (inStr) { if (c === '\\') j++; else if (c === '"') inStr = false; continue }
    if (c === '"') inStr = true
    else if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') { depth--; if (depth === 0) { try { return JSON.parse(text.slice(i, j + 1)) } catch { return null } } }
  }
  return null
}
function jsonAfter(text: string, re: RegExp): unknown {
  const m = re.exec(text)
  return m ? jsonAt(text, m.index + m[0].length) : null
}

/** KINEO-ADS-LINK-LOJAS-1510 — "1.567,55" / "1,410.80" / 2829 / "22.00" → número > 0; o resto = null. */
function amountOf(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null
  let s = String(v ?? '').replace(/[^\d.,]/g, '')
  if (!/\d/.test(s)) return null
  const comma = s.lastIndexOf(',')
  const dot = s.lastIndexOf('.')
  if (comma > dot) s = dot < 0 && /^\d{1,3}(,\d{3})+$/.test(s) && s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}
const sameAmount = (a: number | null | undefined, b: number | null | undefined) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.005
const currencyOf = (v: unknown): string | null => { const c = String(v ?? '').trim().toUpperCase(); return /^[A-Z]{3}$/.test(c) ? c : null }
/** O número como a fonte escreveu ("120.00" fica "120.00"); de número/centavos, 2 casas quando há fração. */
function amountText(raw: unknown, n: number): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (/^\d+(\.\d{1,2})?$/.test(s) && sameAmount(Number(s), n)) return s
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/** O que a plataforma diz do produto, além do JSON-LD/og (cada campo é opcional). */
interface PlatformBits {
  name?: string
  brand?: string
  description?: string
  /** preços de VENDA que a plataforma aceita para este produto (variantes, à vista/cartão) */
  prices?: { n: number; raw: unknown }[]
  /** preços "de" (riscados): nunca entram */
  from?: number[]
  currency?: string | null
  images?: string[]
}

/** KINEO-ADS-LINK-LOJAS-1510 — Shopify: "var meta" do ShopifyAnalytics (centavos) + a moeda. */
function shopifyBits(h: string): PlatformBits | null {
  const meta = jsonAfter(h, /var meta\s*=\s*/) as Json | null
  const p = meta && typeof meta.product === 'object' ? (meta.product as Json) : null
  if (!p) return null
  const variants = Array.isArray(p.variants) ? (p.variants as Json[]) : []
  const prices = variants.map((v) => amountOf(v.price)).filter((n): n is number => n !== null).map((c) => ({ n: c / 100, raw: (c / 100).toFixed(2) }))
  const currency = currencyOf(/ShopifyAnalytics\.meta\.currency\s*=\s*['"]([A-Za-z]{3})['"]/.exec(h)?.[1])
  return { brand: clean(p.vendor as string, 80), prices, currency }
}

/** KINEO-ADS-LINK-LOJAS-1510 — Tray: o dataLayer (priceSell = venda; price = "De" quando promotion=YES; o 1x à vista também é venda). */
function trayBits(h: string): PlatformBits | null {
  const dl = jsonAfter(h, /dataLayer\s*=\s*/) as Json[] | null
  const d = Array.isArray(dl) ? dl.find((x) => x && typeof x === 'object' && ('priceSell' in x || 'nameProduct' in x)) : null
  if (!d) return null
  const prices: { n: number; raw: unknown }[] = []
  const sell = amountOf(d.priceSell)
  if (sell) prices.push({ n: sell, raw: d.priceSell })
  for (const it of Array.isArray(d.priceSellDetails) ? (d.priceSellDetails as Json[]) : []) {
    if (String(it?.['installment.months'] ?? '') === '1') { const n = amountOf(it['installment.amount']); if (n) prices.push({ n, raw: n.toFixed(2) }) }
  }
  const list = amountOf(d.price)
  const from = list && !prices.some((p) => sameAmount(p.n, list)) ? [list] : []
  const img = typeof d.urlImage === 'string' ? d.urlImage : ''
  return { name: clean(d.nameProduct as string, 160), brand: clean(d.brand as string, 80), prices, from, currency: prices.length ? 'BRL' : null, images: img ? [img] : [] }
}

/** KINEO-ADS-LINK-LOJAS-1510 — Squarespace: o item (nome do produto) e as variantes (onSale → salePrice; senão price). */
function squarespaceBits(h: string): PlatformBits | null {
  const ctx = jsonAfter(h, /Static\.SQUARESPACE_CONTEXT\s*=\s*/) as Json | null
  if (!ctx) return null
  const item = (ctx.item && typeof ctx.item === 'object' ? ctx.item : {}) as Json
  const prod = (ctx.product && typeof ctx.product === 'object' ? ctx.product : null) as Json | null
  const prices: { n: number; raw: unknown }[] = []
  const from: number[] = []
  let currency: string | null = null
  for (const v of prod && Array.isArray(prod.variants) ? (prod.variants as Json[]) : []) {
    const pr = (v.price ?? {}) as Json
    const sp = (v.salePrice ?? {}) as Json
    const regular = amountOf(pr.decimalValue)
    const sale = v.onSale === true ? amountOf(sp.decimalValue) : null
    currency = currency ?? currencyOf(pr.currencyCode)
    if (sale) { prices.push({ n: sale, raw: sp.decimalValue }); if (regular) from.push(regular) } else if (regular) prices.push({ n: regular, raw: pr.decimalValue })
  }
  return { name: prod ? clean(item.title as string, 160) : '', prices, from, currency }
}

/** KINEO-ADS-LINK-LOJAS-1510 — BigCommerce: BCData.product_attributes.price (sem/com imposto; "rrp"/"non_sale" = "de"). */
function bigcommerceBits(h: string): PlatformBits | null {
  const bc = jsonAfter(h, /\bBCData\s*=\s*/) as Json | null
  const pa = bc && typeof bc.product_attributes === 'object' ? (bc.product_attributes as Json) : null
  const pr = pa && typeof pa.price === 'object' ? (pa.price as Json) : null
  if (!pr) return null
  const sale = (pr.without_tax ?? pr.with_tax) as Json | undefined
  const n = amountOf(sale?.value)
  const from = ['rrp_without_tax', 'rrp_with_tax', 'non_sale_price_without_tax', 'non_sale_price_with_tax'].map((k) => amountOf((pr[k] as Json | undefined)?.value)).filter((x): x is number => x !== null && !sameAmount(x, n))
  return { prices: n ? [{ n, raw: sale?.value }] : [], from, currency: currencyOf(sale?.currency) }
}

/** KINEO-ADS-LINK-LOJAS-1510 — Magento 2: o título da página, a caixa finalPrice (venda) / oldPrice ("de") e a galeria (full). */
function magentoBits(h: string): PlatformBits | null {
  const name = clean(/<span\b[^>]*data-ui-id\s*=\s*["']page-title-wrapper["'][^>]*>([\s\S]*?)<\/span>/i.exec(h)?.[1]?.replace(/<[^>]+>/g, ' ') ?? '', 160)
  const bi = h.search(/class\s*=\s*["'][^"']*\bprice-box\b/i)
  const box = bi >= 0 ? h.slice(bi, bi + 3000) : ''
  const spans = [...box.matchAll(/<span\b[^>]*data-price-type\s*=\s*["'](\w+)["'][^>]*>/gi)]
  const amountFor = (type: string) => /data-price-amount\s*=\s*["']([\d.]+)["']/i.exec(spans.find((s) => s[1] === type)?.[0] ?? '')?.[1]
  const fRaw = amountFor('finalPrice')
  const n = amountOf(fRaw)
  const o = amountOf(amountFor('oldPrice'))
  const images: string[] = []
  const gi = h.search(/"mage\/gallery\/gallery"\s*:/)
  if (gi >= 0) {
    const g = jsonAt(h, h.indexOf('{', gi + 20)) as Json | null
    const data = g && Array.isArray(g.data) ? (g.data as Json[]) : []
    const sorted = [...data.filter((d) => d.isMain === true), ...data.filter((d) => d.isMain !== true)]
    for (const d of sorted) { const u = (d.full ?? d.img) as string; if (typeof u === 'string' && d.type !== 'video') images.push(u) }
  }
  if (!name && !n && !images.length) return null
  return { name, prices: n ? [{ n, raw: fRaw }] : [], from: o && !sameAmount(o, n) ? [o] : [], images }
}

/** KINEO-ADS-LINK-LOJAS-1510 — Amazon: #productTitle, a foto grande (data-old-hires / a maior do data-a-dynamic-image) e o priceToPay. */
function amazonBits(h: string, pageUrl: string): PlatformBits | null {
  const name = clean(/<span\b[^>]*id\s*=\s*["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i.exec(h)?.[1] ?? '', 200)
  const tag = /<img\b[^>]*id\s*=\s*["']landingImage["'][^>]*>/i.exec(h)?.[0] ?? /<img\b[^>]*data-old-hires[^>]*>/i.exec(h)?.[0] ?? ''
  const images: string[] = []
  const hires = /data-old-hires\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
  if (hires) images.push(decodeEntities(hires))
  else {
    const dyn = /data-a-dynamic-image\s*=\s*"([^"]+)"/i.exec(tag)?.[1]
    try {
      const m = JSON.parse(decodeEntities(dyn ?? '')) as Record<string, [number, number]>
      const best = Object.entries(m).sort((a, b) => (b[1]?.[0] ?? 0) - (a[1]?.[0] ?? 0))[0]?.[0]
      if (best) images.push(best)
    } catch { /* sem foto da Amazon */ }
  }
  const ci = h.search(/id\s*=\s*["'](corePriceDisplay_desktop_feature_div|corePrice_feature_div|apex_desktop)["']/i)
  const core = ci >= 0 ? h.slice(ci, ci + 6000) : ''
  const pay = /class\s*=\s*["'][^"']*\bpriceToPay\b[^"']*["'][\s\S]{0,400}?<span\b[^>]*class\s*=\s*["']a-offscreen["'][^>]*>([^<]+)</i.exec(core)?.[1]
  const n = amountOf(pay)
  let host = ''
  try { host = new URL(pageUrl).hostname.toLowerCase() } catch { host = '' }
  const tld = /amazon\.(.+)$/.exec(host)?.[1] ?? ''
  const cur: Record<string, string> = { com: 'USD', ca: 'CAD', 'co.uk': 'GBP', de: 'EUR', fr: 'EUR', it: 'EUR', es: 'EUR', nl: 'EUR', 'com.br': 'BRL', 'com.mx': 'MXN', in: 'INR', 'co.jp': 'JPY', 'com.au': 'AUD' }
  if (!name && !images.length) return null
  return { name, prices: n ? [{ n, raw: n.toFixed(2) }] : [], currency: n ? cur[tld] ?? null : null, images }
}

/** KINEO-ADS-LINK-LOJAS-1510 — Nuvemshop: o preço "de" (compare_at) das variantes, para nunca virar o preço. */
function nuvemFrom(h: string): number[] {
  const vm = /LS\.variants\s*=\s*(\[[\s\S]*?\])\s*;/.exec(h)
  try { return vm ? (JSON.parse(vm[1]) as Json[]).map((v) => amountOf(v.compare_at_price_number)).filter((n): n is number => n !== null) : [] } catch { return [] }
}

/** KINEO-ADS-LINK-LOJAS-1510 — VTEX IO: o __STATE__ (Product: productName/brand; commertialOffer: Price/ListPrice). */
function vtexStateBits(h: string): PlatformBits | null {
  const st = jsonAfter(h, /__STATE__\s*=\s*/) as Json | null
  if (!st || typeof st !== 'object') return null
  let name = ''
  let brand = ''
  const prices: { n: number; raw: unknown }[] = []
  const from: number[] = []
  for (const v of Object.values(st)) {
    if (!v || typeof v !== 'object') continue
    const o = v as Json
    if (!name && typeof o.productName === 'string') { name = clean(o.productName, 160); brand = clean(o.brand as string, 80) }
    if (o.Price !== undefined && (o.AvailableQuantity === undefined || Number(o.AvailableQuantity) > 0)) {
      const n = amountOf(o.Price)
      if (n) prices.push({ n, raw: o.Price })
      const l = amountOf(o.ListPrice)
      if (l && !sameAmount(l, n)) from.push(l)
    }
  }
  return name || prices.length ? { name, brand, prices, from } : null
}

/** KINEO-ADS-LINK-LOJAS-1510 — a busca pública da VTEX (/api/catalog_system/pub/products/search/<slug>/p): nome, marca, preço de venda do vendedor com estoque, fotos. */
export function vtexProductFromSearch(text: string): { name: string; brand: string; description: string; price: string | null; from: string | null; images: string[] } | null {
  let arr: unknown
  try { arr = JSON.parse(String(text ?? '')) } catch { return null }
  const p = Array.isArray(arr) ? (arr[0] as Json | undefined) : null
  if (!p || typeof p !== 'object') return null
  const items = Array.isArray(p.items) ? (p.items as Json[]) : []
  const offers: { n: number; l: number | null; it: Json }[] = []
  for (const it of items) {
    for (const s of Array.isArray(it.sellers) ? (it.sellers as Json[]) : []) {
      const co = (s.commertialOffer ?? {}) as Json
      const n = amountOf(co.Price)
      if (n && (co.IsAvailable === true || Number(co.AvailableQuantity) > 0)) offers.push({ n, l: amountOf(co.ListPrice), it })
    }
  }
  const distinct = [...new Set(offers.map((o) => o.n.toFixed(2)))]
  const price = distinct.length === 1 ? distinct[0] : null // variantes com preços diferentes = sem preço (seria o "a partir de")
  const fromN = offers.find((o) => o.l && !sameAmount(o.l, o.n))?.l ?? null
  const it = offers[0]?.it ?? items[0]
  const images = (it && Array.isArray(it.images) ? (it.images as Json[]) : []).map((i) => String(i.imageUrl ?? '')).filter((u) => /^https?:\/\//i.test(u)).slice(0, LINK_READ_MAX_IMAGES)
  return { name: clean(p.productName as string, 160), brand: clean(p.brand as string, 80), description: clean((p.metaTagDescription ?? p.description) as string, 400), price, from: fromN ? fromN.toFixed(2) : null, images }
}

/** KINEO-ADS-LINK-LOJAS-1510 — Shopify /products/<handle>.js: preço em centavos; variantes com preços diferentes = sem preço. */
export function shopifyProductFromJs(text: string): ShopifyProduct | null {
  let p: Json | null = null
  try { p = JSON.parse(String(text ?? '')) as Json } catch { return null }
  if (!p || typeof p !== 'object' || typeof p.title !== 'string') return null
  const variants = Array.isArray(p.variants) ? (p.variants as Json[]) : []
  const cents = [...new Set(variants.map((v) => amountOf(v.price)).filter((n): n is number => n !== null))]
  const one = cents.length === 1 ? cents[0] : !variants.length && p.price_varies !== true ? amountOf(p.price) : null
  const imgs = (Array.isArray(p.images) ? (p.images as unknown[]) : []).map((u) => (typeof u === 'string' ? (u.startsWith('//') ? `https:${u}` : u) : '')).filter((u) => /^https?:\/\//i.test(u))
  const description = clean(String(p.description ?? '').replace(/<[^>]+>/g, ' '), 400)
  return { title: clean(p.title, 160), vendor: clean(p.vendor as string, 80), description, price: one ? (one / 100).toFixed(2) : null, images: imgs }
}

/**
 * KINEO-ADS-LINK-LOJAS-1510 — a versão GRANDE (até 1600 px) do MESMO arquivo, pedida ao CDN da plataforma no formato que ele
 * documenta: Wix "/v1/fit/w_500,…" → w_1600,h_1600; Shopify ?width=100…900 → width=1600; VTEX "ids/123-300-300" → 1600-auto.
 * Nunca o original sem teto (foto de 20 MB passa do limite e não baixa). Outro endereço = o mesmo.
 */
export function platformOriginalImage(u: string): string {
  try {
    const x = new URL(u)
    if (/(^|\.)wixstatic\.com$/i.test(x.hostname)) {
      const m = /^(\/media\/[^/]+\.(?:jpe?g|png|webp))\/v1\/(?:fit|fill)\/w_(\d+),h_(\d+)[^/]*\/([^/]+)$/i.exec(x.pathname)
      if (m && Number(m[2]) < 1600) return `${x.origin}${m[1]}/v1/fit/w_1600,h_1600,q_90/${m[1].split('/').pop()}` // o nome do arquivo no fim (o "file.jpg" do Wix faria as 3 fotos parecerem a mesma)
    }
    if ((/(^|\.)cdn\.shopify\.com$/i.test(x.hostname) || /\/cdn\/shop\//i.test(x.pathname)) && x.searchParams.has('width') && Number(x.searchParams.get('width')) < 1600) {
      x.searchParams.set('width', '1600'); x.searchParams.delete('height'); x.searchParams.delete('crop')
      return x.toString()
    }
    if (/\.vtexassets\.com$|vteximg\.com\.br$/i.test(x.hostname)) {
      const m = /^(\/arquivos\/ids\/\d+)-(\d+)-(\d+|auto)(\/.*)$/.exec(x.pathname)
      if (m && Number(m[2]) < 1600) { x.pathname = `${m[1]}-1600-auto${m[4]}`; return x.toString() }
    }
  } catch { /* fica a de entrada */ }
  return u
}

/** KINEO-ADS-LINK-LOJAS-1510 — o preço do JSON-LD: Offer com price (ou priceSpecification.price); faixa (low≠high) ou ofertas diferentes = range. */
function ldPrice(product: Json | undefined): { n: number | null; raw: unknown; currency: string | null; from: number[]; range: boolean } {
  const out = { n: null as number | null, raw: undefined as unknown, currency: null as string | null, from: [] as number[], range: false }
  if (!product) return out
  const list = (Array.isArray(product.offers) ? product.offers : [product.offers]).filter((o): o is Json => !!o && typeof o === 'object')
  const seen: { n: number; raw: unknown }[] = []
  for (const o of list) {
    const isAgg = typeIs(o, 'AggregateOffer') || o.lowPrice !== undefined || o.highPrice !== undefined
    out.currency = out.currency ?? currencyOf(o.priceCurrency ?? (o.priceSpecification as Json | undefined)?.priceCurrency)
    for (const k of ['listPrice', 'listPriceWithTaxes']) { const l = amountOf(o[k]); if (l) out.from.push(l) }
    if (isAgg) {
      const lo = amountOf(o.lowPrice)
      const hi = amountOf(o.highPrice)
      if (lo && hi && sameAmount(lo, hi)) seen.push({ n: lo, raw: o.lowPrice })
      else if (lo || hi) out.range = true
      for (const sub of Array.isArray(o.offers) ? (o.offers as Json[]) : []) { const l = amountOf(sub?.listPrice); if (l) out.from.push(l) }
      continue
    }
    const raw = o.price ?? (o.priceSpecification as Json | undefined)?.price
    const n = amountOf(raw)
    if (n) seen.push({ n, raw })
  }
  const distinct = seen.filter((s, i) => seen.findIndex((t) => sameAmount(t.n, s.n)) === i)
  if (distinct.length > 1) out.range = true
  else if (distinct.length === 1 && !out.range) { out.n = distinct[0].n; out.raw = distinct[0].raw }
  out.from = out.from.filter((f) => !sameAmount(f, out.n))
  return out
}

/** KINEO-ADS-LINK-LOJAS-1510 — o título sem a cauda " | Loja" / " – Loja" quando ela é o nome do site. */
function titleWithoutSite(t: string, site: string): string {
  const s = clean(t, 200)
  if (!site) return s
  const parts = s.split(/\s+[|–—-]\s+/)
  return parts.length > 1 && significantWords(parts[parts.length - 1]).join(' ') === significantWords(site).join(' ') ? parts.slice(0, -1).join(' – ') : s
}

/** KINEO-ADS-LINK-LOJAS-1510 — O PRODUTO DA PÁGINA, em qualquer plataforma: nome, marca, preço de venda, moeda, fotos, confiança. */
export function readProductPage(html: string | null | undefined, pageUrl: string): ProductRead {
  return readProductCore(String(html ?? ''), pageUrl).read
}

/** KINEO-ADS-LINK-LOJAS-1510 — o leitor + as fotos DECLARADAS do produto (até 6; productPageImages usa estas). */
function readProductCore(html: string, pageUrl: string): { read: ProductRead; declared: string[] } {
  const head = html.slice(0, 1_500_000)
  const top = head.slice(0, 600_000)
  const metas = tags(top, 'meta')
  const links = tags(top, 'link')
  const ld = jsonLdNodes(head)
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(top)?.[1] ?? ''
  const platform = detectLinkPlatform(head, pageUrl)
  const product = pageProduct(pageUrl, ld, metas, links, titleTag)
  const nuvem = nuvemshopProduct(head)
  const bits: PlatformBits | null =
    platform === 'shopify' ? shopifyBits(head)
      : platform === 'tray' ? trayBits(head)
        : platform === 'squarespace' ? squarespaceBits(head)
          : platform === 'bigcommerce' ? bigcommerceBits(head)
            : platform === 'magento' ? magentoBits(head)
              : platform === 'amazon' ? amazonBits(head, pageUrl)
                : platform === 'vtex' ? vtexStateBits(head)
                  : platform === 'nuvemshop' && nuvem ? { name: nuvem.name, prices: nuvem.price ? [{ n: Number(nuvem.price), raw: nuvem.price }] : [], from: nuvemFrom(head), currency: nuvem.currency, images: nuvem.images }
                    : null
  const ogTitle = metaContent(metas, 'og:title', 'twitter:title')[0] ?? ''
  const ogType = metaContent(metas, 'og:type')[0] ?? ''
  const siteName = clean(metaContent(metas, 'og:site_name')[0] ?? '', 80)
  const reasons: string[] = []
  const hasBits = !!bits && !!(bits.name || bits.prices?.length || bits.images?.length)
  const evidence = hasBits || !!product || /product/i.test(ogType)
  if (hasBits) reasons.push('platform_data')
  if (product) reasons.push('jsonld_product')
  const blocked = detectLinkBlock(head, pageUrl, evidence)
  if (blocked) return { read: { platform, blocked, name: '', brand: '', description: '', price: null, currency: null, images: [], confidence: 'low', reasons: [...reasons, `blocked_${blocked}`] }, declared: [] }

  // Nome: plataforma → JSON-LD → og:title → <title>; conferido contra og:title/<title>/slug; não confere = o título da página.
  let name = clean(bits?.name || (product?.name as string) || '', 160)
  if (name && !productNameMatchesPage(name, { titles: [ogTitle, titleTag], url: pageUrl })) { reasons.push('name_mismatch'); name = '' }
  if (!name) {
    name = titleWithoutSite(decodeEntities(ogTitle || titleTag), siteName)
    if (name) reasons.push('name_from_title')
  }
  const brandRaw = product?.brand
  const brand = clean(bits?.brand || (typeof brandRaw === 'string' ? brandRaw : brandRaw && typeof brandRaw === 'object' ? ((brandRaw as Json).name as string) : '') || siteName, 80)
  const description = clean(bits?.description || (product?.description as string) || metaContent(metas, 'og:description', 'description', 'twitter:description')[0] || '', 400)

  // Preço: o de VENDA. A plataforma sabe o que é venda e o que é "de"; o JSON-LD confirma; meta/microdata só sem os outros.
  const L = ldPrice(product)
  const P = (bits?.prices ?? []).filter((p) => p.n > 0)
  const F = [...(bits?.from ?? []), ...L.from]
  const metaRaw = metaContent(metas, 'product:price:amount', 'og:price:amount')[0]
  const M = amountOf(metaRaw)
  const microRaw = /<meta\b[^>]*itemprop\s*=\s*["']price["'][^>]*content\s*=\s*["']([^"']+)["']/i.exec(top)?.[1]
  const MD = amountOf(microRaw)
  let price: { n: number; raw: unknown } | null = null
  const distinctP = P.filter((p, i) => P.findIndex((q) => sameAmount(q.n, p.n)) === i)
  if (distinctP.length) {
    const both = distinctP.find((p) => sameAmount(p.n, L.n))
    if (L.n !== null && both) price = both // o JSON-LD confirma a plataforma; o número como a PLATAFORMA escreve
    else if (distinctP.length === 1) { price = distinctP[0]; if (L.n !== null && !F.some((f) => sameAmount(f, L.n))) reasons.push('price_disagrees_jsonld') }
    else reasons.push('price_varies')
  } else if (L.range) reasons.push('price_range')
  else if (L.n !== null) {
    if (M !== null && !sameAmount(M, L.n) && !F.some((f) => sameAmount(f, M))) reasons.push('price_conflict')
    else price = { n: L.n, raw: L.raw }
  } else if (M !== null) { price = { n: M, raw: metaRaw }; reasons.push('price_from_meta') }
  else if (MD !== null) { price = { n: MD, raw: microRaw }; reasons.push('price_from_microdata') }
  const sale = price
  if (sale && F.some((f) => sameAmount(f, sale.n)) && !distinctP.some((p) => sameAmount(p.n, sale.n))) { reasons.push('price_is_from'); price = null }
  if (!price && !reasons.some((r) => r.startsWith('price_'))) reasons.push('no_price')
  const currency = price ? currencyOf(bits?.currency) ?? L.currency ?? currencyOf(metaContent(metas, 'product:price:currency', 'og:price:currency')[0]) ?? currencyOf(/<meta\b[^>]*itemprop\s*=\s*["']priceCurrency["'][^>]*content\s*=\s*["']([^"']+)["']/i.exec(top)?.[1]) : null
  if (price && !currency) reasons.push('no_currency')

  // Fotos: as que a página DECLARA do produto (plataforma, JSON-LD, Nuvemshop, og:image de página de produto), a maior versão.
  const declared: string[] = []
  const seen = new Set<string>()
  const add = (raw: string) => {
    const big = absolute(largestImageVariant(raw, top, pageUrl), pageUrl)
    const a = big ? absolute(platformOriginalImage(big), pageUrl) : null
    if (!a || !looksLikePhoto(a) || declared.length >= MAX_IMAGES) return
    const k = pathKey(a)
    if (seen.has(k)) return
    seen.add(k)
    declared.push(a)
  }
  for (const u of bits?.images ?? []) add(u)
  for (const u of imagesOf(product?.image)) add(u)
  for (const u of nuvem?.images ?? []) add(u)
  if (!declared.length && (evidence || platform !== 'generic')) for (const u of metaContent(metas, 'og:image', 'og:image:secure_url', 'og:image:url')) add(u)
  const images = declared.slice(0, LINK_READ_MAX_IMAGES)
  if (!images.length) reasons.push('no_image')

  let confidence: LinkConfidence = 'low'
  if (evidence && name && !reasons.includes('name_mismatch')) {
    const doubts = reasons.some((r) => /^(price_(varies|range|conflict|is_from|disagrees_jsonld|from_meta|from_microdata)|no_price|no_image|no_currency|name_from_title)$/.test(r))
    confidence = doubts || platform === 'amazon' ? 'medium' : 'high'
  }
  if (!evidence) reasons.push('not_product_page')
  return { read: { platform, blocked: null, name, brand, description, price: price ? amountText(price.raw, price.n) : null, currency, images, confidence, reasons }, declared }
}
