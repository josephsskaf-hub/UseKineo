import { CLIP_EFFECTS, CLIP_EFFECTS_PUBLIC, type ClipEffect } from './clipEffects'
import { CLIPS_PUBLIC } from './clipLaunch'
import { enginePaused } from '@/lib/engineLaunch'
import { INTERFACE_LANGUAGE_OPTIONS, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import dictionary from '@/lib/ui/refinementCopy.json'

// One reversible switch controls pages and sitemap together; no billing changes.
export const CLIP_EFFECT_PAGES_PUBLIC = true
export const EFFECT_PAGE_VERSION = 'clip_effect_pages_20261006_v1'
export const EFFECT_BASE = 'https://www.usekineo.com'
export const EFFECT_PAGE_LANGUAGES = INTERFACE_LANGUAGE_OPTIONS.map(({ code }) => code)
const OG_LOCALES: Record<InterfaceLanguage, string> = { en: 'en_US', pt: 'pt_BR', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', nl: 'nl_NL', pl: 'pl_PL', tr: 'tr_TR', ru: 'ru_RU', uk: 'uk_UA', ar: 'ar_SA', ur: 'ur_PK', hi: 'hi_IN', id: 'id_ID', vi: 'vi_VN' }
export const EFFECT_PAGE_COPY = [
  'Clip effects', 'Use this effect', 'See all effects', 'Made on Kineo',
  'Add your photo', 'Generate your clip', 'Your result depends on your photo.',
  'Preview made with this effect from an AI-generated photo.', 'More effects', 'Language',
] as const

export function effectText(language: InterfaceLanguage, text: string): string {
  return (dictionary as Record<string, Record<string, string>>)[language]?.[text] ?? text
}
export type EffectPageCard = Pick<ClipEffect, 'key' | 'title' | 'sub' | 'engine' | 'preview'>
export function effectPageCard(effect: ClipEffect): EffectPageCard {
  const { key, title, sub, engine, preview } = effect
  return { key, title, sub, engine, preview }
}
export function effectSlug(effect: Pick<ClipEffect, 'key'>): string { return effect.key.replaceAll('_', '-') }
export function effectPagePath(slug: string, language: InterfaceLanguage = 'en'): string {
  return '/effects/' + slug + (language === 'en' ? '' : '/' + language)
}
export function publicEffectPages(): readonly ClipEffect[] {
  return CLIP_EFFECT_PAGES_PUBLIC && CLIPS_PUBLIC && CLIP_EFFECTS_PUBLIC
    ? CLIP_EFFECTS.filter(effect => effect.preview?.poster && enginePaused(effect.engine) === null)
    : []
}
export function effectPage(slug: string): ClipEffect | null {
  return publicEffectPages().find(effect => effectSlug(effect) === slug) ?? null
}
export function effectLanguage(raw: string): InterfaceLanguage | null {
  return EFFECT_PAGE_LANGUAGES.find(lang => lang === raw) ?? null
}
export function effectDestination(effect: Pick<ClipEffect, 'key'>, signedIn: boolean): string {
  const target = '/clips?' + new URLSearchParams({ effect: effect.key, clip_origin: 'effect_page' }).toString()
  return signedIn ? target : '/signup?' + new URLSearchParams({ redirect: target }).toString()
}
export function effectAlternates(slug: string): Record<string, string> {
  return Object.fromEntries([
    ...EFFECT_PAGE_LANGUAGES.map(language => [language, EFFECT_BASE + effectPagePath(slug, language)]),
    ['x-default', EFFECT_BASE + effectPagePath(slug)],
  ])
}
export function effectMetadata(effect: ClipEffect, language: InterfaceLanguage) {
  const title = effectText(language, effect.title) + ' | Kineo · ' + effectText(language, 'Clip effects')
  const description = effectText(language, effect.sub) + ' ' + effectText(language, 'Add your photo') + '.'
  const url = EFFECT_BASE + effectPagePath(effectSlug(effect), language)
  const image = EFFECT_BASE + effect.preview!.poster
  return {
    title: { absolute: title }, description,
    alternates: { canonical: url, languages: effectAlternates(effectSlug(effect)) },
    openGraph: { title, description, url, locale: OG_LOCALES[language], type: 'website' as const, images: [{ url: image, alt: effectText(language, effect.title) }] },
    twitter: { card: 'summary_large_image' as const, title, description, images: [image] },
  }
}
export function effectSitemapEntries() {
  return publicEffectPages().flatMap(effect => EFFECT_PAGE_LANGUAGES.map(language => ({
    url: EFFECT_BASE + effectPagePath(effectSlug(effect), language),
    lastModified: new Date('2026-10-06T00:00:00.000Z'),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
    alternates: { languages: effectAlternates(effectSlug(effect)) },
  })))
}
