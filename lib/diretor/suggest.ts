// DIRETOR-KINEO-20260923 — lógica pura do "Diretor Kineo" (fundador aprovou o conceito e o desenho em 23/09;
// contrato docs/growth/DIRETOR-KINEO-2026-09-23.md). Sugestão OPCIONAL antes do Generate. Esta camada decide o
// que a sugestão PODE mudar — as garantias moram aqui, não na confiança no modelo:
//  · modo literal ("Use my script as is") sem consentimento de reescrita: o texto falado volta BYTE A BYTE,
//    qualquer coisa que o modelo devolva no campo de texto é descartada;
//  · 35/60/90 s respeitados (a rota antiga apply-suggestion convertia 35 em 45 em silêncio);
//  · a meta de palavras vem da MESMA régua por voz do guardião (lib/speechRate), então "cabe" aqui = o
//    portão deixa passar; ninguém redigita 2,3 ou 3,1;
//  · orientação visual separada da fala só quando a etiqueta [visual: …] estiver ligada no analyze-idea
//    (trava 8.2 — aguarda autorização nominal do fundador) e nunca no Kineo 1 (banco de imagens guiado pela fala).
// Nada aqui chama rede, banco, crédito, render ou o token de consentimento do Generate.
import { SPEECH_RATE_BASE, speechFamilyForQuality, speechSecondsOfScript } from '@/lib/speechRate'
import { MIN_COVERAGE } from '@/lib/narrationFit'
import { ASPECTS } from '@/lib/aspect'

export const DIRETOR_DAILY_CAP = 15
export const DIRETOR_MAX_CHARS = 6000
export const DIRETOR_DURATIONS = [35, 60, 90] as const
export type DiretorDuration = (typeof DIRETOR_DURATIONS)[number]
export type DiretorMode = 'ai' | 'verbatim'
/** Liga a orientação visual separada da fala. Só vira true junto com o tratamento de [visual: …] no analyze-idea. */
export const DIRETOR_VISUAL_TAG_LIVE = false
/** Motores em que a orientação visual não comanda a imagem (banco de imagens casado pela fala). */
export const DIRETOR_TEXT_ONLY_ENGINES: readonly string[] = ['fast']
export const DIRETOR_SERVED_EVENT = 'diretor_suggest_served'
export const DIRETOR_CLIENT_EVENTS = {
  requested: 'diretor_suggest_requested',
  shown: 'diretor_suggestion_shown',
  applied: 'diretor_suggestion_applied',
  undone: 'diretor_suggestion_undone',
  kept: 'diretor_suggestion_kept_original',
  stale: 'diretor_suggestion_stale_discarded',
  failed: 'diretor_suggest_failed',
} as const

export interface DiretorInput {
  text: string
  mode: DiretorMode
  engine: string
  duration: DiretorDuration
  language: string
  aspect: string
  /** Modo literal: a pessoa marcou "pode reescrever minhas palavras para caber". Padrão false. */
  rewriteConsent: boolean
}

export interface DiretorSuggestion {
  text: string
  changes: string[]
  visual: string | null
  textChanged: boolean
}

export function isDiretorDuration(n: unknown): n is DiretorDuration {
  return (DIRETOR_DURATIONS as readonly number[]).includes(Number(n))
}

/** Valida o corpo vindo do Studio. Nunca troca a duração por outra: fora de 35/60/90 é erro, não "45". */
export function validateDiretorRequest(body: unknown): { ok: true; input: DiretorInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const text = typeof b.text === 'string' ? b.text : ''
  if (!text.trim()) return { ok: false, error: 'text_required' }
  if (text.length > DIRETOR_MAX_CHARS) return { ok: false, error: 'text_too_long' }
  const mode = b.mode === 'ai' || b.mode === 'verbatim' ? b.mode : null
  if (!mode) return { ok: false, error: 'mode_invalid' }
  if (!isDiretorDuration(b.duration)) return { ok: false, error: 'duration_invalid' }
  const engine = typeof b.engine === 'string' && /^[a-z0-9_]{1,24}$/.test(b.engine) ? b.engine : null
  if (!engine) return { ok: false, error: 'engine_invalid' }
  const language = typeof b.language === 'string' && /^[a-z]{2}$/.test(b.language) ? b.language : 'en'
  const aspect = (ASPECTS as readonly string[]).includes(String(b.aspect)) ? String(b.aspect) : '9:16'
  const rewriteConsent = b.rewriteConsent === true
  return { ok: true, input: { text, mode, engine, duration: Number(b.duration) as DiretorDuration, language, aspect, rewriteConsent } }
}

