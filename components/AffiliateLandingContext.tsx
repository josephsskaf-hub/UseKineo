'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  AFFILIATE_LANDING_CONTEXT_VARIANT,
  type AffiliateLandingContextCopy,
} from '@/lib/growth/affiliateLandingContext'
import styles from './AffiliateLandingContext.module.css'

interface Props {
  context: AffiliateLandingContextCopy | null
  targetId: string
}

export default function AffiliateLandingContext({ context, targetId }: Props) {
  useEffect(() => {
    if (!context) return
    const eventKey = `${AFFILIATE_LANDING_CONTEXT_VARIANT}:${context.destination}:viewed`
    try {
      if (sessionStorage.getItem(eventKey) === '1') return
      sessionStorage.setItem(eventKey, '1')
    } catch {
      // Privacy modes may disable storage. Measurement must never hide the card.
    }
    void trackEvent('affiliate_landing_context_viewed', {
      variant: AFFILIATE_LANDING_CONTEXT_VARIANT,
      destination: context.destination,
    })
  }, [context])

  if (!context) return null

  return (
    <aside className={styles.card} aria-label="Partner recommendation">
      <div className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{context.eyebrow}</p>
          <h2 className={styles.heading}>{context.heading}</h2>
          <p className={styles.body}>{context.body}</p>
        </div>
        <a
          className={styles.action}
          href={`#${targetId}`}
          onClick={() => {
            void trackEvent('affiliate_landing_context_clicked', {
              variant: AFFILIATE_LANDING_CONTEXT_VARIANT,
              destination: context.destination,
            })
          }}
        >
          {context.action} ↓
        </a>
      </div>
    </aside>
  )
}
