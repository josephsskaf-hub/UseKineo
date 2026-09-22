/** Same ceiling as /history; default clients keep their existing 48-row response. */
export function videoListLimit(value?: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 48
  return Math.max(1, Math.min(300, Number(value)))
}
export function libraryVideoState(video: { status?: string; video_url?: string | null }) {
  if (video.status === 'failed' || video.status === 'cancelled') return 'Needs review'
  if (video.video_url && (!video.status || video.status === 'completed')) return 'Ready'
  return 'Processing'
}
