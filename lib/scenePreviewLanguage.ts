// KINEO-PREVIA-LINGUA-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — A LÍNGUA DO ROTEIRO DA PRÉVIA.
//
// Caso de 02/11 (jstarshahzad43, Paquistão, região sem filme grátis → Gerar cai na prévia das cenas): ideia de 72 palavras
// em URDU. A tela mandava a língua da INTERFACE forçada a 'en' (só pt/es passavam) e a rota repassava ao escritor
// (/api/generate-script) → "LANGUAGE: Write everything in US English" + PASTED_SCRIPT_RULE "translate nothing" para um texto
// em urdu. Ordem impossível: o gpt-4o respondeu "I'm sorry, I can't assist with that request." duas vezes → "the AI declined
// the topic" → a pessoa foi embora sem ver uma cena.
//
// FÓRMULA ÚNICA PARA TODAS AS LÍNGUAS (regra do fundador: conserto de língua é fórmula, nunca remendo por língua):
//   a língua da INTERFACE é só uma dica — a tela da prévia não tem seletor de voz. O roteiro sai na língua do PRÓPRIO texto
//   quando ela é conhecida; só quando o texto não diz nada a dica vale.
//   1. resolveNarrationLanguage (lib/textLanguage — a MESMA regra das rotas de geração) sobre o texto, sem a dica:
//      o detector de sempre (≥ 8 palavras, en/pt/es/fr/de/it);
//   2. senão, detectShortTextLanguage (lib/shortTextLanguage): escrita própria (devanágari, cirílico, árabe/urdu) e marcas
//      exclusivas das latinas (tr, pl, vi, nl, id…);
//   3. senão, a escrita dominante do texto (hangul, kana, han, tailandês, grego, hebraico, bengali, árabe, cirílico): um
//      texto que é quase todo de outra escrita NUNCA é tratado como inglês;
//   4. senão, a dica da interface (qualquer código do catálogo); sem dica, 'en'.
// Assim um texto em inglês, português ou espanhol sai como antes, e nenhum texto de outra língua recebe "write in English"
// junto com "translate nothing". LIB PURA (só funções; sem banco, sem rede).
import { narrationLanguage, resolveNarrationLanguage, type NarrationLanguage } from '@/lib/textLanguage'
import { detectShortTextLanguage } from '@/lib/shortTextLanguage'

export const PREVIA_LINGUA_VERSION = 'KINEO-PREVIA-LINGUA-0211'

/** Escritas que, sozinhas, nomeiam uma língua do catálogo (ordem: as mais específicas primeiro). */
const SCRIPTS: readonly [RegExp, (text: string) => NarrationLanguage][] = [
  [/\p{Script=Hangul}/gu, () => 'ko'],
  [/[\p{Script=Hiragana}\p{Script=Katakana}]/gu, () => 'ja'],
  [/\p{Script=Han}/gu, () => 'zh'],
  [/\p{Script=Thai}/gu, () => 'th'],
  [/\p{Script=Greek}/gu, () => 'el'],
  [/\p{Script=Hebrew}/gu, () => 'he'],
  [/\p{Script=Bengali}/gu, () => 'bn'],
  [/\p{Script=Devanagari}/gu, () => 'hi'],
  [/\p{Script=Arabic}/gu, (t) => (/[ٹڈڑںےۓہھ]/u.test(t) ? 'ur' : 'ar')],
  [/\p{Script=Cyrillic}/gu, (t) => (/[іїєґ]/u.test(t) && !/[ыэъё]/u.test(t) ? 'uk' : 'ru')],
]

/** A língua da escrita que domina o texto (mais letras dela do que latinas), ou null se o texto é latino/vazio. */
export function dominantScriptLanguage(text: string): NarrationLanguage | null {
  const t = String(text ?? '')
  const latin = (t.match(/\p{Script=Latin}/gu) ?? []).length
  let best: { lang: NarrationLanguage; n: number } | null = null
  for (const [re, pick] of SCRIPTS) {
    const n = (t.match(re) ?? []).length
    if (n > 0 && (!best || n > best.n)) best = { lang: pick(t), n }
  }
  return best && best.n > latin ? best.lang : null
}

/**
 * A língua em que o escritor da prévia deve escrever: a do próprio texto quando conhecida; senão a dica da interface.
 * `hint` = a língua da interface que a tela mandou (nunca uma escolha de voz).
 */
export function previaNarrationLanguage(hint: unknown, idea: string): NarrationLanguage {
  const text = String(idea ?? '')
  const resolved = resolveNarrationLanguage(null, text)
  if (resolved.detected) return resolved.language
  return detectShortTextLanguage(text) ?? dominantScriptLanguage(text) ?? narrationLanguage(hint) ?? 'en'
}
