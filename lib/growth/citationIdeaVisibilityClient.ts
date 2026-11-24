// Client-safe transport: the server returns a boolean, never the account allowlist.
export async function citationIdeaServerVisible(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/citations/idea-visibility?user_id=${encodeURIComponent(userId)}`, { cache: 'no-store', credentials: 'same-origin' })
    if (!response.ok) return false
    const result = await response.json()
    return result?.visible === true
  } catch {
    return false
  }
}
