// ═══ KINEO-DUNNING-EMAIL-2026-10-06 — "sua renovação não passou": o aviso sai SOZINHO, na 1ª falha de cada fatura ═══
//
// O NÚMERO (06/10, banco, 30 dias): 4 assinantes tiveram a renovação recusada (`checkout_payment_failed` com
// is_renewal=true, todas insufficient_funds) e 2 deles já viraram `free` quando a Stripe desistiu — sem uma linha nossa.
// Os dois avisos que existiam não chegam em quem precisa:
//   · o banner do app (components/RenewalDeclinedBanner, `renewal_declined_banner_shown`) só aparece para quem VOLTA ao
//     app — e quem está com o cartão recusado não volta (30 dias: 2 impressões e 1 clique, da mesma pessoa);
//   · a carta manual app/api/admin/send-renewal-declined (18/09) nunca saiu: `renewal_declined_emailed_v1` tem ZERO
//     linhas na história — ela não tem cron, depende de clique.
// É MRR perdido sem o cliente querer sair.
//
// ESTE MÓDULO É PURO (o import é de outro módulo puro, relativo; sem rede, sem banco). O webhook da Stripe faz o I/O
// (app/api/stripe/webhook/route.ts, sendRenewalFailedEmailOnce) e pergunta aqui SE manda e O QUE manda:
//   1. Só RENOVAÇÃO: billing_reason 'subscription_cycle', de quem já pagou (has_paid). Nunca a fatura do checkout
//      inicial ('subscription_create'), nunca a de proration ('subscription_update'). has_paid segura a porta do
//      teste com cartão (hoje fechada): a 1ª cobrança depois do teste também é 'subscription_cycle', e não é renovação.
//   2. Só a 1ª falha de cada FATURA: 1 e-mail por fatura, carimbado em `events` (RENEWAL_FAILED_EMAIL_EVENT com
//      metadata.invoice_id). As repetições da Stripe na mesma fatura não reenviam. A régua é "nenhuma carta para esta
//      fatura", não "attempt_count === 1": se a 1ª falha não conseguiu mandar (Resend fora do ar) ou a fatura já
//      estava em cobrança quando isto subiu, a próxima falha da MESMA fatura manda a única carta.
//   3. Só enquanto dá para salvar: assinatura em cobrança (`past_due`, a Stripe ainda tenta — mesma peça do webhook,
//      ./subscriptionAccess). Ativa = já pagou; cancelada/unpaid = trocar o cartão no portal não devolve o plano.
//   4. Transacional: o opt-out de MARKETING (`email_opted_out`) NÃO cala este e-mail. É aviso de cobrança de uma
//      assinatura viva — sem ele a pessoa perde o plano sem saber por quê.
//   5. Dedupe que não pôde ser lida (null) = NÃO envia agora: a próxima tentativa da Stripe pergunta de novo.
//      "Um e-mail por fatura" vale mais que "agora".
//
// INTERRUPTOR DE REVERSÃO: RENEWAL_FAILED_EMAIL_LIVE = false. Nenhum e-mail sai; o webhook continua gravando o pulo
// (`renewal_payment_failed_email_skipped`, reason 'switch_off'), para a medição não perder o denominador.
import { stripeSubscriptionIsDunning } from './subscriptionAccess'

export const RENEWAL_FAILED_EMAIL_LIVE = true

export const RENEWAL_FAILED_EMAIL_VERSION = 'renewal_failed_email_v1'
/** "Uma mensagem saiu para esta pessoa" — está na lista canônica lib/lifecycle/emailEvents.ts (cala os outros por 24 h). */
export const RENEWAL_FAILED_EMAIL_EVENT = 'renewal_payment_failed_email_sent'
/** Avaliado e não enviado (com `reason`). NÃO entra na lista canônica: nada saiu. */
export const RENEWAL_FAILED_EMAIL_SKIPPED_EVENT = 'renewal_payment_failed_email_skipped'
/** O Resend recusou ou não respondeu a tempo. Sem carimbo: a próxima falha da mesma fatura tenta de novo. */
export const RENEWAL_FAILED_EMAIL_FAILED_EVENT = 'renewal_payment_failed_email_failed'
/** `email_send_log.kind` (lib/email/quota.ts) — prioridade 'revenue', nunca cede a vaga do dia. */
export const RENEWAL_FAILED_EMAIL_KIND = 'renewal_payment_failed'

