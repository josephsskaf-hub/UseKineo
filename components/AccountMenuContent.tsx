'use client'

import { useEffect, useRef, useState } from 'react'
import AccountPanel from '@/components/AccountPanel'
import { readAccountMenuCredits, useAccountMenuScope } from '@/components/AccountMenuScope'
import { BUY_CREDITS_OPENED_EVENT, BuyCreditsModal } from '@/components/billing/BuyCreditsEntry'
import { useAccountOfferImpression, useVisibleAccountOffer } from '@/components/billing/useVisibleAccountOffer'
import { trackEvent } from '@/lib/analytics'
import { sairDaConta } from '@/lib/auth/sairDaContaCliente'
import { isCreditsReadFailure } from '@/lib/creditsReadFailure'
import { createClient } from '@/lib/supabase/client'
import type { OpenAccountMenuProps } from '@/components/AccountMenuTrigger'

export default function AccountMenuContent(props: OpenAccountMenuProps) {
  return <>
    {props.placement && <OpenAccountMenu {...props} />}
    {props.purchase && <BuyCreditsModal surface={props.surface} offer={props.purchase} onClose={props.onClosePurchase} />}
  </>
}

function OpenAccountMenu({ id, placement, signedIn, account, surface, onClose, onNavigate, onBuyCredits }: OpenAccountMenuProps) {
  const scope = useAccountMenuScope()
  const [verifiedIdentity, setIdentity] = useState<OpenAccountMenuProps['account'] | null>()
  const identity = signedIn === false ? null : account ?? verifiedIdentity
  const [signingOut, setSigningOut] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const buy = useRef<HTMLButtonElement>(null)
  const offer = useVisibleAccountOffer(surface, Boolean(identity), panel)
  useAccountOfferImpression(surface, offer, buy)

  useEffect(() => {
    if (signedIn === false || account) return
    let active = true
    async function load() {
      try {
        const { data: { user } } = await createClient().auth.getUser()
        if (!active) return
        if (!user) { setIdentity(null); return }
        const email = user.email ?? ''
        const name = user.user_metadata?.full_name ?? user.user_metadata?.name
        const base = { email, displayName: typeof name === 'string' && name.trim() ? name : email.split('@')[0], plan: null, credits: null }
        setIdentity(base)
        try {
          const response = scope ? await readAccountMenuCredits(scope) : await fetch('/api/credits', { cache: 'no-store', credentials: 'same-origin' })
          if (!active) return
          if (response.status === 401) { setIdentity(null); return }
          const result = await response.json()
          if (!active) return
          const failed = isCreditsReadFailure(response.status, result)
          setIdentity({ ...base, creditsReadFailed: failed,
            plan: !failed && typeof result?.plan === 'string' ? result.plan : null,
            credits: !failed && typeof result?.credits === 'number' ? result.credits : null,
          })
        } catch {
          if (active) setIdentity({ ...base, creditsReadFailed: true })
        }
      } catch {
        if (active) setIdentity(null)
      }
    }
    void load()
    return () => { active = false }
  }, [account, scope, signedIn])

  return <AccountPanel id={id} placement={placement ?? undefined} guest={!identity} loading={identity === undefined}
    panelRegion={panel} buyCreditsButton={buy}
    email={identity?.email ?? ''} displayName={identity?.displayName ?? ''} plan={identity?.plan ?? null}
    credits={identity?.credits ?? null} creditsReadFailed={identity?.creditsReadFailed}
    onClose={onClose} onNavigate={onNavigate} signingOut={signingOut}
    onSignOut={() => { setSigningOut(true); void sairDaConta() }}
    onBuyCredits={identity && offer ? () => {
      void trackEvent(BUY_CREDITS_OPENED_EVENT, { surface, balance: identity.credits })
      onBuyCredits(offer)
    } : null} />
}
