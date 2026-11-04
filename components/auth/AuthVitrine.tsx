'use client'

// KINEO-LOGIN-QUADRO-0411 — a vitrine do quadro de entrada: um vídeo e três fotos, com a barra de tempo em cima do nome do motor.
import { useEffect, useState } from 'react'
import { VITRINE_ENTRADA as SLIDES, estadoDaBarra, proximoSlide } from '@/lib/authVitrine'

export default function AuthVitrine() {
  const [atual, setAtual] = useState(0)
  const [largo, setLargo] = useState(false)
  const [parado, setParado] = useState(false)

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

  if (!largo) return null
  const slide = SLIDES[atual]

  return (
    <div className="relative overflow-hidden" style={{ minHeight: 600, height: '100%', borderRadius: 16, background: '#0a0a0c' }}>
      <style>{'@keyframes kineoAuthBarra{from{transform:scaleX(0)}to{transform:scaleX(1)}}'}</style>
      {SLIDES.map((s, i) => (
        s.tipo === 'video'
          ? <video key={s.src} src={s.src} muted playsInline autoPlay={!parado} loop preload="auto" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: i === atual ? 1 : 0, transition: 'opacity .7s ease' }} />
          // eslint-disable-next-line @next/next/no-img-element
          : <img key={s.src} src={s.src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: i === atual ? 1 : 0, transition: 'opacity .7s ease' }} />
      ))}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,6,12,.92) 0%, rgba(5,6,12,.45) 32%, rgba(5,6,12,0) 58%)' }} />
      <div className="absolute left-0 right-0 bottom-0" style={{ padding: '0 16px 14px' }}>
        <span className="inline-block text-[11px] font-bold" style={{ padding: '4px 10px', marginBottom: 10, borderRadius: 8, color: '#fff', background: 'rgba(5,6,12,.62)' }}>{slide.etiqueta}</span>
        <p className="font-black" style={{ margin: 0, fontSize: '1.9rem', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#fff' }}>{slide.titulo}</p>
        <p className="text-[13px]" style={{ margin: '8px 0 14px', lineHeight: 1.4, color: 'rgba(255,255,255,.72)' }}>{slide.texto}</p>
        <div role="tablist" aria-label="Kineo engines" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${SLIDES.length}, minmax(0, 1fr))` }}>
          {SLIDES.map((s, i) => {
            const barra = estadoDaBarra(i, atual)
            return (
              <button key={s.motor} type="button" role="tab" aria-selected={i === atual} onClick={() => setAtual(i)} className="text-left" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', minWidth: 0 }}>
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
                <span className="block truncate text-[11px]" style={{ marginTop: 6, fontWeight: i === atual ? 700 : 500, color: i === atual ? '#fff' : 'rgba(255,255,255,.55)' }}>{s.motor}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
