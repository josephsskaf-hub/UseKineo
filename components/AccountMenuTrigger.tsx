'use client'

import { useEffect, useId, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { AccountPanelProps } from '@/components/AccountPanel'
import { useUiCopy } from '@/components/InterfaceLanguage'
import type { RecargaAssinanteOffer } from '@/lib/billing/recargaAssinante'
import { ACCOUNT_MENU_WIDTH_PX } from '@/lib/ui/accountMenu'
import { placeAccountMenu, unifiedAccountSurface, type AccountMenuPlacement } from '@/lib/ui/unifiedAccountMenu'

type AccountMenuIdentity = Pick<AccountPanelProps, 'email' | 'displayName' | 'plan' | 'credits' | 'creditsReadFailed'>

type Props = {
  signedIn?: boolean
  account?: AccountMenuIdentity
  className?: string
  style?: CSSProperties
  label?: string
  children?: ReactNode
  onNavigate?: () => void
}

export type OpenAccountMenuProps = Pick<Props, 'signedIn' | 'account' | 'onNavigate'> & {
  id: string
  placement: AccountMenuPlacement | null
  surface: string
  purchase: RecargaAssinanteOffer | null
  onClose: () => void
  onClosePurchase: () => void
  onBuyCredits: (offer: RecargaAssinanteOffer) => void
}

export default function AccountMenuTrigger({ signedIn, account, className, style, label = 'Settings', children, onNavigate }: Props) {
  const t = useUiCopy()
  const id = useId()
  const pathname = usePathname()
  const surface = unifiedAccountSurface(pathname)
  const opener = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [placement, setPlacement] = useState<AccountMenuPlacement | null>(null)
  const [purchase, setPurchase] = useState<RecargaAssinanteOffer | null>(null)
  const [Content, setContent] = useState<ComponentType<OpenAccountMenuProps> | null>(null)

  function measure() {
    if (!opener.current) return
    setPlacement(placeAccountMenu(opener.current.getBoundingClientRect(), {
      width: document.documentElement.clientWidth,
      height: window.innerHeight,
    }, ACCOUNT_MENU_WIDTH_PX))
  }

  const open = placement !== null
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])
  useEffect(() => { setPlacement(null); setPurchase(null) }, [pathname])
  useEffect(() => { if (signedIn === false) setPurchase(null) }, [signedIn])

  function toggle() {
    if (open) { setPlacement(null); return }
    measure()
    if (!Content) {
      void import('./AccountMenuContent').then(({ default: Panel }) => setContent(() => Panel))
        .catch(() => setPlacement(null))
    }
  }

  return <>
    <button ref={opener} type="button" className={className}
      style={{ ...style, minHeight: 44, minWidth: 44 }} data-unified-account-trigger=""
      aria-label={t(label)} disabled={!mounted} aria-haspopup="dialog" aria-busy={open && !Content || undefined}
      aria-expanded={open} aria-controls={open && Content ? id : undefined} onClick={toggle}>
      {children ?? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" aria-hidden="true">
        <path d="m9.5 3-.7 2.2-2.1 1-2.1-.5-2 3.5 1.5 1.7v2.2l-1.5 1.7 2 3.5 2.1-.5 2.1 1 .7 2.2h5l.7-2.2 2.1-1 2.1.5 2-3.5-1.5-1.7v-2.2l1.5-1.7-2-3.5-2.1.5-2.1-1-.7-2.2z"/><circle cx="12" cy="12" r="3"/>
      </svg>}
    </button>
    {Content && (open || purchase) && <Content id={id} placement={placement} signedIn={signedIn} account={account}
      surface={surface} onClose={() => setPlacement(null)} onNavigate={onNavigate} onBuyCredits={setPurchase}
      purchase={purchase} onClosePurchase={() => setPurchase(null)} />}
  </>
}
