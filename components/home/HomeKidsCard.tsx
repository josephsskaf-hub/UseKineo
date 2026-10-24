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
import { HOME_KIDS_CARD_ID, HOME_KIDS_CARD_POSITION, homeKidsCardClickMetadata, homeKidsCardCopy, homeKidsCardHref } from '@/lib/ui/homeKidsCard' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"] — posição padrão preservada.

import HomeCardCycleMedia from '@/components/home/HomeCardCycleMedia' // KINEO-CARDS-GIRO-2410

function KidsMedia() {
  const language = useInterfaceLanguage()
  return <HomeCardCycleMedia card="kids_cartoon" language={language} />
}

export default function HomeKidsCard({ signedIn, position = HOME_KIDS_CARD_POSITION }: { signedIn: boolean; position?: number }) { // KINEO-PAGINAS-IA-CLARAS-2110 — a faixa passa a posição real; usos antigos continuam em 4.
  const language = useInterfaceLanguage()
  const [title, line, cta] = homeKidsCardCopy(language)
  return (
    <Link href={homeKidsCardHref(signedIn)} className="k3c-card" data-home-card={HOME_KIDS_CARD_ID} onClick={() => { void trackEvent(HOME_CARD_EVENT, { ...homeKidsCardClickMetadata(signedIn), position }) }}>
      <KidsMedia />
      <span className="k3c-shade" aria-hidden="true" />
      <span className="k3c-glass" aria-hidden="true" />
      {/* KINEO-HOME-CARDS-CLAROS-2010 — sem o selo do motor (fundador 21/10: "pode tirar o motor de todos os cards desses 4 primeiros"); era: <span className="k3c-badge" aria-hidden="true">{HOME_KIDS_CARD_BADGE}</span> */}
      <span className="k3c-body">
        <h2 className="k3c-title">{title}</h2>
        <p className="k3c-sub">{line}</p>
        <span className="btn btn-blue k3c-cta">{cta} <span className="k3c-arrow" aria-hidden="true">→</span></span>
      </span>
    </Link>
  )
}
