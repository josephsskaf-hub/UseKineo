export const EXAMPLE_REMIX_CAMPAIGN = 'example_remix_v1'
export const EXAMPLE_REMIX_EXACT_VERSION = 'example_remix_exact_v1'
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
  mode?: 'topic' | 'exact'
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
  if (input.mode === 'exact') params.set('remix_mode', 'exact_prompt')
  // KINEO-LINKS-STUDIO-NOVO-2026-10-02 — destino = o Studio novo (/studio), mesmo precedente do link /go (36fc267).
  // O Studio lê prompt/script_mode; os utm_* são gravados pelo SourceCapture em qualquer página. `create_intent=
  // example_remix` não é executável (readCreationHandoff só aceita fast/trial_best): segue só como marcador da prova
  // do /signup. Novo: intent_campaign, a única etiqueta que o Studio carrega até o /studio/create no Generate (sem ela
  // a campanha do remix virava 'studio_v4' no funil de geração).
  params.set('intent_campaign', EXAMPLE_REMIX_CAMPAIGN)
  return `/studio?${params.toString()}`
}
