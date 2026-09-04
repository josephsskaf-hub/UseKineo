'use client'

import { useEffect, useState } from 'react'
import { selectCheckoutResumeFilm, type CheckoutResumeFilmProof } from '@/lib/growth/checkoutResumeFilm'

export function useCheckoutResumeFilm(enabled: boolean): CheckoutResumeFilmProof | null {
  const [film, setFilm] = useState<CheckoutResumeFilmProof | null>(null)

  useEffect(() => {
    if (!enabled) {
      setFilm(null)
      return
    }
    const controller = new AbortController()
    void fetch('/api/videos', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null
        const body = await response.json() as { videos?: unknown }
        return selectCheckoutResumeFilm(body.videos)
      })
      .then((selected) => {
        if (!controller.signal.aborted) setFilm(selected)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFilm(null)
      })
    return () => controller.abort()
  }, [enabled])

  return film
}