/** O MESMO remetente da carta de renovação recusada aprovada pelo fundador em 18/09: joseph@ é a caixa real. */
export const RENEWAL_FAILED_EMAIL_FROM = 'Joseph at Kineo <joseph@usekineo.com>'
export const RENEWAL_FAILED_EMAIL_REPLY_TO = 'joseph@usekineo.com'
/** Teto do POST no Resend: isto roda dentro do webhook da Stripe (mesmo teto do alerta ao fundador, lib/founderAlert.ts). */
export const RENEWAL_FAILED_EMAIL_TIMEOUT_MS = 3000

export const RENEWAL_FAILED_SITE = 'https://www.usekineo.com'
/** Rota GET que exige sessão e abre o portal da Stripe na troca de cartão (app/api/stripe/portal/update-card). */
export const RENEWAL_FAILED_UPDATE_CARD_PATH = '/api/stripe/portal/update-card'
export const RENEWAL_FAILED_CAMPAIGN = 'renewal_failed'
export const RENEWAL_FAILED_UPDATE_CARD_URL = `${RENEWAL_FAILED_SITE}${RENEWAL_FAILED_UPDATE_CARD_PATH}?utm_source=lifecycle&utm_medium=email&utm_campaign=${RENEWAL_FAILED_CAMPAIGN}`
/** Cada abertura da rota do botão (o clique cai numa rota de API, que nenhum rastreador de página vê). */
export const BILLING_UPDATE_CARD_OPENED_EVENT = 'billing_update_card_opened'

export type RenewalFailedEmailSkipReason =
  | 'switch_off'
  | 'not_renewal'
  | 'no_invoice'
  | 'no_owner'
  | 'never_paid'
  | 'not_dunning'
  | 'cancel_scheduled' // KINEO-CARTAO-RECUSADO-0111b — pediu para cancelar (fim do período / data marcada)
  | 'dedupe_unavailable'
  | 'already_sent_for_invoice'
  | 'no_recipient'

export type RenewalFailedEmailDecision =
  | { send: true; reason: 'first_failure_for_invoice' }
  | { send: false; reason: RenewalFailedEmailSkipReason }

export interface RenewalFailedEmailFacts {
  live: boolean
  /** invoice.billing_reason da fatura que falhou. */
  billingReason: string | null | undefined
  invoiceId: string | null | undefined
  /** Dono resolvido pela assinatura (profiles.stripe_subscription_id). */
  ownerId: string | null | undefined
  ownerHasPaid: boolean
  /** Status VIVO da assinatura (stripe.subscriptions.retrieve), não o do payload do evento. */
  subscriptionStatus: string | null | undefined
  /** KINEO-CARTAO-RECUSADO-0111b — a assinatura VIVA tem cancelamento marcado (stripeSubscriptionCancelScheduled). */
  cancelScheduled: boolean
  /** Já existe RENEWAL_FAILED_EMAIL_EVENT para esta fatura? null = a leitura falhou. */
  alreadySentForInvoice: boolean | null
  recipientEmail: string | null | undefined
  /** Lido e IGNORADO de propósito (regra 4): o opt-out é de marketing, este aviso é transacional. */
  marketingOptOut: boolean
}

// ═══ KINEO-CARTAO-RECUSADO-0111b — quem PEDIU para cancelar não recebe "troque o cartão" ═══
// O cancelamento é pelo portal da Stripe (app/api/stripe/portal/route.ts, fluxo subscription_cancel). No modo "cancelar no
// fim do período" a assinatura continua `past_due` e a Stripe continua tentando o cartão: sem esta porta, quem cancelou
// recebia o lembrete do dia 3 e o último do dia 7 pedindo para atualizar o cartão — e, se atualizasse, pagava um período
// que pediu para não pagar. A casa já pula esse caso em app/api/cron/send-trial-eve-notice/route.ts
// (`if (sub.cancel_at_period_end) continue`). `cancel_at` cobre o cancelamento com DATA marcada (a casa nunca grava
// `cancel_at` por conta própria — grep em app/ e lib/ —, então qualquer data ali é pedido de cancelamento). Puro.
// Nas duas decisões a porta falha FECHADA: `cancelScheduled` diferente de `false` (ausente, desconhecido) = não envia.
export function stripeSubscriptionCancelScheduled(
  sub: { cancel_at_period_end?: boolean | null; cancel_at?: number | null } | null | undefined,
): boolean {
  if (!sub) return false
  if (sub.cancel_at_period_end === true) return true
  return typeof sub.cancel_at === 'number' && Number.isFinite(sub.cancel_at) && sub.cancel_at > 0
}

