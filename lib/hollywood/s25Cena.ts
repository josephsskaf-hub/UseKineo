// ═══ KINEO-S25-NOTA95-2026-10-06 — o filme narrado do Seedance 2.5 sem repetição e sem anacronismo ═══
// Fundador (06/10, "vai nota 95"): 3 filmes S25 de 35 s avaliados por folha de contato — Tambora 1816 = 80 (homem de gorro
// e jeans moderno na neve de 1816), Boston 1919 = 78 (arranha-céus de vidro em 1919), Londres 1952 = 72 (4 de 8 quadros com
// a MESMA rua de postes nas cenas finais). O que os prompts reais mostraram (cinematic_submission_claim das gerações
// 713564f2 / 3a0082b2 / 387d3344):
//   1. as 19 cenas abriam com o MESMO prefixo de 35 palavras ("Nobody addresses the camera and nobody poses for it: …"); no
//      t2v a 2ª frase também era igual ("Vertical 9:16 composition…"); 7 das 19 seguiam com a frase CRUA da narração
//      ("Shows exactly this moment, as the narration describes it: …"). Os primeiros ~50 tokens eram iguais em quase toda cena.
//   2. frase abstrata (estimativa, lei, "anos depois", legado) virou a cena-padrão: em Londres as cenas 5 ("Officials later
//      estimated…") e 6 ("Four years later, Britain passed the Clean Air Act…") repetiram a environmentSheet ("A foggy London
//      street in December 1952, with dim gas lamps…") — e por isso ANIMARAM A MESMA FOTO da cena 1 (âncora de ambiente:
//      scene_anchor_urls das cenas 1, 5 e 6 = …/bgxeYjpCGkwbKI67lGD_E.jpg).
//   3. a época não chegava ao still: o still FLUX que vira o 1º quadro do i2v recebia o prompt SEM o eraSuffix (que só
//      entrava no texto do vídeo, depois de 1.000+ caracteres); Londres 1952 nem tinha trava (ERA_YEAR_RE vai só até 1939);
//      e o sufixo de época lista substantivos ("no tanks, no cars…") num motor SEM negative_prompt — Boston, a história de
//      um TANQUE de melaço, recebia "no tanks".
//   4. o supervisor fala×imagem acrescenta "no other characters, no animals, no people, no added props" e o detector de
//      pessoa do S25 lê "people": a cena dos rebites (Boston 2), sem ninguém, foi para t2v sem still.
// Este módulo é PURO (sem import): o guardião scripts/test-s25-nota95-2026-10-06.mjs o executa em sandbox. Só a família
// s25 o chama (rota generate-video-cinematic). H3/Omni/Kling 3 ficam byte a byte como estavam.

export const S25_CENA_VERSAO = 's25_nota95_v2_apresentador' // KINEO-S25-APRESENTADOR-2026-10-06 (era 's25_nota95_v1': o evento separa o antes do depois)
export const S25_CENA_EVENTO = 's25_cena_plano'

/** O aviso de câmera do S25: curto, concreto, SEM substantivo de pessoa ("every visible person" desenhava a pessoa —
 *  KINEO-PREFIXO-SEM-PESSOA-2026-09-22), e no FIM. O sufixo de boca fechada da rota (mouthSuffix) vem logo depois. */
export const AVISO_CAMERA_S25 = ' Nobody looks at or poses for the camera.'
/** Ordem de eixo SEM citar proporção (vale para 9:16 e 16:9; o t2v do S25 já leva aspect_ratio explícito no payload). */
export const EIXO_S25 = 'Camera upright, level horizon.'
/** NO_TEXT_SUFFIX de lib/hollywood/router.ts — o guardião confere a cópia. Sem negative_prompt, "phone" vira conteúdo. */
export const SEM_TEXTO_ROTEADOR = ' No readable text anywhere in the scene: no phone or computer screens, no signs, no billboards, no labels, no subtitles, no watermarks. If a phone appears, its screen is off or blurred.'
/** A troca que a rota já faz nas famílias sem negative_prompt (KINEO-H3-SEM-CELULAR-2026-09-22) — aqui ANTES do still. */
export const SEM_TEXTO_S25 = ' No readable text or lettering anywhere in the frame; period-accurate clothing and objects only.'
/** "no other characters, no animals, no people, no added props" (supervisor fala×imagem) sem os substantivos. */
export const SEM_EXTRAS_S25 = ' Nothing added beyond what is described.'
const SEM_EXTRAS_RE = /[\s,]*no other characters, no animals, no people, no added props\.?/gi

export type TipoAbstrato = 'estatistica' | 'lei' | 'anos_depois' | 'legado'
export type PlanoTipo = 'aereo' | 'close' | 'interior' | 'aberto' | 'medio' | 'chao' | 'alto' | 'detalhe' | 'indefinido'
export type IdiomaS25 = 'en' | 'pt' | 'es' | string

const limpa = (t: string) => (t ?? '').replace(/\s+/g, ' ').trim()

// ── 1. ÉPOCA E LUGAR — só das palavras da HISTÓRIA (pedido + fala), nunca da camada visual do GPT (KINEO-VIGIA-ERA) ──
const MESES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'janeiro', 'fevereiro', 'março', 'marco', 'maio', 'junho', 'julho', 'setembro', 'outubro', 'novembro', 'dezembro',
  'enero', 'febrero', 'marzo', 'mayo', 'junio', 'julio', 'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre']
const MES_INDICE: Record<string, number> = {}
MESES.forEach((m, i) => { MES_INDICE[m] = i < 12 ? i : -1 })
Object.assign(MES_INDICE, { janeiro: 0, fevereiro: 1, 'março': 2, marco: 2, maio: 4, junho: 5, julho: 6, setembro: 8, outubro: 9, novembro: 10, dezembro: 11, enero: 0, febrero: 1, marzo: 2, mayo: 4, junio: 5, julio: 6, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 })
const NAO_LUGAR = new Set([...MESES, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'christmas', 'easter',
  'god', 'heaven', 'hell', 'the', 'this', 'that', 'these', 'those', 'a', 'an', 'one', 'his', 'her', 'their', 'its', 'our', 'my', 'world', 'war',
  'king', 'queen', 'president', 'emperor', 'pope', 'sir', 'lord', 'lady', 'general', 'captain', 'admiral', 'dr', 'mr', 'mrs', 'ms', 'prince', 'princess',
  'act', 'law', 'bill', 'treaty', 'january', 'ii', 'i'])
