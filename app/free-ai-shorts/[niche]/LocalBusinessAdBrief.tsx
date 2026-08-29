'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toolActivationHref } from '@/lib/toolActivationHref'
import {
  buildLocalBusinessAdBrief,
  limitLocalBusinessField,
  localBusinessBriefIsComplete,
  measureLocalBusinessAdScript,
  type LocalBusinessAdBriefInput,
} from '@/lib/growth/localBusinessAdBrief'

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

const FIELD_STYLE = {
  width: '100%',
  boxSizing: 'border-box' as const,
  background: '#070708',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,.14)',
  borderRadius: 11,
  padding: '11px 12px',
  font: 'inherit',
  outline: 'none',
}

export default function LocalBusinessAdBrief() {
  const [input, setInput] = useState<LocalBusinessAdBriefInput>(EMPTY)
  const [script, setScript] = useState('')
  const complete = localBusinessBriefIsComplete(input)
  const measurement = measureLocalBusinessAdScript(script)
  const continueHref = script
    ? toolActivationHref({
        prompt: script,
        campaign: 'growth_local_business_brief_20260828',
        autoanalyze: true,
        scriptMode: 'verbatim',
        duration: 35,
      })
    : ''

  function update(field: keyof LocalBusinessAdBriefInput, value: string) {
    setInput((current) => ({ ...current, [field]: limitLocalBusinessField(field, value) }))
    setScript('')
  }

  function generate() {
    const result = buildLocalBusinessAdBrief(input)
    setScript(result.script)
  }

  function loadSample() {
    setInput(SAMPLE)
    setScript(buildLocalBusinessAdBrief(SAMPLE).script)
  }

  return (
    <section
      id="business-ad-builder"
      style={{
        marginTop: 28,
        padding: 20,
        borderRadius: 18,
        background: 'linear-gradient(145deg,rgba(41,151,255,.11),rgba(11,17,32,.9))',
        border: '1px solid rgba(41,151,255,.3)',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 540 }}>
          <div style={{ color: '#7cc0ff', fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Free business ad brief · no signup
          </div>
          <h2 style={{ margin: '7px 0 5px', fontSize: '1.35rem', fontWeight: 900 }}>
            Turn your real offer into the first script
          </h2>
          <p style={{ margin: 0, color: '#a1a1a8', lineHeight: 1.55, fontSize: '.9rem' }}>
            Use only facts you can stand behind. The draft is created in this browser, stays editable, and nothing is generated or charged until you choose to continue.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSample}
          style={{ background: 'transparent', color: '#7cc0ff', border: '1px solid rgba(124,192,255,.35)', borderRadius: 999, padding: '8px 12px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
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
        style={{ width: '100%', marginTop: 14, background: complete ? '#2997ff' : '#222226', color: complete ? '#050506' : '#6f6f76', border: 0, borderRadius: 12, padding: '13px 16px', fontWeight: 900, cursor: complete ? 'pointer' : 'not-allowed' }}
      >
        Build my editable script →
      </button>

      {script ? (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <label htmlFor="local-business-script" style={{ fontWeight: 900 }}>Your 35-second draft</label>
            <span style={{ color: '#86868b', fontSize: '.78rem' }}>
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
          <p style={{ margin: '8px 0 12px', color: '#86868b', fontSize: '.78rem', lineHeight: 1.45 }}>
            Review every claim. Kineo carries this exact draft into the editor in verbatim mode; you still approve the setup before any video starts.
          </p>
          <Link
            href={continueHref}
            style={{ display: 'block', textAlign: 'center', background: '#34d399', color: '#03110c', borderRadius: 12, padding: '13px 16px', fontWeight: 900, textDecoration: 'none' }}
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
        <b style={{ color: '#f5f5f7' }}>{label}</b>
        <span style={{ color: '#707078' }}>{hint}</span>
      </span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={FIELD_STYLE} />
    </label>
  )
}
