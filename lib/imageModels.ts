/** Public image-engine choices shared by navigation and the image workspace.
 * Keys must stay aligned with /api/images/generate; names are provider names.
 */
export type ImgModelKey = 'schnell' | 'dev' | 'recraft' | 'nanobanana' | 'seedream' | 'grok'

type ImageEngine = {
  key: ImgModelKey
  icon: string
  name: string
  tag?: string
  desc: string
  creditCost: number
}

const catalog: ImageEngine[] = [
  { key: 'schnell', icon: 'F', name: 'FLUX Schnell', desc: 'Instant drafts', creditCost: 1 },
  { key: 'dev', icon: 'F+', name: 'FLUX Dev', tag: 'Popular', desc: 'Sharp & photorealistic', creditCost: 2 },
  { key: 'seedream', icon: 'S', name: 'Seedream 5.0 Pro', desc: 'Deep prompt understanding', creditCost: 3 },
  { key: 'grok', icon: '𝕏', name: 'Grok Imagine 2.0', desc: 'Highly aesthetic, by xAI', creditCost: 3 },
  { key: 'recraft', icon: 'R', name: 'Recraft V3', tag: 'Studio', desc: 'Perfect text rendering', creditCost: 4 },
  { key: 'nanobanana', icon: '🍌', name: 'Nano Banana Pro', tag: 'Studio', desc: 'Google’s best image model', creditCost: 5 },
]

/** Public catalog. The legacy display label and the server debit use the same numeric tariff. */
export const IMG_ENGINES = catalog.map(engine => ({ ...engine, credits: engine.creditCost + ' cr' }))

export function imageCreditCost(key: ImgModelKey): number {
  const engine = catalog.find(entry => entry.key === key)
  if (!engine) throw new Error('Unknown image engine')
  return engine.creditCost
}
