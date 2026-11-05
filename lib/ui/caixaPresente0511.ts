// KINEO-CAIXA-PRESENTE-0511 [fundador 04/11, olhando a Higgsfield; 05/11 "faz tudo"] — a regra da caixa de presente da barra de cima: o que ESTA conta realmente tem.
//
// A pessoa abre quando quer (regra sem-card-de-promo-0411): nada aqui salta na tela. A leitura só acontece no clique, nas rotas que já existem; cada linha precisa da prova do servidor.
// Leitura que falhou, campo ausente ou de outro tipo = a linha some. O programa de afiliados é a única linha sem condição.
//   · Filme grátis: a MESMA régua da linha do Studio (filmeGratisNaCaixa sobre /api/credits). Conta region_paid_only chega com trial.phase 'none' e não passa. A cota semanal de quem saiu
//     do teste fica de fora de propósito: depende do país do pedido e a E4 decidiu não anunciá-la (ver lib/freeWeeklyFilm.ts).
//   · Anual a 50%: /api/offers/annual-welcome, a mesma régua do checkout (resolveAnnualOffer). Só welcome_3h: o relógio da Black Friday é outro, e esta linha fala das 3 h.
//   · Kling 4: promoAvailable de /api/kling4-paid/availability, que confere a assinatura no provedor. publicOfferLive é a oferta pública, vale para qualquer visitante, e aqui não conta.
// Nenhum número digitado: o percentual, a comissão, o tempo e os textos vêm das constantes que cobram.
// Guardião: scripts/test-caixa-presente-0511.mjs.
import { AFFILIATE_COMMISSION_PCT } from '@/lib/affiliateCommission'
import { ANNUAL_WELCOME_API, ANNUAL_WELCOME_WINDOW_MS } from '@/lib/billing/annualWelcomeOffer'
import { ANNUAL_WELCOME_DISCOUNT_PERCENT } from '@/lib/checkoutPricing'
import { LINHA_DO_FILME_GRATIS, filmeGratisNaCaixa } from '@/lib/growth/filmeGratisNaCaixa'
import { KLING4_PAID_COPY, kling4PromoZeroCredits, rebaseKling4Lease } from '@/lib/kling4PaidPresentation'

export const CAIXA_CREDITS_API = '/api/credits'
export const CAIXA_KLING4_API = '/api/kling4-paid/availability'
/** Uma leitura presa não prende a caixa: passou disto, aquela linha some e as outras seguem. */
export const CAIXA_LEITURA_LIMITE_MS = 10_000

/** A duração que /api/kling4-paid/availability confere quando ninguém pede outra (o maior filme da promoção). */
const KLING4_SEGUNDOS_DA_LEITURA = 60
/** A mesma folga de relógio da regra das 3 h: prazo acima disto é dado errado, não oferta. */
const FOLGA_DE_RELOGIO_MS = 60_000

export type CaixaLeituras = { credits: unknown; annual: unknown; kling4: unknown }
export type CaixaLinhaId = 'filme' | 'anual' | 'kling4' | 'afiliado'
export type CaixaLinha = {
  id: CaixaLinhaId
  titulo: string
  detalhe?: string
  href: string
  /** Só a linha do anual: o instante, no relógio deste navegador, em que ela deixa de valer. */
  venceEmMs?: number
}

export const CAIXA_SEM_LEITURA: CaixaLeituras = { credits: null, annual: null, kling4: null }

function objeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function linhaDoAnual(l: CaixaLeituras, agoraMs: number): CaixaLinha | null {
  const a = objeto(l.annual)
  if (!a || a.offer !== 'welcome_3h') return null
  const { nowMs, endsAtMs } = a
  if (typeof nowMs !== 'number' || typeof endsAtMs !== 'number' || !Number.isFinite(nowMs) || !Number.isFinite(endsAtMs)) return null
  const faltaMs = endsAtMs - nowMs
  if (faltaMs <= 0 || faltaMs > ANNUAL_WELCOME_WINDOW_MS + FOLGA_DE_RELOGIO_MS) return null
  // Na dúvida, a linha some: quem paga não vê oferta de conta nova, e sem a leitura da conta não dá para afirmar que não pagou.
  const c = objeto(l.credits)
  if (!c || c.entitlementsResolved !== true || c.hasPaid !== false) return null
  return { id: 'anual', titulo: `Your ${ANNUAL_WELCOME_DISCOUNT_PERCENT}% annual offer`, href: '/pricing?billing=annual', venceEmMs: agoraMs + faltaMs }
}

/** As linhas desta conta, nesta ordem. A do afiliado existe sempre, então a caixa nunca abre vazia. */
export function linhasDaCaixa(l: CaixaLeituras, agoraMs: number): CaixaLinha[] {
  const linhas: CaixaLinha[] = []
  if (filmeGratisNaCaixa(l.credits)) linhas.push({ id: 'filme', titulo: LINHA_DO_FILME_GRATIS, href: '/studio' })
  const anual = linhaDoAnual(l, agoraMs)
  if (anual) linhas.push(anual)
  if (kling4PromoZeroCredits(l.kling4, KLING4_SEGUNDOS_DA_LEITURA, agoraMs)) linhas.push({ id: 'kling4', titulo: KLING4_PAID_COPY.included, href: '/studio?engine=hollywood' })
  linhas.push({ id: 'afiliado', titulo: `Earn ${AFFILIATE_COMMISSION_PCT}`, detalhe: 'Affiliate program', href: '/affiliate' })
  return linhas
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
