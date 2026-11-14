// ═══ KINEO-ATRIBUTOS-DO-PEDIDO-1311 [CEO 13/11, item 3.1: "os atributos ditos no pedido extraídos uma vez e repetidos em TODO plano que mostra
// o sujeito, e o juiz do plano conferindo cada um"] ═════════════════════════════════════════════════════════════════════════════════════
// CENA_FORA_DO_PEDIDO em 4 de 5 filmes de cliente de 13/11. O caso que ficou depois do conserto da aparência do sujeito (KINEO-APARENCIA-
// DO-PEDIDO-1311, que leva a cor do bicho/pessoa NOMEADO): e3c00f5c (nota 5) — "famous players as teens … Students in navy uniforms": o plano 1
// disse "teenage football players" SEM o azul-marinho, o plano 2 disse "navy-uniformed students" e o 3 nenhum dos dois; vieram crianças de
// vermelho. O atributo do GRUPO e do CENÁRIO (roupa do grupo, faixa de idade, clima) ficava só no plano cuja frase o citava.
//
// A REGRA v2 (código, sem GPT, só o texto do PEDIDO — nunca o roteiro do nosso escritor; revisão da CEO de 14/11, bloqueios 1 e 2):
//   · SÓ EM IDEIA CURTA: o pedido é a ideia do cliente (a tela mandou ou o servidor recuperou) ou tem até 60 palavras. Roteiro colado longo
//     fica como está (uma menção a chuva iria a 8–12 planos de um filme pago) — limite declarado.
//   · ROUPA só do GRUPO: peça colada a um substantivo de gente NO PLURAL ("students in navy uniforms", "navy-uniformed students"). Peça de UMA
//     pessoa ("a woman in a red dress") é da ficha dela, que já existe, e nunca vira roupa de todos. A frase amarra ao grupo do pedido:
//     "The students wear navy uniforms."
//   · IDADE só quando o pedido não cita um adulto ao lado (teacher, coach, mother, grandfather, man, woman…): "a grandfather telling stories
//     to kids" não vira "todos crianças". Frase: "The people in this shot are teenagers."
//   · CLIMA só quando é UM estado afirmado: fora "no rain"/"without rain"/"not raining"; fora pedido com dois estados de tempo ou palavra de
//     mudança na mesma frase ("the storm passes and the sun comes out"); fora nome próprio ("Snow White", "Jon Snow", "Purple Rain").
//     Frase: "Weather outside, wherever the sky is visible: heavy rain." (não chove dentro de casa).
//   · a frase vai ANTES da ficha final ("The same main character appears in this scene, consistent design: …"), porque o compactador do
//     Kling 4 descarta o que vem depois dela; sem ficha, no fim. Nada da cena é cortado. Idade em conflito no pedido = nenhuma.
//   · a conferência (o "juiz" pedido, em código): o relato diz, plano a plano, o que faltava e o que entrou. Gravado no evento.
// Pedido em outra língua: as listas são em inglês; sem achado, nada muda (limite declarado). Interruptor ATRIBUTOS_DO_PEDIDO_1311.
// Guardião: scripts/test-atributos-do-pedido-1311.mjs.

export type ModoAtributos = 'off' | 'all'
export const ATRIBUTOS_DO_PEDIDO_1311: ModoAtributos = 'off' // DESLIGADO em 14/11 (revisão independente, bloqueio B3: idade, clima e roupa disparavam errado em pedidos reais). Só religa reescrito, com o ensaio no banco real sem disparo errado e o sim da CEO.
export const atributosLigados = (modo: ModoAtributos = ATRIBUTOS_DO_PEDIDO_1311) => modo === 'all'
export const ATRIBUTOS_VERSAO = 'atributos_do_pedido_1311_v2'
export const ATRIBUTOS_EVENTO = 'cinematic_request_attributes'
export const PEDIDO_CURTO_MAX_PALAVRAS = 60

