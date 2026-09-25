// KINEO-FLUXO-NOVO-2026-09-25 — o contrato do briefing de quem comprou Express/Pro (Kineo Empresas).
//
// POR QUÊ. Até 25/09, depois de pagar o Payment Link a pessoa via só a página de confirmação da Stripe
// pedindo "responda o recibo por e-mail ou suba em Kineo Studio → My footage" — e o My footage devolve
// 402 para conta grátis (o ramo Empresas não concede has_paid de propósito). O pedido pago chegava ao
// fundador com 3 campos de texto e nada mais. Agora o comprador cai numa página curta
// (/business-video-ads/brief?session_id=…) que completa o briefing; esta é a regra dele.
//
// O QUE ESTE MÓDULO É: puro (sem servidor, sem React, sem Supabase). Ele (a) diz quais campos existem e
// o tamanho máximo de cada um, (b) limpa o que o navegador mandou, (c) preenche o formulário a partir
// dos 3 campos do Payment Link e (d) dá o id determinístico do evento, para que reenviar SOBRESCREVA.
// Quem autoriza é a rota (app/api/dfy/brief/route.ts), sempre pela Stripe, nunca pelo banco.
//
// ARQUIVOS NA v1: só links (Drive, Dropbox, site) + "responda o recibo com os arquivos". Upload fica
// para a próxima peça (bucket privado + moderação); prometer o My footage seria prometer um 402.
import { createHash } from 'node:crypto'

export const DFY_BRIEF_VERSION = 'dfy_brief_v1' as const
export const DFY_BRIEF_EVENT = 'dfy_brief_submitted' as const
export const DFY_BRIEF_PATH = '/business-video-ads/brief' as const
/** Quantas vezes a mesma sessão pode regravar o briefing (a sessão paga é o único "login" desta página). */
export const DFY_BRIEF_MAX_EDITS = 20
export const DFY_BRIEF_MAX_LINKS = 8

export type DfyBriefField = 'business' | 'goal' | 'audience' | 'language' | 'cta' | 'facts'
export interface DfyBrief {
  business: string
  goal: string
  audience: string
  language: string
  cta: string
  facts: string
  links: string[]
}

/** Teto de caracteres por campo. `required` = o formulário não envia sem ele. Nomes iguais aos da prévia do Codex (brief-express.html). */
export const DFY_BRIEF_FIELDS: readonly { key: DfyBriefField; label: string; hint: string; max: number; required: boolean; multiline: boolean }[] = [
  { key: 'business', label: 'Your business and what you sell', hint: 'Business name, what you sell, where you are.', max: 400, required: true, multiline: true },
  { key: 'goal', label: 'What the video should achieve', hint: 'The film you want and the one thing viewers should do or remember.', max: 800, required: true, multiline: true },
  { key: 'audience', label: 'Who it is for', hint: 'Who you want to reach.', max: 400, required: false, multiline: true },
  { key: 'language', label: 'Narration language', hint: 'For example: English, Portuguese (Brazil), Spanish.', max: 60, required: true, multiline: false },
  { key: 'cta', label: 'Call to action on the last frame', hint: 'Phone, WhatsApp, website or address exactly as it should appear.', max: 200, required: true, multiline: false },
  { key: 'facts', label: 'Approved facts', hint: 'Offer, prices, opening hours and claims we may mention. We do not invent facts.', max: 1500, required: false, multiline: true },
]

const LINK_MAX = 500

/** Link aceito: só http(s), sem espaço, até 500 caracteres. Qualquer outra coisa é descartada, nunca "consertada". */
export function isBriefLink(value: string): boolean {
  if (value.length > LINK_MAX || /\s/.test(value)) return false
  return /^https?:\/\/[^/\s]+\.[^\s]+$/i.test(value)
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  // Controle de caractere fora (menos quebra de linha/tab); o texto da pessoa fica como ela escreveu.
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
}

