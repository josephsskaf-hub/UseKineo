// KINEO-CAIXA-UNICA-0411 [fundador 04/11: "1a"] — as regras puras da caixa única: quem a vê, qual motor e o pedido que ela monta.
import { linguaDoRoteiro } from '@/lib/linguaDoRoteiro' // KINEO-ROTEIRO-NA-LINGUA-0411

export interface FilmeDaCaixa { id: string; title: string; engine: string; poster: string; /** KINEO-HOME-TOPO-0511 — o texto que o cartão põe na caixa; sem ele, o título. */ ideia?: string }

/** Parâmetros de quem só chegou. Qualquer outro (texto do ChatGPT, retomada, episódio, volta do pagamento) segue para o Studio completo, que sabe tratá-lo. */
const SO_CHEGOU = /^(?:engine|intent_campaign|ideia|utm_[a-z]+|ref|gclid|msclkid|fbclid|ttclid)$/ // KINEO-CAIXA-COM-IDEIA-0611 — ideia: só preenche a caixa

export function usarCaixaUnica(params: Record<string, string | string[] | undefined>): boolean {
  return Object.keys(params).every((k) => SO_CHEGOU.test(k))
}

const NOMES: Readonly<Record<string, string>> = { hollywood: 'Kling 4.0', h3: 'MiniMax H3', h3max: 'MiniMax H3 Max', omni: 'Omni Flash', s25: 'Seedance 2.5' }

/** O motor do pedido: o que a pessoa trouxe no link ou, sem escolha (e no Kineo 1, fora da entrada desde 29/09), o padrão. */
export function motorDaCaixa(engine: string | string[] | undefined): string {
  return typeof engine === 'string' && Object.hasOwn(NOMES, engine) ? engine : 'seedance'
}

/** Nome para a tela só quando a pessoa escolheu; null = "Auto". */
export function nomeDoMotorEscolhido(motor: string): string | null {
  return NOMES[motor] ?? null
}

export function campanhaDaCaixa(intent: string | string[] | undefined): string {
  return typeof intent === 'string' && /^[a-z0-9_-]{1,64}$/i.test(intent) ? intent : 'studio_simple'
}

/** O MESMO pedido do Generate do Studio completo (motor, texto, duração, modo, autoanalyze e studio; formato e língua só fora do padrão). */
export function pedidoDoStudioSimples(p: { motor: string; texto: string; duracao: number; formato: string; lingua: string; palavraPorPalavra: boolean; campanha: string }): string {
  const q = new URLSearchParams({ engine: p.motor, prompt: p.texto, duration: String(p.duracao), script_mode: p.palavraPorPalavra ? 'verbatim' : 'ai', autoanalyze: '1', studio: '1', intent_campaign: p.campanha })
  if (p.formato !== '9:16') q.set('aspect', p.formato)
  const lingua = p.lingua === 'auto' ? linguaDoRoteiro({ hint: 'en', texto: p.texto, motor: p.motor }).language : p.lingua // KINEO-ROTEIRO-NA-LINGUA-0411 — sem escolha, a língua do texto
  if (lingua !== 'en') q.set('language', lingua)
  return `/studio/create?${q.toString()}`
}
