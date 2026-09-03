export const ANSWER_ENGINE_HOOK_WORKBENCH_VERSION = 'aeo_hook_workbench_v1' as const
export const ANSWER_ENGINE_HOOK_SOURCE = 'answer_engine' as const
export const ANSWER_ENGINE_HOOK_MEDIUM = 'organic' as const
export const ANSWER_ENGINE_HOOK_PATH = '/free-hook-generator' as const

export const LEGACY_HOOK_SOURCE = 'seo' as const
export const LEGACY_HOOK_MEDIUM = 'organic' as const
export const LEGACY_HOOK_CAMPAIGN = 'push22_hook_generator' as const

export type AnswerEngineHookEntry = 'answer_engine' | 'default'

type SearchRecord = Record<string, string | string[] | undefined>

function single(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function answerEngineHookEntry(searchParams: SearchRecord): AnswerEngineHookEntry {
  return single(searchParams.utm_source) === ANSWER_ENGINE_HOOK_SOURCE &&
    single(searchParams.utm_medium) === ANSWER_ENGINE_HOOK_MEDIUM &&
    single(searchParams.utm_campaign) === ANSWER_ENGINE_HOOK_WORKBENCH_VERSION
    ? 'answer_engine'
    : 'default'
}

export function answerEngineHookStartUrl(baseUrl = 'https://www.usekineo.com'): string {
  const url = new URL(ANSWER_ENGINE_HOOK_PATH, baseUrl)
  if (url.origin !== 'https://www.usekineo.com') {
    throw new Error('Answer-engine hook workbench requires the canonical Kineo origin')
  }
  url.searchParams.set('utm_source', ANSWER_ENGINE_HOOK_SOURCE)
  url.searchParams.set('utm_medium', ANSWER_ENGINE_HOOK_MEDIUM)
  url.searchParams.set('utm_campaign', ANSWER_ENGINE_HOOK_WORKBENCH_VERSION)
  return url.toString()
}

export function hookWorkbenchAttribution(entry: AnswerEngineHookEntry) {
  return entry === 'answer_engine'
    ? {
        source: ANSWER_ENGINE_HOOK_SOURCE,
        medium: ANSWER_ENGINE_HOOK_MEDIUM,
        campaign: ANSWER_ENGINE_HOOK_WORKBENCH_VERSION,
      }
    : {
        source: LEGACY_HOOK_SOURCE,
        medium: LEGACY_HOOK_MEDIUM,
        campaign: LEGACY_HOOK_CAMPAIGN,
      }
}

/**
 * `organic_cta_clicked.source` historically names the page campaign rather
 * than the acquisition-origin column. Keep the default cohort stable while
 * giving the new answer-engine path its own event label.
 */
export function hookCtaEventSource(entry: AnswerEngineHookEntry): string {
  return entry === 'answer_engine'
    ? ANSWER_ENGINE_HOOK_WORKBENCH_VERSION
    : LEGACY_HOOK_CAMPAIGN
}

export function hookActivationHref(
  topic: string,
  hook: string | undefined,
  entry: AnswerEngineHookEntry,
): string {
  const attribution = hookWorkbenchAttribution(entry)
  const cleanTopic = topic.trim().slice(0, 200)
  const signup = new URLSearchParams({
    utm_source: attribution.source,
    utm_medium: attribution.medium,
    utm_campaign: attribution.campaign,
  })
  if (!cleanTopic) return `/signup?${signup.toString()}`

  const cleanHook = hook?.trim().slice(0, 220)
  // Preserve the established hook-tool handoff: topic and selected hook live
  // in the browser URL until signup resolves the internal /generate redirect.
  // They are user-authored URL data, not private storage. Closed analytics
  // must never copy either value.
  const prompt = cleanHook
    ? `Use this exact opening hook: "${cleanHook}"\nTopic: ${cleanTopic}`
    : cleanTopic
  const destination = `/generate?${new URLSearchParams({ prompt, autoanalyze: '1' }).toString()}`
  signup.set('redirect', destination)
  return `/signup?${signup.toString()}`
}

export function hookResultEventMetadata(entry: AnswerEngineHookEntry, hookCount: number) {
  const count = Number.isSafeInteger(hookCount) && hookCount > 0
    ? Math.min(hookCount, 20)
    : 0
  return {
    version: ANSWER_ENGINE_HOOK_WORKBENCH_VERSION,
    entry,
    hook_count: count,
  }
}
