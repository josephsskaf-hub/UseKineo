// sprint-assinaturas #6 — 02/09/2026 — o tema que o e-mail de momentum cita.
//
// O DEFEITO QUE ISTO MATA: `videos.topic` NAO guarda um tema — guarda o
// ROTEIRO inteiro (gancho + "\n\n" + corpo, capado em 500 caracteres). O
// `cleanTopic` da rota `send-momentum-nudge` rejeitava qualquer texto com mais
// de 90 caracteres, ou seja, rejeitava 100% dos videos reais: medido em SQL em
// 02/09 (24 elegiveis do 1o disparo real de 10:30 BRT), 23 de 23 topics tinham
// 161-558 caracteres → `com_tema: 0`. O e-mail caia SEMPRE na versao neutra
// ("You made your first film with Kineo.") e o botao levava para o /generate
// PELADO — exatamente o destino que a rodada #24 do sprint v1→v4 mediu como
// 24% de 2o video contra 53% pela continuacao de serie, e que aquele commit
// declarou consertado. A funcao nova estava no lugar; o portao antes dela
// nunca deixou passar um tema.
//
// A REGRA: o titulo e a linha do GANCHO (a mesma regua de /history, da faixa
// de continuacao da home e do /studio — `extractShortTitle`), e so vira
// anchor do e-mail se parecer um TITULO que a pessoa reconheceria como o seu
// filme. Roteiro que comeca com instrucao ("Create a 40-second Shorts video
// titled…", "STYLE: Bright, colourful…", "All spoken dialogue must be in
// FRENCH ONLY.", "Absolutely. Below is a **complete content package…") nao
// pode virar "Your film about STYLE: Bright…" — melhor a versao neutra que uma
// frase que soa a robo. Sem tema utilizavel devolve null, e a rota cai na
// mesma URL e no mesmo texto de antes: nunca inventamos o assunto do video.
import { extractShortTitle } from './resumeStrip'

const MAX_ANCHOR = 90
const MIN_ANCHOR = 8

// Comecos que denunciam INSTRUCAO ao modelo, nao gancho de video.
const INSTRUCTION_START =
  /^(create|make|generate|write|produce|give me|i want|i need|please|absolutely|sure|certainly|of course|below is|okay|ok\b)/i
// Rotulo em caixa alta seguido de dois pontos: "STYLE:", "MAIN CHARACTER:", "THEME:".
const LABEL_LINE = /^[A-Z][A-Z /&-]{2,}:/
// Frases de regra de producao.
const RULE_PHRASE = /\b(must be|must have|should be|should have|no english|only\.?$|voiceover|subtitles?|narrator|aspect ratio|\d+[- ]second|seconds? long)\b/i
// Markdown de resposta de chatbot colado inteiro na caixa.
const MARKDOWN = /\*\*|^#{1,6}\s|^---/

/**
 * KINEO-PRIMEIRO-VIDEO-2026-09-02 — o texto parece INSTRUCAO a um chatbot
 * (colagem do ChatGPT, rotulo STYLE:, markdown, "Create a 40-second video
 * titled..."), nao um tema de filme. Usado pelo auto-start: 2 dos 20 ultimos
 * primeiros videos automaticos nasceram de "Absolutely. Below is a **complete
 * content package" e "Create a 40-second Shorts video titled" — renderizados
 * ao pe da letra, sem ninguem olhar. Quem cola isso ganha a caixa de texto
 * aberta com o texto dentro, nao um render automatico do lixo.
 */
export function looksLikeInstruction(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false
  const text = raw.trim()
  if (!text) return false
  const first = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? ''
  if (INSTRUCTION_START.test(first)) return true
  if (LABEL_LINE.test(first)) return true
  if (MARKDOWN.test(first)) return true
  const rules = text.match(new RegExp(RULE_PHRASE.source, 'gi'))
  return (rules?.length ?? 0) >= 2
}

export function pickMomentumTopic(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const extracted = extractShortTitle(raw)
  // `extractShortTitle` encurta gancho longo (87 chars + "…" no ramo HOOK,
  // corte seco em 90 no ramo de linhas) — bom para um card, ruim dentro de uma
  // frase de e-mail. Titulo na zona de corte nao vira anchor.
  if (extracted.length >= MAX_ANCHOR - 3) return null
  const title = extracted
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^["“”']+|["“”']+$/g, '') // roteiro que veio todo entre aspas
    .trim()
  if (title.length < MIN_ANCHOR || title.length > MAX_ANCHOR) return null
  if (INSTRUCTION_START.test(title)) return null
  if (LABEL_LINE.test(title)) return null
  if (RULE_PHRASE.test(title)) return null
  if (MARKDOWN.test(title)) return null
  return title
}

/** Frase-ancora do e-mail. O gancho vem entre aspas porque quase sempre termina
 *  em "?" ou "!" — "Your film about Ever heard of…? is sitting" nao e frase. */
export function momentumAnchor(topic: string | null, videosMade: number): string {
  if (topic) return `Your film “${topic}” is sitting in your library.`
  return videosMade === 1 ? 'You made your first film with Kineo.' : `You made ${videosMade} films with Kineo.`
}
