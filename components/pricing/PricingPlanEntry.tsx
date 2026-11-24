'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { formatCheckoutMoney, getAnnualPrice, getTierPrice, TIER_CREDITS, type CheckoutCurrency, type PriceRegion } from '@/lib/checkoutPricing'
import { planSettlementAmountMinor, settlementNote, type SettlementCurrency } from '@/lib/settlementCurrency'
import { pricingTierCardId } from '@/lib/growth/pricingTierHandoff'
import type { PricingPlanChoiceBilling } from '@/lib/growth/pricingPlanChoiceAttribution'
import './pricing-plan-entry.css'

const PricingPlanEntryVisibility = createContext(false)

export function PricingPlanEntryProvider({ visible, children }: { visible: boolean; children: ReactNode }) {
  return <PricingPlanEntryVisibility.Provider value={visible}>{children}</PricingPlanEntryVisibility.Provider>
}

const PLAN_NAMES = { starter: 'Starter', basic: 'Creator', pro: 'Studio' } as const
type EntryTier = keyof typeof PLAN_NAMES
const PLAN_ORDER: readonly EntryTier[] = ['starter', 'basic', 'pro']
const CREATOR_FIRST: readonly EntryTier[] = ['basic', 'starter', 'pro']

export default function PricingPlanEntry({
  billing, currency, region, settlement, creatorFirst, onChoose,
}: {
  billing: PricingPlanChoiceBilling
  currency: CheckoutCurrency | null
  region: PriceRegion
  settlement: SettlementCurrency
  creatorFirst: boolean
  onChoose: (tier: EntryTier) => void
}) {
  if (!useContext(PricingPlanEntryVisibility)) return null
  const annual = billing === 'annual'
  const readAmount = annual ? getAnnualPrice : getTierPrice
  const period = annual ? 'yr' : 'mo'

  return <section className="pricing-plan-entry" aria-labelledby="pricing-plan-entry-title">
    <div className="pricing-plan-entry-heading">
      <h2 id="pricing-plan-entry-title">Compare starting prices</h2>
      <span>Standard prices before offers</span>
    </div>
    <ul className="pricing-plan-entry-list">
      {(creatorFirst ? CREATOR_FIRST : PLAN_ORDER).map(tier => {
        const name = PLAN_NAMES[tier]
        const amount = currency === null ? null : formatCheckoutMoney(currency, readAmount(tier, currency, region))
        const localAmount = currency !== null && settlement === 'brl' ? settlementNote(
          planSettlementAmountMinor(tier, billing, settlement, readAmount(tier, 'usd', region)), settlement, period,
        ) : null
        return <li key={tier}>
          <div className="pricing-plan-entry-plan">
            <h3>{name}</h3>
            <span>{TIER_CREDITS[tier]} credits per month</span>
          </div>
          <div className="pricing-plan-entry-price">
            {amount === null ? <>
              <span className="pricing-plan-entry-placeholder" aria-hidden="true">—</span>
              <span className="sr-only">Loading price</span>
            </> : <strong>{amount}</strong>}
            <span>{annual ? 'per year' : 'per month'}</span>
          </div>
          <a className="pricing-plan-entry-choose" href={'#' + pricingTierCardId(tier)} onClick={() => onChoose(tier)}>
            See {name}
          </a>
          {localAmount && <span className="pricing-plan-entry-settlement">{localAmount}</span>}
        </li>
      })}
    </ul>
  </section>
}
