// KINEO-STUDIO-ADS-2026-09-25 — contrato do pedido do Studio Ads: o que o navegador pode mandar e o que o servidor grava.
// Módulo PURO (sem import de servidor): a rota /api/ads/orders valida TUDO aqui antes de tocar o banco, e o guardião
// scripts/test-ads-servidor-2026-09-25.mjs executa estas funções com entradas reais e maliciosas.
//
// Regras que este módulo carrega (plano docs/STUDIO-ADS-DIA-1-2026-09-25.md):
//   · estado do fluxo vive no servidor (ads_orders), nunca no navegador;
//   · mídia entra por ID de user_footage e só da pasta da própria conta (user-footage/<uid>/…) — o mesmo prefixo que
//     a rota do Kineo 1 aceita; nunca URL de terceiro;
//   · modelo só dos 8 do dia 1 (lib/ads/models.ts) e a duração vem do modelo, não do navegador;
//   · consentimento é um carimbo de hora, não um booleano solto.
import type { AdsBrief, AdsMediaItem, AdsOrderStatus } from './types'
import { adsModelById } from './models'

export const ADS_ORDER_MAX_DRAFTS_PER_USER = 20
export const ADS_MEDIA_MAX_ITEMS = 13 // logo + até 10 fotos + até 3 vídeos, com folga de 0 — o passo 2 da tela bloqueia antes
export const ADS_BRIEF_LIMITS = { business: 200, offer: 300, contact: 200, audience: 200, extraKeys: 10, extraValue: 300 } as const
const CTAS: readonly AdsBrief['cta'][] = ['call', 'whatsapp', 'visit', 'buy', 'book', 'signup']
const TONES: readonly AdsBrief['tone'][] = ['warm', 'direct', 'premium']
const EDITABLE: readonly AdsOrderStatus[] = ['draft']

type Ok<T> = { ok: true; value: T }
type Err = { ok: false; error: string }
const ok = <T,>(value: T): Ok<T> => ({ ok: true, value })
const err = (error: string): Err => ({ ok: false, error })

function str(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.replace(/\s+/g, ' ').trim()
  if (v.length > max) return null
  return v
}

/** Brief de 6 campos (+ extras do modelo). Obrigatórios: business e contact. */
export function sanitizeBrief(raw: unknown): Ok<AdsBrief> | Err {
  if (!raw || typeof raw !== 'object') return err('brief_missing')
  const b = raw as Record<string, unknown>
  const business = str(b.business, ADS_BRIEF_LIMITS.business)
  if (!business) return err('business_required')
  const contact = str(b.contact, ADS_BRIEF_LIMITS.contact)
  if (!contact) return err('contact_required')
  const offer = str(b.offer ?? '', ADS_BRIEF_LIMITS.offer)
  if (offer === null) return err('offer_too_long')
  const audience = str(b.audience ?? '', ADS_BRIEF_LIMITS.audience)
  if (audience === null) return err('audience_too_long')
  const cta = CTAS.includes(b.cta as AdsBrief['cta']) ? (b.cta as AdsBrief['cta']) : null
  if (!cta) return err('cta_invalid')
  const tone = TONES.includes(b.tone as AdsBrief['tone']) ? (b.tone as AdsBrief['tone']) : 'warm'
  const language = typeof b.language === 'string' && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(b.language) ? b.language : 'en'
  const extra: Record<string, string> = {}
  if (b.extra && typeof b.extra === 'object') {
    const entries = Object.entries(b.extra as Record<string, unknown>)
    if (entries.length > ADS_BRIEF_LIMITS.extraKeys) return err('extra_too_many')
    for (const [k, v] of entries) {
      if (!/^[a-z_]{1,40}$/.test(k)) return err('extra_key_invalid')
      const sv = str(v, ADS_BRIEF_LIMITS.extraValue)
      if (sv === null) return err('extra_value_invalid')
      extra[k] = sv
    }
  }
  return ok({ business, offer, cta, contact, language, tone, audience, extra })
}

