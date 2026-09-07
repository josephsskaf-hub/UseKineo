export type RecentLibraryProject = {id:string; title:string|null; status?:string; created_at?:string; video_url:string|null}
export function selectRecentLibraryProject(videos: RecentLibraryProject[]): RecentLibraryProject | null {
  return videos.filter(v => typeof v.id === 'string' && /^[a-zA-Z0-9-]+$/.test(v.id))
    .map((video,index) => ({video,index,time:Date.parse(video.created_at ?? '') || 0}))
    .sort((a,b) => b.time-a.time || a.index-b.index)[0]?.video ?? null
}
export function recentProjectState(video: RecentLibraryProject): 'ready'|'processing'|'failed' {
  if (video.status === 'completed' && video.video_url) return 'ready'
  if (video.status === 'failed' || video.status === 'cancelled') return 'failed'
  return 'processing'
}
