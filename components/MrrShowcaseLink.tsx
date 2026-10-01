'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { MRR_SHOWCASE_ENABLED, MRR_SHOWCASE_VERSION } from '@/lib/growth/mrrShowcase'
import { trackEvent } from '@/lib/analytics'
import { UiLabel } from '@/components/InterfaceLanguage'

export default function MrrShowcaseLink() {
  const link = useRef<HTMLAnchorElement>(null)
  const seen = useRef(false)
  useEffect(() => {
    if (!MRR_SHOWCASE_ENABLED || !link.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting) || seen.current) return
      seen.current = true
      void trackEvent('mrr_showcase_door_viewed', { version: MRR_SHOWCASE_VERSION, surface: 'home_gallery' })
      observer.disconnect()
    }, { threshold: 0.5 })
    observer.observe(link.current)
    return () => observer.disconnect()
  }, [])
  if (!MRR_SHOWCASE_ENABLED) return null
  return <Link ref={link} href="/showcase" style={{ display: 'inline-block', marginTop: 16, color: 'inherit', fontSize: 13, textUnderlineOffset: 4 }}
    onClick={() => { void trackEvent('mrr_showcase_door_clicked', { version: MRR_SHOWCASE_VERSION, surface: 'home_gallery' }) }}>
    <UiLabel>Explore real films and what they cost →</UiLabel>
  </Link>
}
