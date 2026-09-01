'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  EXAMPLES_BUSINESS_PROOF_CLICK_MARKER,
  EXAMPLES_BUSINESS_PROOF_DESTINATION,
  EXAMPLES_BUSINESS_PROOF_VIEW_MARKER,
  EXAMPLES_BUSINESS_PROOF_VISIBLE_RATIO,
  examplesBusinessProofMetadata,
  examplesBusinessProofViewSettlement,
} from '@/lib/growth/examplesBusinessProof'

const inFlight = new Set<string>()
const recorded = new Set<string>()

function wasRecorded(marker: string): boolean {
  if (recorded.has(marker)) return true
  try {
    if (window.sessionStorage.getItem(marker) === '1') {
      recorded.add(marker)
      return true
    }
  } catch {
    // Privacy modes can deny storage. The in-memory latch still protects this page.
  }
  return false
}

async function recordOnce(marker: string, eventName: string): Promise<boolean> {
  if (wasRecorded(marker) || inFlight.has(marker)) return false
  inFlight.add(marker)
  const stored = await trackEvent(eventName, examplesBusinessProofMetadata())
  inFlight.delete(marker)
  if (examplesBusinessProofViewSettlement(stored) === 'retryable') return false

  recorded.add(marker)
  try {
    window.sessionStorage.setItem(marker, '1')
  } catch {
    // A successful event remains latched in memory for this page lifetime.
  }
  return true
}

export default function ExamplesBusinessProofBridge() {
  const targetRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const target = targetRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    if (wasRecorded(EXAMPLES_BUSINESS_PROOF_VIEW_MARKER)) return

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting || entry.intersectionRatio < EXAMPLES_BUSINESS_PROOF_VISIBLE_RATIO) return
      void recordOnce(
        EXAMPLES_BUSINESS_PROOF_VIEW_MARKER,
        'examples_business_proof_bridge_viewed',
      ).then((stored) => {
        if (stored || wasRecorded(EXAMPLES_BUSINESS_PROOF_VIEW_MARKER)) observer.disconnect()
      })
    }, { threshold: [EXAMPLES_BUSINESS_PROOF_VISIBLE_RATIO] })

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={targetRef}
      aria-labelledby="examples-business-proof-title"
      className="mt-5 rounded-[18px] border border-emerald-400/25 bg-emerald-400/[0.045] px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6"
    >
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
          For client work
        </p>
        <h2 id="examples-business-proof-title" className="mt-1 text-lg font-semibold tracking-[-.02em] text-white">
          Making Shorts for clients?
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-white/55">
          Compare one-time self-service packs for 10–50 Fast Shorts. Clean commercial-use MP4s,
          one Kineo account and no recurring contract.
        </p>
      </div>
      <Link
        href={EXAMPLES_BUSINESS_PROOF_DESTINATION}
        onClick={() => {
          void recordOnce(
            EXAMPLES_BUSINESS_PROOF_CLICK_MARKER,
            'examples_business_proof_bridge_clicked',
          )
        }}
        className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/70 px-5 text-sm font-bold text-emerald-200 transition hover:border-emerald-200 hover:bg-emerald-300 hover:text-[#04110c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 sm:mt-0"
      >
        Compare one-time client packs →
      </Link>
    </section>
  )
}
