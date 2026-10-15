// KINEO-ADS-FIEL-2-1510 — a CONFERÊNCIA barata da cena travada (Studio Ads v2): a cena de gente nasce sem produto (lib/ads/v2ShotLists.ts
// adsV2LockedScenePrompt); antes de colar o recorte REAL, um modelo de visão do registro central (lib/aiModels.ts, AI_TEXT_MODELS.vision —
// nunca string crua de modelo: scripts/test-modelos-openai-inventario-1410.mjs) olha a cena em baixa resolução e diz se ainda há um
// produto desenhado (garrafa, caixa, embalagem). Sim = o motor de avanço refaz a cena UMA vez e, de novo, usa a foto real do produto.
// Carregado só por import DINÂMICO (lib/ads/v2Advance.ts), só na cena com a trava. Custo: uma imagem 'low' (~US$ 0,0003). Sem chave,
// erro, prazo ou resposta ilegível = null (a cena segue: o pedido já proíbe o produto) — nunca lança, nunca cobra o cliente.
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { ADS_V2_LOCK_DUP_QUESTION, adsV2ParseDupVerdict } from '@/lib/ads/v2ShotLists'

/** Prazo da conferência (a cena já está pronta; isto não pode segurar o anúncio). */
export const ADS_V2_LOCK_VISION_TIMEOUT_MS = 12_000

/** O corpo do pedido (puro: o guardião confere modelo do registro, detalhe 'low' e resposta em JSON). */
export function adsV2LockVisionBody(sceneUrl: string): Record<string, unknown> {
  return {
    model: AI_TEXT_MODELS.vision,
    temperature: 0,
    max_tokens: 20,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: [{ type: 'text', text: ADS_V2_LOCK_DUP_QUESTION }, { type: 'image_url', image_url: { url: sceneUrl, detail: 'low' } }] }],
  }
}

/** A cena ainda tem um produto desenhado? true/false; null = não deu para conferir. Nunca lança. */
export async function adsV2SceneHasProduct(sceneUrl: string, doFetch: typeof fetch = fetch): Promise<boolean | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key || typeof sceneUrl !== 'string' || !/^https:\/\/\S+$/i.test(sceneUrl.trim())) return null
  try {
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(adsV2LockVisionBody(sceneUrl.trim())),
      signal: AbortSignal.timeout(ADS_V2_LOCK_VISION_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const j = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
    return adsV2ParseDupVerdict(j?.choices?.[0]?.message?.content ?? null)
  } catch {
    return null
  }
}
// KINEO-ADS-FIEL-3-1510 — ONDE pousar o produto (validação paga 15/10: a caixa fixa tapava rostos e boiava no 1:1). A MESMA visão barata lê
// KINEO-ADS-FIEL-3-1510 — a superfície vazia e os rostos da cena (frações, ADS_V2_LOCK_LAYOUT_QUESTION); quem decide o lugar e o tamanho é a
// KINEO-ADS-FIEL-3-1510 — regra pura adsV2LockPlacement (lib/ads/v2ShotLists.ts). Sem chave, erro, prazo ou resposta ilegível = null = a regra
// KINEO-ADS-FIEL-3-1510 — fixa (terço de baixo, num dos lados). Nunca lança, nunca cobra o cliente. Custo: mais uma imagem 'low' (~US$ 0,0003).
import { ADS_V2_LOCK_LAYOUT_QUESTION, adsV2ParseSceneLayout, type AdsV2SceneLayout } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-3-1510

