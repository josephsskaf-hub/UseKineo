// KINEO-CARTOON-CONSISTENCIA-2210 — identidade vem das imagens canônicas, nunca de uma nova folha sorteada por episódio.
import { KIDS_CHARACTERS, kidsCharacter, type KidsCharacter, type KidsCharacterId } from './kidsCartoon'
import { normalizeAspect } from '@/lib/aspect'

export const CARTOON_EDIT_MODEL = 'fal-ai/nano-banana/edit'
export const CARTOON_VIDEO_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video'
/** fal.ai, consulta 22/10/2026: nano-banana/edit US$0,0398/imagem; Seedance silencioso US$1,20/M tokens. */
export const CARTOON_IMAGE_USD = 0.0398
export const CARTOON_TOKEN_USD = 1.2 / 1_000_000
export const CARTOON_VARIABLE_CAP_USD = 0.85
export const CARTOON_CANONICAL_ORIGIN = 'https://www.usekineo.com'

const named = (text: string, name: string) => new RegExp(`(?<![\\p{L}\\p{N}])${name}(?![\\p{L}\\p{N}])`, 'iu').test(text)
/** A protagonista tem sempre sua ficha. Mia (ou outro nome do catálogo) recebe a própria imagem e a própria roupa. */
export function cartoonCast(primary: KidsCharacterId, text: string): KidsCharacter[] {
  const main = kidsCharacter(primary)
  if (!main) throw new Error('Unknown cartoon character')
  return [main, ...KIDS_CHARACTERS.filter(c => c.id !== primary && named(text, c.name))]
}
export function cartoonReferenceUrls(cast: readonly KidsCharacter[]): string[] {
  return cast.map(c => new URL(c.portrait, CARTOON_CANONICAL_ORIGIN).href)
}
export function cartoonScenePrompt(prompt: string, cast: readonly KidsCharacter[]): string {
  return [prompt, 'CANONICAL CAST — each reference image belongs ONLY to the character with the matching name:',
    ...cast.map((c, i) => `Reference image ${i + 1}: ${c.sheet}. Preserve exactly this face, age, hair shape, hair color, eyes, body proportions and clothing.`),
    'Show only the characters required by this scene; the reference cast is not a request for a group portrait. Never transfer the main character face, hair or clothing to a secondary character. Never make twins or matching outfits. Uncatalogued supporting characters must have a distinct design and different clothes; do not invent a copy of the protagonist.',
    'A single cinematic scene, not a character sheet, collage, grid or split screen. Gentle innocent 3D cartoon; no text, letters, logos or captions.'].join(' ')
}
export function cartoonEditInput(prompt: string, cast: readonly KidsCharacter[], aspect: unknown, seed: number) {
  return { prompt: cartoonScenePrompt(prompt, cast), image_urls: cartoonReferenceUrls(cast), num_images: 1, limit_generations: true, aspect_ratio: normalizeAspect(aspect), output_format: 'png', safety_tolerance: '1', seed }
}
/** Apenas parcelas documentadas, não custo total medido: não inclui GPT/TTS/música/montagem. 720×1280, 24fps, áudio desligado. */
export function cartoonVariableCost(clipSeconds: readonly number[], extraVideoSeconds = 0) {
  if (!clipSeconds.length || clipSeconds.some(s => !Number.isInteger(s) || s < 4 || s > 12) || !Number.isFinite(extraVideoSeconds) || extraVideoSeconds < 0) throw new Error('Invalid cartoon video plan')
  const seconds = clipSeconds.reduce((a, b) => a + b, 0) + extraVideoSeconds
  const imagesUsd = clipSeconds.length * CARTOON_IMAGE_USD
  const videoUsd = 720 * 1280 * 24 * seconds / 1024 * CARTOON_TOKEN_USD
  return { images: clipSeconds.length, seconds, imagesUsd, videoUsd, knownUsd: imagesUsd + videoUsd, withinCap: imagesUsd + videoUsd <= CARTOON_VARIABLE_CAP_USD }
}
/** Sem fallback t2v: recusa explícita não pode apagar a promessa de identidade. */
export function cartoonSceneModels(models: string[]): string[] { return models.filter(m => m === CARTOON_VIDEO_MODEL).slice(0, 1) }
