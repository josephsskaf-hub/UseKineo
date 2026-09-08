'use client'

// KINEO-VERSAO-B-CONTINUE-NOW-2026-09-08 — quem está no trial de $1 e ficou sem
// crédito (ou quase) pode virar cliente agora, sem esperar o dia 8: um clique
// encerra o trial na Stripe, cobra o mês e o webhook concede os créditos do
// plano. Mostrada no topo de toda tela autenticada, só para `*_trial` com
// saldo baixo. Preço e créditos vêm da fonte única; nunca digitados.

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'

export const CONTINUE_NOW_LOW_CREDITS = 20

export default function TrialContinueNowBanner({ plan, credits }: { plan: string | null; credits: number | null }) {
  const inTrial = typeof plan === 'string' && plan.toLowerCase().endsWith('_trial')
  const low = typeof credits === 'number' && credits < CONTINUE_NOW_LOW_CREDITS
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  if (!inTrial || !low || state === 'done') return null
  const price = formatCheckoutMoney('usd', TIER_PRICES.basic.usd)
  const grant = TIER_CREDITS.basic

  async function continueNow() {
    if (state === 'busy') return
    setState('busy')
    void trackEvent('card_trial_continue_now_clicked', { credits, plan })
    try {
      const r = await fetch('/api/stripe/end-trial-now', { method: 'POST', credentials: 'same-origin' })
      if (!r.ok) throw new Error(String(r.status))
      setState('done')
      void trackEvent('card_trial_continue_now_ok', { credits, plan })
      // o webhook concede em segundos; recarrega para ler o saldo novo
      setTimeout(() => { try { window.location.reload() } catch { /* ignore */ } }, 2500)
    } catch (e) {
      setState('error')
      void trackEvent('card_trial_continue_now_failed', { credits, plan, error: e instanceof Error ? e.message : 'unknown' })
    }
  }

  return (
    <div
      data-trial-continue-now="v1"
      style={{
        margin: '12px 16px 0',
        padding: '12px 16px',
        borderRadius: 12,
        background: 'rgba(52,211,153,.10)',
        border: '1px solid rgba(52,211,153,.45)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 240 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>
          {typeof credits === 'number' && credits <= 0 ? 'Your trial credits are used up.' : `Only ${credits} trial credits left.`}
        </div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: 'rgba(255,255,255,.75)' }}>
          Continue now: {price} today for {grant} credits, then {price}/month. Or wait — your plan starts automatically when the trial ends.
        </div>
        {state === 'error' && (
          <div style={{ marginTop: 4, fontSize: 12, color: '#fca5a5' }}>Could not charge right now. Your trial is unchanged — try again in a minute.</div>
        )}
      </div>
      <button
        type="button"
        data-testid="trial-continue-now"
        disabled={state === 'busy'}
        onClick={() => { void continueNow() }}
        style={{ background: '#34d399', color: '#000', border: 0, borderRadius: 999, padding: '10px 16px', fontSize: 13.5, fontWeight: 800, cursor: state === 'busy' ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
      >
        {state === 'busy' ? 'Charging…' : `Continue now — ${price}`}
      </button>
    </div>
  )
}
