// Claude fills this only with approved public /v/ pages and authorized posters.
// A watch-page URL is a link, never a video src. Empty means no public proof yet.
export const BUSINESS_AD_EXAMPLES: Array<{ business: string; segment: string; videoUrl: string; poster?: string }> = []

export function businessAdWatchPath(value: string): string | null {
  try {
    const url = new URL(value, 'https://www.usekineo.com')
    return url.origin === 'https://www.usekineo.com' && /^\/v\/[a-zA-Z0-9_-]+$/.test(url.pathname) && !url.search && !url.hash ? url.pathname : null
  } catch { return null }
}
