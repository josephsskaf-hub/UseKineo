// KINEO-AFILIADO-VIEWS-0911 — PAGO POR VIEWS, público (fundador 09/11/2026, "Sim para as 5", decisão 4).
// A regra já existia por dentro (teto de US$ 25 por mil views, docs de 08/10) e os criadores convidados pediam cachê;
// a Higgsfield divulga o "Higgsfield Earn" (pago por views, com teto por vídeo). Agora a regra é pública, com teto.
//
// O QUE O PRODUTO FAZ SOZINHO AQUI: NADA. Não há tabela, rota, contador de views nem pagamento automático — a aprovação
// é por e-mail ANTES do post, a prova é o print do YouTube Studio / TikTok analytics 30 dias depois, e o pagamento é
// manual (PayPal ou Wise), junto com o repasse da comissão. Por isso a copy diz "revisado e pago pela equipe".
// Nunca adiantado; nunca sem aprovação prévia (é o que faz o orçamento mensal caber).
//
// Lib pura, sem import: entra em /partners (seção #paid-per-views), em /llms.txt e no guardião
// scripts/test-partners-criadores-1610.mjs, que prova que a página não digita nenhum destes números.
export const VIEWS_OFFER_MARK = 'KINEO-AFILIADO-VIEWS-0911'

/** US$ pagos por bloco de VIEWS_OFFER_UNIT views reais. */
export const VIEWS_OFFER_USD_PER_UNIT = 25
export const VIEWS_OFFER_UNIT = 1000
/** Teto por vídeo aprovado. */
export const VIEWS_OFFER_CAP_PER_VIDEO_USD = 100
/** Orçamento do programa inteiro por mês (todos os criadores somados), por ordem de aprovação. */
export const VIEWS_OFFER_MONTHLY_BUDGET_USD = 300
/** As views são contadas este número de dias depois de o vídeo ir ao ar. */
export const VIEWS_OFFER_COUNT_AFTER_DAYS = 30
/** Duração mínima de uma integração (vídeo dedicado também vale). */
export const VIEWS_OFFER_MIN_INTEGRATION_SECONDS = 30
/** Por onde sai o pagamento (manual). */
export const VIEWS_OFFER_PAYOUT_METHODS = 'PayPal or Wise'
/** Onde o criador pede a aprovação: o e-mail de afiliados que /partners já usa. */
export const VIEWS_OFFER_CONTACT_EMAIL = 'hello@usekineo.com'
export const VIEWS_OFFER_APPLY_MAILTO =
  `mailto:${VIEWS_OFFER_CONTACT_EMAIL}?subject=${encodeURIComponent('Kineo paid per views — approval request')}`

/** O que um vídeo aprovado recebe por um número de views: aritmética da regra, com o teto por vídeo. */
export function viewsOfferPayoutUsd(views: number): number {
  if (!Number.isFinite(views) || views <= 0) return 0
  const raw = (Math.floor(views) / VIEWS_OFFER_UNIT) * VIEWS_OFFER_USD_PER_UNIT
  return Math.min(Math.round(raw * 100) / 100, VIEWS_OFFER_CAP_PER_VIDEO_USD)
}

/** Views em que o teto por vídeo é atingido (4.000 com US$ 25/mil e teto de US$ 100). */
export const VIEWS_OFFER_VIEWS_AT_CAP =
  Math.ceil((VIEWS_OFFER_CAP_PER_VIDEO_USD / VIEWS_OFFER_USD_PER_UNIT) * VIEWS_OFFER_UNIT)

const usd = (n: number) => `US$ ${n.toLocaleString('en-US')}`
const views = (n: number) => n.toLocaleString('en-US')

/** A frase da regra, uma fonte para a página e para /llms.txt. */
export const VIEWS_OFFER_RULE =
  `${usd(VIEWS_OFFER_USD_PER_UNIT)} per ${views(VIEWS_OFFER_UNIT)} real views of an approved video about Kineo, ` +
  `counted ${VIEWS_OFFER_COUNT_AFTER_DAYS} days after it goes live, capped at ${usd(VIEWS_OFFER_CAP_PER_VIDEO_USD)} per video ` +
  `and ${usd(VIEWS_OFFER_MONTHLY_BUDGET_USD)} per month for the whole program, first approved, first served. ` +
  `Approval is required before you post; the screenshot is reviewed and paid by our team after the ${VIEWS_OFFER_COUNT_AFTER_DAYS} days, ` +
  `by ${VIEWS_OFFER_PAYOUT_METHODS}, together with your commission — never in advance.`

export const viewsOfferUsd = usd
export const viewsOfferViews = views
