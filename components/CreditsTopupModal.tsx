'use client'

// KINEO-TOPUP-POPUP-2026-08-18 — tarefa do dia (fundador): "adicionar o pop
// de crédito caso a pessoa que gaste seus créditos queira mais SEM trocar de
// plano". Até hoje os packs one-time (topup40/120/100) só existiam enterrados
// no modal do /generate antigo; quem zerava créditos no Studio/Images/Audio
// batia num beco: erro de texto ou um link pro /pricing (que vende PLANO, não
// crédito). Este modal é a superfície única de recarga:
//   · Sidebar: o chip de créditos (+) abre isto em vez de navegar pro pricing
//   · Images/Audio: o 402 "Not enough credits" abre isto direto
// Regras herdadas das outras superfícies de venda (mesma tabela, mesma moeda):
//   · preços SEMPRE de TOPUP_PRICES/TOPUP_CREDITS (a tabela que a rota Stripe
//     cobra) — nunca dígitos à mão (causa-raiz de 3 bugs de pricing passados)
//   · moeda via /api/geo com '—' enquanto resolve (nunca mostrar USD e trocar
//     o número na cara do comprador)
//   · checkout via useCheckoutLaunch (telemetria + guard de duplo clique)
import { useEffect, useState } from 'react'
import {
  TOPUP_CREDITS,
  TOPUP_PRICES,
  formatCheckoutMoney,
  type CheckoutCurrency,
  type TopupId,
} from '@/lib/checkoutPricing'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { creditCostFor } from '@/lib/credits/engineCost'

const PACKS: Array<{ id: TopupId; badge?: string }> = [
  { id: 'topup40' },
  { id: 'topup120' },
  { id: 'topup100' },
  // KINEO-TOPUP300-2026-08-20 — o pacote que compra DOIS Kling 3, o motor da
  // vitrine. Vira o destacado: é o único que compra um filme inteiro do topo
  // do catálogo, e "Best value" agora é verdade literal (menor $/crédito dos
  // quatro). O selo velho estava no topup100, que não compra Kling nenhum.
  { id: 'topup300', badge: 'Best value' },
]

