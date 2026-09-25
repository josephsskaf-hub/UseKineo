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

  const candidates = [
    ...imagesOf(product?.image),
    ...metaContent(metas, 'og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'),
  ]
  const images: string[] = []
  for (const c of candidates) {
    const a = absolute(c, pageUrl)
    if (a && !images.includes(a) && !/\.svg(\?|$)/i.test(a)) images.push(a)
    if (images.length >= MAX_IMAGES) break
  }

  // Logo: logo da organização no JSON-LD → apple-touch-icon → ícone grande (nunca favicon .ico de 16 px).
  const icons = links.filter((l) => /(apple-touch-icon|icon)/i.test(l.rel ?? '') && l.href)
  const bigIcon = icons.find((l) => /apple-touch-icon/i.test(l.rel ?? '')) ?? icons.find((l) => /(\d{3,})x\1/.test(l.sizes ?? '') && Number((l.sizes ?? '0x').split('x')[0]) >= 120)
  const logoRaw = imagesOf(org?.logo)[0] ?? bigIcon?.href ?? null
  const logo = logoRaw ? absolute(logoRaw, pageUrl) : null

  return { title, siteName, description, price, images, logo: logo && !/\.(svg|ico)(\?|$)/i.test(logo) ? logo : null, host }
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
