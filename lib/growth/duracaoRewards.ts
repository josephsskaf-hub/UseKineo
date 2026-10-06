// ═══ KINEO-DURACAO-REWARDS-2026-10-06 — "seu roteiro tem duração para as recompensas do TikTok?" ═══════════════════
//
// Ferramenta grátis da aposta C do fundador (sprint 06/10): o criador cola o roteiro em
// /tiktok-creator-rewards-length-checker e vê, SÓ NO NAVEGADOR (nenhuma rede, nenhuma IA), quantas palavras serão
// narradas, quanto isso dura nas duas réguas de voz da casa e quantas palavras faltam para 1 minuto — o piso de duração
// do Creator Rewards Program do TikTok. Isca para criador de país rico e página feita para ser CITADA pelo ChatGPT.
//
// A RÉGUA É A DA CASA, NÃO UMA NOVA. É a mesma conta de lib/speechRate.ts `speechSecondsOfScript` (:98) — a "régua
// única" (KINEO-REGUA-UNICA-2026-09-14) com que tela, análise, dry-run e servidor medem:
//   · narração = parseUserScript(texto).narration || texto   → lib/scriptParser.ts (import direto: módulo sem import)
//   · palavras e segundos = speechSeconds(narração)           → lib/narrationFit.ts (import direto: módulo sem import)
//   · ritmo = SPEECH_RATE_BASE[família] × `speed:` do texto, arredondado a 0,01 → speechRateFor (:42-51)
//   · fala = speechSeconds × (2,3 ÷ ritmo)                     → narrationFitAt (:54-63) / speechSecondsAt (:84-86)
// lib/speechRate.ts importa pelo alias '@/', que nem o guardião nem uma lib pura resolvem; por isso SÓ as linhas dele
// vivem aqui como ESPELHO (bloco MIRROR abaixo). O guardião scripts/test-duracao-rewards-2026-10-06.mjs EXECUTA o
// original (speechSecondsOfScript) e este espelho no mesmo corpus: se a régua da casa mudar, ele fica vermelho antes de
// a página mentir. Nenhum import de servidor: a página é estática e o cálculo roda no cliente.
//
// AS DUAS VOZES, com o nome honesto: 3,1 pal/s é a régua base da família clássica (Seedance 1.5/Kling 2.5/Veo/Kineo 1)
// e 2,3 a da hollywood (Kling 3/H3/Omni/S25, voz própria). As vozes clássicas MEDIDAS falam mais devagar que 3,1
// (onyx 2,5 · fable 2,55 a 1,0 — comentário de lib/speechRate.ts :31-41), então a página chama 3,1 de "ritmo
// rápido" (o teste mais exigente: quem alcança 1:00 nele alcança em qualquer ritmo mais lento) e 2,3 de "ritmo calmo",
// e diz que a maioria das narrações cai entre os dois — nunca que uma voz específica fala a 3,1.
//
// O CRITÉRIO, NA FONTE OFICIAL (consultada em 06/10/2026): TikTok Creator Rewards Program Terms (EUA), "Last Update:
// July 20, 2026" — "Eligible Videos" = conteúdo "with a duration of at least 1 minute"; termos do EEE (abr/2025): "It must
// be one minute or longer". O anúncio do programa (newsroom, 18/03/2024) dizia "over a minute long" — por isso a página
// recomenda alguns segundos de folga. ⚠ O pedido dizia "mais de 1 minuto"; os termos vigentes dizem "pelo menos 1
// minuto" (≥ 60 s) e é isso que a conta usa. A página NÃO diz que vídeo nenhum "se qualifica": duração é UM critério e
// quem decide é o TikTok (originalidade, conta, país, visualizações).

import { speechSeconds, WORDS_PER_SECOND } from '../narrationFit'
import { parseSpeed, parseUserScript } from '../scriptParser'
import { analyzePromptMaxChars } from '../analyzeLimits'

export const DURACAO_REWARDS_VERSION = 'duracao_rewards_2026_10_06' as const
/** Campanha de cadastro (signup_utm_campaign via rememberSignupCampaign) e intent_campaign do Studio. */
export const DURACAO_REWARDS_CAMPAIGN = 'tool_duracao_rewards' as const
export const DURACAO_REWARDS_PATH = '/tiktok-creator-rewards-length-checker' as const

