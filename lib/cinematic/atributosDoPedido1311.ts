// ═══ KINEO-ATRIBUTOS-DO-PEDIDO-1311 [CEO 13/11, item 3.1: "os atributos ditos no pedido extraídos uma vez e repetidos em TODO plano que mostra
// o sujeito, e o juiz do plano conferindo cada um"] ═════════════════════════════════════════════════════════════════════════════════════
// CENA_FORA_DO_PEDIDO em 4 de 5 filmes de cliente de 13/11. O caso que ficou depois do conserto da aparência do sujeito (KINEO-APARENCIA-
// DO-PEDIDO-1311, que leva a cor do bicho/pessoa NOMEADO): e3c00f5c (nota 5) — "famous players as teens … Students in navy uniforms": o plano 1
// disse "teenage football players" SEM o azul-marinho, o plano 2 disse "navy-uniformed students" e o 3 nenhum dos dois; vieram crianças de
// vermelho. O atributo do GRUPO e do CENÁRIO (roupa com cor, faixa de idade, clima) ficava só no plano cuja frase o citava.
//
// A REGRA (código, sem GPT, só o texto do PEDIDO — nunca o roteiro do nosso escritor, que inventa roupa):
//   · roupa com cor ("navy uniforms", "a red dress", "navy-uniformed") e faixa de idade (teens/teenagers/adolescents · children/kids ·
//     elderly) entram em todo plano que mostra gente e ainda não os diz: "Everyone shown: teenagers, wearing navy uniforms.";
//   · clima ("heavy rain", "snow", "storm", "fog") entra em todo plano que ainda não o diz: "Weather in this shot: heavy rain.";
//   · a frase vai ANTES da ficha final ("The same main character appears in this scene, consistent design: …"), porque o compactador do
//     Kling 4 descarta o que vem depois dela; sem ficha, no fim. Nada da cena é cortado. Idade em conflito no pedido = nenhuma.
//   · a conferência (o "juiz" pedido, em código): o relato diz, plano a plano, o que faltava e o que entrou. Gravado no evento.
// Pedido em outra língua: as listas são em inglês; sem achado, nada muda (limite declarado). Interruptor ATRIBUTOS_DO_PEDIDO_1311.
// Guardião: scripts/test-atributos-do-pedido-1311.mjs.

export type ModoAtributos = 'off' | 'all'
export const ATRIBUTOS_DO_PEDIDO_1311: ModoAtributos = 'all'
export const atributosLigados = (modo: ModoAtributos = ATRIBUTOS_DO_PEDIDO_1311) => modo === 'all'
export const ATRIBUTOS_VERSAO = 'atributos_do_pedido_1311_v1'
export const ATRIBUTOS_EVENTO = 'cinematic_request_attributes'

const CORES = 'navy blue|navy|red|blue|green|yellow|orange|white|black|gray|grey|pink|purple|brown|beige|golden|gold|silver|maroon|teal|turquoise|cream'
const ROUPA = 't-shirts?|uniforms?|jerseys?|shirts?|dresses|dress|coats?|jackets?|hoodies?|suits?|kits?|sweaters?|scarves|scarf|robes?|gowns?|overalls'
const ROUPA_RE = new RegExp(`(?<![\\p{L}-])((?:light |dark |bright )?(?:${CORES}))[ -](${ROUPA})(?![\\p{L}])`, 'giu')
const UNIFORMIZADO_RE = new RegExp(`(?<![\\p{L}-])(${CORES})-uniformed(?![\\p{L}])`, 'giu')
const IDADES: ReadonlyArray<[string, RegExp]> = [
  ['teenagers', /(?<![\p{L}])(?:teen(?:age(?:rs?)?|s)?|adolescents?)(?![\p{L}])/iu],
  ['children', /(?<![\p{L}])(?:toddlers?|kids|children|little (?:boys|girls))(?![\p{L}])/iu],
  ['elderly people', /(?<![\p{L}])(?:elderly|seniors|old (?:men|women|people))(?![\p{L}])/iu],
]
const CLIMAS: ReadonlyArray<[string, RegExp]> = [
  ['heavy rain', /(?<![\p{L}])(?:heavy|pouring|torrential|driving) rain(?![\p{L}])|(?<![\p{L}])downpour(?![\p{L}])/iu],
  ['rain', /(?<![\p{L}])(?:rain|raining|rainy)(?![\p{L}])/iu],
  ['snow', /(?<![\p{L}])(?:snow|snowing|snowy|snowfall|blizzard)(?![\p{L}])/iu],
  ['a storm', /(?<![\p{L}])(?:storm|stormy|thunderstorm)(?![\p{L}])/iu],
  ['thick fog', /(?<![\p{L}])(?:fog|foggy|mist|misty)(?![\p{L}])/iu],
]
const GENTE_RE = /(?<![\p{L}])(?:woman|women|man|men|girls?|boys?|persons?|people|she|her|he|his|him|someone|lady|guy|students?|players?|footballers?|teenagers?|teens?|kids|children|crowd|team|spectators?|athletes?|friends|family|couple|(?:football|soccer|basketball|pop|rock|movie|film) stars?)(?![\p{L}])/iu
const FICHA_FINAL = 'The same main character appears in this scene, consistent design:'

