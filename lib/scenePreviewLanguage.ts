// KINEO-PREVIA-LINGUA-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — A LÍNGUA DO ROTEIRO DA PRÉVIA.
//
// Caso de 02/11 (jstarshahzad43, Paquistão, região sem filme grátis → Gerar cai na prévia das cenas): ideia de 72 palavras
// em URDU. A tela mandava 'en' (só pt/es passavam) e a rota repassava ao escritor (/api/generate-script) → "LANGUAGE: Write
// everything in US English" + PASTED_SCRIPT_RULE "translate nothing" para um texto em urdu. Ordem impossível: o gpt-4o
// respondeu "I'm sorry, I can't assist with that request." duas vezes → "the AI declined the topic" → a pessoa foi embora.
//
// FÓRMULA ÚNICA (regra do fundador: conserto de língua é fórmula para todas as línguas, nunca remendo por língua):
//   · texto cuja maioria das LETRAS (> 50%) é de uma escrita NÃO latina → o roteiro sai na língua dessa escrita. Uma palavra
//     estrangeira solta ("story of दीवाली") não muda nada;
//   · escrita com várias línguas (cirílico, árabe, devanágari, han): marcas próprias decidem só quando são inequívocas; na
//     dúvida vale a dica da interface se ela for uma língua dessa escrita, senão a língua mais comum da escrita no catálogo
//     (o /api/generate-script não tem modo "mantenha a língua de origem" — ver KINEO-PREVIA-LINGUA-0211b no commit);
//   · texto latino → EXATAMENTE como antes: resolveNarrationLanguage(dica, texto) (a dica pt/es vence; 'en' só cede ao
//     detector de sempre, ≥ 8 palavras). Nada de adivinhar por palavra curta: "Los Angeles wildfires" segue en.
// KINEO-PREVIA-LINGUA-0211b — revisão: saiu o detectShortTextLanguage (nome de lugar virava língua e a volta ao Studio
// levava isso ao filme), entrou a maioria de letras e as escritas ambíguas (búlgaro, persa, curdo sorani, sérvio).
// LIB PURA (só funções; sem banco, sem rede).
import { narrationLanguage, resolveNarrationLanguage, type NarrationLanguage } from '@/lib/textLanguage'

export const PREVIA_LINGUA_VERSION = 'KINEO-PREVIA-LINGUA-0211b'

type Script = { name: string; test: RegExp; candidates: readonly NarrationLanguage[]; pick: (text: string) => NarrationLanguage | null }

/** Escritas não latinas. `candidates[0]` = a língua mais comum da escrita no catálogo; `pick` só responde quando tem certeza. */
const SCRIPTS: readonly Script[] = [
  { name: 'hangul', test: /\p{Script=Hangul}/u, candidates: ['ko'], pick: () => 'ko' },
  // han + kana numa escrita só: kana → japonês; han puro → chinês (cantonês escrito não se distingue com certeza)
  { name: 'cjk', test: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u, candidates: ['zh', 'ja', 'yue'], pick: (t) => (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(t) ? 'ja' : null) },
  { name: 'thai', test: /\p{Script=Thai}/u, candidates: ['th'], pick: () => 'th' },
  { name: 'greek', test: /\p{Script=Greek}/u, candidates: ['el'], pick: () => 'el' },
  { name: 'hebrew', test: /\p{Script=Hebrew}/u, candidates: ['he'], pick: () => 'he' },
  { name: 'bengali', test: /\p{Script=Bengali}/u, candidates: ['bn'], pick: () => 'bn' },
  // devanágari: hindi, marati, nepali… — só o hindi está no catálogo, e marca segura não há: vale a regra da escrita
  { name: 'devanagari', test: /\p{Script=Devanagari}/u, candidates: ['hi'], pick: () => null },
  {
    name: 'cyrillic', test: /\p{Script=Cyrillic}/u, candidates: ['ru', 'uk', 'bg'],
    pick: (t) => {
      if (/[ђјљњћџѓќѕ]/iu.test(t)) return null // sérvio/macedônio: fora do catálogo
      const uk = /[іїєґ]/iu.test(t), ru = /[ыэё]/iu.test(t), bg = /ъ/iu.test(t)
      if (uk && !ru && !bg) return 'uk'
      if (ru && !uk) return 'ru' // ъ aparece no russo (объявить); ы/э/ё nunca no búlgaro
      if (bg && !uk && !ru) return 'bg'
      return null
    },
  },
  {
    name: 'arabic', test: /\p{Script=Arabic}/u, candidates: ['ar', 'ur'],
    pick: (t) => {
      if (/[ەێۆڵڕڤ]/u.test(t)) return null // curdo sorani: fora do catálogo — nunca urdu
      if (/[ٹڈڑںےۓہھ]/u.test(t)) return 'ur'
      if (/[ةإأؤئى]/u.test(t)) return 'ar'
      // پچژگ / ک / ی não existem no árabe: sem marca só do árabe, a única língua do catálogo com essas letras é o urdu
      // ("پاکستان کی تاریخ" virava 'ar' + "translate nothing"). Persa (fa fora do catálogo) cai aqui também: urdu > árabe.
      if (/[پچژگکی]/u.test(t)) return 'ur'
      return null
    },
  },
]

/** A escrita não latina que tem MAIS DA METADE das letras do texto, ou null (texto latino, misto ou vazio). */
export function dominantScript(text: string): Script | null {
  const letters = String(text ?? '').match(/\p{L}/gu) ?? []
  if (!letters.length) return null
  for (const s of SCRIPTS) {
    const n = letters.filter((c) => s.test.test(c)).length
    if (n * 2 > letters.length) return s
  }
  return null
}

/**
 * A língua em que o escritor da prévia deve escrever. `hint` = a língua da interface que a tela mandou (nunca uma escolha
 * de voz). Escrita não latina dominante → a língua dessa escrita; texto latino → a regra de sempre.
 */
export function previaNarrationLanguage(hint: unknown, idea: string): NarrationLanguage {
  const text = String(idea ?? '')
  const script = dominantScript(text)
  if (!script) return resolveNarrationLanguage(hint, text).language
  const sure = script.pick(text)
  if (sure) return sure
  const asked = narrationLanguage(hint)
  return asked && script.candidates.includes(asked) ? asked : script.candidates[0]
}
