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
import { adsV2LockCheckQuestionTop, adsV2ParseLockCheckTop, type AdsV2LockCheckTop } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-5-1510 — a conferência também lê a borda de cima do tampo no canto
import { adsV2ParseLockCheck6, type AdsV2LockCheck6 } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-6-1610 — + as caixas de corpo (a corroboração geométrica de "gente no canto")
/** KINEO-ADS-FIEL-4-1510 — prazo da conferência em 'high' (imagem maior que a 'low'). */
export const ADS_V2_LOCK_CHECK_TIMEOUT_MS = 20_000 // KINEO-ADS-FIEL-4-1510
/** KINEO-ADS-FIEL-4-1510 — o corpo da conferência (puro: o guardião confere modelo do registro, detalhe 'high', JSON e a pergunta do canto). */
export function adsV2LockCheckBody(sceneUrl: string, format: AdsV2Format, side: AdsV2LockSide): Record<string, unknown> { // KINEO-ADS-FIEL-4-1510
  return { // KINEO-ADS-FIEL-4-1510
    model: AI_TEXT_MODELS.vision, // KINEO-ADS-FIEL-4-1510
    temperature: 0, // KINEO-ADS-FIEL-4-1510
    max_tokens: 300, // KINEO-ADS-FIEL-4-1510
    response_format: { type: 'json_object' }, // KINEO-ADS-FIEL-4-1510
    messages: [{ role: 'user', content: [{ type: 'text', text: adsV2LockCheckQuestionTop(format, side) }, { type: 'image_url', image_url: { url: sceneUrl, detail: 'high' } }] }], // KINEO-ADS-FIEL-5-1510 — + a borda de cima do tampo (top_edge_y, 3 casas)
  } // KINEO-ADS-FIEL-4-1510
} // KINEO-ADS-FIEL-4-1510
/** KINEO-ADS-FIEL-4-1510 — a conferência do canto reservado; null = não deu para conferir (o canto fica). Nunca lança. */
export async function adsV2SceneCheck(sceneUrl: string, format: AdsV2Format, side: AdsV2LockSide, doFetch: typeof fetch = fetch): Promise<AdsV2LockCheck6 | null> { // KINEO-ADS-FIEL-5-1510 — + top_edge_y · KINEO-ADS-FIEL-6-1610 — + people
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
    return adsV2ParseLockCheck6(j?.choices?.[0]?.message?.content ?? null) // KINEO-ADS-FIEL-5-1510 · KINEO-ADS-FIEL-6-1610 — a leitura da Fiel 5 + people
  } catch { // KINEO-ADS-FIEL-4-1510
    return null // KINEO-ADS-FIEL-4-1510
  } // KINEO-ADS-FIEL-4-1510
} // KINEO-ADS-FIEL-4-1510
// KINEO-ADS-PRODUTO-NA-MAO-1610 — o JUIZ DO RÓTULO do plano "pessoa segurando o produto real": a MESMA chamada de visão (modelo do registro
// KINEO-ADS-PRODUTO-NA-MAO-1610 — central, JSON, prazo curto) com DUAS imagens em 'high' — a foto REAL do produto (1ª) e o still gerado (2ª) —
// KINEO-ADS-PRODUTO-NA-MAO-1610 — e a pergunta pura ADS_V2_IN_HAND_JUDGE_QUESTION (lib/ads/v2ProductInHand.ts): nome/logo, cores, forma, mãos,
// KINEO-ADS-PRODUTO-NA-MAO-1610 — um produto só. Sem chave, erro, prazo ou resposta ilegível = null (a foto segue). Nunca lança. ~US$ 0,01.
// KINEO-ADS-MAO-AJUSTE-1610 — a pergunta ficou mais rígida (cor do corpo e do líquido, MATERIAL, QUANTIDADE): no T1 o juiz aprovou um frasco preto
// KINEO-ADS-MAO-AJUSTE-1610 — inventado. Divergiu → refaz 1 vez → enquadramento sem o rótulo de frente → foto real (o fluxo de sempre).
import { ADS_V2_IN_HAND_JUDGE_QUESTION, adsV2ParseInHandVerdict, type AdsV2InHandVerdict } from '@/lib/ads/v2ProductInHand' // KINEO-ADS-PRODUTO-NA-MAO-1610
// KINEO-ADS-MAO-AJUSTE-3-1610 — o juiz pergunta também por PESSOA EXTRA (o homem na cama ao fundo, o olho na borda) e, na foto com frasco + caixa, pelo OBJETO ÚNICO
// KINEO-ADS-MAO-AJUSTE-3-1610 — do plano (os dois juntos = reprova). E a mesma visão barata diz, no /plan, se a foto do produto tem o frasco E a caixa.
import { ADS_V2_IN_HAND_PAIR_QUESTION, adsV2InHandJudgeKeys, adsV2InHandJudgeQuestion, adsV2ParseInHandPair, type AdsV2InHandObject } from '@/lib/ads/v2ProductInHand' // KINEO-ADS-MAO-AJUSTE-3-1610
import { ADS_V2_IN_HAND_INVENTORY_QUESTION, adsV2InHandFidelityQuestion, adsV2InHandInventoryRule, adsV2InHandTwoStageVerdict, adsV2ParseInHandFidelity, adsV2ParseInHandInventory, type AdsV2InHandBox2d, type AdsV2InHandInventory } from '@/lib/ads/v2ProductInHand' // KINEO-ADS-MAO-JUIZ-1610 — o juiz em 2 etapas
// KINEO-ADS-MAO-JUIZ-1610 — a pessoa extra e o objeto único viraram chaves de DEFEITO ("extra_person", "both_objects": true = o defeito aparece = reprova): a pergunta de
// KINEO-ADS-MAO-JUIZ-1610 — "só/apenas" deu false nas 12 fotos do T1 a6144352. A chamada é a mesma; a pergunta, as chaves e a leitura vêm da lib (adsV2InHandJudgeKeys).
/** KINEO-ADS-PRODUTO-NA-MAO-1610 — o corpo do juiz (puro: o guardião confere modelo do registro, 'high', JSON e a ordem das imagens). */
export function adsV2InHandLabelBody(productUrl: string, sceneUrl: string, object: AdsV2InHandObject | null = null): Record<string, unknown> { // KINEO-ADS-PRODUTO-NA-MAO-1610 · KINEO-ADS-MAO-AJUSTE-3-1610 — + object
  return { // KINEO-ADS-PRODUTO-NA-MAO-1610
    model: AI_TEXT_MODELS.vision, // KINEO-ADS-PRODUTO-NA-MAO-1610
    temperature: 0, // KINEO-ADS-PRODUTO-NA-MAO-1610
    max_tokens: 200, // KINEO-ADS-PRODUTO-NA-MAO-1610 · KINEO-ADS-MAO-AJUSTE-1610 — 7 chaves (+ material, count): era 80 · KINEO-ADS-MAO-AJUSTE-3-1610 — até 9 chaves (+ people, only_object): era 140
    response_format: { type: 'json_object' }, // KINEO-ADS-PRODUTO-NA-MAO-1610
    messages: [{ role: 'user', content: [{ type: 'text', text: adsV2InHandJudgeQuestion(object) }, { type: 'image_url', image_url: { url: productUrl, detail: 'high' } }, { type: 'image_url', image_url: { url: sceneUrl, detail: 'high' } }] }], // KINEO-ADS-PRODUTO-NA-MAO-1610 — 1ª = a foto real · KINEO-ADS-MAO-AJUSTE-3-1610 — a pergunta com pessoa extra e objeto único
  } // KINEO-ADS-PRODUTO-NA-MAO-1610
} // KINEO-ADS-PRODUTO-NA-MAO-1610
/** KINEO-ADS-PRODUTO-NA-MAO-1610 — o produto do still bate com a foto real? null = não deu para conferir. Nunca lança. */
/** KINEO-ADS-MAO-JUIZ-1610 — o modelo do juiz do produto na mão: constante PRÓPRIA (padrão = o de visão do registro; o coordenador troca depois da calibração). */
export const ADS_V2_IN_HAND_JUDGE_MODEL: string = AI_TEXT_MODELS.vision // KINEO-ADS-MAO-JUIZ-1610
/** KINEO-ADS-MAO-JUIZ-1610 — os recortes da fidelidade (servidor: lib/ads/v2ProductInHandCrop.ts): o produto real só com o objeto do plano e o produto da foto gerada. null = sem recorte (as fotos inteiras). */
export type AdsV2InHandCropFn = (a: { sceneUrl: string; objectBox: AdsV2InHandBox2d | null; object: AdsV2InHandObject | null; whole?: boolean }) => Promise<{ reference: string; generated: string } | null> // KINEO-ADS-MAO-JUIZ-1610 · KINEO-JUIZ-GRADE-1610 — + whole (variante B: o recorte BiRefNet da foto gerada inteira, sem a caixa do modelo)
/** KINEO-ADS-MAO-JUIZ-1610 — a resposta crua das 2 etapas (a calibração mostra; o avanço não usa). */
export interface AdsV2InHandJudgeRaw { inventory: unknown; fidelity: unknown; crop: boolean; variant?: AdsV2InHandJudgeVariant } // KINEO-ADS-MAO-JUIZ-1610 · KINEO-JUIZ-GRADE-1610 — + variant (só na B)
// KINEO-JUIZ-GRADE-1610 — o MODELO e a VARIANTE do juiz são escolha SÓ da calibração (POST /api/admin/ads-judge-calibrate). Sem `judge` (o avanço, lib/ads/v2Advance.ts)
// KINEO-JUIZ-GRADE-1610 — = ADS_V2_IN_HAND_JUDGE_MODEL e a variante A, os MESMOS corpos de sempre. A troca de produção é outra tarefa, depois da calibração.
import { ADS_V2_IN_HAND_INVENTORY_QUESTION_B, adsV2InHandFidelityQuestionB, adsV2InHandTwoStageVerdictB, adsV2ParseInHandInventoryB, type AdsV2InHandJudgeVariant } from '@/lib/ads/v2ProductInHand' // KINEO-JUIZ-GRADE-1610
/** KINEO-JUIZ-GRADE-1610 — o modelo e a variante de uma chamada do juiz (a calibração passa; o avanço não). */
export interface AdsV2InHandJudgeOpts { model?: string; variant?: AdsV2InHandJudgeVariant } // KINEO-JUIZ-GRADE-1610
/** KINEO-JUIZ-GRADE-1610 — sem opção = o modelo do juiz e a variante A. Pura. */
export function adsV2InHandJudgeOf(judge?: AdsV2InHandJudgeOpts | null): { model: string; variant: AdsV2InHandJudgeVariant } { // KINEO-JUIZ-GRADE-1610
  return { model: typeof judge?.model === 'string' && judge.model ? judge.model : ADS_V2_IN_HAND_JUDGE_MODEL, variant: judge?.variant === 'B' ? 'B' : 'A' } // KINEO-JUIZ-GRADE-1610
} // KINEO-JUIZ-GRADE-1610
/** KINEO-ADS-MAO-JUIZ-1610 — o corpo do inventário (puro): 1 imagem 'high' ANTES do texto, temperatura 0, JSON, o modelo do juiz. */
export function adsV2InHandInventoryBody(sceneUrl: string): Record<string, unknown> { // KINEO-ADS-MAO-JUIZ-1610
  return { model: ADS_V2_IN_HAND_JUDGE_MODEL, temperature: 0, max_tokens: 700, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: sceneUrl, detail: 'high' } }, { type: 'text', text: ADS_V2_IN_HAND_INVENTORY_QUESTION }] }] } // KINEO-ADS-MAO-JUIZ-1610
} // KINEO-ADS-MAO-JUIZ-1610
/** KINEO-ADS-MAO-JUIZ-1610 — o corpo da fidelidade (puro): "Image 1 (REFERENCE)" e "Image 2 (GENERATED)" rotuladas, as 2 em 'high', depois a pergunta. */
export function adsV2InHandFidelityBody(referenceUrl: string, generatedUrl: string, object: AdsV2InHandObject | null, crop: boolean): Record<string, unknown> { // KINEO-ADS-MAO-JUIZ-1610
  return { model: ADS_V2_IN_HAND_JUDGE_MODEL, temperature: 0, max_tokens: 150, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: 'Image 1 (REFERENCE):' }, { type: 'image_url', image_url: { url: referenceUrl, detail: 'high' } }, { type: 'text', text: 'Image 2 (GENERATED):' }, { type: 'image_url', image_url: { url: generatedUrl, detail: 'high' } }, { type: 'text', text: adsV2InHandFidelityQuestion(object, crop) }] }] } // KINEO-ADS-MAO-JUIZ-1610
} // KINEO-ADS-MAO-JUIZ-1610
/** KINEO-JUIZ-GRADE-1610 — o corpo do inventário com o modelo e a variante da calibração (puro). Sem `judge` = EXATAMENTE adsV2InHandInventoryBody. B = a pergunta sem box_2d. */
export function adsV2InHandInventoryBodyFor(sceneUrl: string, judge?: AdsV2InHandJudgeOpts | null): Record<string, unknown> { // KINEO-JUIZ-GRADE-1610
  const j = adsV2InHandJudgeOf(judge) // KINEO-JUIZ-GRADE-1610
  const b = adsV2InHandInventoryBody(sceneUrl) // KINEO-JUIZ-GRADE-1610
  if (j.variant === 'A') return { ...b, model: j.model } // KINEO-JUIZ-GRADE-1610
  return { ...b, model: j.model, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: sceneUrl, detail: 'high' } }, { type: 'text', text: ADS_V2_IN_HAND_INVENTORY_QUESTION_B }] }] } // KINEO-JUIZ-GRADE-1610
} // KINEO-JUIZ-GRADE-1610
/** KINEO-JUIZ-GRADE-1610 — o corpo da fidelidade com o modelo e a variante da calibração (puro). Sem `judge` = EXATAMENTE adsV2InHandFidelityBody. B = a pergunta B no fim. */
export function adsV2InHandFidelityBodyFor(referenceUrl: string, generatedUrl: string, object: AdsV2InHandObject | null, crop: boolean, judge?: AdsV2InHandJudgeOpts | null): Record<string, unknown> { // KINEO-JUIZ-GRADE-1610
  const j = adsV2InHandJudgeOf(judge) // KINEO-JUIZ-GRADE-1610
  const b = adsV2InHandFidelityBody(referenceUrl, generatedUrl, object, crop) // KINEO-JUIZ-GRADE-1610
  if (j.variant === 'A') return { ...b, model: j.model } // KINEO-JUIZ-GRADE-1610
  const content = (b.messages as { content: unknown[] }[])[0].content.slice(0, -1).concat({ type: 'text', text: adsV2InHandFidelityQuestionB(object, crop) }) // KINEO-JUIZ-GRADE-1610
  return { ...b, model: j.model, messages: [{ role: 'user', content }] } // KINEO-JUIZ-GRADE-1610
} // KINEO-JUIZ-GRADE-1610
async function inHandVision(doFetch: typeof fetch, key: string, body: Record<string, unknown>): Promise<unknown> { // KINEO-ADS-MAO-JUIZ-1610
  const res = await doFetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(ADS_V2_LOCK_CHECK_TIMEOUT_MS) }) // KINEO-ADS-MAO-JUIZ-1610
  if (!res.ok) return null // KINEO-ADS-MAO-JUIZ-1610
  const j = (await res.json()) as { choices?: { message?: { content?: unknown } }[] } // KINEO-ADS-MAO-JUIZ-1610
  return j?.choices?.[0]?.message?.content ?? null // KINEO-ADS-MAO-JUIZ-1610
} // KINEO-ADS-MAO-JUIZ-1610
/** KINEO-ADS-MAO-JUIZ-1610 — só o inventário de uma foto (a da referência do produto: onde está o frasco e onde está a caixa, para o recorte). null = sem chave/ilegível. Nunca lança. */
export async function adsV2InHandInventoryOf(imageUrl: string, doFetch: typeof fetch = fetch): Promise<AdsV2InHandInventory | null> { // KINEO-ADS-MAO-JUIZ-1610
  const key = process.env.OPENAI_API_KEY // KINEO-ADS-MAO-JUIZ-1610
  if (!key || typeof imageUrl !== 'string' || !(/^https:\/\/\S+$/i.test(imageUrl.trim()) || /^data:image\/(?:jpeg|jpg|png|webp);base64,/.test(imageUrl.trim()))) return null // KINEO-ADS-MAO-JUIZ-1610
  try { return adsV2ParseInHandInventory(await inHandVision(doFetch, key, adsV2InHandInventoryBody(imageUrl.trim()))) } catch { return null } // KINEO-ADS-MAO-JUIZ-1610
} // KINEO-ADS-MAO-JUIZ-1610
/**
 * KINEO-ADS-PRODUTO-NA-MAO-1610 — o produto do still bate com a foto real? null = não deu para conferir. Nunca lança.
 * KINEO-ADS-MAO-JUIZ-1610 — EM 2 ETAPAS: (i) o INVENTÁRIO da foto gerada (o que se vê, com caixas; o código aplica a regra do plano) e (ii) a FIDELIDADE com o
 * KINEO-ADS-MAO-JUIZ-1610 — recorte do produto real ao lado do recorte do produto gerado (crop; sem recorte = as fotos inteiras), atributo por atributo.
 * KINEO-ADS-MAO-JUIZ-1610 — "unsure" só registra. Inventário ilegível = null (a foto segue). A calibração (POST /api/admin/ads-judge-calibrate) chama ESTA
 * KINEO-ADS-MAO-JUIZ-1610 — MESMA função com sink (a resposta crua) e o mesmo crop do avanço.
 */
