'use client'

// KINEO-LOGIN-FUNDO-0411 — fundador 04/11: "ela loga nessa tela em branco, tem que ter os nossos vídeos por trás". Só nas páginas /login e /signup; no modal, a home já está atrás.
// As fotos aparecem na hora. Os vídeos entram depois de 1,5 s e só em tela larga, para não atrasar o cadastro nem gastar a internet de quem está no celular.
import { useEffect, useState } from 'react'
import { FUNDO_ENTRADA } from '@/lib/authVitrine'

export default function AuthFundo() {
  const [videos, setVideos] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(min-width: 768px)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setTimeout(() => setVideos(true), 1500)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden" style={{ zIndex: 0, background: '#05060c' }}>
      <div
        className="grid h-full w-full grid-cols-2 md:grid-cols-4"
        style={{ gridAutoRows: '1fr', gap: 6, transform: 'scale(1.06)', filter: 'blur(10px)' }}
      >
        {FUNDO_ENTRADA.map((f) => (
          <div key={f.poster} className="relative overflow-hidden" style={{ minHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {videos && f.video ? <video src={f.video} muted playsInline autoPlay loop className="absolute inset-0 h-full w-full object-cover" /> : null}
          </div>
        ))}
      </div>
      <div className="absolute inset-0" style={{ background: 'rgba(5, 6, 12, 0.62)' }} />
    </div>
  )
}
