// ═══ KINEO-ANUAL-2o-MES-2026-10-08 — o mensal fica; no 2º mês a casa oferece o anual com 30% de desconto ═══════════
//
// DECISÃO DO FUNDADOR (08/10/2026 ~01h BRT): "É o mensal e no segundo mês a gente tenta trocar pro anual. Com desconto de
// 30%." Base de mercado: a troca do mensal para o anual acontece mais no 2º mês da assinatura (ChartMogul) — quem pagou a
// 1ª renovação já provou que fica; quem ainda não renovou é a fatia que cancela (em 08/10, 6 de 10 assinantes mensais
// estavam com cancelamento agendado).
//
// ESTE MÓDULO É PURO E SEM IMPORT (a tela, as rotas e o guardião o carregam cru): o interruptor, o id da oferta, o
// desconto, os nomes de evento e as frases da tela (chaves de lib/ui/refinementCopy.json nas 16 línguas). O que a oferta
// FAZ mora em outros lugares, e é a MESMA troca do admin (uma regra só):
//   · regra do valor (mensal × 12 × 0,7 ao dólar mais próximo) e elegibilidade do 2º mês → lib/billing/annualSwitch.ts;
//   · a troca na Stripe (Product da casa, rateio, idempotência, razão, cota do mês) → lib/billing/annualSwitchCore.ts;
//   · autoatendimento (GET estado / POST ensaio e troca) → app/api/stripe/switch-to-annual/route.ts;
//   · e-mail do 2º mês (cron, ensaio por padrão) → app/api/cron/send-month2-annual-offer/route.ts;
//   · a peça da tela (cartão na conta, aviso no /studio, modal) → components/billing/Month2AnnualOffer.tsx.
// Doc (o que é, como ligar, como medir): docs/ANUAL-NO-2o-MES-2026-10-08.md.

/**
 * INTERRUPTOR ÚNICO — false até o fundador dizer "liga".
 * false: nenhuma tela pinta a oferta (nem chama a rota), o autoatendimento responde 404 `offer_not_live` sem ler a Stripe
 * nem gravar nada, e o cron de e-mail só faz ENSAIO (o `?confirm=SEND` é recusado com 409 e nada sai).
 */
export const MONTH2_ANNUAL_OFFER_LIVE = false

/** Id da oferta: vai no selo da assinatura (`annual_switch_offer`) e no razão `plan_switched_to_annual` (`offer`). */
export const MONTH2_ANNUAL_OFFER = 'month2_annual_30_2026_10_08' as const
/** O desconto sobre 12 mensalidades. A regra do valor (annualSwitch.month2OfferAnnualUsd) e a frase "save N%" leem daqui. */
export const MONTH2_ANNUAL_PERCENT_OFF = 30
export const MONTH2_ANNUAL_VERSION = 'month2_annual_v1' as const

/** A rota de autoatendimento: GET = estado para a tela; POST = ensaio (sem confirm) ou troca (confirm: 'SEND'). */
export const MONTH2_ANNUAL_API = '/api/stripe/switch-to-annual'
/** O aviso do /studio é dispensável: a dispensa fica no navegador (conveniência por pessoa, nunca regra). */
export const MONTH2_ANNUAL_DISMISS_KEY = `kineo:${MONTH2_ANNUAL_OFFER}:studio_dismissed`

// ─── telemetria (eventos do navegador; o desfecho que vale dinheiro é o razão do servidor) ────────────────────────────
/** A peça apareceu (1× por montagem, só quando pinta). */
export const MONTH2_ANNUAL_SHOWN_EVENT = 'month2_annual_offer_shown'
/** Abriu o modal (clique no cartão, no aviso ou chegada pelo link do e-mail). */
export const MONTH2_ANNUAL_CLICKED_EVENT = 'month2_annual_offer_clicked'
/** Fechou o aviso do /studio no ×. */
export const MONTH2_ANNUAL_DISMISSED_EVENT = 'month2_annual_offer_dismissed'
/** A prévia (ensaio) chegou ao modal. */
export const MONTH2_ANNUAL_PREVIEW_EVENT = 'month2_annual_preview_viewed'
/** Apertou "Confirm" (o servidor grava o fato em `plan_switched_to_annual` com offer/source/surface). */
export const MONTH2_ANNUAL_CONFIRM_EVENT = 'month2_annual_confirm_clicked'
/**
 * Carimbo do e-mail do 2º mês (SERVIDOR): id determinístico por assinatura = 1 e-mail por assinatura, para sempre.
 * Está na lista canônica lib/lifecycle/emailEvents.ts (cala os outros jobs por 24 h) e é só-servidor no sink /api/events.
 */
export const MONTH2_ANNUAL_EMAIL_SENT_EVENT = 'month2_annual_offer_sent'
/** utm_campaign do e-mail (a chegada pelo link aparece no evento de clique com surface 'email'). */
export const MONTH2_ANNUAL_EMAIL_CAMPAIGN = 'month2_annual_30'

/** Onde a peça mora (telemetria e razão). O servidor aceita só estes. */
export const MONTH2_ANNUAL_SURFACES = ['account_billing', 'studio', 'email'] as const
export type Month2AnnualSurface = (typeof MONTH2_ANNUAL_SURFACES)[number]
export function month2Surface(value: unknown): Month2AnnualSurface | null {
  return typeof value === 'string' && (MONTH2_ANNUAL_SURFACES as readonly string[]).includes(value) ? (value as Month2AnnualSurface) : null
}

