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
  /** Já existe RENEWAL_FAILED_EMAIL_EVENT para esta fatura? null = a leitura falhou. */
  alreadySentForInvoice: boolean | null
  recipientEmail: string | null | undefined
  /** Lido e IGNORADO de propósito (regra 4): o opt-out é de marketing, este aviso é transacional. */
  marketingOptOut: boolean
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
/** Horas mínimas entre o 1º aviso e o lembrete. O cron roda 2×/dia: o lembrete sai entre 20 h e ~32 h depois (dia 2). */
export const RENEWAL_FAILED_REMINDER_AFTER_HOURS = 20

export type RenewalFollowUpSkipReason =
  | 'switch_off'
  | 'not_renewal'
  | 'no_invoice'
  | 'invoice_not_open'
  | 'not_dunning'
  | 'no_owner'
  | 'never_paid'
  | 'internal'
  | 'dedupe_unavailable'
  | 'already_reminded'
  | 'no_recipient'
  | 'too_soon'

export type RenewalFollowUpDecision =
  | { send: true; stage: 'first'; reason: 'first_notice_missing' }
  | { send: true; stage: 'reminder'; reason: 'reminder_due' }
  | { send: false; reason: RenewalFollowUpSkipReason }

export interface RenewalFollowUpFacts {
  live: boolean
  billingReason: string | null | undefined
  invoiceId: string | null | undefined
  /** Status da fatura RELIDO na Stripe no momento do envio ('open' = ainda não pagou). */
  invoiceStatus: string | null | undefined
  /** Status VIVO da assinatura. */
  subscriptionStatus: string | null | undefined
  ownerId: string | null | undefined
  ownerHasPaid: boolean
  internal: boolean
  /** As duas leituras de carimbo (1º aviso e lembrete) deram certo? false = desconhecido = não envia agora. */
  dedupeReadable: boolean
  /** created_at do carimbo do 1º aviso desta fatura, ou null se nunca saiu. */
  firstSentAt: string | null
  reminderSent: boolean
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
  if (!x.ownerId) return { send: false, reason: 'no_owner' }
  if (x.ownerHasPaid !== true) return { send: false, reason: 'never_paid' }
  if (x.internal) return { send: false, reason: 'internal' }
  if (!x.dedupeReadable) return { send: false, reason: 'dedupe_unavailable' }
  if (x.reminderSent) return { send: false, reason: 'already_reminded' }
  if (!isDeliverableEmail(x.recipientEmail)) return { send: false, reason: 'no_recipient' }
  if (x.firstSentAt === null) return { send: true, stage: 'first', reason: 'first_notice_missing' }
  const firstMs = Date.parse(x.firstSentAt)
  if (!Number.isFinite(firstMs)) return { send: false, reason: 'dedupe_unavailable' }
  if (x.nowMs - firstMs < RENEWAL_FAILED_REMINDER_AFTER_HOURS * 3_600_000) return { send: false, reason: 'too_soon' }
  return { send: true, stage: 'reminder', reason: 'reminder_due' }
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
  stage?: 'first' | 'reminder'
}): RenewalFailedEmailMessage {
  const language: RenewalEmailLanguage = RENEWAL_FAILED_COPY[input.language] ? input.language : 'en'
  const c = RENEWAL_FAILED_COPY[language]
  const plan = renewalPlanLabel(input.tier)
  const reminder = input.stage === 'reminder'
  const what = reminder ? c.reminderWhat(plan) : c.what(plan)
  const reason = input.reasonCategory === undefined ? null : c.reason(input.reasonCategory)
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
  return { language, subject: reminder ? c.reminderSubject : c.subject, text, html }
}
