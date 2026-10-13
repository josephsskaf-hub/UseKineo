// KINEO-PRIMEIRO-FILME-2026-10-13 — CONSERTO 3 do diagnóstico do 1º filme (docs/DIAGNOSTICO-PRIMEIRO-FILME-2026-10-13.md).
//
// O DEFEITO: 6 pessoas recentes viram "The writer could not turn this idea into a script (the AI declined the topic)" —
// sempre com prompts-mestre colados de outras IAs: planos de cena com tempos ("SCENE 1 — 00:00–00:03"), "Exact duration:
// 60 seconds", "Camera: slow dolly", "Use my uploaded photo", "Aspect ratio 9:16". O roteirista lê aquilo como pedido de
// operar uma câmera/um vídeo que ele não pode fazer e recusa. A HISTÓRIA dentro do texto quase sempre é inofensiva.
//
// O CONSERTO: antes de mostrar a recusa, a rota /api/generate-script tenta UMA vez de novo só com a parte de história
// (este módulo tira as linhas de diretiva e os marcadores de cena/tempo). Sem crédito extra (a rota não cobra), e nunca
// quando a moderação aponta conteúdo proibido de verdade (a rota confere antes de tentar).
//
// MÓDULO PURO, SEM IMPORT (executado por scripts/test-primeiro-filme-1310.mjs).

/** Rótulos de linha que são DIRETIVA de produção, não história (en/pt/es/id + alguns ar/ur). */
const ROTULOS_DE_DIRETIVA = [
  'style', 'visual style', 'art style', 'camera', 'camera angle', 'camera movement', 'shot', 'shots', 'shot type', 'angle', 'lens',
  'duration', 'exact duration', 'length', 'total length', 'runtime', 'format', 'aspect ratio', 'aspect', 'ratio', 'resolution',
  'quality', 'fps', 'frame rate', 'voice', 'voice style', 'voice type', 'tone of voice', 'music', 'background music', 'soundtrack',
  'sound', 'sfx', 'sound effects', 'audio', 'lighting', 'light', 'color', 'colour', 'color grade', 'color grading', 'colour grading',
  'transitions', 'transition', 'editing', 'edit', 'pacing', 'captions', 'subtitles', 'text overlay', 'on-screen text', 'platform',
  'negative prompt', 'mood', 'vibe', 'output', 'render', 'model', 'engine', 'language', 'cta', 'call to action', 'hashtags',
  // pt / es
  'estilo', 'câmera', 'camara', 'cámara', 'plano', 'planos', 'ângulo', 'angulo', 'ángulo', 'lente', 'duração', 'duracao', 'duración',
  'duracion', 'formato', 'proporção', 'proporcao', 'proporción', 'resolução', 'resolucao', 'resolución', 'voz', 'tipo de voz',
  'música', 'musica', 'trilha', 'trilha sonora', 'som', 'sonido', 'efeitos sonoros', 'iluminação', 'iluminacao', 'iluminación',
  'luz', 'cor', 'cores', 'edição', 'edicao', 'edición', 'transições', 'transicoes', 'transiciones', 'legendas', 'legenda',
  'subtítulos', 'subtitulos', 'plataforma',
  // id
  'gaya', 'kamera', 'sudut kamera', 'durasi', 'suara', 'musik', 'pencahayaan', 'resolusi', 'transisi',
  // ar / ur (rótulos mais comuns)
  'الأسلوب', 'النمط', 'الكاميرا', 'المدة', 'الصيغة', 'التنسيق', 'الصوت', 'الموسيقى', 'الإضاءة',
  'انداز', 'کیمرہ', 'دورانیہ', 'فارمیٹ', 'آواز', 'موسیقی', 'روشنی',
]

/** Rótulos cujo CONTEÚDO é a história (narração): o rótulo sai, o texto fica. */
const ROTULOS_DE_FALA = ['narration', 'narrator', 'voiceover', 'voice over', 'voice-over', 'vo', 'script', 'story', 'dialogue',
  'narração', 'narracao', 'narración', 'narracion', 'roteiro', 'história', 'historia', 'guion', 'guión', 'cerita', 'narasi']

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PREFIXO = String.raw`^\s*(?:[-*•>#]+\s*)?(?:\*\*|__)?\s*`
const ROTULO_DIRETIVA_RE = new RegExp(`${PREFIXO}(?:${ROTULOS_DE_DIRETIVA.map(escapar).join('|')})\\s*(?:\\*\\*|__)?\\s*[:：\\-–—=]`, 'iu')
const ROTULO_FALA_RE = new RegExp(`${PREFIXO}(?:${ROTULOS_DE_FALA.map(escapar).join('|')})\\s*(?:\\*\\*|__)?\\s*[:：\\-–—=]\\s*`, 'iu')

