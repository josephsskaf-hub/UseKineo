'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { INTERFACE_LANGUAGE_KEY, INTERFACE_LANGUAGE_OPTIONS, interfaceLanguageIsRtl, normalizeInterfaceCopy, parseInterfaceLanguage, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { INTERFACE_ES } from '@/lib/ui/interfaceLabels'
import { canonicalCopySpanish } from '@/lib/ui/canonicalCopySpanish'
import { INTERFACE_HI, canonicalCopyHindi } from '@/lib/ui/interfaceHindi'
import { loadInterfaceDictionary, type InterfaceDictionary } from '@/lib/ui/interfaceDictionaries'

// KINEO-INTERFACE-16-LINGUAS-2026-09-21 — o contexto carrega o dicionário da língua escolhida (13 novas, sob
// demanda) e expõe `dict`; es/hi continuam pelos dicionários já no bundle. Enquanto o dicionário carrega, a
// interface fica em inglês (nunca em branco); frase desconhecida cai em inglês, nunca em texto inventado.
const InterfaceLanguageContext = createContext({ language: 'en' as InterfaceLanguage, dict: null as InterfaceDictionary | null, choose: (_value: InterfaceLanguage) => {} })

export function InterfaceLanguageProvider({ children }: { children: ReactNode }) {
  // Server and initial client render agree. Storage is optional and never read on the server.
  const [language, setLanguage] = useState<InterfaceLanguage>('en')
  const [dict, setDict] = useState<InterfaceDictionary | null>(null)
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
    document.documentElement.dir = interfaceLanguageIsRtl(language) ? 'rtl' : 'ltr'
  }, [language])
  useEffect(() => {
    const p = loadInterfaceDictionary(language)
    if (!p) { setDict(null); return }
    let alive = true
    p.then((d) => { if (alive) setDict(d) }).catch(() => { if (alive) setDict(null) })
    return () => { alive = false }
  }, [language])
  const choose = useCallback((value: InterfaceLanguage) => {
    const next = parseInterfaceLanguage(value)
    setLanguage(next)
    try { localStorage.setItem(INTERFACE_LANGUAGE_KEY, next) } catch { /* choice still works for this visit */ }
  }, [])
  const value = useMemo(() => ({ language, dict, choose }), [language, dict, choose])
  return <InterfaceLanguageContext.Provider value={value}>{children}</InterfaceLanguageContext.Provider>
}

export function useInterfaceLanguage() { return useContext(InterfaceLanguageContext).language }

/** Authored UI copy in the chosen language, or undefined when there is no reviewed translation (caller keeps English). */
function translateAuthoredCopy(language: InterfaceLanguage, dict: InterfaceDictionary | null, text: string): string | undefined {
  if (language === 'en') return undefined
  const normalized = normalizeInterfaceCopy(text)
  const translated = language === 'es' ? (INTERFACE_ES[normalized] ?? canonicalCopySpanish(normalized))
    : language === 'hi' ? (INTERFACE_HI[normalized] ?? canonicalCopyHindi(normalized))
    : dict?.[normalized]
  return translated === undefined ? undefined : (text.match(/^\s+/)?.[0] ?? '') + translated + (text.match(/\s+$/)?.[0] ?? '')
}

/** For authored placeholders, accessible names and dynamic UI templates only. */
export function useUiCopy() {
  const { language, dict } = useContext(InterfaceLanguageContext)
  return (en: string, es?: string): string => {
    if (language === 'es' && es !== undefined) return es
    return translateAuthoredCopy(language, dict, en) ?? en
  }
}

/** Translate only this authored UI copy. Never walk the DOM or translate user content. */
export function UiText({ children, es, hi }: { children: ReactNode; es: ReactNode; hi?: ReactNode }) {
  const { language, dict } = useContext(InterfaceLanguageContext)
  // A translation is text, not another badge/card: neutralize broad host span rules.
  if (language === 'en') return <>{children}</>
  if (language === 'es') return <span lang="es" style={{ all: 'unset' }}>{es}</span>
  if (language === 'hi') {
    const translated = hi ?? (typeof children === 'string' ? hindiInterfaceCopy(children) : undefined)
    return <span lang={translated === undefined ? 'en' : 'hi'} style={{ all: 'unset' }}>{translated ?? children}</span>
  }
  const translated = typeof children === 'string' ? translateAuthoredCopy(language, dict, children) : undefined
  return <span lang={translated === undefined ? 'en' : language} style={{ all: 'unset' }}>{translated ?? children}</span>
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
      style={{ color: '#f5f5f7', background: '#14171d', border: '1px solid #3a414c', borderRadius: 9, padding: '8px 6px', minHeight: 36, maxWidth: 110, fontSize: 12, cursor: 'pointer', colorScheme: 'dark' }}>
      {INTERFACE_LANGUAGE_OPTIONS.map((o) => (
        <option key={o.code} value={o.code} lang={o.code} dir={o.rtl ? 'rtl' : undefined}>{o.native}</option>
      ))}
    </select>
  )
}
