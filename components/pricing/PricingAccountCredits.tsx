'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BUY_CREDITS_LABEL, BUY_CREDITS_OPENED_EVENT, BuyCreditsModal, useRecargaEntrada } from '@/components/billing/BuyCreditsEntry'
import { useUiCopy } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { PRICING_CREDITS_SURFACE } from '@/lib/ui/unifiedAccountMenu'

export default function PricingAccountCredits({ signedIn }: { signedIn: boolean | null }) {
  const t = useUiCopy()
  const offer = useRecargaEntrada(PRICING_CREDITS_SURFACE, signedIn === true)
  const [open, setOpen] = useState(false)
  const action = 'inline-flex min-h-[44px] items-center rounded-lg border border-[var(--border)] px-4 text-sm font-semibold text-[var(--accent)]'

  return <div className="mx-auto mt-8 flex max-w-5xl justify-center" data-pricing-account-credits="">
    {offer ? <button type="button" className={action} onClick={() => {
      void trackEvent(BUY_CREDITS_OPENED_EVENT, { surface: PRICING_CREDITS_SURFACE })
      setOpen(true)
    }}>{t(BUY_CREDITS_LABEL)}</button>
      : <Link href="#plans" className={action}>{t(signedIn ? 'Upgrade' : 'See plans')}</Link>}
    {offer && open && <BuyCreditsModal offer={offer} surface={PRICING_CREDITS_SURFACE} onClose={() => setOpen(false)} />}
  </div>
}
