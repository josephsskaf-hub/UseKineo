import { comAnosPorExtenso } from './elencoEpoca'
import { secoesDasCenas, secoesPorPalavras, type SecaoDoRoteiro } from '../kling4QuatroPlanos'

export type ModoEpocaVisual = 'off' | 'internal'
export const EPOCA_VISUAL_2411: ModoEpocaVisual = 'internal'

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI']
const ordinal = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th','st','nd','rd'][n % 10] ?? 'th'))

/** Only read the author's dates. Measurements, prices, model numbers and pixel dimensions are not time. */
function dataDoTrecho(texto: string): string {
  const t = comAnosPorExtenso(texto)
    .replace(/\b\d+\s*(?:[x×]|\bby\b|\bpor\b)\s*\d+\b|[$€£]\s*[\d,.]+|\b\d[\d,.]*\s*(?:px|p\b|fps|hz|km|kg|m|metres?|meters?|metros?|miles?|dollars?|euros?|reais|pesos|people|pessoas|years|anos|units?|copies|unidades|years?\s+old)\b/giu, ' ')
  const seculo = /\b(\d{1,2})(?:st|nd|rd|th)[ -]century\b|\bs[ée]culo\s+([ivx]+|\d{1,2})\b/iu.exec(t)
  const numero = seculo ? Number(seculo[1] ?? seculo[2]) || ROMAN.indexOf(seculo[2].toUpperCase()) + 1 : 0
  const seculoValido = numero >= 1 && numero <= 21
  const decada = /\b((?:1\d|20)\d0)(?:['’]?s)\b|\b(?:anos|d[ée]cada de)\s+((?:1\d|20)\d0)\b/iu.exec(t)
  const ano = /(?:^|(?:\b(?:in|by|since|circa|around|from|em|desde|de|ano|year|of|en)\s+)|(?:\b\d{1,2},\s*)|(?:\b(?:the|a|an|long|vintage)\s+))((?:1\d|20)\d{2})(?![\p{L}\d.,]\d|[\p{L}\d]|\s*[x×])/iu.exec(t)
  const antigo = /\b(\d{1,4})\s*(BCE|BC|AD|CE)\b/iu.exec(t)
  if (antigo) return antigo[1] + ' ' + antigo[2].toUpperCase()
  if (ano) return ano[1]
  if (decada) return (decada[1] ?? decada[2]) + 's'
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
  const geral = dataDoTrecho(pedido)
  if (!geral) return null
  // A merged scene starts with its first section. When the dispatch splits it again,
  // each shot recovers its own date, including changes of year within a film.
  const datas = secoes.map(s => dataDoTrecho(s.voiceover) || dataDoTrecho(s.pexelsQuery))
  const primeiro = datas.findIndex(Boolean)
  const antes = primeiro > 0 && datas[primeiro] === geral && /\b(?:again|once more|later|de novo|novamente|mais tarde)\b/iu.test(secoes[primeiro].voiceover)
  let epoca = antes ? 'before ' + geral : geral
  const ficha = epoca
  const sequencia = datas.map(data => { if (data) epoca = data; return epoca })
  const grupos = secoesDasCenas(secoes, falas) ?? secoesPorPalavras(secoes, falas)
  let anterior = ficha
  const cenas = falas.map((fala, i) => {
    const grupo = grupos?.[i]
    const dita = dataDoTrecho(fala)
    if (grupo?.length) anterior = sequencia[grupo[0]]
    else if (dita && (datas.includes(dita) || pedido.includes(dita))) anterior = dita
    return anterior
  })
  return { ficha, cenas, secoes: sequencia }
}

const MARCA = /Period setting: [^.]+\.\s*/giu
const FIGURINO_ANTIGO = /People in the shot wear period-accurate [^.]+ with period props\.\s*|Street vehicles in the shot are [^.]+\.\s*/giu
const FIXADOR_ANTIGO = /,?\s*period piece set strictly in [^:.]+:\s*(?:every person, building, street, vehicle and object belongs to that exact time[^.]*?as it really looked then|only the things this shot describes, each exactly as it looked at that time)/giu

/** A sheet stays in its neutral studio. Scenes date only things that are already in frame. */
export function aplicarEpocaVisual(prompt: string, epoca: string | undefined, folha = false): string {
  if (!epoca) return prompt
  const ano = /^\d{4}$/.test(epoca) ? Number(epoca) : 0
  const terno = /\b(?:suit|tie|lapels?|terno|gravata)\b/iu.test(prompt)
  const tecido = terno && ano >= 1970 && ano < 1980 ? 'period lapel width, wool tailoring and shirt collar' : 'period cut, seams and fabric'
  const design = folha ? tecido
    : /\b(?:empty|uninhabited|no people|no human figures)\b/iu.test(prompt)
      ? 'authentic period materials for the described setting'
      : [
          /\b(?:suit|dress|wearing|coat|clothes|outfit|uniform|tie)\b/iu.test(prompt) ? tecido : '',
          /\b(?:plane|airliner|passenger jet|cabin|aircraft)\b/iu.test(prompt) ? 'period airframe and cabin fittings' : '',
          /\b(?:train|railway|carriage|platform|station)\b/iu.test(prompt) ? 'period railway fittings' : '',
          /\b(?:ship|sailboat|sailing|sailor|boat|harbo[u]?r)\b/iu.test(prompt) ? 'period maritime construction' : '',
          /\b(?:street|building|house|room|window|city)\b/iu.test(prompt) ? 'period architecture and street details' : '',
        ].filter(Boolean).slice(0, 2).join(', ') || 'period materials and finishes on the objects shown'
  const corpo = prompt.replace(MARCA, '').replace(FIGURINO_ANTIGO, '').replace(FIXADOR_ANTIGO, '').trim()
  return 'Period setting: ' + epoca + ', ' + design + '. ' + corpo
}
