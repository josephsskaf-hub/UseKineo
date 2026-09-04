export type FreeScriptLine = { label: string; text: string }

type SignupAttribution = {
  source: string
  medium: string
  campaign: string
}

/**
 * Builds the exact auth handoff used by the public free-script CTA. The
 * `handoff_kind` marker lives only inside the allow-listed Studio destination;
 * it is visual continuity metadata and never an executable create intent.
 */
export function buildFreeScriptSignupHref(
  lines: FreeScriptLine[],
  attribution: SignupAttribution
): string {
  if (lines.length === 0) {
    return `/signup?${new URLSearchParams({
      utm_source: attribution.source,
      utm_medium: attribution.medium,
      utm_campaign: attribution.campaign,
    }).toString()}`
  }

  const markerFor = (label: string): string => {
    const normalized = label.replace(/\s+/g, ' ').trim().toUpperCase()
    if (normalized === 'HOOK') return 'HOOK'
    if (normalized === 'FACT 1') return 'MICRO REWARD 1'
    if (normalized === 'FACT 2') return 'MICRO REWARD 2'
    if (normalized === 'FACT 3') return 'ESCALATION'
    if (normalized === 'PAYOFF') return 'PAYOFF'
    return label
  }
  const script = lines
    .slice(0, 5)
    .map(({ label, text }) => {
      const marker = markerFor(label)
      const safeText = text.slice(0, 220)
      return marker ? `${marker}: ${safeText}` : safeText
    })
    .join('\n')
  const destination = `/studio/create?${new URLSearchParams({
    prompt: script,
    autoanalyze: '1',
    handoff_kind: 'free_script',
  }).toString()}`
  return `/signup?${new URLSearchParams({
    utm_source: attribution.source,
    utm_medium: attribution.medium,
    utm_campaign: attribution.campaign,
    redirect: destination,
  }).toString()}`
}
