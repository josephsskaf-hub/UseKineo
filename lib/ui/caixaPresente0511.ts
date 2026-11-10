// KINEO-CAIXA-PRESENTE-0511 [fundador 04/11, olhando a Higgsfield; 05/11 "faz tudo"] — a regra da caixa de presente da barra de cima: o que ESTA conta realmente tem.
//
// A pessoa abre quando quer (regra sem-card-de-promo-0411): nada aqui salta na tela. A leitura só acontece no clique, nas rotas que já existem; cada linha precisa da prova do servidor.
// Leitura que falhou, campo ausente ou de outro tipo = a linha some. O programa de afiliados e as duas linhas do conector (KINEO-PRESENTE-CONECTOR-0911) são as únicas sem condição.
//   · Filme grátis: a MESMA régua da linha do Studio (filmeGratisNaCaixa sobre /api/credits). Conta region_paid_only chega com trial.phase 'none' e não passa. A cota semanal de quem saiu
//     do teste fica de fora de propósito: depende do país do pedido e a E4 decidiu não anunciá-la (ver lib/freeWeeklyFilm.ts).
//   · Anual a 50%: /api/offers/annual-welcome, a mesma régua do checkout (resolveAnnualOffer). Só welcome_3h: o relógio da Black Friday é outro, e esta linha fala das 3 h.
//   · Kling 4: promoAvailable de /api/kling4-paid/availability, que confere a assinatura no provedor. publicOfferLive é a oferta pública, vale para qualquer visitante, e aqui não conta.
// Nenhum número digitado: o percentual, a comissão, o tempo e os textos vêm das constantes que cobram.
// Guardião: scripts/test-caixa-presente-0511.mjs.
import { AFFILIATE_COMMISSION_PCT } from '@/lib/affiliateCommission'
import { ANNUAL_WELCOME_API, ANNUAL_WELCOME_WINDOW_MS } from '@/lib/billing/annualWelcomeOffer'
import { ANNUAL_WELCOME_DISCOUNT_PERCENT } from '@/lib/checkoutPricing'
import { MONTHLY_FIRST_MONTH_OFFER_KIND, MONTHLY_FIRST_MONTH_PERCENT_OFF } from '@/lib/billing/monthlyFirstMonthOffer' // KINEO-MENSAL-3H-0911
import { LINHA_DO_FILME_GRATIS, filmeGratisNaCaixa } from '@/lib/growth/filmeGratisNaCaixa'
import { KLING4_PAID_COPY, kling4PromoZeroCredits, rebaseKling4Lease } from '@/lib/kling4PaidPresentation'
import { TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer' // KINEO-HOME-TOPO-0511
import { GENERATE_IN_CLAUDE_PATH } from '@/lib/generateInClaude' // KINEO-PRESENTE-CONECTOR-0911
import { createEntryHref } from '@/lib/create/entry' // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — a linha do filme grátis abre a aba Film

export const CAIXA_CREDITS_API = '/api/credits'
export const CAIXA_KLING4_API = '/api/kling4-paid/availability'
/** Uma leitura presa não prende a caixa: passou disto, aquela linha some e as outras seguem. */
export const CAIXA_LEITURA_LIMITE_MS = 10_000

/** A duração que /api/kling4-paid/availability confere quando ninguém pede outra (o maior filme da promoção). */
const KLING4_SEGUNDOS_DA_LEITURA = 60
/** A mesma folga de relógio da regra das 3 h: prazo acima disto é dado errado, não oferta. */
const FOLGA_DE_RELOGIO_MS = 60_000

export type CaixaLeituras = { credits: unknown; annual: unknown; kling4: unknown }
export type CaixaLinhaId = 'filme' | 'anual' | 'kling4' | 'claude' | 'chatgpt' | 'afiliado'
export type CaixaLinha = {
  id: CaixaLinhaId
  titulo: string
  detalhe?: string
  href: string
  /** Só a linha do anual: o instante, no relógio deste navegador, em que ela deixa de valer. */
  venceEmMs?: number
  /** KINEO-HOME-TOPO-0511 — a linha abre o cadastro no modal da home (data-auth-modal). */
  modal?: 'signup'
  /** KINEO-PRESENTE-CONECTOR-0911 — o rótulo do botão no fim da linha ("Use now"); sem ele, só a seta. */
  acao?: string
}

export const CAIXA_SEM_LEITURA: CaixaLeituras = { credits: null, annual: null, kling4: null }

function objeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** O que falta da janela de 3 h no corpo da rota, ou null (corpo incompleto, vencido ou maior que a janela = dado errado). */
function faltaDaJanela(nowMs: unknown, endsAtMs: unknown): number | null {
  if (typeof nowMs !== 'number' || typeof endsAtMs !== 'number' || !Number.isFinite(nowMs) || !Number.isFinite(endsAtMs)) return null
  const faltaMs = endsAtMs - nowMs
  if (faltaMs <= 0 || faltaMs > ANNUAL_WELCOME_WINDOW_MS + FOLGA_DE_RELOGIO_MS) return null
  return faltaMs
}

// KINEO-MENSAL-3H-0911 [fundador 09/11: "vai para 30% nas 3 primeiras horas. É isso daí."] — a MESMA linha fala das duas ofertas das 3 h quando as duas valem:
// "50% off annual, or 30% off your first month". Só o anual: o texto de sempre. Só o mensal (a Black Friday cobre o anual): "30% off your first month".
// Os dois prazos são o mesmo relógio (created_at + 3 h); a linha sai quando ele zera. Abre o /pricing.
export const LINHA_DAS_DUAS_OFERTAS = `${ANNUAL_WELCOME_DISCOUNT_PERCENT}% off annual, or ${MONTHLY_FIRST_MONTH_PERCENT_OFF}% off your first month`
export const LINHA_DO_MENSAL = `${MONTHLY_FIRST_MONTH_PERCENT_OFF}% off your first month`

function linhaDoAnual(l: CaixaLeituras, agoraMs: number): CaixaLinha | null {
  const a = objeto(l.annual)
  if (!a) return null
  const faltaAnual = a.offer === 'welcome_3h' ? faltaDaJanela(a.nowMs, a.endsAtMs) : null
  const faltaMensal = a.monthlyOffer === MONTHLY_FIRST_MONTH_OFFER_KIND ? faltaDaJanela(a.nowMs, a.monthlyEndsAtMs) : null
  if (faltaAnual === null && faltaMensal === null) return null
  // Na dúvida, a linha some: quem paga não vê oferta de conta nova, e sem a leitura da conta não dá para afirmar que não pagou.
  const c = objeto(l.credits)
  if (!c || c.entitlementsResolved !== true || c.hasPaid !== false) return null
  if (faltaAnual !== null && faltaMensal !== null) return { id: 'anual', titulo: LINHA_DAS_DUAS_OFERTAS, href: '/pricing?billing=annual', venceEmMs: agoraMs + Math.min(faltaAnual, faltaMensal) }
  if (faltaAnual !== null) return { id: 'anual', titulo: `Your ${ANNUAL_WELCOME_DISCOUNT_PERCENT}% annual offer`, href: '/pricing?billing=annual', venceEmMs: agoraMs + faltaAnual }
  return { id: 'anual', titulo: LINHA_DO_MENSAL, href: '/pricing?billing=monthly', venceEmMs: agoraMs + (faltaMensal as number) }
}

// KINEO-PRESENTE-CONECTOR-0911 [fundador 09/11: "colocar o MCP, tanto do GPT quanto do Claude, na caixa de presente. Use agora"] — atalho para a página do conector
// Kineo Studio (/kineo-in-claude), não presente: conectar não custa nada e o filme pedido no chat sai da conta com os créditos da conta, igual ao site
// (lib/mcp/studioTools.ts cobra o mesmo débito; a página diz "using your account's credits"). Por isso a linha diz "with your credits" e nunca "free".
// Sem preço, sem motor, sem logo de terceiro: "Claude" e "ChatGPT" em texto. Vale para toda conta e para o visitante (a página é pública).
// utm_source=gift_box, o mesmo carimbo da linha do filme do visitante: sem ele, o pouso limpo nesta rota vira a estimativa ai_assistant_likely (KINEO-ORIGEM-CLAUDE-0911).
export const CAIXA_UTM = 'gift_box'
export const LINHAS_DO_CONECTOR: readonly CaixaLinha[] = [
  { id: 'claude', titulo: 'Kineo inside Claude', detalhe: 'Ask Claude for a film. Kineo makes it in your account, with your credits.', href: `${GENERATE_IN_CLAUDE_PATH}?utm_source=${CAIXA_UTM}`, acao: 'Use now' },
  { id: 'chatgpt', titulo: 'Kineo inside ChatGPT', detalhe: 'Ask ChatGPT for a film. Kineo makes it in your account, with your credits.', href: `${GENERATE_IN_CLAUDE_PATH}?tab=chatgpt&utm_source=${CAIXA_UTM}`, acao: 'Use now' },
]
/** O clique numa linha da caixa (qualquer linha): { entry: id da linha, visitor }. Só no clique; nada guardado no navegador (trackClosedEvent). */
export const CAIXA_CLIQUE_EVENTO = 'gift_box_entry_click'

/** As linhas desta conta, nesta ordem. As do conector e a do afiliado existem sempre, então a caixa nunca abre vazia. */
export function linhasDaCaixa(l: CaixaLeituras, agoraMs: number): CaixaLinha[] {
  const linhas: CaixaLinha[] = []
  if (filmeGratisNaCaixa(l.credits)) linhas.push({ id: 'filme', titulo: LINHA_DO_FILME_GRATIS, href: createEntryHref('film', '/studio') })
  const anual = linhaDoAnual(l, agoraMs)
  if (anual) linhas.push(anual)
  if (kling4PromoZeroCredits(l.kling4, KLING4_SEGUNDOS_DA_LEITURA, agoraMs)) linhas.push({ id: 'kling4', titulo: KLING4_PAID_COPY.included, href: '/studio?engine=hollywood' })
  linhas.push(...LINHAS_DO_CONECTOR) // KINEO-PRESENTE-CONECTOR-0911
  linhas.push({ id: 'afiliado', titulo: `Earn ${AFFILIATE_COMMISSION_PCT}`, detalhe: 'Affiliate program', href: '/affiliate' })
  return linhas
}

// KINEO-HOME-TOPO-0511 [fundador 05/11: "cadê o presentinho?"] — quem não tem conta não tem saldo, plano nem relógio para ler: nenhuma pergunta à rede, nenhum preço, nenhuma promoção (regra sem-card-de-promo-0411).
// Só o que vale para qualquer visitante: o filme grátis, se o país dele recebe (a mesma régua que concede o crédito no cadastro), e o programa de afiliados.
export const LINHA_GRATIS_DO_VISITANTE = 'Your first film is free'

export function linhasDoVisitante(filmeGratisNoPais: boolean): CaixaLinha[] {
  const linhas: CaixaLinha[] = []
  if (filmeGratisNoPais) linhas.push({ id: 'filme', titulo: LINHA_GRATIS_DO_VISITANTE, detalhe: `${TRIAL_FREE_FILM_SECONDS} s, no card`, href: '/signup?utm_source=gift_box', modal: 'signup' })
  return [...linhas, ...linhasDaCaixa(CAIXA_SEM_LEITURA, 0)] // sem leitura nenhuma, sobram as linhas do conector e a do afiliado
}

/** A caixa aberta na hora em que a janela fecha: a linha do anual sai junto com o relógio. */
export function linhasAindaValidas(linhas: readonly CaixaLinha[], agoraMs: number): CaixaLinha[] {
  return linhas.filter((linha) => linha.venceEmMs === undefined || agoraMs < linha.venceEmMs)
}

type Buscar = (url: string, init: { cache: 'no-store'; credentials: 'same-origin'; signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>

async function lerUma(buscar: Buscar, url: string, sinal: AbortSignal | undefined): Promise<unknown> {
  const controle = new AbortController()
  const limite = setTimeout(() => controle.abort(), CAIXA_LEITURA_LIMITE_MS)
  const cancelar = () => controle.abort()
  sinal?.addEventListener('abort', cancelar)
  try {
    const resposta = await buscar(url, { cache: 'no-store', credentials: 'same-origin', signal: controle.signal })
    return resposta.ok ? await resposta.json() : null
  } catch {
    return null
  } finally {
    clearTimeout(limite)
    sinal?.removeEventListener('abort', cancelar)
  }
}

/** As três leituras, de uma vez. Nunca rejeita: o que falhou volta null e a linha daquela leitura some. Quem chama este módulo é só o clique. */
export async function lerCaixa(buscar: Buscar, sinal?: AbortSignal): Promise<CaixaLeituras> {
  const [credits, annual, kling4] = await Promise.all([
    lerUma(buscar, CAIXA_CREDITS_API, sinal),
    lerUma(buscar, ANNUAL_WELCOME_API, sinal),
    // O prazo curto do Kling 4 é reancorado na chegada, para o relógio errado do visitante não esconder a linha (KINEO-KLING4-RELOGIO-2910).
    lerUma(buscar, CAIXA_KLING4_API, sinal).then((corpo) => rebaseKling4Lease(corpo, Date.now())),
  ])
  return { credits, annual, kling4 }
}
