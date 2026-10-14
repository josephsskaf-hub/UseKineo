// KINEO-ADS-DEMO-UNIVERSO-1410 — A LÍNGUA DA VOZ quando a frase não decide (Studio Ads, modo simples).
//
// Demo de 14/10 para uma agência: "Perfume árabe Atheeri, frasco dourado, luz quente deslizando pelo vidro" + o link de uma loja
// .com.br → a voz saiu em INGLÊS. Causa medida:
//   · detectNarrationLanguage (régua dos filmes, TRAVA 8.2) vê 10 palavras mas só UMA marca do português ("pelo") → null;
//   · detectShortTextLanguage também → null, e com razão: "árabe" e "deslizando" existem IGUAIS no espanhol (á e o gerúndio
//     -ando são das duas línguas), e nenhuma palavra da frase está nas listas de palavras funcionais exclusivas;
//   · sem evidência, a tela caía na língua da INTERFACE (inglês). E a língua que a página do link DECLARA (<html lang="pt">)
//     chegava à tela pela rota /link-import e era ignorada; o domínio (.com.br) também.
// O que decide a frase da demo é VOCABULÁRIO que só o português tem ("dourado", "quente", "vidro" — no espanhol "dorado",
// "caliente", "vidrio"). Este desempate pt×es é SEPARADO e só roda quando os dois detectores ficaram sem resposta: exige um
// sinal ibérico na frase (acento agudo/circunflexo/crase, ç, ou gerúndio -ando/-endo/-indo) E palavras de UMA só das duas
// listas abaixo (nenhuma palavra está nas duas; conflito = null). Os dois detectores de antes não mudam.
// Ordem final (a escolha explícita da pessoa vence SEMPRE): escolha → detector de sempre → frase curta → desempate pt×es →
// a PÁGINA do link (<html lang>) → o domínio do link (.br → pt, .es/.mx/.ar… → es) → a interface → inglês.
// LIB PURA (só `import type`).
import type { NarrationLanguage } from '@/lib/textLanguage'

/** País do domínio → língua da voz. Só onde UMA língua domina o comércio local (.in/.ch/.be/.ca/.ae ficam de fora). */
export const ADS_V2_TLD_LANGUAGE: Readonly<Record<string, NarrationLanguage>> = {
  br: 'pt', pt: 'pt', ao: 'pt', mz: 'pt',
  es: 'es', mx: 'es', ar: 'es', cl: 'es', co: 'es', pe: 'es', uy: 'es', py: 'es', bo: 'es', ec: 'es', ve: 'es', cr: 'es', gt: 'es', do: 'es', pa: 'es', hn: 'es', sv: 'es', ni: 'es',
  fr: 'fr', de: 'de', at: 'de', it: 'it', nl: 'nl', pl: 'pl', tr: 'tr', ru: 'ru', ua: 'uk', id: 'id', vn: 'vi', sa: 'ar', eg: 'ar', pk: 'ur',
}

/** Palavras de anúncio que o português tem e o espanhol escreve diferente (e vice-versa). Nenhuma está nas duas listas. */
export const ADS_V2_PT_ONLY_WORDS: readonly string[] = ['dourado', 'dourada', 'dourados', 'douradas', 'quente', 'quentes', 'vidro', 'vidros', 'garrafa', 'garrafas', 'cheiro', 'cheirosa', 'cheiroso', 'brilho', 'couro', 'cabelo', 'cabelos', 'pele', 'rosto', 'olhos', 'madeira', 'prata', 'ouro', 'branco', 'branca', 'preto', 'preta', 'vermelho', 'vermelha', 'doce', 'doces', 'preço', 'loja', 'roupa', 'roupas', 'sapato', 'sapatos', 'tênis', 'luxuoso', 'luxuosa', 'elegância']
export const ADS_V2_ES_ONLY_WORDS: readonly string[] = ['dorado', 'dorada', 'dorados', 'doradas', 'caliente', 'calientes', 'vidrio', 'vidrios', 'botella', 'botellas', 'olor', 'brillo', 'cuero', 'cabello', 'piel', 'ojos', 'madera', 'plata', 'blanco', 'blanca', 'rojo', 'roja', 'dulce', 'dulces', 'precio', 'tienda', 'ropa', 'zapato', 'zapatos', 'lujoso', 'lujosa', 'elegancia']
const IBERIAN_SIGN = /[áéíóúâêôàç]|\p{L}{2,}(?:ando|endo|indo)(?![\p{L}\p{N}])/iu

/**
 * Desempate pt×es pelo vocabulário que só uma das duas tem. null = sem sinal ibérico, sem palavra das listas, ou palavras das
 * DUAS (conflito). Pensado para depois dos dois detectores (que ficam com a palavra final quando decidem).
 */
export function adsV2IberianLanguage(text: string | null | undefined): 'pt' | 'es' | null {
  const raw = String(text ?? '').toLowerCase()
  if (!raw.trim() || !IBERIAN_SIGN.test(raw)) return null
  const words = new Set(raw.replace(/[^\p{L}\p{N}\s'’-]/gu, ' ').split(/\s+/).filter(Boolean))
  const pt = ADS_V2_PT_ONLY_WORDS.some((w) => words.has(w))
  const es = ADS_V2_ES_ONLY_WORDS.some((w) => words.has(w))
  return pt && !es ? 'pt' : es && !pt ? 'es' : null
}

/** Os códigos que a voz fala (espelho de NARRATION_LANGUAGE_CODES de lib/textLanguage.ts — este arquivo não importa valor). */
const VOICE_CODES: readonly NarrationLanguage[] = ['en', 'pt', 'es', 'hi', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'id', 'vi']
const asVoice = (raw: unknown): NarrationLanguage | null => {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  const two = /^[a-z]{2}(?:[-_][a-z0-9]+)?$/.test(v) ? v.slice(0, 2) : ''
  return (VOICE_CODES as readonly string[]).includes(two) ? (two as NarrationLanguage) : null
}

/** A língua pelo domínio do link ("www.loja.com.br" → pt; "shop.com" → null). Aceita endereço inteiro ou só o host. */
export function adsV2LanguageFromHost(raw: string | null | undefined): NarrationLanguage | null {
  const s = String(raw ?? '').trim().toLowerCase()
  if (!s) return null
  let host = ''
  try { host = new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).hostname } catch { return null }
  const tld = host.split('.').filter(Boolean).pop() ?? ''
  return ADS_V2_TLD_LANGUAGE[tld] ?? null
}

/** A dica do link: a língua que a página DECLARA (<html lang>, "pt"/"pt-BR"), senão a do domínio. null = o link não diz. */
export function adsV2LinkLanguageHint(pageLang: string | null | undefined, link: string | null | undefined): NarrationLanguage | null {
  return asVoice(pageLang) ?? adsV2LanguageFromHost(link)
}

/**
 * A língua da voz do anúncio. `chosen` = a escolha EXPLÍCITA da pessoa no seletor "Voz em" (vence sempre); `detected` = o detector
 * de sempre; `short` = o da frase curta; `text` = a frase (+ cena) para o desempate pt×es; `hint` = a dica do link; `ui` = a
 * interface. Puro.
 */
export function adsV2SpokenLanguage(x: { chosen: unknown; detected: unknown; short: unknown; text?: string | null; hint: unknown; ui: unknown }): NarrationLanguage {
  return asVoice(x.chosen) ?? asVoice(x.detected) ?? asVoice(x.short) ?? adsV2IberianLanguage(x.text) ?? asVoice(x.hint) ?? asVoice(x.ui) ?? 'en'
}
