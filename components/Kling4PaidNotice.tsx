'use client'

import { useEffect, useState } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'
import { KLING4_PAID_COPY, kling4PromoVisible, validKling4PaidAvailability, type Kling4PaidAvailability } from '@/lib/kling4PaidPresentation'

export function useKling4PaidAvailability(enabled = true): Kling4PaidAvailability | null {
  const [state, setState] = useState<Kling4PaidAvailability | null>(null)
  useEffect(() => {
    if (!enabled) return
    let disposed = false, version = 0
    let timer: ReturnType<typeof setTimeout> | undefined, request: AbortController | undefined
    const hide = () => { version++; clearTimeout(timer); request?.abort(); if (!disposed) setState(null) }
    const refresh = async () => {
      hide()
      if (disposed || document.visibilityState === 'hidden') return
      const current = version, controller = new AbortController()
      request = controller
      const timeout = setTimeout(() => controller.abort(), 5_000)
      try {
        const response = await fetch('/api/kling4-paid/availability', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
        const next: unknown = response.ok ? await response.json() : null
        if (disposed || current !== version) return
        const valid = validKling4PaidAvailability(next)
        setState(valid ? next : null)
        timer = setTimeout(() => { void refresh() }, valid ? Math.max(1, Date.parse(next.validUntil) - Date.now()) : 15_000)
      } catch {
        if (!disposed && current === version) { setState(null); timer = setTimeout(() => { void refresh() }, 15_000) }
      } finally { clearTimeout(timeout) }
    }
    const visibility = () => { if (document.visibilityState === 'hidden') hide(); else void refresh() }
    const focus = () => { void refresh() }
    window.addEventListener('focus', focus); window.addEventListener('blur', hide)
    document.addEventListener('visibilitychange', visibility)
    void refresh()
    return () => { disposed = true; hide(); window.removeEventListener('focus', focus); window.removeEventListener('blur', hide); document.removeEventListener('visibilitychange', visibility) }
  }, [enabled])
  return validKling4PaidAvailability(state) ? state : null
}

/** Copy disappears on switch-off, expiry, stale state or a failed availability read. */
export default function Kling4PaidNotice({ surface, availability }: {
  surface: 'studio' | 'generate' | 'ads' | 'pricing' | 'engine'
  availability?: Kling4PaidAvailability | null
}) {
  const fetched = useKling4PaidAvailability(availability === undefined)
  const a = availability === undefined ? fetched : availability
  const visible = kling4PromoVisible(a)
  const limited = validKling4PaidAvailability(a) && a.paidLive && a.promoLive &&
    ['global_cap', 'daily_cap', 'user_cap', 'cap', 'daily_limit', 'budget_exhausted'].includes(a.reason) && (!a.expiresAt || Date.parse(a.expiresAt) > Date.now())
  if (!visible && !limited) return null
  return <aside data-kling4-paid-notice={surface} style={{ margin: '14px 0', padding: '14px 16px', border: '1px solid var(--line, var(--border))', borderRadius: 14, background: 'var(--card2, #f5f7fb)', color: 'var(--txt, var(--text))', fontSize: 12, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
    {limited ? <p role="status" style={{ margin: 0, fontWeight: 600 }}><UiLabel>{KLING4_PAID_COPY.dailyCap}</UiLabel></p> : <>
      <strong style={{ display: 'block', fontSize: 14 }}><UiLabel>{KLING4_PAID_COPY.offer}</UiLabel></strong>
      <p style={{ margin: '5px 0' }}><UiLabel>{KLING4_PAID_COPY.terms}</UiLabel></p>
      <p style={{ margin: '5px 0' }}><UiLabel>{KLING4_PAID_COPY.dates}</UiLabel></p>
      <p style={{ margin: '5px 0 0', color: 'var(--muted2, var(--muted))' }}><UiLabel>{KLING4_PAID_COPY.cap}</UiLabel></p>
    </>}
  </aside>
}