export default function CreditsTopupModal({
  onClose,
  surface,
}: {
  onClose: () => void
  /** telemetry surface, e.g. 'sidebar_chip' | 'images_402' | 'audio_402' */
  surface: string
}) {
  const checkout = useCheckoutLaunch(`credits_topup_modal_${surface}`)
  const [currency, setCurrency] = useState<CheckoutCurrency | null>(null)
  const [credits, setCredits] = useState<number | null>(null)

  // Moeda do comprador — mesma regra do UpgradeModal/PricingCards: rótulo
  // segura no '—' até o /api/geo responder; a COBRANÇA é re-resolvida
  // server-side pelo IP de qualquer forma.
  useEffect(() => {
    let cancelled = false
    void fetch('/api/geo', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (r) => (r.ok ? (r.json() as Promise<{ currency?: string }>) : Promise.reject()))
      .then(({ currency: c }) => {
        if (!cancelled) setCurrency('usd') // KINEO-USD-ONLY-2026-08-19
      })
      .catch(() => {
        if (!cancelled) setCurrency('usd')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Saldo atual — best effort, só pro cabeçalho ("You have N credits left").
  useEffect(() => {
    let cancelled = false
    void fetch('/api/credits', { cache: 'no-store' })
      .then(async (r) => (r.ok ? (r.json() as Promise<{ credits?: number }>) : Promise.reject()))
      .then((d) => {
        if (!cancelled && typeof d.credits === 'number') setCredits(d.credits)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

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
      style={{ background: 'rgba(8,8,15,.88)', backdropFilter: 'blur(20px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Add credits"
    >
      <div
        className="w-full max-w-lg rounded-2xl p-7 relative"
        style={{ background: '#1d1d1f', border: '1px solid #2a2a2d', boxShadow: '0 0 80px rgba(0,0,0,.5)' }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ background: 'rgba(255,255,255,.04)', border: '1px solid #2a2a2d', color: '#86868b', cursor: 'pointer' }}
        >
          <span aria-hidden="true">✕</span>
        </button>

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
          style={{ background: 'rgba(41,151,255,.12)', border: '1px solid rgba(41,151,255,.25)', color: '#2997ff' }}
        >
          <span aria-hidden="true">⚡</span>
          {credits !== null ? `${credits} ${credits === 1 ? 'credit' : 'credits'} left` : 'Credits'}
        </div>

        <h2 className="text-2xl font-black mb-1 tracking-tight" style={{ color: '#f5f5f7' }}>
          Keep your plan. <span className="grad-text">Add credits.</span>
        </h2>
        <p className="text-sm mb-6" style={{ color: '#86868b' }}>
          One-time packs, added to your balance instantly after payment. No subscription change.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          {PACKS.map(({ id, badge }) => {
            const cr = TOPUP_CREDITS[id]
            const price = currency ? formatCheckoutMoney(currency, TOPUP_PRICES[id][currency]) : '—'
            // KINEO-PRICING-V6-2026-08-19 — o divisor era o literal 20 (custo
            // do Seedance). Ele está certo HOJE, e é exatamente esse o
            // problema: o custo do motor mora em lib/credits/engineCost.ts e
            // muda em commits que ninguém pensa em cruzar com este arquivo.
            // Com o topup100 caindo de 100 → 75 créditos nesta mesma rodada,
            // a linha "≈ N AI films" já mudou de valor sozinha (5 → 3) — que é
            // exatamente o comportamento que se quer de um número derivado.
            const films = Math.floor(cr / creditCostFor('cinematic_ai', true))
            // KINEO-POPUP-AUDIT-2026-08-25 — o rótulo agora vende o OMNI FLASH
            // (mesmos 150cr do Kling 3, mas é o #1 do ranking de agosto e o
            // motor da campanha do dia). Derivado, nunca cravado.
            const kling3 = Math.floor(cr / creditCostFor('cinematic_omni', true))
            const highlighted = !!badge
            return (
              <button
                key={id}
                type="button"
                disabled={checkout.pending !== null}
                onClick={() => {
                  checkout.launch(id, `/api/stripe/checkout?pack=${id}`, {
                    pack: id,
                    pricing_surface: `credits_topup_modal_${surface}`,
                  })
                }}
                style={{
                  flex: 1,
                  position: 'relative',
                  padding: '18px 10px 14px',
                  borderRadius: 14,
                  cursor: checkout.pending ? 'not-allowed' : 'pointer',
                  opacity: checkout.pending && checkout.pending !== id ? 0.55 : 1,
                  background: highlighted ? 'rgba(41,151,255,0.13)' : 'rgba(255,255,255,0.03)',
                  border: highlighted ? '1px solid rgba(41,151,255,0.55)' : '1px solid rgba(255,255,255,0.1)',
                  color: '#f5f5f7',
                  textAlign: 'center',
                  transition: 'border-color .15s ease, transform .15s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(41,151,255,0.6)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = highlighted
                    ? 'rgba(41,151,255,0.55)'
                    : 'rgba(255,255,255,0.1)'
                }}
              >
                {badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -9,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: '#0a0a0b',
                      background: '#2997ff',
                      borderRadius: 999,
                      padding: '2px 9px',
                    }}
                  >
                    ⭐ {badge}
                  </span>
                )}
                {checkout.pending === id ? (
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800 }}>Loading…</span>
                ) : (
                  <>
                    <span style={{ display: 'block', fontSize: '1.15rem', fontWeight: 900, color: highlighted ? '#5cb3ff' : '#f5f5f7' }}>
                      {price}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginTop: 2 }}>+{cr} credits</span>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: '#86868b', marginTop: 2 }}>
                      {kling3 >= 1 ? `${kling3} Omni Flash ${kling3 === 1 ? 'film' : 'films'} (#1 model)` : `≈ ${films} AI ${films === 1 ? 'film' : 'films'}`}
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        {checkout.error && (
          <p role="alert" style={{ fontSize: '0.74rem', fontWeight: 600, color: '#ff6b6b', textAlign: 'center', margin: '10px 0 0' }}>
            {checkout.error}
          </p>
        )}

        <p style={{ fontSize: '0.74rem', color: '#86868b', textAlign: 'center', margin: '16px 0 0' }}>
          Need more every month?{' '}
          <a href="/pricing" style={{ color: '#7cc0ff', fontWeight: 700, textDecoration: 'none' }}>
            Upgrade your plan →
          </a>
        </p>
      </div>
    </div>
  )
}