/** Faixa de palavras para o texto falado encher a duração na régua da voz do motor (piso = cobertura do portão). */
export function diretorWordRange(engine: string, duration: DiretorDuration): { min: number; max: number; wordsPerSecond: number } {
  const wordsPerSecond = SPEECH_RATE_BASE[speechFamilyForQuality(engine)]
  return {
    wordsPerSecond,
    min: Math.ceil(duration * wordsPerSecond * Math.max(MIN_COVERAGE, 0.97)),
    max: Math.ceil(duration * wordsPerSecond * 1.12),
  }
}

/** Estimativa local (sem rede) de quanto o texto enche a duração, na mesma régua da tela e do portão. */
export function diretorFit(text: string, engine: string, duration: DiretorDuration): { speechSeconds: number; coverage: number; fits: boolean } {
  const { seconds } = speechSecondsOfScript(engine, text)
  const coverage = duration > 0 ? seconds / duration : 1
  return { speechSeconds: Math.round(seconds), coverage, fits: coverage >= MIN_COVERAGE }
}

/** O que a sugestão pode tocar nesta combinação. */
export function diretorScope(input: Pick<DiretorInput, 'mode' | 'engine' | 'rewriteConsent'>): { mayRewriteText: boolean; mayAddVisual: boolean } {
  return {
    mayRewriteText: input.mode === 'ai' || input.rewriteConsent === true,
    mayAddVisual: DIRETOR_VISUAL_TAG_LIVE && !DIRETOR_TEXT_ONLY_ENGINES.includes(input.engine),
  }
}

/** Chave da entrada: qualquer mudança de texto/configuração torna a resposta pendente obsoleta. */
export function diretorInputKey(input: Omit<DiretorInput, 'rewriteConsent'> & { rewriteConsent?: boolean }): string {
  return JSON.stringify([input.text, input.mode, input.engine, input.duration, input.language, input.aspect, input.rewriteConsent === true])
}

export function buildDiretorMessages(input: DiretorInput, languageName: string): { system: string; user: string } {
  const scope = diretorScope(input)
  const range = diretorWordRange(input.engine, input.duration)
  const tasks: string[] = []
  if (input.mode === 'ai') {
    tasks.push(`The user gave an IDEA (not a script). Return a sharper version of the same idea in ${languageName}: one concrete subject, the surprising angle, and the payoff, in 1-3 sentences. Keep the user's topic; do not switch to another story.`)
  } else if (scope.mayRewriteText) {
    tasks.push(`The user gave a SCRIPT that is narrated word for word, and explicitly allowed you to rewrite it to fit a ${input.duration}-second video. Return the full script in ${languageName} with ${range.min}-${range.max} spoken words. Keep the user's facts, order, hook and voice; extend or tighten, do not replace the story.`)
  } else {
    tasks.push('Do not return any script text: set "text" to an empty string.')
  }
  if (scope.mayAddVisual) {
    tasks.push('In "visual", give ONE line (max 120 characters) of visual direction for every scene: look, light, era, place. Never words, signs, labels or anything to be spoken.')
  }
  const system = [
    'You are Kineo\'s director. You suggest; the user decides.',
    ...tasks,
    'Never invent facts, statistics, dates, names or quotes that are not in the user\'s text. If a fact is missing, leave it out.',
    'In "changes", list at most 4 short, concrete changes you made (max 120 characters each), in the user\'s language.',
    'Reply with JSON only: {"text": string, "changes": string[], "visual": string}.',
  ].join('\n')
  const user = `Video: engine=${input.engine}, duration=${input.duration}s, format=${input.aspect}, language=${input.language}.\n\nUSER TEXT:\n${input.text}`
  return { system, user }
}

/** Lê a resposta do modelo e APLICA o escopo. O que o escopo não permite é descartado aqui, não confiado ao modelo. */
export function parseDiretorOutput(raw: string, input: DiretorInput): DiretorSuggestion | null {
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse((raw ?? '').replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim())
  } catch {
    return null
  }
  const scope = diretorScope(input)
  const proposed = typeof obj.text === 'string' ? obj.text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim() : ''
  const text = scope.mayRewriteText && proposed && proposed.length <= DIRETOR_MAX_CHARS ? proposed : input.text
  const changes = Array.isArray(obj.changes)
    ? obj.changes.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim().slice(0, 120)).slice(0, 4)
    : []
  const visualRaw = typeof obj.visual === 'string' ? obj.visual.replace(/[\[\]\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) : ''
  const visual = scope.mayAddVisual && visualRaw ? visualRaw : null
  const textChanged = text !== input.text
  if (!textChanged && !visual) return null
  return { text, changes, visual, textChanged }
}
