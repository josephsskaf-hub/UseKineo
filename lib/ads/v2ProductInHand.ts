// KINEO-ADS-PRODUTO-NA-MAO-1610 — "PESSOA SEGURANDO O PRODUTO REAL" no nível Comercial do Studio Ads v2, no lugar da colagem.
//
// O PORQUÊ (docs/ESTUDO-PRODUTO-NA-CENA-LIDERES-2026-10-16.md, seções 3 e 4, pipeline A; docs/RESULTADO-TESTE-PRODUTO-NA-MAO-2026-10-16.md):
// a trava antiga ESCONDE o produto do Nano Banana e COLA o recorte num canto (escala de 28% do quadro, sem sombra, sem mão, a
// mesma luz de estúdio em toda cena) e, com 1 foto, o Comercial passava ~8,5 de 15 s em fundo branco. O teste de 16/10 (Atheeri)
// provou o caminho dos líderes: o Nano Banana Pro edit com a FOTO REAL do produto como referência põe a caixa NA MÃO de uma pessoa,
// com a escala da mão e a luz da cena, sem redesenhar a embalagem (nome, árabe, abelha e favo certos; só o texto pequeno deforma);
// o Kling O3 anima com movimento humano (nota do fundador 8/10: "faltou o movimento do rosto e o movimento das mãos… a gente busca
// a duplicação do corpo humano"). O defeito do vídeo (a caixa gira, achata e cresce) mora no FIM do clipe: usamos só o começo, e
// a MESMA foto entra como quadro final (end_image_url) para segurar a embalagem nas duas pontas.
//
// O PLANO NOVO (Comercial 15 s, só contas internas — ADS_V2_IN_HAND_MODE):
//   0,0–2,0  GANCHO     pessoa na cena traz o produto para o quadro (nunca o packshot branco)      Nano Banana + Kling O3
//   2,0–4,5  USO 1      a pessoa segura o produto na palma, rótulo de frente (o prompt aprovado)  Nano Banana + Kling O3
//   4,5–7,0  USO 2      a pessoa usa o produto (uma mão segura, a outra toca)                      Nano Banana + Kling O3
//   7,0–9,5  CLOSE      a mão com o produto perto da câmera, dentro da cena                        Nano Banana + Kling O3
//   9,5–12,5 PACKSHOT   a foto REAL do produto, parada, com o zoom do montador (o rótulo 100% fiel) sem IA
//   12,5–15  CARTÃO     o de sempre (ADS_V2_CARD_SECONDS)
// Packshot + cartão = 5,5 s (era ~8,5). Os planos somam 12,5 s como antes: duração, frases de tela (terços de 12,5 s), narração,
// créditos (adsV2Credits só depende do nível e da duração = 41) e formatos ficam iguais.
//
// O JUIZ DO RÓTULO (lib/ads/v2LockVision.ts adsV2InHandLabelJudge — a mesma chamada de visão da trava): compara o produto do still
// com a foto original (nome/logo, cores, forma, mãos, um produto só). Divergiu → refaz 1 vez; de novo → o plano vira um
// enquadramento SEM o rótulo de frente; de novo → a foto real do produto (o fallback de sempre). Cada veredito vira o evento
// 'ads_v2_in_hand_judged'. Juiz fora do ar = a imagem segue (a regra das conferências da trava).
//
// A COLAGEM ANTIGA fica no código e continua sendo o caminho de quem NÃO é interno — e o de todo pedido que não cabe aqui
// (Foto em movimento, Premium, 20/30 s, estilo, ator, vídeo do cliente, pedido sem foto de produto).
//
// LIB PURA: só importa as libs puras v2ShotLists e v2Tiers (o guardião scripts/test-ads-produto-na-mao-1610.mjs transpila e roda).
import {
  ADS_V2_CARD_SECONDS,
  ADS_V2_CUT_MARGIN,
  ADS_V2_FADE_SECONDS,
  ADS_V2_KEEP_PHRASE,
  ADS_V2_MIN_GEN_SECONDS,
  ADS_V2_PRODUCT_LOCK_SECTORS,
  ADS_V2_SCENE_FRAME_OPENING,
  adsV2FormatShots,
  adsV2SettingFromPrompt,
  type AdsV2Beat,
  type AdsV2Format,
  type AdsV2PlannedShot,
  type AdsV2Role,
} from '@/lib/ads/v2ShotLists'
import { ADS_V2_ENGINES, ADS_V2_SCENE_IMAGE_USD, type AdsV2UsdEstimate } from '@/lib/ads/v2Tiers'

