import { detectNiche } from '@/lib/narration/niche-mapping'
import { resolveMusicMood, type MusicMood } from '@/lib/pixabayMusic'

/** Music has its own intent. Never change the shared niche/voice classifier. */
export type MusicEmotion = 'grief' | 'celebration' | 'tension' | 'calm' | 'neutral'
export type MusicDirection = {
  enabled: boolean
  mood: MusicMood
  emotion: MusicEmotion
  source: 'directive' | 'emotion' | 'theme'
  /** Catalog buckets do not distinguish grief from joy: never guess that split. */
  curatedFallback: boolean
}

export type MusicDirectionInput = {
  script: string
  rawScript?: string
  vertical?: string
  musicMood?: unknown
  tone?: unknown
}

function normalized(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'")
    // Preserve Hindi combining marks; remove only Latin accents for Spanish.
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u')
}

const TERMS: Record<Exclude<MusicEmotion, 'neutral'>, string[]> = {
  grief: ['grief', 'grieving', 'mourn', 'mourned', 'mourning', 'funeral', 'buried', 'bereaved', 'wept', 'weeping', 'heartbroken', 'tragic', 'tragedy', 'sad', 'sorrow', 'somber', 'sombre', 'died', 'death', 'llora', 'lloraba', 'llorando', 'luto', 'duelo', 'triste', 'tristeza', 'funeral', 'entierro', 'murio', 'perdio la vida', 'शोक', 'दुख', 'दुःख', 'दुखी', 'उदास', 'मृत्यु', 'मौत', 'अंतिम संस्कार', 'रोती', 'रोया', 'दर्दनाक'],
  celebration: ['joy', 'joyful', 'happy', 'happiness', 'celebration', 'celebrate', 'celebrated', 'reunited', 'reunion', 'delighted', 'cheerful', 'uplifting', 'alegre', 'alegria', 'feliz', 'felices', 'celebracion', 'celebrar', 'celebraron', 'reencuentro', 'खुश', 'खुशी', 'खुशियां', 'जश्न', 'उत्सव', 'आनंद', 'मिलन'],
  tension: ['mystery', 'mysterious', 'unsolved', 'suspense', 'tension', 'unease', 'ominous', 'unexplained', 'disappeared', 'misterio', 'misterioso', 'suspenso', 'tension', 'inquietante', 'desaparecio', 'रहस्य', 'रहस्यमय', 'तनाव', 'सस्पेंस', 'लापता'],
  calm: ['peaceful', 'tranquil', 'calming', 'gentle', 'meditative', 'serene', 'calm', 'tranquilo', 'tranquila', 'sereno', 'relajante', 'paz', 'शांत', 'शांति', 'सुकून', 'सुकूनभरा'],
}