/** Marcador de cena/tempo no começo da linha: "SCENE 1 — 00:00–00:03:", "Shot 2:", "[0:03-0:06]", "0-3s:", "Cena 1 -". */
const MARCADOR_DE_CENA_RE = new RegExp(
  PREFIXO + String.raw`(?:(?:scene|shot|cena|escena|plano|adegan|clip|frame|beat|part|parte)\s*#?\s*\d+[a-z]?\s*(?:\((?:[^)]*)\))?\s*` +
    String.raw`(?:[-–—:|.]\s*)?)?(?:\[?\(?\s*\d{1,2}(?::\d{2})?(?:\.\d+)?\s*s?\s*(?:[-–—~]|to|a|até|hasta)\s*\d{1,2}(?::\d{2})?(?:\.\d+)?\s*(?:s|sec|secs|seconds|segundos)?\s*\]?\)?\s*)?(?:\*\*|__)?\s*[-–—:|.]?\s*`,
  'iu',
)
const SO_MARCADOR_RE = /^\s*(?:[-*•>#]+\s*)?(?:\*\*|__)?\s*(?:scene|shot|cena|escena|plano|adegan|clip|frame|beat|part|parte)\s*#?\s*\d+/iu
const TEMPO_NO_COMECO_RE = /^\s*\[?\(?\s*\d{1,2}(?::\d{2})?(?:\.\d+)?\s*s?\s*(?:[-–—~]|to)\s*\d{1,2}(?::\d{2})?/iu

/** Frases que são PEDIDO de produção, em qualquer lugar da linha → a linha inteira sai. */
const PEDIDO_DE_PRODUCAO_RE = new RegExp(
  [
    String.raw`\b(?:make|create|generate|produce|render)\s+(?:me\s+)?(?:a|an|the|this)?\s*(?:\d+\s*-?\s*(?:s|sec|second)s?\s+)?(?:short\s+|vertical\s+|cinematic\s+|viral\s+)*(?:video|short|reel|tiktok|clip|film)\b`,
    String.raw`\buse\s+my\s+(?:uploaded\s+)?(?:photo|image|picture|face|selfie)\b`,
    String.raw`\b(?:aspect\s+ratio|9\s*:\s*16|16\s*:\s*9|1\s*:\s*1|4k|1080p|720p|fps)\b`,
    String.raw`\b(?:exact|total)\s+duration\b`,
    String.raw`\b(?:fa[çc]a|crie|gere|faz)\s+(?:um|uma)\s+(?:v[íi]deo|filme|short|reels?)\b`,
    String.raw`\b(?:haz|crea|genera)\s+(?:un|una)\s+(?:v[íi]deo|pel[íi]cula|short|reel)\b`,
    String.raw`\b(?:buat(?:kan)?)\s+(?:sebuah\s+)?video\b`,
    String.raw`\buse\s+(?:a\s+)?(?:slow|fast|smooth)\s+(?:zoom|pan|dolly|tracking)\b`,
  ].join('|'),
  'iu',
)

export interface HistoriaDoTexto {
  /** O texto só com a história (linhas de diretiva fora, marcadores de cena/tempo tirados, rótulos de fala tirados). */
  story: string
  /** Quantas linhas inteiras saíram por serem diretiva/pedido de produção. */
  removedLines: number
  /** Quantas linhas perderam só o marcador de cena/tempo ou o rótulo de fala. */
  strippedMarkers: number
  /** O texto mudou (há o que tentar de novo). */
  changed: boolean
  words: number
}

const contarPalavras = (t: string) => t.split(/\s+/).filter(Boolean).length

/** Tira as diretivas de um prompt colado e devolve só a história. Nunca lança. */
export function historiaSemDiretivas(texto: string | null | undefined): HistoriaDoTexto {
  const original = String(texto ?? '').replace(/\r\n?/g, '\n')
  const out: string[] = []
  let removedLines = 0
  let strippedMarkers = 0
  for (const linha of original.split('\n')) {
    if (!linha.trim()) { out.push(''); continue }
    let l = linha
    // 1) rótulo de fala ("Narration: …") — o texto é a história.
    const fala = l.match(ROTULO_FALA_RE)
    if (fala) { l = l.slice(fala[0].length); strippedMarkers++ }
    // 2) marcador de cena/tempo no começo ("SCENE 1 — 00:00–00:03:") — sai o marcador, fica o resto.
    if (SO_MARCADOR_RE.test(l) || TEMPO_NO_COMECO_RE.test(l)) {
      const m = l.match(MARCADOR_DE_CENA_RE)
      if (m && m[0].length > 0) { l = l.slice(m[0].length); strippedMarkers++ }
      const fala2 = l.match(ROTULO_FALA_RE)
      if (fala2) l = l.slice(fala2[0].length)
    }
    // 3) linha de diretiva ou de pedido de produção — sai inteira.
    if (ROTULO_DIRETIVA_RE.test(l) || PEDIDO_DE_PRODUCAO_RE.test(l)) { removedLines++; continue }
    const limpa = l.replace(/^[\s\-–—:|.*_]+/, '').trim()
    if (!limpa) { removedLines++; continue }
    out.push(limpa)
  }
  const story = out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { story, removedLines, strippedMarkers, changed: story !== original.trim(), words: contarPalavras(story) }
}

/** Mínimo de palavras de história para valer a nova tentativa (menos que isso não é história, é rótulo). */
export const HISTORIA_MIN_WORDS = 6

export type DecisaoNovaTentativa =
  | { tentar: true; story: string; removedLines: number; strippedMarkers: number; words: number }
  | { tentar: false; motivo: 'no_directives' | 'story_too_short'; removedLines: number; words: number }

/** Vale tentar de novo só com a história? Só se havia diretiva/marcador para tirar e sobrou história de verdade. */
export function decidirNovaTentativaDoRoteiro(texto: string | null | undefined): DecisaoNovaTentativa {
  const h = historiaSemDiretivas(texto)
  if (!h.changed || (h.removedLines === 0 && h.strippedMarkers === 0)) return { tentar: false, motivo: 'no_directives', removedLines: h.removedLines, words: h.words }
  if (h.words < HISTORIA_MIN_WORDS) return { tentar: false, motivo: 'story_too_short', removedLines: h.removedLines, words: h.words }
  return { tentar: true, story: h.story, removedLines: h.removedLines, strippedMarkers: h.strippedMarkers, words: h.words }
}

/** Evento da nova tentativa (servidor, /api/generate-script). metadata.outcome: ok | failed | skipped. */
export const SCRIPT_DECLINED_RETRY_EVENT = 'script_declined_retry' as const
