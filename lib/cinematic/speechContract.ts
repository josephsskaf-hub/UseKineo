/** One scene, one speech source. No I/O, provider selection or voice fallback. */
export type SceneSpeechEngine = 'dialogue' | 'host' | 'cinematic' | 'support'

export interface ObservedSpeechWord {
  word: string
  start: number
  end: number
}

export function hasNativeSceneSpeech(engine: string): boolean {
  return engine === 'dialogue' || engine === 'host'
}

/** All advanced families use the same contract; a dialogue is never voice-over. */
export function sceneNarrationsForPlan(
  scenes: ReadonlyArray<{ type: string; voiceover?: string | null }>,
): Array<string | null> {
  return scenes.map((scene) => hasNativeSceneSpeech(scene.type) ? null : scene.voiceover?.trim() || null)
}

/** Missing metadata must not silently produce an unvoiced support scene. */
export function collectSceneNarrations(
  clips: ReadonlyArray<{ engine: SceneSpeechEngine }>,
  narrations: readonly unknown[],
): Array<{ sceneIdx: number; text: string }> {
  return clips.flatMap((clip, sceneIdx) => {
    if (hasNativeSceneSpeech(clip.engine)) return []
    const value = narrations[sceneIdx]
    const text = typeof value === 'string' ? value.trim() : ''
    if (!text) throw new Error(`Scene ${sceneIdx + 1} is missing its narration.`)
    return [{ sceneIdx, text }]
  })
}

// ═══ KINEO-NUMEROS-EQUIVALENTES-2026-09-14 (auditoria, item 6) ═══════════
// O comparador recusava "22" × "veintidós" e "1959" × "nineteen fifty nine":
// só inteiros ingleses de 0 a 99 eram equivalentes. Agora EN/ES/PT compõem
// numerais por palavras (unidades, dezenas, centenas, mil, conectores
// and/y/e e o padrão de ano "nineteen fifty nine"). Continua limitado a
// inteiros — sem decimais, ordinais ou reescrita semântica; número
// DIFERENTE segue diferente. Os dois lados passam pela mesma função.
const sem = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const UNIT_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  um: 1, dois: 2, duas: 2, quatro: 4, seis_pt: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
}
delete UNIT_WORDS.seis_pt // 'seis' já está (ES e PT)
const TENS_WORDS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, oitenta: 80,
}
const HUNDRED_WORDS: Record<string, number> = {
  hundred: 100, cien: 100, ciento: 100, cem: 100, cento: 100,
  doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
  duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
}
const THOUSAND_WORDS = new Set(['thousand', 'mil'])
const CONNECTORS = new Set(['and', 'y', 'e'])
const isNumeral = (w: string) => w in UNIT_WORDS || w in TENS_WORDS || w in HUNDRED_WORDS || THOUSAND_WORDS.has(w)
/** Compõe um numeral por palavras a partir de `i`; devolve [valor, tokens consumidos] ou null. */
function readNumeral(tokens: string[], i: number): [number, number] | null {
  let total = 0
  let current = 0
  let j = i
  let consumed = 0
  while (j < tokens.length) {
    const w = tokens[j]
    if (CONNECTORS.has(w)) {
      if (consumed > 0 && j + 1 < tokens.length && isNumeral(tokens[j + 1]) && !(tokens[j + 1] in HUNDRED_WORDS && current === 0)) { j++; continue }
      break
    }
    if (w in TENS_WORDS || (w in UNIT_WORDS && UNIT_WORDS[w] >= 10)) {
      const v = w in TENS_WORDS ? TENS_WORDS[w] : UNIT_WORDS[w]
      // padrão de ano: "nineteen fifty nine" / "twenty twenty" — duas dezenas seguidas sem escala
      if (current >= 10 && current <= 99 && total === 0) { total = current * 100; current = 0 }
      else if (current % 100 !== 0 && current % 100 >= 10) break
      current += v
    } else if (w in UNIT_WORDS) {
      if (current % 10 !== 0) break
      current += UNIT_WORDS[w]
    } else if (w in HUNDRED_WORDS) {
      const h = HUNDRED_WORDS[w]
      if (h === 100) current = (current % 100 || 1) * 100 + (current - (current % 100))
      else current += h
    } else if (THOUSAND_WORDS.has(w)) {
      total += (current || 1) * 1000
      current = 0
    } else break
    consumed++
    j++
  }
  if (consumed === 0) return null
  return [total + current, j - i]
}

function spokenTextKey(text: string): string {
  // Ignore typography, not words. Do not fuzzy-match, translate or replace names.
  const key = text.normalize('NFKC')
    .replace(/\b(?:[A-Za-z]\.){2,}/g, (acronym) => acronym.replace(/\./g, ''))
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()
  const tokens = key.split(/\s+/).filter(Boolean)
  const plain = tokens.map(sem)
  const normalized: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const r = isNumeral(plain[i]) ? readNumeral(plain, i) : null
    if (r) { normalized.push(String(r[0])); i += r[1] - 1 } else normalized.push(tokens[i])
  }
  return normalized.join(' ')
}

export type SpeechVerification =
  | { ok: true }
  | { ok: false; reason: 'missing_script' | 'missing_speech' | 'invalid_timestamps' | 'script_mismatch' | 'speech_overruns_clip' }

/** ASR verifies words/timing only; it cannot certify face identity or lip motion. */
export function verifyObservedSpeech(
  expected: string | undefined,
  words: readonly ObservedSpeechWord[] | undefined,
  opts: { maxEndSeconds?: number } = {},
): SpeechVerification {
  const expectedKey = spokenTextKey(expected ?? '')
  if (!expectedKey) return { ok: false, reason: 'missing_script' }
  if (!words?.length || !words.some((word) => spokenTextKey(word.word))) {
    return { ok: false, reason: 'missing_speech' }
  }
  let previousStart = -1
  for (const word of words) {
    if (!Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 ||
        word.end <= word.start || word.start < previousStart) {
      return { ok: false, reason: 'invalid_timestamps' }
    }
    previousStart = word.start
  }
  if (spokenTextKey(words.map((word) => word.word).join(' ')) !== expectedKey) return { ok: false, reason: 'script_mismatch' }
  // KINEO-FALA-ALEM-DO-CLIPE-2026-09-14 (auditoria, item 7): texto certo não
  // prova que a fala cabe — palavras terminando depois dos segundos úteis do
  // clipe eram aceitas e o montador cortava o fim. 0,25 s de tolerância de ASR.
  const maxEnd = opts.maxEndSeconds
  if (Number.isFinite(maxEnd) && (maxEnd as number) > 0) {
    const lastEnd = Math.max(...words.map((w) => w.end))
    if (lastEnd > (maxEnd as number) + 0.25) return { ok: false, reason: 'speech_overruns_clip' }
  }
  return { ok: true }
}