const CORES = 'navy blue|navy|red|blue|green|yellow|orange|white|black|gray|grey|pink|purple|brown|beige|golden|gold|silver|maroon|teal|turquoise|cream'
const ROUPA = 't-shirts?|uniforms?|jerseys?|shirts?|dresses|dress|coats?|jackets?|hoodies?|suits?|kits?|sweaters?|scarves|scarf|robes?|gowns?|overalls'
const GRUPOS = 'students|pupils|players|footballers|teens|teenagers|kids|children|soldiers|workers|dancers|nurses|doctors|girls|boys|men|women|people|friends|guests|monks|athletes|runners|singers|musicians|waiters|chefs|scouts|cheerleaders|officers|guards|sailors|pilots|firefighters|farmers|schoolchildren|schoolgirls|schoolboys'
const GRUPO_VESTE_RE = new RegExp(`(?<![\\p{L}-])(${GRUPOS})\\s+(?:all\\s+)?(?:in|wearing|dressed in|wear)\\s+(?:their\\s+|matching\\s+|identical\\s+|a\\s+|an\\s+)?((?:light |dark |bright )?(?:${CORES}))[ -](${ROUPA})(?![\\p{L}])`, 'giu')
const UNIFORMIZADO_RE = new RegExp(`(?<![\\p{L}-])(${CORES})-uniformed\\s+(${GRUPOS})(?![\\p{L}])`, 'giu')
const IDADES: ReadonlyArray<[string, RegExp]> = [
  ['teenagers', /(?<![\p{L}])(?:teen(?:age(?:rs?)?|s)?|adolescents?)(?![\p{L}])/iu],
  ['children', /(?<![\p{L}])(?:toddlers?|kids|children|little (?:boys|girls))(?![\p{L}])/iu],
  ['elderly people', /(?<![\p{L}])(?:elderly|seniors|old (?:men|women|people))(?![\p{L}])/iu],
]
/** Um adulto citado ao lado: a faixa de idade do grupo não vale para "todos". */
const ADULTO_RE = /(?<![\p{L}])(?:teachers?|coach(?:es)?|mothers?|fathers?|mom|mum|dad|parents?|grand(?:father|mother|pa|ma|parents?)|uncle|aunt|man|woman|men|women|adults?|professors?|principal|king|queen|doctors?|nurses?|drivers?|soldiers?|police(?:man|woman)?|officers?|priest|boss|husband|wife)(?![\p{L}])/iu
const CLIMAS: ReadonlyArray<[string, RegExp]> = [
  ['heavy rain', /(?<![\p{L}])(?:(?:heavy|pouring|torrential|driving) rain|downpour)(?![\p{L}])/giu],
  ['rain', /(?<![\p{L}])(?:rain|raining|rainy)(?![\p{L}])/giu],
  ['snow', /(?<![\p{L}])(?:snow|snowing|snowy|snowfall|blizzard)(?![\p{L}])/giu],
  ['a storm', /(?<![\p{L}])(?:storm|stormy|thunderstorm)(?![\p{L}])/giu],
  ['thick fog', /(?<![\p{L}])(?:fog|foggy|mist|misty)(?![\p{L}])/giu],
]
/** Outro estado de tempo no pedido (sol, céu limpo): dois estados = o tempo muda no filme, nenhum vai a todo plano. */
const TEMPO_BOM_RE = /(?<![\p{L}])(?:sunny|sunshine|the sun (?:comes|came) out|clear (?:blue )?sk(?:y|ies)|bright sun)(?![\p{L}])/iu
const NEGACAO_ANTES_RE = /(?<![\p{L}])(?:no|not|without|never|isn['’]?t|wasn['’]?t|doesn['’]?t|didn['’]?t|free of|instead of)\s+(?:[\p{L}'’-]+\s+){0,2}$/iu
const MUDANCA_RE = /(?<![\p{L}])(?:then|after|afterwards?|until|before|later|finally|stops?|stopped|clears?|cleared|passes|passed|ends?|ended|gives way|turns? (?:in)?to|fades?)(?![\p{L}])/iu
const GENTE_RE = /(?<![\p{L}])(?:woman|women|man|men|girls?|boys?|persons?|people|she|her|he|his|him|someone|lady|guy|students?|players?|footballers?|teenagers?|teens?|kids|children|crowd|team|spectators?|athletes?|friends|family|couple|(?:football|soccer|basketball|pop|rock|movie|film) stars?)(?![\p{L}])/iu
const FICHA_FINAL = 'The same main character appears in this scene, consistent design:'

export interface RoupaDoGrupo { grupo: string; roupa: string }
export interface AtributosDoPedido { versao: string; roupa: RoupaDoGrupo[]; idade: string | null; clima: string | null }

const palavras = (t: string) => t.trim().split(/\s+/u).filter(Boolean).length
const fraseDe = (t: string, i: number) => {
  const ini = Math.max(t.lastIndexOf('.', i - 1), t.lastIndexOf('!', i - 1), t.lastIndexOf('?', i - 1), t.lastIndexOf('\n', i - 1)) + 1
  const fins = ['.', '!', '?', '\n'].map((c) => t.indexOf(c, i)).filter((x) => x >= 0)
  return { ini, texto: t.slice(ini, fins.length ? Math.min(...fins) : t.length) }
}
/** A menção ao tempo vale? Fora negada, fora nome próprio, fora frase com palavra de mudança. */
function climaAfirmado(t: string, m: RegExpMatchArray): boolean {
  const i = m.index ?? 0, palavra = m[0]
  const f = fraseDe(t, i)
  const inicioDeFrase = t.slice(f.ini, i).trim() === ''
  const maiuscula = /^\p{Lu}/u.test(palavra)
  if (maiuscula && (!inicioDeFrase || /^\s+\p{Lu}/u.test(t.slice(i + palavra.length)))) return false // "Jon Snow", "Purple Rain", "Snow White"
  if (NEGACAO_ANTES_RE.test(t.slice(Math.max(0, i - 40), i))) return false // "no rain", "without any rain"
  if (MUDANCA_RE.test(f.texto)) return false // "the storm passes and…", "until the rain stops"
  return true
}

/** Os atributos que o PEDIDO diz do grupo e do cenário. `ehIdeia` = a ideia do cliente (tela ou recuperada); senão só até 60 palavras. Pura. */
export function atributosDoPedido(pedido: string | null | undefined, o: { ehIdeia?: boolean } = {}): AtributosDoPedido | null {
  const t = String(pedido ?? '')
  if (!t.trim()) return null
  if (!o.ehIdeia && palavras(t) > PEDIDO_CURTO_MAX_PALAVRAS) return null
  const roupa = new Map<string, RoupaDoGrupo>()
  const plural = (peca: string) => (/(?:s|overalls)$/.test(peca) ? peca : peca === 'dress' ? 'dresses' : peca === 'scarf' ? 'scarves' : `${peca}s`)
  for (const m of t.matchAll(GRUPO_VESTE_RE)) roupa.set(m[1].toLowerCase(), { grupo: m[1].toLowerCase(), roupa: `${m[2].toLowerCase()} ${plural(m[3].toLowerCase())}` })
  for (const m of t.matchAll(UNIFORMIZADO_RE)) roupa.set(m[2].toLowerCase(), { grupo: m[2].toLowerCase(), roupa: `${m[1].toLowerCase()} uniforms` })
  const idades = ADULTO_RE.test(t) ? [] : IDADES.filter(([, re]) => re.test(t)).map(([n]) => n)
  const climas = CLIMAS.filter(([, re]) => [...t.matchAll(re)].some((m) => climaAfirmado(t, m))).map(([n]) => n)
  // chuva forte, chuva e tempestade são o MESMO tempo (vale a mais forte); chuva + neve ou + neblina são dois estados = nenhum
  const FAMILIA_DA_CHUVA = ['heavy rain', 'a storm', 'rain']
  const unicos = climas.every((c) => FAMILIA_DA_CHUVA.includes(c)) && climas.length ? [FAMILIA_DA_CHUVA.find((c) => climas.includes(c)) as string] : climas
  const clima = unicos.length === 1 && !TEMPO_BOM_RE.test(t) ? unicos[0] : null
  const r: AtributosDoPedido = { versao: ATRIBUTOS_VERSAO, roupa: [...roupa.values()].slice(0, 2), idade: idades.length === 1 ? idades[0] : null, clima }
  return r.roupa.length || r.idade || r.clima ? r : null
}

const diz = (texto: string, frase: string) => {
  const t = texto.toLowerCase()
  return frase.toLowerCase().split(/\s+/).every((w) => t.includes(w.replace(/s$/, '')))
}
const dizIdade = (texto: string, idade: string) => (IDADES.find(([n]) => n === idade)?.[1] ?? /$^/).test(texto)
const dizClima = (texto: string, clima: string) => new RegExp((CLIMAS.find(([n]) => n === clima)?.[1] ?? /$^/).source, 'iu').test(texto) || (clima === 'heavy rain' && /(?<![\p{L}])rain/iu.test(texto) && /heavy|pouring|torrential|downpour/i.test(texto))

/** Um plano com os atributos que faltam; o relato diz o que faltava e o que entrou. Pura e idempotente. */
export function comAtributosNaCena(prompt: string, a: AtributosDoPedido | null): { prompt: string; faltava: string[] } {
  const p = String(prompt ?? '')
  if (!a) return { prompt: p, faltava: [] }
  const gente = GENTE_RE.test(p.split(FICHA_FINAL)[0])
  const faltaRoupa = gente ? a.roupa.filter((r) => !diz(p, r.roupa)) : []
  const faltaIdade = gente && a.idade && !dizIdade(p, a.idade) ? a.idade : null
  const faltaClima = a.clima && !dizClima(p, a.clima) ? a.clima : null
  const frases: string[] = []
  for (const r of faltaRoupa) frases.push(`The ${r.grupo} wear ${r.roupa}.`)
  if (faltaIdade) frases.push(`The people in this shot are ${faltaIdade}.`)
  if (faltaClima) frases.push(`Weather outside, wherever the sky is visible: ${faltaClima}.`)
  if (!frases.length) return { prompt: p, faltava: [] }
  const faltava = [...faltaRoupa.map((r) => r.roupa), ...(faltaIdade ? [faltaIdade] : []), ...(faltaClima ? [faltaClima] : [])]
  const i = p.indexOf(FICHA_FINAL)
  const novo = i >= 0 ? `${p.slice(0, i).replace(/\s+$/u, '')} ${frases.join(' ')} ${p.slice(i)}` : `${p.replace(/\s+$/u, '')} ${frases.join(' ')}`
  return { prompt: novo, faltava }
}

/** O filme inteiro: cada plano com os atributos do pedido; o relato é a conferência plano a plano. */
export function atributosEmTodoPlano(prompts: ReadonlyArray<string>, pedido: string | null | undefined, o: { ehIdeia?: boolean } = {}) {
  const a = atributosDoPedido(pedido, o)
  const saidas = prompts.map((p) => comAtributosNaCena(p, a))
  return {
    prompts: saidas.map((s) => s.prompt),
    relato: { versao: ATRIBUTOS_VERSAO, eh_ideia: o.ehIdeia === true, atributos: a, planos: saidas.map((s, i) => ({ plano: i + 1, faltava: s.faltava })), mudou: saidas.some((s) => s.faltava.length > 0) },
  }
}
