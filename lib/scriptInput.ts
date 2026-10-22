// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — a link identifies a page; it is never narration or an idea to author.
export const CHATGPT_LINK_MESSAGE = "We can't open ChatGPT links — paste the script text instead."
export const ORIGINAL_IDEA_SESSION_KEY = 'kineo:script-original-idea:v1'

// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — preserve mixed prose and links; reject only a standalone web address.
export function isStandaloneHttpUrl(value: string | null | undefined): boolean {
  const text = (value ?? '').trim()
  return /^https?:\/\/\S+$/i.test(text)
    || /^(?:www\.)?(?:chatgpt\.com\/(?:s|share)\/|chat\.openai\.com\/share\/)\S*$/i.test(text) // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — empty share paths are links too
}

// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — all fallback candidates cross the same link guard before being offered.
export function usableOriginalIdea(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  return text && !isStandaloneHttpUrl(text) ? text : null
}

// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — the arrival query is the client copy of the idea carried through auth.
export function originalIdeaFromArrival(params: Pick<URLSearchParams, 'get'>): string | null {
  return usableOriginalIdea(params.get('idea'))
    ?? usableOriginalIdea(params.get('topic'))
    ?? usableOriginalIdea(params.get('seed'))
    ?? (params.get('chatgpt_quickstart') === 'finished_script' ? null : usableOriginalIdea(params.get('prompt')))
}
