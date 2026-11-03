// ═══ KINEO-NUMEROS-FALADOS-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"] ═══
// Pesquisa A1 (docs/revisao-videos/MAPA-DEFEITOS-0311.md, item 5): a TTS erra algarismo, ano e símbolo ("2.600" lido como
// "dois ponto seis zero zero", "$5 million" fora de ordem, ano lido como número de quantidade). A prática recomendada é
// escrever a forma FALADA por extenso só para a voz e manter a legenda no texto de exibição, com mapeamento 1:1.
//
// Este módulo faz as duas pontas, puro (sem rede, sem banco, sem relógio):
//   · falarNumerosParaTts(texto, língua) → o texto que vai à TTS + a lista de trocas (original → falado). Sem número
//     reconhecido, devolve o MESMO texto (pedido à TTS byte a byte igual ao de antes);
//   · restaurarNumerosNaLegenda(palavras, textoExibido, língua) → as palavras do Whisper com cada número falado por extenso
//     colado de volta num token só com a grafia do roteiro ("nineteen" + "eighty-three," → "1983,"), início da 1ª e fim da
//     última. Idempotente: Whisper que já escreveu "1983" fica como está.
//
// Escopo CONSERVADOR (o que ficou de fora fica como sempre foi, em algarismo, para a TTS decidir):
//   · línguas: en, pt, es — as três que o conferidor de fala do hollywood (lib/cinematic/speechContract.ts) entende por extenso;
//     fr/de ficam de fora: a conferência da fala nativa recusaria o filme se o Whisper escrevesse o numeral por extenso;
//   · ano (en: qualquer 1100–2099 solto, "1980s"; pt/es: só com pista de ano antes — "em 1983", "desde 1914", "en 1492",
//     "de 1914." no fim de frase — porque "1500 pessoas" pediria concordância de gênero);
//   · milhar com separador só em inglês ("2,600"): em pt/es "2.600 pessoas" exigiria gênero ("duas mil e seiscentas");
//   · porcentagem inteira, moeda inteira ($, US$, R$, €, £ e "$5 million"/"$2.5 billion" em inglês), ordinal (en 1st–999th;
//     pt/es 1º–10º e 1ª–10ª, o gênero vem escrito);
//   · decimal, hora, intervalo ("1939-1945"), número colado em letra (4K, MP3, COVID-19, Boeing 747) e número pequeno solto:
//     intocados.

export type TrocaDeNumero = { original: string; falado: string; variantes: string[] }

const linguaBase = (l: unknown): string => String(l ?? '').trim().toLowerCase().slice(0, 2)
export const LINGUAS_COM_NUMERO_FALADO = ['en', 'pt', 'es'] as const

// ── inglês ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const EN_UNI = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_DEZ = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
function en100(n: number): string { return n < 20 ? EN_UNI[n] : EN_DEZ[Math.floor(n / 10)] + (n % 10 ? '-' + EN_UNI[n % 10] : '') }
function en1000(n: number): string {
  const c = Math.floor(n / 100), r = n % 100
  return c ? `${EN_UNI[c]} hundred${r ? ' ' + en100(r) : ''}` : en100(r)
}
export function cardinalEn(n: number): string {
  if (n === 0) return 'zero'
  const escalas = ['', ' thousand', ' million', ' billion']
  const partes: string[] = []
  for (let i = 0; n > 0 && i < escalas.length; i++, n = Math.floor(n / 1000)) {
    const bloco = n % 1000
    if (bloco) partes.unshift(en1000(bloco) + escalas[i])
  }
  return partes.join(' ')
}
export function anoEn(a: number): string {
  if (a >= 2000 && a <= 2009) return cardinalEn(a)
  const alto = Math.floor(a / 100), baixo = a % 100
  if (baixo === 0) return `${en100(alto)} hundred`
  if (baixo < 10) return `${en100(alto)} oh ${EN_UNI[baixo]}`
  return `${en100(alto)} ${en100(baixo)}`
}
function plural(palavra: string): string { return /y$/.test(palavra) ? palavra.slice(0, -1) + 'ies' : palavra + 's' }
const EN_ORD: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' }
export function ordinalEn(n: number): string {
  const c = cardinalEn(n)
  return c.replace(/([a-z]+)$/, (ultima) => EN_ORD[ultima] ?? (/y$/.test(ultima) ? ultima.slice(0, -1) + 'ieth' : ultima + 'th'))
}
const sufixoOrdinalEn = (n: number): string => (n % 100 >= 11 && n % 100 <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')

// ── português (masculino: ano, por cento, reais, dólares, euros) ─────────────────────────────────────────────────────
const PT_UNI = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const PT_DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const PT_CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
function pt100(n: number): string { return n < 20 ? PT_UNI[n] : PT_DEZ[Math.floor(n / 10)] + (n % 10 ? ' e ' + PT_UNI[n % 10] : '') }
function pt1000(n: number): string {
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100), r = n % 100
  return [c ? PT_CEN[c] : '', r ? pt100(r) : ''].filter(Boolean).join(' e ') || 'zero'
}
export function cardinalPt(n: number): string {
  if (n < 1000) return pt1000(n)
  const ligar = (alto: string, resto: number) => resto === 0 ? alto : `${alto}${resto < 100 || resto % 100 === 0 ? ' e ' : ' '}${pt1000(resto)}`
  if (n < 1_000_000) {
    const mil = Math.floor(n / 1000)
    return ligar(mil === 1 ? 'mil' : `${pt1000(mil)} mil`, n % 1000)
  }
  if (n < 1_000_000_000) {
    const mi = Math.floor(n / 1_000_000), resto = n % 1_000_000
    const alto = mi === 1 ? 'um milhão' : `${pt1000(mi)} milhões`
    return resto === 0 ? alto : `${alto}${resto < 1000 && (resto < 100 || resto % 100 === 0) ? ' e ' : ' '}${cardinalPt(resto)}`
  }
  return ''
}

