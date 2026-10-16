// KINEO-PACOTE-3-FILMES-1610 — "3 filmes feitos por nós" por US$ 19, pagamento único (fundador 16/10: "pode rodar todas").
//
// O QUE É. Quem tem conta e NÃO assina compra, escreve o tema (língua das 16 + estilo opcional) e a equipe Kineo faz e
// entrega 3 filmes curtos (~35 s) na Library da pessoa em até 48 h. Nada renova, nada vira assinatura, nenhum crédito é
// concedido: o produto é trabalho de gente, como o Kineo Empresas (Express/Pro).
//
// POR QUE UM NOME PRÓPRIO E NÃO `dfy_order_paid`. Esse evento já é do Kineo Empresas (webhook → /admin/ads, MRR,
// funil); gravar o pacote com o mesmo nome punha pedido de US$ 19 na fila de anúncio de empresa com degrau "null" e
// prazo calculado errado. O pacote usa a família `dfy_films3_*` e a tabela `done_for_you_orders`.
//
// MÓDULO PURO: sem import de servidor, sem React, sem Supabase. A página, a rota do pedido, o checkout, o webhook e o
// /admin leem os números e as regras DAQUI — o preço existe em um lugar só.
import { INTERFACE_LANGUAGE_OPTIONS } from './ui/interfaceLanguage'
import { MONTHLY_REFUND_DAYS } from './checkoutPricing'

/** metadata.pack da sessão da Stripe — é por ele (e só por ele) que o webhook reconhece o pacote. */
export const DFY_FILMS3_PACK_ID = 'dfy_films3' as const
/** Versão do contrato (página + checkout + webhook). Muda junto com qualquer promessa da página. */
export const DFY_FILMS3_VERSION = 'dfy_films3_v1_2026-10-16' as const

/** O preço — FONTE ÚNICA (centavos de dólar). Brasil paga em reais pela fórmula da casa (lib/settlementCurrency). */
export const DFY_FILMS3_PRICE_USD_MINOR = 1900
export const DFY_FILMS3_FILMS = 3
/** Duração-alvo de cada filme (norte, não camisa de força: passar é bom, ficar abaixo é defeito). */
export const DFY_FILMS3_FILM_SECONDS = 35
/** Prazo de entrega prometido. A página e os e-mails leem daqui; nada promete menos que isto. */
export const DFY_FILMS3_DELIVERY_HOURS = 48

export function dfyFilms3PriceLabel(): string {
  const usd = DFY_FILMS3_PRICE_USD_MINOR / 100
  return `US$${Number.isInteger(usd) ? usd : usd.toFixed(2)}`
}

// A garantia. MONEY_BACK_GUARANTEE (lib/checkoutPricing.ts) fala de "first monthly payment" e "annual plans": os
// Termos §4 cobrem só assinatura, e a frase lida numa página de pagamento único prometeria algo que ela não diz. O
// pacote usa o MESMO prazo (MONTHLY_REFUND_DAYS), contado do pagamento — sem número redigitado.
export const DFY_FILMS3_GUARANTEE = `Full refund if you email us within ${MONTHLY_REFUND_DAYS} days of your payment.`

// ─── o formulário ────────────────────────────────────────────────────────────────────────────────────────────────
export const DFY_FILMS3_TOPIC_MIN = 8
export const DFY_FILMS3_TOPIC_MAX = 1000
export const DFY_FILMS3_STYLE_MAX = 200
/** As 16 línguas — as mesmas da interface e do narrador (lib/ui/interfaceLanguage.ts). */
export const DFY_FILMS3_LANGUAGES: ReadonlyArray<{ code: string; native: string }> = INTERFACE_LANGUAGE_OPTIONS.map((o) => ({ code: o.code, native: o.native }))
const LANGUAGE_CODES = new Set(DFY_FILMS3_LANGUAGES.map((l) => l.code))

export interface DfyFilms3Brief {
  topic: string
  language: string
  style: string | null
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').trim() : ''
}

/** Valida o briefing do formulário. Devolve o briefing limpo ou a frase de erro que a tela mostra. */
export function parseDfyFilms3Brief(input: { topic?: unknown; language?: unknown; style?: unknown }): { ok: true; brief: DfyFilms3Brief } | { ok: false; error: string } {
  const topic = clean(input.topic)
  const language = clean(input.language).toLowerCase()
  const style = clean(input.style)
  if (topic.length < DFY_FILMS3_TOPIC_MIN) return { ok: false, error: 'Tell us the topic in a few words.' }
  if (topic.length > DFY_FILMS3_TOPIC_MAX) return { ok: false, error: `Keep the topic under ${DFY_FILMS3_TOPIC_MAX} characters.` }
  if (!LANGUAGE_CODES.has(language)) return { ok: false, error: 'Pick the language of the narration.' }
  if (style.length > DFY_FILMS3_STYLE_MAX) return { ok: false, error: `Keep the style under ${DFY_FILMS3_STYLE_MAX} characters.` }
  return { ok: true, brief: { topic, language, style: style || null } }
}

