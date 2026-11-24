import { readServerVisibility } from '@/lib/auth/readServerVisibility'
export async function citationFilmServerVisible(userId: string): Promise<boolean> {
  const result = await readServerVisibility('/api/citations/film-visibility?user_id=' + encodeURIComponent(userId))
  return result?.visible === true
}
