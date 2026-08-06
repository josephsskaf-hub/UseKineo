'use client'

// Push #063 — Checkout success page.
// Push #123 — auto-redirect to /generate after 5 seconds.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { getViralNowTopics, type ViralTopic } from '@/lib/viralTopics'

// KINEO-FIRST-WIN-2026-08-02 — the 5th buyer ever (01/08) paid straight from
// TAAFT, was auto-redirected here into an EMPTY /generate, wandered between
// generate/pricing/autopilot for 20 minutes and left without ever generating a
// video. This page was a dead end for a buyer with no prompt in hand. Fix: the
// moment someone pays, hand them their first win — 3 trending topics, one
// click, video starts by itself via the existing create_intent=fast autostart
// rail. Topics come from the deterministic in-bundle pool (no fetch, no
// failure mode — the "demo never dies" principle applied at birth).

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(15)
  const [topics, setTopics] = useState<ViralTopic[]>([])
  // KINEO-TRIAL-ABUSE-PMP-2026-08-07 - PRIMEIRO MINUTO PAGO. Esta tela dizia
  // "Your plan is being activated" e, logo abaixo, "If your credits do not
  // appear immediately, refresh in a few seconds" - duas frases que sao a
  // confissao de um limbo: a pagina NUNCA perguntava ao servidor se o webhook
  // ja tinha creditado, entao delegava ao comprador a tarefa de apertar F5 no
  // minuto mais caro da relacao com ele. Agora ela pergunta: /api/credits em
  // ~20s de poll, e a copy passa a afirmar o que foi LIDO.
  const [credits, setCredits] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    // Computed after mount so the time-seeded shuffle can never cause a
    // hydration mismatch.
    try {
      setTopics(getViralNowTopics().slice(0, 3))
    } catch {
      // silent — the plain Generate CTA below remains
    }
  }, [])

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const sessionId = sp.get('session_id') || ''
    const purchaseCurrency = (sp.get('currency') ?? 'usd').toUpperCase()
    const purchaseAmountTotal = Number(sp.get('amount') ?? 490)
    const purchaseValue = purchaseAmountTotal / 100

    // KINEO-PAYMENT-EVENT-2026-07-15 — `payment_success` is now written once
    // by the verified Stripe webhook. This client event only measures whether
    // the buyer actually saw the success page, so refreshes cannot inflate
    // canonical payment counts.
    void trackEvent('checkout_success_viewed', {
      stripe_session_id: sessionId,
      amount_total: purchaseAmountTotal,
      currency: purchaseCurrency.toLowerCase(),
    })

    // #376 — read Stripe checkout_session_id from the URL and use it as the
    // transaction_id so Google Ads + TikTok DEDUPLICATE the purchase if the
    // user refreshes the success page (same session_id = same conversion).
    // Google Ads purchase conversion — fires once per checkout session.
    // currency and amount come from the Stripe checkout route via URL params
    // so the value is always correct (USD for international, BRL for Brazil).
    // transaction_id (Stripe session id) makes Google dedup refreshes.
    try {
      const gtag = (window as unknown as { gtag?: Function }).gtag
      if (typeof gtag === 'function') {
        gtag('event', 'conversion', {
          send_to: 'AW-18156258081/NL4bCKXEwa4cEKGGytFD',
          value: purchaseValue,
          currency: purchaseCurrency,
          transaction_id: sessionId,
        })
      }
    } catch {
      // silent — never break the page
    }

    // #375/#376 — TikTok Pixel: Purchase conversion. event_id = Stripe session id
    // so TikTok dedups refreshes (and matches server events if added later).
    try {
      const ttq = (window as Window & { ttq?: { track: Function } }).ttq
      if (ttq && typeof ttq.track === 'function') {
        ttq.track('Purchase', {
          value: purchaseValue,
          currency: purchaseCurrency,
          content_type: 'product',
          content_name: 'Kineo subscription',
        }, { event_id: sessionId })
      }
    } catch {
      // silent — never break the page
    }
  }, [])

  // Poll do saldo. Agressivo no comeco (o caso comum e o webhook ja ter
  // rodado antes do redirect) e ralo depois; ~20s no total. Nunca afirma um
  // DELTA ("+120 creditos"): o baseline pre-compra nao existe neste cliente,
  // entao a unica frase honesta e o saldo ATUAL, que sobe sozinho se o
  // webhook chegar atrasado. Falha em silencio - o CTA manual continua ali.
  useEffect(() => {
    let cancelled = false
    const delays = [0, 2_000, 5_000, 10_000, 20_000]
    const timers = delays.map((delay, i) =>
      setTimeout(async () => {
        try {
          const res = await fetch('/api/credits', { cache: 'no-store' })
          if (!res.ok || cancelled) return
          const data = (await res.json()) as { credits?: unknown }
          if (!cancelled && typeof data.credits === 'number') setCredits(data.credits)
        } catch {
          /* rede instavel - a proxima tentativa cobre */
        } finally {
          if (i === delays.length - 1 && !cancelled) setSyncing(false)
        }
      }, delay),
    )
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/generate')
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, router])

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'rgba(11,17,32,0.85)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          padding: 'clamp(24px, 5vw, 36px)',
          boxShadow: '0 16px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(20,184,166,0.08) inset',
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            margin: '0 auto 14px',
            background: 'linear-gradient(135deg, rgba(41,151,255,.25), rgba(41,151,255,.10))',
            border: '1px solid rgba(41,151,255,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: '#2997ff',
            fontWeight: 900,
          }}
        >
          ✓
        </div>
        <h1
          style={{
            fontSize: 'clamp(1.6rem, 5vw, 2rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Welcome to Kineo.
        </h1>
        <p
          style={{
            marginTop: 10,
            fontSize: '1rem',
            color: 'var(--muted2)',
            lineHeight: 1.55,
          }}
        >
          {credits === null ? 'Your plan is being activated.' : 'Your plan is active.'}
        </p>
        <p
          style={{
            marginTop: 8,
            fontSize: '0.85rem',
            color: credits === null ? 'var(--muted)' : '#34d399',
            fontWeight: credits === null ? 400 : 700,
            lineHeight: 1.55,
          }}
        >
          {credits !== null
            ? `${credits.toLocaleString('en-US')} credits available${syncing ? ' · syncing' : ''}`
            : syncing
              ? 'Checking your balance…'
              : 'If your credits do not appear immediately, refresh in a few seconds.'}
        </p>
        <p
          style={{
            marginTop: 14,
            fontSize: '0.9rem',
            color: '#2997ff',
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          Redirecting to the app in {countdown}…
        </p>

        {topics.length > 0 && (
          <div style={{ marginTop: 22, textAlign: 'left' }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Your first video, one click — trending right now
            </p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topics.map((t) => (
                <Link
                  key={t.id}
                  href={`/generate?create_intent=fast&prompt=${encodeURIComponent(t.prompt)}&utm_source=checkout_success&utm_medium=first_win`}
                  onClick={() => {
                    void trackEvent('checkout_success_topic_clicked', {
                      topic_id: t.id,
                      vertical: t.vertical,
                      badge: t.badge,
                    })
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textDecoration: 'none',
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'rgba(41,151,255,.08)',
                    border: '1px solid rgba(41,151,255,.35)',
                    color: 'var(--text)',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>{t.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                      {t.title}
                    </span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: '0.75rem', color: 'var(--muted2)' }}>
                      {t.badge} · starts automatically
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ color: '#2997ff', fontWeight: 900 }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <Link
            href="/generate"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              padding: '14px 22px',
              borderRadius: 14,
              fontSize: '0.95rem',
              fontWeight: 900,
              color: '#fff',
              background: 'linear-gradient(135deg, #2997ff 0%, #2997ff 55%, #2997ff 100%)',
              boxShadow: '0 10px 32px rgba(41,151,255,.45)',
              letterSpacing: '-0.01em',
            }}
          >
            Go to Generate Video
          </Link>
          <Link
            href="/my-videos"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              padding: '12px 22px',
              borderRadius: 14,
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--muted2)',
              background: 'rgba(255,255,255,.03)',
              border: '1px solid var(--border)',
            }}
          >
            View My Videos
          </Link>
        </div>
      </div>
    </main>
  )
}
