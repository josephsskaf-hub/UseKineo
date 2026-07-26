'use client'

// Public proof used above the fold.
//
// These previews are compressed cuts from founder-owned Kineo exports that
// were explicitly selected for the public homepage. The shared allow-list also
// powers dedicated watch pages; private customer renders never enter it.
//
// Push #92 — Core Web Vitals: autoPlay overrides preload="metadata" in every
// browser, so all four MP4s (~1MB combined) used to download immediately on
// paint, competing with the LCP element for bandwidth. Now only the first
// card autoplays on load; cards 2-4 ship preload="none" and sit on their
// poster frame until an IntersectionObserver plays them (and pauses them again
// once they scroll out of view). prefers-reduced-motion: reduce disables all
// autoplay — every card then just shows its poster with a static play icon.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PUBLIC_EXAMPLES } from '@/lib/publicExamples'

export default function HeroGallery() {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [reducedMotion, setReducedMotion] = useState(false)
  const [playing, setPlaying] = useState<boolean[]>(() => PUBLIC_EXAMPLES.map(() => false))

  // Track the user's reduced-motion preference live (it can change mid-session
  // on some OSes/browsers via the accessibility settings panel).
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      videoRefs.current.forEach((video) => video && video.pause())
      setPlaying(PUBLIC_EXAMPLES.map(() => false))
      return
    }

    const observers: IntersectionObserver[] = []

    videoRefs.current.forEach((video, index) => {
      // Card 0 already autoplays via the autoPlay attribute on load; the
      // observer here only drives the scroll-triggered cards 1-3.
      if (!video || index === 0) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // preload="none" ships no bytes until a card is actually about
              // to play — flip it to metadata and (re)load right before play.
              if (video.preload !== 'metadata') {
                video.preload = 'metadata'
                video.load()
              }
              video
                .play()
                .then(() => {
                  setPlaying((prev) => {
                    if (prev[index]) return prev
                    const next = [...prev]
                    next[index] = true
                    return next
                  })
                })
                .catch(() => {
                  // Autoplay can be rejected by the browser (e.g. low power
                  // mode); the poster + play affordance stays visible.
                })
            } else {
              video.pause()
              setPlaying((prev) => {
                if (!prev[index]) return prev
                const next = [...prev]
                next[index] = false
                return next
              })
            }
          })
        },
        { threshold: 0.4 }
      )
      observer.observe(video)
      observers.push(observer)
    })

    return () => observers.forEach((observer) => observer.disconnect())
  }, [reducedMotion])

  return (
    <div id="samples" className="hero-gallery" aria-label="Real Shorts made with Kineo">
      {PUBLIC_EXAMPLES.map((example, index) => {
        const autoplayFirst = index === 0 && !reducedMotion
        const showPlayAffordance = !autoplayFirst && !playing[index]

        return (
          <Link
            key={example.slug}
            href={`/examples/${example.slug}`}
            className="vcard"
            aria-label={`${example.title} — watch a real Kineo output preview`}
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el
              }}
              className="hvid"
              src={example.videoPath}
              poster={example.posterPath}
              muted
              loop
              autoPlay={autoplayFirst}
              playsInline
              preload={autoplayFirst ? 'metadata' : 'none'}
            />
            {showPlayAffordance && (
              <span className="hvid-play" aria-hidden="true">
                <span>▶</span>
              </span>
            )}
            <div className="vt">{example.shortTitle}</div>
          </Link>
        )
      })}
    </div>
  )
}
