'use client'

import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { InterfaceLanguageSelect, useUiCopy } from '@/components/InterfaceLanguage'
import { createClient } from '@/lib/supabase/client'
import { sairDaConta } from '@/lib/auth/sairDaContaCliente'
import AccountMenuTrigger from '@/components/AccountMenuTrigger'
import { useAccountMenuScope } from '@/components/AccountMenuScope'

export default function SiteSettingsMenu({ signedIn }: { signedIn?: boolean }) {
  const menuScope = useAccountMenuScope()
  if (menuScope) return <AccountMenuTrigger signedIn={signedIn} className="appearance-icon site-settings-trigger" />
  return <LegacySiteSettingsMenu signedIn={signedIn} />
}

function LegacySiteSettingsMenu({ signedIn }: { signedIn?: boolean }) {
  const t = useUiCopy()
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [open, setOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!open || signedIn !== undefined) return
    let current = true
    const auth = createClient().auth
    void auth.getUser().then(({ data }) => { if (current) setAuthenticated(!!data.user) }).catch(() => {})
    return () => { current = false }
  }, [open, signedIn])

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return
    const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect()
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
      event.currentTarget.close()
    }
  }

  return <>
    <button type="button" className="appearance-icon site-settings-trigger" aria-label={t('Settings')} aria-haspopup="dialog"
      aria-controls={id} disabled={!mounted} aria-expanded={open} onClick={() => { dialog.current?.showModal(); setOpen(true) }}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" aria-hidden="true">
        <path d="m9.5 3-.7 2.2-2.1 1-2.1-.5-2 3.5 1.5 1.7v2.2l-1.5 1.7 2 3.5 2.1-.5 2.1 1 .7 2.2h5l.7-2.2 2.1-1 2.1.5 2-3.5-1.5-1.7v-2.2l1.5-1.7-2-3.5-2.1.5-2.1-1-.7-2.2z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
    {mounted && createPortal(<dialog ref={dialog} id={id} className="site-settings-dialog" aria-labelledby={id+'-title'}
      onClose={() => { setOpen(false); setAuthenticated(false) }}
      onClick={closeOnBackdrop}>
      <div className="site-settings-title"><h2 id={id+'-title'}>{t('Settings')}</h2><button type="button" className="appearance-icon" aria-label={t('Close')} onClick={() => dialog.current?.close()}>×</button></div>
      <label className="site-settings-row">{t('Language')}<InterfaceLanguageSelect /></label>
      <AppearanceSettingsButton compact={false} className="site-settings-row" />
      {(signedIn ?? authenticated) && <div className="site-settings-account">
        <Link href="/library" className="site-settings-row" onClick={() => dialog.current?.close()}>{t('My videos')}<span aria-hidden="true">↗</span></Link>
        <button type="button" className="site-settings-row" disabled={leaving} onClick={() => { setLeaving(true); void sairDaConta() }}>{t(leaving ? 'Signing out…' : 'Sign out')}</button>
      </div>}
    </dialog>, document.body)}
  </>
}
