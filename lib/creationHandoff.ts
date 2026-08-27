export type CreationScriptMode = 'ai' | 'verbatim'
export type CreationDuration = 35 | 45 | 60 | 90

type QueryReader = Pick<URLSearchParams, 'get'>
type QueryWriter = Pick<URLSearchParams, 'set'>

export interface CreationHandoff {
  prompt: string
  createIntent: 'fast' | null
  scriptMode: CreationScriptMode | null
  duration: CreationDuration | null
}

export interface ActivationCreationContract {
  prompt: string
  createIntent: 'fast' | null
  scriptMode: CreationScriptMode
  duration: CreationDuration
  structureFirst: boolean
}

/**
 * The bounded, client-safe contract shared by the public form, signup and the
 * authenticated creation surface. Unknown values are discarded rather than
 * being forwarded through auth or silently changing how a script is handled.
 */
export function readCreationHandoff(params: QueryReader): CreationHandoff {
  const prompt = (params.get('prompt') ?? '').trim().slice(0, 1000)
  const rawScriptMode = (params.get('script_mode') ?? '').toLowerCase()
  const rawDuration = Number(params.get('duration') ?? '')

  return {
    prompt,
    createIntent: prompt && params.get('create_intent') === 'fast' ? 'fast' : null,
    scriptMode:
      rawScriptMode === 'verbatim' || rawScriptMode === 'ai'
        ? rawScriptMode
        : null,
    duration:
      rawDuration === 35 || rawDuration === 45 || rawDuration === 60 || rawDuration === 90
        ? rawDuration
        : null,
  }
}

export function carryCreationHandoff(params: QueryReader, target: QueryWriter): CreationHandoff {
  const handoff = readCreationHandoff(params)
  if (handoff.prompt) target.set('prompt', handoff.prompt)
  if (handoff.createIntent) target.set('create_intent', handoff.createIntent)
  if (handoff.scriptMode) target.set('script_mode', handoff.scriptMode)
  if (handoff.duration) target.set('duration', String(handoff.duration))
  return handoff
}

/**
 * Resolve the values the real activation caller must commit before analysis.
 * The defaults preserve every existing generic signup; the ChatGPT handoff is
 * explicit (`verbatim`, 35s), so it cannot inherit a stale dashboard choice.
 */
export function resolveActivationCreationContract(params: QueryReader): ActivationCreationContract {
  const handoff = readCreationHandoff(params)
  const scriptMode = handoff.scriptMode ?? 'ai'

  return {
    prompt: handoff.prompt,
    createIntent: handoff.createIntent,
    scriptMode,
    duration: handoff.duration ?? 45,
    structureFirst: scriptMode !== 'verbatim',
  }
}
