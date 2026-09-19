import type { ScenePurpose } from './types'

export interface SceneSegment {
  narration: string
  purpose: ScenePurpose
  estimatedDuration: number
}

// TTS-1-HD speaks at ~3.1 words/second (calibrated in lib/openai.ts)
const WORDS_PER_SECOND = 3.1
const MIN_SCENE_DURATION = 1.5
const MAX_SCENE_DURATION = 3.0

function wordsToDuration(wordCount: number): number {
  const raw = wordCount / WORDS_PER_SECOND
  return Math.min(MAX_SCENE_DURATION, Math.max(MIN_SCENE_DURATION, raw))
}

function purposeFromMarker(marker: string): ScenePurpose {
  const m = marker.toUpperCase()
  if (/\bHOOK\b/.test(m)) return 'hook'
  if (/MICRO REWARD|MICRO RECOMPENSA/.test(m)) return 'explanation'
  if (/ESCALATION|ESCALADA/.test(m)) return 'escalation'
  if (/PAYOFF|PAGAMENTO|RECOMPENSA FINAL/.test(m)) return 'payoff'
  return 'explanation'
}

/**
 * Attempts to split script by HOOK/MICRO REWARD/ESCALATION/PAYOFF markers.
 * Falls back to sentence-based splitting when markers are absent.
 */
export function splitScriptToScenes(script: string): SceneSegment[] {
  const text = (script ?? '').trim()
  if (!text) return []

  // Detect structured markers (English and Portuguese variants)
  const hasHook = /\b(HOOK|GANCHO)\b/i.test(text)
  const hasMR = /\b(MICRO REWARD|MICRO RECOMPENSA)\b/i.test(text)
  const hasPayoff = /\b(PAYOFF|PAGAMENTO|RECOMPENSA FINAL)\b/i.test(text)

  if (hasHook && (hasMR || hasPayoff)) {
    return splitByMarkers(text)
  }

  return splitBySentences(text)
}

function splitByMarkers(text: string): SceneSegment[] {
  // Split at lines that begin a section header
  const parts = text.split(
    /\n(?=(?:HOOK|GANCHO|MICRO REWARD\s+\d+|MICRO RECOMPENSA\s+\d+|ESCALATION|ESCALADA|PAYOFF|PAGAMENTO|RECOMPENSA FINAL)[\s:(])/i,
  )

  const segments: SceneSegment[] = []

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Extract marker and body
    const markerMatch = trimmed.match(
      /^(HOOK|GANCHO|MICRO REWARD\s+\d+|MICRO RECOMPENSA\s+\d+|ESCALATION|ESCALADA|PAYOFF|PAGAMENTO|RECOMPENSA FINAL)[^:\n]*:?\s*/i,
    )
    if (!markerMatch) continue

    const marker = markerMatch[0]
    const purpose = purposeFromMarker(trimmed)
    // Strip pexels markers and leading quotes
    const body = trimmed
      .slice(marker.length)
      .replace(/^\s*\[\s*pexels[^\]]*\]\s*/i, '')
      .replace(/^[""]|[""]$/g, '')
      .trim()

    if (!body) continue

    const wordCount = body.split(/\s+/).filter(Boolean).length
    segments.push({
      narration: body,
      purpose,
      estimatedDuration: wordsToDuration(wordCount),
    })
  }

  return segments.length >= 2 ? segments : splitBySentences(text)
}