export function dfyFilms3LanguageName(code: string | null | undefined): string {
  return DFY_FILMS3_LANGUAGES.find((l) => l.code === code)?.native ?? (code || '?')
}

// ─── quem compra ─────────────────────────────────────────────────────────────────────────────────────────────────
// O pacote é para quem tem conta e NÃO assina. Assinante já faz esses filmes com os créditos do plano: vender o pacote
// a ele seria cobrar duas vezes pela mesma coisa.
export const DFY_FILMS3_SUBSCRIPTION_PLANS: ReadonlySet<string> = new Set(['starter', 'basic', 'pro', 'business', 'autopilot', 'autopilot_lite'])
export function dfyFilms3Eligible(profile: { plan?: unknown } | null | undefined): boolean {
  const plan = typeof profile?.plan === 'string' ? profile.plan : 'free'
  return !DFY_FILMS3_SUBSCRIPTION_PLANS.has(plan)
}

// ─── o pedido ────────────────────────────────────────────────────────────────────────────────────────────────────
export type DfyFilms3Status = 'pending_payment' | 'paid' | 'in_production' | 'delivered'
export const DFY_FILMS3_STATUS_LABEL: Record<DfyFilms3Status, string> = {
  pending_payment: 'aguardando pagamento',
  paid: 'pago',
  in_production: 'em produção',
  delivered: 'entregue',
}
/** Transições que o /admin aceita: pago → em produção → entregue (pago → entregue direto também vale). */
export function dfyFilms3NextStatusAllowed(from: string, to: string): boolean {
  if (to === 'in_production') return from === 'paid'
  if (to === 'delivered') return from === 'paid' || from === 'in_production'
  return false
}

export const DFY_FILMS3_EVENTS = {
  briefSaved: 'dfy_films3_brief_saved',
  orderPaid: 'dfy_films3_order_paid',
  statusChanged: 'dfy_films3_status_changed',
  delivered: 'dfy_films3_delivered',
} as const

/** Sessão da Stripe do pacote: reconhecida SÓ pela metadata.pack exata — nunca por valor (1900 é também o bulk10). */
export function isDfyFilms3Session(session: { mode?: string | null; metadata?: Record<string, string> | null }): boolean {
  return session.mode === 'payment' && (session.metadata?.pack ?? '').trim() === DFY_FILMS3_PACK_ID
}

/** Cópia de segurança do briefing na metadata da Stripe (teto de 500 caracteres por valor). */
export function briefMetadata(brief: DfyFilms3Brief): Record<string, string> {
  return {
    dfy_topic: brief.topic.slice(0, 480),
    dfy_language: brief.language,
    ...(brief.style ? { dfy_style: brief.style.slice(0, DFY_FILMS3_STYLE_MAX) } : {}),
  }
}

export function shortTopic(topic: string, max = 60): string {
  const t = topic.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

// ─── os e-mails ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Assunto do aviso ao fundador (pedido pago). */
export function founderOrderSubject(topic: string): string {
  return `Pedido novo de 3 filmes — ${shortTopic(topic)}`
}

// O e-mail de entrega NÃO tem link nenhum (fundador: "o caminho em palavras"): link em e-mail transacional vira
// clique de rastreio, cai em filtro de spam e ensina o cliente a clicar em link de e-mail. O caminho vai escrito.
export function deliveryEmail(topic: string): { subject: string; text: string; html: string } {
  const subject = `Your ${DFY_FILMS3_FILMS} films are in your Library`
  const t = shortTopic(topic, 80)
  const lines = [
    'Hi,',
    '',
    `Your ${DFY_FILMS3_FILMS} films about "${t}" are ready. They are already in your Kineo account.`,
    '',
    'To watch and download them: open Kineo, sign in with this email, open Library in the menu, and pick the Videos tab.',
    '',
    'If anything is off, just reply to this email and tell us what to change.',
    '',
    'Thank you,',
    'Joseph and the Kineo team',
  ]
  const text = lines.join('\n')
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">${lines
    .filter((l) => l !== '')
    .map((l) => `<p style="margin:0 0 14px;">${esc(l)}</p>`)
    .join('')}</div>`
  return { subject, text, html }
}

// ─── as portas de entrada ────────────────────────────────────────────────────────────────────────────────────────
export const DFY_FILMS3_PATH = '/done-for-you'
/** A frase do link discreto (preços, modal de pagamento, e-mail de checkout expirado). */
export function dfyFilms3EntryCopy(): string {
  return `Prefer we make it for you? ${DFY_FILMS3_FILMS} films for ${dfyFilms3PriceLabel()}`
}
export function dfyFilms3EntryHref(source: 'pricing' | 'upgrade_modal' | 'checkout_recovery_email'): string {
  return `${DFY_FILMS3_PATH}?from=${source}`
}
