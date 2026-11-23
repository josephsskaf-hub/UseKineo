'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AccountPanel, { type AccountPanelProps } from '@/components/AccountPanel'
import { BUY_CREDITS_OPENED_EVENT, BuyCreditsModal, useRecargaEntrada } from '@/components/billing/BuyCreditsEntry'
import { useUiCopy } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { sairDaConta } from '@/lib/auth/sairDaContaCliente'
import type { RecargaAssinanteOffer } from '@/lib/billing/recargaAssinante'
import { isCreditsReadFailure } from '@/lib/creditsReadFailure'
import { createClient } from '@/lib/supabase/client'
import { ACCOUNT_MENU_WIDTH_PX } from '@/lib/ui/accountMenu'
import { placeAccountMenu, unifiedAccountSurface, type AccountMenuPlacement } from '@/lib/ui/unifiedAccountMenu'

export type AccountMenuIdentity = Pick<AccountPanelProps, 'email' | 'displayName' | 'plan' | 'credits' | 'creditsReadFailed'>

type Props = {
  signedIn?: boolean
  account?: AccountMenuIdentity
  className?: string
  style?: CSSProperties
  label?: string
  children?: ReactNode
  onNavigate?: () => void
}

export default function AccountMenuTrigger({ signedIn, account, className, style, label = 'Settings', children, onNavigate }: Props) {
  const t = useUiCopy()
  const id = useId()
  const pathname = usePathname()
  const surface = unifiedAccountSurface(pathname)
  const opener = useRef<HTMLButtonElement>(null)
  const [placement, setPlacement] = useState<AccountMenuPlacement | null>(null)
  const [purchase, setPurchase] = useState<RecargaAssinanteOffer | null>(null)

  function measure() {
    if (!opener.current) return
    setPlacement(placeAccountMenu(opener.current.getBoundingClientRect(), {
      width: document.documentElement.clientWidth,
      height: window.innerHeight,
    }, ACCOUNT_MENU_WIDTH_PX))
  }

  const open = placement !== null
  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])
  useEffect(() => { setPlacement(null); setPurchase(null) }, [pathname])
  useEffect(() => { if (signedIn === false) setPurchase(null) }, [signedIn])

  return <>
    <button ref={opener} type="button" className={className}
      style={{ ...style, minHeight: 44, minWidth: 44 }} data-unified-account-trigger=""
      aria-label={t(label)} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { if (open) setPlacement(null); else measure() }}>
      {children ?? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" aria-hidden="true">
        <path d="m9.5 3-.7 2.2-2.1 1-2.1-.5-2 3.5 1.5 1.7v2.2l-1.5 1.7 2 3.5 2.1-.5 2.1 1 .7 2.2h5l.7-2.2 2.1-1 2.1.5 2-3.5-1.5-1.7v-2.2l1.5-1.7-2-3.5-2.1.5-2.1-1-.7-2.2z"/><circle cx="12" cy="12" r="3"/>
      </svg>}
    </button>
    {placement && <OpenAccountMenu id={id} placement={placement} signedIn={signedIn} account={account}
      surface={surface} onClose={() => setPlacement(null)} onNavigate={onNavigate} onBuyCredits={setPurchase} />}
    {purchase && <BuyCreditsModal surface={surface} offer={purchase} onClose={() => setPurchase(null)} />}
  </>
}

type OpenMenuProps = Pick<Props, 'signedIn' | 'account' | 'onNavigate'> & {
  id: string
  placement: AccountMenuPlacement
  surface: string
  onClose: () => void
  onBuyCredits: (offer: RecargaAssinanteOffer) => void
}

function OpenAccountMenu({ id, placement, signedIn, account, surface, onClose, onNavigate, onBuyCredits }: OpenMenuProps) {
  const [verifiedIdentity, setIdentity] = useState<AccountMenuIdentity | null>()
  const identity = signedIn === false ? null : account ?? verifiedIdentity
  const [signingOut, setSigningOut] = useState(false)
  const offer = useRecargaEntrada(surface, Boolean(identity))

  useEffect(() => {
    if (signedIn === false || account) return
    const controller = new AbortController()
    async function load() {
      try {
        const { data: { user } } = await createClient().auth.getUser()
        if (!user) { if (!controller.signal.aborted) setIdentity(null); return }
        if (controller.signal.aborted) return
        const email = user.email ?? ''
        const name = user.user_metadata?.full_name ?? user.user_metadata?.name
        const base = { email, displayName: typeof name === 'string' && name.trim() ? name : email.split('@')[0], plan: null, credits: null }
        setIdentity(base)
        try {
          const response = await fetch('/api/credits', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
          if (response.status === 401) { if (!controller.signal.aborted) setIdentity(null); return }
          const result = await response.json()
          if (controller.signal.aborted) return
          const failed = isCreditsReadFailure(response.status, result)
          setIdentity({ ...base, creditsReadFailed: failed,
            plan: !failed && typeof result?.plan === 'string' ? result.plan : null,
            credits: !failed && typeof result?.credits === 'number' ? result.credits : null,
          })
        } catch {
          if (!controller.signal.aborted) setIdentity({ ...base, creditsReadFailed: true })
        }
      } catch {
        if (!controller.signal.aborted) setIdentity(null)
      }
    }
    void load()
    return () => controller.abort()
  }, [account, signedIn])

  return <AccountPanel id={id} placement={placement} guest={!identity} loading={identity === undefined}
    email={identity?.email ?? ''} displayName={identity?.displayName ?? ''} plan={identity?.plan ?? null}
    credits={identity?.credits ?? null} creditsReadFailed={identity?.creditsReadFailed}
    onClose={onClose} onNavigate={onNavigate} signingOut={signingOut}
    onSignOut={() => { setSigningOut(true); void sairDaConta() }}
    onBuyCredits={identity && offer ? () => {
      void trackEvent(BUY_CREDITS_OPENED_EVENT, { surface, balance: identity.credits })
      onBuyCredits(offer)
    } : null} />
}
