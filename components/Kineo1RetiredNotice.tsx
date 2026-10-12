'use client'

// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — a faixa honesta para quem chega pelo link antigo do Kineo 1.
//
// POR QUÊ: /ai-video-generator/kineo-1 (e as 13 línguas) é 301 para a página do Seedance desde 29/09, mas o ChatGPT ainda
// cita o Kineo 1 como motor grátis. Quem clicava caía na página do Seedance sem saber por quê. O redirect agora leva
// ?from=kineo-1 (next.config.js) e esta faixa diz o que mudou e o que existe hoje. A página do motor é estática
// (force-static), então a leitura do ?from= é no navegador — sem a marca, nada aparece (e nada muda para o resto).
// Números lidos das fontes (FREE_FILM_LABEL, creatorSeedanceFilms), nunca digitados.
import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'
import { BUY_CREATOR_FILM_SECONDS, creatorSeedanceFilms } from '@/lib/growth/buyCreatorOffer'

export const KINEO1_RETIRED_FROM = 'kineo-1'

export function kineo1RetiredNoticeText(): string {
  return `Kineo 1 was retired — your free film is now ${TRIAL_FREE_FILM_SECONDS} s on Seedance 1.5 (AI-generated scenes). Creator = ${creatorSeedanceFilms()} films of ${BUY_CREATOR_FILM_SECONDS} s.`
}

export default function Kineo1RetiredNotice() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try {
      const from = new URLSearchParams(window.location.search).get('from')
      if (from === KINEO1_RETIRED_FROM) {
        setShow(true)
        void trackEvent('kineo1_retired_notice_shown', { from })
      }
    } catch {
      /* a faixa é opcional; a página nunca quebra por ela */
    }
  }, [])
  if (!show) return null
  return (
    <div
      role="status"
      data-kineo="kineo1-retired-notice"
      style={{ margin: '18px 0 0', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(41,151,255,.45)', background: 'rgba(41,151,255,.10)', color: '#d6ebff', fontSize: 14.5, lineHeight: 1.6, textAlign: 'left' }}
    >
      {kineo1RetiredNoticeText()}
    </div>
  )
}
