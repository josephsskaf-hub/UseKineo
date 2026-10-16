// KINEO-ADS-MAO-JUIZ-1610 — CALIBRAÇÃO DO JUIZ do "produto na mão" contra fotos REAIS, sem render (fundador 16/10: "não pode errar").
//
// O PORQUÊ: no T1 da 3ª rodada (docs/RESULTADO-T1-MAO-AJUSTE-3-2026-10-16.md, pedido a6144352) a chave "only_object" reprovou as 12 fotos de
// cena (7 estavam certas) e o anúncio saiu sem pessoa — o juiz só foi descoberto errado DEPOIS de um render pago (~US$ 3,4). Regra nova:
// nenhum render pago do plano novo sem antes rodar o juiz nas fotos de verdade e comparar com o gabarito (scripts/calibra-juiz-mao.mjs).
// docs/PESQUISA-SEM-ERRO-PRODUTO-NA-MAO-2026-10-16.md (regras 4 e 5): o conjunto rotulado (~21 fotos) e 3 repetições por foto (variância).
//
// O QUE FAZ: para cada foto, chama a MESMA função do avanço (lib/ads/v2LockVision.ts adsV2InHandLabelJudge — o juiz em 2 etapas, o mesmo
// modelo ADS_V2_IN_HAND_JUDGE_MODEL, temperatura 0, o mesmo crop de lib/ads/v2ProductInHandCrop.ts) `repeat` vezes e devolve cada veredito,
// a maioria, se foi estável e as respostas cruas. Não gera imagem, não renderiza, não grava no banco, não cobra crédito (o único efeito é o
// cache do recorte de referência no bucket renders). A rota (app/api/admin/ads-judge-calibrate) só abre para administrador interno.
import { adsV2InHandLabelJudge, ADS_V2_IN_HAND_JUDGE_MODEL, type AdsV2InHandCropFn, type AdsV2InHandJudgeRaw } from '@/lib/ads/v2LockVision'
import { ADS_V2_IN_HAND_DEFECT_KEYS, ADS_V2_IN_HAND_JUDGE_USD, adsV2InHandSoftOnly, adsV2ParseInHandFidelity, adsV2ParseInHandInventory, type AdsV2InHandInventory, type AdsV2InHandObject, type AdsV2InHandVerdict } from '@/lib/ads/v2ProductInHand'

/** Teto de fotos por chamada (com URLs https; com data URL mande 1 foto por chamada: o corpo da Vercel aceita ~4,5 MB). */
export const ADS_V2_CALIBRATE_MAX_IMAGES = 12
/** Teto de uma imagem em data URL. */
export const ADS_V2_CALIBRATE_MAX_DATA_CHARS = 4_000_000
/** Repetições por foto (a pesquisa: 3, para medir a variância; o juiz roda em temperatura 0). */
export const ADS_V2_CALIBRATE_REPEAT_DEFAULT = 3
export const ADS_V2_CALIBRATE_REPEAT_MAX = 3
/** Quantas conferências ao mesmo tempo. */
export const ADS_V2_CALIBRATE_PARALLEL = 4

export type AdsV2CalibrateObject = 'bottle' | 'box' | 'single'
export interface AdsV2CalibrateImage { url: string; object: AdsV2InHandObject | null; label: string | null }
export interface AdsV2CalibrateInput { productUrl: string; images: AdsV2CalibrateImage[]; repeat: number }
export interface AdsV2CalibrateRun { verdict: AdsV2InHandVerdict | null; answers: Record<string, unknown> | null; inventory: AdsV2InHandInventory | null; crop: boolean; raw?: string }
export interface AdsV2CalibrateResult {
  label: string | null
  url: string
  object: AdsV2CalibrateObject
  verdict: AdsV2InHandVerdict | null
  answers: Record<string, unknown> | null
  stable: boolean
  soft_only: boolean
  runs: AdsV2CalibrateRun[]
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

/** O corpo da rota (puro): { product_image_url, images: [{ url, object: 'bottle' | 'box' | 'single', label? }], repeat? (1–3, padrão 3) }. */
export function adsV2CalibrateParse(body: unknown): { ok: true; input: AdsV2CalibrateInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body_must_be_object' }
  const b = body as { product_image_url?: unknown; images?: unknown; repeat?: unknown }
  if (!adsV2CalibrateUrlOk(b.product_image_url)) return { ok: false, error: 'product_image_url_must_be_https_or_data_image' }
  if (!Array.isArray(b.images) || b.images.length === 0) return { ok: false, error: 'images_required' }
  if (b.images.length > ADS_V2_CALIBRATE_MAX_IMAGES) return { ok: false, error: `at_most_${ADS_V2_CALIBRATE_MAX_IMAGES}_images` }
  const repeat = b.repeat === undefined ? ADS_V2_CALIBRATE_REPEAT_DEFAULT : Number(b.repeat)
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > ADS_V2_CALIBRATE_REPEAT_MAX) return { ok: false, error: `repeat_must_be_1_to_${ADS_V2_CALIBRATE_REPEAT_MAX}` }
  const images: AdsV2CalibrateImage[] = []
  for (let i = 0; i < b.images.length; i++) {
    const it = b.images[i] as { url?: unknown; object?: unknown; label?: unknown } | null
    if (!it || typeof it !== 'object') return { ok: false, error: `images[${i}]_must_be_object` }
    if (!adsV2CalibrateUrlOk(it.url)) return { ok: false, error: `images[${i}].url_must_be_https_or_data_image` }
    if (it.object !== 'bottle' && it.object !== 'box' && it.object !== 'single') return { ok: false, error: `images[${i}].object_must_be_bottle_box_or_single` }
    images.push({ url: it.url.trim(), object: it.object === 'single' ? null : it.object, label: typeof it.label === 'string' && it.label.trim() ? it.label.trim().slice(0, 40) : null })
  }
  return { ok: true, input: { productUrl: (b.product_image_url as string).trim(), images, repeat } }
}

