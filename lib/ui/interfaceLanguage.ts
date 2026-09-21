/** Explicit UI preference only. Never changes narration, prompts, currency or URLs. */
// KINEO-INTERFACE-16-LINGUAS-2026-09-21 — o site falava 3 línguas (en/es/hi) enquanto o filme
// já sai em 16. Agora a interface aceita as mesmas 16 do narrador: es/hi seguem no bundle;
// as 13 novas carregam o dicionário sob demanda (lib/ui/interface/<code>.ts) só quando escolhidas.
export type InterfaceLanguage = 'en' | 'es' | 'hi' | 'pt' | 'fr' | 'de' | 'it' | 'nl' | 'pl' | 'tr' | 'ru' | 'uk' | 'ar' | 'ur' | 'id' | 'vi'
export const INTERFACE_LANGUAGE_KEY = 'kineo:interface-language:v1'
export const INTERFACE_LANGUAGE_OPTIONS: ReadonlyArray<{ code: InterfaceLanguage; native: string; rtl?: true }> = [
  { code: 'en', native: 'English' },
  { code: 'pt', native: 'Português' },
  { code: 'es', native: 'Español' },
  { code: 'fr', native: 'Français' },
  { code: 'de', native: 'Deutsch' },
  { code: 'it', native: 'Italiano' },
  { code: 'nl', native: 'Nederlands' },
  { code: 'pl', native: 'Polski' },
  { code: 'tr', native: 'Türkçe' },
  { code: 'ru', native: 'Русский' },
  { code: 'uk', native: 'Українська' },
  { code: 'ar', native: 'العربية', rtl: true },
  { code: 'ur', native: 'اردو', rtl: true },
  { code: 'hi', native: 'हिन्दी' },
  { code: 'id', native: 'Bahasa Indonesia' },
  { code: 'vi', native: 'Tiếng Việt' },
]
const CODES = new Set<string>(INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code))
/** Languages whose dictionary is bundled (synchronous); the rest load on demand. */
export const BUNDLED_INTERFACE_LANGUAGES: readonly InterfaceLanguage[] = ['en', 'es', 'hi']
export function parseInterfaceLanguage(value: unknown): InterfaceLanguage {
  return typeof value === 'string' && CODES.has(value) ? (value as InterfaceLanguage) : 'en'
}
export function interfaceLanguageIsRtl(language: InterfaceLanguage): boolean {
  return INTERFACE_LANGUAGE_OPTIONS.some((o) => o.code === language && o.rtl === true)
}
/** Tabela por língua (en obrigatório). Língua sem entrada revisada cai em inglês — nunca em texto inventado. */
export function pickInterfaceCopy<T>(table: { en: T } & Partial<Record<InterfaceLanguage, T>>, language: InterfaceLanguage): T {
  return table[language] ?? table.en
}
export function normalizeInterfaceCopy(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
