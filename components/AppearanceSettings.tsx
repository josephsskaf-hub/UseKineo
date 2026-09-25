'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { APPEARANCE_KEY, parseAppearance, type Appearance } from '@/lib/ui/appearance'
import { useUiCopy } from '@/components/InterfaceLanguage'

const AppearanceContext = createContext({ open: (_trigger: HTMLElement) => {} })

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const t = useUiCopy()
  const [theme, setTheme] = useState<Appearance>('light')
  const [isOpen, setOpen] = useState(false)
  const [updated, setUpdated] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const apply = useCallback((value: Appearance, persist = false) => {
    document.documentElement.dataset.theme = value
    setTheme(value)
    if (persist) {
      try { localStorage.setItem(APPEARANCE_KEY, value) } catch { /* Keep this visit's choice. */ }
      setUpdated(true)
    }
  }, [])
  useEffect(() => {
    apply(parseAppearance(document.documentElement.dataset.theme))
    const sync = (event: StorageEvent) => {
      if (event.key === APPEARANCE_KEY || event.key === null) apply(parseAppearance(event.newValue))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [apply])
  useEffect(() => {
    if (isOpen && !dialog.current?.open) dialog.current?.showModal()
  }, [isOpen])
  const open = useCallback((source: HTMLElement) => { trigger.current = source; setUpdated(false); setOpen(true) }, [])
  const close = () => dialog.current?.close()
  return <AppearanceContext.Provider value={{ open }}>
    {children}
    <dialog className="kineo-appearance" ref={dialog} aria-labelledby="kineo-appearance-heading"
      onClose={() => { setOpen(false); if (trigger.current?.isConnected) trigger.current.focus() }}
      onClick={event => { if (event.target === event.currentTarget) {
        const box = event.currentTarget.getBoundingClientRect()
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close()
      } }}>
      <div className="appearance-header"><span>{t('Settings')}</span><button type="button" className="appearance-icon" onClick={close} aria-label={t('Close')}>×</button></div>
      <h2 id="kineo-appearance-heading">{t('Appearance')}</h2>
      <p>{t('Choose how Kineo looks on this device.')}</p>
      <fieldset className="appearance-options"><legend className="sr-only">{t('Appearance')}</legend>
        {(['light', 'dark'] as const).map(value => <label key={value} className="appearance-option">
          <span className={`appearance-mini appearance-mini-${value}`} aria-hidden="true"><i /><span><b /><em /><em /><em /></span></span>
          <span className="appearance-label"><strong>{t(value === 'light' ? 'Light' : 'Dark')}</strong><input type="radio" name="kineo-appearance" value={value} checked={theme === value} onChange={() => apply(value, true)} /></span>
          <small>{t(value === 'light' ? 'Soft white surfaces.' : 'Deep navy surfaces.')}</small>
        </label>)}
      </fieldset>
      <p className="appearance-save">{t('Your choice is saved automatically on this device.')}</p>
      <span className="sr-only" role="status">{updated ? t('Appearance updated.') : ''}</span>
    </dialog>
  </AppearanceContext.Provider>
}

export function AppearanceSettingsButton({ className = '', compact = true }: { className?: string; compact?: boolean }) {
  const { open } = useContext(AppearanceContext)
  const t = useUiCopy()
  return <button type="button" className={`${compact ? 'appearance-icon' : 'appearance-settings-row'} ${className}`} onClick={event => open(event.currentTarget)} aria-label={t(compact ? 'Settings' : 'Appearance')} aria-haspopup="dialog">
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z" /><circle cx="12" cy="12" r="3.5" /></svg>
    {!compact && <span>{t('Appearance')}</span>}
  </button>
}
