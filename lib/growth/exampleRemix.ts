export const EXAMPLE_REMIX_CAMPAIGN = 'example_remix_v1'
export const EXAMPLE_REMIX_SOURCE = 'example_watch'
export const MAX_EXAMPLE_REMIX_TOPIC_LENGTH = 140

export function sanitizeExampleRemixTopic(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_EXAMPLE_REMIX_TOPIC_LENGTH)
}

export function remixExamplePrompt(referencePrompt: string, rawTopic: string): string {
  const topic = sanitizeExampleRemixTopic(rawTopic)
  if (!topic) return referencePrompt.trim()

  const reference = referencePrompt.trim()
  const replaced = reference.replace(
    /(\babout\s+).*?(,\s+with\s+)/i,
    (_match, prefix: string, suffix: string) => `${prefix}${topic}${suffix}`,
  )

  if (replaced !== reference) return replaced
  return `Create a fast-paced faceless Short about ${topic}, with a strong curiosity hook, specific visual direction, readable captions, and a factual payoff.`
}

export function exampleRemixHref(input: {
  slug: string
  referencePrompt: string
  topic: string
}): string {
  const params = new URLSearchParams({
    prompt: remixExamplePrompt(input.referencePrompt, input.topic),
    create_intent: 'example_remix',
    script_mode: 'ai',
    utm_source: EXAMPLE_REMIX_SOURCE,
    utm_medium: 'proof',
    utm_campaign: EXAMPLE_REMIX_CAMPAIGN,
    utm_content: input.slug,
  })
  return `/generate?${params.toString()}`
}
