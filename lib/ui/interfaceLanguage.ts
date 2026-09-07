/** Explicit UI preference only. Never changes narration, prompts, currency or URLs. */
export type InterfaceLanguage = 'en' | 'es' | 'hi'
export const INTERFACE_LANGUAGE_KEY = 'kineo:interface-language:v1'
export function parseInterfaceLanguage(value: unknown): InterfaceLanguage {
  return value === 'es' || value === 'hi' ? value : 'en'
}
export function normalizeInterfaceCopy(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