export interface AtributosDoPedido { versao: string; roupa: string[]; idade: string | null; clima: string | null }

/** Os atributos que o PEDIDO diz (roupa com cor, faixa de idade, clima). null = nenhum. Pura. */
export function atributosDoPedido(pedido: string | null | undefined): AtributosDoPedido | null {
  const t = String(pedido ?? '')
  if (!t.trim()) return null
  const roupa = new Set<string>()
  for (const m of t.matchAll(ROUPA_RE)) roupa.add(`${m[1].toLowerCase()} ${m[2].toLowerCase().replace(/^(dress)$/, 'dress')}`)
  for (const m of t.matchAll(UNIFORMIZADO_RE)) roupa.add(`${m[1].toLowerCase()} uniforms`)
  const idades = IDADES.filter(([, re]) => re.test(t)).map(([n]) => n)
  const clima = CLIMAS.find(([, re]) => re.test(t))?.[0] ?? null
  const r: AtributosDoPedido = { versao: ATRIBUTOS_VERSAO, roupa: [...roupa].slice(0, 3), idade: idades.length === 1 ? idades[0] : null, clima }
  return r.roupa.length || r.idade || r.clima ? r : null
}

const diz = (texto: string, frase: string) => {
  const t = texto.toLowerCase()
  return frase.toLowerCase().split(/\s+/).every((w) => t.includes(w.replace(/s$/, '')))
}
const dizIdade = (texto: string, idade: string) => (IDADES.find(([n]) => n === idade)?.[1] ?? /$^/).test(texto)
const dizClima = (texto: string, clima: string) => (CLIMAS.find(([n]) => n === clima)?.[1] ?? /$^/).test(texto) || (clima === 'heavy rain' && /(?<![\p{L}])rain/iu.test(texto) && /heavy|pouring|torrential|downpour/i.test(texto))

/** Um plano com os atributos que faltam; o relato diz o que faltava e o que entrou. Pura e idempotente. */
export function comAtributosNaCena(prompt: string, a: AtributosDoPedido | null): { prompt: string; faltava: string[] } {
  const p = String(prompt ?? '')
  if (!a) return { prompt: p, faltava: [] }
  const gente = GENTE_RE.test(p.split(FICHA_FINAL)[0])
  const faltaRoupa = gente ? a.roupa.filter((r) => !diz(p, r)) : []
  const faltaIdade = gente && a.idade && !dizIdade(p, a.idade) ? a.idade : null
  const faltaClima = a.clima && !dizClima(p, a.clima) ? a.clima : null
  const frases: string[] = []
  if (faltaIdade || faltaRoupa.length) frases.push(`Everyone shown: ${[faltaIdade, faltaRoupa.length ? `wearing ${faltaRoupa.join(' and ')}` : null].filter(Boolean).join(', ')}.`)
  if (faltaClima) frases.push(`Weather in this shot: ${faltaClima}.`)
  if (!frases.length) return { prompt: p, faltava: [] }
  const faltava = [...(faltaIdade ? [faltaIdade] : []), ...faltaRoupa, ...(faltaClima ? [faltaClima] : [])]
  const i = p.indexOf(FICHA_FINAL)
  const novo = i >= 0 ? `${p.slice(0, i).replace(/\s+$/u, '')} ${frases.join(' ')} ${p.slice(i)}` : `${p.replace(/\s+$/u, '')} ${frases.join(' ')}`
  return { prompt: novo, faltava }
}

/** O filme inteiro: cada plano com os atributos do pedido; o relato é a conferência plano a plano. */
export function atributosEmTodoPlano(prompts: ReadonlyArray<string>, pedido: string | null | undefined) {
  const a = atributosDoPedido(pedido)
  const saidas = prompts.map((p) => comAtributosNaCena(p, a))
  return {
    prompts: saidas.map((s) => s.prompt),
    relato: { versao: ATRIBUTOS_VERSAO, atributos: a, planos: saidas.map((s, i) => ({ plano: i + 1, faltava: s.faltava })), mudou: saidas.some((s) => s.faltava.length > 0) },
  }
}
