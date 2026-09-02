'use client'

// sprint-assinaturas #13 — a parede de "zerou o saldo" para quem NAO pode
// comprar recarga (trial/free/starter) no /images e no /audio. Ate hoje o 402
// abria o CreditsTopupModal para qualquer plano; o pack levava ao
// `topup_requires_creator_plus` do checkout e a pessoa caia no /pricing com
// erro vermelho. Este modal mostra os 3 planos com o numero que importa para
// ela ("40 cr/mo = 20 images") e manda ao /pricing com utm. Numeros e copy vem
// de lib/credits/outOfCreditsPlans.ts (derivados; nunca digitados aqui).
// Creator/Studio continuam no CreditsTopupModal — quem decide e o chamador,
// pela mesma regra do checkout (outOfCreditsDestination).
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  outOfCreditsBody,
  outOfCreditsHeadline,
  outOfCreditsPricingHref,
  planRowLabel,
  planRowsForUnit,
  type OutOfCreditsProduct,
} from '@/lib/credits/outOfCreditsPlans'

export default function OutOfCreditsPlansModal({
  product,
  unitCost,
  credits,
  plan,
  madeThisSession,
  onClose,
}: {
  product: OutOfCreditsProduct
  unitCost: number
  credits: number | null
  plan: string
  madeThisSession: number
  onClose: () => void
}) {
  const rows = planRowsForUnit(unitCost)
  const href = outOfCreditsPricingHref(product)
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    void trackEvent(`${product}_paywall_shown`, {
      reason: 'insufficient_402',
      destination: 'pricing',
      plan,
      credits,
      unit_cost: unitCost,
      made_this_session: madeThisSession,
    })
  }, [product, plan, credits, unitCost, madeThisSession])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,8,15,.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Out of credits"
      data-out-of-credits={product}
    >
      <div
        className="w-full max-w-md rounded-2xl p-7 relative"
        style={{ background: '#1d1d1f', border: '1px solid rgba(41,151,255,.45)', boxShadow: '0 0 80px rgba(0,0,0,.5), 0 0 40px rgba(41,151,255,.12)' }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ background: 'rgba(255,255,255,.04)', border: '1px solid #2a2a2d', color: '#86868b', cursor: 'pointer' }}
        >
          <span aria-hidden="true">✕</span>
        </button>

        <h2 className="text-xl font-black mb-1 tracking-tight" style={{ color: '#f5f5f7', paddingRight: 36 }}>
          {outOfCreditsHeadline(product, madeThisSession)}
        </h2>
        <p className="text-sm mb-5" style={{ color: '#86868b', lineHeight: 1.5 }}>
          {outOfCreditsBody({ product, destination: 'pricing', credits, unitCost })}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {rows.map((r) => (
            <div
              key={r.tier}
              data-plan-row={r.tier}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
                padding: '9px 12px', borderRadius: 10, fontSize: 13,
                background: r.highlighted ? 'rgba(41,151,255,.13)' : 'rgba(255,255,255,.03)',
                border: r.highlighted ? '1px solid rgba(41,151,255,.55)' : '1px solid rgba(255,255,255,.08)',
                color: '#f5f5f7',
              }}
            >
              <span style={{ fontWeight: 800 }}>{r.name}</span>
              <span style={{ color: '#86868b' }}>
                {r.credits} cr/mo = <b style={{ color: r.highlighted ? '#5cb3ff' : 'inherit' }}>{planRowLabel(product, r).split(' = ')[1]}</b>
              </span>
              <span style={{ fontWeight: 800 }}>{r.price}/mo</span>
            </div>
          ))}
        </div>

        <a
          href={href}
          onClick={() => {
            void trackEvent(`${product}_paywall_cta`, {
              reason: 'insufficient_402',
              destination: 'pricing',
              plan,
              credits,
              unit_cost: unitCost,
            })
          }}
          className="block w-full text-center rounded-xl py-3 font-black text-sm"
          style={{ background: 'linear-gradient(135deg,#2997ff,#5cb3ff)', color: '#0b0b0f', textDecoration: 'none' }}
        >
          ⚡ See plans
        </a>
        <p style={{ fontSize: '0.74rem', color: '#86868b', textAlign: 'center', margin: '12px 0 0' }}>
          Every plan works across video, images and audio — one balance.
        </p>
      </div>
    </div>
  )
}