export function isDeliverableEmail(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function decideRenewalFailedEmail(f: RenewalFailedEmailFacts): RenewalFailedEmailDecision {
  if (!f.live) return { send: false, reason: 'switch_off' }
  if (f.billingReason !== 'subscription_cycle') return { send: false, reason: 'not_renewal' }
  if (!f.invoiceId) return { send: false, reason: 'no_invoice' }
  if (!f.ownerId) return { send: false, reason: 'no_owner' }
  if (f.ownerHasPaid !== true) return { send: false, reason: 'never_paid' }
  if (!stripeSubscriptionIsDunning(f.subscriptionStatus)) return { send: false, reason: 'not_dunning' }
  if (f.cancelScheduled !== false) return { send: false, reason: 'cancel_scheduled' }
  if (f.alreadySentForInvoice === null) return { send: false, reason: 'dedupe_unavailable' }
  if (f.alreadySentForInvoice) return { send: false, reason: 'already_sent_for_invoice' }
  if (!isDeliverableEmail(f.recipientEmail)) return { send: false, reason: 'no_recipient' }
  return { send: true, reason: 'first_failure_for_invoice' }
}

// ═══ KINEO-CARTAO-RECUSADO-1510 — o botão vira 1 clique de verdade, o motivo vira frase, e o dia 2 ganha lembrete ═══
// MEDIDO (15/10, banco, 60 dias, sem internas): 4 assinantes com renovação recusada (akajitin NG, valos87196 AU,
// salswina SA, cintia ES). A graça funciona (salswina ficou Studio por 21 dias e 5 tentativas; cintia segue Starter),
// mas o aviso por e-mail saiu 2 vezes na história (salswina só na 4ª tentativa, 16 dias depois da 1ª recusa) e o botão
// levava a uma rota que EXIGE LOGIN antes de abrir o portal: quem está com o cartão recusado, no celular e sem sessão,
// para na tela de login. Nenhum lembrete existia: um e-mail por fatura e silêncio até a Stripe desistir.
//  1. LINK: a fatura aberta da Stripe tem `hosted_invoice_url` — página da própria Stripe, sem login, onde a pessoa põe
//     outro cartão e PAGA na hora (a cobrança é retentada no ato, não no próximo agendamento). Só se aceita URL em
//     https://invoice.stripe.com/; qualquer outra coisa (ou ausência) cai na rota do portal de sempre.
//  2. MOTIVO: o `reason_category` (lib/stripeCheckoutFailure.ts) vira UMA frase humana na língua da carta, sem número,
//     bandeira nem final de cartão. Sem categoria → frase genérica ("o banco recusou").
//  3. LEMBRETE: 1 por fatura, ≥ RENEWAL_FAILED_REMINDER_AFTER_HOURS depois do 1º aviso, só com a fatura AINDA aberta
//     (relida na Stripe no momento do envio) e a assinatura ainda em cobrança. Quem pagou não recebe nada.
export const STRIPE_HOSTED_INVOICE_HOST = 'invoice.stripe.com'

/** A URL é a página de fatura hospedada da Stripe (https, host exato)? Puro: só lê a string. */
export function isStripeHostedInvoiceUrl(value: string | null | undefined): boolean {
  if (typeof value !== 'string' || !value) return false
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && u.hostname === STRIPE_HOSTED_INVOICE_HOST
  } catch {
    return false
  }
}

/** O destino do botão: a fatura hospedada (1 clique, sem login) quando existe; senão a rota do portal. */
export function renewalPayUrl(hostedInvoiceUrl: string | null | undefined): string {
  return isStripeHostedInvoiceUrl(hostedInvoiceUrl) ? String(hostedInvoiceUrl) : RENEWAL_FAILED_UPDATE_CARD_URL
}

/** Lembrete do dia 2 — carimbo próprio, 1 por fatura (metadata.invoice_id). Na lista canônica de e-mails. */
export const RENEWAL_FAILED_REMINDER_EVENT = 'renewal_payment_failed_reminder_sent'
/** O Resend recusou o lembrete (sem carimbo: a próxima rodada tenta de novo). */
export const RENEWAL_FAILED_REMINDER_FAILED_EVENT = 'renewal_payment_failed_reminder_failed'
export const RENEWAL_FAILED_REMINDER_KIND = 'renewal_payment_failed_reminder'
/**
 * Horas mínimas entre o 1º aviso e o lembrete. O cron roda 2×/dia: o lembrete sai entre 48 h e ~56 h depois (dia 3).
 * reancorado KINEO-CARTAO-RECUSADO-0111 — era 20 h (dia 2). A régua nova é dia 1 · dia 3 · dia 7 (ver o bloco abaixo).
 */
export const RENEWAL_FAILED_REMINDER_AFTER_HOURS = 48

