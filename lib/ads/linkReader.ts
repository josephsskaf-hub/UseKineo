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
}

const MAX_IMAGES = 6

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : '' })
    .replace(/&nbsp;/g, ' ')
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
  const product = ld.find((n) => typeIs(n, 'Product'))
  const org = ld.find((n) => typeIs(n, 'Organization') || typeIs(n, 'LocalBusiness') || typeIs(n, 'Restaurant') || typeIs(n, 'Store'))
  let host = ''
  try { host = new URL(pageUrl).hostname.replace(/^www\./, '') } catch { /* fica vazio */ }

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? ''
  const title = clean((product?.name as string) || metaContent(metas, 'og:title', 'twitter:title')[0] || titleTag, 160)
  const siteName = clean(metaContent(metas, 'og:site_name', 'application-name')[0] || (org?.name as string) || '', 80)
  const description = clean((product?.description as string) || metaContent(metas, 'og:description', 'description', 'twitter:description')[0] || '', 400)

  let price: string | null = null
  const offers = product?.offers
  const offer = (Array.isArray(offers) ? offers[0] : offers) as Json | undefined
  const p = offer?.price ?? offer?.lowPrice ?? metaContent(metas, 'product:price:amount', 'og:price:amount')[0]
  const cur = offer?.priceCurrency ?? metaContent(metas, 'product:price:currency', 'og:price:currency')[0]
  if (p !== undefined && p !== null && String(p).trim() && /\d/.test(String(p))) price = `${String(cur ?? '').trim()} ${String(p).trim()}`.trim()

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
  for (const c of imagesOf(product?.image)) push(c)
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

  return { title, siteName, description, price, images, logo: logo && !/\.(svg|ico)(\?|$)/i.test(logo) ? logo : null, host, lang, shareOnly }
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
  const product = jsonLdNodes(head).find((n) => typeIs(n, 'Product'))
  const fromLd = imagesOf(product?.image).map((u) => absolute(u, pageUrl)).filter((u): u is string => !!u)
  if (fromLd.length) return fromLd
  const metas = tags(head, 'meta')
  if (!metaContent(metas, 'og:type').some((t) => /product/i.test(t))) return []
  return metaContent(metas, 'og:image', 'og:image:secure_url', 'og:image:url').map((u) => absolute(u, pageUrl)).filter((u): u is string => !!u)
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
  const description = clean(String(p.body_html ?? '').replace(/<[^>]+>/g, ' '), 400)
  return { title: clean(p.title as string, 160), vendor: clean(p.vendor as string, 80), description, price, images }
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
