// KINEO-ADS-MAO-JUIZ-1610 — CALIBRAÇÃO DO JUIZ do "produto na mão" contra fotos REAIS, sem render (fundador 16/10: "não pode errar").
//
// O PORQUÊ: no T1 da 3ª rodada (docs/RESULTADO-T1-MAO-AJUSTE-3-2026-10-16.md, pedido a6144352) a chave "only_object" reprovou as 12 fotos de
// cena (7 estavam certas) e o anúncio saiu sem pessoa — o juiz só foi descoberto errado DEPOIS de um render pago (~US$ 3,4). Regra nova:
// nenhum render pago do plano novo sem antes rodar o juiz nas fotos de verdade e comparar com o gabarito (scripts/calibra-juiz-mao.mjs).
//
// O QUE FAZ: para cada foto, chama a MESMA função do avanço (lib/ads/v2LockVision.ts adsV2InHandLabelJudge — a mesma pergunta, o mesmo
// modelo do registro, as mesmas chaves e a mesma leitura) e devolve o veredito E a resposta crua (todas as chaves). Não gera imagem, não
// renderiza, não grava no banco, não cobra crédito: ~US$ 0,01 por foto. A rota (app/api/admin/ads-judge-calibrate) só abre para e-mail de
// administrador que também é conta interna.
import { adsV2InHandLabelJudge } from '@/lib/ads/v2LockVision'
import { ADS_V2_IN_HAND_DEFECT_KEYS, ADS_V2_IN_HAND_JUDGE_USD, adsV2InHandJudgeKeys, adsV2InHandSoftOnly, type AdsV2InHandObject, type AdsV2InHandVerdict } from '@/lib/ads/v2ProductInHand'
import { AI_TEXT_MODELS } from '@/lib/aiModels'

/** Teto de fotos por chamada (as 12 do T1 cabem numa chamada só quando são URLs). */
export const ADS_V2_CALIBRATE_MAX_IMAGES = 12
/** Teto de uma imagem em data URL (o corpo da Vercel aceita ~4,5 MB: mande 1 foto por chamada quando for data URL). */
export const ADS_V2_CALIBRATE_MAX_DATA_CHARS = 4_000_000
/** Quantas conferências ao mesmo tempo (a visão do registro aguenta; o prazo da rota é 60 s). */
export const ADS_V2_CALIBRATE_PARALLEL = 4

export type AdsV2CalibrateObject = 'bottle' | 'box' | 'single'
export interface AdsV2CalibrateImage { url: string; object: AdsV2InHandObject | null; label: string | null }
export interface AdsV2CalibrateInput { productUrl: string; images: AdsV2CalibrateImage[] }
export interface AdsV2CalibrateResult {
  label: string | null
  url: string
  object: AdsV2CalibrateObject
  keys: string[]
  verdict: AdsV2InHandVerdict | null
  answers: Record<string, unknown> | null
  soft_only: boolean
  raw?: string
}

const HTTPS = /^https:\/\/\S+$/i
const DATA = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/

/** URL aceita: https (o nosso bucket ou a fal) ou data:image em base64 (as fotos salvas no disco). Pura. */
export function adsV2CalibrateUrlOk(u: unknown): u is string {
  if (typeof u !== 'string') return false
  const s = u.trim()
  if (HTTPS.test(s)) return s.length <= 2048
  return s.length <= ADS_V2_CALIBRATE_MAX_DATA_CHARS && DATA.test(s)
}

/** O corpo da rota (puro): { product_image_url, images: [{ url, object: 'bottle' | 'box' | 'single', label? }] }. */
export function adsV2CalibrateParse(body: unknown): { ok: true; input: AdsV2CalibrateInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body_must_be_object' }
  const b = body as { product_image_url?: unknown; images?: unknown }
  if (!adsV2CalibrateUrlOk(b.product_image_url)) return { ok: false, error: 'product_image_url_must_be_https_or_data_image' }
  if (!Array.isArray(b.images) || b.images.length === 0) return { ok: false, error: 'images_required' }
  if (b.images.length > ADS_V2_CALIBRATE_MAX_IMAGES) return { ok: false, error: `at_most_${ADS_V2_CALIBRATE_MAX_IMAGES}_images` }
  const images: AdsV2CalibrateImage[] = []
  for (let i = 0; i < b.images.length; i++) {
    const it = b.images[i] as { url?: unknown; object?: unknown; label?: unknown } | null
    if (!it || typeof it !== 'object') return { ok: false, error: `images[${i}]_must_be_object` }
    if (!adsV2CalibrateUrlOk(it.url)) return { ok: false, error: `images[${i}].url_must_be_https_or_data_image` }
    if (it.object !== 'bottle' && it.object !== 'box' && it.object !== 'single') return { ok: false, error: `images[${i}].object_must_be_bottle_box_or_single` }
    images.push({ url: it.url.trim(), object: it.object === 'single' ? null : it.object, label: typeof it.label === 'string' && it.label.trim() ? it.label.trim().slice(0, 40) : null })
  }
  return { ok: true, input: { productUrl: (b.product_image_url as string).trim(), images } }
}

/** A URL como aparece na resposta: data URL vira um resumo (não devolve megabytes). Pura. */
export function adsV2CalibrateShowUrl(u: string): string {
  return u.startsWith('data:') ? `${u.slice(0, u.indexOf(',') + 1)}(${u.length} chars)` : u
}

/** Lê a resposta crua do modelo (JSON) só para mostrar todas as chaves; ilegível = null. Pura. */
export function adsV2CalibrateAnswers(content: unknown): Record<string, unknown> | null {
  let j: unknown = content
  if (typeof content === 'string') { try { j = JSON.parse(content) } catch { return null } }
  return j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : null
}

/** Roda o juiz do avanço em cada foto (a mesma função; sink = a resposta crua). Nunca lança: foto sem resposta = verdict null. */
export async function adsV2CalibrateRun(input: AdsV2CalibrateInput, doFetch: typeof fetch = fetch): Promise<{ model: string; defect_keys: readonly string[]; usd: number; results: AdsV2CalibrateResult[] }> {
  const one = async (img: AdsV2CalibrateImage): Promise<AdsV2CalibrateResult> => {
    let content: unknown = null
    const verdict = await adsV2InHandLabelJudge(input.productUrl, img.url, doFetch, img.object, (c) => { content = c }).catch(() => null)
    const answers = adsV2CalibrateAnswers(content)
    return {
      label: img.label, url: adsV2CalibrateShowUrl(img.url), object: img.object ?? 'single', keys: adsV2InHandJudgeKeys(img.object), verdict, answers,
      soft_only: adsV2InHandSoftOnly(verdict), ...(answers === null && content !== null ? { raw: String(content).slice(0, 300) } : {}),
    }
  }
  const results: AdsV2CalibrateResult[] = []
  for (let i = 0; i < input.images.length; i += ADS_V2_CALIBRATE_PARALLEL) results.push(...(await Promise.all(input.images.slice(i, i + ADS_V2_CALIBRATE_PARALLEL).map(one))))
  return { model: AI_TEXT_MODELS.vision, defect_keys: ADS_V2_IN_HAND_DEFECT_KEYS, usd: Math.round(input.images.length * ADS_V2_IN_HAND_JUDGE_USD * 1000) / 1000, results }
}