// ─── o que a rota devolve à tela ────────────────────────────────────────────────────────────────────────────────────
/** GET /api/stripe/switch-to-annual. `eligible` só é true com a oferta ligada e a assinatura passando em TODAS as regras. */
export type Month2AnnualStatus = {
  live: boolean
  eligible: boolean
  /** Códigos dos bloqueios (vazio quando elegível). Nunca texto: a tela traduz o que mostra. */
  reasons: string[]
  offer?: { id: string; percentOff: number }
  tier?: string
  monthlyMinor?: number
  annualMinor?: number
  twelveMonthsMinor?: number
  creditsPerMonth?: number
  refundDays?: number
}

/** POST sem confirm (ensaio): a prévia que o modal mostra antes do botão de confirmar. */
export type Month2AnnualPreview = {
  annualUsd: number
  annualMinor: number
  monthlyMinor: number
  prorationCreditMinor: number
  chargedNowMinor: number
  creditsPerMonth: number
  creditsBefore: number
  creditsAfter: number
  refundUntil: string
}

/** A tela só pinta com a oferta ligada E o servidor dizendo "elegível"; o aviso do /studio some para quem dispensou. */
export function month2OfferVisible(input: {
  live: boolean
  status: Month2AnnualStatus | null
  variant: 'card' | 'notice'
  dismissed: boolean
}): boolean {
  if (!input.live) return false
  const s = input.status
  if (!s || s.live !== true || s.eligible !== true) return false
  if (!(typeof s.annualMinor === 'number' && s.annualMinor > 0 && typeof s.monthlyMinor === 'number' && s.monthlyMinor > 0)) return false
  if (!(s.offer && typeof s.offer.percentOff === 'number' && s.offer.percentOff > 0)) return false
  if (input.variant === 'notice' && input.dismissed) return false
  return true
}

/** US$ em centavos → "$83" (inteiro) ou "$9.90". Sem regex: o valor nunca passa por replace. */
export function month2Money(minor: number): string {
  const n = Math.round(Number(minor))
  if (!Number.isFinite(n)) return ''
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const dollars = Math.floor(abs / 100)
  const cents = abs % 100
  return cents === 0 ? `${sign}$${dollars}` : `${sign}$${dollars}.${String(cents).padStart(2, '0')}`
}

/**
 * As frases da peça. Cada uma é chave de lib/ui/refinementCopy.json nas 16 línguas (en = identidade), com os mesmos
 * marcadores {x}. `switching` e `close` já existiam lá (troca de plano e modais da casa) e são reaproveitadas.
 * Números nunca são digitados aqui: {percent}, {days}, {annual}, {monthly}, {credits}, {charged} vêm das fontes.
 */
export const MONTH2_ANNUAL_COPY = {
  title: 'Switch to annual and save {percent}%',
  pitch: '{annual}/year instead of {monthly} × 12. Unused days are credited. Full refund within {days} days.',
  same: 'Same plan, same {credits} credits every month.',
  open: 'Switch to annual →',
  dismiss: 'Dismiss',
  modalTitle: 'Switch to annual',
  loading: 'Preparing your preview…',
  rowAnnual: 'Annual plan',
  perYear: '{annual}/year',
  rowCredit: 'Credit for unused days',
  rowDue: 'Due today',
  rowCredits: 'Your credits',
  rowMonthly: 'Every month after',
  creditsValue: '{credits} credits',
  rowRefund: 'Full refund until',
  confirm: 'Confirm — pay {charged} today',
  notNow: 'Not now',
  switching: 'Switching…',
  done: "Done — you're on the annual plan.",
  doneDetail: 'Charged today: {charged}. Balance: {credits} credits. Full refund until {date}.',
  close: 'Close',
  errNotEligible: 'This offer is not available for your subscription right now. Nothing was charged.',
  errCard: 'Your card was declined. Nothing changed — update your card in Manage billing and try again.',
  errGeneric: 'Could not switch right now. Nothing was charged — please try again.',
  errUnknown: 'We could not confirm the switch. Refresh the page to see your plan before trying again.',
  errAlready: 'You are already on the annual plan.',
  errPriceChanged: 'The price was updated. Review the new preview before confirming.',
} as const

export type Month2AnnualCopyKey = keyof typeof MONTH2_ANNUAL_COPY

/** Código de erro da rota → a frase honesta da tela. Desconhecido = "não confirmamos" (nunca "nada foi cobrado" sem saber). */
export function month2ErrorCopyKey(error: string | null | undefined): Month2AnnualCopyKey {
  switch (error) {
    case 'not_eligible':
    case 'offer_not_live':
    case 'no_subscription':
      return 'errNotEligible'
    case 'card_declined':
      return 'errCard'
    case 'already_switched':
      return 'errAlready'
    case 'price_changed':
      return 'errPriceChanged'
    case 'switch_failed':
    case 'preview_failed':
    case 'unavailable':
      return 'errGeneric'
    default:
      return 'errUnknown'
  }
}
