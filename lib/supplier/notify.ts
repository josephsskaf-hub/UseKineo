// KINEO-SUPPLIER-ALARM-2026-08-11 — como o alerta CHEGA.
//
// A exigência: chegar no fundador em minutos e NÃO depender de um único canal
// que pode estar quebrado junto com o resto.
//
// O QUE EXISTE HOJE, avaliado honestamente antes de escrever qualquer linha:
//
//   · Resend (e-mail) — é o único transporte já instalado, com domínio
//     verificado e usado por 12 rotas. É o caminho mais confiável DISPONÍVEL, e
//     por isso é o mínimo obrigatório aqui.
//     ⚠️ Limite real do plano: 100 e-mails/dia e 2 req/s. Num pico, os crons de
//     lifecycle consomem essa cota (docs/CAPACIDADE-TAAFT-2026-08-08.md §5.1) e
//     o alarme pode levar 429 — que é exatamente a hora em que ele mais importa.
//   · SMS / push / PagerDuty — NÃO existem no projeto e adicionar um provedor
//     novo é conta nova, chave nova e cartão novo. Não é honesto prometer isso
//     num commit; o que dá para entregar hoje é um segundo canal que o fundador
//     liga em 2 minutos SEM deploy.
//
// A SEGUNDA VIA: `KINEO_ALERT_WEBHOOK_URL`. Um POST JSON simples que serve
// Slack, Discord, Telegram (via bot), ntfy.sh ou qualquer coisa que aceite
// webhook — inclusive um que vira notificação de celular. Nada de credencial
// nova no repositório (o repo é PÚBLICO): a URL inteira é uma env na Vercel.
// Se não estiver configurada, o alarme continua funcionando por e-mail e diz
// no log que está com um canal só.
//
// ⚠️ ESTE MÓDULO NUNCA LANÇA. Ele é chamado no meio de um incidente; uma falha
// de notificação não pode virar um 500 no cron que estava tentando avisar.

// Mesmo destinatário de lib/falAlert.ts, lib/openaiAlert.ts e
// lib/creatomateQuota.ts — mas sobrescrevível por env, para que trocar o
// endereço de plantão seja uma edição na Vercel e não um deploy. Durante o
// apagão de 09/08 havia 12 commits presos sem push: a via "editar código"
// estava comprovadamente indisponível, a via "mudar env" não estava.
const FOUNDER_EMAIL = (process.env.KINEO_ALERT_EMAIL ?? '').trim() || 'josephsskaf@gmail.com'
// Cada canal tem teto próprio. O cron tem orçamento de lambda e um Resend lento
// não pode consumir o tempo do webhook (nem vice-versa).
const CHANNEL_TIMEOUT_MS = 8000

export type ChannelResult = 'sent' | 'failed' | 'skipped'

export interface NotifyResult {
  email: ChannelResult
  webhook: ChannelResult
  /** true = pelo menos um canal confirmou a entrega. */
  delivered: boolean
}

function founderRecipients(): string[] {
  // Env opcional para o fundador acrescentar um endereço secundário (um que não
  // dependa do mesmo provedor de caixa postal). Vazio = só o principal.
  const extra = (process.env.KINEO_ALERT_EXTRA_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.includes('@'))
  return Array.from(new Set([FOUNDER_EMAIL, ...extra]))
}

async function sendEmail(subject: string, text: string): Promise<ChannelResult> {
  const key = process.env.RESEND_API_KEY
  if (!key || key === 'your_resend_api_key_here') {
    console.error('[supplier-alert] RESEND_API_KEY ausente — e-mail de alarme NÃO enviado')
    return 'skipped'
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(CHANNEL_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>',
        to: founderRecipients(),
        subject,
        text,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[supplier-alert] Resend recusou (${res.status}): ${body.slice(0, 200)}`)
      return 'failed'
    }
    return 'sent'
  } catch (e) {
    console.error('[supplier-alert] envio de e-mail falhou:', e instanceof Error ? e.message : String(e))
    return 'failed'
  }
}

async function sendWebhook(subject: string, text: string): Promise<ChannelResult> {
  const url = (process.env.KINEO_ALERT_WEBHOOK_URL ?? '').trim()
  if (!url) return 'skipped'
  if (!/^https:\/\//i.test(url)) {
    console.error('[supplier-alert] KINEO_ALERT_WEBHOOK_URL não é https — ignorada')
    return 'skipped'
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(CHANNEL_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
      // Um corpo que serve aos três formatos mais comuns de uma vez: Slack e
      // Discord leem `text`/`content`, ntfy lê `message`/`title`. Um payload,
      // nenhum acoplamento a fornecedor de chat.
      body: JSON.stringify({ title: subject, text: `${subject}\n\n${text}`, content: `${subject}\n\n${text}`, message: text }),
    })
    if (!res.ok) {
      console.error(`[supplier-alert] webhook recusou (${res.status})`)
      return 'failed'
    }
    return 'sent'
  } catch (e) {
    console.error('[supplier-alert] webhook falhou:', e instanceof Error ? e.message : String(e))
    return 'failed'
  }
}

/**
 * Dispara o alerta em TODOS os canais configurados, em paralelo.
 *
 * Paralelo de propósito: em série, um Resend travado até o timeout atrasaria o
 * webhook em 8s — e o webhook é justamente o canal que existe para o caso do
 * e-mail estar indisponível.
 */
export async function notifyFounder(subject: string, text: string): Promise<NotifyResult> {
  const [email, webhook] = await Promise.all([sendEmail(subject, text), sendWebhook(subject, text)])
  const delivered = email === 'sent' || webhook === 'sent'
  if (!delivered) {
    // Último recurso legível: o log de runtime da Vercel. Não substitui um
    // canal, mas garante que o incidente deixe rastro escrito em algum lugar.
    console.error(`[supplier-alert] 🔴 NENHUM CANAL ENTREGOU O ALERTA — ${subject} :: ${text.slice(0, 500)}`)
  } else if (webhook === 'skipped') {
    console.warn(
      '[supplier-alert] rodando com UM canal só (e-mail). Configure KINEO_ALERT_WEBHOOK_URL ' +
        'na Vercel para ter uma segunda via independente do Resend.',
    )
  }
  return { email, webhook, delivered }
}
