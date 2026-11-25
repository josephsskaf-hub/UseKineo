import { comAnosPorExtenso } from './elencoEpoca'
import { secoesDasCenas, secoesPorPalavras, type SecaoDoRoteiro } from '../kling4QuatroPlanos'

export type ModoEpocaVisual = 'off' | 'internal'
export const EPOCA_VISUAL_2411: ModoEpocaVisual = 'internal'

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI']
const WRITTEN_CENTURIES = 'first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth fourteenth fifteenth sixteenth seventeenth eighteenth nineteenth twentieth twenty-first'.split(' ')
const ordinal = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th','st','nd','rd'][n % 10] ?? 'th'))

// A year on a label or in a noun phrase dates the item, not the shot.
// Mask just that date, so a later "in 1920" can still date the museum visit.
function semDatasDeObjeto(texto: string): string {
  const data = /\b(?:\d{1,2}(?:st|nd|rd|th)[ -]century|[a-z]+(?:-[a-z]+)?[ -]century|s[ée]culo\s+(?:[ivx]+|\d{1,2})|(?:1\d|20)\d{2}(?:['’]?s)?)(?![\p{L}\d])/giu
  return texto.replace(data, (valor: string, i: number) => {
    const antes = texto.slice(0, i).split(/[.!?;:\n]/u).pop() ?? ''
    const depois = texto.slice(i + valor.length)
    const de = /\b(?:from|of|de)\s+(?:(?:the|o|el)\s+)?(?:(?:year|a[nñ]o)\s+(?:(?:of|de)\s+)?)?(?:(?:circa|about|early|mid|late)\s+)?$/iu.exec(antes)
    if (de) {
      const origem = antes.slice(0, de.index).trimEnd()
      // Keep a calendar or a scene heading, e.g. "spring of 1888".
      if (origem && !/^\s+to\s+\d{4}\b/iu.test(depois)
        && !/\b(?:year|years|ano|anos|d[ée]cada|s[ée]culo|spring|summer|autumn|fall|winter|january|february|march|april|may|june|july|august|september|october|november|december|period|era|time|setting|cena|[ée]poca)$/iu.test(origem)) return ' '
    }
    // A passive/participial origin or use ("first used", "manufactured back
    // in") is different from staging an action ("boards a jet in 1971").
    const predicado = antes.replace(/\b(?:back\s+)?(?:in|em|en)\s+(?:(?:the\s+)?year\s+)?$/iu, '').trimEnd()
    if (predicado !== antes.trimEnd()) {
      const participio = /\b(?:made|built|taken|written|drawn|worn|used|manufactured|constructed|produced|created|restored|dated|printed|published|recorded|invented|fabricad[oa]|constru[ií]d[oa]|produzid[oa]|criad[oa]|(?:was|were|been|originally|first|last)\s+[\p{L}-]+(?:ed|en))$/iu.test(predicado)
      // "A student inspects [a coin minted in 1888]" has an object with a
      // reduced passive clause. This also covers previously unseen participles.
      const complemento = /\S\s+(?:an?|the|this|that|his|her|their)\s+(?:(?!(?:and|or|then)\b)[\p{L}-]+\s+){1,5}[\p{L}-]+(?:ed|en)$/iu.test(predicado)
      // When the dated noun is the grammatical subject, the main predicate
      // may follow the date instead ("a sculpture carved in 1888 stands…").
      const sujeito = /[\p{L}-]+(?:ed|en)$/iu.test(predicado)
        && (/^\s+(?:is|was|remains|stands|rests|hangs|lies|sits|[\p{L}-]+ed)\b/iu.test(depois)
          || /,\s*[\p{L}-]+(?:ed|en)$/iu.test(predicado) && /^\s*,/u.test(depois))
      if (participio || complemento || sujeito) return ' '
    }
    // An attributive date has a noun after it ("the 1888 camera", "a
    // nineteenth-century telescope"). A costume actually worn on screen can
    // be the author's explicit visual direction ("in a long 1890 coat").
    const periodoDaCena = /\b(?:in|during|throughout|since|around)\s+the\s+$/iu.test(antes) && /(?:s|century)$/iu.test(valor)
    if (!periodoDaCena && /\b(?:the|an?|this|that|these|those|my|his|her|our|their|vintage|antique|original)\s*$/iu.test(antes)
      && /^[ -]+[\p{L}]/u.test(depois) && !/^\s+(?:in|at|when|during|with|on|and|of|as|where|by|was|is|he|she|they)\b/iu.test(depois)) {
      if (!/\b(?:in|wears?|wearing)\s+(?:an?\s+)?(?:long\s+)?$/iu.test(antes)
        || !/^\s+(?:suit|coat|dress|uniform|jacket)\b/iu.test(depois)) return ' '
    }
    return valor
  })
}

/** Only read the author's dates. Measurements, prices, model numbers and pixel dimensions are not time. */
function dataDoTrecho(texto: string): string {
  const t = semDatasDeObjeto(comAnosPorExtenso(texto))
    .replace(/\b\d+\s*(?:[x×]|\bby\b|\bpor\b)\s*\d+\b|[$€£]\s*[\d,.]+|\b\d[\d,.]*\s*(?:px|p\b|fps|hz|km|kg|m|metres?|meters?|metros?|miles?|dollars?|euros?|reais|pesos|people|pessoas|years|anos|units?|copies|unidades|years?\s+old)\b/giu, ' ')
  const seculo = /\b(\d{1,2})(?:st|nd|rd|th)[ -]century\b|\bs[ée]culo\s+([ivx]+|\d{1,2})\b/iu.exec(t)
  const escrito = /\b([a-z]+(?:-[a-z]+)?)[ -]century\b/iu.exec(t)
  const numero = seculo ? seculo[1] ? Number(seculo[1]) : Number(seculo[2]) || ROMAN.indexOf(seculo[2].toUpperCase()) + 1
    : escrito ? WRITTEN_CENTURIES.indexOf(escrito[1].toLowerCase()) + 1 : 0
  const anoAtual = new Date().getUTCFullYear()
  const seculoValido = numero >= 1 && numero < Math.ceil(anoAtual / 100)
  const decada = /\b((?:1\d|20)\d0)(?:['’]?s)\b|\b(?:anos|d[ée]cada de)\s+((?:1\d|20)\d0)\b/iu.exec(t)
  const ano = /(?:^|(?:\b(?:in|by|since|circa|around|from|em|desde|de|ano|year|of|en)\s+)|(?:\b\d{1,2},\s*)|(?:\b(?:the|a|an|long|vintage)\s+))((?:1\d|20)\d{2})(?![\p{L}\d.,]\d|[\p{L}\d]|\s*[x×])/iu.exec(t)
  const antigo = /\b(\d{1,4})\s*(BCE|BC|AD|CE)\b/iu.exec(t)
  if (antigo && (!/^(?:AD|CE)$/iu.test(antigo[2]) || Number(antigo[1]) < anoAtual)) return antigo[1] + ' ' + antigo[2].toUpperCase()
  if (ano) return Number(ano[1]) < anoAtual ? ano[1] : ''
  if (decada) {
    const inicio = decada[1] ?? decada[2]
    return Number(inicio) + 9 < anoAtual ? inicio + 's' : ''
  }
  const curta = /\b(?:the\s+['’]?(\d0)s|(?:anos|d[ée]cada (?:de|dos))\s+['’]?(\d0))\b/iu.exec(t)
  if (curta) return String(1900 + Number(curta[1] ?? curta[2])) + 's'
  return seculoValido ? ordinal(numero) + ' century' : ''
}

interface Entrada {
  internal: boolean
  pedido: string
  secoes: readonly SecaoDoRoteiro[]
  falas: readonly string[]
  modo?: ModoEpocaVisual
}

export function prepararEpocaVisual({ internal, pedido, secoes, falas, modo = EPOCA_VISUAL_2411 }: Entrada) {
  if (!internal || modo !== 'internal') return null
  const agora = (t: string) => /\b(?:present[- ]day|modern[- ]day|nowadays|hoje em dia|nos dias (?:de hoje|atuais)|modern museum|contemporary museum|museum today|museu (?:atual|moderno)|museu de hoje)\b|(?:^|[.!?]\s+)(?:today|hoje|agora)\b/iu.test(t.trim())
  const geral = dataDoTrecho(pedido)
  if (!geral) return null
  // A merged scene starts with its first section. When the dispatch splits it again,
  // each shot recovers its own date, including changes of year within a film.
  // A present-day museum can display an antique camera. Conversely, a narrator
  // speaking today can ask us to show the inventor's workshop in 1888.
  const datas = secoes.map(s => {
    if (agora(s.pexelsQuery)) return 'present day'
    const visual = dataDoTrecho(s.pexelsQuery)
    const voz = dataDoTrecho(s.voiceover)
    // An exact staging year overrides commentary about a different event.
    // A dated costume, however, can agree with a more precise spoken year
    // (an 1880s suit in the 1888 garden).
    if (visual) {
      if (/^\d{3}0s$/.test(visual) && /^\d{4}$/.test(voz) && visual.slice(0, 3) === voz.slice(0, 3)) return voz
      return visual
    }
    return agora(s.voiceover) ? 'present day' : voz
  })
  // A modern museum can name the age of its exhibit in the same paragraph.
  // Only an explicitly staged historical section may override that setting.
  if (agora(pedido) && !datas.some(d => d && d !== 'present day')) return null
  const primeiro = datas.findIndex(Boolean)
  const antes = primeiro > 0 && datas[primeiro] === geral && /\b(?:again|once more|later|de novo|novamente|mais tarde)\b/iu.test(secoes[primeiro].voiceover)
  let epoca = datas[0] || (antes ? 'before ' + geral : geral)
  const ficha = epoca
  const sequencia = datas.map(data => { if (data) epoca = data; return epoca })
  const grupos = secoesDasCenas(secoes, falas) ?? secoesPorPalavras(secoes, falas)
  let anterior = ficha
  const cenas = falas.map((fala, i) => {
    const grupo = grupos?.[i]
    const dita = dataDoTrecho(fala)
    if (grupo?.length) anterior = sequencia[grupo[0]]
    else if (agora(fala) && (datas.includes('present day') || agora(pedido))) anterior = 'present day'
    else if (dita && (datas.includes(dita) || pedido.includes(dita))) anterior = dita
    return anterior
  })
  return { ficha, cenas, secoes: sequencia, primeirasSecoes: grupos?.map(g => g[0]) }
}

const MARCA = /Period setting: [^.]+\.\s*/giu
const FIGURINO_ANTIGO = /People in the shot wear period-accurate [^.]+ with period props\.\s*|Street vehicles in the shot are [^.]+\.\s*/giu
const FIXADOR_ANTIGO = /,?\s*period piece set strictly in [^:.]+:\s*(?:every person, building, street, vehicle and object belongs to that exact time[^.]*?as it really looked then|only the things this shot describes, each exactly as it looked at that time)/giu

/** A sheet stays in its neutral studio. Scenes date only things that are already in frame. */
export function aplicarEpocaVisual(prompt: string, epoca: string | undefined, folha = false, pista?: string, teto?: number): string {
  if (!epoca || !prompt.trim()) return prompt
  const ano = /^\d{4}$/.test(epoca) ? Number(epoca) : 0
  const terno = /\b(?:suit|tie|lapels?|terno|gravata)\b/iu.test(prompt)
  const tecido = terno && ano >= 1970 && ano < 1980 ? 'period lapel width, wool tailoring and shirt collar' : 'period cut, seams and fabric'
  const design = folha ? tecido
    : /\b(?:empty|uninhabited|no people|no human figures)\b/iu.test(prompt)
      ? 'authentic period materials for the described setting'
      : [
          /\b(?:suit|dress|wearing|coat|clothes|outfit|uniform|tie)\b/iu.test(prompt) ? tecido : '',
          /\b(?:plane|airplane|aeroplane|airliner|jet|cabin|aircraft)\b/iu.test(prompt) ? 'period airframe and cabin fittings' : '',
          /\b(?:train|railway|carriage|platform|station)\b/iu.test(prompt) ? 'period railway fittings' : '',
          /\b(?:ship|sailboat|sailing|sailor|boat|harbo[u]?r)\b/iu.test(prompt) ? 'period maritime construction' : '',
          /\b(?:street|building|house|room|window|city)\b/iu.test(prompt) ? 'period architecture and street details' : '',
        ].filter(Boolean).slice(0, 2).join(', ') || 'period materials and finishes on the objects shown'
  const semMarca = prompt.replace(MARCA, '').trim()
  const corpo = semMarca.replace(FIGURINO_ANTIGO, '').replace(FIXADOR_ANTIGO, '').trim()
  const escala = /^(?:(?:wide|medium|long|aerial|full|establishing) shot|close[- ]up)\.\s+/iu.exec(corpo)?.[0] ?? ''
  const resto = corpo.slice(escala.length)
  let periodo = 'Period setting: ' + epoca + ', ' + design + '.'
  if (teto !== undefined) {
    const livre = teto - Array.from(corpo).length - 1
    if (Array.from(periodo).length > livre) periodo = 'Period setting: ' + epoca + '.'
    if (Array.from(periodo).length > livre) return semMarca
  }
  // Move an existing, already moderated action ahead of scenery. Never copy a raw
  // stock query into the dispatch or detach a word from its sentence (including negations).
  if (pista && corpo.length + periodo.length > 280) {
    const termos = new Set(pista.toLowerCase().match(/[\p{L}]{4,}/gu) ?? [])
    const frases = resto.split(/(?<=[.!?])\s+/u)
    let acao = -1
    let maior = 1
    for (let i = 0; i < frases.length; i++) {
      const palavras = new Set(frases[i].toLowerCase().match(/[\p{L}]{4,}/gu) ?? [])
      const comuns = [...termos].filter(p => palavras.has(p)).length
      if (comuns > maior) { acao = i; maior = comuns }
    }
    if (acao >= 0) {
      const frase = frases.splice(acao, 1)[0].trim()
      const movido = (escala + periodo + ' ' + frase + (/[.!?]$/u.test(frase) ? ' ' : '. ') + frases.join(' ').trim()).trimEnd()
      if (teto === undefined || Array.from(movido).length <= teto) return movido
    }
  }
  return escala + periodo + ' ' + resto
}
