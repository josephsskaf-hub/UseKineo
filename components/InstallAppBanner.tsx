'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useUiCopy } from '@/components/InterfaceLanguage'
import './InstallAppBanner.css'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const dismissedKey = 'sfai_install_dismissed_at'

export default function InstallAppBanner() {
  const pathname = usePathname()
  const t = useUiCopy()
  const prompt = useRef<InstallPrompt | null>(null)
  const [mode, setMode] = useState<'ios' | 'android' | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [instructions, setInstructions] = useState(false)

  useEffect(() => {
    if (dismissed) return
    try { if (localStorage.getItem(dismissedKey)) return } catch { /* restricted storage */ }
    const mobile = matchMedia('(max-width: 767px) and (pointer: coarse)')
    const standalone = matchMedia('(display-mode: standalone)')
    const nav = navigator as Navigator & { standalone?: boolean }
    const native = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    const ios = /iPhone|iPod|iPad/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
    const safari = /Version\/.*Safari\//.test(nav.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(nav.userAgent)
    const eligible = () => mobile.matches && !standalone.matches && !nav.standalone && !native
    const refresh = () => setMode(eligible() ? ios && safari ? 'ios' : prompt.current ? 'android' : null : null)
    const capture = (event: Event) => {
      if (!eligible()) return
      event.preventDefault()
      prompt.current = event as InstallPrompt
      refresh()
    }
    const installed = () => { prompt.current = null; setMode(null); setDismissed(true) }
    const sync = (event: StorageEvent) => { if (event.key === dismissedKey && event.newValue) setDismissed(true) }
    refresh()
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', installed)
    window.addEventListener('storage', sync)
    mobile.addEventListener('change', refresh)
    standalone.addEventListener('change', refresh)
    return () => {
      window.removeEventListener('beforeinstallprompt', capture)
      window.removeEventListener('appinstalled', installed)
      window.removeEventListener('storage', sync)
      mobile.removeEventListener('change', refresh)
      standalone.removeEventListener('change', refresh)
    }
  }, [dismissed])

  function dismiss() {
    try { localStorage.setItem(dismissedKey, '1') } catch { /* keep closed for this visit */ }
    prompt.current = null
    setDismissed(true)
  }

  async function install() {
    const event = prompt.current
    if (!event) return
    prompt.current = null
    setMode(null)
    try {
      await event.prompt()
      if ((await event.userChoice).outcome === 'dismissed') dismiss()
    } catch { /* A consumed browser prompt can only be offered on a new event. */ }
  }

  if (dismissed || !mode || (pathname !== '/' && pathname !== '/studio')) return null
  return <aside className="install-kineo" aria-label={t('Install Kineo')}>
    <div className="install-kineo-inner">
      <img src="/pwa/kineo-192.png" width="32" height="32" alt="" />
      <button className="install-kineo-action" type="button"
        aria-expanded={mode === 'ios' ? instructions : undefined}
        onClick={mode === 'ios' ? () => setInstructions(value => !value) : install}>
        {t('Add Kineo to your home screen')}
      </button>
      <button className="install-kineo-close" type="button" aria-label={t('Dismiss')} onClick={dismiss}>×</button>
      {instructions && mode === 'ios' && <p>{t('In Safari, tap Share, then Add to Home Screen and Add.')}</p>}
    </div>
  </aside>
}
