// KINEO-IDIOMA-DO-TEXTO-2026-09-12 — A VOZ FALA A LÍNGUA DO TEXTO.
//
// Caso do vigia (11/09, render 59e1c0ce): a pessoa escreveu uma história em
// ESPANHOL na home e apertou o botão; o seletor de idioma ficou no padrão
// "en", o escritor de cenas escreveu a narração em inglês e o filme saiu em
// outra língua. Ninguém olhava o texto. Este módulo é puro: conta palavras
// funcionais de cada língua e devolve o idioma do texto quando a evidência é
// clara; caso contrário devolve null e o chamador mantém o que a pessoa
// escolheu. Só as três línguas que a casa narra (en · pt · es).

// ═══ KINEO-IDIOMAS-15-2026-09-17 — a narração em 16 línguas (inglês + 15) ═══════════════════════════════
// Fundador (17/09): "Você tem meu vai pro 6 idiomas… acredito que 15 idiomas esteja ok". Mercado: Fliki 80+, HeyGen 175+,
// InVideo 50+; a casa narrava 3. Escolha pelos cadastros de 30 dias (IN 145 · BR 50 · NG/PK 42 · US 41 · GB 22 · DE 20 ·
// ES 19 · NL 15 · FR 14 · EG 13 · TR 11 · PL/UA 8 · ID 7 · IT 6) e pelas 15 páginas de idioma do Projeto 1.
// JAPONÊS E COREANO FICAM DE FORA nesta rodada: toda a régua de duração da casa conta PALAVRAS separadas por espaço
// (narrationFit, palavras por cena, expansão de fala) e nessas línguas a contagem daria 1 por frase — o filme sairia
// com o tamanho errado. Entram quando a régua souber contar caracteres.
// O catálogo mora AQUI, não em arquivo próprio, porque três guardiões carregam lib/textLanguage.ts cru (sem resolver
// imports). Quem precisa da lista importa daqui.
export type NarrationLanguage = 'en' | 'pt' | 'es' | 'hi' | 'fr' | 'de' | 'it' | 'nl' | 'pl' | 'tr' | 'ru' | 'uk' | 'ar' | 'ur' | 'id' | 'vi'
export interface NarrationLanguageSpec {
  code: NarrationLanguage
  /** Nome que vai na instrução ao roteirista ("Write all voiceover sentences in …"). */
  name: string
  /** Nome na própria língua, para o seletor. */
  native: string
  /** Fonte das legendas no Creatomate (Google Fonts). Montserrat não tem devanágari nem árabe. */
  captionFont: string
  rtl: boolean
}
export const DEFAULT_CAPTION_FONT = 'Montserrat'
export const NARRATION_LANGUAGES: readonly NarrationLanguageSpec[] = [
  { code: 'en', name: 'English', native: 'English', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'pt', name: 'Brazilian Portuguese (pt-BR)', native: 'Português', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'es', name: 'Spanish (es-419, Latin American)', native: 'Español', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'hi', name: 'Hindi (Devanagari script)', native: 'हिन्दी', captionFont: 'Noto Sans Devanagari', rtl: false },
  { code: 'fr', name: 'French', native: 'Français', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'de', name: 'German', native: 'Deutsch', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'it', name: 'Italian', native: 'Italiano', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'pl', name: 'Polish', native: 'Polski', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'ru', name: 'Russian', native: 'Русский', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'ar', name: 'Arabic (Modern Standard)', native: 'العربية', captionFont: 'Noto Sans Arabic', rtl: true },
  { code: 'ur', name: 'Urdu', native: 'اردو', captionFont: 'Noto Sans Arabic', rtl: true },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', captionFont: DEFAULT_CAPTION_FONT, rtl: false },
]
export const NARRATION_LANGUAGE_CODES: readonly NarrationLanguage[] = NARRATION_LANGUAGES.map((l) => l.code)
/** Código válido do catálogo ou null — NUNCA cai em 'en' sozinho: quem chama decide o padrão. */
export function narrationLanguage(raw: unknown): NarrationLanguage | null {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return (NARRATION_LANGUAGE_CODES as readonly string[]).includes(v) ? (v as NarrationLanguage) : null
}
export function captionFontFor(raw: unknown): string {
  const code = narrationLanguage(raw)
  return NARRATION_LANGUAGES.find((l) => l.code === code)?.captionFont ?? DEFAULT_CAPTION_FONT
}
/** Motores de voz própria (Kling 3, H3, Omni, Seedance 2.5) só têm prova em três línguas; os clássicos (TTS da casa) falam todas. */
export const HOLLYWOOD_LANGUAGES = ['en', 'pt', 'es'] as const
export type HollywoodLanguage = (typeof HOLLYWOOD_LANGUAGES)[number]
export function isHollywoodLanguage(raw: unknown): raw is HollywoodLanguage {
  return (HOLLYWOOD_LANGUAGES as readonly string[]).includes(String(raw))
}
/** As três línguas que o DETECTOR abaixo reconhece pelo vocabulário funcional. */
export type DetectableLanguage = 'en' | 'pt' | 'es'

