/** Review a failed video's topic in Studio. Never starts or resumes a paid job.
 * Preserve the previous composer's default: Fast, 35s, AI script mode. */
export function reviewVideoRetryHref(topic: string | null | undefined): string {
  const prompt = (topic ?? '').trim().slice(0,1000)
  if (!prompt) return '/studio'
  return '/studio?' + new URLSearchParams({prompt,engine:'fast',duration:'35',script_mode:'ai'}).toString()
}
