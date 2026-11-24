export type IdiomaDeSentido = 'en' | 'pt' | 'es'
type Release = 'off' | 'internal' | 'public'
export const LEGENDA_SENTIDO_RELEASE: Release = 'internal'

// The signed-in email comes from Auth. In service mode the editable profile is only
// a negative filter: a second check against Auth must confirm an internal account.
export async function idiomaDaLegendaDeSentido(language: string, interna: boolean, confirmarConta?: () => Promise<boolean>, release: Release = LEGENDA_SENTIDO_RELEASE): Promise<IdiomaDeSentido | undefined> {
  const lang = language.trim().toLowerCase().split(/[-_]/)[0]
  if (lang !== 'en' && lang !== 'pt' && lang !== 'es') return undefined
  if (release === 'public') return lang
  if (release === 'off' || !interna) return undefined
  if (confirmarConta) {
    try {
      if (!await confirmarConta()) return undefined
    } catch {
      return undefined
    }
  }
  return lang
}

// Closed grammatical patterns: article + colour + noun (EN), article + noun + colour (PT/ES).
// Requiring an article avoids treating a colour used as a noun or verb as an adjective.
const artigos: Record<IdiomaDeSentido, RegExp> = {
  en: /^(a|an|the|his|her|my|your|our|their)$/,
  pt: /^(a|o|as|os|um|uma|uns|umas|seu|sua|seus|suas)$/,
  es: /^(el|la|los|las|un|una|unos|unas|su|sus)$/,
}
const cores: Record<IdiomaDeSentido, RegExp> = {
  en: /^(black|white|green|blue|red|yellow|grey|gray|brown|purple|golden)$/,
  pt: /^(pret[oa]s?|branc[oa]s?|verdes?|azul|azuis|vermelh[oa]s?|amarel[oa]s?|cinzas?|dourad[oa]s?)$/,
  es: /^(negr[oa]s?|blanc[oa]s?|verdes?|azul(?:es)?|roj[oa]s?|amarill[oa]s?|gris(?:es)?|dorad[oa]s?)$/,
}
const sujeitos: Record<IdiomaDeSentido, RegExp> = {
  en: /^(he|she|they|we|i)$/, pt: /^(ele|ela|eles|elas|nós|eu)$/, es: /^(él|ella|ellos|ellas|nosotros|nosotras|yo)$/,
}
const verbos: Record<IdiomaDeSentido, RegExp> = {
  en: /^(?:was|were|is|are|did|does|has|have|had|can|could|will|would|[a-z]{2,}ed)$/,
  pt: /^(?:era|eram|foi|foram|é|são|estava|estavam|está|estão|tinha|tinham|tem|têm|pode|podem)$/,
  es: /^(?:era|eran|fue|fueron|es|son|estaba|estaban|está|están|tenía|tenían|tiene|tienen|puede|pueden)$/,
}

// Name spelling is required evidence. Fully upper-case ASR strings cannot identify names.
const nomeComMaiuscula = (w: string) => /^\p{Lu}\p{Ll}+[.,!?;:…]?$/u.test(w)
const preposicoesDeLugar: Record<IdiomaDeSentido, RegExp> = {
  en: /^(?:past|near|toward|from)$/, pt: /^(?:de|até|desde)$/, es: /^(?:de|hasta|desde)$/,
}
export function palavraFuncionalDeSentido(w: string, lang: IdiomaDeSentido): boolean {
  return artigos[lang].test(w.toLowerCase())
}

export function fronteirasDeSentido(palavras: string[], lang: IdiomaDeSentido): boolean[] {
  const tokens = palavras.map(w => w.toLowerCase().trim())
  return tokens.map((palavra, i) => {
    const seguinte = tokens[i + 1]
    if (!seguinte || !/^\p{L}+$/u.test(palavra)) return false
    const prox = seguinte.replace(/[.,!?;:…]+$/u, '')
    if (!/^\p{L}+$/u.test(prox)) return false
    if (nomeComMaiuscula(palavras[i + 1]) && (nomeComMaiuscula(palavras[i]) || preposicoesDeLugar[lang].test(palavra))) return true
    if (sujeitos[lang].test(palavra) && verbos[lang].test(prox)) return true
    if (!artigos[lang].test(tokens[i - 1] ?? '')) return false
    if (lang !== 'en') return cores[lang].test(prox)
    return cores.en.test(palavra) && !/^(?:and|or|but|is|was|of|in|on|with|from|for|to|at|as|that|which|who|when|while|then|it)$/.test(prox)
  })
}
