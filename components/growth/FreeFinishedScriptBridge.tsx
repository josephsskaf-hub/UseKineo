'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  FREE_FINISHED_SCRIPT_BRIDGE_DESTINATION,
  FREE_FINISHED_SCRIPT_BRIDGE_METADATA,
  FREE_FINISHED_SCRIPT_BRIDGE_VERSION,
  FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER,
  FREE_FINISHED_SCRIPT_BRIDGE_VISIBLE_RATIO,
} from '@/lib/growth/freeFinishedScriptBridge'

const pendingViews = new Set<string>()

export default function FreeFinishedScriptBridge() {
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const target = sectionRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return

    try {
      if (
        sessionStorage.getItem(FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER) === '1'
        || pendingViews.has(FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER)
      ) return
    } catch {
      // Measurement must never hide or delay the script-preserving path.
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => (
          entry.isIntersecting
          && entry.intersectionRatio >= FREE_FINISHED_SCRIPT_BRIDGE_VISIBLE_RATIO
        ))) return

        observer.disconnect()
        try {
          if (
            sessionStorage.getItem(FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER) === '1'
            || pendingViews.has(FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER)
          ) return
        } catch {
          // Continue failure-isolated when storage is unavailable.
        }

        pendingViews.add(FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER)
        void trackEvent('free_finished_script_bridge_viewed', FREE_FINISHED_SCRIPT_BRIDGE_METADATA)
          .then((stored) => {
            pendingViews.delete(FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER)
            if (!stored) return
            try {
              sessionStorage.setItem(FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER, '1')
            } catch {
              // Analytics storage is optional; navigation is not.
            }
          })
      },
      { threshold: [FREE_FINISHED_SCRIPT_BRIDGE_VISIBLE_RATIO] },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      data-variant={FREE_FINISHED_SCRIPT_BRIDGE_VERSION}
      aria-labelledby="free-finished-script-bridge-title"
      style={{
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(103,232,249,.09), rgba(41,151,255,.05))',
        border: '1px solid rgba(103,232,249,.25)',
        borderRadius: 16,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        justifyContent: 'space-between',
        marginTop: 24,
        padding: '14px 16px',
      }}
    >
      <div style={{ flex: '1 1 260px' }}>
        <p
          id="free-finished-script-bridge-title"
          style={{ color: '#f5f5f7', fontSize: 14, fontWeight: 850, margin: 0 }}
        >
          Already have a finished script?
        </p>
        <p style={{ color: '#a1a1aa', fontSize: 12.5, lineHeight: 1.5, margin: '4px 0 0' }}>
          Keep the spoken wording and let Kineo build the scenes around it.
        </p>
      </div>
      <Link
        href={FREE_FINISHED_SCRIPT_BRIDGE_DESTINATION}
        onClick={() => {
          void trackEvent('free_finished_script_bridge_clicked', FREE_FINISHED_SCRIPT_BRIDGE_METADATA)
        }}
        style={{
          border: '1px solid rgba(103,232,249,.5)',
          borderRadius: 999,
          color: '#bae6fd',
          flex: '0 0 auto',
          fontSize: 12.5,
          fontWeight: 850,
          padding: '10px 14px',
          textDecoration: 'none',
        }}
      >
        Choose finished-script mode →
      </Link>
    </section>
  )
}
