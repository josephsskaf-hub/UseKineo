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
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'

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
      {/* KINEO-GRANT-COPY-UNICA-2026-08-17 — derivado; ver lib/freeTierOffer.ts. */}
      <FreeTierCopy legacy="Welcome, Product Hunters — make 3 free Shorts today. No card, no watermark tricks." on={`Welcome, Product Hunters — your Creator trial starts now: ${TRIAL_GRANT_CREDITS_COPY} free credits. Cancel in one click, no tricks.`} />{' '}
      <a
        href="/signup?utm_source=producthunt&intent_campaign=ph_launch_banner"
        onClick={() => { void trackEvent('ph_welcome_banner_clicked') }}
        style={{ color: '#5cb3ff', textDecoration: 'underline', fontWeight: 800 }}
      >
        Start free →
      </a>
      {/*
        ⚠️ KINEO-SEM-CUPOM-PUBLICO-2026-08-21 — A LINHA DO CUPOM SAIU DAQUI.
        (Era: "Use code PRODUCTHUNT at checkout — 30% off your first 3 months",
        KINEO-PH-PROMO-LINE-2026-08-04.)

        O QUE FOI MEDIDO HOJE, e o que derrubou a linha:
          · dos 9 clientes pagantes, ZERO usaram cupom — todos pagaram cheio;
          · 430 e-mails de campanha COM desconto produziram 1 venda.
        Cupom não vendeu nada aqui. Isso já bastaria para tirar.

        Mas o motivo de verdade é pior que "não funciona". A conclusão fechada
        do fundador (19/08) é que o vazamento do checkout é PERCEPÇÃO DE VALOR:
        a pessoa chega no pagamento, acha caro e sai. Desconto empurra essa
        percepção para BAIXO, não para cima — quem achou caro e recebe 30% off
        não conclui "que barato", conclui "então não valia aquilo". A gente
        estava pagando para piorar exatamente a métrica que precisa subir.
        No lugar do desconto, a âncora que subiu hoje na grade de preços:
        "$3,22 por filme pronto contra $30-75 de um editor freelancer".

        ⚠️ A DISTINÇÃO QUE ESTA MUDANÇA **NÃO** APAGA: o cupom do AFILIADO
        (20%, KINEO_AFFILIATE_20) continua de pé, de propósito. Ele não é
        desconto de desespero para quem já está aqui e não compra — é o preço
        de trazer alguém NOVO, e é a única forma de atribuir a venda quando o
        criador fala em vídeo e não dá para clicar em link (TikTok/Reels).
        Desconto que resgata cliente parado destrói valor; desconto que paga
        por um cliente que não existiria é custo de aquisição. Não confundir os
        dois na hora de "limpar os cupons".
      */}
    </div>
  )
}