// ═══ KINEO-CARTAO-RECUSADO-0111 — o laço fecha: 1º aviso (dia 1) · lembrete (dia 3) · último lembrete (dia 7) ═══
// MEDIDO (01/11, banco): a cintia (ES, Starter) teve a fatura in_1UMC… recusada em 02/10, 08/10, 15/10 e 24/10. O laço
// automático FUNCIONOU duas vezes (1º aviso em 08/10, lembrete em 15/10) e depois CALOU: 4ª recusa em 24/10 sem uma linha,
// até a carta manual de 31/10. A régua antiga era "um aviso + um lembrete" e a Stripe segue tentando por semanas.
// Agora são 3 e-mails por fatura, todos com a fatura RELIDA na Stripe no momento do envio:
//   attempt 1 — 1º aviso, na 1ª falha (webhook) ou na rodada seguinte se o webhook não conseguiu;
//   attempt 2 — lembrete, ≥ 48 h depois do 1º aviso (dia 3);
//   attempt 3 — último lembrete, ≥ 144 h depois do 1º aviso (dia 7) e ≥ 48 h depois do lembrete, e só enquanto o 1º aviso
//               tem no máximo RENEWAL_FAILED_FINAL_MAX_AGE_HOURS: fatura antiga (de antes desta régua) não recebe um
//               "dia 7" semanas depois. Pagou, anulou, cancelou → a fatura não está 'open' / a assinatura não está em
//               cobrança → nada sai.
// Cada envio grava, além do carimbo de dedupe da etapa, CARD_FAILED_EMAIL_SENT_EVENT com `attempt` 1/2/3 — a medição
// única do laço. A fatura paga depois de falha vira CARD_RECOVERED_EVENT (lib/billing/cardRecovered.ts).
export const RENEWAL_FAILED_FINAL_EVENT = 'renewal_payment_failed_final_sent'
export const RENEWAL_FAILED_FINAL_FAILED_EVENT = 'renewal_payment_failed_final_failed'
export const RENEWAL_FAILED_FINAL_KIND = 'renewal_payment_failed_final'
export const RENEWAL_FAILED_FINAL_AFTER_HOURS = 144
export const RENEWAL_FAILED_FINAL_MIN_GAP_HOURS = 48
export const RENEWAL_FAILED_FINAL_MAX_AGE_HOURS = 14 * 24
/** Medição única do laço: 1 linha por e-mail que SAIU (Resend ok), com `attempt` 1/2/3. Só o servidor grava. */
export const CARD_FAILED_EMAIL_SENT_EVENT = 'card_failed_email_sent'
/** Fatura de assinatura paga depois de ter falhado (attempt_count > 1 ou e-mail nosso para ela). Só o servidor grava. */
export const CARD_RECOVERED_EVENT = 'card_recovered'
/** Banner "Your last payment didn't go through — update your card" (components/RenewalDeclinedBanner.tsx). */
export const CARD_UPDATE_BANNER_SHOWN_EVENT = 'card_update_banner_shown'
export const CARD_UPDATE_BANNER_CLICKED_EVENT = 'card_update_banner_clicked'

export type RenewalFollowUpStage = 'first' | 'reminder' | 'final'

/** attempt 1/2/3 de CARD_FAILED_EMAIL_SENT_EVENT. */
export function cardFailedEmailAttempt(stage: RenewalFollowUpStage): 1 | 2 | 3 {
  return stage === 'final' ? 3 : stage === 'reminder' ? 2 : 1
}

/**
 * Cartão BRASILEIRO recusado numa cobrança em DÓLAR — o caso que a casa já trata no checkout (resolveSettlementCurrency,
 * priorBrazilianCardFailure → sessão nova em reais). Na RENOVAÇÃO não existe trilho em reais/Pix: a fatura é da assinatura
 * em USD, a página hospedada da Stripe só oferece Pix em fatura BRL, e o checkout bloqueia uma 2ª assinatura enquanto a
 * 1ª está em cobrança. Por isso a carta NÃO promete Pix: diz o que resolve de verdade (liberar compra internacional ou
 * usar outro cartão). Puro.
 */
export function isBrazilianCardInUsd(currency: string | null | undefined, cardCountry: string | null | undefined): boolean {
  const cur = typeof currency === 'string' ? currency.trim().toLowerCase() : ''
  const cc = typeof cardCountry === 'string' ? cardCountry.trim().toUpperCase() : ''
  return cur === 'usd' && cc === 'BR'
}

