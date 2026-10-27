// KINEO-IDIOMA-DO-TEXTO-2026-09-12 — A VOZ FALA A LÍNGUA DO TEXTO.
//
// Caso do vigia (11/09, render 59e1c0ce): a pessoa escreveu uma história em
// ESPANHOL na home e apertou o botão; o seletor de idioma ficou no padrão
// "en", o escritor de cenas escreveu a narração em inglês e o filme saiu em
// outra língua. Ninguém olhava o texto. Este módulo é puro: conta palavras
// funcionais de cada língua e devolve o idioma do texto quando a evidência é
// clara; caso contrário devolve null e o chamador mantém o que a pessoa
// escolheu. Só as três línguas que a casa narra (en · pt · es).

// KINEO-IDIOMAS-FORMATOS-2410 — catálogo único de fala, separado do idioma da interface.
// Schema fal consultado 24/10/2026: 37 idiomas explícitos; Urdu/Bengali seguem legados, sem alegação de suporte MiniMax.
// Os 3 motores de voz própria preservam o gate en/pt/es; este catálogo serve a narração TTS.
export type NarrationLanguage = 'en' | 'pt' | 'es' | 'hi' | 'fr' | 'de' | 'it' | 'nl' | 'pl' | 'tr' | 'ru' | 'uk' | 'ar' | 'ur' | 'id' | 'vi' | 'bn' | 'zh' | 'yue' | 'ja' | 'ko' | 'th' | 'ro' | 'el' | 'cs' | 'fi' | 'bg' | 'da' | 'he' | 'ms' | 'sk' | 'sv' | 'hr' | 'hu' | 'no' | 'sl' | 'ca' | 'nn' | 'af' // KINEO-IDIOMAS-FORMATOS-2410
export type MiniMaxLanguageBoost = 'English' | 'Portuguese' | 'Spanish' | 'Hindi' | 'French' | 'German' | 'Italian' | 'Dutch' | 'Polish' | 'Turkish' | 'Russian' | 'Ukrainian' | 'Arabic' | 'Indonesian' | 'Vietnamese' | 'Chinese' | 'Chinese,Yue' | 'Japanese' | 'Korean' | 'Thai' | 'Romanian' | 'Greek' | 'Czech' | 'Finnish' | 'Bulgarian' | 'Danish' | 'Hebrew' | 'Malay' | 'Slovak' | 'Swedish' | 'Croatian' | 'Hungarian' | 'Norwegian' | 'Slovenian' | 'Catalan' | 'Nynorsk' | 'Afrikaans' | 'auto' // KINEO-IDIOMAS-FORMATOS-2410 — schema fal
export interface NarrationLanguageSpec {
  code: NarrationLanguage
  /** Nome que vai na instrução ao roteirista ("Write all voiceover sentences in …"). */
  name: string
  /** Nome na própria língua, para o seletor. */
  native: string
  /** Fonte das legendas no Creatomate (Google Fonts). Montserrat não tem devanágari nem árabe. */
  captionFont: string
  minimaxBoost?: MiniMaxLanguageBoost // KINEO-IDIOMAS-FORMATOS-2410 — enum oficial fal, ausente nos legados Urdu/Bengali
  minimaxPrimary?: true // KINEO-IDIOMAS-FORMATOS-2410 — línguas novas usam Speech 2.8 HD
  rtl: boolean
}
export const DEFAULT_CAPTION_FONT = 'Montserrat'
export const NARRATION_LANGUAGES: readonly NarrationLanguageSpec[] = [
  { code: 'en', name: 'English', native: 'English', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'English', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'pt', name: 'Brazilian Portuguese (pt-BR)', native: 'Português', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Portuguese', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410 · KINEO-VOZ-NATIVA-2610 — voz nativa MiniMax (Portuguese_ConfidentWoman); a tts-1-hd americana lia português com sotaque (chave azul 26/10: "a menina" ouvida como "o menino")
  { code: 'es', name: 'Spanish (es-419, Latin American)', native: 'Español', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Spanish', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410 · KINEO-VOZ-NATIVA-2610 — voz nativa MiniMax (Spanish_ConfidentWoman)
  { code: 'hi', name: 'Hindi (Devanagari script)', native: 'हिन्दी', captionFont: 'Noto Sans Devanagari', minimaxBoost: 'Hindi', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'bn', name: 'Bengali', native: 'বাংলা', captionFont: 'Noto Sans Bengali', rtl: false }, // KINEO-LEGENDA-BENGALI-2010 — mesma estrada Google Fonts já usada pelo hindi
  { code: 'fr', name: 'French', native: 'Français', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'French', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'de', name: 'German', native: 'Deutsch', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'German', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'it', name: 'Italian', native: 'Italiano', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Italian', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'nl', name: 'Dutch', native: 'Nederlands', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Dutch', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'pl', name: 'Polish', native: 'Polski', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Polish', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'tr', name: 'Turkish', native: 'Türkçe', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Turkish', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'ru', name: 'Russian', native: 'Русский', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Russian', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'uk', name: 'Ukrainian', native: 'Українська', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Ukrainian', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'ar', name: 'Arabic (Modern Standard)', native: 'العربية', captionFont: 'Noto Sans Arabic', minimaxBoost: 'Arabic', rtl: true }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'ur', name: 'Urdu', native: 'اردو', captionFont: 'Noto Sans Arabic', rtl: true },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Indonesian', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Vietnamese', rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'zh', name: 'Mandarin Chinese', native: '普通话', captionFont: 'Noto Sans SC', minimaxBoost: 'Chinese', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'yue', name: 'Cantonese', native: '粵語', captionFont: 'Noto Sans TC', minimaxBoost: 'Chinese,Yue', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'ja', name: 'Japanese', native: '日本語', captionFont: 'Noto Sans JP', minimaxBoost: 'Japanese', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'ko', name: 'Korean', native: '한국어', captionFont: 'Noto Sans KR', minimaxBoost: 'Korean', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'th', name: 'Thai', native: 'ไทย', captionFont: 'Noto Sans Thai', minimaxBoost: 'Thai', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'ro', name: 'Romanian', native: 'Română', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Romanian', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'el', name: 'Greek', native: 'Ελληνικά', captionFont: 'Noto Sans', minimaxBoost: 'Greek', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'cs', name: 'Czech', native: 'Čeština', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Czech', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'fi', name: 'Finnish', native: 'Suomi', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Finnish', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'bg', name: 'Bulgarian', native: 'Български', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Bulgarian', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'da', name: 'Danish', native: 'Dansk', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Danish', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'he', name: 'Hebrew', native: 'עברית', captionFont: 'Noto Sans Hebrew', minimaxBoost: 'Hebrew', minimaxPrimary: true, rtl: true }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Malay', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'sk', name: 'Slovak', native: 'Slovenčina', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Slovak', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'sv', name: 'Swedish', native: 'Svenska', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Swedish', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'hr', name: 'Croatian', native: 'Hrvatski', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Croatian', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'hu', name: 'Hungarian', native: 'Magyar', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Hungarian', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'no', name: 'Norwegian (Bokmål)', native: 'Norsk bokmål', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Norwegian', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'sl', name: 'Slovenian', native: 'Slovenščina', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Slovenian', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'ca', name: 'Catalan', native: 'Català', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Catalan', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'nn', name: 'Norwegian Nynorsk', native: 'Norsk nynorsk', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Nynorsk', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Afrikaans', minimaxPrimary: true, rtl: false }, // KINEO-IDIOMAS-FORMATOS-2410
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
/**
 * As línguas que o DETECTOR abaixo reconhece pelo vocabulário funcional.
 * KINEO1-FILME-DESENHADO-2026-09-21 — eram três (en · pt · es). Caso jonathanschwapp (21/09 16:52Z): pedido em
 * FRANCÊS ("un facteur… avec son sac… tombe sur un coussin"), o detector só conhecia es/pt/en, as marcas "un/son/en/
 * la" caíram no espanhol (es 0,77) e o filme foi narrado em ESPANHOL para um francês. Entram fr · de · it (FR 14, DE 20,
 * IT 6 cadastros/30 d). As marcas exclusivas são calculadas por SUBTRAÇÃO das listas das outras línguas — "le", "un",
 * "son", "la" existem em duas línguas e nunca mais decidem sozinhas.
 */
export type DetectableLanguage = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it'
export const DETECTABLE_LANGUAGES: readonly DetectableLanguage[] = ['en', 'pt', 'es', 'fr', 'de', 'it']

const STOPWORDS: Record<DetectableLanguage, string[]> = {
  fr: ['le', 'les', 'des', 'du', 'et', 'est', 'une', 'dans', 'avec', 'pour', 'sur', 'qui', 'il', 'elle', 'ils', 'elles', 'sont', 'pas', 'ne', 'ce', 'cette', 'ces', 'ses', 'leur', 'leurs', 'tout', 'tous', 'très', 'aussi', 'puis', 'être', 'avoir', 'fait', 'faire', 'comme', 'plus', 'nous', 'vous', 'je', 'tu', 'mon', 'ma', 'mes', 'au', 'aux', 'où', 'quand', 'pendant', 'devant', 'chez', 'même', 'alors', 'sans', 'sous', 'entre', 'depuis', 'après', 'avant', 'toujours', 'jamais', 'ici', 'déjà', 'encore', 'bien', 'peu', 'beaucoup', 'trop', 'ainsi', 'donc', 'car', 'petit', 'petite', 'un', 'la', 'de', 'que', 'en', 'son', 'se', 'à', 'y', 'on', 'mais', 'ou', 'si'],
  de: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'mit', 'auf', 'für', 'von', 'zu', 'den', 'dem', 'des', 'sich', 'auch', 'wird', 'wurde', 'aber', 'oder', 'wenn', 'dass', 'als', 'noch', 'nur', 'sie', 'er', 'wir', 'ich', 'im', 'am', 'aus', 'bei', 'nach', 'über', 'durch', 'sehr', 'mehr', 'wie', 'hat', 'haben', 'sind', 'war', 'kann', 'ihr', 'ihre', 'sein', 'seine', 'diese', 'dieser', 'dieses', 'jetzt', 'dann', 'immer', 'nie', 'hier', 'schon', 'doch', 'vor', 'um', 'bis', 'es', 'in', 'an', 'so', 'also', 'man'],
  it: ['il', 'di', 'che', 'è', 'non', 'per', 'del', 'della', 'dei', 'delle', 'degli', 'nel', 'nella', 'gli', 'si', 'ma', 'più', 'anche', 'sono', 'ha', 'hanno', 'questo', 'questa', 'dove', 'molto', 'tutto', 'tutti', 'poi', 'suo', 'loro', 'noi', 'io', 'lui', 'lei', 'ci', 'cui', 'essere', 'fatto', 'stato', 'alla', 'dal', 'dalla', 'sul', 'sulla', 'perché', 'così', 'già', 'ora', 'sempre', 'mai', 'quando', 'come', 'una', 'un', 'la', 'le', 'lo', 'e', 'con', 'era', 'al', 'sua', 'se', 'a', 'in'],
  en: ['the', 'and', 'of', 'to', 'in', 'is', 'that', 'was', 'for', 'with', 'his', 'her', 'they', 'this', 'from', 'but', 'not', 'are', 'were', 'have', 'he', 'she', 'it', 'you', 'we', 'on', 'at', 'by', 'an', 'be'],
  pt: ['o', 'e', 'de', 'que', 'não', 'nao', 'uma', 'um', 'para', 'com', 'ele', 'ela', 'era', 'foi', 'mas', 'como', 'seu', 'sua', 'você', 'voce', 'quando', 'onde', 'muito', 'mais', 'isso', 'está', 'esta', 'até', 'ate', 'porque', 'também', 'tambem', 'os', 'as', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'ao', 'pelo', 'pela', 'eu', 'nós', 'eles', 'elas', 'meu', 'minha', 'já', 'ja', 'só', 'so', 'então', 'entao', 'depois', 'ainda', 'sempre', 'nunca', 'tinha', 'havia', 'começou', 'ficou', 'em', 'são', 'sao'],
  es: ['y', 'el', 'en', 'de', 'que', 'no', 'una', 'un', 'para', 'con', 'él', 'ella', 'era', 'fue', 'pero', 'como', 'su', 'sus', 'usted', 'cuando', 'donde', 'muy', 'más', 'mas', 'eso', 'está', 'esta', 'hasta', 'porque', 'también', 'tambien', 'los', 'las', 'del', 'al', 'yo', 'nosotros', 'ellos', 'ellas', 'mi', 'ya', 'sólo', 'solo', 'entonces', 'después', 'despues', 'todavía', 'siempre', 'nunca', 'se', 'lo', 'le', 'es', 'son', 'ser', 'hay', 'tiene', 'tenía', 'busca', 'felicidad', 'hombre', 'mujer', 'vida', 'historia', 'jamás', 'jamas', 'aquí', 'allí', 'ahora', 'ese', 'esa', 'esos', 'esas', 'estos', 'estas', 'nuestro', 'nuestra', 'algo', 'alguien', 'nadie', 'mientras', 'aunque', 'sin'],
}

const SETS = Object.fromEntries(DETECTABLE_LANGUAGES.map((l) => [l, new Set(STOPWORDS[l])])) as Record<DetectableLanguage, Set<string>>

/** Marcas exclusivas (o resto das listas se cruza: "de", "que", "no"...). Candidatas curadas por língua… */
const EXCLUSIVE_CURATED: Record<DetectableLanguage, string[]> = {
  en: ['the', 'and', 'of', 'is', 'that', 'was', 'with', 'they', 'this', 'from', 'are', 'were', 'have', 'you', 'we', 'be'],
  // 14/09: 'em', 'um', 'com', 'mais', 'já', 'na', 'seu', 'sua', 'são', 'foi' são só do PT (es: en/un/con/más/ya/su/son/fue) — sem elas, um prompt claramente PT (9 marcas × 3) ficava em null e o filme saía em inglês.
  pt: ['o', 'e', 'não', 'nao', 'uma', 'você', 'voce', 'também', 'tambem', 'os', 'do', 'da', 'dos', 'das', 'ao', 'pelo', 'pela', 'nós', 'eu', 'meu', 'minha', 'então', 'entao', 'depois', 'está', 'isso', 'muito', 'ele', 'ela', 'até', 'ate', 'quando', 'onde', 'tinha', 'havia', 'começou', 'ficou', 'em', 'um', 'com', 'mais', 'já', 'ja', 'na', 'nas', 'seu', 'sua', 'são', 'sao', 'foi'],
  es: ['y', 'el', 'en', 'lo', 'le', 'una', 'usted', 'también', 'tambien', 'los', 'las', 'del', 'al', 'yo', 'nosotros', 'ellos', 'mi', 'entonces', 'después', 'despues', 'todavía', 'es', 'son', 'hay', 'tiene', 'pero', 'muy', 'eso', 'hasta', 'cuando', 'donde', 'sólo', 'con', 'un', 'más', 'fue', 'ya', 'sus', 'tenía', 'busca', 'felicidad', 'hombre', 'mujer', 'vida', 'historia', 'jamás', 'jamas', 'aquí', 'allí', 'ahora', 'ese', 'esa', 'esos', 'esas', 'estos', 'estas', 'nuestro', 'nuestra', 'algo', 'alguien', 'nadie', 'mientras', 'aunque', 'sin'], // 21/09: "del" virou marca partilhada com o italiano; o espanhol ganha marcas que só ele tem
  fr: ['le', 'les', 'des', 'du', 'et', 'est', 'une', 'dans', 'avec', 'pour', 'sur', 'qui', 'il', 'elle', 'ils', 'elles', 'sont', 'pas', 'ne', 'ce', 'cette', 'ces', 'ses', 'leur', 'leurs', 'tout', 'tous', 'très', 'aussi', 'puis', 'être', 'avoir', 'fait', 'faire', 'comme', 'plus', 'nous', 'vous', 'je', 'tu', 'mon', 'mes', 'aux', 'où', 'quand', 'pendant', 'devant', 'chez', 'même', 'alors', 'sans', 'sous', 'entre', 'depuis', 'après', 'avant', 'toujours', 'jamais', 'ici', 'déjà', 'encore', 'bien', 'peu', 'beaucoup', 'trop', 'ainsi', 'donc', 'car', 'petit', 'petite'],
  de: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'mit', 'auf', 'für', 'von', 'zu', 'den', 'dem', 'des', 'sich', 'auch', 'wird', 'wurde', 'aber', 'oder', 'wenn', 'dass', 'als', 'noch', 'nur', 'sie', 'er', 'wir', 'ich', 'im', 'am', 'aus', 'bei', 'nach', 'über', 'durch', 'sehr', 'mehr', 'wie', 'hat', 'haben', 'sind', 'war', 'kann', 'ihr', 'ihre', 'sein', 'seine', 'diese', 'dieser', 'dieses', 'jetzt', 'dann', 'immer', 'nie', 'hier', 'schon', 'doch', 'vor', 'um', 'bis', 'man'],
  it: ['il', 'di', 'che', 'è', 'non', 'per', 'del', 'della', 'dei', 'delle', 'degli', 'nel', 'nella', 'gli', 'si', 'ma', 'più', 'anche', 'sono', 'ha', 'hanno', 'questo', 'questa', 'dove', 'molto', 'tutto', 'tutti', 'poi', 'suo', 'loro', 'noi', 'io', 'lui', 'lei', 'ci', 'cui', 'essere', 'fatto', 'stato', 'alla', 'dal', 'dalla', 'sul', 'sulla', 'perché', 'così', 'già', 'ora', 'mai', 'come'],
}
/** …e a marca só é exclusiva de verdade se NENHUMA outra língua a lista ("le" fr/es, "un" es/fr/it, "um" pt/de). */
const EXCLUSIVE = Object.fromEntries(
  DETECTABLE_LANGUAGES.map((lang) => [lang, new Set(EXCLUSIVE_CURATED[lang].filter((w) => DETECTABLE_LANGUAGES.every((other) => other === lang || !SETS[other].has(w))))]),
) as Record<DetectableLanguage, Set<string>>

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
  const counts = Object.fromEntries(DETECTABLE_LANGUAGES.map((l) => [l, 0])) as Record<DetectableLanguage, number>
  const exclusive = Object.fromEntries(DETECTABLE_LANGUAGES.map((l) => [l, 0])) as Record<DetectableLanguage, number>
  for (const w of ws) {
    for (const lang of DETECTABLE_LANGUAGES) {
      if (SETS[lang].has(w)) counts[lang]++
      if (EXCLUSIVE[lang].has(w)) exclusive[lang]++
    }
  }
  const ranked = DETECTABLE_LANGUAGES.slice().sort((a, b) => counts[b] - counts[a])
  const top = ranked[0]
  const second = ranked[1]
  const total = DETECTABLE_LANGUAGES.reduce((acc, l) => acc + counts[l], 0)
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