/** A URL como aparece na resposta: data URL vira um resumo (não devolve megabytes). Pura. */
export function adsV2CalibrateShowUrl(u: string): string {
  return u.startsWith('data:') ? `${u.slice(0, u.indexOf(',') + 1)}(${u.length} chars)` : u
}

/** As respostas de uma rodada, chave por chave (pura): os defeitos do inventário (true/false) + a fidelidade ("yes"/"no"/"unsure") + as mãos. */
export function adsV2CalibrateAnswers(raw: AdsV2InHandJudgeRaw | null, verdict: AdsV2InHandVerdict | null): Record<string, unknown> | null {
  const inv = raw ? adsV2ParseInHandInventory(raw.inventory) : null
  if (!inv || !verdict) return null
  const fid = adsV2ParseInHandFidelity(raw!.fidelity)
  return { ...Object.fromEntries(ADS_V2_IN_HAND_DEFECT_KEYS.map((k) => [k, verdict.fails.includes(k)])), count: verdict.fails.includes('count'), hands: inv.hands, ...(fid ?? {}), people: inv.people.length, products: inv.products.map((p) => `${p.type}:${p.visible}`) }
}

const verdictKey = (v: AdsV2InHandVerdict | null): string => (v ? `${v.ok}|${[...v.fails].sort().join(',')}` : 'null')

/** Roda o juiz do avanço em cada foto, `repeat` vezes (a mesma função; sink = a resposta crua; crop = o do avanço). Nunca lança. */
export async function adsV2CalibrateRun(input: AdsV2CalibrateInput, doFetch: typeof fetch = fetch, crop?: AdsV2InHandCropFn): Promise<{ model: string; defect_keys: readonly string[]; repeat: number; usd: number; results: AdsV2CalibrateResult[] }> {
  const once = async (img: AdsV2CalibrateImage): Promise<AdsV2CalibrateRun> => {
    let raw: AdsV2InHandJudgeRaw | null = null
    const verdict = await adsV2InHandLabelJudge(input.productUrl, img.url, doFetch, img.object, (r) => { raw = r }, crop).catch(() => null)
    const r = raw as AdsV2InHandJudgeRaw | null
    const inventory = r ? adsV2ParseInHandInventory(r.inventory) : null
    return { verdict, answers: adsV2CalibrateAnswers(r, verdict), inventory, crop: !!r?.crop, ...(r && !inventory && r.inventory !== null ? { raw: String(r.inventory).slice(0, 300) } : {}) }
  }
  const one = async (img: AdsV2CalibrateImage): Promise<AdsV2CalibrateResult> => {
    const runs = await Promise.all(Array.from({ length: input.repeat }, () => once(img)))
    const tally = new Map<string, number>()
    for (const r of runs) tally.set(verdictKey(r.verdict), (tally.get(verdictKey(r.verdict)) ?? 0) + 1)
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const pick = runs.find((r) => verdictKey(r.verdict) === top) ?? runs[0]
    return { label: img.label, url: adsV2CalibrateShowUrl(img.url), object: img.object ?? 'single', verdict: pick.verdict, answers: pick.answers, stable: tally.size === 1, soft_only: adsV2InHandSoftOnly(pick.verdict), runs }
  }
  const results: AdsV2CalibrateResult[] = []
  for (let i = 0; i < input.images.length; i += ADS_V2_CALIBRATE_PARALLEL) results.push(...(await Promise.all(input.images.slice(i, i + ADS_V2_CALIBRATE_PARALLEL).map(one))))
  return { model: ADS_V2_IN_HAND_JUDGE_MODEL, defect_keys: ADS_V2_IN_HAND_DEFECT_KEYS, repeat: input.repeat, usd: Math.round(input.images.length * input.repeat * 2 * ADS_V2_IN_HAND_JUDGE_USD * 1000) / 1000, results }
}
