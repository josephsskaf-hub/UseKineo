// KINEO-ANUNCIO-CONSERTOS-2026-10-12 — a narração e as frases de tela do anúncio v2 só afirmam o que veio do CLIENTE.
//
// POR QUÊ (prospecção de 12/10, 8 anúncios reais para marcas): em 4 de 8 a voz enfiou o lugar de um jeito errado ("Feel the
// refreshing glow in Toronto today!", "Treat yourself today in Australian!", "made in British", "inspired by Japanese baths
// in London") e inventou alegações que ninguém escreveu ("transforms your skin", "sustainable" — no Reino Unido, alegação
// ambiental é regulada). A causa do lugar estava em casa: o modo simples EXIGIA citar todo nome próprio da frase
// (lib/ads/v2Brief.ts, regra feita para o imóvel — "Edifício Villa Versace, em Moema"), e num anúncio de PRODUTO a cidade
// e o adjetivo de nacionalidade viravam obrigação colada em qualquer frase.
//
// Módulo PURO (nenhum import): o pedido de texto ganha as regras abaixo (ADS_V2_HONESTY_RULE / ADS_V2_PLACE_RULE) e a régua
// em código confere a resposta (honestyIssues); o que sobrar depois da 1 correção do modelo é CONSERTADO aqui
// (repairHonesty): a frase com alegação sem fonte sai inteira, o adjetivo de nacionalidade depois de "made in"/"from" vira o
// país, e o lugar colado sem sentido sai com a preposição. Nada aqui chama IA.

/** Regra de honestidade do pedido de texto (vale para o modo simples e o completo quando a rota passa a fonte). */
export const ADS_V2_HONESTY_RULE =
  'Only say what the customer\'s text says. Never add a benefit, result, effect, ingredient, material, certification or quality that the text does not state — for example "transforms your skin", "sustainable", "eco-friendly", "organic", "all-natural", "vegan", "cruelty-free", "handmade", "clinically proven", "dermatologist tested" or "guaranteed". Never make a health or medical claim (heals, cures, treats, reduces inflammation, boosts immunity, anti-aging) unless the customer typed it. Write places naturally: never a nationality word where a place belongs ("made in British", "today in Australian").'

/** Regra do lugar num anúncio de PRODUTO: o lugar é opcional e só em forma natural. */
export function adsV2PlaceRule(places: readonly string[]): string {
  const list = places.length ? ` The customer mentioned: ${places.map((p) => `"${p}"`).join(', ')}.` : ''
  return `narration: places are optional in a product ad.${list} Mention where the product is from only if the customer wrote it, and only in a natural phrase such as "made in the UK", "roasted in Saint John" or "from Toronto". Never glue a place onto an unrelated sentence ("the glow in Toronto today", "a treat today in Australia"). If you are not sure, leave the place out.`
}

/** Onde a frase nasceu: o texto inteiro do cliente (frase + preço + contato + página do produto + fatos marcados) e só o
 *  que ele DIGITOU (alegação de saúde só vale se estiver aqui — nunca copiada da página). */
export interface AdsV2HonestySource {
  source: string
  typed: string
  /** Anúncio de produto: o lugar só entra em forma natural (adsV2PlaceRule) e a régua do lugar vale. */
  product: boolean
  /** Lugares que o cliente escreveu (nomes próprios fora da marca). Só usados quando product. */
  places: readonly string[]
}

// ── alegações ─────────────────────────────────────────────────────────────────────────────────────────────────────
const W = (body: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, 'iu')

