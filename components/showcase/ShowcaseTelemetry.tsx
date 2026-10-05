'use client'
import { useEffect } from 'react'
import { rememberSignupCampaign, trackClosedEvent } from '@/lib/analytics'
import { createShowcaseLatch, showcaseAction, SHOWCASE_CAMPAIGN, SHOWCASE_DISCOVERY_VERSION, SHOWCASE_EVENTS, SHOWCASE_TELEMETRY_ENABLED, SHOWCASE_VERSION } from '@/lib/showcaseTelemetry'

const claim = createShowcaseLatch()
let ephemeralActor: string | undefined
function browserActor() {
  const key = 'kineo:showcase:browser'
  try {
    const old = localStorage.getItem(key)
    if (old && /^[a-f0-9-]{36}$/i.test(old)) return old
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch { return ephemeralActor ??= crypto.randomUUID() }
}

export default function ShowcaseTelemetry() {
  useEffect(() => {
    if (!SHOWCASE_TELEMETRY_ENABLED) return
    const actor = browserActor()
    const send = (kind: keyof typeof SHOWCASE_EVENTS, action?: string) => {
      const key = `kineo:${SHOWCASE_VERSION}:${actor}:${kind}`
      try { if (localStorage.getItem(key) === 'stored') return } catch { /* memory latch still works */ }
      if (!claim(key)) return
      void trackClosedEvent(SHOWCASE_EVENTS[kind], {
        showcase_version: SHOWCASE_VERSION, showcase_browser: actor, ...(action ? { action } : {}),
        showcase_discovery_version: SHOWCASE_DISCOVERY_VERSION,
      }, '/showcase').then(result => {
        if (result === 'stored') { try { localStorage.setItem(key, 'stored') } catch { /* optional */ } }
      })
    }
    const impression = () => { if (document.visibilityState === 'visible') send('impression') }
    const gesture = (event: Event) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return
      const target = event.target.closest('[data-showcase-action]')
      const action = showcaseAction(target?.getAttribute('data-showcase-action'))
      if (!action) return
      // Preserve the existing first acquisition source and first high-intent handoff.
      if (['signup', 'pricing', 'films', 'images', 'spaces', 'ads'].includes(action)) rememberSignupCampaign(SHOWCASE_CAMPAIGN)
      impression()
      send('gesture', action)
    }
    impression()
    document.addEventListener('visibilitychange', impression)
    document.addEventListener('click', gesture, true)
    document.addEventListener('change', gesture, true)
    return () => {
      document.removeEventListener('visibilitychange', impression)
      document.removeEventListener('click', gesture, true)
      document.removeEventListener('change', gesture, true)
    }
  }, [])
  return null
}
