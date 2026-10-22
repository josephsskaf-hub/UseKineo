'use client'

// KINEO-PAGINAS-IA-CLARAS-2110 — cores em var(--kpl-*, <cor de antes>): claras só dentro de <main className="kpl"> (as páginas de entrada do ChatGPT); nas outras páginas, a cor de antes.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { toolActivationHref } from '@/lib/toolActivationHref'
import {
  buildLocalBusinessAdBrief,
  limitLocalBusinessField,
  localBusinessBriefIsComplete,
  measureLocalBusinessAdScript,
  type LocalBusinessAdBriefInput,
} from '@/lib/growth/localBusinessAdBrief'
import {
  LOCAL_BUSINESS_BRIEF_CAMPAIGN,
  LOCAL_BUSINESS_BRIEF_METADATA,
  LOCAL_BUSINESS_BRIEF_VIEW_MARKER,
  LOCAL_BUSINESS_BRIEF_VISIBLE_RATIO,
  localBusinessBriefDraftMetadata,
  type LocalBusinessBriefDraftSource,
} from '@/lib/growth/localBusinessBriefObservability'

const EMPTY: LocalBusinessAdBriefInput = {
  businessName: '',
  service: '',
  audience: '',
  proof: '',
  callToAction: '',
}

const SAMPLE: LocalBusinessAdBriefInput = {
  businessName: 'North Star Roofing',
  service: 'same-day roof leak inspections',
  audience: 'homeowners in Austin',
  proof: 'licensed team and written quote before work',
  callToAction: 'Book your inspection at northstarroofing.com',
}

const pendingViews = new Set<string>()

const FIELD_STYLE = {
  width: '100%',
  boxSizing: 'border-box' as const,
  background: 'var(--kpl-card, #070708)',
  color: 'var(--kpl-text, #f5f5f7)',
  border: '1px solid var(--kpl-hair, rgba(255,255,255,.14))',
  borderRadius: 11,
  padding: '11px 12px',
  font: 'inherit',
  outline: 'none',
}

