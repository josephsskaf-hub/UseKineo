/** Public image-engine choices shared by navigation and the image workspace.
 * Keys must stay aligned with /api/images/generate; names are provider names.
 */
export type ImgModelKey = 'schnell' | 'dev' | 'recraft' | 'nanobanana' | 'seedream' | 'grok'

export const IMG_ENGINES: { key: ImgModelKey; icon: string; name: string; tag?: string; desc: string; credits: string }[] = [
  { key: 'schnell', icon: 'F', name: 'FLUX Schnell', desc: 'Instant drafts', credits: '1 cr' },
  { key: 'dev', icon: 'F+', name: 'FLUX Dev', tag: 'Popular', desc: 'Sharp & photorealistic', credits: '2 cr' },
  { key: 'seedream', icon: 'S', name: 'Seedream 5.0 Pro', desc: 'Deep prompt understanding', credits: '3 cr' },
  { key: 'grok', icon: '𝕏', name: 'Grok Imagine 2.0', desc: 'Highly aesthetic, by xAI', credits: '3 cr' },
  { key: 'recraft', icon: 'R', name: 'Recraft V3', tag: 'Studio', desc: 'Perfect text rendering', credits: '4 cr' },
  { key: 'nanobanana', icon: '🍌', name: 'Nano Banana Pro', tag: 'Studio', desc: 'Google’s best image model', credits: '5 cr' },
]
