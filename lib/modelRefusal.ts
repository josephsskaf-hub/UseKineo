// KINEO1-JUIZ-HONESTO-2026-09-21 — a RECUSA do modelo virou filme (e nota 100).
//
// Diagnóstico de 18/09 (docs/KINEO1-DIAGNOSTICO-2026-09-18.md, filme 33c24d46): o roteirista devolveu
// "I'm sorry, but I can't assist with that request", o Kineo 1 narrou a frase em 6 cenas, o juiz deu texto 100
// ("segue o pedido") e a pessoa pagou 5 créditos por um filme que é um pedido de desculpas. Fonte única para as
// duas portas: o escritor (recusa antes do gasto) e o juiz (nota 0 sem GPT quando o filme antigo já nasceu assim).
const REFUSAL_PATTERNS: ReadonlyArray<RegExp> = [
  /\bI['’]?m sorry,? but I (?:can['’]?t|cannot|am unable to) (?:assist|help|comply|create|write|do that)/i,
  /\bI (?:can['’]?t|cannot|am unable to) (?:assist|help) with (?:that|this) request/i,
  /\bI (?:can['’]?t|cannot) (?:create|write|generate|produce) (?:that|this|content)/i,
  /\bas an AI(?: language model)?,? I (?:can['’]?t|cannot)/i,
  /\b(?:desculpe|sinto muito),? (?:mas )?n[ãa]o posso (?:ajudar|criar|escrever)/i,
  /\blo siento,? (?:pero )?no puedo (?:ayudar|crear|escribir)/i,
]

/** O texto é (ou começa com) uma recusa do modelo, não um roteiro. */
export function looksLikeModelRefusal(text: string | null | undefined): boolean {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return false
  const head = t.slice(0, 400)
  return REFUSAL_PATTERNS.some((re) => re.test(head))
}

export const MODEL_REFUSAL_MESSAGE =
  'The writer could not turn this idea into a script (the AI declined the topic). Nothing was charged — try rewording the idea, or paste your own script with "Use my script as is".'
