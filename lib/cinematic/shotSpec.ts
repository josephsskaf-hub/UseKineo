// KINEO-TRES-MODOS-2026-09-11 — "ISSO É UM PLANO, NÃO UMA HISTÓRIA."
//
// Caso real de 11/09 (render 802f024e, cliente do ChatGPT): a pessoa colou um
// bloco JSON com clip/duration/action/camera/vfx/combat_logic (Luffy desviando
// dos punhos de magma do Akainu, 10 segundos). A Kineo só sabia narrar: fez 5
// cenas de 35 s e a narradora LEU O JSON em voz alta. 15 créditos, a pessoa
// não voltou. Ordem do fundador: três modos — a IA escreve a história; você
// traz a história pronta; ou "só cria as imagens do que eu descrevi".
//
// Este módulo é a parte PURA do terceiro modo: reconhece um prompt de plano
// (shot spec) e o transforma num único prompt cinematográfico + segundos.
// Sem I/O, sem GPT. O guardião executa com o texto real do caso.

export interface ShotSpec {
  isShotSpec: boolean
  /** Segundos pedidos (4–12, teto do Seedance); 10 quando o texto não diz. */
  seconds: number
  /** Prompt único, em prosa, para o motor de vídeo. */
  prompt: string
  /** Chaves reconhecidas (para telemetria e para a mensagem ao cliente). */
  keys: string[]
  /** Por que foi classificado assim. */
  reason: 'json_shot_spec' | 'keyed_shot_spec' | 'camera_language' | 'narrative'
}