// KINEO-IDIOMAS-FORMATOS-2410 — todos os boosts vêm das linhas do catálogo; nunca passar ISO à fal.
export function minimaxLanguageBoost(raw: unknown): MiniMaxLanguageBoost {
  return NARRATION_LANGUAGES.find(l => l.code === narrationLanguage(raw))?.minimaxBoost ?? 'auto'
}
export function usesMiniMaxNarration(raw: unknown): boolean {
  return NARRATION_LANGUAGES.some(l => l.code === narrationLanguage(raw) && l.minimaxPrimary === true)
}
/** Espaços preservam a régua anterior. CJK/Thai usam palavras Unicode, sem cortar grafemas ou fingir que a frase inteira é uma palavra. */
export function narrationTokens(text: string, language?: unknown): string[] {
  const value = String(text ?? '').trim()
  if (!value) return []
  const code = narrationLanguage(language)
  const compact = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(value)
  if (!['zh', 'yue', 'ja', 'th'].includes(code ?? '') && !compact) return value.split(/\s+/u).filter(Boolean)
  const locale = code === 'yue' ? 'zh-Hant' : code === 'zh' ? 'zh-Hans' : code ?? (/\p{Script=Thai}/u.test(value) ? 'th' : /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value) ? 'ja' : 'zh')
  const result: string[] = []
  let prefix = ''
  for (const item of new Intl.Segmenter(locale, { granularity: 'word' }).segment(value)) {
    if (item.isWordLike) { result.push(prefix + item.segment); prefix = '' }
    else if (item.segment) { // KINEO-IDIOMAS-FORMATOS-2410 — preserve spaces in mixed CJK/Thai product names, e.g. Apple Watch.
      if (result.length) result[result.length - 1] += item.segment
      else prefix += item.segment
    }
  }
  return result.length ? result : [value]
}
export function narrationWordCount(text: string, language?: unknown): number { return narrationTokens(text, language).length }
export function joinNarrationTokens(tokens: readonly string[], language?: unknown): string {
  return tokens.join(['zh', 'yue', 'ja', 'th'].includes(narrationLanguage(language) ?? '') || tokens.some(t => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]|^\s|\s$/u.test(t)) ? '' : ' ')
}
// KINEO-LEGENDA-RTL-2710 [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"] — escrita da direita para a esquerda.
// Render c5e68914 (urdu, 27/10 17:42Z): o karaokê de lib/compose embrulha a palavra corrente em [color]…[/color]; o Creatomate // KINEO-LEGENDA-RTL-2710
// parte o texto em corridas nessa fronteira e dispõe as corridas da ESQUERDA para a direita — "ایک چھوٹا سا راز" saiu na tela // KINEO-LEGENDA-RTL-2710
// como "چھوٹا سا راز ایک" e trocava de ordem a cada palavra pintada (a 3ª legenda, "آمنہ کو ملا ایک جادوئی", bate exatamente // KINEO-LEGENDA-RTL-2710
// com esse modelo). Hebraico 0590–05FF · árabe/persa/urdu/pashto/sindi/curdo/uigur 0600–06FF, 0750–077F, 08A0–08FF · formas // KINEO-LEGENDA-RTL-2710
// de apresentação FB1D–FDFF, FE70–FEFF. A PRIMEIRA letra forte decide (UAX #9, P2/P3); sem letra forte (só dígitos, // KINEO-LEGENDA-RTL-2710
// pontuação) devolve null e quem chama cai no idioma do filme (`rtl` do catálogo acima). // KINEO-LEGENDA-RTL-2710
const RTL_SCRIPT_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u // KINEO-LEGENDA-RTL-2710
export function hasRtlScript(text: unknown): boolean { return RTL_SCRIPT_RE.test(String(text ?? '')) } // KINEO-LEGENDA-RTL-2710
export function isRtlLanguage(raw: unknown): boolean { const code = narrationLanguage(raw); return code != null && NARRATION_LANGUAGES.some((l) => l.code === code && l.rtl === true) } // KINEO-LEGENDA-RTL-2710
/** true = RTL · false = LTR · null = sem letra forte (só dígitos/pontuação/espaços). Nunca lança. */ // KINEO-LEGENDA-RTL-2710
export function textDirectionOf(text: unknown): boolean | null { // KINEO-LEGENDA-RTL-2710
  for (const ch of String(text ?? '')) { // KINEO-LEGENDA-RTL-2710
    if (RTL_SCRIPT_RE.test(ch)) return true // KINEO-LEGENDA-RTL-2710
    if (/\p{L}/u.test(ch)) return false // KINEO-LEGENDA-RTL-2710
  } // KINEO-LEGENDA-RTL-2710
  return null // KINEO-LEGENDA-RTL-2710
} // KINEO-LEGENDA-RTL-2710
/** A legenda deste texto é RTL? O texto decide; sem letra forte, o idioma do filme. */ // KINEO-LEGENDA-RTL-2710
export function isRtlCaption(text: unknown, language?: unknown): boolean { return textDirectionOf(text) ?? isRtlLanguage(language) } // KINEO-LEGENDA-RTL-2710
export function narrationSentences(text: string, language?: unknown): string[] {
  const value = String(text ?? '').trim()
  if (!value) return []
  const code = narrationLanguage(language)
  return Array.from(new Intl.Segmenter(code === 'yue' ? 'zh-Hant' : code ?? 'en', { granularity: 'sentence' }).segment(value), item => item.segment.trim()).filter(Boolean)
}

