'use client'

import { createContext, useContext, useState, type MouseEvent, type ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'

export const HOME_PRICING_CHECKOUT_VERSION = 'home_pricing_checkout_v1' as const

type HomePricingTier = 'starter' | 'basic' | 'pro'

type HomePricingCheckoutContextValue = {
  checkout: ReturnType<typeof useCheckoutLaunch>
  isSignedIn: boolean
  lastSelection: HomePricingTier | null
  setLastSelection: (tier: HomePricingTier) => void
}

const HomePricingCheckoutContext = createContext<HomePricingCheckoutContextValue | null>(null)

export function HomePricingCheckoutGroup({
  children,
  isSignedIn,
}: {
  children: ReactNode
  isSignedIn: boolean
}) {
  // One hook owns all three cards, so a fast cross-tier click cannot mint a
  // second checkout while the first plan is already opening.
  const checkout = useCheckoutLaunch('home_pricing')
  const [lastSelection, setLastSelection] = useState<HomePricingTier | null>(null)

  return (
    <HomePricingCheckoutContext.Provider value={{ checkout, isSignedIn, lastSelection, setLastSelection }}>
      {children}
    </HomePricingCheckoutContext.Provider>
  )
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
}

export default function HomePricingCheckoutLink({
  children,
  href,
  tier,
}: {
  children: ReactNode
  href: string
  tier: HomePricingTier
}) {
  const context = useContext(HomePricingCheckoutContext)
  if (!context) throw new Error('HomePricingCheckoutLink must be inside HomePricingCheckoutGroup')
  const { checkout, isSignedIn, lastSelection, setLastSelection } = context
  const pending = checkout.pending === tier
  const metadata = {
    version: HOME_PRICING_CHECKOUT_VERSION,
    tier,
    pricing_surface: 'home_pricing',
    signed_in: isSignedIn,
  }

  return (
    <>
      <a
        className="btn btn-w"
        rel="nofollow"
        href={href}
        aria-busy={pending}
        aria-disabled={isSignedIn && checkout.pending !== null}
        onClick={(event) => {
          // New tabs, modified clicks and the signed-out auth bridge must keep
          // the native anchor path. Only the signed-in same-tab Stripe gesture
          // needs the checkout latch and redirect watchdog.
          if (!isSignedIn || isModifiedClick(event)) {
            void trackEvent('home_pricing_checkout_clicked', {
              ...metadata,
              navigation_mode: isSignedIn ? 'native_modified' : 'auth_bridge',
            })
            return
          }

          event.preventDefault()
          const started = checkout.launch(tier, href, {
            ...metadata,
            navigation_mode: 'protected_same_tab',
          })
          if (!started) return
          setLastSelection(tier)
          void trackEvent('home_pricing_checkout_clicked', {
            ...metadata,
            navigation_mode: 'protected_same_tab',
          })
        }}
      >
        {pending ? 'Opening secure checkout…' : children}
      </a>
      {checkout.error && lastSelection === tier && (
        <p className="home-pricing-checkout-error" role="alert">
          {checkout.error}
        </p>
      )}
    </>
  )
}
