'use client'

// KINEO-PH-2026-09-10 — sinal de impressão da página de pouso do Product Hunt.
// Só telemetria: a página é estática; o evento carrega utm para o placar por
// pessoa (visitantes → cadastros → $1) do dia do lançamento.
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

export default function PhLandingBeacon() {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    let utm: Record<string, string | null> = {}
    try {
      const q = new URLSearchParams(window.location.search)
      utm = { utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'), ref: q.get('ref') }
    } catch { /* ignore */ }
    void trackEvent('ph_landing_shown', { version: 'ph_sep10_v1', ...utm })
  }, [])
  return null
}
