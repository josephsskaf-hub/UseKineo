// ═══ KINEO-ANUAL-2o-MES-2026-10-08 — o e-mail do 2º mês: "troque para o anual e economize 30%" ══════════════════════
//
// PURO (só imports relativos de módulos puros; sem rede, sem banco). O cron app/api/cron/send-month2-annual-offer faz o
// I/O e pergunta aqui O QUE manda. A régua é a da casa:
//   · remetente = o mesmo do aviso de cobrança e da carta de renovação recusada (joseph@ é a caixa real; a resposta
//     da pessoa cai lá);
//   · língua pelo país (last_country, senão signup_country) — a mesma função do aviso de cobrança: pt, es ou en;
//   · valores POR PESSOA, lidos da assinatura dela em dólar (a oferta só vale em USD): nada de preço digitado nem de
//     moeda que a pessoa não paga ("preço literal em e-mail mente");
//   · o botão leva ao login com destino /account?tab=billing&offer=annual (logada, o login devolve na hora para lá; o
//     cartão abre a prévia sozinho) — nenhum valor é cobrado sem o "Confirm" da pessoa;
//   · é oferta, não aviso de cobrança: o rodapé de descadastro e o opt-out valem (o cron os aplica).
import { MONTH2_ANNUAL_EMAIL_CAMPAIGN, MONTH2_ANNUAL_PERCENT_OFF, month2Money } from './month2AnnualOffer'
import {
  RENEWAL_FAILED_EMAIL_FROM,
  RENEWAL_FAILED_EMAIL_REPLY_TO,
  renewalEmailLanguage,
  renewalPlanLabel,
  type RenewalEmailLanguage,
} from './renewalFailedEmail'

/** O mesmo remetente aprovado pelo fundador para as cartas de assinante (18/09) e o aviso de cobrança (06/10). */
export const MONTH2_EMAIL_FROM = RENEWAL_FAILED_EMAIL_FROM
export const MONTH2_EMAIL_REPLY_TO = RENEWAL_FAILED_EMAIL_REPLY_TO
/** `email_send_log.kind` (lib/email/quota.ts). Prioridade 'revenue': nunca cede a vaga do dia. */
export const MONTH2_EMAIL_KIND = 'month2_annual_offer'
export const MONTH2_EMAIL_SITE = 'https://www.usekineo.com'
/** Quem entrou no 2º mês: a 1ª renovação paga caiu nos últimos N dias. Depois disso, a oferta segue só na tela. */
export const MONTH2_EMAIL_WINDOW_DAYS = 7
/** Teto por corrida (o cron é diário e a coorte é pequena; um dia de atraso vale menos que um laço). */
export const MONTH2_EMAIL_MAX_BATCH = 30
/** Teto do POST no Resend. */
export const MONTH2_EMAIL_TIMEOUT_MS = 8000

export function month2EmailLanguage(country: string | null | undefined): RenewalEmailLanguage {
  return renewalEmailLanguage(country)
}

/** O botão: login com destino na conta (aba de cobrança, oferta aberta). Logada, o login devolve direto para lá. */
export function month2EmailLink(): string {
  const target = `/account?tab=billing&offer=annual&utm_source=lifecycle&utm_medium=email&utm_campaign=${MONTH2_ANNUAL_EMAIL_CAMPAIGN}`
  return `${MONTH2_EMAIL_SITE}/login?redirect=${encodeURIComponent(target)}`
}

export interface Month2EmailFacts {
  language: RenewalEmailLanguage
  tier: string | null
  monthlyMinor: number
  annualMinor: number
  creditsPerMonth: number
  refundDays: number
}

interface Month2EmailCopy {
  subject: (percent: number) => string
  greeting: string
  thanks: (plan: string | null) => string
  offer: (annual: string, monthly: string, percent: number) => string
  same: (credits: number, days: number) => string
  button: string
  how: string
  signoff: string
  why: string
}