/** Mídia: só itens da pasta da própria conta no bucket público user-footage. `publicPrefix` = FOOTAGE_PUBLIC_PREFIX(). */
export function sanitizeMedia(raw: unknown, userId: string, publicPrefix: string): Ok<AdsMediaItem[]> | Err {
  if (!Array.isArray(raw)) return err('media_not_list')
  if (raw.length > ADS_MEDIA_MAX_ITEMS) return err('media_too_many')
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return err('user_invalid')
  const own = `${publicPrefix.replace(/\/+$/, '')}/${userId}/`
  const out: AdsMediaItem[] = []
  let logos = 0
  for (const item of raw) {
    if (!item || typeof item !== 'object') return err('media_item_invalid')
    const m = item as Record<string, unknown>
    const url = typeof m.url === 'string' ? m.url.trim() : ''
    // KINEO-STUDIO-ADS-REVISAO-2026-09-24 — "%2e%2e" passava no startsWith e o navegador/servidor normaliza para "..":
    // recusa qualquer ponto/barra codificado ou barra invertida, e confere o caminho JÁ normalizado pelo parser de URL.
    if (!url.startsWith(own) || url.includes('..') || /%2e|%2f|%5c|\\/i.test(url)) return err('media_not_owned')
    let normalized = ''
    try { const u = new URL(url); normalized = u.origin + u.pathname } catch { return err('media_not_owned') }
    if (!normalized.startsWith(own)) return err('media_not_owned')
    const footageId = typeof m.footageId === 'string' && /^[0-9a-f-]{36}$/i.test(m.footageId) ? m.footageId : null
    if (!footageId) return err('media_id_invalid')
    const kind = m.kind === 'video' ? 'video' : m.kind === 'image' ? 'image' : null
    if (!kind) return err('media_kind_invalid')
    const isLogo = m.isLogo === true
    if (isLogo) {
      logos++
      if (kind !== 'image') return err('logo_must_be_image')
    }
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
    out.push({ footageId, url, kind, isLogo, bytes: num(m.bytes) ?? 0, width: num(m.width), height: num(m.height), seconds: num(m.seconds) })
  }
  if (logos > 1) return err('logo_only_one')
  return ok(out)
}

export interface AdsOrderPatch {
  brief?: AdsBrief
  media?: AdsMediaItem[]
  template?: string
  seconds?: 35 | 60
  script?: string
  script_angle?: string
  voice?: string
  /** ISO da concessão; null = mídia mudou sem novo consentimento (o anterior não vale para a mídia nova). */
  consent_at?: string | null
}

/** PATCH do pedido: só campos conhecidos, cada um validado; a duração sai do modelo escolhido. */
export function sanitizeOrderPatch(raw: unknown, userId: string, publicPrefix: string, now: Date = new Date()): Ok<AdsOrderPatch> | Err {
  if (!raw || typeof raw !== 'object') return err('patch_missing')
  const p = raw as Record<string, unknown>
  const out: AdsOrderPatch = {}
  if ('brief' in p) {
    const r = sanitizeBrief(p.brief)
    if (!r.ok) return r
    out.brief = r.value
  }
  if ('media' in p) {
    const r = sanitizeMedia(p.media, userId, publicPrefix)
    if (!r.ok) return r
    out.media = r.value
  }
  if ('template' in p) {
    const model = adsModelById(typeof p.template === 'string' ? p.template : null)
    if (!model) return err('template_invalid')
    out.template = model.id
    out.seconds = model.seconds
  }
  if ('script' in p) {
    const s = typeof p.script === 'string' ? p.script.trim() : ''
    if (!s || s.length > 5000) return err('script_invalid')
    out.script = s
  }
  if ('script_angle' in p) {
    const a = str(p.script_angle, 40)
    if (!a) return err('angle_invalid')
    out.script_angle = a
  }
  if ('voice' in p) {
    const v = typeof p.voice === 'string' && /^[A-Za-z0-9_\-]{1,60}$/.test(p.voice) ? p.voice : null
    if (!v) return err('voice_invalid')
    out.voice = v
  }
  if ('consent' in p) {
    if (p.consent !== true) return err('consent_must_be_true')
    out.consent_at = now.toISOString()
  } else if (out.media) {
    // KINEO-STUDIO-ADS-REVISAO-2026-09-24 — o consentimento atesta AQUELA mídia; trocou a mídia, pede de novo.
    out.consent_at = null
  }
  if (Object.keys(out).length === 0) return err('patch_empty')
  return ok(out)
}

export function orderIsEditable(status: string | null | undefined): boolean {
  return EDITABLE.includes(status as AdsOrderStatus)
}
