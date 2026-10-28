// KINEO-ADS-FONTE-LINK-2810 — O ENCURTADOR É SEGUIDO ATÉ A PÁGINA DO PRODUTO, ANTES DA LEITURA.
//
// Medido 28/10 (30 dias): 7 de 23 `ads_link_read` falharam com page_unreachable (js_only / not_html). O caso corianlima (pedido
// 8e8f7ad9) era o encurtador da Shopee https://s.shopee.com.br/5VWQgkqrbC: ele responde 301 para a página de AFILIADO
// (shopee.com.br/opaanlp/<loja>/<item>?utm_…&gads_t_sig=…), que só tem JavaScript. Links completos da Shopee liam (3/3).
// Esta lib (pura; o único I/O é o `step` injetado — o servidor passa o GET seguro de lib/ads/v2Link.ts) segue o encurtador:
// 301/302/303/307/308, <meta http-equiv="refresh">, location.href/replace no script e o corpo "Moved" com um só link, até 5
// saltos; e limpa o destino (página de afiliado da Shopee → /product/<loja>/<item>; Amazon → /dp/<ASIN>; parâmetros de
// rastreio fora). A leitura segue no endereço final; se ainda não ler, o /plan cai nas fotos / texto neutro (nunca o link).
import { ADS_V2_SHORT_LINK_HOST_RE } from './v2Simple'

/** Saltos no máximo e tempo de cada salto (ms) — curto: encurtador responde rápido ou não responde. */
export const ADS_V2_SHORT_LINK_MAX_HOPS = 5
export const ADS_V2_SHORT_LINK_HOP_TIMEOUT_MS = 4000
/** O que o `step` devolve de um GET sem seguir redirecionamento: status, Location e o começo do corpo (HTML). null = falhou. */
export interface AdsV2ShortLinkHop { status: number; location: string | null; body: string }
export type AdsV2ShortLinkStep = (url: URL) => Promise<AdsV2ShortLinkHop | null>

/** O host é de encurtador/link de afiliado? Pura. */
export function adsV2IsShortLinkHost(host: unknown): boolean {
  return ADS_V2_SHORT_LINK_HOST_RE.test(String(host ?? '').toLowerCase().replace(/^www\./, ''))
}

const decodeAttr = (s: string): string => s.replace(/&amp;/gi, '&').replace(/&#x2f;/gi, '/').replace(/&#47;/g, '/').replace(/&quot;/gi, '"').replace(/&#39;/g, "'").trim()

/** O destino que a PÁGINA manda (meta refresh, location no script, corpo "Moved" com um link só); null = nenhum. Pura. */
export function adsV2HtmlRedirectTarget(html: unknown, base: string): string | null {
  const h = String(html ?? '').slice(0, 65536)
  const abs = (u: string): string | null => { try { const x = new URL(decodeAttr(u), base); return /^https?:$/.test(x.protocol) ? x.toString() : null } catch { return null } }
  const meta = /<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["']\s*\d*\s*;?\s*url\s*=\s*['"]?([^"'>\s]+)/i.exec(h) ?? /<meta[^>]+content\s*=\s*["']\s*\d*\s*;\s*url\s*=\s*['"]?([^"'>\s]+)[^>]*http-equiv\s*=\s*["']?refresh/i.exec(h)
  if (meta) return abs(meta[1])
  const js = /(?:window\.|document\.|top\.|self\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']|location\.(?:replace|assign)\(\s*["']([^"']+)["']\s*\)/i.exec(h)
  if (js) return abs(js[1] ?? js[2])
  const text = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const links = [...h.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi)]
  if (links.length === 1 && text.length < 200 && /moved|redirect|found|click here|clique aqui|aqui/i.test(text)) return abs(links[0][1])
  return null
}

const TRACKING = /^(?:utm_\w+|gads_t_sig|mmp_pid|uls_trackid|exp_group|__mobile__|smtt|sp_atk|xptdk|af_\w+|fbclid|gclid|linkCode|ascsubtag|aff_\w+|deep_and_deferred|is_from_login|matt_\w+)$/i
/** O destino limpo: página de afiliado da Shopee → /product/<loja>/<item>; Amazon → /dp/<ASIN>; parâmetros de rastreio fora. Pura. */
export function adsV2CleanProductUrl(raw: string): string {
  let u: URL
  try { u = new URL(raw) } catch { return raw }
  const host = u.hostname.toLowerCase()
  const shopee = /(^|\.)shopee\.[a-z.]+$/.test(host) ? /^\/(?:opaanlp|universal-link\/product|product)\/(\d+)\/(\d+)/.exec(u.pathname) ?? /-i\.(\d+)\.(\d+)/.exec(u.pathname) : null
  if (shopee) return `https://${host.replace(/^(?:s|sv|m)\./, '')}/product/${shopee[1]}/${shopee[2]}`
  const asin = /(^|\.)amazon\.[a-z.]+$/.test(host) ? /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i.exec(u.pathname) : null
  if (asin) return `https://${host}/dp/${asin[1].toUpperCase()}`
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k)
  u.hash = ''
  return u.toString()
}

/**
 * Segue o encurtador até a página do produto (só quando o host É de encurtador; link comum volta igual, o GET seguro de
 * sempre cuida dos redirecionamentos dele). Cada salto passa pelo `step` (o servidor revalida host público a cada salto).
 * Devolve o endereço final LIMPO; sem destino legível = o último endereço alcançado (a leitura tenta e, se falhar, cai no
 * texto neutro). Nunca lança.
 */
export async function adsV2ResolveShortLink(start: URL, step: AdsV2ShortLinkStep, maxHops: number = ADS_V2_SHORT_LINK_MAX_HOPS): Promise<URL> {
  if (!adsV2IsShortLinkHost(start.hostname)) return start
  let url = start
  for (let hop = 0; hop < maxHops; hop++) {
    const r = await step(url).catch(() => null)
    if (!r) break
    let next: string | null = null
    if (r.status >= 300 && r.status < 400 && r.location) { try { next = new URL(r.location, url).toString() } catch { next = null } }
    else if (r.status >= 200 && r.status < 300) next = adsV2HtmlRedirectTarget(r.body, url.toString())
    if (!next) break
    let nu: URL
    try { nu = new URL(next) } catch { break }
    if (!/^https?:$/.test(nu.protocol) || nu.toString() === url.toString()) break
    url = nu
    if (!adsV2IsShortLinkHost(url.hostname) && !(r.status >= 300 && r.status < 400)) break // a página mandou para a loja: chegou
  }
  try { return new URL(adsV2CleanProductUrl(url.toString())) } catch { return url }
}
