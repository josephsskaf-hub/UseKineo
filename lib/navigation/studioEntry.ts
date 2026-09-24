type EntryParams = { get(key: string): string | null }

// Tracking alone is not a creation request. Keep explicit creation, account
// activation and recovery links in the machine room; never interrupt a job.
export function hasStudioCreateIntent(params: EntryParams): boolean {
  return ['prompt', 'topic', 'create_intent', 'studio', 'autoanalyze', 'engine',
    'welcome', 'signup', 'return', 'generationId', 'avatar', 'resume',
    'wm_unlock', 'viral_topic', 'session_id'].some((key) => Boolean(params.get(key)?.trim()))
}

export function studioEntryView(input: {
  hasIntent: boolean
  pendingPrompt: boolean | null
  restoreResolved: boolean
  resumed: boolean
  phase: string
  hasBlockingUi: boolean
}): 'render' | 'loading' | 'redirect' {
  if (input.hasIntent || input.resumed || input.phase !== 'idle' || input.hasBlockingUi) return 'render'
  if (input.pendingPrompt === null || !input.restoreResolved) return 'loading'
  return input.pendingPrompt ? 'render' : 'redirect'
}