// ── espanhol ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const ES_UNI = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
const ES_DEZ = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const ES_CEN = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']
function es100(n: number): string { return n < 30 ? ES_UNI[n] : ES_DEZ[Math.floor(n / 10)] + (n % 10 ? ' y ' + ES_UNI[n % 10] : '') }
function es1000(n: number): string {
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100), r = n % 100
  return [c ? ES_CEN[c] : '', r ? es100(r) : ''].filter(Boolean).join(' ') || 'cero'
}
/** "uno" antes de substantivo masculino / mil / millones vira "un" (veintiuno → veintiún). */
const apocope = (s: string) => s.replace(/veintiuno$/, 'veintiún').replace(/\buno$/, 'un')
export function cardinalEs(n: number): string {
  if (n < 1000) return es1000(n)
  if (n < 1_000_000) {
    const mil = Math.floor(n / 1000), resto = n % 1000
    const alto = mil === 1 ? 'mil' : `${apocope(es1000(mil))} mil`
    return resto ? `${alto} ${es1000(resto)}` : alto
  }
  if (n < 1_000_000_000) {
    const mi = Math.floor(n / 1_000_000), resto = n % 1_000_000
    const alto = mi === 1 ? 'un millón' : `${apocope(es1000(mi))} millones`
    return resto ? `${alto} ${cardinalEs(resto)}` : alto
  }
  return ''
}

const ORD_PT_M = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono', 'décimo']
const ORD_ES_M = ['', 'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo']
const fem = (s: string) => s.replace(/o$/, 'a')

const cardinal = (l: string, n: number): string => l === 'en' ? cardinalEn(n) : l === 'pt' ? cardinalPt(n) : cardinalEs(n)
const MOEDAS: Record<string, Record<string, [string, string]>> = {
  en: { '$': ['dollar', 'dollars'], 'US$': ['dollar', 'dollars'], '€': ['euro', 'euros'], '£': ['pound', 'pounds'] },
  pt: { '$': ['dólar', 'dólares'], 'US$': ['dólar', 'dólares'], 'R$': ['real', 'reais'], '€': ['euro', 'euros'] },
  es: { '$': ['dólar', 'dólares'], 'US$': ['dólar', 'dólares'], '€': ['euro', 'euros'] },
}
const ESCALAS: Record<string, Record<string, string>> = {
  en: { million: 'million', billion: 'billion', trillion: 'trillion' },
  pt: { milhão: 'milhão', milhões: 'milhões', bilhão: 'bilhão', bilhões: 'bilhões', mil: 'mil' },
  es: { millón: 'millón', millones: 'millones', mil: 'mil' },
}
const POR_CENTO: Record<string, string> = { en: 'percent', pt: 'por cento', es: 'por ciento' }
const PONTO: Record<string, string> = { en: 'point', pt: 'vírgula', es: 'coma' }

// Pistas de ano (pt/es): a palavra imediatamente antes do número.
const PISTA_ANO_FORTE: Record<string, RegExp> = {
  pt: /(?:^|[^\p{L}])(?:em|no|ano|anos|desde|até|ate|entre|antes|depois)\s+$/iu,
  es: /(?:^|[^\p{L}])(?:en|año|años|desde|hasta|entre|antes|después|despues)\s+$/iu,
}
const PISTA_ANO_FRACA = /(?:^|[^\p{L}])(?:de|do|da|del)\s+$/iu

