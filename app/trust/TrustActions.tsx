'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

const VIEW_MARKER = 'kineo:trust-page:viewed:v1'

export default function TrustActions() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(VIEW_MARKER)) return
      sessionStorage.setItem(VIEW_MARKER, '1')
    } catch {
      // Privacy modes can deny storage. The page must still work.
    }
    void trackEvent('trust_page_viewed', {
      version: 'trust_center_v1_2026_08_27',
    })
  }, [])

  function record(destination: 'examples' | 'signup' | 'support') {
    void trackEvent('trust_cta_clicked', {
      destination,
      version: 'trust_center_v1_2026_08_27',
    })
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 26 }}>
      <Link
        href="/signup?utm_source=trust&utm_medium=organic&utm_campaign=trust_center"
        onClick={() => record('signup')}
        style={{ color: '#04110c', background: '#34d399', borderRadius: 999, padding: '13px 20px', fontSize: 14, fontWeight: 900, textDecoration: 'none' }}
      >
        Try Kineo free
      </Link>
      <Link
        href="/examples"
        onClick={() => record('examples')}
        style={{ color: '#fff', border: '1px solid rgba(255,255,255,.16)', borderRadius: 999, padding: '13px 20px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}
      >
        Watch real outputs
      </Link>
      <a
        href="mailto:support@usekineo.com?subject=Question%20before%20I%20use%20Kineo"
        onClick={() => record('support')}
        style={{ color: '#b9b9c0', padding: '13px 8px', fontSize: 14, fontWeight: 750, textDecoration: 'none' }}
      >
        Ask the founder →
      </a>
    </div>
  )
}
