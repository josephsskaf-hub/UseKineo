import { readServerVisibility } from '@/lib/auth/readServerVisibility'

// Client-safe transport: the server returns a boolean, never the account allowlist.
export async function citationIdeaServerVisible(userId: string): Promise<boolean> {
  const result = await readServerVisibility('/api/citations/idea-visibility?user_id=' + encodeURIComponent(userId))
  return result?.visible === true
}
