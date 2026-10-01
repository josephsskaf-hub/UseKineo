'use client'
import { useEffect, useState } from 'react'
import { MRR_REACTIVATION_ENABLED, MRR_REACTIVATION_VERSION } from '@/lib/growth/mrrReactivation'
import { useMrrVisible } from '@/lib/growth/useMrrVisible'

/** Measures arrival at the private library, never email opening or video playback. */
export default function MrrReactivationReturn() {
  const [arrived, setArrived] = useState(false)
  const enabled = MRR_REACTIVATION_ENABLED && arrived
  const { root, gesture } = useMrrVisible('mrr_ready_film_return', MRR_REACTIVATION_VERSION, enabled)
  useEffect(() => { setArrived(new URLSearchParams(window.location.search).get('utm_campaign') === MRR_REACTIVATION_VERSION) }, [])
  if (!enabled) return null
  return <div ref={root} style={{ margin: '12px 0', padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>
    <strong>Your Kineo library.</strong>
    <p style={{ fontSize: 13 }}>Use the same account to find your finished film below, then choose the next story you want to tell.</p>
    <a href="#mrr-library-films" onClick={gesture} style={{ color: 'var(--accent)' }}>See my films →</a>
  </div>
}
