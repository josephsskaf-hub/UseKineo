import type { RecreateFormat } from '@/lib/recreate/formats'

export type ClipTemplateSpec = { model: string; quality: string | null }
export type ClipTemplateOrder = 'latest' | 'trending'
export type ClipTemplateCategory = 'Lifestyle' | 'Fun' | 'Pets' | 'Sports' | 'Effects' | 'Other'

export const CLIP_TEMPLATE_CATEGORIES: readonly ClipTemplateCategory[] = ['Lifestyle', 'Fun', 'Pets', 'Sports', 'Effects', 'Other']

export function clipTemplateCategory(format: Pick<RecreateFormat, 'id' | 'title' | 'type'>): ClipTemplateCategory {
  const subject = `${format.id} ${format.title}`.toLowerCase()
  if (/pet|cat|dog|cachorro|gato|puppy|kitten/.test(subject)) return 'Pets'
  if (/basket|basquete|football|futebol|sports|slam dunk|invasor|pitch invader/.test(subject)) return 'Sports'
  if (format.type === 'effect') return 'Effects'
  if (/runway|passarela|sweater|outfit|elevador|elevator/.test(subject)) return 'Lifestyle'
  if (/dance|dan[cç]a|selfie|favorit|vendedor|magic/.test(subject)) return 'Fun'
  return 'Other'
}

/** The server already orders new and newly approved templates. Likes break that order only in Trending. */
export function orderClipTemplates<T extends { id: string }>(formats: readonly T[], order: ClipTemplateOrder, likes: Readonly<Record<string, number>> = {}): readonly T[] {
  return order === 'latest' ? formats : [...formats].sort((a, b) => (likes[b.id] ?? 0) - (likes[a.id] ?? 0))
}