export type RenewalFollowUpSkipReason =
  | 'switch_off'
  | 'not_renewal'
  | 'no_invoice'
  | 'invoice_not_open'
  | 'not_dunning'
  | 'cancel_scheduled' // KINEO-CARTAO-RECUSADO-0111b — pediu para cancelar: nada de "troque o cartão"
  | 'no_owner'
  | 'never_paid'
  | 'internal'
  | 'dedupe_unavailable'
  | 'already_reminded'
  | 'no_recipient'
  | 'too_soon'
  | 'sequence_done' // KINEO-CARTAO-RECUSADO-0111 — os 3 e-mails desta fatura já saíram
  | 'final_window_passed' // KINEO-CARTAO-RECUSADO-0111 — o "dia 7" passou da janela (fatura de antes da régua)

export type RenewalFollowUpDecision =
  | { send: true; stage: 'first'; reason: 'first_notice_missing' }
  | { send: true; stage: 'reminder'; reason: 'reminder_due' }
  | { send: true; stage: 'final'; reason: 'final_due' } // KINEO-CARTAO-RECUSADO-0111
  | { send: false; reason: RenewalFollowUpSkipReason }

export interface RenewalFollowUpFacts {
  live: boolean
  billingReason: string | null | undefined
  invoiceId: string | null | undefined
  /** Status da fatura RELIDO na Stripe no momento do envio ('open' = ainda não pagou). */
  invoiceStatus: string | null | undefined
  /** Status VIVO da assinatura. */
  subscriptionStatus: string | null | undefined
  /** KINEO-CARTAO-RECUSADO-0111b — a assinatura VIVA tem cancelamento marcado (stripeSubscriptionCancelScheduled). */
  cancelScheduled: boolean
  ownerId: string | null | undefined
  ownerHasPaid: boolean
  internal: boolean
  /** As duas leituras de carimbo (1º aviso e lembrete) deram certo? false = desconhecido = não envia agora. */
  dedupeReadable: boolean
  /** created_at do carimbo do 1º aviso desta fatura, ou null se nunca saiu. */
  firstSentAt: string | null
  reminderSent: boolean
  // KINEO-CARTAO-RECUSADO-0111 — opcionais: sem eles o último lembrete (dia 7) não sai.
  /** created_at do carimbo do lembrete desta fatura, ou null. */
  reminderSentAt?: string | null
  /** O último lembrete (dia 7) desta fatura já saiu? */
  finalSent?: boolean
  recipientEmail: string | null | undefined
  nowMs: number
}

/**
 * A rodada do cron (2×/dia): para cada fatura de renovação em cobrança, manda o 1º aviso que o webhook não conseguiu
 * mandar (Resend fora, fatura anterior a 06/10) OU o lembrete do dia 2. Todas as portas falham FECHADAS.
 */
export function decideRenewalFollowUp(x: RenewalFollowUpFacts): RenewalFollowUpDecision {
  if (!x.live) return { send: false, reason: 'switch_off' }
  if (x.billingReason !== 'subscription_cycle') return { send: false, reason: 'not_renewal' }
  if (!x.invoiceId) return { send: false, reason: 'no_invoice' }
  if (x.invoiceStatus !== 'open') return { send: false, reason: 'invoice_not_open' }
  if (!stripeSubscriptionIsDunning(x.subscriptionStatus)) return { send: false, reason: 'not_dunning' }
  if (x.cancelScheduled !== false) return { send: false, reason: 'cancel_scheduled' }
  if (!x.ownerId) return { send: false, reason: 'no_owner' }
  if (x.ownerHasPaid !== true) return { send: false, reason: 'never_paid' }
  if (x.internal) return { send: false, reason: 'internal' }
  if (!x.dedupeReadable) return { send: false, reason: 'dedupe_unavailable' }
  if (x.finalSent === true) return { send: false, reason: 'sequence_done' }
  if (!isDeliverableEmail(x.recipientEmail)) return { send: false, reason: 'no_recipient' }
  if (x.firstSentAt === null) {
    // Lembrete sem 1º aviso não existe na régua: carimbo incoerente = não sabemos = não envia agora.
    if (x.reminderSent) return { send: false, reason: 'already_reminded' }
    return { send: true, stage: 'first', reason: 'first_notice_missing' }
  }
  const firstMs = Date.parse(x.firstSentAt)
  if (!Number.isFinite(firstMs)) return { send: false, reason: 'dedupe_unavailable' }
  if (!x.reminderSent) {
    if (x.nowMs - firstMs < RENEWAL_FAILED_REMINDER_AFTER_HOURS * 3_600_000) return { send: false, reason: 'too_soon' }
    return { send: true, stage: 'reminder', reason: 'reminder_due' }
  }
  // KINEO-CARTAO-RECUSADO-0111 — o último lembrete (dia 7): precisa da data do lembrete para respeitar o intervalo.
  if (typeof x.reminderSentAt !== 'string') return { send: false, reason: 'already_reminded' }
  const reminderMs = Date.parse(x.reminderSentAt)
  if (!Number.isFinite(reminderMs)) return { send: false, reason: 'dedupe_unavailable' }
  if (x.nowMs - firstMs < RENEWAL_FAILED_FINAL_AFTER_HOURS * 3_600_000) return { send: false, reason: 'too_soon' }
  if (x.nowMs - reminderMs < RENEWAL_FAILED_FINAL_MIN_GAP_HOURS * 3_600_000) return { send: false, reason: 'too_soon' }
  if (x.nowMs - firstMs > RENEWAL_FAILED_FINAL_MAX_AGE_HOURS * 3_600_000) return { send: false, reason: 'final_window_passed' }
  return { send: true, stage: 'final', reason: 'final_due' }
}

