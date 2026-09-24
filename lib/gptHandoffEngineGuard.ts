// GPT-LOJA-2026-09-24 — a ação do GPT recusa, na conversa, os dois roteiros que o Studio recusaria depois do cadastro.
//
// Verificação adversarial de 24/09 (antes de publicar o GPT na loja), confirmada por 2 céticos cada:
//  1) Kineo 1 (`fast`) mede o roteiro próprio na voz da persona que VAI falar (app/api/generate-video-fast/route.ts,
//     KINEO-RITMO-POR-VOZ-KINEO1) e recusa com 422 script_too_long_for_engine acima de 90 s × 1,15 (lib/durationFollowsScript).
//     Na voz de finanças (onyx 2,5 pal/s) isso é ~258 palavras; o GPT mandava 270-290 para 90 s e a ação dizia at_target.
//  2) Kling 3 e MiniMax H3 (`hollywood`/`h3`) narram só en/pt/es (lib/textLanguage HOLLYWOOD_LANGUAGES); a rota
//     cinemática recusa 422 language_not_supported_by_engine. A ação aceitava qualquer par.
// Esta função ESPELHA a medição da rota (parseUserScript → fala; selectPersonaForScript tier 'free'; speechRateFor
// classic com a voz da persona) sem tocar na rota travada (8.2). Recusar aqui custa um turno de conversa; recusar no
// Studio custa o cliente. Pura: sem banco, sem rede.
import { parseUserScript } from '@/lib/scriptParser'
import { speechRateFor } from '@/lib/speechRate'
import { selectPersonaForScript } from '@/lib/narration/niche-mapping'
import { isHollywoodLanguage, resolveNarrationLanguage } from '@/lib/textLanguage'
import { DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS, DURATION_FOLLOWS_SCRIPT_CEILING_TOLERANCE } from '@/lib/durationFollowsScript'

export type HandoffEngineRefusal =
  | { reason: 'too_long_for_kineo1'; speechSeconds: number; maxSeconds: number; maxWords: number; words: number; wordsPerSecond: number }
  | { reason: 'language_not_supported_by_engine'; language: string; engine: string }

/** O idioma que o Studio vai usar: o código pedido (2 letras) e, se for o padrão 'en', o detectado no texto. */
export function handoffNarrationLanguage(script: string, language: unknown): string {
  const code = typeof language === 'string' ? language.trim().slice(0, 2).toLowerCase() : ''
  return resolveNarrationLanguage(code || 'en', script).language
}

export function handoffEngineRefusal(input: { script: string; engineHint: string; language?: unknown }): HandoffEngineRefusal | null {
  const language = handoffNarrationLanguage(input.script, input.language)
  if ((input.engineHint === 'hollywood' || input.engineHint === 'h3') && !isHollywoodLanguage(language)) {
    return { reason: 'language_not_supported_by_engine', language, engine: input.engineHint }
  }
  if (input.engineHint !== 'fast') return null
  const parsed = parseUserScript(input.script)
  const marcadores = parsed.hasMarkers && parsed.segments.length > 0
  const fala = marcadores
    ? parsed.segments.map((seg) => seg.voiceover ?? '').join(' ')
    : (parsed.narration && parsed.narration.trim().length > 0 ? parsed.narration : input.script)
  let persona: { voice?: string; defaultSpeed?: number } | null = null
  try { persona = selectPersonaForScript(input.script, undefined, 'free', language as never) } catch { persona = null }
  const rate = speechRateFor({ family: 'classic', speed: parsed.speed, language, voice: persona?.voice, personaSpeed: persona?.defaultSpeed })
  const words = fala.trim().split(/\s+/).filter(Boolean).length
  const speech = words / rate.wordsPerSecond
  const limit = DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS * DURATION_FOLLOWS_SCRIPT_CEILING_TOLERANCE
  if (speech <= limit) return null
  return {
    reason: 'too_long_for_kineo1',
    speechSeconds: Math.round(speech),
    maxSeconds: DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS,
    maxWords: Math.floor(limit * rate.wordsPerSecond),
    words,
    wordsPerSecond: rate.wordsPerSecond,
  }
}

export function describeEngineRefusal(r: HandoffEngineRefusal): string {
  if (r.reason === 'too_long_for_kineo1') {
    return `This script narrates for about ${r.speechSeconds}s on Kineo 1 (fast), and Kineo 1 films go up to ${r.maxSeconds}s. Trim it to at most ${r.maxWords} spoken words (labels not counted) and send it again, or send it with engineHint "seedance".`
  }
  return `Kling 3 and MiniMax H3 narrate only English, Spanish or Portuguese, and this script is in "${r.language}". Send it again with engineHint "seedance" (it narrates this language).`
}
