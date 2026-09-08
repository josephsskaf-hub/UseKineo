'use client'

// KINEO-PH-2026-09-10 — sinal de impressão da página de pouso do Product Hunt.
// Só telemetria: a página é estática; o evento carrega utm para o placar por
// pessoa (visitantes → cadastros → $1) do dia do lançamento.
//
// KINEO-ADS-2026-09-09 — a mesma página recebe tráfego pago (Reddit). A página
// é estática, então o CTA nasce com intent_campaign=ph_sep10; aqui, no cliente,
// quando a URL traz utm_campaign, o CTA passa a carregar ESSA campanha — assim
// checkout_started/payment_success separam Reddit de Product Hunt sem uma
// segunda página. O utm de primeiro toque (sfa_utms) já vai para o cadastro.
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

const CAMPAIGN_OK = /^[A-Za-z0-9._~-]{1,60}$/

export default function PhLandingBeacon() {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    let utm: Record<string, string | null> = {}
    try {
      const q = new URLSearchParams(window.location.search)
      utm = { utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'), ref: q.get('ref') }
      const campaign = (q.get('utm_campaign') ?? '').trim()
      if (CAMPAIGN_OK.test(campaign)) {
        document.querySelectorAll<HTMLAnchorElement>('a[data-testid^="ph-cta-trial"]').forEach((a) => {
          try {
            const u = new URL(a.getAttribute('href') ?? '', window.location.origin)
            u.searchParams.set('intent_campaign', campaign)
            a.setAttribute('href', `${u.pathname}${u.search}`)
          } catch { /* href estranho: deixa como está */ }
        })
      }
    } catch { /* ignore */ }
    void trackEvent('ph_landing_shown', { version: 'ph_sep10_v1', ...utm })
  }, [])
  return null
}
