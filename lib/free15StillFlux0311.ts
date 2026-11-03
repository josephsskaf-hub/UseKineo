// [TRAVA 8.2 — fundador 03/11: "três sim" — refazer também a imagem da cena no 1º filme grátis]
// KINEO-GRATIS-REFAZ-IMAGEM-0311 — o still FLUX da cena refeita no portão do 1º filme grátis (lado do SERVIDOR; o portão não importa isto).
// O MESMO gerador do 1º quadro da cena clássica da rota (app/api/generate-video-cinematic → lib/hollywood/anchors generateCinematicSceneStill
// com styleSuffix '' — o estilo já está no prompt da cena —, a semente do filme e o aspecto): modelo fal-ai/flux/dev, texto de
// cinematicSceneStillPrompt, image_size do aspecto, ANCHOR_IMAGE_STEPS passos, enable_safety_checker. A diferença é só o tempo: a rota
// posta e espera na mesma chamada; o portão faz UMA ação de fornecedor por chamada (POST aqui, leitura na chamada seguinte).
// lib/hollywood/ é caminho protegido (TRAVA 8.2): nada lá muda — só é importado. Guardião: scripts/test-gratis-refaz-imagem-0311.mjs.
import { cinematicSceneStillPrompt, ANCHOR_IMAGE_STEPS } from '@/lib/hollywood/anchors'
import { aspectSpec } from '@/lib/aspect'
import { CLASSIC_I2V } from '@/lib/classicSceneRetry'
import type { CenaRefazivel } from '@/lib/freeRedo/core'
import { corrigirPrompt0311, TETO_PROMPT_CLIPE_0311, type RefazCena0311 } from '@/lib/free15RefazCena0311'
import { motivoRefazImagem0311 } from '@/lib/free15RefazImagem0311'

/** ESPELHO de ANCHOR_IMAGE_MODEL em lib/hollywood/anchors.ts (não exportado lá; o guardião compara os dois textos). */
export const FLUX_STILL_MODEL_0311 = 'fal-ai/flux/dev'

/**
 * A entrada do POST do still FLUX da cena — o MESMO corpo de generateAnchorImage (lib/hollywood/anchors) para o still por cena da
 * rota, com a correção positiva do relato na frente do prompt da cena (o prompt assinado do clipe i2v é o mesmo texto que nasceu o
 * still: classicScenePrompts[i]). null = não se aplica: cena que não é i2v clássica com still assinado, motivo sem imagem (parado)
 * ou prompt vazio.
 */
export function entradaDoStillFlux0311(scene: Pick<CenaRefazivel, 'model' | 'input'>, refaz: Pick<RefazCena0311, 'motivo' | 'epoca'>, aspect: unknown): Record<string, unknown> | null {
  if (!motivoRefazImagem0311(refaz.motivo) || !CLASSIC_I2V.has(scene.model)) return null
  const still = scene.input.image_url
  if (typeof still !== 'string' || !still.startsWith('https://')) return null
  const aspecto = typeof aspect === 'string' ? aspect : null
  const prompt = cinematicSceneStillPrompt({ scenePrompt: corrigirPrompt0311(scene.input.prompt, refaz, TETO_PROMPT_CLIPE_0311), styleSuffix: '', aspect: aspecto })
  if (prompt === null) return null
  const seed = scene.input.seed
  return {
    prompt,
    image_size: aspectSpec(aspecto).fluxImageSize,
    num_images: 1,
    num_inference_steps: ANCHOR_IMAGE_STEPS,
    enable_safety_checker: true,
    ...(typeof seed === 'number' && Number.isFinite(seed) ? { seed } : {}),
  }
}

/** O resultado do FLUX vira still? Só URL https e sem o filtro de segurança (o FLUX devolve imagem preta com has_nsfw_concepts). */
export function stillFluxPronto0311(result: unknown): { status: 'done'; url: string } | { status: 'failed' } {
  const r = (result && typeof result === 'object' ? result : {}) as { data?: unknown }
  const data = (r.data && typeof r.data === 'object' ? r.data : r) as { images?: Array<{ url?: unknown }>; has_nsfw_concepts?: unknown }
  const url = data.images?.[0]?.url
  if (Array.isArray(data.has_nsfw_concepts) && data.has_nsfw_concepts.some((x) => x === true)) return { status: 'failed' }
  return typeof url === 'string' && url.startsWith('https://') ? { status: 'done', url } : { status: 'failed' }
}
