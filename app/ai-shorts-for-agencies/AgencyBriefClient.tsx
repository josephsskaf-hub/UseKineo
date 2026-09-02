'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  B2B_FIT_REVIEW_CAMPAIGN,
  B2B_BRIEF_EVENT_VERSION,
  B2B_BRIEF_SURFACE,
  B2B_LEAD_INTENT,
  B2B_VOLUME_OPTIONS,
  readB2BFitReviewAttribution,
  type B2BVolumeId,
} from '@/lib/growth/b2bLead'

const VIEW_MARKER = 'kineo:b2b-brief:viewed:v1'

export default function AgencyBriefClient() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [email, setEmail] = useState('')
  const [volume, setVolume] = useState<B2BVolumeId>('20_49')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return
        observer.disconnect()
        const attribution = readB2BFitReviewAttribution(window.location.search)
        const marker = attribution
          ? `${VIEW_MARKER}:${B2B_FIT_REVIEW_CAMPAIGN}`
          : VIEW_MARKER
        try {
          if (sessionStorage.getItem(marker) === '1') return
          sessionStorage.setItem(marker, '1')
        } catch {
          // Storage may be unavailable in privacy mode. The form still works.
        }
        void trackEvent('b2b_brief_viewed', {
          version: B2B_BRIEF_EVENT_VERSION,
          surface: B2B_BRIEF_SURFACE,
          ...(attribution ?? {}),
        })
      },
      { threshold: [0.5] },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    try {
      const response = await fetch('/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, volume, website, intent: B2B_LEAD_INTENT }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result?.saved !== true) throw new Error('capture failed')
      setStatus('sent')
      const attribution = readB2BFitReviewAttribution(window.location.search)
      void trackEvent('b2b_brief_submitted', {
        version: B2B_BRIEF_EVENT_VERSION,
        surface: B2B_BRIEF_SURFACE,
        monthly_volume: volume,
        ...(attribution ?? {}),
      })
    } catch {
      setStatus('error')
      const attribution = readB2BFitReviewAttribution(window.location.search)
      void trackEvent('b2b_brief_failed', {
        version: B2B_BRIEF_EVENT_VERSION,
        surface: B2B_BRIEF_SURFACE,
        monthly_volume: volume,
        ...(attribution ?? {}),
      })
    }
  }

  const fieldStyle = {
    width: '100%',
    minHeight: 50,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.16)',
    background: '#090a0d',
    color: '#f5f5f7',
    padding: '0 14px',
    fontSize: 15,
    fontWeight: 720,
  } as const

  return (
    <section
      ref={sectionRef}
      aria-labelledby="agency-brief-heading"
      style={{
        marginTop: 64,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))',
        gap: 24,
        alignItems: 'center',
        padding: 'clamp(22px, 4vw, 32px)',
        borderRadius: 24,
        border: '1px solid rgba(167,139,250,.35)',
        background: 'radial-gradient(circle at 0% 0%, rgba(167,139,250,.18), transparent 42%), #101116',
      }}
    >
      <div>
        <span style={{ color: '#c4b5fd', fontWeight: 900, fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase' }}>
          More than a one-time pack?
        </span>
        <h2 id="agency-brief-heading" style={{ color: '#f5f5f7', fontSize: 'clamp(1.65rem, 4vw, 2.35rem)', lineHeight: 1.08, margin: '10px 0 10px', fontWeight: 920 }}>
          Tell us the monthly volume before you buy
        </h2>
        <p style={{ color: '#aaaab1', fontSize: 15, lineHeight: 1.65, margin: 0 }}>
          If you are planning recurring client or company content, send the number you actually need. We will review whether today&apos;s Kineo workflow fits before recommending anything.
        </p>
        <ul style={{ margin: '15px 0 0', paddingLeft: 20, color: '#929299', fontSize: 13, lineHeight: 1.7 }}>
          <li>No invented enterprise features.</li>
          <li>No automatic sales sequence or mailing list.</li>
          <li>The self-service packs above remain available immediately.</li>
        </ul>
      </div>

      {status === 'sent' ? (
        <div role="status" style={{ padding: 22, borderRadius: 18, background: 'rgba(52,211,153,.09)', border: '1px solid rgba(52,211,153,.35)' }}>
          <strong style={{ display: 'block', color: '#34d399', fontSize: 18 }}>Request recorded.</strong>
          <p style={{ color: '#b8b8bf', fontSize: 14, lineHeight: 1.6, margin: '8px 0 0' }}>
            We will review product fit before recommending a pack or plan.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 13 }}>
          <label style={{ display: 'grid', gap: 7, color: '#d2d2d7', fontSize: 12, fontWeight: 820 }}>
            Monthly Short volume
            <select value={volume} onChange={(event) => setVolume(event.target.value as B2BVolumeId)} style={fieldStyle}>
              {B2B_VOLUME_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 7, color: '#d2d2d7', fontSize: 12, fontWeight: 820 }}>
            Work email
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={200}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              style={fieldStyle}
            />
          </label>
          <label aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </label>
          <button
            type="submit"
            disabled={status === 'sending'}
            style={{ minHeight: 50, border: 0, borderRadius: 13, background: '#a78bfa', color: '#100a20', cursor: status === 'sending' ? 'wait' : 'pointer', fontSize: 14, fontWeight: 920, opacity: status === 'sending' ? 0.72 : 1 }}
          >
            {status === 'sending' ? 'Recording request…' : 'Send my monthly volume →'}
          </button>
          <p style={{ color: '#7f7f87', fontSize: 11.5, lineHeight: 1.5, margin: 0 }}>
            By sending, you agree that Kineo may contact you about this request. Your email is not added to the viral-ideas mailing list.
          </p>
          {status === 'error' ? (
            <p role="alert" style={{ color: '#fca5a5', fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
              We could not record this request. Please try again.
            </p>
          ) : null}
        </form>
      )}
    </section>
  )
}
