'use client'
import { useCallback, useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

/** Browser observations are deduplicated by person in the SQL report, never counted as people here. */
export function useMrrVisible(prefix: string, version: string, enabled = true) {
  const root = useRef<HTMLDivElement>(null)
  const seen = useRef(false)
  const acted = useRef(false)
  useEffect(() => {
    if (!enabled || seen.current || !root.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.5) || seen.current) return
      seen.current = true
      void trackEvent(`${prefix}_viewed`, { version })
      observer.disconnect()
    }, { threshold: 0.5 })
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [enabled, prefix, version])
  const gesture = useCallback(() => {
    if (!enabled || acted.current) return
    acted.current = true
    void trackEvent(`${prefix}_first_gesture`, { version })
  }, [enabled, prefix, version])
  return { root, gesture }
}
