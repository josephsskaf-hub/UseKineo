// KINEO-FORMATO-DA-IDEIA-1211 — o pedido EXPLÍCITO de pessoa falando para a câmera que o cliente escreveu na ideia original vale para o formato.
// O caso (24564d97, caneta de gel, 11/11): a ideia dizia "UGC … The woman speaks naturally to the camera"; o formato é decidido só sobre o
// ROTEIRO (decidirFormato(prompt)), e o roteiro condensado guardava só as falas entre «». Resultado: documentary_faceless ("no foreground human
// faces"). O KINEO-PESSOA-DO-PEDIDO-1111 já tira esse filme do faceless (character_story: a moça aparece, muda); faltava o pedido de FALAR
// PARA A CÂMERA, que só existe na ideia.
// A regra (código, sem GPT): as MESMAS frases de pedido explícito de apresentador do Diretor de Formato (lib/cinematic/visualMode
// PEDIDOS_DE_APRESENTADOR, palavra inteira) + "avatar" + "UGC", lidas na ideia original; a negação ("no presenter", "sem apresentador")
// vence, como lá. Inferência (primeira pessoa, gênero, tom) NÃO conta aqui: na ideia, "I want a video…" não é pedido de apresentador.
// Só muda quem ainda não é presenter e não tem a tag [faceless]. Atrás do interruptor: 'internal' = só contas da casa; 'all' = todos.
// Guardião: scripts/test-formato-da-ideia-1211.mjs.
import { PEDIDOS_DE_APRESENTADOR, NEGACAO_DE_APRESENTADOR, type DecisaoFormato } from '@/lib/cinematic/visualMode'

export type ModoFormatoDaIdeia = 'internal' | 'all'
export const FORMATO_DA_IDEIA: ModoFormatoDaIdeia = 'all' // KINEO-INTERRUPTORES-ALL-1211 [CEO 12/11 19:15]: provado no filme Lumo (formato com apresentador); ligado para todos
export const FORMATO_DA_IDEIA_VERSAO = 'formato_da_ideia_1211_v1'

export function formatoDaIdeiaLigado(modo: ModoFormatoDaIdeia, contaDaCasa: boolean): boolean {
  return modo === 'all' || (modo === 'internal' && contaDaCasa === true)
}

const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
const EXTRAS = ['ugc', 'avatar'] // formato que, por definição, é uma pessoa falando para a câmera
// negação na MESMA oração, até 6 palavras antes do pedido: "não mostrar apresentador ou pessoa falando para a câmera" (claim de 07/11) —
// a NEGACAO_DE_APRESENTADOR do Diretor de Formato só pega "sem apresentador" colado e deixaria esse pedido virar presenter
const NEGA_ANTES = /(?:^|[^a-z0-9])(?:no|not|never|without|avoid|dont|don't|do not|nao|sem|nunca|evite|evitar|sin|ni|kein|keine|nicht|pas|non|senza)(?:[^a-z0-9.;:!?\n]+[a-z0-9'’-]+){0,6}[^a-z0-9.;:!?\n]*$/
/** Ocorrências do pedido (palavra inteira) que NÃO estão negadas na própria oração. */
function pedidoAfirmado(r: string, p: string): boolean {
  const re = new RegExp('(?:^|[^a-z0-9])(' + normalizar(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[^a-z0-9]|$)', 'g')
  for (const m of r.matchAll(re)) {
    const ini = (m.index ?? 0) + m[0].length - m[1].length
    const antes = r.slice(Math.max(0, ini - 80), ini)
    if (!NEGA_ANTES.test(antes)) return true
  }
  return false
}

/** O pedido explícito de pessoa falando para a câmera escrito na ideia original (a frase achada), ou null. Puro. */
export function pedidoDeFalaNaIdeia(ideia: unknown): string | null {
  if (typeof ideia !== 'string' || !ideia.trim()) return null
  const r = normalizar(ideia.slice(0, 12000))
  if (NEGACAO_DE_APRESENTADOR.test(r)) return null // a regra de sempre do Diretor de Formato vence primeiro
  // "ancora" fica de fora: na ideia (texto longo, qualquer língua) é o "ainda" do italiano ("non esisteva ancora"), não o âncora do telejornal
  return [...PEDIDOS_DE_APRESENTADOR.filter((p) => p.trim() !== 'ancora'), ...EXTRAS].find((p) => pedidoAfirmado(r, p))?.trim() ?? null
}

/** O formato com o pedido da ideia: presenter quando a ideia pede explicitamente; senão a mesma decisão. */
export function formatoComFalaDaIdeia(decisao: DecisaoFormato, ideia: unknown, tagFacelessPresente: boolean): DecisaoFormato {
  if (tagFacelessPresente || decisao.modo === 'presenter') return decisao
  const frase = pedidoDeFalaNaIdeia(ideia)
  if (!frase) return decisao
  return { modo: 'presenter', motivo: `a ideia original pede pessoa falando para a câmera ("${frase}") — antes: ${decisao.motivo}`, apresentadorPedido: true }
}
