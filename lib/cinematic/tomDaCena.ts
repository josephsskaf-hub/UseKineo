// ═══ KINEO-PARCEIRO-EYEBIBLE-2-1410 — a cena de guerra não recebe "energetic" ═══
//
// CASO (Robert/EyeBible, Seedance 1.5, 14/10, render c9844e94): o /generate manda `globalStyle.mood` vindo do plano de
// b-roll, que o cliente pede SEMPRE com tone 'energetic' (GenerateClient, /api/generate-broll-plan). O /api/generate-video-
// cinematic colava esse mood no fim de TODO prompt de cena (styleSuffix → deriveStyleAnchor): as 7 cenas de soldados
// feridos foram à fal com ", energetic, natural, documentary". O tom do roteiro já é medido pelo classificador da trilha
// (lib/musicDirection.ts tomDoRoteiro: guerra/luto/mistério); aqui ele decide o adjetivo de clima da imagem.
//
// REGRA: tom de guerra (conflict), luto (grief) ou mistério (tension) + mood alegre (energetic/upbeat/cheerful/…) ⇒ o mood
// alegre sai e entra a palavra do tom. Mood que não é alegre, ou tom neutro/alegre/calmo: o MESMO texto, byte a byte.
// Puro: sem import de runtime, sem modelo, sem custo.

import type { MusicEmotion } from '@/lib/musicDirection'

const MOOD_ALEGRE = String.raw`(?:energetic|energizing|upbeat|cheerful|cheery|happy|joyful|joyous|playful|fun|lively|bubbly|peppy|uplifting|feel[- ]good|festive)` // KINEO-PARCEIRO-EYEBIBLE-2-1410
const MOOD_ALEGRE_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])${MOOD_ALEGRE}(?![\p{L}\p{N}])`, 'iu') // KINEO-PARCEIRO-EYEBIBLE-2-1410
const MOOD_ALEGRE_G = new RegExp(String.raw`(?<![\p{L}\p{N}])${MOOD_ALEGRE}(?![\p{L}\p{N}])`, 'giu') // KINEO-PARCEIRO-EYEBIBLE-2-1410

/** O adjetivo de clima de cada tom grave (vai no lugar do mood alegre). */
export const PALAVRA_DO_TOM: Readonly<Partial<Record<MusicEmotion, string>>> = { // KINEO-PARCEIRO-EYEBIBLE-2-1410
  conflict: 'tense, grave', // KINEO-PARCEIRO-EYEBIBLE-2-1410
  grief: 'somber, restrained', // KINEO-PARCEIRO-EYEBIBLE-2-1410
  tension: 'suspenseful, moody', // KINEO-PARCEIRO-EYEBIBLE-2-1410
} // KINEO-PARCEIRO-EYEBIBLE-2-1410

/** O mood alegre do cliente sob um roteiro de guerra/luto/mistério vira a palavra do tom; qualquer outro caso devolve o mood intocado. */
export function moodDoTom(mood: string | undefined, tom: MusicEmotion | null | undefined): string | undefined { // KINEO-PARCEIRO-EYEBIBLE-2-1410
  if (!mood || !tom) return mood // KINEO-PARCEIRO-EYEBIBLE-2-1410
  const palavra = PALAVRA_DO_TOM[tom] // KINEO-PARCEIRO-EYEBIBLE-2-1410
  if (!palavra || !MOOD_ALEGRE_RE.test(mood)) return mood // KINEO-PARCEIRO-EYEBIBLE-2-1410
  const resto = mood.replace(MOOD_ALEGRE_G, ' ') // KINEO-PARCEIRO-EYEBIBLE-2-1410
    .split(/[,;/]|\band\b/i).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join(', ') // KINEO-PARCEIRO-EYEBIBLE-2-1410
  return resto ? `${palavra}, ${resto}` : palavra // KINEO-PARCEIRO-EYEBIBLE-2-1410
} // KINEO-PARCEIRO-EYEBIBLE-2-1410
