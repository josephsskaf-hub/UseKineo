'use client'

// KINEO-PH-WELCOME-2026-08-04 — tapete de boas-vindas do Product Hunt.
// POR QUE: launch day (ter 04/08 00:01 PT). Visitante de launch converte mais
// quando a página o RECONHECE — o banner fecha o loop "vim do PH → é aqui
// mesmo → o que eu ganho hoje". Só aparece com utm_source=producthunt ou
// ?ref=producthunt (o padrão que o PH anexa); para todo o resto do tráfego a
// landing não muda em nada. Client-only + useEffect para não tocar no SSR/
// cache da home. Some sozinho quando o tráfego do launch acabar — sem prazo,
// sem flag, sem manutenção.
import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { FreeTierCopy } from '@/components/FreeTierOfferProvider'

export default function PhWelcomeBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const src = `${q.get('utm_source') ?? ''} ${q.get('ref') ?? ''}`.toLowerCase()
      if (src.includes('producthunt') || src.includes('product-hunt')) {
        setShow(true)
        void trackEvent('ph_welcome_banner_shown')
      }
    } catch { /* ignore */ }
  }, [])

  if (!show) return null

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(218,85,44,.16), rgba(41,151,255,.14))',
        borderBottom: '1px solid rgba(218,85,44,.35)',
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '13.5px',
        fontWeight: 700,
        color: '#f5f5f7',
      }}
    >
      <FreeTierCopy legacy="Welcome, Product Hunters — make 3 free Shorts today. No card, no watermark tricks." on="Welcome, Product Hunters — your Creator trial starts now: 40 free credits. No card, no tricks." />{' '}
      <a
        href="/signup?utm_source=producthunt&intent_campaign=ph_launch_banner"
        onClick={() => { void trackEvent('ph_welcome_banner_clicked') }}
        style={{ color: '#5cb3ff', textDecoration: 'underline', fontWeight: 800 }}
      >
        Start free →
      </a>
      {/*
        KINEO-PH-PROMO-LINE-2026-08-04 (Ordem I, item 2) — a linha do cupom.
        Redação DELIBERADA: "use code PRODUCTHUNT at checkout", e o link leva a
        /pricing?promo=PRODUCTHUNT. Não diz "aplicado automaticamente" porque o
        dashboard da Stripe estava em erro na hora e não deu para confirmar que
        o CÓDIGO PROMOCIONAL (não o cupom) existe — o cupom eu vi na lista, o
        promotion code não. Se ele não existir, o checkout ignora o promo em
        silêncio (route.ts) e a pessoa cai no preço cheio: com esta redação ela
        ainda tem o campo de cupom do próprio Stripe Checkout para digitar o
        código, então o pior caso é fricção, não promessa quebrada.
      */}
      <span style={{ display: 'block', marginTop: 4, fontWeight: 600, opacity: .92 }}>
        Staying? Use code{' '}
        <a
          href="/pricing?promo=PRODUCTHUNT&utm_source=producthunt&intent_campaign=ph_launch_banner"
          onClick={() => { void trackEvent('ph_welcome_banner_promo_clicked') }}
          style={{ color: '#5cb3ff', textDecoration: 'underline', fontWeight: 800 }}
        >
          PRODUCTHUNT
        </a>{' '}
        at checkout — 30% off your first 3 months.
      </span>
    </div>
  )
}
