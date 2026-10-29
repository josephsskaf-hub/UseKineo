'use client'

import Link from 'next/link'
import { UiLabel } from '@/components/InterfaceLanguage'
import Kling4PaidNotice, { useKling4PaidAvailability } from '@/components/Kling4PaidNotice'
import { kling4PaidCredits } from '@/lib/kling4PaidPricing'
import { KLING4_PAID_COPY } from '@/lib/kling4PaidPresentation'
import { buildEngineLandingSignupHref } from '@/lib/growth/engineLandingIntent'

/** No sample is labelled Kling 4 until a real Kling 4 sample has been approved. */
export default function Kling4PaidEnginePage() {
  const a = useKling4PaidAvailability()
  const href = buildEngineLandingSignupHref({ engine: 'hollywood', campaign: 'seo_engine_kling4' })
  return <main style={{ maxWidth: 900, margin: '0 auto', padding: '64px 22px 80px', color: 'var(--text)', overflowWrap: 'anywhere' }}>
    <p style={{ color: 'var(--muted)', fontSize: 13 }}>Kineo · Kling 4.0</p>
    <h1 style={{ fontSize: 'clamp(38px, 7vw, 68px)', lineHeight: 1.05, letterSpacing: '-.04em', margin: '18px 0' }}><UiLabel>{KLING4_PAID_COPY.try}</UiLabel></h1>
    <p style={{ maxWidth: 660, fontSize: 20, lineHeight: 1.5, color: 'var(--muted2)' }}><UiLabel>{KLING4_PAID_COPY.directed}</UiLabel></p>
    <Kling4PaidNotice surface="engine" availability={a} />
    {a?.paidLive ? <p style={{ fontSize: 13 }}><UiLabel>{KLING4_PAID_COPY.limits}</UiLabel></p> : null}
    {a?.paidLive ? <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '24px 0' }}>
        <Link href={href} style={{ background: 'var(--accent, #0A5CFF)', color: '#fff', borderRadius: 12, padding: '14px 22px', fontWeight: 700, textDecoration: 'none' }}><UiLabel>{KLING4_PAID_COPY.try}</UiLabel></Link>
        <Link href="/pricing" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '14px 22px', color: 'inherit' }}><UiLabel>See plans</UiLabel></Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 28 }}>
        {[15, 30, 60].map(seconds => <article key={seconds} style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 16, background: 'var(--card)' }}>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>{seconds} s</div>
          <b style={{ display: 'block', fontSize: 28, marginTop: 8 }}>{kling4PaidCredits(seconds)} cr</b>
        </article>)}
      </div>
    </> : <p role="status" style={{ margin: '24px 0', padding: 18, border: '1px solid var(--border)', borderRadius: 14 }}><UiLabel>{KLING4_PAID_COPY.paused}</UiLabel> <Link href="/studio?engine=hollywood">Studio →</Link></p>}
    <p style={{ marginTop: 32 }}><Link href="/ai-video-generator/seedance">Seedance 1.5</Link> · <Link href="/ai-video-generator/kling-3">Kling 3</Link></p>
  </main>
}
