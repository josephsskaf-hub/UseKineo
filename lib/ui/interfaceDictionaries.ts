// KINEO-INTERFACE-16-LINGUAS-2026-09-21 — carregadores sob demanda dos dicionários das 13 línguas novas.
// Um arquivo por língua em lib/ui/interface/<code>.ts, gerado de lib/ui/interface/_corpus (frases vivas do site).
// en/es/hi não passam por aqui (es/hi já vêm no bundle em interfaceLabels/interfaceHindi).
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export type InterfaceDictionary = Record<string, string>
type Loader = () => Promise<{ DICT: InterfaceDictionary }>

export const INTERFACE_DICTIONARY_LOADERS: Partial<Record<InterfaceLanguage, Loader>> = {
  pt: () => import('@/lib/ui/interface/pt'),
  fr: () => import('@/lib/ui/interface/fr'),
  de: () => import('@/lib/ui/interface/de'),
  it: () => import('@/lib/ui/interface/it'),
  nl: () => import('@/lib/ui/interface/nl'),
  pl: () => import('@/lib/ui/interface/pl'),
  tr: () => import('@/lib/ui/interface/tr'),
  ru: () => import('@/lib/ui/interface/ru'),
  uk: () => import('@/lib/ui/interface/uk'),
  ar: () => import('@/lib/ui/interface/ar'),
  ur: () => import('@/lib/ui/interface/ur'),
  id: () => import('@/lib/ui/interface/id'),
  vi: () => import('@/lib/ui/interface/vi'),
}

const cache = new Map<InterfaceLanguage, Promise<InterfaceDictionary>>()
export function loadInterfaceDictionary(language: InterfaceLanguage): Promise<InterfaceDictionary> | null {
  const loader = INTERFACE_DICTIONARY_LOADERS[language]
  if (!loader) return null
  let p = cache.get(language)
  if (!p) { p = loader().then((m) => m.DICT); cache.set(language, p) }
  return p
}
