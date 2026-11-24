// Browser-safe read-only transport. Private membership remains exclusively in server routes.
export async function readServerVisibility(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store', credentials: 'same-origin' })
    if (!response.ok) return null
    const value: unknown = await response.json()
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  } catch {
    return null
  }
}
