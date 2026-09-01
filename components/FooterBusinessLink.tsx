'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  FOOTER_BUSINESS_VISIBLE_RATIO,
  createFooterBusinessEventRecorder,
  type FooterBusinessDestination,
} from '@/lib/growth/footerBusinessDiscovery'

type Props = {
  children: ReactNode
  destination: FooterBusinessDestination
  href: string
  style?: CSSProperties
}

const footerBusinessRecorder = createFooterBusinessEventRecorder({
  readMarker(marker) {
    return window.sessionStorage.getItem(marker) === '1'
  },
  writeMarker(marker) {
    window.sessionStorage.setItem(marker, '1')
  },
  send(eventName, metadata) {
    return trackEvent(eventName, metadata)
  },
})

export default function FooterBusinessLink({ children, destination, href, style }: Props) {
  const linkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const link = linkRef.current
    if (!link || typeof IntersectionObserver === 'undefined') return
    if (footerBusinessRecorder.wasRecorded('footer_business_path_viewed', destination)) return

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting || entry.intersectionRatio < FOOTER_BUSINESS_VISIBLE_RATIO) {
        return
      }
      void footerBusinessRecorder.record('footer_business_path_viewed', destination)
        .then((stored) => {
          if (stored || footerBusinessRecorder.wasRecorded(
            'footer_business_path_viewed',
            destination,
          )) observer.disconnect()
        })
    }, { threshold: [FOOTER_BUSINESS_VISIBLE_RATIO] })

    observer.observe(link)
    return () => observer.disconnect()
  }, [destination])

  return (
    <Link
      ref={linkRef}
      href={href}
      style={style}
      onClick={() => {
        void footerBusinessRecorder.record('footer_business_path_clicked', destination)
      }}
    >
      {children}
    </Link>
  )
}