// ═══ KINEO1-DIVISOR-POLIGLOTA-2026-09-18 — o divisor de cenas era cego a hindi/urdu/árabe e a texto corrido ═══
//
// MEDIDO (18/09, painel de coerência): roteiro em hindi (mrsaadkk, notas 50/55) termina frase com "।" (danda,
// U+0964) — o texto inteiro virou UMA cena, e a única busca ("jaipur neighborhood, animated characters, colorful
// houses") foi copiada para as 6 cenas do filme: pardal, vilarejo italiano, Bangladesh. Um pedido em espanhol
// (rcmh, nota 30) era uma frase só de vírgulas → mesma coisa ("pride flag, hotel room, dress shoes" × 4).
// A rota alinha plano×cenas por posição: 1 entrada no plano = a mesma busca em todas as cenas.
// Abrimos 16 línguas em 17/09 (hindi, urdu, árabe entre elas) em cima deste divisor.
//
// REGRA: (1) fim de frase inclui "।" (hindi/bengali), "۔" (urdu), "؟" (árabe/urdu), "。！？" (CJK);
// (2) sem pontuação suficiente, um bloco longo (≥ SCENE_SPLIT_MAX_WORDS) é partido em vírgulas/ponto-e-vírgula
// e, na falta delas, por contagem de palavras — nunca mais UMA cena de 100 palavras.
export const SCENE_SPLIT_MAX_WORDS = 24
const SENTENCE_END = /(?<=[.!?\u0964\u06D4\u061F\u3002\uFF01\uFF1F])\s+/
const CLAUSE_END = /(?<=[,;:\u060C\u3001])\s+/ // vírgula latina, ponto-e-vírgula, dois-pontos, vírgula árabe "،", vírgula CJK "、"

function wordCountOf(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

/** Parte um bloco longo em pedaços de até SCENE_SPLIT_MAX_WORDS, primeiro nas vírgulas, depois por contagem. */
export function splitLongBlock(block: string): string[] {
  if (wordCountOf(block) <= SCENE_SPLIT_MAX_WORDS) return [block]
  const out: string[] = []
  let atual = ''
  for (const clause of block.split(CLAUSE_END).map((c) => c.trim()).filter(Boolean)) {
    const junto = atual ? `${atual} ${clause}` : clause
    if (atual && wordCountOf(junto) > SCENE_SPLIT_MAX_WORDS) { out.push(atual); atual = clause } else { atual = junto }
  }
  if (atual) out.push(atual)
  // Cláusula única gigante (sem vírgula): corta por contagem de palavras.
  return out.flatMap((piece) => {
    const words = piece.split(/\s+/).filter(Boolean)
    if (words.length <= SCENE_SPLIT_MAX_WORDS) return [piece]
    const chunks: string[] = []
    const n = Math.ceil(words.length / SCENE_SPLIT_MAX_WORDS)
    const size = Math.ceil(words.length / n)
    for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size).join(' '))
    return chunks
  })
}

/** Frases de um texto em qualquer das 16 línguas da casa; blocos longos são partidos (ver cabeçalho). */
export function splitSentencesPolyglot(text: string): string[] {
  return text
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .flatMap(splitLongBlock)
}

function splitBySentences(text: string): SceneSegment[] {
  // KINEO1-DIVISOR-POLIGLOTA-2026-09-18 — ver o cabeçalho acima.
  const sentences = splitSentencesPolyglot(text)

  if (sentences.length === 0) return []

  // Assign purposes based on position
  const segments: SceneSegment[] = sentences.map((narration, i) => {
    const wordCount = narration.split(/\s+/).filter(Boolean).length
    let purpose: ScenePurpose

    if (i === 0) {
      purpose = 'hook'
    } else if (i === sentences.length - 1) {
      purpose = 'payoff'
    } else {
      const progress = i / (sentences.length - 1)
      if (progress < 0.4) {
        purpose = 'explanation'
      } else if (progress < 0.75) {
        purpose = 'escalation'
      } else {
        // PUSH #93 — this arm returned 'escalation' too, making the < 0.75
        // branch a no-op and leaving the whole back half of the script tagged
        // as escalation. In this repo's HOOK / MICRO REWARD / ESCALATION /
        // PAYOFF structure the final quarter is the payoff (same purpose the
        // last sentence already gets), so the attention curve and the prompt
        // builder now see a resolving beat instead of endless escalation.
        purpose = 'payoff'
      }
    }

    return {
      narration,
      purpose,
      estimatedDuration: wordsToDuration(wordCount),
    }
  })

  return segments
}
