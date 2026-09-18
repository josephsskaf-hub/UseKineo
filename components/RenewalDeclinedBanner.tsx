'use client'

// KINEO-AVISO-RENOVACAO-RECUSADA-2026-09-18 — ver o cabeçalho de
// lib/billing/renewalNotice.ts (a decisão) e o layout do dashboard (o host).
// Só consulta a Stripe (via /api/me/subscription) quando o perfil tem
// assinatura Stripe — visitante e trial nunca pagam essa chamada. O status
// vivo é lido a cada montagem do layout; assinante em dia não vê nada.

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { decideRenewalNotice, renewalNoticeCopy, renewalNoticePlanLabel, RENEWAL_NOTICE_VERSION } from '@/lib/billing/renewalNotice'

export default function RenewalDeclinedBanner({ hasStripeSubscription, plan }: { hasStripeSubscription: boolean; plan: string | null }) {
  const [status, setStatus] = useState<string | null>(null)
  const [portal, setPortal] = useState<'idle' | 'busy' | 'error'>('idle')
  const shownRef = useRef(false)

  useEffect(() => {
    if (!hasStripeSubscription) return
    let cancelled = false
    void fetch('/api/me/subscription', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { status?: string | null } | null) => { if (!cancelled && j && typeof j.status === 'string') setStatus(j.status) })
      .catch(() => { /* sem status, sem aviso — nunca derruba o painel */ })
    return () => { cancelled = true }
  }, [hasStripeSubscription])

  const decision = decideRenewalNotice({ hasStripeSubscription, status })
  const planLabel = renewalNoticePlanLabel(plan)

  useEffect(() => {
    if (!decision.visible || shownRef.current) return
    shownRef.current = true
    void trackEvent('renewal_declined_banner_shown', { version: RENEWAL_NOTICE_VERSION, status, plan })
  }, [decision.visible, status, plan])

  if (!decision.visible) return null
  const copy = renewalNoticeCopy(planLabel)

  async function openPortal() {
    if (portal === 'busy') return
    setPortal('busy')
    void trackEvent('renewal_declined_banner_clicked', { version: RENEWAL_NOTICE_VERSION, status, plan })
    try {
      const r = await fetch('/api/stripe/portal', { method: 'POST', credentials: 'same-origin' })
      const j = await r.json().catch(() => null) as { url?: string } | null
      if (!r.ok || !j?.url) throw new Error(String(r.status))
      window.location.assign(j.url)
    } catch {
      setPortal('error')
    }
  }

  return (
    <div
      data-renewal-declined={RENEWAL_NOTICE_VERSION}
      role="status"
      style={{
        margin: '12px 16px 0',
        padding: '12px 16px',
        borderRadius: 12,
        background: 'rgba(251,191,36,.10)',
        border: '1px solid rgba(251,191,36,.55)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 240 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{copy.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>{copy.body}</div>
        {portal === 'error' && (
          <div role="alert" style={{ fontSize: 12, color: '#ff6b6b', marginTop: 4 }}>
            Couldn&apos;t open billing right now. Try again, or open Account → Manage billing.
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={openPortal}
        disabled={portal === 'busy'}
        style={{
          background: '#fbbf24',
          color: '#1c1917',
          border: 'none',
          borderRadius: 10,
          padding: '10px 16px',
          fontSize: 13.5,
          fontWeight: 800,
          cursor: portal === 'busy' ? 'wait' : 'pointer',
          opacity: portal === 'busy' ? 0.7 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {portal === 'busy' ? 'Opening…' : copy.cta}
      </button>
    </div>
  )
}