// Do not turn "not sad", "no longer sad", "no está triste", or "उदास नहीं"
// into sadness. Negation scope ends at punctuation/adversative conjunctions.
function negated(text: string, start: number, end: number): boolean {
  const before = text.slice(0, start).split(/[.!?;,\n।]|\b(?:but|however|pero|sino)\b|लेकिन|बल्कि/).pop() ?? ''
  const after = text.slice(end).split(/[.!?;\n।,]|\b(?:but|however|pero|sino)\b|लेकिन|बल्कि/)[0]
  const words = before.trim().split(/\s+/).slice(-4).join(' ')
  return /(?:\b(?:not|never|without|isn't|wasn't|aren't|don't|doesn't|no|nunca|sin)\b)(?:\s+\S+){0,3}\s*$/.test(words)
    || /(?:नहीं|बिना)\s*$/.test(before)
    || /^\s*(?:नहीं|मत)(?:\s|$)/.test(after)
}

function scoreEmotion(text: string, emotion: Exclude<MusicEmotion, 'neutral'>): number {
  let score = 0
  for (const term of TERMS[emotion]) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matcher = new RegExp(`(?<![\\p{L}\\p{N}\\p{M}])${escaped}(?![\\p{L}\\p{N}\\p{M}])`, 'gu')
    for (const match of text.matchAll(matcher)) {
      const index = match.index ?? 0
      if (!negated(text, index, index + match[0].length)) score++
    }
  }
  return score
}

function emotionOf(text: string): MusicEmotion | null {
  const scores = (['grief', 'celebration', 'tension', 'calm'] as const)
    .map(emotion => ({ emotion, score: scoreEmotion(text, emotion) }))
  // Do not let a stray "happy memory" turn a funeral into a celebration.
  // Mixed grief/joy is deliberately restrained unless the author directs otherwise.
  if (scores[0].score > 0) return 'grief'
  return scores.filter(x => x.score > 0).sort((a, b) => b.score - a.score)[0]?.emotion ?? null
}

function direction(emotion: MusicEmotion, source: MusicDirection['source'], mood?: MusicMood): MusicDirection {
  return {
    enabled: true, source, emotion,
    mood: mood ?? ({ grief: 'emotional', celebration: 'emotional', tension: 'suspense', calm: 'nature', neutral: 'suspense' } as const)[emotion],
    curatedFallback: emotion !== 'grief' && emotion !== 'celebration',
  }
}

/** Only direct soundtrack instructions disable music, not a character saying "no music". */
function musicDisabled(instruction: string): boolean {
  return /^(?:none|off|no music|without music|sin musica|musica no|बिना संगीत|संगीत नहीं|संगीत बंद)[.!\s]*$/.test(instruction)
    || /^(?:(?:no|without) (?:background )?(?:music|soundtrack)|sin musica(?: de fondo)?)[.!\s]*$/.test(instruction)
}

export function resolveMusicDirection(input: MusicDirectionInput): MusicDirection {
  const raw = normalized((input.rawScript || input.script).slice(0, 32_000))
  const directives: string[] = []
  const musicDirectives: string[] = []
  // Author's labelled directions are separate from spoken words. Last one wins.
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]\s*)?\[?(music|music_mood|soundtrack|musica|संगीत|tone|mood|tono|भाव)\s*:\s*(.*?)\]?\s*$/)
    if (match) {
      const target = /^(?:tone|mood|tono|भाव)$/.test(match[1]) ? directives : musicDirectives
      target.push(match[2].replace(/\]$/, '').trim())
    } else if (/^\s*\[(?:no music|sin musica|बिना संगीत|संगीत नहीं)\]\s*$/.test(line)) musicDirectives.push(line.trim().slice(1, -1))
  }
  // Structured analysis is supported when supplied; authored directives win.
  const hints = [input.tone, input.musicMood].filter((v): v is string => typeof v === 'string')
  const instructions = [...hints.map(v => normalized(v.slice(0, 160))), ...directives, ...musicDirectives]
  for (const instruction of instructions.reverse()) {
    if (musicDisabled(instruction)) return { ...direction('neutral', 'directive'), enabled: false, curatedFallback: false }
    const emotion = emotionOf(instruction)
    if (emotion) return direction(emotion, 'directive')
    // Existing mood vocabulary remains supported, but never treat unknown hints as facts.
    if (['suspense', 'epic', 'hustle', 'tech', 'emotional', 'nature'].includes(instruction)) {
      return direction('neutral', 'directive', instruction as MusicMood)
    }
  }
  const narration = normalized(input.script.slice(0, 32_000))
    .split(/\r?\n/).filter(line => !/^\s*\[?(?:music|music_mood|soundtrack|musica|संगीत|tone|mood|tono|भाव)\s*:/.test(line)).join('\n')
  const emotion = emotionOf(narration)
  if (emotion) return direction(emotion, 'emotion')
  return direction('neutral', 'theme', resolveMusicMood(detectNiche(input.script, input.vertical)))
}

/** Controlled vocabulary only: never place the user's raw text in provider logs/prompts. */
export function musicEmotionPrompt(value: MusicDirection): string {
  switch (value.emotion) {
    case 'grief': return 'Solemn restrained lament, sparse felt piano, soft low strings, slow minor-key phrasing, quiet respectful sorrow. No upbeat rhythm, no celebration, no triumphant brass, no dramatic trailer climax.'
    case 'celebration': return 'Warm hopeful reunion, gentle major-key piano, light acoustic textures, quietly joyful resolution. No mournful lament, no ominous tension, no aggressive drums.'
    case 'tension': return 'Subtle unresolved mystery, low sustained textures and sparse pulses. No triumphant climax, no cheerful dance beat, no jump scares.'
    case 'calm': return 'Peaceful spacious ambient texture, soft sustained notes and gentle movement. No ominous pulse, no aggressive percussion or dramatic crescendo.'
    default: return ''
  }
}
