// KINEO-IDIOMA-DO-TEXTO-2026-09-12 — A VOZ FALA A LÍNGUA DO TEXTO.
//
// Caso do vigia (11/09, render 59e1c0ce): a pessoa escreveu uma história em
// ESPANHOL na home e apertou o botão; o seletor de idioma ficou no padrão
// "en", o escritor de cenas escreveu a narração em inglês e o filme saiu em
// outra língua. Ninguém olhava o texto. Este módulo é puro: conta palavras
// funcionais de cada língua e devolve o idioma do texto quando a evidência é
// clara; caso contrário devolve null e o chamador mantém o que a pessoa
// escolheu. Só as três línguas que a casa narra (en · pt · es).

export type NarrationLanguage = 'en' | 'pt' | 'es'

const STOPWORDS: Record<NarrationLanguage, string[]> = {
  en: ['the', 'and', 'of', 'to', 'in', 'is', 'that', 'was', 'for', 'with', 'his', 'her', 'they', 'this', 'from', 'but', 'not', 'are', 'were', 'have', 'he', 'she', 'it', 'you', 'we', 'on', 'at', 'by', 'an', 'be'],
  pt: ['o', 'e', 'de', 'que', 'não', 'nao', 'uma', 'um', 'para', 'com', 'ele', 'ela', 'era', 'foi', 'mas', 'como', 'seu', 'sua', 'você', 'voce', 'quando', 'onde', 'muito', 'mais', 'isso', 'está', 'esta', 'até', 'ate', 'porque', 'também', 'tambem', 'os', 'as', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'ao', 'pelo', 'pela', 'eu', 'nós', 'eles', 'elas', 'meu', 'minha', 'já', 'ja', 'só', 'so', 'então', 'entao', 'depois', 'ainda', 'sempre', 'nunca', 'tinha', 'havia', 'começou', 'ficou'],
  es: ['y', 'el', 'en', 'de', 'que', 'no', 'una', 'un', 'para', 'con', 'él', 'ella', 'era', 'fue', 'pero', 'como', 'su', 'sus', 'usted', 'cuando', 'donde', 'muy', 'más', 'mas', 'eso', 'está', 'esta', 'hasta', 'porque', 'también', 'tambien', 'los', 'las', 'del', 'al', 'yo', 'nosotros', 'ellos', 'ellas', 'mi', 'ya', 'sólo', 'solo', 'entonces', 'después', 'despues', 'todavía', 'siempre', 'nunca', 'se', 'lo', 'le', 'es', 'son', 'ser', 'hay', 'tiene', 'tenía', 'busca', 'felicidad', 'hombre', 'mujer', 'vida'],
}

const SETS: Record<NarrationLanguage, Set<string>> = {
  en: new Set(STOPWORDS.en),
  pt: new Set(STOPWORDS.pt),
  es: new Set(STOPWORDS.es),
}

/** Marcas exclusivas (o resto das listas se cruza: "de", "que", "no"...). */
const EXCLUSIVE: Record<NarrationLanguage, Set<string>> = {
  en: new Set(['the', 'and', 'of', 'is', 'that', 'was', 'with', 'they', 'this', 'from', 'are', 'were', 'have', 'you', 'we', 'be']),
  pt: new Set(['o', 'e', 'não', 'nao', 'uma', 'você', 'voce', 'também', 'tambem', 'os', 'do', 'da', 'dos', 'das', 'ao', 'pelo', 'pela', 'nós', 'eu', 'meu', 'minha', 'então', 'entao', 'depois', 'está', 'isso', 'muito', 'ele', 'ela', 'até', 'ate', 'quando', 'onde', 'tinha', 'havia', 'começou', 'ficou']),
  es: new Set(['y', 'el', 'en', 'lo', 'le', 'una', 'usted', 'también', 'tambien', 'los', 'las', 'del', 'al', 'yo', 'nosotros', 'ellos', 'mi', 'entonces', 'después', 'despues', 'todavía', 'es', 'son', 'hay', 'tiene', 'pero', 'muy', 'eso', 'hasta', 'cuando', 'donde', 'sólo']),
}

const tokens = (text: string): string[] =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'’-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

export interface LanguageGuess {
  language: NarrationLanguage | null
  /** 0..1 — fração das palavras funcionais que pertencem à língua vencedora. */
  confidence: number
  counts: Record<NarrationLanguage, number>
  words: number
}

/**
 * Detecta en/pt/es pelo vocabulário funcional. Devolve `language: null` quando
 * o texto é curto (<8 palavras) ou a evidência é ambígua (vencedor sem folga
 * de 1,5× sobre o segundo ou sem pelo menos 3 marcas exclusivas).
 */
export function detectNarrationLanguage(text: string): LanguageGuess {
  const ws = tokens(text)
  const counts: Record<NarrationLanguage, number> = { en: 0, pt: 0, es: 0 }
  const exclusive: Record<NarrationLanguage, number> = { en: 0, pt: 0, es: 0 }
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
export function resolveNarrationLanguage(requested: unknown, text: string): { language: NarrationLanguage; detected: NarrationLanguage | null; switched: boolean; confidence: number } {
  const asked: NarrationLanguage = requested === 'pt' ? 'pt' : requested === 'es' ? 'es' : 'en'
  const guess = detectNarrationLanguage(text)
  if (asked !== 'en') return { language: asked, detected: guess.language, switched: false, confidence: guess.confidence }
  if (guess.language && guess.language !== 'en') return { language: guess.language, detected: guess.language, switched: true, confidence: guess.confidence }
  return { language: 'en', detected: guess.language, switched: false, confidence: guess.confidence }
}

export const LANGUAGE_NAMES: Record<NarrationLanguage, string> = {
  en: 'English',
  pt: 'Brazilian Portuguese (pt-BR)',
  es: 'Spanish (es-419, Latin American)',
}
