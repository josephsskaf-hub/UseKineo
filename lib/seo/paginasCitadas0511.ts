// KINEO-PAGINAS-CITADAS-0511 [fundador 05/11, "2 sim": atualizar as páginas mais citadas pelo ChatGPT com conteúdo novo de verdade e medir 7 dias]
// O que mudou desde 23/10 e ainda não estava nas 6 páginas da camada KINEO-TRAFEGO-2310: os três planos de 04/11 (US$ 9 / 19 / 59, com 40 / 85 / 280
// créditos) e o que os créditos de um mês cobrem em filme de 15, 35 e 60 s. Nenhum número é escrito à mão: tudo sai da tabela que cobra
// (lib/checkoutPricing.ts) e da régua de créditos (lib/credits/engineCost.ts). Não muda preço, checkout nem motor.
// A data só anda quando o conteúdo anda: a mesma constante assina a linha "Updated" das páginas e o <lastmod> do mapa do site, e o cron de
// IndexNow avisa o Bing na primeira hora depois do deploy. Guardião: scripts/test-paginas-citadas-0511.mjs.
import { ANNUAL_DISCOUNT_PERCENT, TIER_CREDITS, TIER_PRICES } from '@/lib/checkoutPricing'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { H3_TURBO_PUBLIC } from '@/lib/engineLaunch'
import { H3_TURBO_PAGE_UPDATED } from '@/lib/growth/h3TurboPage'

export const PAGINAS_CITADAS_0511_ATUALIZADO = '2026-11-05'
export const PAGINAS_CITADAS_0511_LASTMOD = `${PAGINAS_CITADAS_0511_ATUALIZADO}T12:00:00.000Z`
/** As 6 páginas que montam o bloco citável (as mesmas de docs/trafego-2310/render-pages.cjs). */
export const PAGINAS_CITADAS_0511_PATHS: readonly string[] = [
  '/', '/ai-video-generator/seedance', '/text-to-video-shorts', '/free-ai-shorts/horror', '/ai-video-generator/for/urdu', '/gerador-de-shorts-gratis',
]

const PLANOS = [['starter', 'Starter'], ['basic', 'Creator'], ['pro', 'Studio']] as const
const DURACOES = [15, 35, 60] as const
const creditos = (segundos: number) => creditCostForDuration('cinematic_ai', true, segundos)
const inteiroOuCentavos = (valor: number) => (Number.isInteger(valor) ? String(valor) : valor.toFixed(2))

export type PlanoPorFilme = { plano: string; precoUsd: number; creditos: number; filmes: readonly number[]; filme60Usd: number }

/** Uma linha por plano: preço, créditos, quantos filmes cada duração cabe no saldo de um mês, e o custo de um filme de 60 s nesse plano. */
export function planosPorFilme0511(): PlanoPorFilme[] {
  return PLANOS.map(([tier, nome]) => {
    const precoUsd = TIER_PRICES[tier].usd / 100
    const saldo = TIER_CREDITS[tier]
    return { plano: nome, precoUsd, creditos: saldo, filmes: DURACOES.map((s) => Math.floor(saldo / creditos(s))), filme60Usd: Math.round((creditos(60) * precoUsd / saldo) * 100) / 100 }
  })
}

export type PlanosPorFilmeTexto = { heading: string; caption: string; labels: readonly string[]; rows: string[][]; nota: string; atualizadoEm: string; termos: string }

export function planosPorFilmeTexto0511(pt: boolean): PlanosPorFilmeTexto {
  const ou = pt ? 'ou' : 'or'
  const rows = planosPorFilme0511().map((p) => [
    p.plano,
    pt ? `US$ ${inteiroOuCentavos(p.precoUsd).replace('.', ',')}` : `US$${inteiroOuCentavos(p.precoUsd)}`,
    String(p.creditos),
    p.filmes.map((n, i) => `${n} × ${DURACOES[i]} s`).join(`, ${ou} `),
    pt ? `Cerca de US$ ${p.filme60Usd.toFixed(2).replace('.', ',')}` : `About US$${p.filme60Usd.toFixed(2)}`,
  ])
  const [c15, c35, c60, c90] = [15, 35, 60, 90].map(creditos)
  return pt ? {
    heading: 'Planos e custo por filme',
    caption: 'O que os créditos de um mês cobrem no Seedance 1.5. Os valores vêm da tabela de cobrança.',
    labels: ['Plano', 'Preço por mês', 'Créditos por mês', 'Filmes que esses créditos cobrem', 'Quanto sai um filme de 60 s'],
    rows,
    nota: `Um filme Seedance 1.5 usa ${c15} créditos em 15 segundos, ${c35} em 35, ${c60} em 60 e ${c90} em 90. No plano anual, o preço mensal cai ${ANNUAL_DISCOUNT_PERCENT}%. Os valores em US$ são a referência; no Brasil, o checkout cobra em reais. O custo em créditos aparece antes de gerar.`,
    atualizadoEm: '5 de novembro de 2026',
    termos: 'Preços e condições atuais do teste',
  } : {
    heading: 'Plans and cost per film',
    caption: 'What one month of credits covers on Seedance 1.5. Amounts come from the billing table.',
    labels: ['Plan', 'Price per month', 'Credits per month', 'Films those credits cover', 'What a 60 s film costs'],
    rows,
    nota: `A Seedance 1.5 film uses ${c15} credits at 15 seconds, ${c35} at 35, ${c60} at 60 and ${c90} at 90. Annual billing takes ${ANNUAL_DISCOUNT_PERCENT}% off the monthly price. USD is the reference price; customers in Brazil pay in reais at checkout. The credit cost is shown before you generate.`,
    atualizadoEm: 'November 5, 2026',
    termos: 'Current prices and trial terms',
  }
}

/** Carimba só as 6 páginas, e só para frente: data mais nova que a nossa fica como está. */
export function carimbaPaginasCitadas0511<T extends { url: string; lastModified?: string | Date }>(entries: readonly T[]): T[] {
  const alvo = new Set(PAGINAS_CITADAS_0511_PATHS)
  return entries.map((entry) => {
    if (!alvo.has(new URL(entry.url).pathname)) return entry
    const lastModified = H3_TURBO_PUBLIC && new URL(entry.url).pathname === '/ai-video-generator/seedance'
      ? `${H3_TURBO_PAGE_UPDATED}T12:00:00.000Z`
      : PAGINAS_CITADAS_0511_LASTMOD
    const carimbo = Date.parse(lastModified)
    const atual = entry.lastModified ? new Date(entry.lastModified).getTime() : 0
    return atual >= carimbo ? entry : { ...entry, lastModified }
  })
}