/** Interruptor ÚNICO do método novo: 'internal' = só as contas da casa (isAdsInternalEmail); 'all' = todos; 'off' = a colagem. */
export const ADS_V2_IN_HAND_MODE: 'off' | 'internal' | 'all' = 'internal'

/** O método novo vale para esta conta? (puro: `internal` = isAdsInternalEmail, que o /plan já resolve como reason 'internal'). */
export function adsV2InHandOn(internal: boolean, mode: 'off' | 'internal' | 'all' = ADS_V2_IN_HAND_MODE): boolean {
  if (mode === 'all') return true
  if (mode === 'internal') return internal === true
  return false
}

export type AdsV2InHandFrame = 'hook' | 'hold' | 'use' | 'close'
/** O enquadramento de reserva do juiz: produto de lado, rótulo fora da câmera. */
export type AdsV2InHandPromptFrame = AdsV2InHandFrame | 'no_label'

/** O que o plano gravado carrega em cada plano novo: o enquadramento e a foto do produto do fallback (já no formato do anúncio). */
export interface AdsV2InHandTag { frame: AdsV2InHandFrame; fallbackUrl: string }

export type AdsV2InHandShot = AdsV2PlannedShot & { inHand?: AdsV2InHandTag }

/** Os 4 planos de gente com o produto (a ordem é a linha do tempo). */
export const ADS_V2_IN_HAND_SLOTS: readonly { role: AdsV2Role; beat: AdsV2Beat; cut: number; frame: AdsV2InHandFrame }[] = [
  { role: 'hook', beat: 'hook', cut: 2.0, frame: 'hook' },
  { role: 'use', beat: 'use_emotion', cut: 2.5, frame: 'hold' },
  { role: 'use', beat: 'use_emotion', cut: 2.5, frame: 'use' },
  { role: 'product', beat: 'place_product', cut: 2.5, frame: 'close' },
]
/** O packshot REAL (foto parada com o zoom do montador). Packshot + cartão = 3,0 + 2,5 = 5,5 s. */
export const ADS_V2_IN_HAND_PACKSHOT_SECONDS = 3.0
/** Packshot + cartão (o alvo da tarefa: ≤ ~6 s; era ~8,5). */
export const ADS_V2_IN_HAND_PACKSHOT_CARD_SECONDS = Math.round((ADS_V2_IN_HAND_PACKSHOT_SECONDS + ADS_V2_CARD_SECONDS) * 1000) / 1000

/**
 * Início do trecho no clipe do Kling O3 (3 s, a menor duração do schema): pula só o 1º quadro parado e usa o COMEÇO do clipe —
 * no teste de 16/10 o giro e o crescimento da caixa aconteceram no fim. Com o corte de 2,5 s o trecho vai até 2,65 s (+ dissolve
 * 2,9 ≤ 3,0 − margem 0,1).
 */
export const ADS_V2_IN_HAND_CUT_START = 0.15
/** Duração pedida ao Kling O3 (enum string '3'..'15' no schema da fal; a mínima). */
export const ADS_V2_IN_HAND_GEN_SECONDS = '3' as const

/** Mais de uma referência no máximo (2ª foto do produto + até 2 do lugar): o modelo também vê o produto de outro lado e o lugar. */
export const ADS_V2_IN_HAND_MAX_REFS = 4

