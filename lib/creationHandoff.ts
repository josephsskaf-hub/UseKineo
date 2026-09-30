export type CreationScriptMode = 'ai' | 'verbatim'
export type CreationDuration = 15 | 30 | 35 | 45 | 60 | 90 // KINEO-SEEDANCE-15S-2026-09-29: 15 = Seedance 1.5 curto · KINEO-DURACOES-CURTAS-2026-09-29: 15 em todo motor, 30 na estrada hollywood
export type CreationIntent = 'fast' | 'trial_best' | null
import type { NarrationLanguage } from './textLanguage'
// KINEO-IDIOMAS-15-2026-09-17 — o handoff de cadastro carrega qualquer língua do catálogo.
export type CreationLanguage = NarrationLanguage

// Nested auth redirects remain deliberately smaller than the Studio analyzer
// ceiling. The public form must surface this boundary instead of letting the
// browser silently discard everything after it.
export const CREATION_HANDOFF_PROMPT_MAX_CHARS = 1000

// ═══ KINEO-DURACOES-CURTAS-2026-09-29 [vai do fundador 29/09 'vai pra todas as 4'] — as durações curtas NOVAS por motor (abaixo de 35),
// espelho de lib/durationByEngine.ts supportedDurationsFor (este módulo roda no guardião sem imports; o guardião
// scripts/test-duracoes-curtas-todos-motores-2026-09-29.mjs compara as duas tabelas). ?duration=15 sem motor continua caindo no padrão.
const CURTAS_DO_HANDOFF: Readonly<Record<string, readonly number[]>> = { kling: [15], veo: [15], hollywood: [15, 30], h3: [15, 30], omni: [15, 30], s25: [15, 30] }

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
  const boundedPrompt = prompt.trim().slice(0, CREATION_HANDOFF_PROMPT_MAX_CHARS)
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
  const prompt = (params.get('prompt') ?? '').trim().slice(0, CREATION_HANDOFF_PROMPT_MAX_CHARS)
  const rawCreateIntent = params.get('create_intent')
  const rawScriptMode = (params.get('script_mode') ?? '').toLowerCase()
  const rawDuration = Number(params.get('duration') ?? '')
  // KINEO-SEEDANCE-15S-2026-09-29 (revisão E2a) — o 15 s só existe no Seedance 1.5: ?duration=15 só vale com
  // ?engine=seedance. Sem isso, /generate?duration=15 levava o Kineo 1 a precificar 15 s na tela e cobrar 45 s na rota
  // (generate-video-fast sobe 15→45), e Kling/Veo a precificar 15 s e levar 422. Sem motor, 15 cai no padrão (35).
  const rawEngine = (params.get('engine') ?? '').trim().toLowerCase()

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
        : (rawDuration === 15 && rawEngine === 'seedance') || (CURTAS_DO_HANDOFF[rawEngine] ?? []).includes(rawDuration) || rawDuration === 35 || rawDuration === 60 || rawDuration === 90 // KINEO-SEEDANCE-15S-2026-09-29 (o padrão continua 35) · KINEO-DURACOES-CURTAS-2026-09-29
          ? (rawDuration as CreationDuration) // KINEO-DURACOES-CURTAS-2026-09-29: o includes() não estreita o tipo
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
