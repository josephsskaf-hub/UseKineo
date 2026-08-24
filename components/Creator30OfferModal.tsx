'use client'

// KINEO-CREATOR30-2026-08-24 — modal de 30% off no Creator (1ª fatura) para a
// coorte do print do fundador. Ver a história em
// app/api/me/creator30-offer/route.ts — em resumo: 10 contas que tentaram
// usar o produto e foram mal atendidas (crédito preso #299 ou trial vencido).
//
// Desenho, e por quê:
//   · SÓ aparece para quem a rota confirmar — zero suposição no cliente. A
//     rota falha para {eligible:false}, então bug de rede = sem modal, nunca
//     modal errado.
//   · Uma vez por dispositivo (localStorage) + morre sozinho em 31/08 — a
//     lição do modal do trial que "se autodestruía" (#60) foi na direção
//     oposta: aqui o descarte é DESEJADO, oferta relâmpago que reaparece
//     todo dia vira ruído de site desesperado.
//   · CTA leva a /pricing?promo=CREATOR30 — o MESMO fluxo auto-provisionado
//     do checkout; o modal não fala um preço que o caixa não cobre (a regra
//     do dia: nunca prometer o que o produto não executa).
//   · Cantos 10px, fundo escuro — padrão vitrine aprovado dos modais (#273).

import { useEffect, useState } from 'react'
import { formatCheckoutMoney, TIER_PRICES } from '@/lib/checkoutPricing'

const SEEN_KEY = 'kineo_creator30_seen'

export default function Creator30OfferModal() {
  const [open, setOpen] = useState(false)
  // KINEO-CREATOR50-2026-08-24 — o modal virou bilíngue de desconto: o
  // servidor diz QUAL oferta esta conta tem (CREATOR30 ou CREATOR50) e o
  // percentual. A tela nunca decide desconto sozinha — mesma disciplina do
  // preço derivado (#296): o modal só repete o que o caixa sabe cobrar.
  const [promo, setPromo] = useState<'CREATOR30' | 'CREATOR50'>('CREATOR30')
  const [percent, setPercent] = useState(30)

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) return
    } catch {
      // storage indisponível — mostra mesmo assim nesta visita
    }
    let cancelled = false
    void fetch('/api/me/creator30-offer', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ eligible?: boolean; promo?: string; percent?: number }>) : { eligible: false }))
      .then((json) => {
        if (cancelled || json?.eligible !== true) return
        if (json.promo === 'CREATOR50') setPromo('CREATOR50')
        if (typeof json.percent === 'number' && json.percent > 0 && json.percent < 100) setPercent(json.percent)
        setOpen(true)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  function dismiss() {
    setOpen(false)
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()))
    } catch {
      // pior caso: reaparece na próxima visita
    }
  }

  if (!open) return null

  const full = formatCheckoutMoney('usd', TIER_PRICES.basic.usd)
  const discounted = formatCheckoutMoney('usd', Math.round(TIER_PRICES.basic.usd * (1 - percent / 100)))

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(0,0,0,.74)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111114',
          border: '1px solid #2a2a2d',
          borderRadius: 10,
          padding: '28px 30px',
          width: 460,
          maxWidth: '94vw',
        }}
      >
        <p style={{ color: '#2997ff', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Only for your account · ends Aug 31
        </p>
        <h2 style={{ color: '#f5f5f7', fontSize: 22, fontWeight: 900, lineHeight: 1.2, marginBottom: 10 }}>
          {percent}% off your first month of Creator
        </h2>
        <p style={{ color: '#a1a1a8', fontSize: 14, lineHeight: 1.55, marginBottom: 6 }}>
          Your first videos deserved a smoother start than we gave you. So here it is, made right:
          Creator for <b style={{ color: '#f5f5f7' }}>{discounted}</b>{' '}
          <s style={{ color: '#5a5a60' }}>{full}</s> in the first month — 140 credits, every engine,
          watermark-free exports.
        </p>
        <p style={{ color: '#86868b', fontSize: 12, lineHeight: 1.5, marginBottom: 20 }}>
          Renews at the normal price after that. Cancel anytime. Discount applies automatically at checkout.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href={`/pricing?promo=${promo}&utm_source=${promo.toLowerCase()}_modal`}
            style={{
              flex: 1, textAlign: 'center', textDecoration: 'none',
              background: '#2997ff', color: '#fff',
              borderRadius: 8, padding: '12px 0',
              fontSize: 14, fontWeight: 900,
            }}
          >
            Claim 30% off →
          </a>
          <button
            type="button"
            onClick={dismiss}
            style={{
              background: 'transparent', border: '1px solid #2a2a2d',
              color: '#86868b', borderRadius: 8, padding: '12px 18px',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
