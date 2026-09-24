'use client'

// KINEO-EMPRESAS-DFY-2026-09-23 — o cartão "quer que a gente faça?" dentro do
// Studio, no instante em que alguém escreve um pedido de anúncio de empresa.
//
// POR QUÊ (ver o cabeçalho de lib/growth/dfyOffer.ts): nove pedidos de anúncio
// de empresa foram escritos no Studio em setembro, metade vindos do ChatGPT
// com briefing completo. Todos receberam um Short de curiosidades e saíram
// com 0 crédito. O fundador fixou US$100 por filme e mandou VENDER ANTES DE
// CONSTRUIR: Payment Link da Stripe, cartão aqui, os 3 primeiros à mão.
//
// O QUE ESTE CARTÃO DECIDE: nada. `isDfyOfferLive()` (o interruptor: URL do
// Payment Link vazia = cartão desligado em produção, o código sobe pronto),
// `isDfyCandidate(prompt)` (a regex estrita) e `dfyPaymentLink()` moram no
// módulo puro. Aqui só se pinta, se abre o link em nova aba e se mede:
// `dfy_card_shown` UMA vez por MONTAGEM (ref booleana — a v1 deduplicava por
// hash do prompt e cada tecla que mantinha o texto candidato gerava outra
// impressão; memória "evento por tecla infla o denominador") e `dfy_card_clicked`. O render normal continua ao alcance da pessoa
// — o cartão fica ANTES do botão Generate e não o esconde.
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  DFY_OFFER_VERSION,
  dfyCardCopy,
  dfyPaymentLink,
  isDfyCandidate,
  isDfyOfferLive,
} from '@/lib/growth/dfyOffer'

export default function DfyOfferCard({
  prompt,
  userId,
  email = null,
  source,
}: {
  prompt: string
  userId: string | null
  email?: string | null
  source: string
}) {
  const live = isDfyOfferLive()
  const candidate = live && isDfyCandidate(prompt)
  const href = candidate ? dfyPaymentLink({ userId, email, source }) : null
  const shownRef = useRef(false)

  useEffect(() => {
    if (!candidate || !href || shownRef.current) return
    shownRef.current = true
    try {
      void trackEvent('dfy_card_shown', {
        source,
        version: DFY_OFFER_VERSION,
        prompt_len: prompt.trim().length,
      })
    } catch {
      /* telemetria nunca derruba a tela */
    }
  }, [candidate, href, prompt, source])

  if (!candidate || !href) return null
  const copy = dfyCardCopy()

  return (
    <section
      data-kineo="dfy-offer-card"
      data-version={DFY_OFFER_VERSION}
      className="gv-card rounded-2xl p-5 sm:p-6 mb-6"
      style={{ background: '#131316', border: '1px solid rgba(41,151,255,.35)' }}
    >
      <div className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: '#5cb3ff' }}>
        {copy.eyebrow}
      </div>
      <h3 className="font-black text-base sm:text-lg mb-1.5" style={{ color: 'var(--text)', lineHeight: 1.25 }}>
        {copy.title}
      </h3>
      <p className="text-sm mb-3" style={{ color: 'var(--muted2)', lineHeight: 1.55 }}>
        {copy.body}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          try {
            void trackEvent('dfy_card_clicked', { source, version: DFY_OFFER_VERSION })
          } catch {
            /* ignore */
          }
        }}
        className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-black"
        style={{ background: '#2997ff', color: '#fff', textDecoration: 'none', boxShadow: '0 8px 28px rgba(41,151,255,.3)' }}
      >
        {copy.cta}
      </a>
      <p className="text-xs mt-2.5" style={{ color: 'var(--muted)' }}>
        {copy.fine}
      </p>
    </section>
  )
}
