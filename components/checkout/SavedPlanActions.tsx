
'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { PricingPlanChoiceBilling } from '@/lib/growth/pricingPlanChoiceAttribution'
import './saved-plan-actions.css'

const SavedPlanRelease = createContext(false)

export function SavedPlanReleaseProvider({ children }: { children: ReactNode }) {
  return <SavedPlanRelease.Provider value>{children}</SavedPlanRelease.Provider>
}

export function useSavedPlanRelease() {
  return useContext(SavedPlanRelease)
}

export function shouldPrioritizeSavedPlan(enabled: boolean, tier: string | null, hasAlternative: boolean) {
  return enabled && hasAlternative && (tier === 'basic' || tier === 'pro')
}

export default function SavedPlanActions({ plan, billing, smallerPlan, pending, error, onContinue, onSmallerPlan }: {
  plan: string
  billing: PricingPlanChoiceBilling
  smallerPlan: string
  pending: boolean
  error: string | null
  onContinue: () => void
  onSmallerPlan: () => void
}) {
  return <section className="checkout-saved-plan" aria-label="Your selected plan">
    <h2>{plan} · {billing === 'annual' ? 'Annual billing' : 'Monthly billing'}</h2>
    <p>See the current total in secure checkout before paying.</p>
    <button type="button" className="checkout-saved-plan-primary" disabled={pending} onClick={onContinue}>
      {pending ? 'Opening secure checkout…' : `Continue with ${plan}`}
    </button>
    {error && <p className="checkout-saved-plan-error" role="alert">{error}</p>}
    <button type="button" className="checkout-saved-plan-secondary" disabled={pending} onClick={onSmallerPlan}>
      {smallerPlan} monthly instead
    </button>
  </section>
}
