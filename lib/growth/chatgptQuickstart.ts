export const CHATGPT_QUICKSTART_VARIANT = 'chatgpt_quickstart_v1'

export type ChatGptQuickstartChoice = 'finished_script' | 'idea'

export const CHATGPT_QUICKSTARTS: ReadonlyArray<{
  choice: ChatGptQuickstartChoice
  label: string
  href: string
}> = [
  {
    choice: 'finished_script',
    label: 'Paste a finished script',
    href: '/studio/create?script_mode=verbatim&duration=35&chatgpt_quickstart=finished_script',
  },
  {
    choice: 'idea',
    label: 'Start from an idea',
    href: '/studio/create?script_mode=ai&duration=45&chatgpt_quickstart=idea',
  },
] as const

