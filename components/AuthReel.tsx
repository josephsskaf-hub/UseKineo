'use client'

// KINEO-AUTH-REEL-2026-08-17 — vitrine compartilhada das telas de entrada
// (login + signup; fundador: 'arruma a tela de entrada... o video da mulher
// com os raios + a avalanche na tela de entrada'). Os cortes vem do master
// ENHANCED (Topaz, 23Mbps) — melhor primeira impressao possivel.
// Selo honesto: motor real, sempre.
import { useEffect, useRef, useState } from 'react'

const REEL = [
  { src: '/previews/4b12925e-16e6-4b56-af5a-7047f9ae7a28.mp4', label: 'Kling 3' },
  { src: '/previews/4b12925e-avalanche.mp4', label: 'Kling 3' },
  { src: '/previews/99818ab0-0960-4089-a784-12b241736868.mp4', label: 'Kling 3' },
  { src: '/previews/e487a011-8781-482f-913e-445ef5ad22bf.mp4', label: 'Kling 3' },
]

export default function AuthReel() {
  const [idx, setIdx] = useState(0)
  const refs = useRef<(HTMLVideoElement | null)[]>([])
  // KINEO-REEL-ENDED-2026-08-17 (fundador: 'esta repetindo duas vezes cada
  // cena'): o timer fixo de 8s fazia clipes curtos (4.5s/3.3s) LOOPAREM ate
  // o timer vencer. Agora cada clipe avanca quando TERMINA (onEnded, sem
  // loop) — cada cena passa exatamente uma vez. Timer de 15s so como
  // seguranca se um video travar no load.
  useEffect(() => {
    refs.current[0]?.play().catch(() => {})
  }, [])
  useEffect(() => {
    refs.current.forEach((v, i) => {
      if (!v) return
      if (i === idx) {
        v.currentTime = 0
        v.play().catch(() => {})
      } else v.pause()
    })
    const safety = setTimeout(() => setIdx((i) => (i + 1) % REEL.length), 15000)
    return () => clearTimeout(safety)
  }, [idx])
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        maxWidth: 780,
        aspectRatio: '500 / 280',
        border: '1px solid rgba(41,151,255,.22)',
        boxShadow: '0 30px 90px rgba(0,0,0,.6), 0 0 60px rgba(41,151,255,.10)',
        background: '#0a0a0c',
      }}
    >
      {REEL.map((v, i) => (
        <video
          key={v.src}
          ref={(el) => { refs.current[i] = el }}
          src={v.src}
          muted
          playsInline
          onEnded={() => setIdx((i2) => (i2 + 1) % REEL.length)}
          preload={i === 0 ? 'auto' : 'metadata'}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: i === idx ? 1 : 0, transition: 'opacity 1.1s ease' }}
        />
      ))}
      <span
        className="absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(0,0,0,.55)',
          border: '1px solid rgba(41,151,255,.4)',
          color: '#7cc0ff',
          backdropFilter: 'blur(6px)',
        }}
      >
        {REEL[idx].label} · rendered in Kineo
      </span>
    </div>
  )
}