/** [régua, rótulo, só vale se DIGITADO]. A régua só reprova o que aparece no anúncio E não aparece na fonte. */
export const ADS_V2_CLAIMS: ReadonlyArray<readonly [RegExp, string, boolean]> = [
  [W('transform(?:s|ed|ing|ative)?|transforma(?:r|m|ção|cao|dora)?|transforme'), 'transforms', false],
  [W('sustainabl[ey]|sustainability|eco[- ]?friendly|environmentally friendly|planet[- ]friendly|carbon[- ]neutral|plastic[- ]free|zero[- ]waste|biodegradable|compostable|recyclable|recycled|sustent[aá]ve(?:l|is)|sustentabilidade|ecol[oó]gic[oa]s?|sostenibles?|sostenibilidad|ecoamigables?'), 'sustainable / eco', false],
  [W('organic|org[aâá]nic[oa]s?'), 'organic', false],
  [W('all[- ]natural|100% natural|natural ingredients?|ingredientes naturais|ingredientes naturales|chemical[- ]free|non[- ]toxic|toxin[- ]free|clean beauty'), 'natural / non-toxic', false],
  [W('vegan|vegan[oa]s?|cruelty[- ]free|plant[- ]based|gluten[- ]free|sugar[- ]free|dairy[- ]free|sem gl[uú]ten|sin gluten|sem a[cç][uú]car|sin az[uú]car'), 'vegan / free-from', false],
  [W('hand ?made|handcrafted|hand[- ]crafted|hand[- ]poured|hand[- ]picked|artisan(?:al)?|feit[oa] [àa] m[aã]o|artesana(?:l|is|les)|hech[oa] a mano'), 'handmade', false],
  [W('clinically|clinical(?:ly)? (?:proven|tested)|dermatologist(?:s)?|dermatologically|scientifically proven|lab[- ]tested|proven to|cientificamente|clinicamente|dermatologicamente|comprovad[oa]s?|probad[oa]s?'), 'clinically proven', false],
  [W('guarantee[ds]?|money[- ]back|garantid[oa]s?|garantizad[oa]s?'), 'guaranteed', false],
  [W('award[- ]winning|world[- ]class|highest quality|top quality|finest'), 'quality award', false],
  [W('heal(?:s|ing)?|cures?|cured|treats? (?:acne|eczema|psoriasis|pain|anxiety|insomnia|inflammation)|reduces? inflammation|anti[- ]?inflammatory|boosts? (?:your )?immun\\w*|detox\\w*|weight loss|lose weight|burns? fat|anti[- ]?aging|anti[- ]?ageing|anti[- ]?wrinkle|wrinkles?|acne|eczema|curar?|cura|emagrec\\w*|adelgaz\\w*|anti-?inflamat\\w*|antienvelhecimento|antiedad'), 'health / medical claim', true],
]

/** Alegações do texto que a fonte não sustenta (rótulos, sem repetir). Pura. */
export function unsupportedClaims(text: string, h: Pick<AdsV2HonestySource, 'source' | 'typed'>): string[] {
  const t = String(text ?? '')
  const out: string[] = []
  for (const [re, label, typedOnly] of ADS_V2_CLAIMS) {
    const m = re.exec(t)
    if (!m) continue
    const from = typedOnly ? h.typed : h.source
    if (re.test(String(from ?? ''))) continue
    out.push(`${label} ("${m[0]}")`)
  }
  return out
}

