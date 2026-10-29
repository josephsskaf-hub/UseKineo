'use client'

import { useEffect, useState } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'
import { KLING4_TRIAL_LIVE } from '@/lib/kling4TrialPolicy'
import { KLING4_TRIAL_NOTICE_COPY, KLING4_TRIAL_NOTICE_REFRESH_MS, kling4TrialNoticeVisible } from '@/lib/kling4TrialNotice'

/** Shared by home, auth (including its modal) and pricing. Never show an unverified or stale engine claim. */
export default function Kling4TrialNotice({ surface }: { surface: 'home' | 'signup' | 'login' | 'pricing' }) {
  const [state, setState] = useState<unknown>(null)
  useEffect(() => {
    if (!KLING4_TRIAL_LIVE) return
    let disposed = false, generation = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let request: AbortController | null = null
    const hide = () => {
      generation++
      clearTimeout(timer)
      request?.abort()
      request = null
      if (!disposed) setState(null)
    }
    const refresh = async () => {
      hide()
      if (disposed || document.visibilityState === 'hidden') return
      const version = generation
      const controller = new AbortController()
      request = controller
      const timeout = setTimeout(() => controller.abort(), 5_000)
      try {
        const response = await fetch('/api/kling4-trial/availability', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
        if (!response.ok) throw new Error('availability_unavailable')
        const next: unknown = await response.json()
        if (disposed || version !== generation) return
        const visible = kling4TrialNoticeVisible(next, Date.now())
        setState(visible ? next : null)
        const delay = visible
          ? Math.max(1, Date.parse((next as { validUntil: string }).validUntil) - Date.now())
          : KLING4_TRIAL_NOTICE_REFRESH_MS
        timer = setTimeout(() => { void refresh() }, delay)
      } catch {
        if (!disposed && version === generation) {
          setState(null)
          timer = setTimeout(() => { void refresh() }, KLING4_TRIAL_NOTICE_REFRESH_MS)
        }
      } finally {
        clearTimeout(timeout)
        if (request === controller) request = null
      }
    }
    const visibility = () => { if (document.visibilityState === 'hidden') hide(); else void refresh() }
    const focus = () => { void refresh() }
    window.addEventListener('focus', focus)
    window.addEventListener('blur', hide)
    document.addEventListener('visibilitychange', visibility)
    void refresh()
    return () => {
      disposed = true
      hide()
      window.removeEventListener('focus', focus)
      window.removeEventListener('blur', hide)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  if (!kling4TrialNoticeVisible(state, Date.now())) return null
  return (
    <aside data-kling4-trial-notice={surface} style={{
      display: 'flex', width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box', alignItems: 'center', gap: 8,
      padding: '8px 12px', border: '1px solid var(--line, var(--border2, var(--border)))', borderRadius: 12,
      background: 'var(--card2)', color: 'var(--txt, var(--text))', fontSize: 13, fontWeight: 600,
      lineHeight: 1.5, overflowWrap: 'anywhere', margin: surface === 'pricing' ? '16px auto 0' : surface === 'home' ? '0 0 16px' : '0 0 20px',
    }}>
      <span aria-hidden="true" style={{ flex: '0 0 6px', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent, #0A5CFF)' }} />
      <UiLabel>{KLING4_TRIAL_NOTICE_COPY}</UiLabel>
    </aside>
  )
}