const anoValido = (n: number) => n >= 1100 && n <= 2099
const inteiro = (s: string) => Number(s.replace(/[^\d]/g, ''))

/** O texto que vai à TTS (forma falada) e as trocas feitas. Sem troca: o MESMO texto, intocado. */
export function falarNumerosParaTts(texto: string, lingua: unknown): { texto: string; trocas: TrocaDeNumero[] } {
  const l = linguaBase(lingua)
  const fonte = String(texto ?? '')
  if (!(LINGUAS_COM_NUMERO_FALADO as readonly string[]).includes(l) || !/\d/.test(fonte)) return { texto: fonte, trocas: [] }
  const trocas: TrocaDeNumero[] = []
  // Um só passe com alternativas, da esquerda para a direita: cada trecho é decidido uma vez (sem reprocessar o que já virou palavra).
  const moeda = l === 'pt' ? '(?:R\\$|US\\$|\\$|€)' : l === 'es' ? '(?:US\\$|\\$|€)' : '(?:US\\$|\\$|€|£)'
  const escala = l === 'en' ? '(million|billion|trillion)' : l === 'pt' ? '(milhão|milhões|bilhão|bilhões|mil)' : '(millón|millones|mil)'
  const RE = new RegExp(
    // 1 moeda (+ decimal só em inglês antes de escala) (+ escala)
    `(?<![\\p{L}\\p{N}])(${moeda})\\s?(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.(\\d{1,2}))?(?:\\s+${escala}(?![\\p{L}]))?(?![\\p{L}\\p{N}]|[.,]\\d)`
    // 2 porcentagem inteira
    + `|(?<![\\p{L}\\p{N}.,$€£-])(\\d{1,3}(?:,\\d{3})+|\\d{1,4})\\s?%`
    // 3 ordinal inglês / pt-es com º ª
    + `|(?<![\\p{L}\\p{N}.,$€£-])(\\d{1,3})(st|nd|rd|th|º|ª|°)(?![\\p{L}\\p{N}])`
    // 4 década inglesa
    + `|(?<![\\p{L}\\p{N}.,$€£-])(1[1-9]\\d0|20[0-9]0)'?s(?![\\p{L}\\p{N}])`
    // 5 milhar com vírgula (inglês)
    + `|(?<![\\p{L}\\p{N}.,$€£-])(\\d{1,3}(?:,\\d{3})+)(?![\\p{L}\\p{N}%]|[.,]\\d)`
    // 6 ano de 4 algarismos
    + `|(?<![\\p{L}\\p{N}.,$€£/:–-])(1[1-9]\\d\\d|20\\d\\d)(?![\\p{L}\\p{N}%º°ª]|[.,:/]\\d|\\s?[–-]\\s?\\d)`,
    'gu',
  )
  const saida = fonte.replace(RE, (casado: string, ...g: unknown[]) => {
    const offset = g[g.length - 2] as number
    const [mo, moN, moDec, moEsc, pc, ordN, ordSuf, dec, milhar, ano] = g as (string | undefined)[]
    let falado: string | null = null
    const variantes: string[] = []
    if (mo !== undefined && moN !== undefined) {
      const tabela = MOEDAS[l]?.[mo]
      const n = inteiro(moN)
      if (!tabela || !Number.isSafeInteger(n) || n >= 1_000_000_000) return casado
      if (moDec !== undefined && !(l === 'en' && moEsc)) return casado // centavos: intocado
      if (moEsc) {
        const esc = ESCALAS[l][moEsc.toLowerCase()] ?? moEsc
        const numero = moDec !== undefined ? `${cardinal(l, n)} ${PONTO[l]} ${moDec.split('').map((d) => cardinal(l, Number(d))).join(' ')}` : (l === 'es' ? apocope(cardinal(l, n)) : cardinal(l, n))
        const de = l === 'en' || esc === 'mil' ? '' : 'de ' // "cinco mil reais", mas "dois milhões de reais"
        falado = `${numero} ${esc} ${de}${tabela[1]}`
        variantes.push(`${moN}${moDec !== undefined ? '.' + moDec : ''} ${esc} ${de}${tabela[1]}`)
      } else {
        const numero = l === 'es' ? apocope(cardinal(l, n)) : l === 'pt' && n === 1 ? 'um' : cardinal(l, n)
        falado = `${numero} ${n === 1 ? tabela[0] : tabela[1]}`
        variantes.push(`${moN} ${n === 1 ? tabela[0] : tabela[1]}`)
      }
    } else if (pc !== undefined) {
      if (pc.includes(',') && l !== 'en') return casado
      const n = inteiro(pc)
      falado = `${cardinal(l, n)} ${POR_CENTO[l]}`
      variantes.push(`${pc} ${POR_CENTO[l]}`)
      if (l === 'en') variantes.push(`${pc} per cent`, `${cardinal(l, n)} per cent`)
    } else if (ordN !== undefined && ordSuf !== undefined) {
      const n = Number(ordN)
      if (l === 'en') {
        if (!/^(st|nd|rd|th)$/.test(ordSuf) || n < 1 || sufixoOrdinalEn(n) !== ordSuf) return casado
        falado = ordinalEn(n)
      } else {
        if (!/^[º°ª]$/.test(ordSuf) || n < 1 || n > 10) return casado
        const masc = l === 'pt' ? ORD_PT_M[n] : ORD_ES_M[n]
        falado = ordSuf === 'ª' ? fem(masc) : masc
      }
    } else if (dec !== undefined) {
      if (l !== 'en') return casado
      const a = Number(dec)
      const base = anoEn(a)
      falado = base.replace(/([a-z]+)$/, (u) => plural(u))
    } else if (milhar !== undefined) {
      if (l !== 'en') return casado
      const n = inteiro(milhar)
      if (!Number.isSafeInteger(n) || n >= 1_000_000_000_000) return casado
      falado = cardinalEn(n)
      variantes.push(milhar.replace(/,/g, ''))
    } else if (ano !== undefined) {
      const a = Number(ano)
      const antes = fonte.slice(Math.max(0, offset - 30), offset)
      if (!anoValido(a) || /[–-]\s*$/.test(antes)) return casado // o 2º ano de um intervalo ("1939 - 1945") fica como o 1º: intocado
      if (l === 'en') falado = anoEn(a)
      else {
        const depois = fonte.slice(offset + casado.length)
        const forte = PISTA_ANO_FORTE[l].test(antes)
        const fraca = PISTA_ANO_FRACA.test(antes) && /^\s*(?:[.,;:!?)]|$)/.test(depois)
        if (!forte && !fraca) return casado
        falado = cardinal(l, a)
      }
    }
    if (!falado) return casado
    trocas.push({ original: casado, falado, variantes: [casado, ...variantes] })
    return falado
  })
  return trocas.length ? { texto: saida, trocas } : { texto: fonte, trocas: [] }
}