export const LANGUAGE_NAMES: Record<NarrationLanguage, string> = Object.fromEntries(NARRATION_LANGUAGES.map((l) => [l.code, l.name])) as Record<NarrationLanguage, string>

// KINEO-IDIOMAS-FORMATOS-2410 — IDs da lista oficial MiniMax consultada em 24/10/2026.
// Língua sem voz nativa publicada nessa lista usa uma voz multilíngue documentada; não inventamos um ID com prefixo da língua.
const MINIMAX_VOICE_PAIRS: Partial<Record<NarrationLanguage, readonly [string, string]>> = {
  en: ['English_ConfidentWoman', 'English_Trustworth_Man'], pt: ['Portuguese_ConfidentWoman', 'Portuguese_ReliableMan'],
  es: ['Spanish_ConfidentWoman', 'Spanish_ReliableMan'], zh: ['Chinese (Mandarin)_Mature_Woman', 'Chinese (Mandarin)_Gentleman'],
  yue: ['Cantonese_GentleLady', 'Cantonese_ProfessionalHost (M)'], ja: ['Japanese_CalmLady', 'Japanese_GentleButler'],
  ko: ['Korean_CalmLady', 'Korean_CalmGentleman'], th: ['Thai_female_1_sample1', 'Thai_male_1_sample8'],
  fr: ['French_FemaleAnchor', 'French_MaleNarrator'], de: ['German_SweetLady', 'German_FriendlyMan'],
  ru: ['Russian_AmbitiousWoman', 'Russian_ReliableMan'], it: ['Italian_BraveHeroine', 'Italian_Narrator'],
  nl: ['Dutch_kindhearted_girl', 'English_Trustworth_Man'], vi: ['Vietnamese_kindhearted_girl', 'English_Trustworth_Man'],
  ar: ['Arabic_CalmWoman', 'Arabic_FriendlyGuy'], tr: ['Turkish_CalmWoman', 'Turkish_Trustworthyman'],
  uk: ['Ukrainian_CalmWoman', 'Ukrainian_WiseScholar'], id: ['Indonesian_ConfidentWoman', 'Indonesian_CaringMan'],
  pl: ['Polish_female_1_sample1', 'Polish_male_1_sample4'], ro: ['Romanian_female_2_sample1', 'Romanian_male_1_sample2'],
  el: ['Greek_female_1_sample1', 'greek_male_1a_v1'], cs: ['czech_female_2_v2', 'czech_male_1_v1'],
  fi: ['finnish_female_4_v1', 'finnish_male_3_v1'], hi: ['hindi_female_2_v1', 'hindi_male_1_v2'],
}
export function minimaxVoiceFor(raw: unknown, gender: 'female' | 'male' = 'female'): string {
  const code = narrationLanguage(raw)
  const voices = code ? MINIMAX_VOICE_PAIRS[code] : null
  return (voices ?? MINIMAX_VOICE_PAIRS.en!)[gender === 'male' ? 1 : 0]
}
