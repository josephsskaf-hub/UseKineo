'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UiLabel } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { firstFilmGenerateHref, firstFilmOffer, MRR_FIRST_FILM_ENABLED, MRR_FIRST_FILM_VERSION, type FirstFilmFacts } from '@/lib/growth/mrrFirstFilm'

export default function MrrFirstFilm(facts: FirstFilmFacts) {
  const offer = firstFilmOffer(facts)
  const router = useRouter()
  const viewed = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const committed = useRef(false)
  const [starting, setStarting] = useState(false)
  useEffect(() => {
    if (!MRR_FIRST_FILM_ENABLED || !offer || viewed.current) return
    const el = root.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.5) || viewed.current) return
      viewed.current = true
      void trackEvent('mrr_first_film_viewed', { version: MRR_FIRST_FILM_VERSION, topic: 'paper_boat', seconds: offer.seconds, cost: offer.cost })
      observer.disconnect()
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [offer?.cost, offer?.seconds])
  if (!MRR_FIRST_FILM_ENABLED || !offer) return null
  return <div ref={root} data-mrr-first-film style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
    <strong style={{ fontSize: 13 }}><UiLabel>Try your first film with a ready-made idea</UiLabel></strong>
    <p style={{ margin: '6px 0', fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5 }}>
      <UiLabel>A paper boat crosses a rainy city and reaches the sea at sunrise.</UiLabel>
    </p>
    <p style={{ margin: '6px 0', fontSize: 11 }}><UiLabel>Seedance 1.5</UiLabel> · {offer.seconds}s · {offer.cost} cr · <UiLabel>Uses your trial credits. Starts generating when you click.</UiLabel></p>
    <button type="button" className="pill" disabled={starting} onClick={() => {
      if (committed.current || !firstFilmOffer(facts)) return
      committed.current = true
      setStarting(true)
      void trackEvent('mrr_first_film_committed', { version: MRR_FIRST_FILM_VERSION, topic: 'paper_boat', seconds: offer.seconds, cost: offer.cost })
      router.push(firstFilmGenerateHref())
    }}><UiLabel>{starting ? 'Starting your film…' : 'Generate this first film'}</UiLabel> · {offer.cost} cr →</button>
  </div>
}
