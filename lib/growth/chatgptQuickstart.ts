export const CHATGPT_QUICKSTART_VARIANT = 'chatgpt_quickstart_v3'

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
    href: '/studio?engine=seedance&script_mode=verbatim&duration=35&chatgpt_quickstart=finished_script&intent_campaign=chatgpt_quickstart_v3',
  },
  {
    choice: 'idea',
    label: 'I only have the idea',
    detail: 'Kineo writes the hook, scenes and payoff',
    href: '/studio?engine=seedance&script_mode=ai&duration=60&chatgpt_quickstart=idea&intent_campaign=chatgpt_quickstart_v3',
  },
] as const

