export type CreationScriptMode = 'ai' | 'verbatim'
export type CreationDuration = 35 | 45 | 60 | 90
export type CreationIntent = 'fast' | 'trial_best' | null
export type CreationLanguage = 'en' | 'pt' | 'es'

type QueryReader = Pick<URLSearchParams, 'get'>
type QueryWriter = Pick<URLSearchParams, 'set'>

export interface CreationHandoff {
  prompt: string
  createIntent: CreationIntent
  scriptMode: CreationScriptMode | null
  duration: CreationDuration | null
}

export interface ActivationCreationContract {
  prompt: string
  createIntent: CreationIntent
  scriptMode: CreationScriptMode
  duration: CreationDuration
  structureFirst: boolean
}

export interface AuthenticatedCreationRedirectInput {
  prompt: string
  campaign: string
  createIntent: Exclude<CreationIntent, null>
  language?: CreationLanguage
  scriptMode?: CreationScriptMode
  duration?: CreationDuration
}

/**
 * Build the nested same-origin destination used when an authenticated visitor
 * crosses /signup. Without it, middleware sends that visitor to /dashboard
 * and silently discards the public form's creation contract.
 */
export function buildAuthenticatedCreationRedirect({
  prompt,
  campaign,
  createIntent,
  language,
  scriptMode,
  duration,
}: AuthenticatedCreationRedirectInput): string | null {
  const boundedPrompt = prompt.trim().slice(0, 1000)
  if (!boundedPrompt) return null

  const destination = new URLSearchParams({
    welcome: '1',
    prompt: boundedPrompt,
    create_intent: createIntent,
    intent_campaign: campaign,
  })
  if (language) destination.set('language', language)
  if (scriptMode) destination.set('script_mode', scriptMode)
  if (duration) destination.set('duration', String(duration))
  return `/studio/create?${destination.toString()}`
}

/**
 * The bounded, client-safe contract shared by the public form, signup and the
 * authenticated creation surface. Unknown values are discarded rather than
 * being forwarded through auth or silently changing how a script is handled.
 */
export function readCreationHandoff(params: QueryReader): CreationHandoff {
  const prompt = (params.get('prompt') ?? '').trim().slice(0, 1000)
  const rawCreateIntent = params.get('create_intent')
  const rawScriptMode = (params.get('script_mode') ?? '').toLowerCase()
  const rawDuration = Number(params.get('duration') ?? '')

  return {
    prompt,
    createIntent:
      prompt && (rawCreateIntent === 'fast' || rawCreateIntent === 'trial_best')
        ? rawCreateIntent
        : null,
    scriptMode:
      rawScriptMode === 'verbatim' || rawScriptMode === 'ai'
        ? rawScriptMode
        : null,
    // KINEO-PRIMEIRO-VIDEO-2026-09-02 — 45 nao existe no seletor (35/60/90)
    // desde 20/08; 11 das 15 recusas de narracao em 14d mediam contra 45, e o
    // custo do claim (45s) x custo do compose (35s) negava filme pronto. Quem
    // ainda manda 45 (landings antigas) recebe 35: o primeiro video mais
    // rapido e o unico alvo curto que o produto oferece.
    duration:
      rawDuration === 45
        ? 35
        : rawDuration === 35 || rawDuration === 60 || rawDuration === 90
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
    duration: handoff.duration ?? 35, // KINEO-PRIMEIRO-VIDEO-2026-09-02 — era 45 (alvo fantasma)
    structureFirst: scriptMode !== 'verbatim',
  }
}
