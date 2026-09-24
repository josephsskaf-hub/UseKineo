'use client'

// KINEO-EMPRESAS-DFY-2026-09-23 — o cartão "quer que a gente faça?" dentro do
// Studio, no instante em que alguém escreve um pedido de anúncio de empresa.
//
// POR QUÊ (ver o cabeçalho de lib/growth/dfyOffer.ts): onze pedidos de anúncio
// de empresa foram escritos no Studio em 90 dias, metade vindos do ChatGPT com
// briefing completo. Todos receberam um Short de curiosidades e saíram com 0
// crédito. O fundador mandou VENDER ANTES DE CONSTRUIR: Payment Link da Stripe,
// cartão aqui, os 3 primeiros à mão.
//
// KINEO-EMPRESAS-DOIS-DEGRAUS-2026-09-24 — Express US$35 e Pro US$75 (fundador,
// 24/09), um botão por degrau LIGADO. Sem degrau ligado o cartão não existe.
//
// O QUE ESTE CARTÃO DECIDE: nada. `isDfyOfferLive()` (interruptor por degrau),
// `isDfyCandidate(prompt)` (a regex estrita) e `dfyPaymentLink()` moram no
// módulo puro. Aqui só se pinta, se abre o link em nova aba e se mede:
// `dfy_card_shown` UMA vez por MONTAGEM (ref booleana — a v1 deduplicava por
// hash do prompt e cada tecla que mantinha o texto candidato gerava outra
// impressão; memória "evento por tecla infla o denominador") e
// `dfy_card_clicked` com o degrau. O render normal continua ao alcance da
// pessoa — o cartão fica ANTES do botão Generate e não o esconde.
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
  const copy = candidate ? dfyCardCopy() : null
  const options = copy
    ? copy.options
        .map((o) => ({ ...o, href: dfyPaymentLink({ tier: o.tier, userId, email, source }) }))
        .filter((o): o is typeof o & { href: string } => typeof o.href === 'string')
    : []
  const href = options.length > 0 ? options[0].href : null
  const shownRef = useRef(false)

  useEffect(() => {
    if (!candidate || !href || shownRef.current) return
    shownRef.current = true
    try {
      void trackEvent('dfy_card_shown', {
        source,
        version: DFY_OFFER_VERSION,
        tiers: options.map((o) => o.tier).join(','),
        prompt_len: prompt.trim().length,
      })
    } catch {
      /* telemetria nunca derruba a tela */
    }
  }, [candidate, href, prompt, source, options])

  if (!candidate || !href || !copy) return null

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
      <div className="flex flex-col gap-2.5">
        {options.map((o) => (
          <a
            key={o.tier}
            href={o.href}
            target="_blank"
            rel="noopener noreferrer"
            data-kineo-dfy-tier={o.tier}
            onClick={() => {
              try {
                void trackEvent('dfy_card_clicked', { source, version: DFY_OFFER_VERSION, tier: o.tier, price_minor: o.priceMinor })
              } catch {
                /* ignore */
              }
            }}
            className="block rounded-xl px-4 py-3 text-left"
            style={{
              background: o.tier === 'pro' ? '#2997ff' : 'rgba(41,151,255,.12)',
              color: o.tier === 'pro' ? '#fff' : 'var(--text)',
              textDecoration: 'none',
              border: '1px solid rgba(41,151,255,.45)',
            }}
          >
            <span className="block text-sm font-black">{o.cta}</span>
            <span className="block text-xs mt-1" style={{ color: o.tier === 'pro' ? 'rgba(255,255,255,.85)' : 'var(--muted2)', lineHeight: 1.45 }}>
              {o.detail}
            </span>
          </a>
        ))}
      </div>
      <p className="text-xs mt-2.5" style={{ color: 'var(--muted)' }}>
        {copy.fine}
      </p>
    </section>
  )
}
