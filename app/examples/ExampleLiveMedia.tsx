'use client'

// KINEO-HIGGSFIELD-20D dia 19 (13/08) — o catalogo e a landing (item 8 do
// sistema Higgsfield): cada card do /examples toca sozinho em viewport, com o
// MESMO orcamento da galeria da home — poster e o primeiro paint, o <video>
// so monta no primeiro intersect (>=35%), preload="none" (o download comeca
// no play), pausa fora da tela, crossfade no evento playing. Save-Data, 2g e
// reduced-motion ficam no poster. Rollback: voltar o <img> no page.tsx.
import { useEffect, useRef, useState } from 'react'

export default function ExampleLiveMedia({
  videoPath,
  posterPath,
}: {
  videoPath: string
  posterPath: string
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
    if (nav.connection?.saveData || (nav.connection?.effectiveType ?? '').includes('2g')) return
    const el = boxRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true)
          vidRef.current?.play().catch(() => {})
        } else {
          vidRef.current?.pause()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (mounted) vidRef.current?.play().catch(() => {})
  }, [mounted])

  return (
    <div ref={boxRef} className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterPath}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
      />
      {mounted && (
        <video
          ref={vidRef}
          src={videoPath}
          poster={posterPath}
          muted
          loop
          playsInline
          preload="none"
          onPlaying={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0, transition: 'opacity 250ms cubic-bezier(.2,0,0,1)' }}
        />
      )}
    </div>
  )
}