// ── o pedido da foto da cena (Nano Banana Pro edit, a foto REAL do produto como 1ª referência) ────────────────────────────
/** A ação de cada enquadramento. Generalização do prompt do teste aprovado em 16/10 (mulher no quarto de hotel com chuva, caixa na palma). */
export const ADS_V2_IN_HAND_ACTIONS: Readonly<Record<AdsV2InHandPromptFrame, string>> = {
  hook: 'An ordinary non-famous adult in this place brings the product from the FIRST reference photo into view, holding it up beside their face and looking at it with a curious, happy expression; the front of the product faces the camera.',
  hold: 'An ordinary non-famous adult in this place holds the product from the FIRST reference photo in the palm of one hand, a short distance in front of their chest, the front label facing the camera and clearly visible, and looks at it with a soft smile.',
  use: 'An ordinary non-famous adult in this place uses the product from the FIRST reference photo in a natural, everyday way: one hand holds it steady while the other hand touches it as if opening or applying it; the front label stays visible.',
  close: 'Close-up inside this same place: a hand holds the product from the FIRST reference photo near the camera, the product is sharp and fills about a third of the frame, and the person is softly out of focus behind it.',
  no_label: 'An ordinary non-famous adult in this place holds the product from the FIRST reference photo in one hand, turned to the side so the front label does NOT face the camera; the product is a little out of focus and the face and hands of the person are the subject.',
}

/** A frase que pede o produto IGUAL (pedida explicitamente pela tarefa). */
export const ADS_V2_IN_HAND_KEEP_PACKAGING = 'Use the FIRST reference photo as the exact product: keep the packaging design, colors, logo and printed text exactly as in the reference, with the same shape and proportions. Do not redesign, rename, resize or add anything to the product.'
/** Escala pela mão, luz e sombra da cena, mãos de verdade, um produto só. Sem dígitos (a régua anti-invenção do /plan). */
export const ADS_V2_IN_HAND_RULES: readonly string[] = [
  'Real-life scale: the product has exactly its real size in an adult hand; the hand is the ruler, never an oversized product.',
  'The light of the place falls on the product: the same light direction and color temperature as the scene, soft shadows of the fingers on the packaging and natural reflections.',
  'The fingers wrap naturally around the product and overlap its edges; every hand has five natural fingers; nothing passes through the product.',
  'Exactly one product in the frame: no second bottle, box, package or other product anywhere.',
  'Real skin texture, everyday clothes, natural expression.',
  'No text, captions, logos or watermarks added to the image; the product keeps its own printed label.',
]
/** Sem a cena da pessoa (a frase não pediu lugar): uma casa de verdade com luz de janela. */
export const ADS_V2_IN_HAND_DEFAULT_PLACE = 'Place: a real, lived-in home with soft natural window light.'
const EXTRA_REFS_LINE = 'Any other reference photo only shows more of the same product or the place; never copy a person from it.'
const FRAME_OPENING: Readonly<Record<AdsV2InHandPromptFrame, string>> = {
  hook: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, like a real smartphone photo, natural light.`,
  hold: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, like a real smartphone photo, natural light.`,
  use: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, like a real smartphone photo, natural light.`,
  close: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, close-up, like a real smartphone photo, natural light.`,
  no_label: `${ADS_V2_SCENE_FRAME_OPENING} from a product commercial, like a real smartphone photo, natural light.`,
}

/**
 * O pedido da foto da cena (puro). `settingLine` = a linha "Setting: …" já limpa (adsV2SettingLine, lib/ads/v2Scene.ts) ou null;
 * qualquer outro texto é ignorado (adsV2SettingFromPrompt confere o formato). `format` troca a abertura (adsV2FormatShots).
 */
export function adsV2InHandScenePrompt(i: { frame: AdsV2InHandPromptFrame; settingLine?: string | null; format?: AdsV2Format | null; extraRefs?: boolean }): string {
  const frame: AdsV2InHandPromptFrame = Object.prototype.hasOwnProperty.call(ADS_V2_IN_HAND_ACTIONS, i.frame) ? i.frame : 'hold'
  const setting = adsV2SettingFromPrompt(i.settingLine ?? null)
  const text = [
    FRAME_OPENING[frame],
    setting ?? ADS_V2_IN_HAND_DEFAULT_PLACE,
    ADS_V2_IN_HAND_ACTIONS[frame],
    ADS_V2_IN_HAND_KEEP_PACKAGING,
    i.extraRefs ? EXTRA_REFS_LINE : '',
    ...ADS_V2_IN_HAND_RULES,
  ].filter(Boolean).join(' ')
  const fmt: AdsV2Format = i.format === '4:5' || i.format === '1:1' ? i.format : '9:16'
  return adsV2FormatShots([{ scenePrompt: text }], fmt)[0].scenePrompt as string
}