/** O piso de duração dos termos do Creator Rewards Program ("at least 1 minute"). */
export const REWARDS_MIN_SECONDS = 60
/** Teto do YouTube Shorts e corte de recomendação dos Reels do Instagram (as duas fontes oficiais citadas na página). */
export const SHORT_FORM_MAX_SECONDS = 180

/** A duração que o CTA leva ao Studio: o botão de 60 s (o Studio aceita 35/60/90 em ?duration=). */
export const REWARDS_STUDIO_DURATION = 60

/** Folga de arredondamento de ponto flutuante (138 palavras a 2,3 dão 60,00000000000001 s; 186 a 3,1 dão 60). */
const EPS = 1e-9

// ═══ MIRROR: lib/speechRate.ts — SPEECH_RATE_BASE (:17), velocidade e arredondamento de speechRateFor (:43, :48-49),
// escala de narrationFitAt (:54-57) que speechSecondsAt (:84-86) devolve com alvo 0 ═══
export type RewardsVoiceFamily = 'classic' | 'hollywood'
export const REWARDS_RATE_BASE: Readonly<Record<RewardsVoiceFamily, number>> = { classic: 3.1, hollywood: 2.3 }
export function rewardsWordsPerSecond(family: RewardsVoiceFamily, speed?: number | null): number {
  const s = typeof speed === 'number' && Number.isFinite(speed) && speed > 0 ? Math.min(2, Math.max(0.5, speed)) : 1
  return Math.round(REWARDS_RATE_BASE[family] * s * 100) / 100
}
export function rewardsSpeechSecondsAt(narration: string, wordsPerSecond: number): number {
  const base = speechSeconds(narration)
  if (wordsPerSecond === WORDS_PER_SECOND) return base
  return base * (WORDS_PER_SECOND / wordsPerSecond)
}
// ═══ END MIRROR ═══

/** Teto de caracteres do CTA: o MESMO do Studio para texto narrado palavra por palavra (lib/analyzeLimits.ts). */
export const REWARDS_SCRIPT_MAX_CHARS = analyzePromptMaxChars('verbatim')

export interface RewardsVoiceCheck {
  family: RewardsVoiceFamily
  wordsPerSecond: number
  /** Segundos de narração estimados (régua da casa). */
  seconds: number
  /** A narração sozinha alcança 1:00 nesta voz. */
  reaches: boolean
  /** Palavras narradas que levam a 1:00 nesta voz. */
  wordsToReach: number
  /** Quanto falta (0 quando já alcança). */
  missingWords: number
  /** A narração passa de 3:00 nesta voz. */
  overShortFormMax: boolean
}

export type RewardsLengthStatus = 'empty' | 'no_narration' | 'checked'

export interface RewardsLengthCheck {
  status: RewardsLengthStatus
  /** Palavras no texto colado, rótulos e direções incluídos. */
  rawWords: number
  /** Palavras que a voz vai falar (as que a régua conta). */
  narratedWords: number
  /** Rótulos, [direções] e notas que não são fala. */
  ignoredWords: number
  narration: string
  /** `speed:` lido do texto (null = 1,0). */
  speed: number | null
  brisk: RewardsVoiceCheck
  calm: RewardsVoiceCheck
}

/** Palavras separadas por espaço, como o texto chega. */
export function countRawWords(value: string): number {
  const t = (value ?? '').toString().trim()
  return t ? t.split(/\s+/).filter(Boolean).length : 0
}

/** Menor número de palavras narradas que dura `seconds` neste ritmo. */
export function wordsForSeconds(seconds: number, wordsPerSecond: number): number {
  return Math.max(0, Math.ceil(seconds * wordsPerSecond - EPS))
}

/** Quantas palavras de narração dão 1 minuto em cada voz, sem `speed:` (a resposta direta do topo da página). */
export function wordsForOneMinute(): { brisk: number; calm: number } {
  return {
    brisk: wordsForSeconds(REWARDS_MIN_SECONDS, rewardsWordsPerSecond('classic')),
    calm: wordsForSeconds(REWARDS_MIN_SECONDS, rewardsWordsPerSecond('hollywood')),
  }
}

