// KINEO-ADS-QUALIDADE-2110 — a FOTO DE ESTILO DE VIDA (teste real 21/10: relógio no pulso, na praia). Quando a mão/o braço/a pessoa domina
// KINEO-ADS-QUALIDADE-2110 — a foto e o produto é pequeno, o close e a trava copiam a mão e o fundo, não o produto. O /plan faz UMA chamada
// KINEO-ADS-QUALIDADE-2110 — barata de visão (o modelo do registro central, lib/aiModels.ts AI_TEXT_MODELS.vision, imagem
// KINEO-ADS-QUALIDADE-2110 — 'low' ≈ US$ 0,0003) na foto INTEIRA do produto e devolve um aviso suave (product_photo_lifestyle) com
// KINEO-ADS-QUALIDADE-2110 — "Trocar a foto" / "Continuar assim". Erro, prazo (6 s), sem chave ou resposta ilegível = null = segue sem aviso.
// KINEO-ADS-QUALIDADE-2110 — Nunca lança, nunca cobra o cliente, nunca recusa o pedido com a trava desligada.
//
// Parte pura (pergunta, corpo, leitura, regra, textos) + a chamada (adsV2LifestylePhoto). Só importa o registro de modelos (sem import).
import { AI_TEXT_MODELS } from '@/lib/aiModels'

/** Interruptor: true = o /plan RECUSA a foto de estilo de vida sem body.lifestyle_photo_ok; false = só avisa (resposta + evento). */
export const ADS_V2_LIFESTYLE_CONFIRM_REQUIRED: boolean = false
/** Prazo da chamada de visão (o /plan nunca espera mais que isto por ela). */
export const ADS_V2_LIFESTYLE_TIMEOUT_MS = 6_000
/** Abaixo desta fração da imagem, com mão/corpo na foto, o produto é pequeno demais para o close. */
export const ADS_V2_LIFESTYLE_MIN_PRODUCT_FRACTION = 0.12

export const ADS_V2_LIFESTYLE_QUESTION =
  'This photo was uploaded as the PRODUCT photo for a video ad. Look at it and answer ONLY with JSON: ' +
  '{"person_or_body_part_dominant":"yes|no|unsure","person_or_body_part_visible":"yes|no","product_area_fraction":0.0,"product_alone":"yes|no"}. ' +
  'person_or_body_part_dominant = a person, face, hand, wrist, arm, leg or body takes more of the picture than the product. ' +
  'person_or_body_part_visible = any hand, wrist, arm, face or body part is visible at all. ' +
  'product_area_fraction = the fraction (0 to 1) of the whole image covered by the product itself. ' +
  'product_alone = the product is shown by itself (no hand or person), e.g. on a plain or studio background.'

/** O corpo do pedido (puro: modelo do registro, imagem 'low', resposta em JSON). */
export function adsV2LifestyleBody(photoUrl: string): Record<string, unknown> {
  return {
    model: AI_TEXT_MODELS.vision,
    temperature: 0,
    max_tokens: 60,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: [{ type: 'text', text: ADS_V2_LIFESTYLE_QUESTION }, { type: 'image_url', image_url: { url: photoUrl, detail: 'low' } }] }],
  }
}

export interface AdsV2LifestyleVerdict {
  dominant: 'yes' | 'no' | 'unsure'
  bodyVisible: boolean
  fraction: number | null
  alone: boolean | null
}

const yn = (v: unknown): 'yes' | 'no' | 'unsure' | null => {
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'yes' || s === 'true' ? 'yes' : s === 'no' || s === 'false' ? 'no' : s === 'unsure' ? 'unsure' : null
}

/** A resposta do modelo lida (pura). null = ilegível (nunca acusa sem ler). */
export function adsV2ParseLifestyle(content: unknown): AdsV2LifestyleVerdict | null {
  let j: Record<string, unknown> | null = null
  try {
    const raw = typeof content === 'string' ? JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')) : content
    j = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  } catch {
    return null
  }
  if (!j) return null
  const dominant = yn(j.person_or_body_part_dominant)
  if (!dominant) return null
  const f = Number(j.product_area_fraction)
  const alone = yn(j.product_alone)
  return {
    dominant,
    bodyVisible: dominant === 'yes' || yn(j.person_or_body_part_visible) === 'yes',
    fraction: Number.isFinite(f) && f >= 0 && f <= 1 ? f : null,
    alone: alone === 'yes' ? true : alone === 'no' ? false : null,
  }
}

/** A regra (pura): corpo/pessoa domina, OU o produto ocupa menos de 12% com mão/corpo na foto. */
export function adsV2IsLifestyle(v: AdsV2LifestyleVerdict | null | undefined): boolean {
  if (!v) return false
  if (v.dominant === 'yes') return true
  return v.bodyVisible && v.fraction !== null && v.fraction < ADS_V2_LIFESTYLE_MIN_PRODUCT_FRACTION
}

export interface AdsV2LifestyleText { title: string; body: string; confirm: string; replace: string }
/** Os textos do aviso (a tela mostra o que o /plan devolve, na língua do pedido). */
export const ADS_V2_LIFESTYLE_TEXT: Readonly<Record<'en' | 'pt' | 'es', AdsV2LifestyleText>> = {
  en: { title: 'This looks like a lifestyle photo', body: 'For the best ad, use a photo of the product alone (no hand or person), on a plain background.', confirm: 'Continue anyway', replace: 'Replace photo' },
  pt: { title: 'Esta parece uma foto de estilo de vida', body: 'Para o melhor anúncio, use uma foto só do produto (sem mão nem pessoa), com fundo liso.', confirm: 'Continuar assim mesmo', replace: 'Trocar a foto' },
  es: { title: 'Esta parece una foto de estilo de vida', body: 'Para el mejor anuncio, usa una foto solo del producto (sin mano ni persona), con fondo liso.', confirm: 'Continuar de todos modos', replace: 'Cambiar la foto' },
}
/** O aviso na língua (desconhecida = inglês). Pura. */
export function adsV2LifestylePhotoText(lang: unknown): AdsV2LifestyleText {
  const k = String(lang ?? '').toLowerCase().slice(0, 2)
  return (ADS_V2_LIFESTYLE_TEXT as Record<string, AdsV2LifestyleText>)[k] ?? ADS_V2_LIFESTYLE_TEXT.en
}

/** A foto do produto é de estilo de vida? true/false; null = não deu para conferir (sem chave, erro, 6 s, ilegível). Nunca lança. */
export async function adsV2LifestylePhoto(photoUrl: unknown, doFetch: typeof fetch = fetch, timeoutMs: number = ADS_V2_LIFESTYLE_TIMEOUT_MS): Promise<boolean | null> {
  const key = process.env.OPENAI_API_KEY
  const u = typeof photoUrl === 'string' ? photoUrl.trim() : ''
  if (!key || !/^https:\/\/\S+$/i.test(u)) return null
  try {
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(adsV2LifestyleBody(u)),
      ...(typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    })
    if (!res.ok) return null
    const j = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
    const v = adsV2ParseLifestyle(j?.choices?.[0]?.message?.content ?? null)
    return v ? adsV2IsLifestyle(v) : null
  } catch {
    return null
  }
}