// ── o movimento (Kling O3 i2v): humano VIVO, produto TRAVADO ────────────────────────────────────────────────────────────
/** O que muda por enquadramento (o olhar e as mãos). */
export const ADS_V2_IN_HAND_MOTION_BEATS: Readonly<Record<AdsV2InHandFrame, string>> = {
  hook: 'they glance from the product to the camera and a soft smile forms',
  hold: 'a soft smile forms and they glance from the box in their hand to the camera',
  use: 'their other hand moves gently on the product while they smile at it',
  close: 'the face behind stays alive, breathing and blinking, while the fingers settle on the product',
}
/**
 * O movimento do plano (puro). O exemplo da tarefa, com rosto e mãos vivos o tempo todo (a nota 8/10 do fundador) e o produto
 * parado na mão: não gira, não vira, não cresce; câmera quase parada. Termina em ADS_V2_KEEP_PHRASE como todo movimento do v2.
 */
export function adsV2InHandMotion(frame: AdsV2InHandFrame): string {
  const beat = ADS_V2_IN_HAND_MOTION_BEATS[frame] ?? ADS_V2_IN_HAND_MOTION_BEATS.hold
  return [
    `Natural lifelike motion: the person breathes, blinks and makes small natural head movements; ${beat}; their fingers adjust their grip slightly.`,
    'The face and the hands stay alive the whole time, like real footage of a real person.',
    'The product stays steady in the hand: it does not rotate, flip, tilt toward the camera or grow; it keeps exactly its shape, colors, label and proportions; no other object appears.',
    'Camera almost static, very slow push-in.',
    ADS_V2_KEEP_PHRASE,
  ].join(' ')
}

// ── o plano ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface AdsV2InHandPhoto { footage_id: string; kind: string; url: string; original_footage_id?: string | null; original_url?: string | null }

const https = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim())

/**
 * Este pedido sai pelo método novo? (puro) Só o Comercial de 15 s, sem estilo, sem ator e sem vídeo do cliente, com foto
 * marcada como PRODUTO, em pedido de produto (ou setor loja/outro, os mesmos da trava). null = o plano de antes (a colagem).
 */
export function adsV2InHandEligible(i: { on: boolean; tier: string; seconds: number; photos: readonly AdsV2InHandPhoto[] | null | undefined; productOrder: boolean; sector: string | null | undefined; presenter: boolean; style: string | null | undefined; videos: number }): AdsV2InHandPhoto | null {
  if (i.on !== true || i.tier !== 'commercial' || i.seconds !== 15 || i.presenter === true || !!i.style || (i.videos ?? 0) > 0) return null
  if (!i.productOrder && !(ADS_V2_PRODUCT_LOCK_SECTORS as readonly string[]).includes(String(i.sector ?? ''))) return null
  const photos = Array.isArray(i.photos) ? i.photos : []
  return photos.find((p) => p && p.kind === 'product' && typeof p.footage_id === 'string' && !!p.footage_id && https(p.url)) ?? null
}