export default function LocalBusinessAdBrief() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [input, setInput] = useState<LocalBusinessAdBriefInput>(EMPTY)
  const [script, setScript] = useState('')
  const [draftSource, setDraftSource] = useState<LocalBusinessBriefDraftSource>('manual')
  const complete = localBusinessBriefIsComplete(input)
  const measurement = measureLocalBusinessAdScript(script)
  const continueHref = script
    ? toolActivationHref({
        prompt: script,
        campaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN,
        intentCampaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN,
        autoanalyze: true,
        scriptMode: 'verbatim',
        duration: 35,
      })
    : ''

  useEffect(() => {
    const target = sectionRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return

    try {
      if (
        sessionStorage.getItem(LOCAL_BUSINESS_BRIEF_VIEW_MARKER) === '1'
        || pendingViews.has(LOCAL_BUSINESS_BRIEF_VIEW_MARKER)
      ) return
    } catch {
      // Privacy mode may disable storage. The builder must stay fully usable.
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => (
          entry.isIntersecting
          && entry.intersectionRatio >= LOCAL_BUSINESS_BRIEF_VISIBLE_RATIO
        ))) return

        observer.disconnect()
        try {
          if (
            sessionStorage.getItem(LOCAL_BUSINESS_BRIEF_VIEW_MARKER) === '1'
            || pendingViews.has(LOCAL_BUSINESS_BRIEF_VIEW_MARKER)
          ) return
        } catch {
          // Continue failure-isolated when storage is unavailable.
        }

        pendingViews.add(LOCAL_BUSINESS_BRIEF_VIEW_MARKER)
        void trackEvent('local_business_brief_viewed', LOCAL_BUSINESS_BRIEF_METADATA)
          .then((stored) => {
            pendingViews.delete(LOCAL_BUSINESS_BRIEF_VIEW_MARKER)
            if (!stored) return
            try {
              sessionStorage.setItem(LOCAL_BUSINESS_BRIEF_VIEW_MARKER, '1')
            } catch {
              // Analytics storage is optional; the builder is not.
            }
          })
      },
      { threshold: [LOCAL_BUSINESS_BRIEF_VISIBLE_RATIO] },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  function update(field: keyof LocalBusinessAdBriefInput, value: string) {
    setInput((current) => ({ ...current, [field]: limitLocalBusinessField(field, value) }))
    setScript('')
    setDraftSource('manual')
  }

  function generate() {
    const result = buildLocalBusinessAdBrief(input)
    setScript(result.script)
    setDraftSource('manual')
    void trackEvent(
      'local_business_brief_generated',
      localBusinessBriefDraftMetadata('manual'),
    )
  }

  function loadSample() {
    setInput(SAMPLE)
    setScript(buildLocalBusinessAdBrief(SAMPLE).script)
    setDraftSource('sample')
    void trackEvent(
      'local_business_brief_sample_loaded',
      localBusinessBriefDraftMetadata('sample'),
    )
    void trackEvent(
      'local_business_brief_generated',
      localBusinessBriefDraftMetadata('sample'),
    )
  }

  return (
    <section
      ref={sectionRef}
      id="business-ad-builder"
      data-observability-version={LOCAL_BUSINESS_BRIEF_METADATA.version}
      style={{
        marginTop: 28,
        padding: 20,
        borderRadius: 18,
        background: 'linear-gradient(145deg,var(--kpl-accent-soft, rgba(41,151,255,.11)),var(--kpl-card, rgba(11,17,32,.9)))',
        border: '1px solid var(--kpl-accent-line, rgba(41,151,255,.3))',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 540 }}>
          <div style={{ color: 'var(--kpl-accent, #7cc0ff)', fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Free business ad brief · no signup
          </div>
          <h2 style={{ margin: '7px 0 5px', fontSize: '1.35rem', fontWeight: 900 }}>
            Turn your real offer into the first script
          </h2>
          <p style={{ margin: 0, color: 'var(--kpl-muted, #a1a1a8)', lineHeight: 1.55, fontSize: '.9rem' }}>
            Use only facts you can stand behind. The draft is created in this browser, stays editable, and nothing is generated or charged until you choose to continue.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSample}
          style={{ background: 'transparent', color: 'var(--kpl-accent, #7cc0ff)', border: '1px solid rgba(124,192,255,.35)', borderRadius: 999, padding: '8px 12px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Try a roofing example
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 18 }}>
        <Field label="Business name" hint="Up to 4 words" value={input.businessName} placeholder="North Star Roofing" onChange={(value) => update('businessName', value)} />
        <Field label="Service or offer" hint="Up to 6 words" value={input.service} placeholder="same-day roof leak inspections" onChange={(value) => update('service', value)} />
        <Field label="Best customer" hint="Up to 5 words" value={input.audience} placeholder="homeowners in Austin" onChange={(value) => update('audience', value)} />
        <Field label="Why choose you?" hint="Up to 8 words · use a real fact" value={input.proof} placeholder="licensed team and written quote before work" onChange={(value) => update('proof', value)} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Call to action" hint="Up to 7 words" value={input.callToAction} placeholder="Book at northstarroofing.com" onChange={(value) => update('callToAction', value)} />
        </div>
      </div>

      <button
        type="button"
        disabled={!complete}
        onClick={generate}
        style={{ width: '100%', marginTop: 14, background: complete ? 'var(--kpl-accent, #2997ff)' : 'var(--kpl-card, #222226)', color: complete ? 'var(--kpl-card, #050506)' : 'var(--kpl-muted, #6f6f76)', border: 0, borderRadius: 12, padding: '13px 16px', fontWeight: 900, cursor: complete ? 'pointer' : 'not-allowed' }}
      >
        Build my editable script →
      </button>

      {script ? (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--kpl-hair, rgba(255,255,255,.1))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <label htmlFor="local-business-script" style={{ fontWeight: 900 }}>Your 35-second draft</label>
            <span style={{ color: 'var(--kpl-muted, #86868b)', fontSize: '.78rem' }}>
              {measurement.spokenWords} spoken words · about {measurement.estimatedSeconds}s
            </span>
          </div>
          <textarea
            id="local-business-script"
            value={script}
            onChange={(event) => setScript(event.target.value.slice(0, 600))}
            rows={9}
            maxLength={600}
            style={{ ...FIELD_STYLE, marginTop: 9, resize: 'vertical', lineHeight: 1.55 }}
          />
          <p style={{ margin: '8px 0 12px', color: 'var(--kpl-muted, #86868b)', fontSize: '.78rem', lineHeight: 1.45 }}>
            Review every claim. Kineo carries this exact draft into the editor in verbatim mode; you still approve the setup before any video starts.
          </p>
          <Link
            href={continueHref}
            onClick={() => {
              void trackEvent(
                'local_business_brief_activation_clicked',
                localBusinessBriefDraftMetadata(draftSource),
              )
            }}
            style={{ display: 'block', textAlign: 'center', background: 'var(--kpl-ok, #34d399)', color: 'var(--kpl-on-accent, #03110c)', borderRadius: 12, padding: '13px 16px', fontWeight: 900, textDecoration: 'none' }}
          >
            Continue with this exact script →
          </Link>
        </div>
      ) : null}
    </section>
  )
}

function Field({
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  label: string
  hint: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, fontSize: '.78rem' }}>
        <b style={{ color: 'var(--kpl-text, #f5f5f7)' }}>{label}</b>
        <span style={{ color: 'var(--kpl-muted, #707078)' }}>{hint}</span>
      </span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={FIELD_STYLE} />
    </label>
  )
}
