'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'

type OrganicCtaLinkProps = {
  href: string
  source: string
  placement: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  /**
   * In-page handoffs measure interest separately from an action that leaves
   * the page. The default preserves all existing organic links.
   */
  analyticsEvent?: 'organic_cta_clicked' | 'organic_handoff_opened'
  /**
   * Optional in-page handoff. When present, the link scrolls to this element
   * and focuses its first form control instead of leaving the page.
   */
  focusTargetId?: string
}

// PUSH #22 — one event name for every organic landing CTA. The destination
// carries the campaign through signup/OAuth; this click event also measures
// interest from visitors who leave before creating an account.
export default function OrganicCtaLink({
  href,
  source,
  placement,
  children,
  className,
  style,
  analyticsEvent = 'organic_cta_clicked',
  focusTargetId,
}: OrganicCtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      aria-controls={focusTargetId}
      onClick={(event) => {
        void trackEvent(analyticsEvent, {
          source,
          placement,
          destination: href.split('?')[0],
        })

        if (!focusTargetId) return

        const target = document.getElementById(focusTargetId)
        if (!target) return

        event.preventDefault()
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        window.history.replaceState(null, '', `#${encodeURIComponent(focusTargetId)}`)
        window.requestAnimationFrame(() => {
          const control = target.querySelector<HTMLElement>('textarea, input, button')
          control?.focus({ preventScroll: true })
        })
      }}
    >
      {children}
    </Link>
  )
}
