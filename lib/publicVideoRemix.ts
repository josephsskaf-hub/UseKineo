export const PUBLIC_VIDEO_REMIX_CAMPAIGN = 'public_video_remix'

export function sanitizePublicVideoRemixTopic(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
}

export function sanitizePublicVideoId(value: string | null | undefined): string {
  const candidate = (value ?? '').trim()
  return /^[a-zA-Z0-9-]{1,80}$/.test(candidate) ? candidate : ''
}

export function publicVideoRemixHref(title: string, videoId: string): string {
  const params = new URLSearchParams({
    topic: sanitizePublicVideoRemixTopic(title),
    utm_source: 'public_video',
    utm_medium: 'share',
    utm_campaign: PUBLIC_VIDEO_REMIX_CAMPAIGN,
  })
  const safeVideoId = sanitizePublicVideoId(videoId)
  if (safeVideoId) params.set('source_video_id', safeVideoId)
  return `/free-script-generator?${params.toString()}`
}
