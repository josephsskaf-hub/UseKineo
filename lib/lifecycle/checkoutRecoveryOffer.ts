// ═══ KINEO-RESGATE-CUPOM-RICO-0111 — a carta do checkout expirado ganha o FIRST50, SÓ para país rico ════════════════
//
// O número (medido 01/11): a carta de checkout expirado (app/api/admin/send-checkout-recovery, evento
// `checkout_recovery_emailed_v1`) saiu 31 vezes em 14 dias e quase ninguém comprou. Ela devolve a MESMA sessão da
// Stripe (mesmo plano, mesmo preço) e não oferece nada — e a conclusão fechada do fundador é que o checkout vaza por
// PREÇO. Fundador, 01/11: "vai tudo".
//
// A REGRA:
//   · país rico (a lista que a casa JÁ tem: PAISES_FILME_GRATIS em lib/freeFilmPolicy.ts, menos o BR — ver abaixo)
//     → a carta ganha o FIRST50 (metade da 1ª fatura, SÓ Creator/Studio mensal: o gate mora em
//     app/api/stripe/checkout/route.ts, KINEO-PROMO-GATE-2026-08-18, e a /pricing abre no mensal com esse promo —
//     lib/growth/pricingPlanChoiceAttribution.ts pricingBillingHandoff). O link de recuperação da Stripe continua sendo
//     a porta principal; o cupom é a resposta para "foi o preço".
//   · qualquer outro país, ou país desconhecido → sem cupom (falha FECHADA: desconto não sai sem sinal de país).
//
// ⛔ POR QUE O BR FICA FORA, embora esteja em PAISES_FILME_GRATIS: ele entrou lá em 03/10 (KINEO-BRASIL-VOLTA-2026-10-03)
// por "o Brasil vende", não por renda (KINEO-INTEGRA-VENDAS2-0111: a versão anterior dizia "preço regional"; não é isso — o BR
// paga a tabela em reais pela fórmula de conversão). Dar metade ao BR é decisão de preço do fundador, ainda não tomada.
//
// 🪝 GANCHO DO AVULSO (US$ 2,90 — ?pack=starter290): para quem NÃO é de país rico, a ideia é apontar para o avulso.
// Hoje NÃO existe na base nenhuma elegibilidade de resgate do starter290 (lib/flags.ts OFFER_290_ENABLED = false e é a
// oferta de URGÊNCIA do 1º pedido, não um resgate) — outra sessão está criando. Até lá `ofertaDoResgate` devolve 'none'
// para esses países. Quando a elegibilidade chegar, ela entra AQUI (novo valor de ResgateOffer + copy própria), e o
// guardião scripts/test-resgate-cupom-rico-0111.mts tem de ganhar o caso — nunca digitar o preço do avulso na carta.
//
// Módulo PURO (sem env, sem banco, sem rede): a rota e o guardião leem a mesma régua.
import { paisDaListaConfirmado } from '@/lib/freeFilmPolicy'

export const CHECKOUT_RECOVERY_OFFER_VERSION = 'checkout_recovery_offer_v1_0111' as const

/** O código público que já existe na Stripe (auto-provisionado pela rota de checkout no 1º uso). */
export const CHECKOUT_RECOVERY_PROMO = 'FIRST50' as const

/** Países da lista de alta renda que NÃO recebem o cupom (ver o porquê no topo). */
const FORA_DO_CUPOM: readonly string[] = ['BR']

export type ResgateOffer = typeof CHECKOUT_RECOVERY_PROMO | 'none'
export type ResgateCountryTier = 'rico' | 'outro' | 'desconhecido'

export type ResgateOferta = {
  offer: ResgateOffer
  country_tier: ResgateCountryTier
  /** País normalizado (ISO alfa-2) que decidiu, ou null quando nenhum sinal serviu. */
  country: string | null
}

function normalizar(c: string | null | undefined): string | null {
  if (typeof c !== 'string') return null
  const v = c.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(v) || v === 'XX' || v === 'T1') return null
  return v
}

/**
 * O país da pessoa para a carta: profiles.last_country → profiles.signup_country → país do IP da própria sessão
 * expirada (events.metadata.ip_country). O primeiro sinal VÁLIDO vence; 'XX'/'T1'/vazio não contam.
 */
export function paisDoResgate(sinais: {
  lastCountry?: string | null
  signupCountry?: string | null
  sessionCountry?: string | null
}): string | null {
  return normalizar(sinais.lastCountry) ?? normalizar(sinais.signupCountry) ?? normalizar(sinais.sessionCountry)
}

/** A decisão: cupom ou não, e em que faixa de país a pessoa caiu (gravado no evento). */
export function ofertaDoResgate(country: string | null | undefined): ResgateOferta {
  const c = normalizar(country)
  if (c === null) return { offer: 'none', country_tier: 'desconhecido', country: null }
  const rico = paisDaListaConfirmado(c) !== null && !FORA_DO_CUPOM.includes(c)
  if (rico) return { offer: CHECKOUT_RECOVERY_PROMO, country_tier: 'rico', country: c }
  // 🪝 KINEO-RESGATE-CUPOM-RICO-0111 — aqui entra o avulso do starter290 quando a elegibilidade de resgate existir.
  return { offer: 'none', country_tier: 'outro', country: c }
}

// KINEO-INTEGRA-VENDAS2-0111 — o cupom automático só começa em 08/11: o lote manual de 01/11 (45 e-mails com FIRST50, sem evento
// no banco) pegou a mesma coorte, e o fundador mandou não escrever de novo a essas pessoas antes de 08/11. Até lá a carta sai
// como sempre saiu (sem cupom). A rota aceita CHECKOUT_RECOVERY_CUPOM_DESDE_MS para o guardião.
export const RESGATE_CUPOM_DESDE_MS = Date.parse('2026-11-08T00:00:00Z')

export function ofertaNaData(o: ResgateOferta, agoraMs: number, desdeMs: number = RESGATE_CUPOM_DESDE_MS): ResgateOferta {
  return agoraMs >= desdeMs ? o : { ...o, offer: 'none' }
}

/** O link do cupom: a /pricing com o promo (abre no mensal) e a etiqueta da campanha para o painel. */
export function resgatePromoUrl(site: string): string {
  return `${site}/pricing?promo=${CHECKOUT_RECOVERY_PROMO}&utm_source=email&utm_campaign=checkout_recovery_rico`
}

// KINEO-INTEGRA-VENDAS2-0111 — a carta NÃO escreve o nome do código: só o link aplica o cupom (e o link já trava em Creator/Studio
// mensal). Escrito por extenso, o código era digitável no campo manual da compra sem conta, inclusive no anual (brecha antiga).
/** Copy honesta do cupom: metade da 1ª fatura, só Creator/Studio mensal, aplicado pelo link. Sem número nem código digitado. */
export function resgatePromoTexto(site: string): string {
  return `If it was the price: half off your first month of Creator or Studio ` +
    `(monthly plans), applied automatically on this page:\n${resgatePromoUrl(site)}`
}

export function resgatePromoHtml(site: string): string {
  return `<p>If it was the price: <strong>half off your first month</strong> ` +
    `of Creator or Studio (monthly plans), <a href="${resgatePromoUrl(site)}" style="color:#2997ff">applied automatically here</a>.</p>`
}