// ── Língua ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// O perfil não guarda língua (a escolha da interface mora só no localStorage do navegador) e nenhuma conta paga tem
// locale nos metadados do login (medido 06/10). O sinal que existe no servidor é o país: `last_country` quando houver,
// senão `signup_country` (preenchido em 20 de 20 contas pagas). País fora das listas → inglês.
export type RenewalEmailLanguage = 'en' | 'pt' | 'es'

const PORTUGUESE_COUNTRIES = new Set(['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'])
const SPANISH_COUNTRIES = new Set([
  'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ',
])

export function renewalEmailLanguage(country: string | null | undefined): RenewalEmailLanguage {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : ''
  if (PORTUGUESE_COUNTRIES.has(code)) return 'pt'
  if (SPANISH_COUNTRIES.has(code)) return 'es'
  return 'en'
}

// ── Nome do plano ──────────────────────────────────────────────────────────────────────────────────────────────────────
// Espelho (sem import) dos nomes públicos que a carta manual usa: tier interno → nome que o cliente comprou.
const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  basic: 'Creator',
  creator: 'Creator',
  pro: 'Studio',
  studio: 'Studio',
  autopilot: 'Autopilot',
  autopilot_lite: 'Autopilot Lite',
  business: 'Business', // KINEO-BUSINESS-84-2026-10-09
}

export function renewalPlanLabel(tier: string | null | undefined): string | null {
  const key = typeof tier === 'string' ? tier.trim().toLowerCase().replace(/_trial$/, '') : ''
  return PLAN_LABEL[key] ?? null
}

// ── Textos ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Curto: o que aconteceu; vídeos e créditos guardados; UM botão. Sem desconto, sem preço, sem prazo inventado.
// "Plano ativo por enquanto" é verdade enquanto a assinatura está em cobrança (a graça de stripe_dunning_grace_v1).
export interface RenewalFailedCopy {
  subject: string
  greeting: string
  what: (plan: string | null) => string
  safe: string
  button: string
  how: string
  signoff: string
  why: string
  // KINEO-CARTAO-RECUSADO-1510 — os campos abaixo só entram quando há fatura hospedada / motivo / lembrete.
  /** "how" quando o botão é a fatura hospedada da Stripe (sem login). */
  howHosted: string
  /** O motivo do banco em UMA frase humana (sem dado de cartão). */
  reason: (category: string | null | undefined) => string
  reminderSubject: string
  reminderWhat: (plan: string | null) => string
  // KINEO-CARTAO-RECUSADO-0111 — último lembrete (dia 7) e a dica do cartão brasileiro em cobrança em dólar.
  finalSubject: string
  finalWhat: (plan: string | null) => string
  brCardUsd: string
}