const SHOT_KEYS = ['clip', 'shot', 'scene', 'duration', 'action', 'camera', 'vfx', 'lighting', 'style', 'subject', 'motion', 'combat_logic', 'environment', 'mood', 'lens', 'composition']
const SHOT_KEY_RE = new RegExp('^\\s*"?(' + SHOT_KEYS.join('|') + ')"?\\s*[:=]\\s*(.+)$', 'i')
const CAMERA_RE = /\b(fpv|drone shot|tracking shot|dolly|crane shot|handheld|slow[- ]motion|slow-mo|close[- ]up|wide shot|overhead shot|low angle|pan(?:s|ning)? (?:over|across)|zoom(?:s|ing)? in)\b/i
const NARRATIVE_RE = /\b(once upon|my name is|i was|i am|he said|she said|story|because|years ago|in \d{4}|today|the truth is|did you know|here'?s why|this is how)\b/i
const SECONDS_RE = /(\d{1,2})\s*(?:s|sec|secs|seconds?|segundos?)\b/i

export const CLIP_MIN_SECONDS = 4
export const CLIP_MAX_SECONDS = 12
export const CLIP_DEFAULT_SECONDS = 10

function clampSeconds(n: number): number {
  if (!Number.isFinite(n)) return CLIP_DEFAULT_SECONDS
  return Math.max(CLIP_MIN_SECONDS, Math.min(CLIP_MAX_SECONDS, Math.round(n)))
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ')
}

function stripQuotes(v: string): string {
  return v.trim().replace(/^["'“”]+|["'“”,]+$/g, '').trim()
}

/** Tenta ler o texto como JSON (com ou sem chaves externas, com quebras de linha soltas). */
function parseLooseJson(text: string): Record<string, unknown> | null {
  const t = text.trim()
  const candidates = [t, t.startsWith('{') ? t : `{${t}}`]
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch { /* tenta o próximo */ }
  }
  return null
}

/**
 * Classifica o texto. Regra: é plano quando (a) é JSON com ≥2 chaves de plano,
 * ou (b) ≥2 linhas "chave: valor" com chaves de plano, ou (c) tem linguagem de
 * câmera E nenhuma frase narrativa E menos de 60 palavras. Tudo o mais é história.
 */
export function detectShotSpec(text: string): ShotSpec {
  const raw = String(text ?? '').trim()
  const narrative = { isShotSpec: false, seconds: CLIP_DEFAULT_SECONDS, prompt: raw, keys: [], reason: 'narrative' as const }
  if (!raw) return narrative

  // (a) JSON
  const json = parseLooseJson(raw)
  if (json) {
    const keys = Object.keys(json).filter((k) => SHOT_KEYS.includes(k.toLowerCase()))
    if (keys.length >= 2) {
      const fields = Object.entries(json)
        .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
        .map(([k, v]) => [k.toLowerCase(), String(v).trim()] as const)
      const durationField = fields.find(([k]) => k === 'duration')?.[1] ?? ''
      const secs = clampSeconds(Number((durationField.match(SECONDS_RE) || [])[1] ?? NaN))
      const prompt = fields
        .filter(([k, v]) => k !== 'duration' && k !== 'clip' && k !== 'shot' && v)
        .map(([k, v]) => (k === 'action' || k === 'subject' ? v : `${humanize(k)}: ${v}`))
        .join('. ')
      return { isShotSpec: true, seconds: secs, prompt: prompt || raw, keys, reason: 'json_shot_spec' }
    }
  }

  // (b) linhas chave: valor
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const keyed = lines.map((l) => l.match(SHOT_KEY_RE)).filter((m): m is RegExpMatchArray => Boolean(m))
  if (keyed.length >= 2) {
    const keys = keyed.map((m) => m[1].toLowerCase())
    const durationLine = keyed.find((m) => m[1].toLowerCase() === 'duration')?.[2] ?? ''
    const secs = clampSeconds(Number((durationLine.match(SECONDS_RE) || [])[1] ?? NaN))
    const prompt = keyed
      .filter((m) => !['duration', 'clip', 'shot'].includes(m[1].toLowerCase()))
      .map((m) => (['action', 'subject'].includes(m[1].toLowerCase()) ? stripQuotes(m[2]) : `${humanize(m[1].toLowerCase())}: ${stripQuotes(m[2])}`))
      .join('. ')
    return { isShotSpec: true, seconds: secs, prompt: prompt || raw, keys, reason: 'keyed_shot_spec' }
  }

  // (c) linguagem de câmera, curto, sem narrativa
  const words = raw.split(/\s+/).filter(Boolean).length
  if (words <= 60 && CAMERA_RE.test(raw) && !NARRATIVE_RE.test(raw)) {
    const secs = clampSeconds(Number((raw.match(SECONDS_RE) || [])[1] ?? NaN))
    return { isShotSpec: true, seconds: secs, prompt: raw, keys: ['camera'], reason: 'camera_language' }
  }

  return narrative
}

/** Créditos de um clipe único (Seedance 1.5, 720p, 4–12 s). Decisão de preço do fundador pendente; 5 cobre o custo com folga. */
export const CLIP_CREDITS = 5

// KINEO-CLIPE-SEM-LETRAS-0111 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — revisor 01/11, Modo Clipe
// (cumiasammanis27, Seedance 1.5, 5 s, 2D de terror, prompt de 1.282 caracteres): tela do celular e último quadro com letras falsas
// ("G hcwy", "Siny Stoite"). O Seedance 1.5 NÃO tem negative_prompt no schema da fal (lido em 01/11), então a proteção vai no texto:
// a frase curta da casa no fim; o corte em 1.800 é o da base (0111f: o cliente não perde nada a mais que antes). REGRA ÚNICA (0111d): se o cliente
// pede texto explicitamente (aspas, says/reads/written/escrito/dizendo/que diz/with the words/text:), o prompt sai IGUAL à base —
// a casa não extrai nem reescreve o texto pedido. A régua vem COPIADA de lib/clips/clipSemLetras.ts (o módulo roda isolado nos
// guardiões, sem require); o guardião scripts/test-clipe-sem-letras-0111.mts compara as duas cópias.
// INÍCIO-CÓPIA pedeTextoExplicito
/** A frase curta da casa contra letras inventadas. */
export const FRASE_SEM_LETRAS = 'Screens, signs and papers show no legible words.'
// aspas com letra/número dentro ("OPEN", “Feliz Natal”, «SE VENDE», 'EXIT' — apóstrofo de "Luffy's" não conta)
const PL_ASPAS = /["“«„][^"“”«»„\n]*[\p{L}\p{N}][^"“”«»„\n]*["”»“]|(?:^|[\s:(])'[^'\n]*[\p{L}\p{N}][^'\n]*'(?=[\s.,;:!?)]|$)/u
// deixa de escrita seguida de algo (palavra, número ou aspas): "says the end", "reading THE END", "escrito o fim", "text: hi"
const PL_DEIXA = /(?:\b(?:says|saying|reads|reading|written|writing|titled|entitled|labell?ed|escrit[oa]s?|dizendo|que diz|que dice|with the words?|com as palavras|com a palavra)|\b(?:text|texto)\s*:)\s*[\p{L}\p{N}"“«„']/iu
/** O cliente pediu texto explicitamente? Então a casa não acrescenta nada ao prompt dele. */
export function pedeTextoExplicito(prompt: string): boolean {
  const p = String(prompt ?? '')
  return PL_ASPAS.test(p) || PL_DEIXA.test(p)
}
// FIM-CÓPIA pedeTextoExplicito

/** O prompt final que vai ao motor: a prosa do plano + a moldura da casa. */
export function buildClipPrompt(spec: ShotSpec, aspect: '9:16' | '16:9' | '1:1'): string {
  const frame = aspect === '16:9' ? '16:9 widescreen framing' : aspect === '1:1' ? '1:1 square framing' : '9:16 vertical framing'
  const moldura = `${frame}, cinematic, sharp focus, no readable text, no watermark, no logo, no subtitles`
  // texto pedido: igual à base, byte a byte; senão a frase no fim. O corte em 1800 é o da base: sai a cauda da casa, nunca mais do cliente.
  const casa = pedeTextoExplicito(spec.prompt) ? moldura : `${moldura}. ${FRASE_SEM_LETRAS}` // KINEO-CLIPE-SEM-LETRAS-0111
  return `${spec.prompt}. ${casa}`.replace(/\.\s*\./g, '.').slice(0, 1800)
}
