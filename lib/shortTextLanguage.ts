// KINEO-ADS-CONSERTOS-TELA-1410 — A LÍNGUA DE UMA FRASE CURTA (Studio Ads).
//
// Caso do QA de 14/10: foto de perfume + "perfume num hotel com chuva" (5 palavras) com a interface em inglês → a voz saiu
// em INGLÊS. detectNarrationLanguage (lib/textLanguage.ts) devolve null abaixo de 8 palavras — de propósito: é a régua do
// pipeline de FILMES (TRAVA 8.2) e NÃO muda. Este é um detector SEPARADO, só para a frase curta do anúncio, usado como
// RESERVA depois dele (a escolha explícita da pessoa e o detector de sempre vêm antes).
//
// CONSERVADOR: devolve uma língua só quando há evidência e NENHUMA outra língua tem marca. Na dúvida, null (o chamador
// fica com a língua da interface e mostra o seletor "Voz em").
//   1. escrita própria: cirílico (ru/uk), árabe (ar/ur), devanágari (hi);
//   2. letras que só uma língua usa: ã/õ → pt · ñ ¿ ¡ → es · ß → de · ğ ı ş → tr · ą ę ł ż ź → pl · ơ ư đ e as vogais com
//      dois acentos → vi (o ã/õ do vietnamita não conta como pt quando há marca do vietnamita);
//   3. palavras funcionais de 2+ letras que só uma das línguas usa ("num", "uma", "com", "não" → pt; "los", "muy" → es…).
// Endereços (shop.com, www.x.com.br, e-mail) saem ANTES da contagem: o ".com" nunca vira o "com" do português.
// LIB PURA (só `import type`).
import type { NarrationLanguage } from '@/lib/textLanguage'

/** Palavras funcionais EXCLUSIVAS (conferidas contra as outras listas: nenhuma palavra aparece em duas). */
const SHORT_WORDS: Partial<Record<NarrationLanguage, readonly string[]>> = {
  pt: ['num', 'numa', 'uma', 'umas', 'com', 'não', 'nao', 'você', 'voce', 'pra', 'muito', 'muita', 'também', 'tambem', 'até', 'isso', 'nosso', 'nossa', 'minha', 'meu', 'é', 'são', 'ao', 'aos', 'às', 'pela', 'novo', 'nova', 'melhor', 'agora'],
  es: ['el', 'los', 'las', 'muy', 'pero', 'nuestro', 'nuestra', 'también', 'ahora', 'nuevo', 'nueva', 'mejor', 'tienda', 'aquí'],
  en: ['the', 'and', 'with', 'your', 'our', 'of', 'this', 'that', 'for', 'from', 'buy', 'new', 'best', 'now'],
  fr: ['les', 'et', 'avec', 'pour', 'dans', 'une', 'aux', 'votre', 'notre', 'nouveau', 'nouvelle', 'très', 'meilleur'],
  de: ['der', 'und', 'mit', 'für', 'ein', 'eine', 'ist', 'im', 'auf', 'unser', 'unsere', 'dein', 'deine', 'neu', 'neue', 'jetzt'],
  it: ['della', 'delle', 'degli', 'nel', 'nella', 'gli', 'sono', 'molto', 'nuovo', 'nuova', 'questo', 'questa', 'nostro', 'nostra', 'tuo'],
  nl: ['het', 'een', 'voor', 'onze', 'jouw', 'nieuwe', 'bij', 'niet', 'ook'],
  pl: ['dla', 'jest', 'oraz', 'nasz', 'nasza', 'nowy', 'nowa'],
  tr: ['ve', 'bir', 'ile', 'için', 'bu', 'yeni'],
  id: ['yang', 'untuk', 'dengan', 'ini', 'kami', 'baru'],
}

/** Letras que, sozinhas, apontam UMA língua (sem conflito entre si; o vietnamita é conferido antes do ã/õ). */
const VI_LETTERS = /[ơưđạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/iu
const LETTERS: readonly [NarrationLanguage, RegExp][] = [
  ['pt', /[ãõ]/iu],
  ['es', /[ñ¿¡]/iu],
  ['de', /ß/u],
  ['tr', /[ğış]/iu],
  ['pl', /[ąęłżź]/iu],
]

/** Tira URL, domínio e e-mail ("shop.com", "www.loja.com.br", "a@b.co") antes de contar — o ".com" não é o "com". */
function stripAddresses(text: string): string {
  return text
    .replace(/\S+@\S+/gu, ' ')
    .replace(/(?:https?:\/\/|www\.)\S*/giu, ' ')
    .replace(/[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+(?:\/\S*)?/gu, ' ')
}

/**
 * A língua de uma frase CURTA (qualquer tamanho, pensada para 1–8 palavras). null = sem evidência ou com evidência de
 * duas línguas. Nunca adivinha pelo vocabulário de conteúdo ("perfume", "hotel" existem em várias línguas).
 */
export function detectShortTextLanguage(text: string | null | undefined): NarrationLanguage | null {
  const raw = stripAddresses(String(text ?? '')).toLowerCase()
  if (!raw.trim()) return null
  // 1. escrita própria
  if (/\p{Script=Devanagari}/u.test(raw)) return 'hi'
  if (/\p{Script=Cyrillic}/u.test(raw)) {
    const uk = /[іїєґ]/u.test(raw)
    const ru = /[ыэъё]/u.test(raw)
    return uk && !ru ? 'uk' : ru && !uk ? 'ru' : null
  }
  if (/\p{Script=Arabic}/u.test(raw)) {
    const ur = /[ٹڈڑںےۓہھ]/u.test(raw)
    const ar = /[ةإأي]/u.test(raw)
    return ur && !ar ? 'ur' : ar && !ur ? 'ar' : null
  }
  // 2 e 3. latinas: marcas por língua (letra própria + palavra funcional própria)
  const hits = new Map<NarrationLanguage, number>()
  const bump = (l: NarrationLanguage, n = 1) => hits.set(l, (hits.get(l) ?? 0) + n)
  if (VI_LETTERS.test(raw)) bump('vi', 2)
  else for (const [l, re] of LETTERS) if (re.test(raw)) bump(l, 2)
  const words = raw.replace(/[^\p{L}\p{N}\s'’-]/gu, ' ').split(/\s+/).filter(Boolean)
  for (const w of words) {
    for (const [l, list] of Object.entries(SHORT_WORDS) as [NarrationLanguage, readonly string[]][]) if (list.includes(w)) bump(l)
  }
  if (hits.size !== 1) return null
  return [...hits.keys()][0]
}