export const RENEWAL_FAILED_COPY: Record<RenewalEmailLanguage, RenewalFailedCopy> = {
  en: {
    subject: "Your Kineo renewal didn't go through",
    greeting: 'Hi,',
    what: (plan) => `The payment to renew your Kineo${plan ? ` ${plan}` : ''} plan didn't go through.`,
    safe: 'Your videos and credits are safe, and your plan stays on for now. To keep it, update your card:',
    button: 'Update card',
    how: "You'll sign in and land on Stripe's secure page to change the card. Questions? Just reply to this email.",
    signoff: '— Joseph, Kineo',
    why: "You're getting this because a payment for your Kineo subscription didn't go through.",
    howHosted: "It opens Stripe's secure payment page — no sign-in needed. Use another card and the renewal goes through right away. Questions? Just reply to this email.",
    reason: (category) => {
      switch (category) {
        case 'insufficient_funds': return 'Your bank said the card did not have enough funds at that moment.'
        case 'expired_card': return 'The card on file has expired.'
        case 'card_restricted': return 'Your bank blocked this type of charge on the card (common with international or recurring payments).'
        case 'authentication_required': return 'Your bank asked for an extra confirmation that was not completed.'
        case 'incorrect_card_details': return 'Some of the card details no longer match.'
        case 'fraud_or_risk': return 'Your bank flagged the charge and stopped it.'
        default: return 'Your bank declined the charge.'
      }
    },
    reminderSubject: 'Reminder: your Kineo renewal is still pending',
    reminderWhat: (plan) => `Quick reminder: the payment to renew your Kineo${plan ? ` ${plan}` : ''} plan still hasn't gone through.`,
    finalSubject: 'Last reminder: your Kineo renewal is still pending',
    finalWhat: (plan) => `Last note from me on this: the payment to renew your Kineo${plan ? ` ${plan}` : ''} plan still hasn't gone through, and Stripe keeps retrying the same card.`,
    brCardUsd: 'Brazilian cards are often declined on charges in US dollars when international purchases are turned off. Turning them on in your bank app, or using another card, usually fixes it.',
  },
  pt: {
    subject: 'Sua renovação da Kineo não passou',
    greeting: 'Oi,',
    what: (plan) => `O pagamento para renovar o seu plano Kineo${plan ? ` ${plan}` : ''} não passou.`,
    safe: 'Seus vídeos e créditos estão guardados, e o seu plano continua ativo por enquanto. Para mantê-lo, atualize o cartão:',
    button: 'Atualizar cartão',
    how: 'Você entra na sua conta e cai na página segura da Stripe para trocar o cartão. Dúvidas? É só responder este e-mail.',
    signoff: '— Joseph, da Kineo',
    why: 'Você recebeu este aviso porque um pagamento da sua assinatura Kineo não passou.',
    howHosted: 'Abre a página segura de pagamento da Stripe — sem precisar entrar na conta. Use outro cartão e a renovação passa na hora. Dúvidas? É só responder este e-mail.',
    reason: (category) => {
      switch (category) {
        case 'insufficient_funds': return 'O banco informou saldo insuficiente no cartão naquele momento.'
        case 'expired_card': return 'O cartão cadastrado venceu.'
        case 'card_restricted': return 'O banco bloqueou esse tipo de cobrança no cartão (comum em pagamento internacional ou recorrente).'
        case 'authentication_required': return 'O banco pediu uma confirmação extra que não foi concluída.'
        case 'incorrect_card_details': return 'Algum dado do cartão não confere mais.'
        case 'fraud_or_risk': return 'O banco sinalizou a cobrança e a barrou.'
        default: return 'O banco recusou a cobrança.'
      }
    },
    reminderSubject: 'Lembrete: sua renovação da Kineo ainda está pendente',
    reminderWhat: (plan) => `Só lembrando: o pagamento para renovar o seu plano Kineo${plan ? ` ${plan}` : ''} ainda não passou.`,
    finalSubject: 'Último lembrete: sua renovação da Kineo ainda está pendente',
    finalWhat: (plan) => `Último aviso meu sobre isso: o pagamento para renovar o seu plano Kineo${plan ? ` ${plan}` : ''} ainda não passou, e a Stripe segue tentando o mesmo cartão.`,
    brCardUsd: 'Cartão brasileiro costuma ser recusado em cobrança em dólar quando a compra internacional está desligada. Ligar a compra internacional no app do banco, ou usar outro cartão, costuma resolver.',
  },
  es: {
    subject: 'Tu renovación de Kineo no se completó',
    greeting: 'Hola:',
    what: (plan) => `El pago para renovar tu plan Kineo${plan ? ` ${plan}` : ''} no se completó.`,
    safe: 'Tus videos y créditos están guardados, y tu plan sigue activo por ahora. Para mantenerlo, actualiza tu tarjeta:',
    button: 'Actualizar tarjeta',
    how: 'Inicias sesión y llegas a la página segura de Stripe para cambiar la tarjeta. ¿Dudas? Solo responde a este correo.',
    signoff: '— Joseph, de Kineo',
    why: 'Recibes este aviso porque un pago de tu suscripción de Kineo no se completó.',
    howHosted: 'Se abre la página de pago segura de Stripe, sin iniciar sesión. Usa otra tarjeta y la renovación se completa al momento. ¿Dudas? Solo responde a este correo.',
    reason: (category) => {
      switch (category) {
        case 'insufficient_funds': return 'Tu banco indicó fondos insuficientes en la tarjeta en ese momento.'
        case 'expired_card': return 'La tarjeta registrada venció.'
        case 'card_restricted': return 'Tu banco bloqueó este tipo de cobro en la tarjeta (es común en pagos internacionales o recurrentes).'
        case 'authentication_required': return 'Tu banco pidió una confirmación adicional que no se completó.'
        case 'incorrect_card_details': return 'Algún dato de la tarjeta ya no coincide.'
        case 'fraud_or_risk': return 'Tu banco marcó el cobro y lo detuvo.'
        default: return 'Tu banco rechazó el cobro.'
      }
    },
    reminderSubject: 'Recordatorio: tu renovación de Kineo sigue pendiente',
    reminderWhat: (plan) => `Un recordatorio: el pago para renovar tu plan Kineo${plan ? ` ${plan}` : ''} todavía no se completó.`,
    finalSubject: 'Último recordatorio: tu renovación de Kineo sigue pendiente',
    finalWhat: (plan) => `Último aviso mío sobre esto: el pago para renovar tu plan Kineo${plan ? ` ${plan}` : ''} todavía no se completó, y Stripe sigue intentando con la misma tarjeta.`,
    brCardUsd: 'Las tarjetas brasileñas suelen ser rechazadas en cobros en dólares cuando las compras internacionales están desactivadas. Activarlas en la app del banco, o usar otra tarjeta, suele resolverlo.',
  },
}

