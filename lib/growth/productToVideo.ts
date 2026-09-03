export const PRODUCT_TO_VIDEO_CAMPAIGN = 'product_to_short' as const

export type ProductScriptLine = { label: string; text: string }

const PRODUCT_SCRIPT_LABELS = ['HOOK', 'PROBLEM', 'PRODUCT', 'PROOF', 'CTA'] as const
const SPOKEN_WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu

export function productScriptWordCount(lines: ProductScriptLine[]): number {
  return lines.reduce((total, line) => total + (line.text.match(SPOKEN_WORD)?.length ?? 0), 0)
}

export function productScriptMeetsDuration(raw: string): boolean {
  const lines = parseProductScript(raw)
  if (lines.length !== PRODUCT_SCRIPT_LABELS.length) return false
  if (lines.some((line, index) => line.label !== PRODUCT_SCRIPT_LABELS[index])) return false
  const words = productScriptWordCount(lines)
  return words >= 70 && words <= 90
}

export function normalizeProductFacts(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 700)
}

export function normalizeProductAudience(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 140)
}

export function parseProductScript(raw: string): ProductScriptLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => {
      const separator = line.indexOf(':')
      if (separator > 0 && separator < 18) {
        return {
          label: line.slice(0, separator).trim().toUpperCase(),
          text: line.slice(separator + 1).trim(),
        }
      }
      return { label: '', text: line }
    })
}

function generatorMarker(label: string): string {
  const normalized = label.replace(/\s+/g, ' ').trim().toUpperCase()
  if (normalized === 'HOOK') return 'HOOK'
  if (normalized === 'PROBLEM') return 'MICRO REWARD 1'
  if (normalized === 'PRODUCT') return 'MICRO REWARD 2'
  if (normalized === 'PROOF') return 'ESCALATION'
  if (normalized === 'CTA') return 'PAYOFF'
  return label.slice(0, 24)
}

export function buildProductToVideoActivationHref(lines: ProductScriptLine[]): string {
  const signup = new URLSearchParams({
    utm_source: 'product_tool',
    utm_medium: 'organic',
    utm_campaign: PRODUCT_TO_VIDEO_CAMPAIGN,
  })
  if (lines.length === 0) return `/signup?${signup.toString()}`

  const script = lines
    .slice(0, 5)
    .map(({ label, text }) => {
      const marker = generatorMarker(label)
      const safeText = text.replace(/\s+/g, ' ').trim().slice(0, 240)
      return marker ? `${marker}: ${safeText}` : safeText
    })
    .join('\n')
  const destination = `/studio/create?${new URLSearchParams({
    prompt: script,
    script_mode: 'verbatim',
    duration: '35',
    autoanalyze: '1',
    intent_campaign: PRODUCT_TO_VIDEO_CAMPAIGN,
  }).toString()}`
  signup.set('redirect', destination)
  return `/signup?${signup.toString()}`
}