// ── nacionalidade no lugar do país ────────────────────────────────────────────────────────────────────────────────
/** Adjetivo de nacionalidade/região → o lugar, para "made in British" → "made in the UK". */
export const ADS_V2_DEMONYMS: Readonly<Record<string, string>> = {
  american: 'the USA', british: 'the UK', english: 'England', scottish: 'Scotland', welsh: 'Wales', irish: 'Ireland',
  canadian: 'Canada', australian: 'Australia', japanese: 'Japan', chinese: 'China', korean: 'Korea', thai: 'Thailand',
  vietnamese: 'Vietnam', indian: 'India', french: 'France', italian: 'Italy', spanish: 'Spain', portuguese: 'Portugal',
  german: 'Germany', dutch: 'the Netherlands', belgian: 'Belgium', swiss: 'Switzerland', swedish: 'Sweden',
  danish: 'Denmark', norwegian: 'Norway', finnish: 'Finland', icelandic: 'Iceland', polish: 'Poland', greek: 'Greece',
  turkish: 'Turkey', mexican: 'Mexico', brazilian: 'Brazil', argentinian: 'Argentina', argentine: 'Argentina',
  colombian: 'Colombia', peruvian: 'Peru', chilean: 'Chile', guatemalan: 'Guatemala', ethiopian: 'Ethiopia',
  kenyan: 'Kenya', moroccan: 'Morocco', egyptian: 'Egypt', israeli: 'Israel', lebanese: 'Lebanon', russian: 'Russia',
  ukrainian: 'Ukraine', indonesian: 'Indonesia', filipino: 'the Philippines', malaysian: 'Malaysia',
  singaporean: 'Singapore', jamaican: 'Jamaica', cuban: 'Cuba', hawaiian: 'Hawaii', californian: 'California',
  scandinavian: 'Scandinavia', european: 'Europe', african: 'Africa', asian: 'Asia', mediterranean: 'the Mediterranean',
}
const DEMONYM_ALT = Object.keys(ADS_V2_DEMONYMS).join('|')
/** A palavra é um adjetivo de nacionalidade (nunca é LUGAR a exigir na narração). */
export function isDemonym(word: string): boolean {
  return Object.prototype.hasOwnProperty.call(ADS_V2_DEMONYMS, String(word ?? '').trim().toLowerCase())
}
/** "in/from/made in" + adjetivo de nacionalidade SOLTO (sem substantivo depois): "made in British", "today in Australian". */
const DEMONYM_MISUSE = new RegExp(`(?<![\\p{L}])((?:made|crafted|designed|roasted|brewed|grown|built|born|based|bottled|baked|sewn|printed|produced)\\s+in|from|in)\\s+(${DEMONYM_ALT})(?![\\p{L}\\p{N}]|[\\s-]+\\p{L})`, 'iu')

/** Nomes de LÍNGUA: "narrated in Japanese" é frase certa — só "made in"/"from" + língua é erro. */
const LANGUAGE_NAMES = new Set(['english', 'french', 'spanish', 'portuguese', 'german', 'italian', 'japanese', 'chinese', 'korean', 'thai', 'vietnamese', 'dutch', 'swedish', 'danish', 'norwegian', 'finnish', 'icelandic', 'polish', 'greek', 'turkish', 'russian', 'ukrainian', 'indonesian', 'filipino', 'hawaiian'])
function findDemonymMisuse(text: string): RegExpExecArray | null {
  const re = new RegExp(DEMONYM_MISUSE.source, 'giu')
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (/^in$/i.test(m[1]) && LANGUAGE_NAMES.has(m[2].toLowerCase())) continue
    return m
  }
  return null
}

export function demonymMisuse(text: string): string | null {
  const m = findDemonymMisuse(String(text ?? ''))
  return m ? m[0] : null
}

