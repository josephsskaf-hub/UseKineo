'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { INTERFACE_LANGUAGE_KEY, normalizeInterfaceCopy, parseInterfaceLanguage, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { INTERFACE_ES } from '@/lib/ui/interfaceLabels'
import { canonicalCopySpanish } from '@/lib/ui/canonicalCopySpanish'
import { INTERFACE_HI, canonicalCopyHindi } from '@/lib/ui/interfaceHindi'

const InterfaceLanguageContext = createContext({ language: 'en' as InterfaceLanguage, choose: (_value: InterfaceLanguage) => {} })

export function InterfaceLanguageProvider({ children }: { children: ReactNode }) {
  // Server and initial client render agree. Storage is optional and never read on the server.
  const [language, setLanguage] = useState<InterfaceLanguage>('en')
  useEffect(() => {
    try { setLanguage(parseInterfaceLanguage(localStorage.getItem(INTERFACE_LANGUAGE_KEY))) } catch { /* private mode */ }
    const sync = (event: StorageEvent) => {
      if (event.key === INTERFACE_LANGUAGE_KEY || event.key === null) setLanguage(parseInterfaceLanguage(event.newValue))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  useEffect(() => {
    // Metadata/accessibility follows the explicit preference; user-authored content stays untouched.
    document.documentElement.lang = language
  }, [language])
  const choose = useCallback((value: InterfaceLanguage) => {
    const next = parseInterfaceLanguage(value)
    setLanguage(next)
    try { localStorage.setItem(INTERFACE_LANGUAGE_KEY, next) } catch { /* choice still works for this visit */ }
  }, [])
  const value = useMemo(() => ({ language, choose }), [language, choose])
  return <InterfaceLanguageContext.Provider value={value}>{children}</InterfaceLanguageContext.Provider>
}

export function useInterfaceLanguage() { return useContext(InterfaceLanguageContext).language }

/** For authored placeholders, accessible names and dynamic UI templates only. */
export function useUiCopy() {
  const language = useInterfaceLanguage()
  return (en: string, es?: string): string => language === 'es' ? (es ?? en) : language === 'hi' ? (hindiInterfaceCopy(en) ?? en) : en
}

/** Translate only this authored UI copy. Never walk the DOM or translate user content. */
export function UiText({ children, es, hi }: { children: ReactNode; es: ReactNode; hi?: ReactNode }) {
  const language = useInterfaceLanguage()
  // A translation is text, not another badge/card: neutralize broad host span rules.
  if (language === 'en') return <>{children}</>
  if (language === 'es') return <span lang="es" style={{ all: 'unset' }}>{es}</span>
  const translated = hi ?? (typeof children === 'string' ? hindiInterfaceCopy(children) : undefined)
  return <span lang={translated === undefined ? 'en' : 'hi'} style={{ all: 'unset' }}>{translated ?? children}</span>
}

export function hindiInterfaceCopy(text: string): string | undefined {
  const normalized = normalizeInterfaceCopy(text)
  const translated = INTERFACE_HI[normalized] ?? canonicalCopyHindi(normalized)
  return translated === undefined ? undefined : (text.match(/^\s+/)?.[0] ?? '') + translated + (text.match(/\s+$/)?.[0] ?? '')
}

export function UiLabel({ children }: { children: string }) {
  const normalized = normalizeInterfaceCopy(children)
  const translated = INTERFACE_ES[normalized] ?? canonicalCopySpanish(normalized)
  const es = translated ? (children.match(/^\s+/)?.[0] ?? '') + translated + (children.match(/\s+$/)?.[0] ?? '') : children
  return <UiText es={es}>{children}</UiText>
}

export function InterfaceLanguageSelect() {
  const { language, choose } = useContext(InterfaceLanguageContext)
  return (
    <select className="kineo-interface-language" aria-label="Interface language / Idioma de interfaz" value={language}
      onChange={event => choose(parseInterfaceLanguage(event.target.value))}
      style={{ color: '#f5f5f7', background: '#14171d', border: '1px solid #3a414c', borderRadius: 9, padding: '8px 6px', minHeight: 36, maxWidth: 90, fontSize: 12, cursor: 'pointer' }}>
      <option value="en" lang="en">English</option>
      <option value="es" lang="es">Español</option>
      <option value="hi" lang="hi">हिन्दी</option>
    </select>
  )
}
