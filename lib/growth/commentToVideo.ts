export const COMMENT_TO_VIDEO_CAMPAIGN = 'comment_to_short' as const

export type CommentScriptLine = { label: string; text: string }

export function normalizeAudienceComment(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 280)
}

export function parseCommentScript(raw: string): CommentScriptLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => {
      const separator = line.indexOf(':')
      if (separator > 0 && separator < 16) {
        return {
          label: line.slice(0, separator).trim().toUpperCase(),
          text: line.slice(separator + 1).trim(),
        }
      }
      return { label: '', text: line }
    })
}

function markerFor(label: string): string {
  const normalized = label.replace(/\s+/g, ' ').trim().toUpperCase()
  if (normalized === 'HOOK') return 'HOOK'
  if (normalized === 'FACT 1') return 'MICRO REWARD 1'
  if (normalized === 'FACT 2') return 'MICRO REWARD 2'
  if (normalized === 'FACT 3') return 'ESCALATION'
  if (normalized === 'PAYOFF') return 'PAYOFF'
  return label.slice(0, 24)
}

export function buildCommentToVideoActivationHref(lines: CommentScriptLine[]): string {
  const signupParams = new URLSearchParams({
    utm_source: 'comment_tool',
    utm_medium: 'organic',
    utm_campaign: COMMENT_TO_VIDEO_CAMPAIGN,
  })
  if (lines.length === 0) return `/signup?${signupParams.toString()}`

  const script = lines
    .slice(0, 5)
    .map(({ label, text }) => {
      const marker = markerFor(label)
      const safeText = text.replace(/\s+/g, ' ').trim().slice(0, 220)
      return marker ? `${marker}: ${safeText}` : safeText
    })
    .join('\n')
  const destination = `/generate?${new URLSearchParams({
    prompt: script,
    autoanalyze: '1',
    intent_campaign: COMMENT_TO_VIDEO_CAMPAIGN,
  }).toString()}`
  signupParams.set('redirect', destination)
  return `/signup?${signupParams.toString()}`
}
