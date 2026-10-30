// ═══ KINEO-ROTEIRO-COLADO-NAO-ENGORDA-2026-09-18 — roteiro colado pela pessoa nunca é engordado ═══
//
// MEDIDO (18/09, painel de coerência, notas 50/55): a pessoa colou um DIÁLOGO de ~30 palavras em hindi
// ("मोटू: 'चुटकी, भीम घर पर है क्या?'" …) e pediu 60 s. O escritor tinha um piso de ~150 palavras para 60 s e
// encheu o roteiro de enrolação ("cada parede conta sua própria história única e interessante…"). O juiz deu
// texto 60/70: a narração deixou de ser o que a pessoa escreveu. Fundador: "Vai … no não engordar roteiro colado".
//
// REGRA: se o texto JÁ É um roteiro (≥ PASTED_MIN_WORDS palavras, ou ≥ 2 linhas de diálogo "Nome: fala"), o
// escritor só ESTRUTURA — não inventa fato, não descreve cenário, não acrescenta frase. O alvo de palavras passa
// a ser a contagem da própria pessoa (piso = 90% dela), e a duração do filme segue as palavras, não o seletor.
// Ideia curta (1-2 linhas) continua ganhando o roteiro completo de sempre.

import { narrationTokens } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
import { looksLikeBrief } from '@/lib/scriptParser' // KINEO-BRIEF-NAO-E-FALA-3010
export const PASTED_SCRIPT_MIN_WORDS = 45
export const PASTED_SCRIPT_VERSION = 'pasted_script_no_padding_v1'

const DIALOGUE_LINE = /^\s*[^\n:：]{1,40}[:：]\s*\S/

export interface PastedScriptDecision {
  pasted: boolean
  words: number
  dialogueLines: number
  reason: 'short_idea' | 'long_prose' | 'dialogue' | 'production_brief' // KINEO-BRIEF-NAO-E-FALA-3010
  version: typeof PASTED_SCRIPT_VERSION
}

export function countSpokenWords(text: string): number {
  return narrationTokens((text ?? '').replace(/\[[^\]]*\]/g, ' ')).filter((w) => /[\p{L}\p{N}]/u.test(w)).length // KINEO-IDIOMAS-FORMATOS-2410
}

export function detectPastedScript(text: string): PastedScriptDecision {
  const version = PASTED_SCRIPT_VERSION
  const t = (text ?? '').trim()
  const words = countSpokenWords(t)
  const dialogueLines = t.split(/\n+/).filter((l) => DIALOGUE_LINE.test(l)).length
  if (isProductionBrief(t)) return { pasted: false, words, dialogueLines, reason: 'production_brief', version } // KINEO-BRIEF-NAO-E-FALA-3010
  if (dialogueLines >= 2) return { pasted: true, words, dialogueLines, reason: 'dialogue', version }
  if (words >= PASTED_SCRIPT_MIN_WORDS) return { pasted: true, words, dialogueLines, reason: 'long_prose', version }
  return { pasted: false, words, dialogueLines, reason: 'short_idea', version }
}

/** Piso de palavras quando o roteiro é colado: 90% do que a pessoa escreveu, nunca o piso da duração. */
export function pastedScriptMinWords(words: number): number {
  return Math.max(1, Math.floor(words * 0.9))
}

/** Instrução extra ao escritor: estruturar sem engordar. */
export const PASTED_SCRIPT_RULE =
  'THE USER PASTED THEIR OWN SCRIPT. Keep their sentences, facts and dialogue lines as written (translate nothing, invent nothing). ' +
  'Do NOT add facts, descriptions, filler, transitions or new lines. You may only split it into the sections, add the [Pexels: …] footage cues, ' +
  'and trim the section headers. The total spoken words must stay within 10% of the user’s own word count. ' +
  'If it is a dialogue, keep the speaker names as spoken labels ("Motu: …").'

// KINEO-BRIEF-NAO-E-FALA-3010 [TRAVA 8.2 — vai do fundador 30/10 "estão todos autorizados"] — revisor 29/10: o narrador LEU o
// pedido ("Animais fofinhos em 3D… música infantil animada toca enquanto as cores brilham"). O texto era um PEDIDO DE PRODUÇÃO
// copiado do ChatGPT ("Calma, calma, aqui está prontinho pra você copiar: Crie um vídeo infantil… 9:16…"): o preâmbulo do chat
// escondia o "Crie um vídeo" do looksLikeBrief, e as 76 palavras viravam "roteiro colado" (mantenha as frases da pessoa).
/** Preâmbulo de chatbot antes do pedido ("Calma, aqui está prontinho pra você copiar:", "Sure! Here's your prompt:"). */
const PREAMBULO_DE_CHAT = /^[^\n:]{0,140}?\b(?:aqui est[áa]|segue|prontinho|copiar|copie|here(?:['’]s| is| you go)|sure|certainly|of course|claro|aqu[ií] (?:tienes|est[áa])|listo|voil[àa])\b[^\n:]{0,80}:\s*/i
export function semPreambuloDeChat(text: string): string {
  const t = String(text ?? '').trim()
  const sem = t.replace(PREAMBULO_DE_CHAT, '').trim()
  return sem.length >= 20 ? sem : t
}
/** O texto é um pedido de produção ("Crie um vídeo… mostre… 9:16"), mesmo atrás de um preâmbulo de chatbot. */
export function isProductionBrief(text: string): boolean {
  const t = String(text ?? '').trim()
  if (!t) return false
  return looksLikeBrief(t) || looksLikeBrief(semPreambuloDeChat(t))
}
/** Instrução extra ao escritor quando o texto é pedido de produção: inventar a história que o pedido quer, nunca narrar o pedido. */
export const PRODUCTION_BRIEF_RULE =
  'THE USER WROTE A PRODUCTION REQUEST, NOT NARRATION. Invent ONE concrete story that fulfils it: named characters, a place, events in order and the ending it asks for. ' +
  'Never narrate the request itself: no format, duration, platform, aspect ratio, music, colours, animation style, quality, "the video/the story will…" or "with funny expressions" sentences. ' +
  'Every spoken line must be something that happens or is said inside the story, in the language the request asks for.'
