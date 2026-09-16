// KINEO-PROMPT-PROPRIO-2026-09-16 — a caixa de ideia recebeu a NOSSA PRÓPRIA TELA.
//
// Caso real (16/09, cadastro do trial de 10 vindo do ChatGPT, globaloutreach33): o texto despachado
// tinha 1.018 caracteres e era o Studio inteiro — "Studio / English / 10 credits / Your idea first.
// Review the settings, then generate. / 🎲 Surprise me / ✨ Let AI structure it / …". O filme narrou a
// nossa interface, cobrou 5 dos 10 créditos, e o fundador viu um vídeo que "não é sobre nada". Quem
// vê isso no primeiro filme não compra nunca.
//
// Regra: se o texto contém ≥ 3 frases que só existem na nossa interface, não é uma ideia — é a página
// colada. Recusa ANTES de qualquer custo (analyze e generate), com uma frase que diz o que fazer.
// Falsos positivos são raríssimos: ninguém escreve "Review the settings, then generate" numa história.

const FRASES_DA_NOSSA_TELA: readonly string[] = [
  'your idea first',
  'review the settings, then generate',
  'let ai structure it',
  'use my script as is',
  'just this clip (no narration)',
  'a single line is enough',
  'or paste a full script',
  "what's your video about?",
  'what’s your video about?',
  'one idea in — a finished film out',
  'voiced, scored and captioned',
  'surprise me',
  'true story',
  'my script',
  '1080p ▾',
  '16:9 · widescreen',
  '1:1 · square',
  '4:5 · feed',
  'tiktok · reels',
  'rendering your film',
  'pick duration and quality, then generate',
]

export const PROMPT_PROPRIO_MIN_FRASES = 3

/** Frases da nossa interface encontradas no texto (minúsculas, únicas). */
export function frasesDaNossaTela(text: string | null | undefined): string[] {
  const t = (text ?? '').toLowerCase().replace(/\s+/g, ' ')
  if (t.length < 40) return []
  const achadas: string[] = []
  for (const f of FRASES_DA_NOSSA_TELA) if (t.includes(f)) achadas.push(f)
  return achadas
}

/** true = o texto é a nossa própria tela colada, não uma ideia. */
export function looksLikeOurOwnUi(text: string | null | undefined): boolean {
  return frasesDaNossaTela(text).length >= PROMPT_PROPRIO_MIN_FRASES
}

export const PROMPT_PROPRIO_REASON = 'prompt_is_our_ui'
export const PROMPT_PROPRIO_MESSAGE =
  'That text is the Kineo page itself, not a video idea. Clear the box and type your topic (one line is enough) or paste your own script — nothing was charged.'
