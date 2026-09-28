// KINEO-ADS-V2-2026-09-28 — brief e texto do anúncio v2 (etapa 2, servidor): setor, nome, oferta, contato, idioma,
// narração de até 30 palavras (15 s) e 2-3 frases de tela, extraídos com gpt-4o-mini da frase (ou do link) do cliente.
//
// REUSO, NÃO CÓPIA:
//   · buildAutoBriefMessages/parseAutoBrief (lib/ads/autoBrief.ts): a extração do brief do modo "a IA faz" — o GPT só
//     EXTRAI; número que o texto não diz é apagado; contato só se estiver no texto.
//   · inventedNumbers/inventedClaims/contactOk (lib/ads/scriptPrompt.ts): os validadores anti-invenção do roteiro v1,
//     aplicados aqui à narração, a CADA frase de tela e a CADA prompt de movimento/cena (especificação, seção 5, passo 2).
// Recusa → 1 correção com o motivo (como /api/ads/script); falhou de novo = a rota devolve 502 com o porquê, nada cobrado.
import { openai } from '@/lib/openai'
import { buildAutoBriefMessages, parseAutoBrief } from '@/lib/ads/autoBrief'
import { contactOk, countWords, inventedClaims, inventedNumbers } from '@/lib/ads/scriptPrompt'
import type { AdsBrief } from '@/lib/ads/types'
import { ADS_V2_OVERLAY_MAX_CHARS, ADS_V2_SECTORS, isAdsV2Sector, type AdsV2Sector } from '@/lib/ads/v2ShotLists'

export const ADS_V2_BRIEF_MODEL = 'gpt-4o-mini'
/** Teto de planos (chamadas ao GPT) por pessoa em 24 h, contado pelo evento ads_v2_plan_served ANTES do modelo. */
export const ADS_V2_PLAN_DAILY_CAP = 20
const CALL_TIMEOUT_MS = 20_000

export interface AdsV2Copy {
  /** null = narração desligada pelo cliente. */
  narration: string | null
  /** 2 ou 3 frases de tela: marca (antes de 5 s), o que tem/oferta, onde/contato (opcional). */
  overlays: string[]
  sectorHint: AdsV2Sector | null
}

/** Nome da marca = a parte antes do travessão em "<nome> — <o que vende>" (formato do buildAutoBriefMessages). */
export function brandName(brief: Pick<AdsBrief, 'business'>): string {
  return (brief.business ?? '').split(/\s+[—–-]\s+/)[0].trim()
}

