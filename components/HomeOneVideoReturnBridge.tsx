'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  decideHomeOneVideoReturn,
  type HomeOneVideoReturnDecision,
} from '@/lib/growth/homeOneVideoReturn'

type VideosResponse = {
  completedCount?: number | null
  historyReliable?: boolean
}

type PlanResponse = {
  plan?: string | null
  isPro?: boolean
}

const VIEW_THRESHOLD = 0.5
const viewedInMemory = new Set<string>()
const viewInFlight = new Set<string>()

function viewMarker(version: string): string {
  return `kineo:home-one-video-return:viewed:${version}`
}

function alreadyViewed(marker: string): boolean {
  if (viewedInMemory.has(marker)) return true
  try {
    if (window.sessionStorage.getItem(marker) === '1') {
      viewedInMemory.add(marker)
      return true
    }
  } catch {
    // Privacy modes may deny storage. The in-memory guard still protects remounts.
  }
  return false
}

async function recordView(decision: Extract<HomeOneVideoReturnDecision, { eligible: true }>): Promise<boolean> {
  const marker = viewMarker(decision.version)
  if (alreadyViewed(marker) || viewInFlight.has(marker)) return false
  viewInFlight.add(marker)
  const stored = await trackEvent('home_one_video_return_viewed', {
    version: decision.version,
    surface: 'home',
    completed_count_bucket: decision.completedCountBucket,
    destination: decision.destination,
    actor_unit: 'authenticated_user',
  })
  viewInFlight.delete(marker)
  if (!stored) return false
  viewedInMemory.add(marker)
  try { window.sessionStorage.setItem(marker, '1') } catch { /* memory guard remains */ }
  return true
}

export default function HomeOneVideoReturnBridge({ signedIn }: { signedIn: boolean }) {
  const [decision, setDecision] = useState<HomeOneVideoReturnDecision | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!signedIn) {
      setDecision({ eligible: false, reason: 'anonymous' })
      return
    }

    const controller = new AbortController()
    const options: RequestInit = {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    }
    void Promise.all([
      fetch('/api/videos', options),
      fetch('/api/me/plan', options),
    ])
      .then(async ([videosResponse, planResponse]) => {
        if (!videosResponse.ok || !planResponse.ok) return null
        const [videos, plan] = await Promise.all([
          videosResponse.json() as Promise<VideosResponse>,
          planResponse.json() as Promise<PlanResponse>,
        ])
        return decideHomeOneVideoReturn({
          signedIn: true,
          historyReliable: videos.historyReliable === true,
          completedCount: typeof videos.completedCount === 'number' ? videos.completedCount : null,
          isPro: plan.isPro === true,
          plan: typeof plan.plan === 'string' ? plan.plan : null,
        })
      })
      .then((next) => {
        if (!controller.signal.aborted) setDecision(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) setDecision(null)
      })

    return () => controller.abort()
  }, [signedIn])

  useEffect(() => {
    if (!decision?.eligible || !sectionRef.current) return
    if (typeof IntersectionObserver === 'undefined') return
    const marker = viewMarker(decision.version)
    if (alreadyViewed(marker)) return

    const section = sectionRef.current
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting || entry.intersectionRatio < VIEW_THRESHOLD) return
      void recordView(decision).then((stored) => {
        if (stored || alreadyViewed(marker)) observer.disconnect()
      })
    }, { threshold: [VIEW_THRESHOLD] })
    observer.observe(section)
    return () => observer.disconnect()
  }, [decision])

  if (!decision?.eligible) return null

  const metadata = {
    version: decision.version,
    surface: 'home',
    completed_count_bucket: decision.completedCountBucket,
    destination: decision.destination,
    actor_unit: 'authenticated_user',
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="home-one-video-return-heading"
      data-home-one-video-return={decision.version}
      style={{
        padding: '36px 0 42px',
        background: 'linear-gradient(180deg, rgba(52,211,153,.07), rgba(41,151,255,.035))',
        borderTop: '1px solid rgba(52,211,153,.16)',
        borderBottom: '1px solid rgba(255,255,255,.06)',
      }}
    >
      <div className="wrap">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            alignItems: 'center',
            gap: 24,
            maxWidth: 920,
            margin: '0 auto',
            padding: '22px',
            borderRadius: 20,
            border: '1px solid rgba(52,211,153,.34)',
            background: 'radial-gradient(circle at 100% 0%, rgba(52,211,153,.14), transparent 44%), #111216',
          }}
        >
          <div>
            <p style={{ margin: '0 0 8px', color: '#34d399', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Your first Short is already done
            </p>
            <h2 id="home-one-video-return-heading" style={{ margin: 0, color: '#f5f5f7', fontSize: 'clamp(1.35rem, 3vw, 1.9rem)', lineHeight: 1.13, fontWeight: 900 }}>
              Don&apos;t make episode two from a blank page.
            </h2>
            <p style={{ margin: '10px 0 0', color: '#aaaab1', fontSize: 14, lineHeight: 1.62 }}>
              Open your first video, then choose Next episode to keep the topic recognizable with a new hook, new facts and a fresh payoff.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 9 }}>
            <Link
              href={decision.href}
              onClick={() => void trackEvent('home_one_video_return_clicked', metadata)}
              style={{
                display: 'flex',
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 13,
                padding: '0 18px',
                color: '#04110c',
                background: '#34d399',
                fontSize: 14,
                fontWeight: 900,
                textDecoration: 'none',
              }}
            >
              Continue from my first video →
            </Link>
            <p style={{ margin: 0, color: '#85858c', fontSize: 11.5, lineHeight: 1.45, textAlign: 'center' }}>
              You review the next idea before anything generates.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
