'use client'

// KINEO-BEBE-QUE-FALA-2010 — o 4º card da home: "AI Kids Cartoons" (16 línguas), mesmo visual dos 3 cards (classes .k3c-* de
// components/home/HomeThreeCards.tsx), destino o template /kids-cartoon. Dados em lib/ui/homeKidsCard.ts (puro). Só é montado com
// o interruptor (HOME_4TH_CARD_LIVE, ou a prévia das contas da casa) — quem decide é a KineoLanding. Sem preço.
// Vídeo: o curta 3D de teste com nota 10 (HOME_KIDS_CARD_CLIP, render 4f6c8a40, Seedance 1.5 — selo honesto), prévia leve com pôster;
// por baixo, o fundo ilustrado em CSS (fica sozinho se o clipe sair da lista).
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { HOME_CARD_EVENT } from '@/lib/ui/homeThreeCards'
import { HOME_KIDS_CARD_BADGE, HOME_KIDS_CARD_CLIP, HOME_KIDS_CARD_ID, homeKidsCardClickMetadata, homeKidsCardCopy, homeKidsCardHref } from '@/lib/ui/homeKidsCard'

function KidsMedia() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root || !HOME_KIDS_CARD_CLIP) return
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const set = (visible: boolean) => root.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
      if (visible && !reduce) { v.muted = true; v.play().catch(() => { /* fica o pôster */ }) } else v.pause()
    })
    if (typeof IntersectionObserver === 'undefined') { set(true); return }
    const io = new IntersectionObserver((es) => es.forEach((e) => set(e.isIntersecting)), { threshold: 0.3 })
    io.observe(root)
    return () => io.disconnect()
  }, [])
  return (
    <span className="k3c-media" ref={ref}>
      <span className="k3c-kids-art" aria-hidden="true" data-home-kids-placeholder="1" />
      {HOME_KIDS_CARD_CLIP
        ? <video src={HOME_KIDS_CARD_CLIP.src} poster={HOME_KIDS_CARD_CLIP.poster} muted loop playsInline preload="none" disablePictureInPicture aria-hidden="true" tabIndex={-1} />
        : null}
    </span>
  )
}

export default function HomeKidsCard({ signedIn }: { signedIn: boolean }) {
  const language = useInterfaceLanguage()
  const [title, line, cta] = homeKidsCardCopy(language)
  return (
    <Link href={homeKidsCardHref(signedIn)} className="k3c-card" data-home-card={HOME_KIDS_CARD_ID} onClick={() => { void trackEvent(HOME_CARD_EVENT, homeKidsCardClickMetadata(signedIn)) }}>
      <KidsMedia />
      <span className="k3c-shade" aria-hidden="true" />
      <span className="k3c-glass" aria-hidden="true" />
      <span className="k3c-badge" aria-hidden="true">{HOME_KIDS_CARD_BADGE}</span>
      <span className="k3c-body">
        <h2 className="k3c-title">{title}</h2>
        <p className="k3c-sub">{line}</p>
        <span className="btn btn-blue k3c-cta">{cta} <span className="k3c-arrow" aria-hidden="true">→</span></span>
      </span>
    </Link>
  )
}