export const MONTH2_EMAIL_COPY: Record<RenewalEmailLanguage, Month2EmailCopy> = {
  en: {
    subject: (percent) => `Switch to annual and save ${percent}% on Kineo`,
    greeting: 'Hi — Joseph here, founder of Kineo.',
    thanks: (plan) => `You just started your second month${plan ? ` on the ${plan} plan` : ''}. Thank you for staying.`,
    offer: (annual, monthly, percent) => `If Kineo is part of your routine, the annual plan saves you ${percent}%: ${annual}/year instead of ${monthly} × 12.`,
    same: (credits, days) => `Same plan, same ${credits} credits every month. The unused days of this month are credited on the switch, and you get a full refund within ${days} days if you change your mind.`,
    button: 'See my annual price',
    how: 'You will see the exact amount before confirming, and nothing is charged until you confirm. Questions? Just reply to this email.',
    signoff: '— Joseph, founder',
    why: "You're getting this because you have a monthly Kineo subscription.",
  },
  pt: {
    subject: (percent) => `Mude para o anual e economize ${percent}% na Kineo`,
    greeting: 'Oi — aqui é o Joseph, fundador da Kineo.',
    thanks: (plan) => `Você acabou de entrar no seu segundo mês${plan ? ` no plano ${plan}` : ''}. Obrigado por continuar com a gente.`,
    offer: (annual, monthly, percent) => `Se a Kineo já faz parte da sua rotina, o plano anual economiza ${percent}%: ${annual}/ano em vez de ${monthly} × 12.`,
    same: (credits, days) => `Mesmo plano, os mesmos ${credits} créditos todo mês. Os dias não usados deste mês viram crédito na troca, e você tem reembolso integral em até ${days} dias se mudar de ideia.`,
    button: 'Ver meu preço anual',
    how: 'Você vê o valor exato antes de confirmar, e nada é cobrado sem a sua confirmação. Dúvidas? É só responder este e-mail.',
    signoff: '— Joseph, fundador',
    why: 'Você recebeu este e-mail porque tem uma assinatura mensal da Kineo.',
  },
  es: {
    subject: (percent) => `Cámbiate al anual y ahorra un ${percent}% en Kineo`,
    greeting: 'Hola — soy Joseph, fundador de Kineo.',
    thanks: (plan) => `Acabas de empezar tu segundo mes${plan ? ` en el plan ${plan}` : ''}. Gracias por quedarte.`,
    offer: (annual, monthly, percent) => `Si Kineo ya es parte de tu rutina, el plan anual te ahorra un ${percent}%: ${annual}/año en lugar de ${monthly} × 12.`,
    same: (credits, days) => `Mismo plan, los mismos ${credits} créditos cada mes. Los días no usados de este mes se acreditan al cambiar, y tienes reembolso completo dentro de ${days} días si cambias de opinión.`,
    button: 'Ver mi precio anual',
    how: 'Verás el monto exacto antes de confirmar, y no se cobra nada sin tu confirmación. ¿Dudas? Solo responde a este correo.',
    signoff: '— Joseph, fundador',
    why: 'Recibes este correo porque tienes una suscripción mensual de Kineo.',
  },
}

export interface Month2EmailMessage {
  language: RenewalEmailLanguage
  subject: string
  text: string
  html: string
  link: string
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Texto e HTML do e-mail (sem o rodapé de descadastro, que o cron acrescenta com o id da pessoa). */
export function month2EmailMessage(input: Month2EmailFacts): Month2EmailMessage {
  const language: RenewalEmailLanguage = MONTH2_EMAIL_COPY[input.language] ? input.language : 'en'
  const c = MONTH2_EMAIL_COPY[language]
  const percent = MONTH2_ANNUAL_PERCENT_OFF
  const plan = renewalPlanLabel(input.tier)
  const annual = month2Money(input.annualMinor)
  const monthly = month2Money(input.monthlyMinor)
  const thanks = c.thanks(plan)
  const offer = c.offer(annual, monthly, percent)
  const same = c.same(input.creditsPerMonth, input.refundDays)
  const link = month2EmailLink()
  const text = [c.greeting, '', thanks, '', offer, '', same, '', `${c.button}: ${link}`, '', c.how, '', c.signoff, '', '—', c.why, 'Kineo · usekineo.com'].join('\n')
  const html = `<div lang="${language}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>${escapeHtml(c.greeting)}</p>
<p>${escapeHtml(thanks)}</p>
<p><strong>${escapeHtml(offer)}</strong></p>
<p>${escapeHtml(same)}</p>
<p style="margin:18px 0"><a href="${escapeHtml(link)}" style="background:#2997ff;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">${escapeHtml(c.button)} &rarr;</a></p>
<p style="color:#555555;font-size:13px">${escapeHtml(c.how)}</p>
<p>${escapeHtml(c.signoff)}</p>
<p style="margin-top:28px;color:#94a3b8;font-size:12px">${escapeHtml(c.why)}<br>Kineo &middot; usekineo.com</p>
</div>`
  return { language, subject: c.subject(percent), text, html, link }
}