// ── a legenda volta à grafia do roteiro ──────────────────────────────────────────────────────────────────────────────
type PalavraComTempo = { word: string; start: number; end: number; sentenceEnd?: boolean }
const chave = (s: string) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
const PREFIXO = /^[("'“‘¿¡[]+/
const SUFIXO = /[.,;:!?…"'”’)\]]+$/
/** Quantas palavras à frente procurar cada número (sem isso, um número que o Whisper escreveu em algarismo podia casar lá adiante). */
const JANELA_DE_BUSCA = 40

/**
 * As palavras do Whisper com cada número que a TTS falou por extenso colado de volta na grafia do roteiro. Só junta trecho que
 * bate EXATO com a forma falada (ou com uma variante: algarismo + unidade); o tempo é o medido (início da 1ª, fim da última).
 * Sem troca no texto, devolve o MESMO array.
 */
export function restaurarNumerosNaLegenda<T extends PalavraComTempo>(palavras: T[] | undefined, textoExibido: string, lingua: unknown): T[] | undefined {
  if (!Array.isArray(palavras) || palavras.length === 0) return palavras
  const { trocas } = falarNumerosParaTts(textoExibido, lingua)
  if (!trocas.length) return palavras
  const out: T[] = [...palavras]
  let cursor = 0
  for (const troca of trocas) {
    const alvos = [troca.falado, ...troca.variantes].map(chave).filter(Boolean)
    let achou: { i: number; j: number } | null = null
    for (let i = cursor; i < out.length && i < cursor + JANELA_DE_BUSCA && !achou; i++) {
      if (!chave(out[i].word)) continue // nunca começa o trecho num sinal solto
      let acumulado = ''
      for (let j = i; j < out.length && j < i + 12; j++) {
        acumulado += chave(out[j].word)
        if (!acumulado) continue
        if (alvos.includes(acumulado)) { achou = { i, j }; break }
        if (!alvos.some((a) => a.startsWith(acumulado))) break
      }
    }
    if (!achou) continue
    const primeira = out[achou.i], ultima = out[achou.j]
    const prefixo = (primeira.word.trim().match(PREFIXO)?.[0]) ?? ''
    const sufixo = (ultima.word.trim().match(SUFIXO)?.[0]) ?? ''
    const original = troca.original.replace(SUFIXO, '')
    const colada = { ...ultima, word: `${prefixo}${original}${sufixo}`, start: primeira.start, end: ultima.end } as T
    out.splice(achou.i, achou.j - achou.i + 1, colada)
    cursor = achou.i + 1
  }
  return out
}
