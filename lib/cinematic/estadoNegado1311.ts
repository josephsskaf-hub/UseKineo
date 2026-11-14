// ═══ KINEO-ESTADO-NEGADO-1311 [CEO 13/11, item 3.2: "a fala nega a coisa e a cena mostra a coisa presente e ligada"] ══════════════════════
// 3 de 3 vídeos da casa (H3 Max Turbo, 13/11): "the light is dark" com o farol ACESO, "the fire is cold" com a lareira ACESA, "iron railings
// are torn" com a grade INTEIRA, "planes could not take off" com 6 aviões no ar (ae1da6de, 3a316ecb). Lido no claim do farol (ae1da6de):
//   · o plano até dizia o estado, mas fraco ou no objeto errado: "dust settling on the cold hearth" (adjetivo solto), "torn iron railings";
//     e "the light is dark" (o farol visto do navio) virou "a darkened steamship … its lights extinguished" — o estado no objeto ERRADO;
//   · o motor de vídeo desenha o estado-padrão do objeto (farol aceso, lareira acesa, grade inteira, avião voando) quando o estado é só um
//     adjetivo; e ele não tem prompt negativo ("no fire" pode até puxar fogo).
// A REGRA (código, tabela fixa de objetos cujo estado-padrão é "ligado/inteiro/no ar"; nada de GPT): quando a FALA da cena nega ou desliga um
// desses objetos, o plano ganha uma frase POSITIVA e visual do estado, logo depois da trava do estilo (a frente sobrevive ao corte do Kling 4):
//   "State shown in this shot: a cold fireplace full of grey ashes and charred logs, the hearth dark."
// Só a cena cuja fala diz; plano que já traz a frase fica igual (idempotente). Fala em inglês e em português (as falas da casa e de quem
// escreve em pt); outras línguas: sem achado, nada muda. Interruptor ESTADO_NEGADO_1311. Guardião: scripts/test-estado-negado-1311.mjs.

export type ModoEstadoNegado = 'off' | 'all'
export const ESTADO_NEGADO_1311: ModoEstadoNegado = 'off' // DESLIGADO em 14/11 (revisão independente, bloqueio B2: "the fire was out of control" virava lareira fria). Só religa reescrito, com o ensaio no banco real sem disparo errado e o sim da CEO.
export const estadoNegadoLigado = (modo: ModoEstadoNegado = ESTADO_NEGADO_1311) => modo === 'all'
export const ESTADO_NEGADO_VERSAO = 'estado_negado_1311_v1'
export const ESTADO_NEGADO_EVENTO = 'cinematic_negated_state'
const MARCA = 'State shown in this shot:'

