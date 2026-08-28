'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'

type PublicVideoCtaLinkProps = {
  href: string
  videoId: string
  children: ReactNode
  style?: CSSProperties
  /** Rótulo de posição na página — separa a CTA da dobra da do rodapé. */
  placement?: string
  /** Real next step. The CTA may now deliver value before asking for signup. */
  destination?: string
}

// KINEO-SHARE-LANDING-CEGA-2026-08-17 — POR QUE ESTE ARQUIVO GANHOU UM OBSERVER.
//
// O /v/[id] é a página que recebe TODO link compartilhado, e o número dela em
// 30 dias é: 234 sessões → 7 cliques nesta CTA (3,0%) → 0 chegadas ao /signup →
// 0 contas (`profiles.signup_utm_source='public_video'` = 0 na história toda,
// contra 510 perfis com utm nos últimos 30 dias — o instrumento existe e mede).
//
// Com só `public_video_cta_clicked` no ar, "3%" tem DUAS leituras que pedem
// consertos opostos (é a lição nº 6 do PROMPT-DIARIO):
//   · a pessoa VIU o convite e não quis  → o problema é a oferta/copy;
//   · a pessoa nunca VIU o convite       → o problema é geometria.
// E a geometria é suspeita por construção: acima da CTA existem breadcrumb,
// H1, subtítulo e um player 9:16 (até 380px de largura ⇒ ~675px de altura).
// Num telefone isso já passa da dobra antes de o botão começar.
//
// `public_video_cta_viewed` é o denominador que falta. Ele NÃO decide nada
// hoje: decide o conserto de amanhã, e custa um observer.
//
// Latch por (videoId, placement) em escopo de módulo: a página monta esta CTA
// três vezes e a navegação entre /v/ é client-side (o trilho "More scripts
// like this" usa <Link>), então um ref de componente contaria de novo a cada
// re-render e um latch global mataria a medição do segundo vídeo. A chave
// composta conta UMA vez por vídeo por posição, que é a unidade que responde
// "qual delas a pessoa realmente alcança".
const seenImpressions = new Set<string>()

// PUSH #23 — measures the public-video landing → next-value-step before
// navigation. `destination` keeps signup and no-signup remix CTAs distinct.
export default function PublicVideoCtaLink({
  href,
  videoId,
  children,
  style,
  placement = 'unknown',
  destination = '/signup',
}: PublicVideoCtaLinkProps) {
  const ref = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    const element = ref.current
    const key = `${videoId}::${placement}`
    if (!element || seenImpressions.has(key)) return
    // Sem IntersectionObserver (navegador antigo) a página segue funcionando
    // exatamente como antes: só não há medição. Nunca falhar para o lado de
    // quebrar a CTA — ela é a única porta para o produto nesta página.
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        // ratio ≥ 0.5 = metade do botão dentro da janela. "Apareceu 1px no
        // canto" não é ter visto, e este número vira denominador de conversão.
        if (!entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) return
        if (seenImpressions.has(key)) return
        seenImpressions.add(key)
        void trackEvent('public_video_cta_viewed', {
          video_id: videoId,
          placement,
          destination,
        })
        observer.disconnect()
      },
      { threshold: [0.5] },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [videoId, placement, destination])

  return (
    <Link
      ref={ref}
      href={href}
      style={style}
      onClick={() => {
        void trackEvent('public_video_cta_clicked', {
          video_id: videoId,
          placement,
          destination,
        })
      }}
    >
      {children}
    </Link>
  )
}
