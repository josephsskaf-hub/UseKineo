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
}): RenewalFailedEmailMessage {
  const language: RenewalEmailLanguage = RENEWAL_FAILED_COPY[input.language] ? input.language : 'en'
  const c = RENEWAL_FAILED_COPY[language]
  const what = c.what(renewalPlanLabel(input.tier))
  const url = RENEWAL_FAILED_UPDATE_CARD_URL
  const text = [
    c.greeting,
    '',
    what,
    '',
    c.safe,
    url,
    '',
    c.how,
    '',
    c.signoff,
    '',
    '—',
    c.why,
    'Kineo · usekineo.com',
  ].join('\n')
  const html = `<div lang="${language}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>${escapeHtml(c.greeting)}</p>
<p>${escapeHtml(what)}</p>
<p>${escapeHtml(c.safe)}</p>
<p style="margin:18px 0"><a href="${escapeHtml(url)}" style="background:#2997ff;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">${escapeHtml(c.button)}</a></p>
<p style="color:#555555;font-size:13px">${escapeHtml(c.how)}</p>
<p>${escapeHtml(c.signoff)}</p>
<p style="margin-top:28px;color:#94a3b8;font-size:12px">${escapeHtml(c.why)}<br>Kineo &middot; usekineo.com</p>
</div>`
  return { language, subject: c.subject, text, html }
}