/** [chave, regex na fala, estado positivo e visual] — só objetos cujo padrão do motor é o contrário do que a fala diz. */
export const ESTADOS: ReadonlyArray<readonly [string, RegExp, string]> = [
  ['farol_apagado',
    /\b(?:the\s+)?(?:light|lamp|lantern|beacon|lighthouse)\s+(?:is|was|had|has)\s+(?:gone\s+)?(?:dark|out|off|unlit|extinguished)\b|\b(?:light|lamp|lantern|beacon)s?\s+went\s+(?:dark|out)\b|\b(?:dark|unlit)\s+(?:lighthouse|lamp|lantern|beacon)\b|\b(?:a\s+)?luz(?:\s+d[oa]\s+(?:farol|lâmpada|lanterna))?\s+(?:est[aá]\s+|estava\s+)?(?:apagad[ao]|apagou|escura)\b|\bfarol\s+(?:est[aá]\s+|estava\s+)?apagado\b/i,
    'the lighthouse lamp is switched off, its lantern room dark with black glass, no beam of light anywhere'],
  ['fogo_frio',
    /\b(?:the\s+)?(?:fire|hearth|fireplace|stove|campfire)\s+(?:is|was|had|has)\s+(?:gone\s+)?(?:cold|out|dead)\b|\b(?:fire|flames?)\s+(?:had\s+|has\s+)?(?:gone|burned|burnt|died)\s+out\b|\bcold\s+(?:hearth|fireplace|ashes|stove)\b|\b(?:o\s+)?fogo\s+(?:est[aá]\s+|estava\s+)?(?:frio|apagado)\b|\blareira\s+(?:est[aá]\s+|estava\s+)?(?:fria|apagada)\b/i,
    'a cold fireplace full of grey ashes and charred logs, the hearth dark'],
  ['grade_quebrada',
    /\b(?:railings?|fences?|gates?|barriers?)\s+(?:is|are|was|were|had\s+been|have\s+been)\s+(?:torn|ripped|broken|smashed|bent|twisted)\b|\b(?:torn|ripped|broken|smashed|twisted)(?:\s+(?:iron|metal|steel))?\s+(?:railings?|fences?|gates?)\b|\b(?:grades?|cercas?|corrimãos?)\s+(?:est[aã]o\s+|estavam\s+|foram\s+)?(?:arrancad[ao]s?|quebrad[ao]s?|retorcid[ao]s?)\b/i,
    'twisted, broken iron railings with whole sections ripped out of the rock, jagged gaps where the bars used to be'],
  ['avioes_no_chao',
    /\b(?:planes?|aircraft|jets?|airliners?|flights?)\b[^.!?]{0,60}\b(?:could\s*not|couldn't|cannot|can't|did\s*not|didn't|were\s+unable\s+to|never)\s+(?:take\s+off|fly|depart|leave)\b|\b(?:planes?|aircraft|jets?|airliners?|flights?)\b[^.!?]{0,40}\bgrounded\b|\bgrounded\s+(?:planes?|aircraft|jets?|flights?)\b|\b(?:stop|stopped|halt|halted|cancel(?:l)?ed)\s+(?:every|all)\s+(?:departing\s+)?flights?\b|\bavi[oõ]es\b[^.!?]{0,60}\bn[aã]o\s+(?:puderam|podiam|conseguiram)\s+decolar\b/i,
    'rows of airplanes parked at the gates with their wheels on the tarmac, engines still, none of them moving'],
]

/** Os estados negados que a fala diz (chaves, sem repetir). Pura. */
/** A luz apagada SEM farol na fala nem no plano (cozinha, quarto, rua): a lâmpada comum, nunca um farol inventado. */
export const LUZ_COMUM_APAGADA = 'the lamp is switched off and unlit, the place in deep shadow with only faint ambient light'
const FAROL_RE = /lighthouse|beacon|farol/i
export function estadosDaFala(fala: string | null | undefined, contexto: string | null | undefined = ''): Array<{ chave: string; estado: string }> {
  const t = String(fala ?? '')
  if (!t.trim()) return []
  return ESTADOS.filter(([, re]) => re.test(t)).map(([chave, , estado]) => ({ chave, estado: chave === 'farol_apagado' && !FAROL_RE.test(`${t} ${contexto ?? ''}`) ? LUZ_COMUM_APAGADA : estado }))
}

/** Um plano com o estado da fala na frente (depois da trava do estilo). Idempotente; sem estado = igual. */
export function comEstadoDaFala(prompt: string, fala: string | null | undefined): { prompt: string; chaves: string[] } {
  const p = String(prompt ?? '')
  const estados = estadosDaFala(fala, p).filter((e) => !p.includes(e.estado))
  if (!estados.length) return { prompt: p, chaves: [] }
  const frase = `${MARCA} ${estados.map((e) => e.estado).join('; ')}. `
  const trava = /^Film visual medium: .+?\. /u.exec(p)?.[0] ?? ''
  return { prompt: `${trava}${frase}${p.slice(trava.length)}`, chaves: estados.map((e) => e.chave) }
}

/** O filme inteiro, plano a plano pela fala da mesma cena; o relato vai ao evento. */
export function estadoNegadoNoFilme(prompts: ReadonlyArray<string>, falas: ReadonlyArray<string | null | undefined>) {
  const saidas = prompts.map((p, i) => comEstadoDaFala(p, falas[i]))
  return { prompts: saidas.map((s) => s.prompt), relato: { versao: ESTADO_NEGADO_VERSAO, planos: saidas.map((s, i) => ({ plano: i + 1, chaves: s.chaves })).filter((x) => x.chaves.length), mudou: saidas.some((s) => s.chaves.length > 0) } }
}
