'use client'
import { useEffect } from 'react'
import { trackClosedEvent } from '@/lib/analytics'
import {
  CLIP_CATALOG_VERSION, CLIP_MEASUREMENT_ENABLED, CLIP_MEASUREMENT_EVENTS, CLIP_MEASUREMENT_VERSION,
  clipMeasurementVersion, clipOriginForEntry, clipOriginMetadata, createClipMeasurementGate, type ClipOriginInfo,
} from './clipMeasurement'

const sendOnce = createClipMeasurementGate()
let ephemeralBrowser: string | undefined
function browserIdentity() {
  try {
    const key = 'kineo:clips:browser'
    const old = localStorage.getItem(key)
    const id = old && /^[a-f0-9-]{36}$/i.test(old) ? old : crypto.randomUUID()
    localStorage.setItem(key, id)
    return { id, persistent: true }
  } catch {
    ephemeralBrowser ??= typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    return { id: ephemeralBrowser, persistent: false }
  }
}
export function readClipEntryOrigin(): ClipOriginInfo {
  try {
    const navigation = (window as Window & { navigation?: {
      currentEntry?: { index: number }; entries: () => { url: string | null }[]
    } }).navigation
    const previous = navigation?.currentEntry
      ? navigation.entries().slice(0, navigation.currentEntry.index).slice(-4).reverse().flatMap(entry => entry.url ? [entry.url] : []) : []
    return clipOriginForEntry(window.location.href, document.referrer, previous)
  } catch { return { origin: 'unknown', evidence: 'unknown' } }
}

export default function ClipTelemetry({ actor, surface, effect = null, ready = true }: {
  actor: string | null; surface: 'clips' | 'effect_page'; effect?: string | null; ready?: boolean
}) {
  useEffect(() => {
    if (!CLIP_MEASUREMENT_ENABLED || !ready) return
    const root = document.querySelector(surface === 'clips' ? '.clips-workspace' : '.effect-page')
    if (!root) return
    const browser = browserIdentity()
    const origin: ClipOriginInfo = surface === 'effect_page' ? { origin: 'effect_page', evidence: 'current_surface' } : readClipEntryOrigin()
    const surfaceKey = surface === 'clips' ? 'catalog' : effect ?? 'unknown'
    let storage: Storage | null = null
    try { storage = localStorage } catch { /* optional */ }
    const visible = () => {
      const box = root.getBoundingClientRect()
      return document.visibilityState === 'visible' && box.bottom > 0 && box.top < window.innerHeight
    }
    const send = (kind: keyof typeof CLIP_MEASUREMENT_EVENTS, action?: string, chosenEffect?: string | null) => {
      const key = ['kineo', CLIP_MEASUREMENT_VERSION, actor || browser.id, surface, surfaceKey, kind].join(':')
      void sendOnce(key, storage, () => trackClosedEvent(CLIP_MEASUREMENT_EVENTS[kind], {
        ...clipMeasurementVersion(), ...clipOriginMetadata(origin),
        clip_catalog_version: CLIP_CATALOG_VERSION,
        surface, effect: surface === 'effect_page' ? effect : chosenEffect || null,
        ...(chosenEffect ? { target_effect: chosenEffect } : {}),
        clip_browser: browser.id, clip_browser_persistent: browser.persistent,
        ...(action ? { action } : {}),
      }, window.location.pathname))
    }
    const impression = () => { if (visible()) send('impression') }
    const gesture = (event: Event) => {
      if (!visible() || !event.isTrusted || !(event.target instanceof Element)) return
      const target = event.target.closest('[data-clip-action]')
      if (!target || !root.contains(target)) return
      const action = target.getAttribute('data-clip-action')
      if (!action || !['select_effect', 'generate', 'use_effect', 'select_related', 'upload', 'view_all', 'preview'].includes(action)) return
      const rawEffect = target.getAttribute('data-clip-effect')
      const chosenEffect = rawEffect && /^[a-z0-9_]{1,40}$/.test(rawEffect) ? rawEffect : null
      impression()
      send('gesture', action, chosenEffect)
    }
    const observer = new IntersectionObserver(impression)
    observer.observe(root)
    impression()
    document.addEventListener('visibilitychange', impression)
    root.addEventListener('click', gesture, true)
    root.addEventListener('change', gesture, true)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', impression)
      root.removeEventListener('click', gesture, true)
      root.removeEventListener('change', gesture, true)
    }
  }, [actor, surface, effect, ready])
  return null
}
