import { normalizeAffiliateCode } from '@/lib/affiliateCode'

const CANONICAL_ORIGIN = 'https://www.usekineo.com'
const GENERIC_WIDGET_CTA = `${CANONICAL_ORIGIN}/?utm_source=widget&utm_medium=embed&utm_campaign=acq5`

function affiliateCodeFromLink(baseLink: string): string | null {
  try {
    const url = new URL(baseLink)
    const match = /^\/a\/([^/]+)\/?$/i.exec(url.pathname)
    return normalizeAffiliateCode(match?.[1])
  } catch {
    return null
  }
}

export function buildAffiliateWidgetEmbedUrl(baseLink: string): string {
  const code = affiliateCodeFromLink(baseLink)
  if (!code) return ''
  const url = new URL('/widget/embed', CANONICAL_ORIGIN)
  url.searchParams.set('affiliate', code)
  return url.toString()
}

export function buildAffiliateWidgetSnippet(baseLink: string): string {
  const embedUrl = buildAffiliateWidgetEmbedUrl(baseLink)
  if (!embedUrl) return ''
  return `<iframe src="${embedUrl}" width="360" height="200" frameborder="0" title="Shorts Idea of the Day — Kineo"></iframe>`
}

export function buildAffiliateWidgetCta(rawCode: string | null | undefined): string {
  const code = normalizeAffiliateCode(rawCode)
  if (!code) return GENERIC_WIDGET_CTA
  return `${CANONICAL_ORIGIN}/a/${code}?to=script`
}