/** As referências da foto da cena: a foto REAL do produto (a original, sem o corte do formato, quando existe) primeiro. */
export function adsV2InHandRefs(product: AdsV2InHandPhoto, photos: readonly AdsV2InHandPhoto[]): { ids: string[]; urls: string[] } {
  const first = https(product.original_url) ? product.original_url.trim() : product.url.trim()
  const ids = [product.footage_id]
  const urls = [first]
  const more = photos.filter((p) => p && p !== product && https(p.url) && (p.kind === 'product' || p.kind === 'place'))
  for (const p of [...more.filter((p) => p.kind === 'product').slice(0, 1), ...more.filter((p) => p.kind === 'place').slice(0, 2)]) {
    if (urls.length >= ADS_V2_IN_HAND_MAX_REFS) break
    ids.push(p.footage_id)
    urls.push(p.url.trim())
  }
  return { ids, urls }
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000

/**
 * O plano novo (puro): 4 planos de gente com o produto + o packshot real. Os índices são 0..4; a duração dos planos é 12,5 s
 * (a mesma do Comercial de antes). Inelegível = null (o chamador mantém o plano de antes, objeto por objeto).
 */
export function adsV2InHandPlan(i: { on: boolean; tier: string; seconds: number; photos: readonly AdsV2InHandPhoto[] | null | undefined; productOrder: boolean; sector: string | null | undefined; presenter: boolean; style: string | null | undefined; videos: number; settingLine?: string | null; format?: AdsV2Format | null }): { shots: AdsV2InHandShot[]; shotsSeconds: number; product: AdsV2InHandPhoto } | null {
  const product = adsV2InHandEligible(i)
  if (!product) return null
  const photos = Array.isArray(i.photos) ? i.photos : []
  const refs = adsV2InHandRefs(product, photos)
  const fallbackUrl = product.url.trim()
  const shots: AdsV2InHandShot[] = ADS_V2_IN_HAND_SLOTS.map((slot, idx) => ({
    idx,
    role: slot.role,
    beat: slot.beat,
    kind: 'people',
    source: 'generated_scene',
    sourceFootageId: null,
    imageUrl: null,
    referenceFootageIds: [...refs.ids],
    referenceUrls: [...refs.urls],
    scenePrompt: adsV2InHandScenePrompt({ frame: slot.frame, settingLine: i.settingLine ?? null, format: i.format ?? '9:16', extraRefs: refs.urls.length > 1 }),
    prompt: adsV2InHandMotion(slot.frame),
    movementVariant: idx,
    cutStart: ADS_V2_IN_HAND_CUT_START,
    cutSeconds: slot.cut,
    inHand: { frame: slot.frame, fallbackUrl },
  }))
  shots.push({
    idx: shots.length,
    role: 'product',
    beat: 'place_product',
    kind: 'text',
    source: 'client_photo',
    sourceFootageId: product.footage_id,
    imageUrl: fallbackUrl,
    referenceFootageIds: [],
    referenceUrls: [],
    scenePrompt: null,
    prompt: null,
    movementVariant: 0,
    cutStart: 0,
    cutSeconds: ADS_V2_IN_HAND_PACKSHOT_SECONDS,
    packshot: true,
  })
  return { shots, shotsSeconds: r3(shots.reduce((s, x) => s + x.cutSeconds, 0)), product }
}

/** O plano novo deste plano gravado (o enquadramento e a foto do fallback), ou null (plano de antes). Puro. */
export function adsV2InHandOf(shot: unknown): AdsV2InHandTag | null {
  const t = shot && typeof shot === 'object' ? (shot as { inHand?: unknown }).inHand : null
  if (!t || typeof t !== 'object') return null
  const frame = (t as { frame?: unknown }).frame
  const fallbackUrl = (t as { fallbackUrl?: unknown }).fallbackUrl
  if (typeof frame !== 'string' || !(ADS_V2_IN_HAND_SLOTS as readonly { frame: string }[]).some((s) => s.frame === frame) || !https(fallbackUrl)) return null
  return { frame: frame as AdsV2InHandFrame, fallbackUrl: fallbackUrl.trim() }
}

/** O plano gravado saiu pelo método novo? (marca do plano, gravada pelo /plan). */
export function adsV2IsInHandPlan(plan: unknown): boolean {
  return !!plan && typeof plan === 'object' && (plan as { productInHand?: unknown }).productInHand === true
}

/** Os planos novos do plano gravado (idx + enquadramento), para o /plan e o dry-run do /start. */
export function adsV2InHandSummary(shots: readonly unknown[] | null | undefined): { idx: number; frame: AdsV2InHandFrame | 'packshot'; cut_seconds: number }[] {
  type Row = { idx: number; frame: AdsV2InHandFrame | 'packshot'; cut_seconds: number }
  return (Array.isArray(shots) ? shots : []).flatMap((s): Row[] => {
    const o = s as { idx?: unknown; packshot?: unknown; cutSeconds?: unknown }
    const t = adsV2InHandOf(s)
    const idx = typeof o?.idx === 'number' ? o.idx : -1
    const cut = typeof o?.cutSeconds === 'number' ? o.cutSeconds : 0
    if (t) return [{ idx, frame: t.frame, cut_seconds: cut }]
    if (o?.packshot === true) return [{ idx, frame: 'packshot' as const, cut_seconds: cut }]
    return []
  })
}

// ── o vídeo: Kling O3 i2v com a MESMA foto como quadro final ────────────────────────────────────────────────────────────
// Schema conferido em 16/10/2026 (https://fal.ai/models/fal-ai/kling-video/o3/pro/image-to-video/llms.txt; também anotado em
// lib/ads/v2Engines.ts em 28/09): image_url (obrigatório, quadro inicial) · end_image_url (opcional, quadro final; NÃO existe
// tail_image_url) · duration enum string '3'..'15' (padrão '5') · generate_audio (padrão false) · prompt | multi_prompt ·
// shot_type · enable_safety_checker. Montado CAMPO A CAMPO (nada espalhado): o builder de sempre (buildShotInput) continua sem
// end_image_url; só o plano novo passa por aqui.
export interface AdsV2InHandKlingInput {
  prompt: string
  image_url: string
  end_image_url: string
  duration: typeof ADS_V2_IN_HAND_GEN_SECONDS
  generate_audio: false
}
export function adsV2InHandKlingInput(shot: { imageUrl: string; prompt: string }): AdsV2InHandKlingInput {
  const image = typeof shot?.imageUrl === 'string' ? shot.imageUrl.trim() : ''
  if (!/^https:\/\/[^\s]+$/i.test(image)) throw new Error('ads_v2_bad_image_url')
  const prompt = typeof shot?.prompt === 'string' ? shot.prompt.trim() : ''
  if (prompt.length < 3) throw new Error('ads_v2_bad_prompt')
  if (prompt.length > 2500) throw new Error('ads_v2_prompt_too_long')
  return { prompt, image_url: image, end_image_url: image, duration: ADS_V2_IN_HAND_GEN_SECONDS, generate_audio: false }
}

// ── o juiz do rótulo (visão barata, a mesma chamada de lib/ads/v2LockVision.ts) ─────────────────────────────────────────
/** A pergunta (sem exemplo de resposta pronto: o reteste de 15/10 mostrou que a visão COPIA o exemplo). 1ª imagem = a foto real. */
export const ADS_V2_IN_HAND_JUDGE_QUESTION = 'The FIRST image is the real product photo. The SECOND image is a generated photo of a person with that product. Compare the product in the SECOND image with the FIRST one and answer each item with true or false. "name": the brand name and the logo, where they are visible, are the same words and the same logo (small text may be blurry, but it must not turn into a different word or a different logo). "colors": the packaging colors are the same. "shape": the shape and the proportions of the packaging are the same. "hands": the hands look natural, with five fingers, and nothing passes through the product. "one_product": there is exactly one product and it is this product. Answer only with JSON with the keys "name", "colors", "shape", "hands" and "one_product", each one true or false.'
export const ADS_V2_IN_HAND_JUDGE_KEYS: readonly string[] = ['name', 'colors', 'shape', 'hands', 'one_product']
export interface AdsV2InHandVerdict { ok: boolean; fails: string[] }
/** A resposta do juiz (pura): todas as chaves booleanas, senão null ("não sei"). */
export function adsV2ParseInHandVerdict(raw: unknown): AdsV2InHandVerdict | null {
  let j: unknown = raw
  if (typeof raw === 'string') { try { j = JSON.parse(raw) } catch { return null } }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null
  const o = j as Record<string, unknown>
  if (!ADS_V2_IN_HAND_JUDGE_KEYS.every((k) => typeof o[k] === 'boolean')) return null
  const fails = ADS_V2_IN_HAND_JUDGE_KEYS.filter((k) => o[k] !== true)
  return { ok: fails.length === 0, fails }
}

export const ADS_V2_IN_HAND_RETRY_REASON = 'in_hand_label_retry'
export const ADS_V2_IN_HAND_NO_LABEL_REASON = 'in_hand_no_label'
export type AdsV2InHandStep = 'keep' | 'retry' | 'no_label' | 'product_photo'
/**
 * O passo depois do juiz (puro). Bateu (ou o juiz não respondeu) = fica. Divergiu: 1ª vez refaz a MESMA foto; 2ª vez o plano
 * vira o enquadramento sem o rótulo de frente; 3ª vez (ou divergência sem o histórico) a foto real do produto. Nunca rótulo errado.
 */
export function adsV2InHandJudgeStep(i: { verdict: AdsV2InHandVerdict | null | undefined; previousReason: string | null | undefined }): AdsV2InHandStep {
  if (!i.verdict || i.verdict.ok) return 'keep'
  if (i.previousReason === ADS_V2_IN_HAND_NO_LABEL_REASON) return 'product_photo'
  if (i.previousReason === ADS_V2_IN_HAND_RETRY_REASON) return 'no_label'
  return 'retry'
}
/** Qual tentativa de foto é esta (1 = a 1ª, 2 = a refação, 3 = o enquadramento sem rótulo). */
export function adsV2InHandTry(previousReason: string | null | undefined): 1 | 2 | 3 {
  return previousReason === ADS_V2_IN_HAND_NO_LABEL_REASON ? 3 : previousReason === ADS_V2_IN_HAND_RETRY_REASON ? 2 : 1
}

// ── custo (dry-run): o estimateAdUsd de sempre + o juiz + uma refação de foto esperada ─────────────────────────────────
/** Uma conferência do juiz: 2 imagens em 'high' no modelo de visão do registro (~US$ 0,008; arredondado para cima). */
export const ADS_V2_IN_HAND_JUDGE_USD = 0.01
/** Refações de foto esperadas por anúncio (o estudo de 16/10: "~1 refação"). Só estimativa; o cliente nunca paga a refação. */
export const ADS_V2_IN_HAND_EXPECTED_RETRIES = 1
export type AdsV2InHandUsd = AdsV2UsdEstimate & { judgeUsd: number; retryReserveUsd: number; inHand: true }
/**
 * O custo do anúncio novo (puro): a base (estimateAdUsd: 4 fotos do Nano Banana × 0,15 + 4 clipes do Kling O3 de 3 s × 0,336 +
 * os fixos) + o juiz em cada foto (e na refação) + a reserva de UMA refação de foto. Comercial 15 s ≈ US$ 2,394.
 */
export function adsV2InHandUsd(base: AdsV2UsdEstimate, shots: readonly unknown[] | null | undefined): AdsV2InHandUsd {
  const scenes = (Array.isArray(shots) ? shots : []).filter((s) => adsV2InHandOf(s)).length
  const judges = scenes + ADS_V2_IN_HAND_EXPECTED_RETRIES
  const judgeUsd = r3(judges * ADS_V2_IN_HAND_JUDGE_USD)
  const retryReserveUsd = r3(ADS_V2_IN_HAND_EXPECTED_RETRIES * ADS_V2_SCENE_IMAGE_USD)
  return { ...base, judgeUsd, retryReserveUsd, totalUsd: r3(base.totalUsd + judgeUsd + retryReserveUsd), inHand: true }
}

/** Espelho conferido pelo guardião: o trecho usado cabe no clipe de 3 s do Kling O3 com o dissolve e a margem. */
export function adsV2InHandCutFits(cut: number): boolean {
  return ADS_V2_IN_HAND_CUT_START + cut + ADS_V2_FADE_SECONDS <= ADS_V2_MIN_GEN_SECONDS - ADS_V2_CUT_MARGIN + 1e-9 && ADS_V2_ENGINES.kling_o3.genSeconds === ADS_V2_MIN_GEN_SECONDS
}