function voiceCheck(family: RewardsVoiceFamily, narration: string, narratedWords: number, speed: number | null): RewardsVoiceCheck {
  const wordsPerSecond = rewardsWordsPerSecond(family, speed)
  const seconds = narratedWords > 0 ? rewardsSpeechSecondsAt(narration, wordsPerSecond) : 0
  const reaches = seconds + EPS >= REWARDS_MIN_SECONDS
  const wordsToReach = wordsForSeconds(REWARDS_MIN_SECONDS, wordsPerSecond)
  return {
    family,
    wordsPerSecond,
    seconds,
    reaches,
    wordsToReach,
    missingWords: reaches ? 0 : Math.max(1, wordsToReach - narratedWords),
    overShortFormMax: seconds > SHORT_FORM_MAX_SECONDS + EPS,
  }
}

/**
 * O veredito da página para um texto colado. Mesma entrada que o Studio mede (`speechSecondsOfScript`): narração
 * extraída, `speed:` lido do texto ORIGINAL, régua da família. Nenhuma rede, nenhum estado.
 */
export function checkRewardsLength(raw: string): RewardsLengthCheck {
  const original = (raw ?? '').toString()
  const speed = parseSpeed(original)
  const narration = parseUserScript(original).narration || original
  // speechSeconds conta palavras ÷ 2,3; × 2,3 devolve a contagem inteira que ele usou (sem reescrever a contagem aqui).
  const narratedWords = Math.round(speechSeconds(narration) * WORDS_PER_SECOND)
  const rawWords = countRawWords(original)
  const status: RewardsLengthStatus = !original.trim() ? 'empty' : narratedWords === 0 ? 'no_narration' : 'checked'
  return {
    status,
    rawWords,
    narratedWords,
    ignoredWords: Math.max(0, rawWords - narratedWords),
    narration: narratedWords > 0 ? narration : '',
    speed,
    brisk: voiceCheck('classic', narration, narratedWords, speed),
    calm: voiceCheck('hollywood', narration, narratedWords, speed),
  }
}

/** 0:59 / 1:04 / 3:10 — arredonda PARA BAIXO: 59,7 s nunca aparece como "1:00" ao lado de "faltam palavras". */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor((Number.isFinite(seconds) ? seconds : 0) + EPS))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Destino do CTA: o Studio com o roteiro da pessoa palavra por palavra (script_mode=verbatim), o botão de 60 s e a
 * campanha. Sem texto, o Studio abre no "Let AI structure" (uma frase basta). NUNCA leva gatilho de auto-start
 * (create_intent/autoanalyze/studio): o clique em Gerar do Studio continua sendo o consentimento — e é lá que o custo
 * aparece antes de qualquer render (KINEO-IDEIA-POUSA-NO-STUDIO-2026-10-03).
 */
export function rewardsStudioHref(script: string): string {
  const prompt = (script ?? '').toString().trim().slice(0, REWARDS_SCRIPT_MAX_CHARS)
  const q = new URLSearchParams()
  if (prompt) q.set('prompt', prompt)
  q.set('script_mode', prompt ? 'verbatim' : 'ai')
  q.set('duration', String(REWARDS_STUDIO_DURATION))
  q.set('intent_campaign', DURACAO_REWARDS_CAMPAIGN)
  return `/studio?${q.toString()}`
}

/** Data da consulta das fontes oficiais abaixo (a página a imprime ao lado de cada uma). */
export const REWARDS_SOURCES_CHECKED = 'October 6, 2026'
export const REWARDS_SOURCES_CHECKED_ISO = '2026-10-06'

/**
 * As fontes OFICIAIS da página, lidas em 06/10/2026 — só o que cada uma diz, com as palavras dela entre aspas curtas.
 * Mudou a regra? Atualize aqui (e a data acima); a página e o FAQ leem daqui.
 */
