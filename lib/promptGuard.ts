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

// ── KINEO-1-COERENCIA-2026-09-16 — a PÍLULA SOZINHA não é uma ideia ───────────────────────────
//
// Caso real (16/09): wisadot849 (ChatGPT, trial de 10) apertou "📖 True Story" e Generate sem
// completar a frase — o despacho tinha 28 caracteres: "The incredible true story of". O roteirista
// INVENTOU "uma cidade escondida na Amazônia há 500 anos"; o filme cobrou 5 créditos e não era sobre
// nada que a pessoa pediu. uldanai148 (03:16) idem com "The unsolved mystery of" (23 caracteres) →
// "hiker sumido em 1967". Um filme inventado no primeiro contato é o jeito mais rápido de a pessoa
// não assinar. Regra: texto curto (≤ 6 palavras) que TERMINA numa palavra que exige continuação
// ("of", "about", "the", "why", "how"…) é frase inacabada — recusa antes de custar, com a frase que
// diz o que fazer. A pílula do Studio também trava o botão enquanto o texto for só isso.
const STARTERS_DA_CASA: readonly string[] = [
  '5 shocking facts about',
  'the unsolved mystery of',
  'the incredible true story of',
]
const PALAVRAS_QUE_PEDEM_CONTINUACAO = new Set([
  'of', 'about', 'the', 'a', 'an', 'that', 'which', 'why', 'how', 'when', 'where', 'who', 'what',
  'in', 'on', 'at', 'to', 'for', 'with', 'and', 'or', 'by', 'from', 'into', 'behind', 'inside', 'is', 'are', 'was', 'were',
  'de', 'del', 'sobre', 'do', 'da', 'dos', 'das', 'el', 'la', 'los', 'las', 'o', 'os', 'as', 'um', 'uma', 'por', 'para', 'que',
])
export const BARE_STARTER_MAX_WORDS = 6

/** true = frase inacabada ("The unsolved mystery of"), não uma ideia. */
export function isBareStarter(text: string | null | undefined): boolean {
  const t = (text ?? '').toLowerCase().replace(/[\s\u00a0]+/g, ' ').replace(/[\s.…:,;!?\-–—"'“”‘’]+$/g, '').trim()
  if (!t) return false
  if (STARTERS_DA_CASA.includes(t)) return true
  const words = t.split(' ').filter(Boolean)
  if (words.length === 0 || words.length > BARE_STARTER_MAX_WORDS) return false
  return PALAVRAS_QUE_PEDEM_CONTINUACAO.has(words[words.length - 1])
}

export const BARE_STARTER_REASON = 'prompt_bare_starter'
export const BARE_STARTER_MESSAGE =
  'Finish the sentence — tell Kineo what the story is about (for example: "The unsolved mystery of the Dyatlov Pass"). Nothing was charged.'