/** Cara de contato (link, domínio, @, telefone): se aparecer, tem de ser o contato do brief (contactOk). */
const CONTACTISH = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|app|co|br|jo|me|shop|store)\b|@[a-z0-9_.]{2,}|\d[\d\s().-]{6,}\d)/i
const DECOR = /[[\]{}#*_]|[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u

export function buildV2CopyMessages(brief: AdsBrief, languageName: string, opts: { maxWords: number; narration: boolean }): { system: string; user: string } {
  const brand = brandName(brief)
  const system = [
    'You write the on-screen phrases and the short voice-over of a vertical video ad for a small business. The video shows the business\'s own real photos in motion.',
    'Use ONLY the facts of the brief. Never invent a price, number, discount, deadline, rating, award, customer count, product, dish, service or place.',
    `Write everything in ${languageName}.`,
    opts.narration
      ? `narration: one to three short spoken sentences, ${Math.ceil(opts.maxWords * 0.5)} to ${opts.maxWords} words in total (count them). Warm and natural. Say the business name once. No phone number, link or address unless copied exactly from the brief.`
      : 'narration: return "" (the customer turned the voice-over off).',
    `overlays: 2 or 3 very short on-screen phrases, at most ${ADS_V2_OVERLAY_MAX_CHARS} characters each, no emojis, no hashtags, no quotes.`,
    brand ? `  1st = the business name exactly as "${brand}" (you may add 2-3 words of what it sells).` : '  1st = what the business sells, in 2-4 words.',
    '  2nd = the offer, or what makes it worth it, taken from the brief.',
    '  3rd (optional) = the contact copied exactly from the brief, or where to find it. Omit it if the brief has no contact.',
    `sector: one of ${ADS_V2_SECTORS.join(', ')}.`,
    'Answer with JSON only: {"narration":"","overlays":["",""],"sector":""}',
  ].join('\n')
  const user = [
    'Brief (the only facts you may use):',
    `- Business: ${brief.business}`,
    brief.offer ? `- Offer: ${brief.offer}` : '- Offer: (none — do not invent one)',
    brief.contact ? `- Contact: ${brief.contact}` : '- Contact: (none)',
    brief.audience ? `- Audience: ${brief.audience}` : '',
    ...Object.entries(brief.extra ?? {}).map(([k, v]) => `- ${k}: ${v}`),
  ].filter(Boolean).join('\n')
  return { system, user }
}

/** Anti-invenção sobre um texto qualquer do anúncio (número, fama/urgência, contato). Devolve os motivos. */
export function textIssues(text: string, brief: AdsBrief, label: string): string[] {
  const why: string[] = []
  const nums = inventedNumbers(text, brief)
  if (nums.length) why.push(`${label}: remove these numbers that are not in the brief: ${[...new Set(nums)].join(', ')}.`)
  const claims = inventedClaims(text, brief)
  if (claims.length) why.push(`${label}: remove these claims that the brief does not support: ${claims.join('; ')}.`)
  if (CONTACTISH.test(text) && !(brief.contact && contactOk(text, brief.contact))) {
    why.push(`${label}: a phone, link, @handle or address must be copied exactly from the brief${brief.contact ? ` (${brief.contact})` : ' — the brief has none, so remove it'}.`)
  }
  return why
}

/** Valida a resposta do modelo. Pura; nunca lança. */
export function checkV2Copy(raw: string, brief: AdsBrief, opts: { maxWords: number; narration: boolean }): { ok: true; copy: AdsV2Copy } | { ok: false; why: string[] } {
  let p: Record<string, unknown>
  try {
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object' || Array.isArray(j)) return { ok: false, why: ['Answer with valid JSON only.'] }
    p = j as Record<string, unknown>
  } catch {
    return { ok: false, why: ['Answer with valid JSON only.'] }
  }
  const why: string[] = []
  let narration: string | null = null
  if (opts.narration) {
    narration = typeof p.narration === 'string' ? p.narration.replace(/\s+/g, ' ').trim() : ''
    const words = countWords(narration)
    const min = Math.ceil(opts.maxWords * 0.5)
    if (words < min || words > opts.maxWords) why.push(`narration: write ${min} to ${opts.maxWords} words (you wrote ${words}).`)
    if (DECOR.test(narration)) why.push('narration: no brackets, markdown or emojis.')
    why.push(...textIssues(narration, brief, 'narration'))
  }
  const rawOverlays = Array.isArray(p.overlays) ? p.overlays : []
  const overlays = rawOverlays.map((o) => (typeof o === 'string' ? o.replace(/\s+/g, ' ').trim() : '')).filter(Boolean)
  if (overlays.length < 2 || overlays.length > 3) why.push('overlays: return 2 or 3 non-empty phrases.')
  overlays.forEach((o, i) => {
    if (o.length > ADS_V2_OVERLAY_MAX_CHARS) why.push(`overlays[${i}]: at most ${ADS_V2_OVERLAY_MAX_CHARS} characters (it has ${o.length}).`)
    if (DECOR.test(o) || /["“”]/.test(o)) why.push(`overlays[${i}]: no quotes, brackets, hashtags or emojis.`)
    why.push(...textIssues(o, brief, `overlays[${i}]`))
  })
  const brand = brandName(brief)
  if (brand && brand.length <= ADS_V2_OVERLAY_MAX_CHARS && overlays[0] && !overlays[0].toLowerCase().includes(brand.toLowerCase())) {
    why.push(`overlays[0]: must contain the business name exactly as "${brand}" (the brand shows in the first 5 seconds).`)
  }
  if (why.length) return { ok: false, why }
  const sectorHint = isAdsV2Sector(p.sector) ? p.sector : null
  return { ok: true, copy: { narration, overlays, sectorHint } }
}

/**
 * Os prompts de movimento e de cena são MOLDES em código (lib/ads/v2ShotLists.ts), mas passam pela mesma régua:
 * se um dia um molde ganhar número, fama ou um contato, o plano é recusado antes de ir à fal. Só dois literais de
 * câmera são permitidos, porque não são fato do cliente: a proporção "9:16" e o ângulo "N-degree" dos movimentos
 * ("Slow 20-degree orbit"). Sem esta exceção o próprio molde reprovaria todo plano de produto cujo brief não diz 20
 * (achado do guardião test-ads-v2-servidor V7 na 1ª rodada).
 */
export function checkV2Prompts(prompts: readonly string[], brief: AdsBrief): string[] {
  const why: string[] = []
  prompts.forEach((p, i) => {
    const bare = p.replace(/\b9:16\b/g, ' ').replace(/\b\d{1,3}-degree\b/g, 'degree')
    why.push(...textIssues(bare, brief, `prompt[${i}]`))
  })
  return why
}

async function callJson(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], temperature: number, maxTokens: number): Promise<string> {
  const completion = await openai.chat.completions.create(
    { model: ADS_V2_BRIEF_MODEL, messages, temperature, max_tokens: maxTokens, response_format: { type: 'json_object' } },
    { timeout: CALL_TIMEOUT_MS, maxRetries: 0 },
  )
  return completion.choices[0]?.message?.content ?? ''
}

export type AdsV2BriefResult =
  | { ok: true; brief: AdsBrief; copy: AdsV2Copy; dropped: string[]; attempts: number }
  | { ok: false; stage: 'brief' | 'copy'; why: string[]; attempts: number }

/** Extrai o brief (1 chamada) e escreve o texto (1 chamada + no máximo 1 correção com o motivo). */
export async function extractAdsV2Brief(args: {
  text: string
  language: string
  languageName: string
  maxWords: number
  narration: boolean
}): Promise<AdsV2BriefResult> {
  const briefMsgs = buildAutoBriefMessages(args.text, args.languageName)
  const briefRaw = await callJson([{ role: 'system', content: briefMsgs.system }, { role: 'user', content: briefMsgs.user }], 0.2, 900)
  const parsed = parseAutoBrief(briefRaw, args.text, args.language)
  let attempts = 1
  if (parsed.needs.includes('business')) return { ok: false, stage: 'brief', why: ['business_name_missing'], attempts }
  const brief = parsed.brief
  const opts = { maxWords: args.maxWords, narration: args.narration }
  const copyMsgs = buildV2CopyMessages(brief, args.languageName, opts)
  const base = [{ role: 'system' as const, content: copyMsgs.system }, { role: 'user' as const, content: copyMsgs.user }]
  let raw = await callJson(base, 0.6, 700)
  attempts += 1
  let checked = checkV2Copy(raw, brief, opts)
  if (!checked.ok) {
    // 1 correção com o motivo da recusa (padrão do /api/ads/script).
    const fix = checked.why
    raw = await callJson([
      ...base,
      { role: 'assistant', content: raw.slice(0, 4000) || '{}' },
      { role: 'user', content: `This cannot be used. Fix all of this and answer again:\n- ${fix.join('\n- ')}\nKeep every other rule. Answer with the JSON only.` },
    ], 0.4, 700)
    attempts += 1
    checked = checkV2Copy(raw, brief, opts)
  }
  if (!checked.ok) return { ok: false, stage: 'copy', why: checked.why.slice(0, 6), attempts }
  return { ok: true, brief, copy: checked.copy, dropped: parsed.dropped, attempts }
}