/** Limpa o corpo que o navegador mandou. Campo desconhecido some; campo longo é cortado no teto. */
export function sanitizeBrief(input: unknown): DfyBrief {
  const raw = (input && typeof input === 'object' && !Array.isArray(input) ? input : {}) as Record<string, unknown>
  const out = { links: [] as string[] } as DfyBrief
  for (const f of DFY_BRIEF_FIELDS) out[f.key] = cleanText(raw[f.key], f.max)
  const rawLinks = Array.isArray(raw.links)
    ? raw.links
    : typeof raw.links === 'string' ? raw.links.split(/[\s,]+/) : []
  const links: string[] = []
  for (const l of rawLinks) {
    const t = typeof l === 'string' ? l.trim() : ''
    // Dono de negócio cola sem o esquema ("drive.google.com/…", "www.padaria.com"): completa com https://.
    const v = t && !/^[a-z][a-z0-9+.-]*:/i.test(t) && /^[^\s/]+\.[^\s]+$/.test(t) ? `https://${t}` : t
    if (v && isBriefLink(v) && !links.includes(v)) links.push(v)
    if (links.length >= DFY_BRIEF_MAX_LINKS) break
  }
  out.links = links
  return out
}

/** Campos obrigatórios que faltam (vazio = pronto para gravar). */
export function missingBriefFields(brief: DfyBrief): DfyBriefField[] {
  return DFY_BRIEF_FIELDS.filter((f) => f.required && !brief[f.key]).map((f) => f.key)
}

export interface PaymentLinkField { key: string | null; label: string | null; value: string | null }

/** Mesmo mapeamento que o webhook grava em dfy_order_paid.metadata.custom_fields (text → dropdown → numeric). */
export function paymentLinkFields(customFields: unknown): PaymentLinkField[] {
  if (!Array.isArray(customFields)) return []
  return customFields.map((f) => {
    const o = (f ?? {}) as { key?: unknown; label?: { custom?: unknown } | null; text?: { value?: unknown } | null; dropdown?: { value?: unknown } | null; numeric?: { value?: unknown } | null }
    const value = o.text?.value ?? o.dropdown?.value ?? o.numeric?.value ?? null
    return {
      key: typeof o.key === 'string' ? o.key : null,
      label: typeof o.label?.custom === 'string' ? o.label.custom : null,
      value: typeof value === 'string' ? value : null,
    }
  })
}

/**
 * Preenche o formulário com os 3 campos obrigatórios do Payment Link (criados no painel da Stripe; a chave
 * é gerada pela Stripe a partir do rótulo, então a leitura é pelo rótulo E pela chave):
 *   1) "Business name + what you sell"            → business
 *   2) "Last-frame CTA: phone, WhatsApp, URL…"    → cta
 *   3) "Language + the film you want (1-2 lines)" → goal (texto inteiro) e language (1º trecho, se curto)
 * Nada é inventado: campo que não casa fica vazio para a pessoa escrever.
 */
export function prefillFromCustomFields(customFields: unknown): Partial<DfyBrief> {
  const out: Partial<DfyBrief> = {}
  for (const f of paymentLinkFields(customFields)) {
    const value = (f.value ?? '').trim()
    if (!value) continue
    const tag = `${f.key ?? ''} ${f.label ?? ''}`.toLowerCase()
    if (!out.business && /business|sell|company|empresa|neg[oó]cio/.test(tag)) {
      out.business = value.slice(0, 400)
    } else if (!out.cta && /cta|call to action|last-?frame|whatsapp|phone/.test(tag)) {
      out.cta = value.slice(0, 200)
    } else if (!out.goal && /language|idioma|film/.test(tag)) {
      out.goal = value.slice(0, 800)
      const first = value.split(/[;,.\n]|\s[-–—]\s/)[0].trim()
      if (first && first.length <= 40 && /^[\p{L} ()]+$/u.test(first)) out.language = first
    }
  }
  return out
}

/** Id determinístico do evento do briefing: a mesma sessão paga sempre cai na MESMA linha (reenvio sobrescreve). */
export function briefEventId(stripeSessionId: string): string {
  const hex = createHash('sha256').update(`${DFY_BRIEF_EVENT}:${stripeSessionId}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** "jo***@gmail.com": a página mostra de quem é o pedido sem expor o e-mail inteiro a quem tiver o link. */
export function maskEmail(email: string | null | undefined): string | null {
  const e = (email ?? '').trim()
  const at = e.indexOf('@')
  if (at < 1) return null
  const user = e.slice(0, at)
  return `${user.slice(0, Math.min(2, user.length))}***${e.slice(at)}`
}

/** URL absoluta do briefing para uma sessão (vai no alerta do fundador, que pode repassar ao cliente). */
export function dfyBriefUrl(origin: string, stripeSessionId: string): string {
  return `${origin.replace(/\/+$/, '')}${DFY_BRIEF_PATH}?session_id=${encodeURIComponent(stripeSessionId)}`
}