const STOPWORDS: Record<DetectableLanguage, string[]> = {
  en: ['the', 'and', 'of', 'to', 'in', 'is', 'that', 'was', 'for', 'with', 'his', 'her', 'they', 'this', 'from', 'but', 'not', 'are', 'were', 'have', 'he', 'she', 'it', 'you', 'we', 'on', 'at', 'by', 'an', 'be'],
  pt: ['o', 'e', 'de', 'que', 'não', 'nao', 'uma', 'um', 'para', 'com', 'ele', 'ela', 'era', 'foi', 'mas', 'como', 'seu', 'sua', 'você', 'voce', 'quando', 'onde', 'muito', 'mais', 'isso', 'está', 'esta', 'até', 'ate', 'porque', 'também', 'tambem', 'os', 'as', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'ao', 'pelo', 'pela', 'eu', 'nós', 'eles', 'elas', 'meu', 'minha', 'já', 'ja', 'só', 'so', 'então', 'entao', 'depois', 'ainda', 'sempre', 'nunca', 'tinha', 'havia', 'começou', 'ficou', 'em', 'são', 'sao'],
  es: ['y', 'el', 'en', 'de', 'que', 'no', 'una', 'un', 'para', 'con', 'él', 'ella', 'era', 'fue', 'pero', 'como', 'su', 'sus', 'usted', 'cuando', 'donde', 'muy', 'más', 'mas', 'eso', 'está', 'esta', 'hasta', 'porque', 'también', 'tambien', 'los', 'las', 'del', 'al', 'yo', 'nosotros', 'ellos', 'ellas', 'mi', 'ya', 'sólo', 'solo', 'entonces', 'después', 'despues', 'todavía', 'siempre', 'nunca', 'se', 'lo', 'le', 'es', 'son', 'ser', 'hay', 'tiene', 'tenía', 'busca', 'felicidad', 'hombre', 'mujer', 'vida'],
}

const SETS: Record<DetectableLanguage, Set<string>> = {
  en: new Set(STOPWORDS.en),
  pt: new Set(STOPWORDS.pt),
  es: new Set(STOPWORDS.es),
}

