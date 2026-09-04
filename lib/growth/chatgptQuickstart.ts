import { ANALYZE_PROMPT_MAX_CHARS } from '@/lib/analyzeLimits'

export const CHATGPT_QUICKSTART_VARIANT = 'chatgpt_quickstart_v6'

// One ceiling governs the first paste, Studio and /api/analyze-idea. The
// Quickstart used to keep only the first 1,000 characters without telling the
// person. Oversized text now stays visible in the card and the handoff fails
// closed until the person explicitly trims it.
export const CHATGPT_QUICKSTART_INPUT_LIMIT = ANALYZE_PROMPT_MAX_CHARS

export type ChatGptQuickstartChoice = 'finished_script' | 'idea'

export function isChatGptQuickstartChoice(value: string | null | undefined): value is ChatGptQuickstartChoice {
  return value === 'finished_script' || value === 'idea'
}

export const CHATGPT_QUICKSTARTS: ReadonlyArray<{
  choice: ChatGptQuickstartChoice
  label: string
  detail: string
  href: string
}> = [
  {
    choice: 'finished_script',
    label: 'I have the full script',
    detail: 'Paste it exactly as ChatGPT wrote it',
    href: `/studio?engine=seedance&script_mode=verbatim&duration=35&chatgpt_quickstart=finished_script&intent_campaign=${CHATGPT_QUICKSTART_VARIANT}`,
  },
  {
    choice: 'idea',
    label: 'I only have the idea',
    detail: 'Kineo writes the hook, scenes and payoff',
    href: `/studio?engine=seedance&script_mode=ai&duration=60&chatgpt_quickstart=idea&intent_campaign=${CHATGPT_QUICKSTART_VARIANT}`,
  },
] as const

export function normalizeChatGptQuickstartInput(value: string): string {
  return value.trim()
}

/**
 * Keeps the text beside the choice that asks for it, then hands both to the
 * existing Studio contract. The prompt is intentionally URL-only: analytics
 * receives the allow-listed choice and input length, never customer content.
 */
export function buildChatGptQuickstartHref(choice: ChatGptQuickstartChoice, input: string): string | null {
  const normalized = normalizeChatGptQuickstartInput(input)
  if (!normalized || normalized.length > CHATGPT_QUICKSTART_INPUT_LIMIT) return null
  const option = CHATGPT_QUICKSTARTS.find((candidate) => candidate.choice === choice)
  if (!option) return null
  return `${option.href}&prompt=${encodeURIComponent(normalized)}`
}

