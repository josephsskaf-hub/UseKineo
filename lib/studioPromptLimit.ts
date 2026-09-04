// ═══ KINEO-STUDIO-TETO-VISIVEL-2026-09-02 (sprint-assinaturas #9) ═══════════
// O /studio e a porta principal do produto e a caixa de texto dele NAO tinha
// teto nem contador: a pessoa colava o roteiro inteiro do ChatGPT (6.228
// caracteres, com [SCENE], VISUAL:, etc.), apertava Generate, e so na tela
// SEGUINTE (/studio/create) lia "Your text is 6,228 characters — 1,228 over
// the 5,000 limit. Trim it and try again." — para um texto que a caixa de la
// nem deixa editar direito (maxLength=5000 com valor de 6.228 vindo da URL).
// Medido 02/09 03:09→03:30 UTC: um trial do ChatGPT com 25cr intactos bateu
// nessa parede 7 vezes em 21 minutos e foi embora sem video (e sem pagar o
// Starter que chegou a abrir no checkout).
//
// Regra: o teto aparece ONDE a pessoa escreve, com o numero exato, e existe
// UM clique honesto para caber — corta no fim da ultima frase inteira que
// cabe, nunca no meio de uma palavra, e diz quantos caracteres sairam para a
// pessoa conferir o final. O numero vem de lib/analyzeLimits.ts (fonte unica
// do teto do /api/analyze-idea); esta lib e pura para o teste .mjs.
import { ANALYZE_PROMPT_MAX_CHARS } from '@/lib/analyzeLimits'

export type PromptLimitState = {
  length: number
  max: number
  over: boolean
  excess: number
}

export type PromptLimitLocale = 'en' | 'pt' | 'es'

const PROMPT_LIMIT_COPY = {
  en: {
    locale: 'en-US', characters: 'characters', over: 'over the limit', trim: 'Trim to fit',
    preserved: 'Nothing was removed. Trim here or edit the text before continuing.',
    removed: (count: string) => `${count} characters removed. Review the ending before continuing.`,
  },
  pt: {
    locale: 'pt-BR', characters: 'caracteres', over: 'acima do limite', trim: 'Ajustar ao limite',
    preserved: 'Nada foi removido. Ajuste aqui ou edite o texto antes de continuar.',
    removed: (count: string) => `${count} caracteres removidos. Confira o final antes de continuar.`,
  },
  es: {
    locale: 'es-ES', characters: 'caracteres', over: 'por encima del límite', trim: 'Ajustar al límite',
    preserved: 'No se eliminó nada. Ajústalo aquí o edita el texto antes de continuar.',
    removed: (count: string) => `${count} caracteres eliminados. Revisa el final antes de continuar.`,
  },
} as const

function localizedNumber(value: number, locale: PromptLimitLocale): string {
  return value.toLocaleString(PROMPT_LIMIT_COPY[locale].locale)
}

export function promptLimitState(text: string, max: number = ANALYZE_PROMPT_MAX_CHARS): PromptLimitState {
  const length = text.trim().length
  const excess = Math.max(0, length - max)
  return { length, max, over: excess > 0, excess }
}

export type TrimResult = {
  text: string
  removed: number
  boundary: 'sentence' | 'word' | 'hard' | 'none'
}

// Corta `text` para caber em `max` caracteres, preferindo a fronteira de frase
// mais tarde (. ! ? … ou quebra de linha) que ainda deixe pelo menos metade do
// teto — para nao devolver 3 linhas de um roteiro de 6 mil caracteres so
// porque a ultima frase inteira era la atras. Sem frase util, corta na ultima
// palavra inteira; sem espaco (texto sem espacos), corte duro.
export function trimPromptToLimit(text: string, max: number = ANALYZE_PROMPT_MAX_CHARS): TrimResult {
  const src = text.trim()
  if (src.length <= max) return { text: src, removed: 0, boundary: 'none' }
  const window = src.slice(0, max)
  const floor = Math.floor(max / 2)
  let cut = -1
  let boundary: TrimResult['boundary'] = 'hard'
  const sentenceEnd = /[.!?…]["'”’)\]]?(?=\s)|\n/g
  let m: RegExpExecArray | null
  while ((m = sentenceEnd.exec(window)) !== null) {
    const end = m.index + m[0].length
    if (end >= floor) { cut = end; boundary = 'sentence' }
  }
  if (cut < 0) {
    const lastSpace = window.lastIndexOf(' ')
    if (lastSpace >= floor) { cut = lastSpace; boundary = 'word' }
  }
  if (cut < 0) { cut = max; boundary = 'hard' }
  const out = window.slice(0, cut).trimEnd()
  return { text: out, removed: src.length - out.length, boundary }
}

export function formatLimitCounter(state: PromptLimitState, locale: PromptLimitLocale = 'en'): string {
  const copy = PROMPT_LIMIT_COPY[locale]
  const n = (value: number) => localizedNumber(value, locale)
  if (!state.over) return `${n(state.length)} / ${n(state.max)} ${copy.characters}`
  return `${n(state.length)} / ${n(state.max)} ${copy.characters} — ${n(state.excess)} ${copy.over}`
}

export function formatPromptLimitTrimAction(excess: number, locale: PromptLimitLocale = 'en'): string {
  return `${PROMPT_LIMIT_COPY[locale].trim} (${localizedNumber(excess, locale)})`
}

export function promptLimitPreservedMessage(locale: PromptLimitLocale = 'en'): string {
  return PROMPT_LIMIT_COPY[locale].preserved
}

export function formatPromptLimitTrimNotice(removed: number, locale: PromptLimitLocale = 'en'): string {
  return PROMPT_LIMIT_COPY[locale].removed(localizedNumber(removed, locale))
}
