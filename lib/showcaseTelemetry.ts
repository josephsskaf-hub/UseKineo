// Code switches: no environment, migration or generation-pipeline change.
export const SHOWCASE_PUBLIC = true
export const SHOWCASE_TELEMETRY_ENABLED = true
export const SHOWCASE_VERSION = 'showcase_v1'
export const SHOWCASE_CAMPAIGN = 'showcase_v1'
export const SHOWCASE_EVENTS = { impression: 'showcase_impression', gesture: 'showcase_first_gesture' } as const
export const SHOWCASE_ACTIONS = ['signup', 'pricing', 'films', 'images', 'spaces', 'ads', 'select', 'preview', 'compare'] as const
export type ShowcaseAction = typeof SHOWCASE_ACTIONS[number]

// This key is a browser identifier, NOT proof of a distinct human. Reports resolve
// authenticated user_id via the existing sink/session chain and exclude internals/bots.
export function showcaseAction(value: unknown): ShowcaseAction | null {
  return typeof value === 'string' && (SHOWCASE_ACTIONS as readonly string[]).includes(value) ? value as ShowcaseAction : null
}

export function createShowcaseLatch() {
  const sent = new Set<string>()
  return (key: string) => { if (sent.has(key)) return false; sent.add(key); return true }
}