// ── lugar colado sem sentido (anúncio de produto) ─────────────────────────────────────────────────────────────────
/** Formas naturais de dizer DE ONDE o produto vem (en/pt/es). O lugar só passa logo depois de uma delas. */
const NATURAL_BEFORE_PLACE = /(?:^|[^\p{L}])(?:from|made in|based in|born in|designed in|crafted in|roasted in|brewed in|grown in|sourced from|baked in|bottled in|distilled in|blended in|poured in|sewn in|printed in|handmade in|built in|founded in|produced in|de|da|do|feit[oa] em|produzid[oa] em|fabricad[oa] em|direto de|direto da|direto do|hech[oa] en|fabricad[oa] en|elaborad[oa] en|desde)\s+(?:the\s+)?$/iu
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Cada lugar citado FORA de uma forma natural ("glow in Toronto today"). Lugar dentro da marca não conta. Pura. */
export function placeMisuse(text: string, places: readonly string[]): string[] {
  const t = String(text ?? '')
  const out: string[] = []
  for (const place of places) {
    const p = String(place ?? '').trim()
    if (!p) continue
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(p)}(?![\\p{L}\\p{N}])`, 'giu')
    for (const m of t.matchAll(re)) {
      const before = t.slice(0, m.index ?? 0)
      const after = t.slice((m.index ?? 0) + m[0].length)
      // "Toronto-based", "Toronto-made": forma natural com o lugar na frente.
      if (/^[-‑](?:based|made|born|grown|roasted|brewed|designed)(?![\p{L}])/iu.test(after)) continue
      if (NATURAL_BEFORE_PLACE.test(before)) continue
      out.push(p)
      break
    }
  }
  return out
}

/** Todos os motivos de honestidade de um texto do anúncio (narração ou frase de tela), com o rótulo. Pura. */
export function honestyIssues(text: string, h: AdsV2HonestySource, label: string): string[] {
  const why: string[] = []
  const claims = unsupportedClaims(text, h)
  if (claims.length) why.push(`${label}: remove ${claims.join('; ')} — the customer never said it. Only say what the customer wrote.`)
  const dm = demonymMisuse(text)
  if (dm) why.push(`${label}: "${dm}" is not natural — write the place ("made in the UK", "from Australia") only if the customer said it, or leave it out.`)
  if (h.product) {
    const bad = placeMisuse(text, h.places)
    if (bad.length) why.push(`${label}: ${bad.map((p) => `"${p}"`).join(', ')} is glued onto a sentence where it makes no sense. Use a place only as "made in X" or "from X", or leave it out.`)
  }
  return why
}

// ── conserto em código (depois da 1 correção do modelo) ───────────────────────────────────────────────────────────
const tidy = (s: string) => s.replace(/\s+([,.!?;:])/g, '$1').replace(/([,;:])\s*([.!?])/g, '$2').replace(/\s{2,}/g, ' ').replace(/^[\s,;:]+/, '').trim()
const sentences = (s: string): string[] => (String(s ?? '').match(/[^.!?]+[.!?]*/g) ?? []).map((x) => x.trim()).filter(Boolean)

/** Conserta UM texto: nacionalidade vira país (ou sai), lugar colado sai com a preposição, frase com alegação sem fonte
 *  sai inteira. Devolve o texto consertado ('' = nada sobrou) e o que foi feito. Pura. */
export function repairHonesty(text: string, h: AdsV2HonestySource): { text: string; fixes: string[] } {
  const fixes: string[] = []
  let t = String(text ?? '')
  // 1. "made in British" → "made in the UK"; "from Japanese" → "from Japan"; "today in Australian" → "today".
  for (let guard = 0; guard < 6; guard++) {
    const m = findDemonymMisuse(t)
    if (!m) break
    const lead = m[1]
    const place = ADS_V2_DEMONYMS[m[2].toLowerCase()]
    const replacement = /^in$/i.test(lead) ? '' : `${lead} ${place}`
    t = t.slice(0, m.index) + replacement + t.slice(m.index + m[0].length)
    fixes.push(`demonym:${m[0]}`)
  }
  // 2. lugar colado num anúncio de produto: sai com a preposição ("glow in Toronto today" → "glow today").
  if (h.product) {
    for (const p of placeMisuse(t, h.places)) {
      const withPrep = new RegExp(`\\s*(?<![\\p{L}])(?:in|at|on|around|across|em|no|na|nos|nas|en|el)\\s+(?:the\\s+)?${escapeRe(p)}(?![\\p{L}\\p{N}])`, 'iu')
      if (withPrep.test(t)) {
        t = t.replace(withPrep, '')
        fixes.push(`place:${p}`)
        continue
      }
      // Sem preposição para tirar: a frase que o cita sai inteira.
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(p)}(?![\\p{L}\\p{N}])`, 'iu')
      t = sentences(t).filter((s) => !re.test(s)).join(' ')
      fixes.push(`place_sentence:${p}`)
    }
  }
  // 3. alegação sem fonte: a frase inteira sai.
  const kept = sentences(t).filter((s) => {
    const bad = unsupportedClaims(s, h)
    if (bad.length) fixes.push(`claim:${bad.join('|')}`)
    return bad.length === 0
  })
  t = tidy(kept.join(' '))
  return { text: t, fixes }
}