/** KINEO-ADS-FIEL-3-1510 — o corpo do pedido da leitura da cena (puro: o guardião confere modelo do registro, 'low' e JSON). */
export function adsV2LockLayoutBody(sceneUrl: string): Record<string, unknown> { // KINEO-ADS-FIEL-3-1510
  return { // KINEO-ADS-FIEL-3-1510
    model: AI_TEXT_MODELS.vision, // KINEO-ADS-FIEL-3-1510
    temperature: 0, // KINEO-ADS-FIEL-3-1510
    max_tokens: 220, // KINEO-ADS-FIEL-3-1510
    response_format: { type: 'json_object' }, // KINEO-ADS-FIEL-3-1510
    messages: [{ role: 'user', content: [{ type: 'text', text: ADS_V2_LOCK_LAYOUT_QUESTION }, { type: 'image_url', image_url: { url: sceneUrl, detail: 'low' } }] }], // KINEO-ADS-FIEL-3-1510
  } // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510

/** KINEO-ADS-FIEL-3-1510 — a superfície vazia e os rostos da cena; null = não deu para ler (a regra fixa decide). Nunca lança. */
export async function adsV2SceneLayout(sceneUrl: string, doFetch: typeof fetch = fetch): Promise<AdsV2SceneLayout | null> { // KINEO-ADS-FIEL-3-1510
  const key = process.env.OPENAI_API_KEY // KINEO-ADS-FIEL-3-1510
  if (!key || typeof sceneUrl !== 'string' || !/^https:\/\/\S+$/i.test(sceneUrl.trim())) return null // KINEO-ADS-FIEL-3-1510
  try { // KINEO-ADS-FIEL-3-1510
    const res = await doFetch('https://api.openai.com/v1/chat/completions', { // KINEO-ADS-FIEL-3-1510
      method: 'POST', // KINEO-ADS-FIEL-3-1510
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, // KINEO-ADS-FIEL-3-1510
      body: JSON.stringify(adsV2LockLayoutBody(sceneUrl.trim())), // KINEO-ADS-FIEL-3-1510
      signal: AbortSignal.timeout(ADS_V2_LOCK_VISION_TIMEOUT_MS), // KINEO-ADS-FIEL-3-1510
    }) // KINEO-ADS-FIEL-3-1510
    if (!res.ok) return null // KINEO-ADS-FIEL-3-1510
    const j = (await res.json()) as { choices?: { message?: { content?: unknown } }[] } // KINEO-ADS-FIEL-3-1510
    return adsV2ParseSceneLayout(j?.choices?.[0]?.message?.content ?? null) // KINEO-ADS-FIEL-3-1510
  } catch { // KINEO-ADS-FIEL-3-1510
    return null // KINEO-ADS-FIEL-3-1510
  } // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510
// KINEO-ADS-FIEL-4-1510 — a CONFERÊNCIA do canto reservado (reteste 15/10: em 'low' a visão devolvia caixas de palpite — rostos 0,40–0,60
// KINEO-ADS-FIEL-4-1510 — repetidos em toda cena — e o produto cobriu um rosto). Agora a posição do produto é decidida em código
// KINEO-ADS-FIEL-4-1510 — (adsV2LockReservedRect); a visão, em 'high', só CONFERE: rostos medidos, gente no canto, superfície no canto. Sem chave,
// KINEO-ADS-FIEL-4-1510 — erro, prazo ou resposta ilegível = null ("não sei": o canto fica). Nunca lança, nunca cobra o cliente. Custo: uma
// KINEO-ADS-FIEL-4-1510 — imagem 'high' do modelo de visão do registro central (~US$ 0,005 por cena).
import { adsV2LockCheckQuestion, adsV2ParseLockCheck, type AdsV2Format, type AdsV2LockCheck, type AdsV2LockSide } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-4-1510
/** KINEO-ADS-FIEL-4-1510 — prazo da conferência em 'high' (imagem maior que a 'low'). */
export const ADS_V2_LOCK_CHECK_TIMEOUT_MS = 20_000 // KINEO-ADS-FIEL-4-1510
/** KINEO-ADS-FIEL-4-1510 — o corpo da conferência (puro: o guardião confere modelo do registro, detalhe 'high', JSON e a pergunta do canto). */
export function adsV2LockCheckBody(sceneUrl: string, format: AdsV2Format, side: AdsV2LockSide): Record<string, unknown> { // KINEO-ADS-FIEL-4-1510
  return { // KINEO-ADS-FIEL-4-1510
    model: AI_TEXT_MODELS.vision, // KINEO-ADS-FIEL-4-1510
    temperature: 0, // KINEO-ADS-FIEL-4-1510
    max_tokens: 300, // KINEO-ADS-FIEL-4-1510
    response_format: { type: 'json_object' }, // KINEO-ADS-FIEL-4-1510
    messages: [{ role: 'user', content: [{ type: 'text', text: adsV2LockCheckQuestion(format, side) }, { type: 'image_url', image_url: { url: sceneUrl, detail: 'high' } }] }], // KINEO-ADS-FIEL-4-1510
  } // KINEO-ADS-FIEL-4-1510
} // KINEO-ADS-FIEL-4-1510
/** KINEO-ADS-FIEL-4-1510 — a conferência do canto reservado; null = não deu para conferir (o canto fica). Nunca lança. */
export async function adsV2SceneCheck(sceneUrl: string, format: AdsV2Format, side: AdsV2LockSide, doFetch: typeof fetch = fetch): Promise<AdsV2LockCheck | null> { // KINEO-ADS-FIEL-4-1510
  const key = process.env.OPENAI_API_KEY // KINEO-ADS-FIEL-4-1510
  if (!key || typeof sceneUrl !== 'string' || !/^https:\/\/\S+$/i.test(sceneUrl.trim())) return null // KINEO-ADS-FIEL-4-1510
  try { // KINEO-ADS-FIEL-4-1510
    const res = await doFetch('https://api.openai.com/v1/chat/completions', { // KINEO-ADS-FIEL-4-1510
      method: 'POST', // KINEO-ADS-FIEL-4-1510
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, // KINEO-ADS-FIEL-4-1510
      body: JSON.stringify(adsV2LockCheckBody(sceneUrl.trim(), format, side)), // KINEO-ADS-FIEL-4-1510
      signal: AbortSignal.timeout(ADS_V2_LOCK_CHECK_TIMEOUT_MS), // KINEO-ADS-FIEL-4-1510
    }) // KINEO-ADS-FIEL-4-1510
    if (!res.ok) return null // KINEO-ADS-FIEL-4-1510
    const j = (await res.json()) as { choices?: { message?: { content?: unknown } }[] } // KINEO-ADS-FIEL-4-1510
    return adsV2ParseLockCheck(j?.choices?.[0]?.message?.content ?? null) // KINEO-ADS-FIEL-4-1510
  } catch { // KINEO-ADS-FIEL-4-1510
    return null // KINEO-ADS-FIEL-4-1510
  } // KINEO-ADS-FIEL-4-1510
} // KINEO-ADS-FIEL-4-1510