export async function adsV2InHandLabelJudge(productUrl: string, sceneUrl: string, doFetch: typeof fetch = fetch, object: AdsV2InHandObject | null = null, sink?: (raw: AdsV2InHandJudgeRaw) => void, crop?: AdsV2InHandCropFn, judge?: AdsV2InHandJudgeOpts): Promise<AdsV2InHandVerdict | null> { // KINEO-ADS-MAO-JUIZ-1610 — 2 etapas + sink + crop · KINEO-JUIZ-GRADE-1610 — + judge (modelo e variante: só a calibração passa)
  const key = process.env.OPENAI_API_KEY // KINEO-ADS-PRODUTO-NA-MAO-1610
  const ok = (u: unknown): u is string => typeof u === 'string' && (/^https:\/\/\S+$/i.test(u.trim()) || /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u.trim())) // KINEO-ADS-PRODUTO-NA-MAO-1610 · KINEO-ADS-MAO-JUIZ-1610 — + data:image (a calibração com as fotos salvas; o avanço só passa https)
  if (!key || !ok(productUrl) || !ok(sceneUrl)) return null // KINEO-ADS-PRODUTO-NA-MAO-1610
  const tell = (raw: AdsV2InHandJudgeRaw) => { if (sink) { try { sink(raw) } catch { /* a calibração nunca derruba o juiz */ } } } // KINEO-ADS-MAO-JUIZ-1610
  const jv = adsV2InHandJudgeOf(judge) // KINEO-JUIZ-GRADE-1610
  const vB = jv.variant === 'B' ? { variant: 'B' as const } : {} // KINEO-JUIZ-GRADE-1610 — a resposta crua da A fica como era
  try { // KINEO-ADS-MAO-JUIZ-1610
    const invRaw = await inHandVision(doFetch, key, adsV2InHandInventoryBodyFor(sceneUrl.trim(), judge)) // KINEO-ADS-MAO-JUIZ-1610 — (i) inventário · KINEO-JUIZ-GRADE-1610 — o corpo com o modelo/variante (sem judge = o de sempre)
    const inv = jv.variant === 'B' ? adsV2ParseInHandInventoryB(invRaw) : adsV2ParseInHandInventory(invRaw) // KINEO-ADS-MAO-JUIZ-1610 · KINEO-JUIZ-GRADE-1610 — B = presença e contagem
    if (!inv) { tell({ inventory: invRaw, fidelity: null, crop: false, ...vB }); return null } // KINEO-ADS-MAO-JUIZ-1610 · KINEO-JUIZ-GRADE-1610 — + variant na B
    const rule = adsV2InHandInventoryRule(inv, object) // KINEO-ADS-MAO-JUIZ-1610
    const crops = crop ? await crop({ sceneUrl: sceneUrl.trim(), objectBox: rule.objectBox, object, ...(jv.variant === 'B' ? { whole: true } : {}) }).catch(() => null) : null // KINEO-ADS-MAO-JUIZ-1610 · KINEO-JUIZ-GRADE-1610 — B = o recorte BiRefNet da foto gerada inteira
    const cropOk = !!crops && ok(crops.reference) && ok(crops.generated) // KINEO-ADS-MAO-JUIZ-1610
    const fidRaw = await inHandVision(doFetch, key, adsV2InHandFidelityBodyFor(cropOk ? crops!.reference : productUrl.trim(), cropOk ? crops!.generated : sceneUrl.trim(), object, cropOk, judge)).catch(() => null) // KINEO-ADS-MAO-JUIZ-1610 — (ii) fidelidade · KINEO-JUIZ-GRADE-1610 — o corpo com o modelo/variante
    tell({ inventory: invRaw, fidelity: fidRaw, crop: cropOk, ...vB }) // KINEO-ADS-MAO-JUIZ-1610 · KINEO-JUIZ-GRADE-1610 — + variant na B
    return (jv.variant === 'B' ? adsV2InHandTwoStageVerdictB : adsV2InHandTwoStageVerdict)(inv, adsV2ParseInHandFidelity(fidRaw), object, cropOk) // KINEO-ADS-MAO-JUIZ-1610 · KINEO-JUIZ-GRADE-1610 — B = a régua da fidelidade B
  } catch { // KINEO-ADS-MAO-JUIZ-1610
    return null // KINEO-ADS-MAO-JUIZ-1610
  } // KINEO-ADS-MAO-JUIZ-1610
} // KINEO-ADS-MAO-JUIZ-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — o corpo da pergunta do par (puro: modelo do registro, 1 imagem 'low', JSON). */
export function adsV2InHandPairBody(productUrl: string): Record<string, unknown> { // KINEO-ADS-MAO-AJUSTE-3-1610
  return { // KINEO-ADS-MAO-AJUSTE-3-1610
    model: AI_TEXT_MODELS.vision, // KINEO-ADS-MAO-AJUSTE-3-1610
    temperature: 0, // KINEO-ADS-MAO-AJUSTE-3-1610
    max_tokens: 30, // KINEO-ADS-MAO-AJUSTE-3-1610
    response_format: { type: 'json_object' }, // KINEO-ADS-MAO-AJUSTE-3-1610
    messages: [{ role: 'user', content: [{ type: 'text', text: ADS_V2_IN_HAND_PAIR_QUESTION }, { type: 'image_url', image_url: { url: productUrl, detail: 'low' } }] }], // KINEO-ADS-MAO-AJUSTE-3-1610
  } // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
/** KINEO-ADS-MAO-AJUSTE-3-1610 — a foto do produto tem o frasco E a caixa? true/false; null = não deu para ver (nada muda). Nunca lança. ~US$ 0,0003. */
export async function adsV2InHandPhotoPair(productUrl: string, doFetch: typeof fetch = fetch): Promise<boolean | null> { // KINEO-ADS-MAO-AJUSTE-3-1610
  const key = process.env.OPENAI_API_KEY // KINEO-ADS-MAO-AJUSTE-3-1610
  if (!key || typeof productUrl !== 'string' || !/^https:\/\/\S+$/i.test(productUrl.trim())) return null // KINEO-ADS-MAO-AJUSTE-3-1610
  try { // KINEO-ADS-MAO-AJUSTE-3-1610
    const res = await doFetch('https://api.openai.com/v1/chat/completions', { // KINEO-ADS-MAO-AJUSTE-3-1610
      method: 'POST', // KINEO-ADS-MAO-AJUSTE-3-1610
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, // KINEO-ADS-MAO-AJUSTE-3-1610
      body: JSON.stringify(adsV2InHandPairBody(productUrl.trim())), // KINEO-ADS-MAO-AJUSTE-3-1610
      signal: AbortSignal.timeout(ADS_V2_LOCK_VISION_TIMEOUT_MS), // KINEO-ADS-MAO-AJUSTE-3-1610 — o prazo da conferência 'low' (o /plan espera em paralelo com o texto)
    }) // KINEO-ADS-MAO-AJUSTE-3-1610
    if (!res.ok) return null // KINEO-ADS-MAO-AJUSTE-3-1610
    const j = (await res.json()) as { choices?: { message?: { content?: unknown } }[] } // KINEO-ADS-MAO-AJUSTE-3-1610
    return adsV2ParseInHandPair(j?.choices?.[0]?.message?.content ?? null) // KINEO-ADS-MAO-AJUSTE-3-1610
  } catch { // KINEO-ADS-MAO-AJUSTE-3-1610
    return null // KINEO-ADS-MAO-AJUSTE-3-1610
  } // KINEO-ADS-MAO-AJUSTE-3-1610
} // KINEO-ADS-MAO-AJUSTE-3-1610
