import type { WallVideo } from '../engineWall'

// Preserve the existing engine destination; leave non-Studio examples alone.
export function examplesSprintVideo(video: WallVideo): WallVideo {
  if (!video.href?.startsWith('/studio?')) return video
  const url = new URL(video.href, 'https://www.usekineo.com')
  if (!url.searchParams.get('engine')) return video
  url.searchParams.set('utm_source', 'examples')
  url.searchParams.set('utm_campaign', 'gpt24h')
  return { ...video, href: url.pathname + url.search }
}
