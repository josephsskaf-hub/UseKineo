// KINEO-VOZ-NA-BOCA-2026-09-11 — A VOZ DO PERSONAGEM VEM DA FICHA, NÃO DA LOTERIA.
//
// O caminho "host" (nossa TTS + lipsync no retrato do personagem, Kling AI
// Avatar v2) existe desde 13/07 e foi DESLIGADO em 16/08 por um único motivo:
// a voz saía de um persona escolhido por palavras-chave do roteiro, então um
// homem da ficha falava com voz de mulher (render Flannan Isles). Sem esse
// caminho, a fala do personagem ficou com o motor: voz diferente por cena no
// Kling 3, cena muda no Omni/H3. Ordem do fundador (11/09): "a gente vai
// colocar a voz na boca do avatar, pra ficar bom".
//
// Este módulo é PURO (sem imports): lê a characterSheet do planner (~40
// palavras em inglês: idade, etnia, cabelo, roupa) e devolve gênero e faixa de
// idade; a voz é escolhida a partir disso, de forma determinística. Quando a
// ficha não diz o gênero, devolve null e o chamador mantém o persona antigo —
// nunca inventa.

export type CharacterGender = 'male' | 'female' | 'child'
export type CharacterAge = 'child' | 'young' | 'adult' | 'elderly'

/** Vozes do tts-1-hd usadas na casa (mesmo conjunto de lib/narration/personas). */
export type CharacterVoiceName = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer'

export interface CharacterVoiceChoice {
  gender: CharacterGender
  age: CharacterAge
  voice: CharacterVoiceName
  /** Ritmo natural desta voz (multiplicado pelo `speed:` do cliente pelo chamador). */
  speed: number
  personaId: string
}

const MALE_RE = /\b(man|men|male|boy|boys|gentleman|guy|father|dad|grandfather|grandpa|husband|son|brother|uncle|king|prince|monk|priest|he|him|his|himself|mr\.?|sir|bearded|beard|mustache|moustache)\b/i
const FEMALE_RE = /\b(woman|women|female|girl|girls|lady|mother|mom|grandmother|grandma|wife|daughter|sister|aunt|queen|princess|nun|she|her|hers|herself|mrs\.?|ms\.?|miss)\b/i
const CHILD_RE = /\b(child|kid|toddler|little (?:boy|girl)|young (?:boy|girl)|schoolboy|schoolgirl|teen(?:ager)?|teenage)\b/i
const ELDERLY_RE = /\b(elderly|old man|old woman|grandfather|grandmother|grandpa|grandma|senior|aged|in (?:his|her) (?:60s|70s|80s|90s|sixties|seventies|eighties|nineties)|white[- ]haired|gray[- ]haired|grey[- ]haired|wrinkl\w+)\b/i
const YOUNG_RE = /\b(young|youthful|in (?:his|her) (?:20s|twenties)|teen(?:ager)?|student)\b/i
const AGE_NUMBER_RE = /\b(\d{1,2})[- ](?:year|yr)s?[- ]old\b/i

function countMatches(text: string, re: RegExp): number {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  return (text.match(g) || []).length
}

/** Idade explícita ("42-year-old") ou faixa por palavras; adulto quando nada diz. */
export function detectCharacterAge(sheet: string): CharacterAge {
  const t = String(sheet ?? '')
  const m = t.match(AGE_NUMBER_RE)
  if (m) {
    const n = Number(m[1])
    if (n > 0 && n < 14) return 'child'
    if (n < 26) return 'young'
    if (n >= 62) return 'elderly'
    return 'adult'
  }
  if (CHILD_RE.test(t)) return 'child'
  if (ELDERLY_RE.test(t)) return 'elderly'
  if (YOUNG_RE.test(t)) return 'young'
  return 'adult'
}

/** Gênero pela ficha; empate ou silêncio → null (o chamador mantém o persona antigo). */
export function detectCharacterGender(sheet: string): CharacterGender | null {
  const t = String(sheet ?? '')
  if (!t.trim()) return null
  const age = detectCharacterAge(t)
  const male = countMatches(t, MALE_RE)
  const female = countMatches(t, FEMALE_RE)
  if (male === 0 && female === 0) return age === 'child' ? 'child' : null
  if (male === female) return null
  if (age === 'child') return 'child'
  return male > female ? 'male' : 'female'
}

/**
 * Voz por gênero e idade. Não existe voz infantil no tts-1-hd: criança ganha a
 * voz mais clara (shimmer) um pouco mais rápida — e o chamador pode preferir
 * narrar por fora nesse caso.
 */
export function voiceForCharacter(gender: CharacterGender, age: CharacterAge): { voice: CharacterVoiceName; speed: number } {
  if (gender === 'child') return { voice: 'shimmer', speed: 1.06 }
  if (gender === 'male') {
    if (age === 'elderly') return { voice: 'onyx', speed: 0.94 }
    if (age === 'young') return { voice: 'echo', speed: 1.02 }
    return { voice: 'onyx', speed: 1.0 }
  }
  if (age === 'elderly') return { voice: 'shimmer', speed: 0.94 }
  if (age === 'young') return { voice: 'nova', speed: 1.03 }
  return { voice: 'nova', speed: 1.0 }
}

/** A escolha completa, ou null quando a ficha não diz quem fala. */
export function resolveCharacterVoice(sheet: string): CharacterVoiceChoice | null {
  const gender = detectCharacterGender(sheet)
  if (!gender) return null
  const age = detectCharacterAge(sheet)
  const { voice, speed } = voiceForCharacter(gender, age)
  return { gender, age, voice, speed, personaId: `character:${gender}:${age}` }
}

export const CHARACTER_VOICE_NAMES: readonly CharacterVoiceName[] = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']

export function isCharacterVoiceName(value: unknown): value is CharacterVoiceName {
  return typeof value === 'string' && (CHARACTER_VOICE_NAMES as readonly string[]).includes(value)
}
