'use client'

// KINEO-LOGIN-QUADRO-0411 · KINEO-LOGIN-4-VIDEOS-0411 — a vitrine do quadro de entrada: 4 vídeos passando, com a barra de tempo e sem nome de motor.
import { useEffect, useRef, useState } from 'react'
import { VITRINE_ENTRADA as SLIDES, estadoDaBarra, proximoSlide } from '@/lib/authVitrine'

export default function AuthVitrine() {
  const [atual, setAtual] = useState(0)
  const [largo, setLargo] = useState(false)
  const [parado, setParado] = useState(false)
  const videos = useRef<Array<HTMLVideoElement | null>>([])

  // Só carrega vídeo em tela larga: no celular a vitrine não aparece e não deve gastar dados.
  useEffect(() => {
    const largura = window.matchMedia('(min-width: 768px)')
    const movimento = window.matchMedia('(prefers-reduced-motion: reduce)')
    const ler = () => { setLargo(largura.matches); setParado(movimento.matches) }
    ler()
    largura.addEventListener('change', ler)
    movimento.addEventListener('change', ler)
    return () => { largura.removeEventListener('change', ler); movimento.removeEventListener('change', ler) }
  }, [])

  useEffect(() => {
    if (!largo || parado) return
    const t = setTimeout(() => setAtual((i) => proximoSlide(i, SLIDES.length)), SLIDES[atual].ms)
    return () => clearTimeout(t)
  }, [atual, largo, parado])

  // Só o vídeo da vez toca, sempre do início; os outros ficam parados.
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return
      if (i === atual && !parado) {
        v.currentTime = 0
        void v.play().catch(() => {})
      } else {
        v.pause()
      }
    })
  }, [atual, parado, largo])

  if (!largo) return null
  const seguinte = proximoSlide(atual, SLIDES.length)

  return (
    <div className="relative overflow-hidden" style={{ minHeight: 600, height: '100%', borderRadius: 16, background: '#0a0a0c' }}>
      <style>{'@keyframes kineoAuthBarra{from{transform:scaleX(0)}to{transform:scaleX(1)}}'}</style>
      {SLIDES.map((s, i) => (
        <video
          key={s.src}
          ref={(el) => { videos.current[i] = el }}
          src={s.src}
          poster={s.poster}
          muted
          playsInline
          preload={i === atual || i === seguinte ? 'auto' : 'none'}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: i === atual ? 1 : 0, transition: parado ? undefined : 'opacity .45s ease' }}
        />
      ))}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,6,12,.7) 0%, rgba(5,6,12,.2) 14%, rgba(5,6,12,0) 26%)' }} />
      <div className="absolute left-0 right-0 bottom-0" style={{ padding: '0 16px 14px' }}>
        <span className="inline-block text-[11px] font-bold" style={{ padding: '4px 10px', marginBottom: 10, borderRadius: 8, color: '#fff', background: 'rgba(5,6,12,.62)' }}>Made in Kineo</span>
        <div role="tablist" aria-label="Videos made in Kineo" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${SLIDES.length}, minmax(0, 1fr))` }}>
          {SLIDES.map((s, i) => {
            const barra = estadoDaBarra(i, atual)
            return (
              <button key={s.src} type="button" role="tab" aria-label={s.nome} aria-selected={i === atual} onClick={() => setAtual(i)} className="text-left" style={{ background: 'transparent', border: 'none', padding: '8px 0', cursor: 'pointer', minWidth: 0 }}>
                <span className="block overflow-hidden" style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.24)' }}>
                  <span
                    key={barra === 'enchendo' ? `${i}-${atual}` : i}
                    className="block h-full"
                    style={{
                      background: '#fff',
                      transformOrigin: 'left',
                      transform: barra === 'vazia' ? 'scaleX(0)' : 'scaleX(1)',
                      animation: barra === 'enchendo' && !parado ? `kineoAuthBarra ${s.ms}ms linear forwards` : undefined,
                    }}
                  />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
