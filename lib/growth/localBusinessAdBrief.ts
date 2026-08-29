const FIELD_WORD_LIMITS = {
  businessName: 4,
  service: 6,
  audience: 5,
  proof: 8,
  callToAction: 7,
} as const

export type LocalBusinessAdBriefInput = {
  businessName: string
  service: string
  audience: string
  proof: string
  callToAction: string
}

export type LocalBusinessAdBrief = {
  script: string
  spokenWords: number
  estimatedSeconds: number
}

function words(value: string): string[] {
  return value.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
}

function clean(value: string, limit: number): string {
  return words(value)
    .slice(0, limit)
    .join(' ')
    .replace(/[.!?]+$/g, '')
    .trim()
}

export function limitLocalBusinessField(
  field: keyof LocalBusinessAdBriefInput,
  value: string
): string {
  return clean(value, FIELD_WORD_LIMITS[field])
}

export function localBusinessBriefIsComplete(input: LocalBusinessAdBriefInput): boolean {
  return (Object.keys(FIELD_WORD_LIMITS) as Array<keyof LocalBusinessAdBriefInput>)
    .every((field) => clean(input[field], FIELD_WORD_LIMITS[field]).length > 0)
}

function countSpokenWords(script: string): number {
  return script
    .replace(/^\s*(?:HOOK|MICRO REWARD \d+|ESCALATION|PAYOFF)\s*:\s*/gim, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function measureLocalBusinessAdScript(script: string): Pick<LocalBusinessAdBrief, 'spokenWords' | 'estimatedSeconds'> {
  const spokenWords = countSpokenWords(script)
  return {
    spokenWords,
    estimatedSeconds: Math.round((spokenWords / 2.3) * 10) / 10,
  }
}

/**
 * Builds a short commercial script only from facts the visitor supplied.
 * The two optional filler lines are advice, not claims about the business.
 */
export function buildLocalBusinessAdBrief(input: LocalBusinessAdBriefInput): LocalBusinessAdBrief {
  const businessName = clean(input.businessName, FIELD_WORD_LIMITS.businessName)
  const service = clean(input.service, FIELD_WORD_LIMITS.service)
  const audience = clean(input.audience, FIELD_WORD_LIMITS.audience)
  const proof = clean(input.proof, FIELD_WORD_LIMITS.proof)
  const callToAction = clean(input.callToAction, FIELD_WORD_LIMITS.callToAction)

  if (![businessName, service, audience, proof, callToAction].every(Boolean)) {
    return { script: '', spokenWords: 0, estimatedSeconds: 0 }
  }

  const lines = [
    `HOOK: If you're ${audience}, choosing ${service} should not feel like guesswork.`,
    `MICRO REWARD 1: ${businessName} offers ${service} for ${audience}.`,
    `MICRO REWARD 2: Here is what makes the service different: ${proof}.`,
    'ESCALATION: Before you decide, compare what is included, ask what happens next, and make sure the details fit what you actually need.',
    `PAYOFF: ${callToAction}.`,
  ]

  let script = lines.join('\n')
  let spokenWords = countSpokenWords(script)
  if (spokenWords < 77) {
    lines.splice(4, 0, 'Good service should solve the real problem without hiding the details that matter.')
    script = lines.join('\n')
    spokenWords = countSpokenWords(script)
  }
  if (spokenWords < 77) {
    lines.splice(5, 0, 'Ask questions before you commit, and choose the option that fits your needs.')
    script = lines.join('\n')
    spokenWords = countSpokenWords(script)
  }
  if (spokenWords < 77) {
    lines.splice(6, 0, 'Know the facts first, then take the next step confidently.')
    script = lines.join('\n')
    spokenWords = countSpokenWords(script)
  }

  return {
    script,
    spokenWords,
    estimatedSeconds: Math.round((spokenWords / 2.3) * 10) / 10,
  }
}

export const LOCAL_BUSINESS_FIELD_WORD_LIMITS = FIELD_WORD_LIMITS
