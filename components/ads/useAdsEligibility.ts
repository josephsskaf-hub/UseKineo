'use client'
// KINEO-ADS-SIMPLES-2810 — o estado da régua única do Studio Ads no navegador (GET /api/ads/v2/eligibility), para páginas que
// não sabem quem olha (home estática, páginas do UGC). Sem sessão não chama nada (o visitante segue pelo cadastro e vê "grátis",
// como antes). Erro de rede = null ("não sei": o rótulo fica o de antes). Nunca grava nada.
import { useEffect, useState } from 'react'
import type { AdsEligibilityReason, AdsEligibilityState } from '@/lib/ads/eligibilityPure'

export interface AdsEligibilityView { state: AdsEligibilityState; reason: AdsEligibilityReason }

export function useAdsEligibility(signedIn: boolean): AdsEligibilityView | null {
  const [view, setView] = useState<AdsEligibilityView | null>(null)
  useEffect(() => {
    if (!signedIn || typeof fetch !== 'function') return // sem fetch (render de servidor/harness) = o rótulo de antes
    let alive = true
    fetch('/api/ads/v2/eligibility', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { state?: unknown; reason?: unknown } | null) => {
        if (!alive || !d || typeof d.state !== 'string') return
        setView({ state: d.state as AdsEligibilityState, reason: (typeof d.reason === 'string' ? d.reason : null) as AdsEligibilityReason })
      })
      .catch(() => { /* sem resposta = o rótulo de antes */ })
    return () => { alive = false }
  }, [signedIn])
  return view
}