/** Marcas exclusivas (o resto das listas se cruza: "de", "que", "no"...). */
const EXCLUSIVE: Record<DetectableLanguage, Set<string>> = {
  en: new Set(['the', 'and', 'of', 'is', 'that', 'was', 'with', 'they', 'this', 'from', 'are', 'were', 'have', 'you', 'we', 'be']),
  // 14/09: 'em', 'um', 'com', 'mais', 'já', 'na', 'seu', 'sua', 'são', 'foi' são só do PT (es: en/un/con/más/ya/su/son/fue) — sem elas, um prompt claramente PT (9 marcas × 3) ficava em null e o filme saía em inglês.
  pt: new Set(['o', 'e', 'não', 'nao', 'uma', 'você', 'voce', 'também', 'tambem', 'os', 'do', 'da', 'dos', 'das', 'ao', 'pelo', 'pela', 'nós', 'eu', 'meu', 'minha', 'então', 'entao', 'depois', 'está', 'isso', 'muito', 'ele', 'ela', 'até', 'ate', 'quando', 'onde', 'tinha', 'havia', 'começou', 'ficou', 'em', 'um', 'com', 'mais', 'já', 'ja', 'na', 'nas', 'seu', 'sua', 'são', 'sao', 'foi']),
  es: new Set(['y', 'el', 'en', 'lo', 'le', 'una', 'usted', 'también', 'tambien', 'los', 'las', 'del', 'al', 'yo', 'nosotros', 'ellos', 'mi', 'entonces', 'después', 'despues', 'todavía', 'es', 'son', 'hay', 'tiene', 'pero', 'muy', 'eso', 'hasta', 'cuando', 'donde', 'sólo', 'con', 'un', 'más', 'fue', 'ya', 'sus', 'tenía']),
}

const tokens = (text: string): string[] =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'’-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

export interface LanguageGuess {
  language: DetectableLanguage | null
  /** 0..1 — fração das palavras funcionais que pertencem à língua vencedora. */
  confidence: number
  counts: Record<DetectableLanguage, number>
  words: number
}

/**
 * Detecta en/pt/es pelo vocabulário funcional. Devolve `language: null` quando
 * o texto é curto (<8 palavras) ou a evidência é ambígua (vencedor sem folga
 * de 1,5× sobre o segundo ou sem pelo menos 3 marcas exclusivas).
 */
export function detectNarrationLanguage(text: string): LanguageGuess {
  const ws = tokens(text)
  const counts: Record<DetectableLanguage, number> = { en: 0, pt: 0, es: 0 }
  const exclusive: Record<DetectableLanguage, number> = { en: 0, pt: 0, es: 0 }
  for (const w of ws) {
    for (const lang of ['en', 'pt', 'es'] as const) {
      if (SETS[lang].has(w)) counts[lang]++
      if (EXCLUSIVE[lang].has(w)) exclusive[lang]++
    }
  }
  const ranked = (['en', 'pt', 'es'] as const).slice().sort((a, b) => counts[b] - counts[a])
  const top = ranked[0]
  const second = ranked[1]
  const total = counts.en + counts.pt + counts.es
  const confidence = total > 0 ? Math.round((counts[top] / total) * 100) / 100 : 0
  if (ws.length < 8 || counts[top] === 0) return { language: null, confidence, counts, words: ws.length }
  const clearWinner = counts[top] >= counts[second] * 1.5 && exclusive[top] >= 3
  return { language: clearWinner ? top : null, confidence, counts, words: ws.length }
}

/**
 * Regra do chamador: a escolha explícita da pessoa (pt/es) vence sempre; o
 * padrão "en" (ou ausente) cede ao idioma do texto quando ele é claro.
 * Devolve o idioma final e se houve troca (para o evento).
 */
export function resolveNarrationLanguage(requested: unknown, text: string): { language: NarrationLanguage; detected: DetectableLanguage | null; switched: boolean; confidence: number } {
  const asked: NarrationLanguage = narrationLanguage(requested) ?? 'en' // KINEO-IDIOMAS-15: qualquer código do catálogo
  const guess = detectNarrationLanguage(text)
  if (asked !== 'en') return { language: asked, detected: guess.language, switched: false, confidence: guess.confidence }
  if (guess.language && guess.language !== 'en') return { language: guess.language, detected: guess.language, switched: true, confidence: guess.confidence }
  return { language: 'en', detected: guess.language, switched: false, confidence: guess.confidence }
}

export const LANGUAGE_NAMES: Record<NarrationLanguage, string> = Object.fromEntries(NARRATION_LANGUAGES.map((l) => [l.code, l.name])) as Record<NarrationLanguage, string>