export interface RenewalFailedEmailMessage {
  language: RenewalEmailLanguage
  subject: string
  text: string
  html: string
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renewalFailedEmailMessage(input: {
  language: RenewalEmailLanguage
  tier?: string | null
  // KINEO-CARTAO-RECUSADO-1510 — opcionais: sem eles a carta é EXATAMENTE a de 06/10 (rota do portal, sem motivo).
  /** invoice.hosted_invoice_url — validada por renewalPayUrl; inválida/ausente = rota do portal. */
  hostedInvoiceUrl?: string | null
  /** reason_category (lib/stripeCheckoutFailure.ts). undefined = não diz motivo; null/desconhecido = frase genérica. */
  reasonCategory?: string | null
  stage?: RenewalFollowUpStage // KINEO-CARTAO-RECUSADO-0111 — + 'final' (dia 7)
  /** KINEO-CARTAO-RECUSADO-0111 — cartão BR recusado em cobrança USD (isBrazilianCardInUsd): acrescenta a dica. */
  brazilianCardInUsd?: boolean
}): RenewalFailedEmailMessage {
  const language: RenewalEmailLanguage = RENEWAL_FAILED_COPY[input.language] ? input.language : 'en'
  const c = RENEWAL_FAILED_COPY[language]
  const plan = renewalPlanLabel(input.tier)
  const reminder = input.stage === 'reminder'
  const final = input.stage === 'final' // KINEO-CARTAO-RECUSADO-0111
  const what = final ? c.finalWhat(plan) : reminder ? c.reminderWhat(plan) : c.what(plan)
  const reasonBase = input.reasonCategory === undefined ? null : c.reason(input.reasonCategory)
  const reason = input.brazilianCardInUsd === true ? [reasonBase, c.brCardUsd].filter(Boolean).join(' ') : reasonBase
  const url = renewalPayUrl(input.hostedInvoiceUrl)
  const how = url === RENEWAL_FAILED_UPDATE_CARD_URL ? c.how : c.howHosted
  const text = [
    c.greeting,
    '',
    what,
    ...(reason ? [reason] : []),
    '',
    c.safe,
    url,
    '',
    how,
    '',
    c.signoff,
    '',
    '—',
    c.why,
    'Kineo · usekineo.com',
  ].join('\n')
  const html = `<div lang="${language}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>${escapeHtml(c.greeting)}</p>
<p>${escapeHtml(what)}${reason ? ` ${escapeHtml(reason)}` : ''}</p>
<p>${escapeHtml(c.safe)}</p>
<p style="margin:18px 0"><a href="${escapeHtml(url)}" style="background:#2997ff;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">${escapeHtml(c.button)}</a></p>
<p style="color:#555555;font-size:13px">${escapeHtml(how)}</p>
<p>${escapeHtml(c.signoff)}</p>
<p style="margin-top:28px;color:#94a3b8;font-size:12px">${escapeHtml(c.why)}<br>Kineo &middot; usekineo.com</p>
</div>`
  return { language, subject: final ? c.finalSubject : reminder ? c.reminderSubject : c.subject, text, html }
}
