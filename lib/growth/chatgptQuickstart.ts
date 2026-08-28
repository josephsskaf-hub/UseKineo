export const CHATGPT_QUICKSTART_VARIANT = 'chatgpt_quickstart_v2'

export type ChatGptQuickstartChoice = 'finished_script' | 'idea'

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
    href: '/studio/create?script_mode=verbatim&duration=35&chatgpt_quickstart=finished_script',
  },
  {
    choice: 'idea',
    label: 'I only have the idea',
    detail: 'Kineo writes the hook, scenes and payoff',
    href: '/studio/create?script_mode=ai&duration=45&chatgpt_quickstart=idea',
  },
] as const