export const REWARDS_SOURCES = {
  tiktokTermsUs: {
    name: 'TikTok Creator Rewards Program Terms (US)',
    url: 'https://www.tiktok.com/legal/page/global/creator-rewards-program-us/en',
    updated: 'July 20, 2026',
    says: 'eligible videos have "a duration of at least 1 minute"',
  },
  tiktokTermsEea: {
    name: 'TikTok Creator Rewards Program Terms (EEA)',
    url: 'https://www.tiktok.com/legal/page/global/tiktok-creator-rewards-program-eea/en',
    updated: 'April 2025',
    says: 'a video "must be one minute or longer"',
  },
  tiktokNewsroom: {
    name: 'TikTok Newsroom — Introducing the New Creator Rewards Program',
    url: 'https://newsroom.tiktok.com/en-us/introducing-the-new-creator-rewards-program',
    updated: 'March 18, 2024',
    says: 'the program rewards original content "over a minute long"',
  },
  youtubeShorts: {
    name: 'YouTube Help — Understand three-minute YouTube Shorts',
    url: 'https://support.google.com/youtube/answer/15424877?hl=en',
    updated: null,
    says: 'square or vertical videos "up to three minutes" uploaded on or after October 15, 2024 are Shorts',
  },
  instagramReels: {
    name: 'About Instagram — Reels',
    url: 'https://about.instagram.com/features/reels',
    updated: null,
    says: 'reels can be recorded and edited up to 20 minutes, but "Reels over 3 minutes won\'t be recommended to new audiences"',
  },
} as const

/** Os três roteiros de exemplo da página (e do guardião). Fatos conferidos em 06/10/2026; texto original da casa. */
export const REWARDS_EXAMPLES: readonly { id: 'short' | 'close' | 'ready'; label: string; script: string }[] = [
  {
    id: 'short',
    label: 'A short draft',
    script: [
      'An octopus has three hearts, and one of them stops when it swims.',
      'Two small hearts push blood through the gills. The third pumps it to the rest of the body, and it pauses every time the animal swims, which is one reason octopuses would rather crawl.',
      'Their blood is blue, because it carries oxygen with copper instead of iron.',
      'And most of their neurons are not in the head at all. They sit in the arms, which can react to touch on their own.',
    ].join('\n\n'),
  },
  {
    id: 'close',
    label: 'A structured script',
    script: [
      'HOOK',
      'In 1919, a wave of molasses killed 21 people in Boston.',
      '',
      '[B-roll: Boston waterfront, black and white archive]',
      'On January 15, just after noon, a steel tank holding about 2.3 million gallons of molasses burst open in the North End. The tank was 50 feet tall, and the day was oddly warm for January.',
      '',
      '[B-roll: flooded street, archive photo]',
      'A brown wave up to 25 feet high rolled through the streets at around 35 miles an hour. It crushed buildings, bent the girders of the elevated railway and even tipped a streetcar off its tracks.',
      'People and horses were caught in the thick, cold syrup, and rescuers could barely move through it. Crews washed the streets with salt water from a fireboat, the cleanup took weeks, and the harbor stayed brown until summer.',
      '',
      'PAYOFF',
      'Twenty-one people died and about 150 were injured. A court later held the company that owned the tank responsible, and for decades locals said the neighborhood still smelled of molasses on hot summer days.',
    ].join('\n'),
  },
  {
    id: 'ready',
    label: 'Ready for a minute',
    script: [
      'There is an animal that survived ten days in open space, and it is about the size of a grain of sand.',
      'It is the tardigrade, the water bear. It is about half a millimeter long, it walks on eight stubby legs, and it lives almost everywhere: in moss, in soil, in the ocean and on mountaintops.',
      'Its superpower is giving up at the right moment. When its world dries out, a tardigrade pulls in its legs, loses almost all of its water and curls into a tiny barrel called a tun. In that state its metabolism almost stops, and it can wait for years without food or water.',
      'In 2007, scientists sent dried tardigrades into orbit and exposed them to the vacuum of space for ten days. Back on Earth, many of them woke up. A few even survived unfiltered ultraviolet light from the Sun.',
      'And since 2019, there have been tardigrades on the Moon: a capsule of dried water bears was aboard the Israeli lander Beresheet when it crashed there.',
      'So the toughest animal we know is not a shark or a bear. It is a half-millimeter water bear that knows exactly how to wait.',
    ].join('\n\n'),
  },
]