// Unidade logo depois do número = não é ano ("1000 years", "1500 meters").
const UNIDADE_RE = /^\s*(?:%|meters?|metres?|feet|foot|ft|km|kilometers?|kilometres?|miles?|mph|knots|tons?|tonnes?|people|persons|men|women|soldiers|ships|boats|houses|homes|dollars|pounds|euros|reais|yen|gallons|liters?|litres?|degrees|years?|victims|deaths|lives|cubic|square|acres|hectares|pessoas|metros|quil[oô]metros|anos|personas|a[ñn]os|kil[oó]metros)(?![A-Za-z])/i
// Rótulo antes do número = não é ano ("Room 1408", "Flight 1549", "$1500").
const ROTULO_ANTES_RE = /(?:[$€£¥]|\b(?:room|number|no\.|flight|route|highway|apartment|suite|page|chapter|episode|code|model|unit|bus|train|line|platform|gate|seat|ticket|quarto|sala|voo|n[uú]mero|habitaci[óo]n|vuelo)\s*#?\s*)$/i
const ANO_RE = /(^|[^\d.,])(1\d{3}|20\d{2})(s)?(?!\d)/g
const AD_BC_RE = /\b(\d{1,4})\s*(A\.?D\.?|C\.?E\.?|B\.?C\.?E?\.?)(?![A-Za-z])|\b(?:AD|A\.D\.)\s*(\d{1,4})\b/
const SECULO_RE = /\b(\d{1,2})(?:st|nd|rd|th)[- ]century\b|\bs[ée]culo\s+([IVXL]+|\d{1,2})\b|\bsiglo\s+([IVXL]+|\d{1,2})\b/i
const ERAS: Array<[RegExp, string]> = [
  [/\bworld war (?:ii|2|two)\b|\bsegunda guerra mundial\b/i, 'World War II'],
  [/\bworld war (?:i|1|one)\b|\bprimeira guerra mundial\b|\bprimera guerra mundial\b/i, 'World War I'],
  [/\bmedieval\b|\bmiddle ages\b|\bidade m[ée]dia\b|\bedad media\b/i, 'the Middle Ages'],
  [/\brenaissance\b|\brenascen[çc]a\b|\brenacimiento\b/i, 'the Renaissance'],
  [/\bvictorian\b|\bvitorian[ao]\b|\bvictorian[ao]\b/i, 'the Victorian era'],
  [/\bancient rome\b|\broman empire\b|\bimp[ée]rio romano\b|\bimperio romano\b/i, 'ancient Rome'],
  [/\bancient egypt\b|\bpharaoh/i, 'ancient Egypt'],
  [/\bancient greece\b/i, 'ancient Greece'],
  [/\bvikings?\b/i, 'the Viking age'],
  [/\bstone age\b|\bprehistoric\b|\bidade da pedra\b/i, 'prehistoric times'],
  [/\bice age\b|\bera do gelo\b/i, 'the Ice Age'],
  [/\bnapoleonic\b/i, 'the Napoleonic era'],
  [/\bcivil war\b/i, 'the Civil War era'],
  [/\brevolutionary war\b/i, 'the Revolutionary War era'],
  [/\bcolonial (?:era|times)\b/i, 'the colonial era'],
  [/\bwild west\b|\bvelho oeste\b|\blejano oeste\b/i, 'the Wild West'],
]
const ROMANO: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 }
const deRomano = (r: string) => { let n = 0; for (let i = 0; i < r.length; i++) { const v = ROMANO[r[i]] ?? 0; const p = ROMANO[r[i + 1]] ?? 0; n += v < p ? -v : v } return n }
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`

type AnoAchado = { ano: number; decada: boolean }
/** Anos (1000-2099) na ordem do texto; "1950s" = década; número seguido de unidade não é ano. */
export function anosDoTexto(texto: string): AnoAchado[] {
  const t = texto ?? ''
  const out: AnoAchado[] = []
  ANO_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = ANO_RE.exec(t)) !== null) {
    const fim = m.index + m[0].length
    const inicio = m.index + m[1].length
    if (UNIDADE_RE.test(t.slice(fim)) || ROTULO_ANTES_RE.test(t.slice(Math.max(0, inicio - 14), inicio))) continue
    out.push({ ano: Number(m[2]), decada: m[3] === 's' })
  }
  return out
}

const NUM_PALAVRA: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, um: 1, uma: 1, dois: 2, duas: 2, 'três': 3, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, un: 1, dos: 2, cuatro: 4,
  siete: 7, ocho: 8, nueve: 9, diez: 10, veinte: 20, cuarenta: 40, cincuenta: 50,
  // quantidade vaga: "a few years later" ≈ 3, "many years later" ≈ 20
  few: 3, several: 5, some: 5, many: 20, poucos: 3, alguns: 5, 'vários': 5, varios: 5, muitos: 20, muchos: 20,
}
const numero = (w: string): number | null => /^\d{1,3}$/.test(w) ? Number(w) : (NUM_PALAVRA[w.toLowerCase()] ?? null)
type Salto = { anos: number } | { decadas: true } | null
/** Salto de tempo DITO na fala: "the next year" (+1), "four years later" (+4), "for decades" (as décadas seguintes). */
export function saltoDeTempo(fala: string): Salto {
  const t = fala ?? ''
  if (/\b(?:the\s+)?(?:next|following)\s+year\b|\ba\s+year\s+later\b|\bno ano seguinte\b|\bum ano depois\b|\bal a[ñn]o siguiente\b|\bun a[ñn]o despu[ée]s\b/i.test(t)) return { anos: 1 }
  let m = /\b(\d{1,3}|[a-zçãéêíóú]+)\s+(?:years?\s+later|anos\s+depois|a[ñn]os\s+despu[ée]s)\b/i.exec(t)
  if (m) { const n = numero(m[1]); return n !== null ? { anos: n } : { decadas: true } }
  m = /\b(\d{1,2}|[a-z]+)\s+decades?\s+later\b/i.exec(t)
  if (m) { const n = numero(m[1]); if (n !== null) return { anos: 10 * n } }
  if (/\ba\s+century\s+later\b|\bum s[ée]culo depois\b|\bun siglo despu[ée]s\b/i.test(t)) return { anos: 100 }
  if (/\bdecades\s+(?:later|after)\b|\bfor\s+(?:decades|generations|centuries)\b|\bgenerations\s+later\b|\bpor\s+d[ée]cadas\b|\bd[ée]cadas\s+(?:depois|despu[ée]s)\b|\bdurante\s+d[ée]cadas\b/i.test(t)) return { decadas: true }
  return null
}

const PREPOSICOES: Record<string, string> = {
  en: '[Ii]n|[Oo]ver|[Aa]cross|[Aa]t|[Nn]ear|[Oo]ff|[Oo]utside|[Ff]rom|[Tt]hrough|[Aa]round|[Ii]nto|[Tt]oward|[Tt]owards',
  pt: '[Ee]m|[Nn]o|[Nn]a|[Nn]os|[Nn]as|[Ss]obre|[Pp]elo|[Pp]ela|[Ii]n|[Oo]ver|[Aa]t|[Tt]hrough',
  es: '[Ee]n|[Ss]obre|[Pp]or|[Ii]n|[Oo]ver|[Aa]t|[Tt]hrough',
}
const PALAVRA_LUGAR = "[A-ZÀ-Ý][a-zà-ÿ'’-]+"
const MARCO_RE = new RegExp(`\\b((?:Mount|Mt\\.|Lake|Cape|Fort|Port|Monte|Lago|Cabo|Ilha|Isla)\\s+${PALAVRA_LUGAR}(?:\\s+${PALAVRA_LUGAR})?)`, 'g')
const lugarValido = (c: string) => {
  const ws = c.split(/\s+/)
  return ws.length > 0 && !NAO_LUGAR.has(ws[0].toLowerCase().replace(/[.'’]/g, '')) && !ws.every((w) => NAO_LUGAR.has(w.toLowerCase()))
}
/** Lugares nomeados no texto, na ordem ("Mount Tambora in Indonesia" → "Mount Tambora, Indonesia"). */
export function lugaresDoTexto(texto: string, idioma: IdiomaS25 = 'en'): string[] {
  const t = texto ?? ''
  const prep = PREPOSICOES[idioma] ?? PREPOSICOES.en
  const re = new RegExp(`(?:^|[^A-Za-zÀ-ÿ])(?:${prep})\\s+(?:the\\s+|o\\s+|a\\s+|os\\s+|as\\s+|el\\s+|la\\s+)?(${PALAVRA_LUGAR}(?:\\s+(?:of\\s+|de\\s+|do\\s+|da\\s+)?${PALAVRA_LUGAR}){0,3})`, 'g')
  const achados: Array<{ i: number; nome: string }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(t)) !== null) {
    const nome = m[1].replace(/['’]s$/, '').trim()
    // nome seguido de "'s" + substantivo comum é posse ("Napoleon's army") → não é lugar
    const depois = t.slice(m.index + m[0].length)
    if (/^['’]s\b/.test(depois) && !/^['’]s\s+(?:north|south|east|west|old|new|harbor|harbour|port|bay|streets?|downtown)\b/i.test(depois)) continue
    if (lugarValido(nome)) achados.push({ i: m.index + m[0].length - m[1].length, nome })
  }
  MARCO_RE.lastIndex = 0
  while ((m = MARCO_RE.exec(t)) !== null) if (lugarValido(m[1])) achados.push({ i: m.index, nome: m[1] })
  achados.sort((a, b) => a.i - b.i)
  const out: string[] = []
  for (let k = 0; k < achados.length; k++) {
    const a = achados[k]
    // "X in Y" logo em seguida → "X, Y" (o segundo não entra sozinho)
    const resto = t.slice(a.i + a.nome.length)
    const em = new RegExp(`^\\s+(?:in|em|en)\\s+(?:the\\s+)?(${PALAVRA_LUGAR}(?:\\s+${PALAVRA_LUGAR}){0,2})`).exec(resto)
    let nome = a.nome
    if (em && lugarValido(em[1])) {
      nome = `${a.nome}, ${em[1]}`
      const pular = a.i + a.nome.length + em[0].length
      while (k + 1 < achados.length && achados[k + 1].i < pular) k++
    }
    if (achados[k + 1] && achados[k + 1].i === a.i) k++
    if (!out.some((o) => o === nome || o.startsWith(`${nome},`))) out.push(nome)
  }
  return out
}

export type EpocaBase = { ano: number | null; decada: boolean; sufixo: '' | ' AD' | ' BC'; era: string | null; mes: number | null }
/** A época do FILME: o 1º ano dito no pedido/fala; sem ano, século ou era nomeada; nada = filme sem trava de época. */
export function epocaDoRoteiro(roteiro: string): EpocaBase {
  const t = roteiro ?? ''
  const mesM = new RegExp(`\\b(${MESES.join('|')})\\b`, 'i').exec(t)
  const mes = mesM ? (MES_INDICE[mesM[1].toLowerCase()] ?? null) : null
  const ab = AD_BC_RE.exec(t)
  const anos = anosDoTexto(t)
  if (ab && (!anos.length || t.indexOf(ab[0]) < t.indexOf(String(anos[0].ano)))) {
    const n = Number(ab[1] ?? ab[3])
    const bc = /B/i.test(ab[2] ?? '')
    return { ano: n, decada: false, sufixo: bc ? ' BC' : ' AD', era: null, mes }
  }
  if (anos.length) return { ano: anos[0].ano, decada: anos[0].decada, sufixo: '', era: null, mes }
  const sec = SECULO_RE.exec(t)
  if (sec) {
    const n = sec[1] ? Number(sec[1]) : /^\d+$/.test(sec[2] ?? sec[3] ?? '') ? Number(sec[2] ?? sec[3]) : deRomano((sec[2] ?? sec[3] ?? '').toUpperCase())
    if (n > 0 && n < 22) return { ano: null, decada: false, sufixo: '', era: `the ${ordinal(n)} century`, mes }
  }
  for (const [re, nome] of ERAS) if (re.test(t)) return { ano: null, decada: false, sufixo: '', era: nome, mes }
  return { ano: null, decada: false, sufixo: '', era: null, mes }
}

export type EpocaCena = { ano: number | null; decada: boolean; sufixo: '' | ' AD' | ' BC'; depoisDe: number | null; era: string | null; lugar: string | null; frase: string }
/** A frase de época que entra em TODA cena (inclusive sem pessoa) e no still: curta, positiva, sem lista de objetos. */
export function fraseDeEpoca(e: Omit<EpocaCena, 'frase'>): string {
  let quando = ''
  if (e.depoisDe !== null) quando = `the decades after ${e.depoisDe}`
  else if (e.ano !== null) quando = e.decada ? `the ${e.ano}s` : `${e.ano}${e.sufixo}`
  else if (e.era) quando = e.era
  if (!quando) return ''
  const onde = e.lugar ? `${e.lugar}, ` : ''
  const recente = e.ano !== null && e.sufixo === '' && !e.decada && e.depoisDe === null && e.ano >= 1980
  const frase = recente
    ? `${onde}${quando}: clothing, vehicles, tools and buildings exactly as they were in ${quando}.`
    : `${onde}${quando}: period clothing, vehicles, tools and buildings only, no modern items.`
  return frase.charAt(0).toUpperCase() + frase.slice(1)
}

// ── 2. FRASE ABSTRATA — estimativa, lei, "anos depois", legado (com veto: evento físico ou pessoa agindo = cena concreta) ──
const EVENTO_FISICO_RE = /\b(?:erupt\w*|explod\w*|explosion|blast\w*|flood\w*|collaps\w*|burn\w*|fire|fires|flames?|waves?|storm\w*|crash\w*|sank|sink\w*|sunk|burst\w*|quake\w*|earthquake|avalanche|landslide|tsunami|hurricane|tornado|struck|exploded|bombed|attack\w*|battle\w*|brok\w*|break\w*|shatter\w*|crumbl\w*|toppl\w*|swept|sweep\w*|buri\w*|bury\w*|drown\w*|erup[çc][ãa]o|explodiu|inunda\w*|desabou|incêndio|onda|tempestade)\b/i
// Estimativa sobre uma COISA física ("Scientists estimate the lake holds 50 billion tons of water") é cena concreta: o lago.
const SUJEITO_FISICO_RE = /\b(?:lakes?|seas?|oceans?|rivers?|mountains?|volcano(?:es)?|islands?|glaciers?|craters?|reefs?|caves?|deserts?|forests?|ships?|boats?|bridges?|towers?|dams?|walls?|tanks?|ice|lava|ash|clouds?|trees?|rocks?|bays?|coasts?|canyons?|lago|mar|oceano|rio|montanha|vulc[ãa]o|ilha|navio|ponte|torre|barragem|r[íi]o|monta[ñn]a|volc[áa]n|isla|barco|puente)\b/i
const PESSOA_AGE_RE = /\b(?:he|she|they|his|her|their|him|ele|ela|eles|elas|él|ella|ellos)\b/i
const ESTATISTICA_RE = /\b(?:estim\w*|statistic\w*|census|death toll|toll|percent|per cent|tally|counted|calculated|official figures|estatística|censo|por cento|estad[íi]stica)\b|%/i
const LEI_VERBO = '(?:passed|signed|enacted|ratified|approved|outlawed|banned|introduced|aprovou|aprovaram|aprovada|assinou|assinado|sancionou|aprob[óo]|aprobaron|aprobada|firm[óo]|firmado)'
const LEI_NOME = '(?:act|law|laws|bill|treaty|ban|regulation|decree|amendment|constitution|lei|leis|tratado|decreto|ley|leyes)'
const LEI_RE = new RegExp(`\\b${LEI_VERBO}\\b[^.;]*\\b${LEI_NOME}\\b|\\b${LEI_NOME}\\b[^.;]*\\b${LEI_VERBO}\\b|\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,3}\\s+Act\\b`)
const ANOS_DEPOIS_RE = /\b(?:\d{1,3}|[a-z]+)\s+(?:years?|decades?)\s+later\b|\byears later\b|\bdecades\s+(?:later|after)\b|\bfor\s+(?:decades|generations|centuries)\b|\bgenerations\s+later\b|\ba\s+century\s+later\b|\bto this day\b|\bever since\b|\b(?:\w+\s+)?anos\s+depois\b|\bpor\s+d[ée]cadas\b|\bat[ée] hoje\b|\b(?:\w+\s+)?a[ñn]os\s+despu[ée]s\b|\bdurante\s+d[ée]cadas\b|\bhasta hoy\b/i
// "known as"/"called" sozinhos são descrição ("a lake known as Natron", "they called for help") — legado é olhar para trás.
const LEGADO_RE = /\b(?:historians?|scholars?|legacy|remembered as|became known|go(?:es)? down in history|(?:people|locals|villagers|sailors|everyone|the world)\s+(?:called|nicknamed|named)\s+(?!for\b|out\b|to\b|on\b|in\b|back\b|off\b|up\b)|historiadores?|legado|ficou conhecid[oa]|passou a ser chamad[oa]|llamaron|pas[óo] a la historia)\b/i
const MORTE_RE = /\b(?:died|dead|deaths?|killed|lives|victims|perished|toll|morreram|mortos|mortes|v[íi]timas|murieron|muertos|muertes)\b/i

/** Tipo de frase abstrata (o motor não tem o que filmar). null = frase concreta, fica com o plano do planejador. */
export function tipoAbstrato(fala: string): TipoAbstrato | null {
  const t = limpa(fala)
  if (!t) return null
  const anosDepois = ANOS_DEPOIS_RE.test(t)
  const lei = LEI_RE.test(t)
  const estat = ESTATISTICA_RE.test(t)
  const legado = LEGADO_RE.test(t)
  if (!anosDepois && !lei && !estat && !legado) return null
  if (EVENTO_FISICO_RE.test(t)) return null
  // pessoa agindo ("Years later, she returned to the lighthouse") é cena concreta — exceto o legado/estatística ditos por grupo
  if (anosDepois && !lei && PESSOA_AGE_RE.test(t)) return null
  if (anosDepois) return 'anos_depois'
  if (lei) return 'lei'
  if (estat && SUJEITO_FISICO_RE.test(t) && !MORTE_RE.test(t)) return legado ? 'legado' : null
  if (estat) return 'estatistica'
  return 'legado'
}

// ── 3. NÚCLEO VISUAL × RESTO — o que a cena MOSTRA (abre o prompt) e o que é direção de câmera/look (vem depois) ──
const MARCAS_DE_RESTO = ['subtle handheld camera movement', 'subtle camera movement', 'natural imperfect lighting', 'light film grain', 'candid framing',
  'vertical framing', 'cinematography (match exactly)', 'level horizon, stable', 'tack-sharp focus', 'no readable text', 'shot on 35mm',
  'teal-orange', 'shallow depth of field', 'the horizon is stable', 'no other characters, no animals', 'nothing added beyond',
  'vehicles, tools and buildings', 'camera upright, level horizon']
/** A frase de época que uma passada anterior já escreveu (para a passada ser idempotente). */
const EPOCA_JA_DITA_RE = /[^.]*: (?:period clothing|clothing), vehicles, tools and buildings[^.]*\./g
// Abreviações cujo ponto não fecha frase ("Mt. Fuji", "St. Petersburg", "approx. 3").
const ABREVIACAO_RE = /\b(?:mt|st|dr|mr|mrs|ms|jr|sr|vs|approx|no|ft|e\.g|i\.e|etc)$/i
export const frases = (t: string): string[] => {
  const out: string[] = []
  let atual = ''
  const partes = limpa(t).split(/([.!?])\s+/)
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i]
    if (p === '.' || p === '!' || p === '?') {
      if (p === '.' && ABREVIACAO_RE.test(atual)) { atual += '. '; continue }
      atual += p
      out.push(atual.trim())
      atual = ''
      continue
    }
    atual += p
  }
  if (atual.trim()) out.push(atual.trim())
  return out.filter(Boolean)
}
export function separarNucleo(prompt: string): { nucleo: string; resto: string } {
  const fs = frases(prompt)
  const k = fs.findIndex((f) => { const low = f.toLowerCase(); return MARCAS_DE_RESTO.some((m) => low.includes(m)) })
  if (k === -1) return { nucleo: fs.join(' '), resto: '' }
  if (k === 0) {
    // a 1ª frase já mistura descrição e direção ("…captures the scene, with natural imperfect lighting") → corta na 1ª marca
    const low = fs[0].toLowerCase()
    const i = Math.min(...MARCAS_DE_RESTO.map((m) => low.indexOf(m)).filter((x) => x >= 0))
    const nucleo = fs[0].slice(0, i).replace(/[\s,;:]*(?:with|and|in|on|at|of|for|the|a|an)?[\s,;:]*$/i, '').trim()
    if (nucleo.split(/\s+/).length >= 4) return { nucleo: /[.!?]$/.test(nucleo) ? nucleo : `${nucleo}.`, resto: [fs[0].slice(i), ...fs.slice(1)].join(' ').trim() }
    return { nucleo: '', resto: fs.join(' ') }
  }
  return { nucleo: fs.slice(0, k).join(' '), resto: fs.slice(k).join(' ') }
}

// ── 4. ASSINATURA DE COMPOSIÇÃO — plano + termos de conteúdo (radicais), para a variedade com dentes ──
const PLANOS: Array<[PlanoTipo, RegExp]> = [
  ['aereo', /\b(?:aerial|drone|bird'?s[- ]eye|from above|satellite view|top-down)\b/i],
  ['close', /\b(?:close[- ]?ups?|close on|macro|extreme close|tight (?:shot|framing)|insert shot)\b/i],
  ['detalhe', /\bdetail shot\b/i],
  ['interior', /\b(?:interior|inside (?:a|an|the)|indoors?)\b/i],
  ['alto', /\b(?:high[- ]angle|overhead (?:view|shot))\b/i],
  ['chao', /\b(?:ground[- ]level|street[- ]level|eye[- ]level|low[- ]angle)\b/i],
  ['aberto', /\b(?:wide(?:[- ]angle)?(?:\s+(?:shot|view))?|establishing|panoram\w*|vista|landscape|long shot|sweeping)\b/i],
  ['medio', /\b(?:medium(?: wide)? shot|mid[- ]shot|waist[- ]up)\b/i],
]
export function planoDe(texto: string): PlanoTipo {
  const t = (texto ?? '').split(/Cinematography \(match exactly\)/i)[0]
  for (const [p, re] of PLANOS) if (re.test(t)) return p
  return 'indefinido'
}
const STOP = new Set(('about above after again against along also among another around away because been before behind being below beneath beside between beyond both ' +
  'came come comes could does doing down during each either else even ever every from further have having here into itself just like made make makes many more most much ' +
  'near nearly never next none only onto other over quite rather same seen shall should since some such than that their them then there these they thing things this those ' +
  'though through throughout thus together toward towards under until upon very what when where whether which while whole will with within without would your ' +
  'shot shots view views scene scenes camera frame framing image moment moments light lighting shows showing show shown captures capturing capture visible ' +
  'looking looks look vertical horizontal level wide close closeup aerial angle high medium detail extreme slowly slow subtle natural cinematic dramatic massive huge ' +
  'large small vast entire single gently softly barely suddenly visibly seen still felt heard hear sound later years year decades decade days weeks hours moment ' +
  'people person nobody someone everyone anyone mouth closed speaking silent lens filling feel feels fell fall' +
  ' them their there were with from into onto that this than then when what have has had been being which while also just only even more most much very').split(/\s+/))
/** Radical grosseiro (cópia do de lib/hollywood/fidelidade — este módulo é puro): grips/gripped → grip; waves → wav. */
export function radical(w: string): string {
  let v = w.toLowerCase()
  if (v.length > 5 && v.endsWith('ies')) v = v.slice(0, -3) + 'y'
  else if (v.length > 5 && v.endsWith('ing')) v = v.slice(0, -3)
  else if (v.length > 4 && v.endsWith('ed')) v = v.slice(0, -2)
  else if (v.length > 4 && v.endsWith('s') && !v.endsWith('ss')) v = v.slice(0, -1)
  if (/([b-df-hj-np-tv-z])\1$/.test(v)) v = v.slice(0, -1)
  if (v.length > 4 && v.endsWith('e')) v = v.slice(0, -1)
  return v
}
export function termosDe(texto: string, excluir = ''): string[] {
  let t = (texto ?? '')
  const ex = limpa(excluir)
  if (ex.length >= 15) t = t.split(ex).join(' ')
  const out = new Set<string>()
  for (const w of t.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/)) {
    if (w.length < 4 || /\d/.test(w) || STOP.has(w)) continue
    out.add(radical(w))
  }
  return [...out]
}
export function sobreposicao(a: string[], b: string[]): { comuns: string[]; coef: number } {
  const sb = new Set(b)
  const comuns = a.filter((x) => sb.has(x))
  const menor = Math.min(a.length, b.length)
  return { comuns, coef: menor === 0 ? 0 : comuns.length / menor }
}
/** Mesma composição: planos iguais (ou um deles sem plano dito) E conteúdo sobreposto. Planos diferentes ditos = composições diferentes. */
export function colidem(pa: PlanoTipo, ta: string[], pb: PlanoTipo, tb: string[]): { colide: boolean; comuns: string[]; coef: number } {
  const s = sobreposicao(ta, tb)
  if (pa !== 'indefinido' && pb !== 'indefinido' && pa !== pb) return { colide: false, ...s }
  const iguais = pa !== 'indefinido' && pa === pb
  const colide = iguais ? s.comuns.length >= 2 && s.coef >= 0.3 : s.comuns.length >= 3 && s.coef >= 0.4
  return { colide, ...s }
}

// ── 5. O QUE FILMAR — foco da fala (substantivos), cenário dominante, estação ──
const STOP_FALA = new Set(('the a an and or but of in on at to for from with by into onto over under after before during since until while as than then so ' +
  'it its it\'s this that these those there here his her their our your my he she they we you i me him them us who whom whose which what when where why how ' +
  'is are was were be been being has have had do does did will would could should can may might must shall not no nor never also just only even still ' +
  'very more most much many few several some any all each every both either neither such same other another own ' +
  'one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred hundreds thousand thousands million millions billion ' +
  'dozen dozens half point first second third last next later ago years year decades decade days day weeks week hours hour minutes moments moment ' +
  'people person nobody someone everyone anyone something nothing everything because could see seen said say says called named known like ' +
  'without within across around about against between through throughout toward towards upon among beyond beneath inside outside ' +
  'again ever away back still too yet already almost soon now today tonight once twice there where here ' +
  // verbos irregulares e de fala/estado que a regra -ed/-ing não pega
  'died fell rose came went made took gave saw told held left ran sank grew blew flew drew threw broke spoke woke froze chose stood sat lay led fled fed ' +
  'hid struck swept kept slept wept crept felt dealt meant sent spent built lost burnt became began won wore tore bore shook wrote drove rode ate found ' +
  'reached estimate estimates believe believes think thinks know knows mean means remain remains become becomes seem seems stand stands live lives ' +
  'happen happens stay stays turn turns rise rises hold holds call calls tell tells show shows').split(/\s+/))
const ADJETIVOS = new Set(('cold hot warm sweet sticky thick dense thin yellow black brown white red grey gray green blue dark bright high low tall deep small large huge ' +
  'massive entire single whole slow fast loud quiet empty full heavy old new young ancient modern frozen wet dry wide long short vast giant great little ' +
  'strange terrible sudden silent dead alive free clear clean dirty poor rich open closed tallest biggest largest highest deadliest worst best').split(/\s+/))
const NAO_SAO_VERBOS = new Set(['building', 'buildings', 'ceiling', 'morning', 'evening', 'painting', 'clothing', 'bedding', 'wedding', 'king', 'spring', 'string',
  'ring', 'wing', 'thing', 'bed', 'shed', 'sled', 'seed', 'weed', 'reed', 'speed', 'need', 'feed', 'deed', 'greed', 'steed', 'breed', 'creed', 'hundred',
  'sacred', 'naked', 'beloved', 'red', 'aged', 'wicked', 'rugged', 'jagged', 'ragged', 'crooked'])
/** Pedaços nominais da fala ("Smoke from millions of coal fires…" → smoke | coal fires | yellow black smog). */
export function pedacosNominais(fala: string): string[] {
  const toks = limpa(fala).replace(/[“”"()]/g, ' ').split(/\s+/)
  const out: string[] = []
  let atual: string[] = []
  const fecha = () => {
    while (atual.length && ADJETIVOS.has(atual[atual.length - 1])) atual.pop()
    if (atual.length) out.push(atual.join(' '))
    atual = []
  }
  toks.forEach((raw, i) => {
    const pont = /[,.;:!?]$/.test(raw)
    const w0 = raw.replace(/[^A-Za-zÀ-ÿ'’-]/g, '')
    const w = w0.toLowerCase().replace(/['’]s$/, '')
    const proprio = i > 0 && /^[A-ZÀ-Ý]/.test(w0)
    const verbo = !NAO_SAO_VERBOS.has(w) && ((w.length >= 4 && /ed$/.test(w)) || (w.length >= 5 && /ing$/.test(w)) || /ly$/.test(w))
    const ok = w.length >= 3 && !STOP_FALA.has(w) && !proprio && !verbo && !/\d/.test(raw)
    if (ok) atual.push(w)
    else fecha()
    if (pont) fecha()
  })
  fecha()
  return out
}
const CENARIOS = ['street', 'square', 'harbor', 'harbour', 'port', 'bay', 'coast', 'shore', 'beach', 'field', 'farm', 'village', 'town', 'city',
  'valley', 'river', 'lake', 'mountain', 'forest', 'island', 'desert', 'plain', 'road', 'bridge', 'market', 'hillside', 'fjord', 'crater']
function cenarioDominante(nucleos: string[]): string {
  const conta = new Map<string, number>()
  for (const n of nucleos) for (const w of n.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)) {
    const s = w.endsWith('s') && CENARIOS.includes(w.slice(0, -1)) ? w.slice(0, -1) : w
    if (CENARIOS.includes(s)) conta.set(s, (conta.get(s) ?? 0) + 1)
  }
  let melhor = ''
  let n = 0
  for (const [k, v] of conta) if (v > n) { melhor = k; n = v }
  return melhor || 'place'
}
function estacaoPara(fala: string, mesBase: number | null): string {
  const t = (fala ?? '').toLowerCase()
  if (/\bsummer\b|\bhot\b|\bver[ãa]o\b|\bverano\b/.test(t)) return 'on a hot summer day'
  if (/\bwinter\b|\bsnow\b|\binverno\b|\binvierno\b/.test(t)) return 'on a crisp winter day'
  if (/\bautumn\b|\bfall\b|\boutono\b|\bouto[ñn]o\b/.test(t)) return 'on a golden autumn day'
  if (/\bspring\b|\bprimavera\b/.test(t)) return 'on a bright spring day'
  if (mesBase !== null && mesBase >= 5 && mesBase <= 7) return 'on a crisp autumn day'
  return 'on a bright spring day'
}
const juntaFoco = (ps: string[]) => ps.length === 0 ? '' : ps.length === 1 ? `the ${ps[0]}` : `the ${ps[0]} and ${ps[1]}`

// ── 6. A IMAGEM CONCRETA DA FRASE ABSTRATA — lista determinística por tipo (a 2ª do mesmo tipo no filme usa a variante) ──
export function imagemConcreta(tipo: TipoAbstrato, a: { fala: string; lugar: string | null; origem: string | null; cenario: string; salto: Salto; mesBase: number | null; variante: number }): string {
  const em = a.lugar ? ` in ${a.lugar}` : ''
  const escolhe = (opcoes: string[]) => opcoes[a.variante % opcoes.length]
  const cadeiras = `Rows of empty wooden chairs in a vast, silent hall${em}, soft window light, seen in a wide shot from the back of the room.`
  if (tipo === 'estatistica') {
    if (MORTE_RE.test(a.fala)) return escolhe([`Rows of empty iron hospital beds in a long, dim ward${em}, cold light through tall windows, seen in a wide shot down the length of the room.`, cadeiras])
    return escolhe([`Long rows of wooden filing drawers and stacked ledgers in a dim archive room${em}, the pages soft and out of focus, a single lamp glowing, seen in a wide shot down the aisle.`, cadeiras])
  }
  if (tipo === 'lei') {
    return escolhe([
      `The stone facade of a grand government building${em} on a quiet morning, seen in a wide shot from across an empty square.`,
      'Close-up of a hand signing a long document with a fountain pen, the paper soft and out of focus, no legible writing.',
    ])
  }
  if (tipo === 'anos_depois') {
    const quando = a.salto && 'decadas' in a.salto ? 'decades later' : 'years later'
    const onde = `${a.lugar ? `${a.lugar} ` : ''}${a.cenario}`
    return escolhe([
      `The same ${onde} ${quando}, under a clear blue sky ${estacaoPara(a.fala, a.mesBase)}, clean crisp air, calm and quiet, wide shot.`,
      `Close-up detail of the same ${onde} ${quando}: sunlight on weathered stone and wood ${estacaoPara(a.fala, a.mesBase)}, clean crisp air.`,
    ])
  }
  const forma = /\b(mountain|volcano|island|lake|river|bay|valley|coast|sea|desert|forest|crater|glacier|city|town|village)\b/i.exec(a.fala ?? '')
  const origem = a.origem ?? 'the place where it all began'
  return escolhe([
    `A wide, quiet view of ${origem}, long after the events${forma ? `, the ${forma[1].toLowerCase()} under a calm sky` : ', under a calm sky'}, nothing moving but the clouds.`,
    `A slow sunrise over ${origem}, long after the events, mist lifting from the ground, seen from far away.`,
  ])
}

// ── 7. TROCA DE PLANO — quando duas cenas seguidas têm a mesma composição ──
const ROTACAO: PlanoTipo[] = ['close', 'aberto', 'interior', 'detalhe']
export function fraseDePlano(p: PlanoTipo, foco: string, lugar: string | null): string {
  const f = foco || 'a telling detail of the scene'
  if (p === 'close') return `Extreme close-up on ${f}, filling the frame.`
  if (p === 'aberto') return `Wide shot${lugar ? ` of ${lugar}` : ''} with ${f} seen from far away.`
  if (p === 'interior') return `Interior shot from inside a dim room, looking out through a window at ${f}.`
  return `Detail shot of weathered hands working beside ${f}.`
}
const ROTULO: Record<PlanoTipo, string> = { aereo: 'Aerial view', close: 'Close-up', interior: 'Interior view', aberto: 'Wide shot', medio: 'Medium shot',
  chao: 'Ground-level view', alto: 'High-angle view', detalhe: 'Detail shot', indefinido: 'Eye-level view' }

export type CenaS25Entrada = { prompt: string; voiceover?: string | null; type: string }
export type CenaS25 = {
  indice: number
  prompt: string
  nucleo: string
  nucleoOriginal: string
  epoca: string
  ano: number | null
  lugar: string | null
  plano: PlanoTipo
  planoOriginal: PlanoTipo
  abstrata: TipoAbstrato | null
  trocou: boolean
  motivo: string
  sobreposicaoAnterior: number
  comunsAnterior: string[]
  apresentador: 'fora' | 'na_historia' | null // KINEO-S25-APRESENTADOR-2026-10-06 — 'fora' = núcleo refeito da fala; 'na_historia' = a fala cita a pessoa
  olharLente: number // KINEO-S25-APRESENTADOR-2026-10-06 — trechos de olhar para a lente trocados nesta cena (núcleo + resto)
}
export type RelatoS25 = {
  versao: string
  cenas_s25: number
  epoca_base: string
  lugares: string[]
  abstratas: number
  trocas: number
  aberturas_distintas: boolean
  papel_apresentador: string | null // KINEO-S25-APRESENTADOR-2026-10-06 — o papel de narrador/apresentador da ficha (null = ficha sem esse papel)
  apresentador_fora: number // KINEO-S25-APRESENTADOR-2026-10-06 — cenas em que o apresentador saiu (núcleo refeito da fala)
  apresentador_na_historia: number // KINEO-S25-APRESENTADOR-2026-10-06 — cenas em que a fala cita a pessoa e ela fica, trabalhando na cena
  olhar_lente: number // KINEO-S25-APRESENTADOR-2026-10-06 — cenas com olhar para a lente trocado por olhar dentro da cena
  cenas: Array<{ cena: number; plano: PlanoTipo; plano_original: PlanoTipo; abstrata: TipoAbstrato | null; trocou: boolean; motivo: string; epoca: string; sobreposicao_anterior: number; comuns_anterior: string[]; abertura: string; apresentador: 'fora' | 'na_historia' | null; olhar_lente: number }> // KINEO-S25-APRESENTADOR-2026-10-06 (+ apresentador, olhar_lente)
}

const abertura = (p: string) => limpa(p).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 6).join(' ')
const semPontoFinal = (t: string) => limpa(t).replace(/[.\s]+$/, '')

// ── 8. APRESENTADOR FORA DA HISTÓRIA — KINEO-S25-APRESENTADOR-2026-10-06 ──
// Ensaio de $0 de 06/10 (main 56e40659, Tambora 1815 verbatim 35 s, documentary_faceless, hostFits=false): o roteiro fecha com // KINEO-S25-APRESENTADOR-2026-10-06
// "historians traced it to a single mountain" e o planejador GPT inventou um apresentador ("A middle-aged historian, Caucasian, … // KINEO-S25-APRESENTADOR-2026-10-06
// stands against a backdrop of antique bookshelves"): a cena 1 — o gancho — virou ele "looking directly into the camera" (o vulcão // KINEO-S25-APRESENTADOR-2026-10-06
// não aparecia) e a âncora de ambiente virou o escritório dele. O roteador (router.ts ~905-918) só converte cena tipada 'dialogue' // KINEO-S25-APRESENTADOR-2026-10-06
// quando hostFits=false; apresentador numa cena 'support'/'cinematic' passava inteiro. Só no S25, nesta passada: // KINEO-S25-APRESENTADOR-2026-10-06
//   (1) ninguém olha para a lente: o trecho vira um olhar DENTRO da cena, sem proibição que nomeie a câmera (a proibição que // KINEO-S25-APRESENTADOR-2026-10-06
//       nomeia o objeto desenha o objeto; o AVISO_CAMERA_S25 fica como está). Forma negada ("never facing the lens") fica; // KINEO-S25-APRESENTADOR-2026-10-06
//   (2) apresentador que a fala da cena não cita (papel, pronome ou nome da ficha) sai: o núcleo nasce da FALA (lugar + // KINEO-S25-APRESENTADOR-2026-10-06
//       acontecimento + pedaços nominais), com a época da cena; citado, fica — sem lente e trabalhando na cena (mapa, livro); // KINEO-S25-APRESENTADOR-2026-10-06
//   (3) a âncora de ambiente deixa de ser o escritório quando ele não tem lugar nenhum da história: vira a época/lugar do filme. // KINEO-S25-APRESENTADOR-2026-10-06
export type ApresentadorS25 = 'fora' | 'na_historia' // KINEO-S25-APRESENTADOR-2026-10-06
/** O olhar que entra no lugar do olhar para a lente (sem nomear câmera, lente nem espectador). */ // KINEO-S25-APRESENTADOR-2026-10-06
export const OLHAR_NA_CENA = 'the scene in front of them' // KINEO-S25-APRESENTADOR-2026-10-06
const VER: Record<string, string> = { address: 'watch', addresses: 'watches', addressing: 'watching', addressed: 'watched', speak: 'watch', speaks: 'watches', speaking: 'watching', spoke: 'watched', talk: 'watch', talks: 'watches', talking: 'watching', talked: 'watched' } // KINEO-S25-APRESENTADOR-2026-10-06
const MANTER: Record<string, string> = { make: 'keep', makes: 'keeps', making: 'keeping', made: 'kept' } // KINEO-S25-APRESENTADOR-2026-10-06
const FICAR: Record<string, string> = { break: 'stay', breaks: 'stays', breaking: 'staying', broke: 'stayed' } // KINEO-S25-APRESENTADOR-2026-10-06
// Cada forma: verbo capturado → olhar dentro da cena. "camera lens"/"camera's lens" saem inteiros (não sobra "lens"). // KINEO-S25-APRESENTADOR-2026-10-06
const FORMAS_OLHAR: Array<[RegExp, (verbo: string, alvo: string, inicioDeOracao: boolean) => string]> = [ // KINEO-S25-APRESENTADOR-2026-10-06
  [/\b(look(?:s|ing|ed)?|star(?:e|es|ing|ed)|gaz(?:e|es|ing|ed)|peer(?:s|ing|ed)?|glanc(?:e|es|ing|ed))\s+(?:(?:directly|straight|right|squarely|intently|steadily|deeply|unblinkingly|back|out)\s+){0,2}(?:into|at|toward|towards|to)\s+(?:the\s+|our\s+)?(?:camera(?:['’]s)?(?:\s+lens)?|lens|viewers?)(?![A-Za-z])/gi, // KINEO-S25-APRESENTADOR-2026-10-06
    (v, alvo, ini) => (/ing$/i.test(v) && ini ? `eyes on ${alvo}` : `${v} at ${alvo}`)], // KINEO-S25-APRESENTADOR-2026-10-06
  [/\b(fac(?:e|es|ing|ed))\s+(?:(?:directly|straight|right|squarely)\s+)?(?:the\s+|our\s+)?(?:camera(?:['’]s)?(?:\s+lens)?|lens|viewers?)(?![A-Za-z])/gi, (v, alvo) => `${v} ${alvo}`], // KINEO-S25-APRESENTADOR-2026-10-06
  [/\b(address(?:es|ing|ed)?|speak(?:s|ing)?|spoke|talk(?:s|ing|ed)?)\s+(?:(?:directly|straight)\s+)?(?:(?:to|into|at|toward|towards)\s+)?(?:the\s+|our\s+)?(?:camera(?:['’]s)?(?:\s+lens)?|lens|viewers?)(?![A-Za-z])(?:\s+about\s+[^,.;:!?]+)?/gi, (v, alvo) => `${VER[v.toLowerCase()] ?? 'watches'} ${alvo}`], // KINEO-S25-APRESENTADOR-2026-10-06 (o assunto da fala, "about …", sai junto)
  [/\b(break(?:s|ing)?|broke)\s+the\s+fourth\s+wall\b/gi, (v) => `${FICAR[v.toLowerCase()] ?? 'stays'} absorbed in the scene`], // KINEO-S25-APRESENTADOR-2026-10-06
  [/\b(mak(?:e|es|ing)|made)\s+(?:(?:direct|steady)\s+)?eye[- ]contact\s+with\s+(?:the\s+|our\s+)?(?:camera(?:['’]s)?(?:\s+lens)?|lens|viewers?)(?![A-Za-z])/gi, (v, alvo) => `${MANTER[v.toLowerCase()] ?? 'keeps'} their eyes on ${alvo}`], // KINEO-S25-APRESENTADOR-2026-10-06
  [/\b(turn(?:s|ing|ed)?)\s+(?:(?:directly|straight)\s+)?(?:to|toward|towards)\s+(?:the\s+|our\s+)?(?:camera(?:['’]s)?(?:\s+lens)?|lens|viewers?)(?![A-Za-z])/gi, (v, alvo) => `${v} toward ${alvo}`], // KINEO-S25-APRESENTADOR-2026-10-06
  [/\b(eyes|gaze)\s+(?:locked|fixed|trained|set|riveted)\s+(?:on|upon)\s+(?:the\s+|our\s+)?(?:camera(?:['’]s)?(?:\s+lens)?|lens|viewers?)(?![A-Za-z])/gi, (_v, alvo) => `eyes on ${alvo}`], // KINEO-S25-APRESENTADOR-2026-10-06
] // KINEO-S25-APRESENTADOR-2026-10-06
// Negação na mesma oração ("never facing the lens", "Nobody addresses the camera", "does not look at the camera"): fica como está. // KINEO-S25-APRESENTADOR-2026-10-06
const NEGA_NA_ORACAO_RE = /(?:^|[^A-Za-z])(?:not|never|no|nobody|without|neither|nor|avoids?|avoiding|avoided|refuses?|refusing|refused)(?![A-Za-z])|n['’]t(?![A-Za-z])/i // KINEO-S25-APRESENTADOR-2026-10-06
/** Olhar para a lente → olhar dentro da cena (sem nomear a câmera). `alvo` = para onde a pessoa olha. Devolve o texto e quantos trechos trocou. */ // KINEO-S25-APRESENTADOR-2026-10-06
export function olharNaCena(texto: string, alvo: string = OLHAR_NA_CENA): { texto: string; trocas: number } { // KINEO-S25-APRESENTADOR-2026-10-06
  let t = texto ?? '' // KINEO-S25-APRESENTADOR-2026-10-06
  let trocas = 0 // KINEO-S25-APRESENTADOR-2026-10-06
  for (const [re, troca] of FORMAS_OLHAR) { // KINEO-S25-APRESENTADOR-2026-10-06
    t = t.replace(re, (m: string, verbo: string, off: number, todo: string) => { // KINEO-S25-APRESENTADOR-2026-10-06
      const antes = todo.slice(Math.max(0, off - 80), off) // KINEO-S25-APRESENTADOR-2026-10-06
      if (NEGA_NA_ORACAO_RE.test(antes.split(/[,.;:!?]/).pop() ?? '')) return m // KINEO-S25-APRESENTADOR-2026-10-06
      trocas++ // KINEO-S25-APRESENTADOR-2026-10-06
      const novo = troca(verbo, alvo, /(?:^|[,;:.!?])\s*$/.test(antes)) // KINEO-S25-APRESENTADOR-2026-10-06
      return /^[A-Z]/.test(m) ? novo.charAt(0).toUpperCase() + novo.slice(1) : novo // KINEO-S25-APRESENTADOR-2026-10-06
    }) // KINEO-S25-APRESENTADOR-2026-10-06
  } // KINEO-S25-APRESENTADOR-2026-10-06
  return { texto: t, trocas } // KINEO-S25-APRESENTADOR-2026-10-06
} // KINEO-S25-APRESENTADOR-2026-10-06
// ── KINEO-S25-APRESENTADOR-2026-10-06 ──
// Papéis de narrador/apresentador (en/pt/es). Limites por letra (não \b): "anfitriã"/"guía" terminam em letra acentuada. // KINEO-S25-APRESENTADOR-2026-10-06
const PAPEIS_APRESENTADOR: Array<{ papel: string; re: RegExp }> = [ // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'historian', re: /(?<![A-Za-zÀ-ÿ])(?:historians?|historiador(?:a|es|as)?)(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'narrator', re: /(?<![A-Za-zÀ-ÿ])(?:narrators?|narrador(?:a|es|as)?)(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'storyteller', re: /(?<![A-Za-zÀ-ÿ])(?:story-?tellers?|contador(?:a|es|as)? de hist[óo]rias|cuentacuentos|cuentistas?)(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'presenter', re: /(?<![A-Za-zÀ-ÿ])(?:presenters?|hosts?|anchor(?:m[ae]n|wom[ae]n|s)?|apresentador(?:a|es|as)?|presentador(?:a|es|as)?|anfitri(?:ão|ã|ões|ãs|ón|ona|ones|onas))(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'expert', re: /(?<![A-Za-zÀ-ÿ])(?:experts?|specialists?|especialistas?|expert[oa]s?|perit[oa]s?)(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'professor', re: /(?<![A-Za-zÀ-ÿ])(?:professors?|lecturers?|scholars?|academics?|professor(?:a|es|as)?|profesor(?:a|es|as)?|catedr[áa]tic[oa]s?)(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'scientist', re: /(?<![A-Za-zÀ-ÿ])(?:scientists?|researchers?|investigators?|geologists?|v[ou]lcanologists?|climatologists?|cientistas?|pesquisador(?:a|es|as)?|cient[íi]fic[oa]s?|investigador(?:a|es|as)?|ge[óo]log[oa]s?|v[ou]lcan[óo]log[oa]s?)(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'reporter', re: /(?<![A-Za-zÀ-ÿ])(?:reporters?|journalists?|correspondents?|rep[óo]rter(?:es)?|jornalistas?|periodistas?|reporter[oa]s?|correspondentes?|corresponsal(?:es)?)(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'guide', re: /(?<![A-Za-zÀ-ÿ])(?:guides?|guias?|gu[íi]as?)(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
  { papel: 'archaeologist', re: /(?<![A-Za-zÀ-ÿ])(?:arch(?:a)?eologists?|arque[óo]log[oa]s?)(?![A-Za-zÀ-ÿ])/i }, // KINEO-S25-APRESENTADOR-2026-10-06
] // KINEO-S25-APRESENTADOR-2026-10-06
// A cabeça da ficha = quem a pessoa É ("A middle-aged historian"), antes da 1ª vírgula/descrição ("with", "wearing", "in"…): // KINEO-S25-APRESENTADOR-2026-10-06
// "A weathered sailor … with an anchor tattoo" não vira apresentador por causa de um objeto da descrição. // KINEO-S25-APRESENTADOR-2026-10-06
const CORTE_CABECA_RE = /[,;:.(]|\s(?:with|wearing|in|who|holding|standing|stands|sitting|sits|seated|dressed|carrying|against|from|at|on|com|vestindo|usando|con|vestid[oa]|em|en)\s/i // KINEO-S25-APRESENTADOR-2026-10-06
/** O papel de narrador/apresentador que a ficha descreve (pela cabeça da ficha), ou null. */ // KINEO-S25-APRESENTADOR-2026-10-06
export function papelDeApresentador(characterSheet: string | null | undefined): { papel: string; re: RegExp } | null { // KINEO-S25-APRESENTADOR-2026-10-06
  const cabeca = limpa(characterSheet ?? '').split(CORTE_CABECA_RE)[0] ?? '' // KINEO-S25-APRESENTADOR-2026-10-06
  return PAPEIS_APRESENTADOR.find((p) => p.re.test(cabeca)) ?? null // KINEO-S25-APRESENTADOR-2026-10-06
} // KINEO-S25-APRESENTADOR-2026-10-06
const normal = (t: string) => limpa(t).toLowerCase().replace(/[^a-z0-9à-ÿ\s]/g, ' ').replace(/\s+/g, ' ').trim() // KINEO-S25-APRESENTADOR-2026-10-06
/** A pessoa da ficha está no texto: o começo da ficha (4 palavras) repetido, ou o papel dito ("the historian"). */ // KINEO-S25-APRESENTADOR-2026-10-06
function pessoaDaFichaNaCena(texto: string, ficha: string, papelRe: RegExp): boolean { // KINEO-S25-APRESENTADOR-2026-10-06
  const ini = normal(ficha).split(' ').slice(0, 4).join(' ') // KINEO-S25-APRESENTADOR-2026-10-06
  return (ini.split(' ').length >= 3 && normal(texto).includes(ini)) || papelRe.test(texto ?? '') // KINEO-S25-APRESENTADOR-2026-10-06
} // KINEO-S25-APRESENTADOR-2026-10-06
const PRONOME_PESSOA_RE = /(?<![A-Za-zÀ-ÿ])(?:he|she|him|his|her|hers|himself|herself|ele|ela|dele|dela|él|ella)(?![A-Za-zÀ-ÿ])/i // KINEO-S25-APRESENTADOR-2026-10-06
const nomesDaFicha = (ficha: string) => limpa(ficha).split(/\s+/).slice(1).map((w) => w.replace(/[^A-Za-zÀ-ÿ'’-]/g, '')).filter((w) => w.length >= 3 && /^[A-ZÀ-Ý]/.test(w)) // KINEO-S25-APRESENTADOR-2026-10-06
/** A fala da cena cita a pessoa? 'papel' = o papel (en/pt/es: "historians traced…"); 'pessoa' = um pronome de pessoa ou um nome // KINEO-S25-APRESENTADOR-2026-10-06
 *  da ficha (a pessoa pode ser personagem da história: "She drilled…"); null = não cita → o apresentador está fora da história. */ // KINEO-S25-APRESENTADOR-2026-10-06
function falaCitaPessoa(fala: string, papelRe: RegExp, ficha: string): 'papel' | 'pessoa' | null { // KINEO-S25-APRESENTADOR-2026-10-06
  const f = fala ?? '' // KINEO-S25-APRESENTADOR-2026-10-06
  const palavrasDaFala = f.split(/[^A-Za-zÀ-ÿ'’-]+/) // KINEO-S25-APRESENTADOR-2026-10-06
  if (papelRe.test(f)) return 'papel' // KINEO-S25-APRESENTADOR-2026-10-06
  return PRONOME_PESSOA_RE.test(f) || nomesDaFicha(ficha).some((n) => palavrasDaFala.includes(n)) ? 'pessoa' : null // KINEO-S25-APRESENTADOR-2026-10-06
} // KINEO-S25-APRESENTADOR-2026-10-06
// O cenário do apresentador (frase a frase, para tirar do núcleo/resto refeito) e o do ambiente (forte = 1 basta; fraco = 3). // KINEO-S25-APRESENTADOR-2026-10-06
const CENARIO_DO_APRESENTADOR_RE = /(?<![A-Za-zÀ-ÿ])(?:study room|studio|library|office|desk|bookshel(?:f|ves)|bookcases?|book-lined|globe|classroom|lecture hall|newsroom|backdrop|estantes?|biblioteca|escrit[óo]rio|est[úu]dio)(?![A-Za-zÀ-ÿ])/i // KINEO-S25-APRESENTADOR-2026-10-06
const CENARIO_FORTE_RE = /(?<![A-Za-zÀ-ÿ])(?:study room|(?:a|the|his|her|their|private|historical|quiet|cozy|cosy|book-lined|dim|wood-panell?ed)\s+study|bookshel(?:f|ves)|bookcases?|book-lined|library|(?<!(?:around|across) the )globe|lecture (?:hall|theat(?:er|re))|classroom|newsroom|news desk|(?:tv|television|broadcast|podcast|recording|news) studio|talk[- ]show|scholarly|estantes? de livros|estanter[íi]as?|sala de aula|globo terrestre|biblioteca)(?![A-Za-zÀ-ÿ])/i // KINEO-S25-APRESENTADOR-2026-10-06
const CENARIO_FRACO_RE = /(?<![A-Za-zÀ-ÿ])(?:desks?|office|studio|armchairs?|fireplace|books|archives?|maps|documents|contemplative|escrit[óo]rio|est[úu]dio|livros|libros|despacho)(?![A-Za-zÀ-ÿ])/gi // KINEO-S25-APRESENTADOR-2026-10-06
/** A environmentSheet descreve o cenário de um apresentador (escritório, biblioteca, estúdio, sala de aula…)? */ // KINEO-S25-APRESENTADOR-2026-10-06
export function cenarioDeApresentador(environmentSheet: string): boolean { // KINEO-S25-APRESENTADOR-2026-10-06
  const e = environmentSheet ?? '' // KINEO-S25-APRESENTADOR-2026-10-06
  return CENARIO_FORTE_RE.test(e) || new Set((e.match(CENARIO_FRACO_RE) ?? []).map((w) => w.toLowerCase())).size >= 3 // KINEO-S25-APRESENTADOR-2026-10-06
} // KINEO-S25-APRESENTADOR-2026-10-06
/** O lugar dentro da frase de época ("Mount Tambora, Indonesia, 1815: …" → "Mount Tambora, Indonesia"); sem lugar → null. */ // KINEO-S25-APRESENTADOR-2026-10-06
export function lugarDaEpoca(epoca: string): string | null { // KINEO-S25-APRESENTADOR-2026-10-06
  const cabeca = limpa(epoca).split(':')[0] // KINEO-S25-APRESENTADOR-2026-10-06
  const k = cabeca.lastIndexOf(', ') // KINEO-S25-APRESENTADOR-2026-10-06
  return k > 0 ? cabeca.slice(0, k) : null // KINEO-S25-APRESENTADOR-2026-10-06
} // KINEO-S25-APRESENTADOR-2026-10-06
/** O texto cita o lugar (qualquer parte: "Mount Tambora", "Tambora", "Indonesia")? */ // KINEO-S25-APRESENTADOR-2026-10-06
function mencionaLugar(texto: string, lugar: string): boolean { // KINEO-S25-APRESENTADOR-2026-10-06
  const t = (texto ?? '').toLowerCase() // KINEO-S25-APRESENTADOR-2026-10-06
  return lugar.split(/,\s*/).flatMap((p) => [p, p.replace(/^(?:mount|mt\.|lake|cape|fort|port|monte|lago|cabo|ilha|isla)\s+/i, '')]).some((p) => p.length >= 3 && t.includes(p.toLowerCase())) // KINEO-S25-APRESENTADOR-2026-10-06
} // KINEO-S25-APRESENTADOR-2026-10-06
const natural = (lugar: string) => lugar.replace(/, /, ' in ') // KINEO-S25-APRESENTADOR-2026-10-06 — "Mount Tambora, Indonesia" → "Mount Tambora in Indonesia"
// O acontecimento físico da fala, em imagem (en/pt/es). Sem pessoa e sem marca de câmera/look nas frases (o still FLUX nasce delas). // KINEO-S25-APRESENTADOR-2026-10-06
const VULCAO_RE = /(?<![A-Za-zÀ-ÿ])(?:mount|mt|volcano(?:es)?|volcanic|volc[áa]n|vulc[ãa]o|monte|craters?|crateras?|cr[áa]ter|caldera)(?![A-Za-zÀ-ÿ])/i // KINEO-S25-APRESENTADOR-2026-10-06
const ACONTECIMENTOS: Array<{ re: RegExp; imagem: string; vulcao?: string }> = [ // KINEO-S25-APRESENTADOR-2026-10-06
  { re: /(?<![A-Za-zÀ-ÿ])(?:erupt\w*|explod\w*|explosions?|blast(?:s|ed)?|erup[çc](?:ão|ões)|explodiu|explodiram|explos(?:ão|ões)|erupci[óo]n|explot[óo]|explosi[óo]n)(?![A-Za-zÀ-ÿ])/i, imagem: 'torn by a massive explosion, fire and smoke billowing upward', vulcao: 'erupting, a towering column of ash and fire rising into the sky' }, // KINEO-S25-APRESENTADOR-2026-10-06
  { re: /(?<![A-Za-zÀ-ÿ])(?:avalanche|landslide|mudslide|deslizamento|alud)(?![A-Za-zÀ-ÿ])/i, imagem: 'buried under a roaring avalanche of snow and rock' }, // KINEO-S25-APRESENTADOR-2026-10-06
  { re: /(?<![A-Za-zÀ-ÿ])(?:tsunami|tidal wave|waves?|onda|ondas|olas?|maremoto)(?![A-Za-zÀ-ÿ])/i, imagem: 'struck by a towering wave' }, // KINEO-S25-APRESENTADOR-2026-10-06
  { re: /(?<![A-Za-zÀ-ÿ])(?:flood\w*|inunda\w*|enchentes?)(?![A-Za-zÀ-ÿ])/i, imagem: 'under muddy floodwater' }, // KINEO-S25-APRESENTADOR-2026-10-06
  { re: /(?<![A-Za-zÀ-ÿ])(?:earthquake|quake\w*|terremoto|sismo)(?![A-Za-zÀ-ÿ])/i, imagem: 'shaken by an earthquake, the ground cracking open' }, // KINEO-S25-APRESENTADOR-2026-10-06
  { re: /(?<![A-Za-zÀ-ÿ])(?:collaps\w*|crumbl\w*|toppl\w*|desab\w*|derrumb\w*|colaps\w*)(?![A-Za-zÀ-ÿ])/i, imagem: 'collapsing in a cloud of dust and debris' }, // KINEO-S25-APRESENTADOR-2026-10-06
  { re: /(?<![A-Za-zÀ-ÿ])(?:burned down|burnt down|caught fire|went up in flames|on fire|in flames|blaze|inferno|inc[êe]ndio|incendio|pegou fogo)(?![A-Za-zÀ-ÿ])/i, imagem: 'engulfed in flames and thick smoke' }, // KINEO-S25-APRESENTADOR-2026-10-06
  { re: /(?<![A-Za-zÀ-ÿ])(?:storms?|hurricane|typhoon|cyclone|tornado|blizzard|tempestade|furac[ãa]o|tormenta|hurac[áa]n)(?![A-Za-zÀ-ÿ])/i, imagem: 'battered by a violent storm' }, // KINEO-S25-APRESENTADOR-2026-10-06
  { re: /(?<![A-Za-zÀ-ÿ])(?:sank|sinks?|sinking|sunk|naufrag\w*|afund\w*|hundi\w*)(?![A-Za-zÀ-ÿ])/i, imagem: 'sinking beneath dark, heaving waves' }, // KINEO-S25-APRESENTADOR-2026-10-06
] // KINEO-S25-APRESENTADOR-2026-10-06
// Palavras de som/medida/verbo solto que pedacosNominais deixa passar e que não se filmam ("roar heard", "kilometers", "spread"). // KINEO-S25-APRESENTADOR-2026-10-06
const SEM_IMAGEM = new Set(('heard spread said told known roar roars sound sounds noise bang boom rumble echo echoes cry cries scream screams voice voices ' + // KINEO-S25-APRESENTADOR-2026-10-06
  'silence smell smelled taste kilometers kilometres miles meters metres feet foot tons tonnes gallons liters litres percent degrees per search ' + // KINEO-S25-APRESENTADOR-2026-10-06
  'west east north south cost hit put set cut let').split(/\s+/)) // KINEO-S25-APRESENTADOR-2026-10-06
const focoDaFala = (fala: string) => pedacosNominais(fala).map((p) => p.split(' ').filter((w) => !SEM_IMAGEM.has(w)).join(' ')).filter((p) => p.length >= 3).slice(0, 2) // KINEO-S25-APRESENTADOR-2026-10-06
/** A imagem do que a FALA narra: lugar da cena + acontecimento físico + pedaços nominais (foco só em inglês, como na troca de plano). */ // KINEO-S25-APRESENTADOR-2026-10-06
// Sem lugar, sem acontecimento e sem foco (fala em pt/es sobre outra coisa): o cenário dominante das cenas anteriores ("the fields"), // KINEO-S25-APRESENTADOR-2026-10-06
// e só por último o lugar de origem do filme — nunca o escritório do apresentador. // KINEO-S25-APRESENTADOR-2026-10-06
export function imagemDaFala(a: { fala: string; lugar: string | null; origem: string | null; idioma: IdiomaS25; variante: number; cenario?: string }): string { // KINEO-S25-APRESENTADOR-2026-10-06
  const fala = a.fala ?? '' // KINEO-S25-APRESENTADOR-2026-10-06
  const onde = a.lugar ? natural(a.lugar) : null // KINEO-S25-APRESENTADOR-2026-10-06
  const foco = a.idioma === 'en' ? focoDaFala(fala) : [] // KINEO-S25-APRESENTADOR-2026-10-06
  const ev = ACONTECIMENTOS.find((x) => x.re.test(fala)) // KINEO-S25-APRESENTADOR-2026-10-06
  const quem = onde ?? (foco.length ? juntaFoco(foco) : a.origem ? natural(a.origem) : null) // KINEO-S25-APRESENTADOR-2026-10-06
  if (ev && quem) { // KINEO-S25-APRESENTADOR-2026-10-06
    const evento = ev.vulcao && VULCAO_RE.test(`${fala} ${a.lugar ?? a.origem ?? ''}`) ? ev.vulcao : ev.imagem // KINEO-S25-APRESENTADOR-2026-10-06
    return `${a.variante % 2 === 0 ? 'Wide shot of' : 'Aerial view of'} ${quem} ${evento}${onde && foco.length ? `, with ${juntaFoco(foco)}` : ''}.` // KINEO-S25-APRESENTADOR-2026-10-06
  } // KINEO-S25-APRESENTADOR-2026-10-06
  if (foco.length) return `${a.variante % 2 === 0 ? 'Wide shot of' : 'Ground-level view of'} ${juntaFoco(foco)}${onde ? ` in ${onde}` : ', seen from far away'}.` // KINEO-S25-APRESENTADOR-2026-10-06
  if (onde) return `Wide establishing shot of ${onde}, seen from far away.` // KINEO-S25-APRESENTADOR-2026-10-06
  if (a.cenario && a.cenario !== 'place') return `Wide establishing shot of the ${a.cenario}, seen from far away.` // KINEO-S25-APRESENTADOR-2026-10-06
  return a.origem ? `Wide establishing shot of ${natural(a.origem)}, seen from far away.` : '' // KINEO-S25-APRESENTADOR-2026-10-06
} // KINEO-S25-APRESENTADOR-2026-10-06
/** Para onde olha a pessoa citada pela fala: o mapa do lugar da cena, ou um livro. */ // KINEO-S25-APRESENTADOR-2026-10-06
const trabalhoNaCena = (lugar: string | null) => (lugar ? `an old map of ${natural(lugar)} spread out in front of them` : 'an old book open in front of them') // KINEO-S25-APRESENTADOR-2026-10-06
const ATIVIDADE_RE = /\b(?:hold(?:s|ing)?|held|read(?:s|ing)?|stud(?:y|ies|ying|ied)|examin\w*|inspect\w*|writ(?:e|es|ing)|wrote|sketch\w*|draw(?:s|ing)?|drew|trac(?:e|es|ing|ed)|point(?:s|ing|ed)?|leaf(?:s|ing)?|bent over|bend(?:s|ing)? over|lean(?:s|ing|ed)? over|work(?:s|ing|ed)?|dig(?:s|ging)?|measur\w*|compar\w*|consult\w*|annotat\w*|unroll\w*|unfold\w*|eyes on)\b/i // KINEO-S25-APRESENTADOR-2026-10-06
/** A frase da pessoa ganha o trabalho na cena (", studying an old map of …") quando a pessoa só posa. */ // KINEO-S25-APRESENTADOR-2026-10-06
function comTrabalho(nucleo: string, ficha: string, papelRe: RegExp, trabalho: string): string { // KINEO-S25-APRESENTADOR-2026-10-06
  const fs = frases(nucleo) // KINEO-S25-APRESENTADOR-2026-10-06
  if (!fs.length) return nucleo // KINEO-S25-APRESENTADOR-2026-10-06
  const k = Math.max(0, fs.findIndex((f) => pessoaDaFichaNaCena(f, ficha, papelRe))) // KINEO-S25-APRESENTADOR-2026-10-06
  fs[k] = `${fs[k].replace(/[.!?]+$/, '')}, ${trabalho}.` // KINEO-S25-APRESENTADOR-2026-10-06
  return fs.join(' ') // KINEO-S25-APRESENTADOR-2026-10-06
} // KINEO-S25-APRESENTADOR-2026-10-06
/** Frase que pertence ao apresentador (ele, o cenário dele, ou o olhar que sobrou dele) — sai junto com ele. */ // KINEO-S25-APRESENTADOR-2026-10-06
const fraseDoApresentador = (f: string, ficha: string, papelRe: RegExp) => pessoaDaFichaNaCena(f, ficha, papelRe) || PRONOME_PESSOA_RE.test(f) || CENARIO_DO_APRESENTADOR_RE.test(f) || f.includes(OLHAR_NA_CENA) // KINEO-S25-APRESENTADOR-2026-10-06
// O enquadramento de retrato que o GPT escreveu para o apresentador ("Medium shot, …") contradiria o "Wide shot of …" refeito. // KINEO-S25-APRESENTADOR-2026-10-06
const ENQUADRAMENTO_DE_PESSOA_RE = /\b(?:extreme\s+)?(?:medium(?:[- ](?:close|wide))?[- ]?(?:up|shot)|close[- ]?up(?:\s+shot)?|mid[- ]shot|waist[- ]up(?:\s+shot)?|head[- ]and[- ]shoulders(?:\s+shot)?|portrait\s+(?:shot|framing))\b[,;]?\s*/gi // KINEO-S25-APRESENTADOR-2026-10-06
const semEnquadramentoDePessoa = (t: string) => limpa((t ?? '').replace(ENQUADRAMENTO_DE_PESSOA_RE, ' ')).replace(/\s+([,.;])/g, (_m: string, p: string) => p).replace(/,\s*\./g, '.').replace(/^[,;.\s]+/, '').replace(/(^|[.!?]\s+)([a-z])/g, (_m: string, a: string, b: string) => a + b.toUpperCase()) // KINEO-S25-APRESENTADOR-2026-10-06
// ── fim do bloco KINEO-S25-APRESENTADOR-2026-10-06 ──
/** A environmentSheet com a época do filme — vai à âncora de ambiente do S25 (que antes nascia sem trava). */
export function ambienteComEpoca(environmentSheet: string, epoca: string): string {
  const e = semPontoFinal(environmentSheet)
  // KINEO-S25-APRESENTADOR-2026-10-06 — o escritório/estúdio do apresentador sem lugar nenhum da história vira o mundo da história: a própria época/lugar
  if (epoca && e && cenarioDeApresentador(e)) { const lugar = lugarDaEpoca(epoca); if (!lugar || !mencionaLugar(e, lugar)) return semPontoFinal(epoca) } // KINEO-S25-APRESENTADOR-2026-10-06
  return epoca && e ? `${e}. ${semPontoFinal(epoca)}` : environmentSheet
}

/** A época do FILME inteiro (1º ano/era + lugar único ou de origem) — a mesma do relato; vai à âncora de ambiente. */
export function epocaDoFilmeS25(roteiro: string, idioma: IdiomaS25 = 'en'): string {
  const base = epocaDoRoteiro(roteiro)
  const lugares = lugaresDoTexto(roteiro, idioma)
  return fraseDeEpoca({ ano: base.ano, decada: base.decada, sufixo: base.sufixo, depoisDe: null, era: base.era, lugar: lugares.length === 1 ? lugares[0] : lugares[0] ?? null })
}

/**
 * O plano das cenas do S25. Para cada cena não-diálogo: (1) época e lugar da cena (fala → plano do GPT validado pelo roteiro
 * → lugar único do filme); (2) frase abstrata ganha imagem concreta; (3) duas cenas seguidas com a mesma composição: a que
 * menos mostra a própria fala troca de plano; (4) abertura repetida ganha rótulo de plano; (5) o prompt nasce
 * núcleo visual → época → eixo → resto (câmera/look), com o "sem texto" e o "sem extras" sem substantivos.
 * Cena de diálogo = null (intocada). Determinístico: mesma entrada, mesma saída.
 */
export function planejarCenasS25(input: { cenas: CenaS25Entrada[]; roteiro: string; characterSheet?: string | null; styleSheet?: string | null; idioma?: IdiomaS25 }): { cenas: Array<CenaS25 | null>; relato: RelatoS25 } {
  const idioma = input.idioma ?? 'en'
  const ficha = limpa(input.characterSheet ?? '').replace(/[.\s]+$/, '')
  const estilo = limpa(input.styleSheet ?? '').replace(/[.\s]+$/, '')
  const roteiro = input.roteiro ?? ''
  const base = epocaDoRoteiro(roteiro)
  const lugares = lugaresDoTexto(roteiro, idioma)
  const lugarUnico = lugares.length === 1 ? lugares[0] : null
  const origem = lugares[0] ?? null
  const n = input.cenas.length
  const ativo = input.cenas.map((c) => c.type !== 'dialogue')
  const partes = input.cenas.map((c) => separarNucleo(c.prompt ?? ''))
  const abstratas: Array<TipoAbstrato | null> = input.cenas.map((c, i) => (ativo[i] ? tipoAbstrato(c.voiceover ?? '') : null))
  // época e lugar por cena — estado que viaja de cena em cena (o ano dito vale até o próximo)
  let anoAtual = base.ano
  const epocas: Array<EpocaCena | null> = input.cenas.map((c, i) => {
    const fala = c.voiceover ?? ''
    const proprio = anosDoTexto(fala)
    const salto = saltoDeTempo(fala)
    let ano = anoAtual
    let decada = base.decada
    let depoisDe: number | null = null
    if (proprio.length) { ano = proprio[0].ano; decada = proprio[0].decada }
    else if (salto && 'anos' in salto && ano !== null) { ano = ano + salto.anos; decada = false }
    else if (salto && 'decadas' in salto && ano !== null) depoisDe = ano
    anoAtual = depoisDe !== null ? anoAtual : ano
    const daFala = lugaresDoTexto(fala, idioma)[0] ?? null
    const doPlano = lugares.find((l) => (partes[i].nucleo || c.prompt || '').includes(l.split(',')[0])) ?? null
    // o legado volta à ORIGEM do filme (é o lugar que a imagem concreta mostra)
    const lugar = abstratas[i] === 'legado' && origem ? origem : daFala ?? doPlano ?? lugarUnico
    const e = { ano: ano ?? null, decada, sufixo: base.sufixo, depoisDe, era: base.era, lugar }
    return ativo[i] ? { ...e, frase: fraseDeEpoca(e) } : null
  })
  const cenario = (i: number) => cenarioDominante(partes.slice(0, i).map((p) => p.nucleo))
  const contagem: Record<string, number> = {}
  const nucleos: string[] = partes.map((p) => p.nucleo)
  const motivos: string[] = input.cenas.map(() => '')
  abstratas.forEach((t, i) => {
    if (!t) return
    const variante = contagem[t] ?? 0
    contagem[t] = variante + 1
    nucleos[i] = imagemConcreta(t, { fala: input.cenas[i].voiceover ?? '', lugar: epocas[i]?.lugar ?? null, origem, cenario: cenario(i), salto: saltoDeTempo(input.cenas[i].voiceover ?? ''), mesBase: base.mes, variante })
    motivos[i] = `frase abstrata (${t}) → imagem concreta`
  })
  // KINEO-S25-APRESENTADOR-2026-10-06 — (1) olhar para a lente vira olhar dentro da cena em TODA cena; (2) a pessoa da ficha com papel de
  // narrador/apresentador que a fala da cena não cita sai: o núcleo nasce da fala (a época da cena entra na montagem, como em toda cena); // KINEO-S25-APRESENTADOR-2026-10-06
  // citada, fica sem lente e trabalhando na cena. Frase abstrata já ganhou a imagem do código (o apresentador saiu com o núcleo antigo). // KINEO-S25-APRESENTADOR-2026-10-06
  const papel = papelDeApresentador(ficha) // KINEO-S25-APRESENTADOR-2026-10-06
  const apresentador: Array<ApresentadorS25 | null> = input.cenas.map(() => null) // KINEO-S25-APRESENTADOR-2026-10-06
  const olharLente: number[] = input.cenas.map(() => 0) // KINEO-S25-APRESENTADOR-2026-10-06
  let refeitas = 0 // KINEO-S25-APRESENTADOR-2026-10-06
  nucleos.forEach((nu, i) => { // KINEO-S25-APRESENTADOR-2026-10-06
    if (!ativo[i]) return // KINEO-S25-APRESENTADOR-2026-10-06
    const fala = input.cenas[i].voiceover ?? '' // KINEO-S25-APRESENTADOR-2026-10-06
    const lugarDaCena = epocas[i]?.lugar ?? null // KINEO-S25-APRESENTADOR-2026-10-06
    const olhar = olharNaCena(nu) // KINEO-S25-APRESENTADOR-2026-10-06
    olharLente[i] = olhar.trocas // KINEO-S25-APRESENTADOR-2026-10-06
    if (!papel || abstratas[i] || !pessoaDaFichaNaCena(nu, ficha, papel.re)) { // KINEO-S25-APRESENTADOR-2026-10-06
      nucleos[i] = olhar.texto // KINEO-S25-APRESENTADOR-2026-10-06
      if (olhar.trocas) motivos[i] = motivos[i] || 'olhar para a lente → olhar dentro da cena' // KINEO-S25-APRESENTADOR-2026-10-06
      return // KINEO-S25-APRESENTADOR-2026-10-06
    } // KINEO-S25-APRESENTADOR-2026-10-06
    const citada = falaCitaPessoa(fala, papel.re, ficha) // KINEO-S25-APRESENTADOR-2026-10-06
    if (citada === 'pessoa') { // KINEO-S25-APRESENTADOR-2026-10-06 — personagem da história ("She drilled…"): fica fazendo a ação da fala, só sem lente
      nucleos[i] = olhar.texto // KINEO-S25-APRESENTADOR-2026-10-06
      apresentador[i] = 'na_historia' // KINEO-S25-APRESENTADOR-2026-10-06
      motivos[i] = 'pessoa da ficha citada na fala (pronome/nome) → fica, sem lente' // KINEO-S25-APRESENTADOR-2026-10-06
      return // KINEO-S25-APRESENTADOR-2026-10-06
    } // KINEO-S25-APRESENTADOR-2026-10-06
    if (citada === 'papel') { // KINEO-S25-APRESENTADOR-2026-10-06
      // já trabalha (segura, lê, examina…): o olhar vai para o trabalho; só posa: o olhar vai para o mapa/livro, ou ganha "studying …" // KINEO-S25-APRESENTADOR-2026-10-06
      const jaTrabalha = ATIVIDADE_RE.test(nu) // KINEO-S25-APRESENTADOR-2026-10-06
      const objeto = jaTrabalha ? 'the work in their hands' : trabalhoNaCena(lugarDaCena) // KINEO-S25-APRESENTADOR-2026-10-06
      const naHistoria = olharNaCena(nu, objeto) // KINEO-S25-APRESENTADOR-2026-10-06
      nucleos[i] = jaTrabalha || naHistoria.trocas > 0 ? naHistoria.texto : comTrabalho(naHistoria.texto, ficha, papel.re, `studying ${objeto}`) // KINEO-S25-APRESENTADOR-2026-10-06
      apresentador[i] = 'na_historia' // KINEO-S25-APRESENTADOR-2026-10-06
      motivos[i] = `apresentador citado na fala (${papel.papel}) → fica, sem lente, trabalhando na cena` // KINEO-S25-APRESENTADOR-2026-10-06
      return // KINEO-S25-APRESENTADOR-2026-10-06
    } // KINEO-S25-APRESENTADOR-2026-10-06
    const ficam = frases(olhar.texto).filter((f) => !fraseDoApresentador(f, ficha, papel.re)) // KINEO-S25-APRESENTADOR-2026-10-06
    const imagem = imagemDaFala({ fala, lugar: lugarDaCena, origem, idioma, variante: refeitas, cenario: cenario(i) }) // KINEO-S25-APRESENTADOR-2026-10-06
    nucleos[i] = limpa(`${imagem} ${ficam.join(' ')}`) // KINEO-S25-APRESENTADOR-2026-10-06
    refeitas++ // KINEO-S25-APRESENTADOR-2026-10-06
    apresentador[i] = 'fora' // KINEO-S25-APRESENTADOR-2026-10-06
    motivos[i] = 'apresentador fora da história → imagem da fala' // KINEO-S25-APRESENTADOR-2026-10-06
  }) // KINEO-S25-APRESENTADOR-2026-10-06
  // KINEO-S25-APRESENTADOR-2026-10-06 — núcleo refeito (como o da frase abstrata) é imagem do código: o plano vem dele, não da direção que o GPT escreveu para o apresentador
  const planos: PlanoTipo[] = nucleos.map((nu, i) => planoDe(`${nu} ${abstratas[i] || apresentador[i] === 'fora' ? '' : partes[i].resto}`)) // KINEO-S25-APRESENTADOR-2026-10-06 (+ || apresentador[i] === 'fora')
  const planosOriginais = [...planos]
  const termos: string[][] = nucleos.map((nu) => termosDe(nu, ficha))
  const termosFala = input.cenas.map((c) => termosDe(c.voiceover ?? ''))
  const ajuste = (i: number) => { const tf = termosFala[i]; return tf.length === 0 ? 0 : sobreposicao(termos[i], tf).comuns.length / tf.length }
  const trocou: boolean[] = input.cenas.map(() => false)
  const vizinhosDe = (k: number) => [k - 1, k + 1].filter((v) => v >= 0 && v < n && ativo[v])
  // Troca o plano da cena `alvo`: plano novo diferente do dela e dos DOIS vizinhos; foco = pedaços nominais da PRÓPRIA fala que
  // não repetem o conteúdo dos vizinhos; frases do núcleo antigo que não repetem os vizinhos ficam (a ficha do personagem fica).
  const trocar = (alvo: number, causa: number) => {
    const viz = vizinhosDe(alvo)
    const proibidos = new Set<PlanoTipo>([planos[alvo], ...viz.map((v) => planos[v])])
    let novo: PlanoTipo = ROTACAO[alvo % ROTACAO.length]
    for (let k = 0; k < ROTACAO.length; k++) { const p = ROTACAO[(alvo + k) % ROTACAO.length]; if (!proibidos.has(p)) { novo = p; break } }
    const tViz = new Set(viz.flatMap((v) => termos[v]))
    const livre = (p: string) => !p.split(' ').some((w) => tViz.has(radical(w)))
    // a fala em pt/es não vira foco de um prompt em inglês: aí o foco vem do próprio núcleo (escrito em inglês pelo planejador)
    const foco = idioma === 'en' ? pedacosNominais(input.cenas[alvo].voiceover ?? '').filter(livre).slice(0, 2) : []
    const focoFinal = foco.length ? foco : pedacosNominais(nucleos[alvo]).filter(livre).slice(0, 2)
    const plano = fraseDePlano(novo, juntaFoco(focoFinal), epocas[alvo]?.lugar ?? null)
    const ficam = frases(nucleos[alvo]).filter((f) => (ficha && f.includes(ficha.slice(0, 40))) || !termosDe(f, ficha).some((t) => tViz.has(t)))
    nucleos[alvo] = limpa(`${plano} ${ficam.join(' ')}`)
    planos[alvo] = novo
    termos[alvo] = termosDe(nucleos[alvo], ficha)
    trocou[alvo] = true
    motivos[alvo] = `${motivos[alvo] ? `${motivos[alvo]}; ` : ''}mesma composição da cena ${causa + 1} → plano ${novo}` // KINEO-S25-APRESENTADOR-2026-10-06 (o motivo do apresentador/olhar não some na troca)
  }
  for (let i = 1; i < n; i++) {
    if (!ativo[i] || !ativo[i - 1]) continue
    if (!colidem(planos[i - 1], termos[i - 1], planos[i], termos[i]).colide) continue
    // troca quem menos mostra a própria fala; frase abstrata (imagem escolhida pelo código) e cena já trocada não trocam de novo
    const fixo = (k: number) => Boolean(abstratas[k]) || trocou[k]
    const alvo = fixo(i - 1) ? i : fixo(i) ? i - 1 : ajuste(i - 1) + 0.15 < ajuste(i) ? i - 1 : i
    trocar(alvo, alvo === i ? i - 1 : i)
  }
  // relato: a sobreposição FINAL de cada par seguido (depois das trocas)
  const sobreAnterior: number[] = input.cenas.map(() => 0)
  const comunsAnterior: string[][] = input.cenas.map(() => [])
  for (let i = 1; i < n; i++) {
    if (!ativo[i] || !ativo[i - 1]) continue
    const c = colidem(planos[i - 1], termos[i - 1], planos[i], termos[i])
    sobreAnterior[i] = Math.round(c.coef * 100) / 100
    comunsAnterior[i] = c.comuns
  }
  // abertura repetida (mesmas 6 primeiras palavras de uma cena anterior) ganha o rótulo do plano na frente
  const vistas = new Set<string>()
  nucleos.forEach((nu, i) => {
    if (!ativo[i]) return
    let ab = abertura(nu)
    if (vistas.has(ab)) {
      const p = planos[i] === 'indefinido' ? ROTACAO[i % ROTACAO.length] : planos[i]
      nucleos[i] = `${ROTULO[p]}: ${nu}`
      if (planos[i] === 'indefinido') planos[i] = p
      motivos[i] = motivos[i] || 'abertura repetida → rótulo de plano'
      ab = abertura(nucleos[i])
    }
    vistas.add(ab)
  })
  const cenas: Array<CenaS25 | null> = input.cenas.map((c, i) => {
    if (!ativo[i]) return null
    // idempotente: época/eixo de uma passada anterior saem antes de entrar de novo
    let resto = ` ${partes[i].resto}`.split(EIXO_S25).join(' ').replace(EPOCA_JA_DITA_RE, ' ')
    resto = resto.split(SEM_TEXTO_ROTEADOR.trim()).join(SEM_TEXTO_S25.trim()).replace(SEM_EXTRAS_RE, SEM_EXTRAS_S25)
    const olharResto = olharNaCena(resto) // KINEO-S25-APRESENTADOR-2026-10-06 — o olhar para a lente sai também da direção (resto)
    resto = olharResto.texto // KINEO-S25-APRESENTADOR-2026-10-06
    olharLente[i] += olharResto.trocas // KINEO-S25-APRESENTADOR-2026-10-06
    // KINEO-S25-APRESENTADOR-2026-10-06 — apresentador fora: as frases dele (ele, o cenário dele) e o enquadramento de retrato saem da direção também
    if (apresentador[i] === 'fora' && papel) resto = semEnquadramentoDePessoa(frases(resto).filter((f) => !fraseDoApresentador(f, ficha, papel.re)).join(' ')) // KINEO-S25-APRESENTADOR-2026-10-06
    if (estilo && !/Cinematography \(match exactly\)/i.test(resto)) resto += ` Cinematography (match exactly): ${estilo}.`
    if (!/No readable text/i.test(resto)) resto += SEM_TEXTO_S25
    const nucleoFinal = limpa((nucleos[i] || pedacosNominais(c.voiceover ?? '').slice(0, 2).join(' and ') || 'The scene').replace(SEM_EXTRAS_RE, SEM_EXTRAS_S25))
    const epoca = epocas[i]?.frase ?? ''
    const prompt = limpa(`${/[.!?]$/.test(nucleoFinal) ? nucleoFinal : `${nucleoFinal}.`} ${epoca} ${EIXO_S25} ${resto}`)
    return {
      indice: i, prompt, nucleo: nucleoFinal, nucleoOriginal: partes[i].nucleo, epoca, ano: epocas[i]?.ano ?? null, lugar: epocas[i]?.lugar ?? null,
      plano: planos[i], planoOriginal: planosOriginais[i], abstrata: abstratas[i], trocou: trocou[i], motivo: motivos[i] || 'mantida',
      sobreposicaoAnterior: sobreAnterior[i], comunsAnterior: comunsAnterior[i],
      apresentador: apresentador[i], olharLente: olharLente[i], // KINEO-S25-APRESENTADOR-2026-10-06
    }
  })
  const ativas = cenas.filter((c): c is CenaS25 => c !== null)
  const aberturas = ativas.map((c) => abertura(c.prompt))
  return {
    cenas,
    relato: {
      versao: S25_CENA_VERSAO,
      cenas_s25: ativas.length,
      epoca_base: epocaDoFilmeS25(roteiro, idioma),
      lugares,
      abstratas: ativas.filter((c) => c.abstrata).length,
      trocas: ativas.filter((c) => c.trocou).length,
      aberturas_distintas: new Set(aberturas).size === aberturas.length,
      papel_apresentador: papel?.papel ?? null, // KINEO-S25-APRESENTADOR-2026-10-06
      apresentador_fora: ativas.filter((c) => c.apresentador === 'fora').length, // KINEO-S25-APRESENTADOR-2026-10-06
      apresentador_na_historia: ativas.filter((c) => c.apresentador === 'na_historia').length, // KINEO-S25-APRESENTADOR-2026-10-06
      olhar_lente: ativas.filter((c) => c.olharLente > 0).length, // KINEO-S25-APRESENTADOR-2026-10-06
      cenas: ativas.map((c) => ({ cena: c.indice + 1, plano: c.plano, plano_original: c.planoOriginal, abstrata: c.abstrata, trocou: c.trocou, motivo: c.motivo, epoca: c.epoca, sobreposicao_anterior: c.sobreposicaoAnterior, comuns_anterior: c.comunsAnterior, abertura: abertura(c.prompt), apresentador: c.apresentador, olhar_lente: c.olharLente })), // KINEO-S25-APRESENTADOR-2026-10-06 (+ apresentador, olhar_lente)
    },
  }
}

/** A montagem final do S25 (no laço, depois do still e da fidelidade): o prompt da cena (que já abre com o visual único e
 *  traz a época) + o aviso curto de câmera + o sufixo de boca fechada + o de nitidez. O eraSuffix longo da rota só entra
 *  como reserva quando a cena não ganhou frase de época (roteiro sem ano/era que o detector clássico pegou). */
export function montarPromptS25(a: { promptCena: string; epoca: string; eraReserva: string; mouthSuffix: string; spectacleSuffix: string }): string {
  const reserva = a.epoca ? '' : (a.eraReserva ?? '')
  return `${limpa(a.promptCena)}${reserva}${AVISO_CAMERA_S25}${a.mouthSuffix ?? ''}${a.spectacleSuffix ?? ''}`
}
