import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyVideosClient from './HistoryClient'

export default async function MyVideosPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // PUSH #92 — the status filter used to hide every non-completed render.
  // The render flow's recovery snapshot lives in sessionStorage-keyed
  // localStorage, so closing the tab (mobile Safari does this on its own)
  // orphans the render with no other way back to it. /history is the
  // backstop — it must show every status, not just 'completed', or a user
  // whose tab died mid-render sees "No videos yet" and assumes the product
  // ate their credit. HistoryClient renders each status distinctly.
  const { data: videos } = await supabase
    .from('videos')
    .select('id, video_url, thumbnail_url, topic, youtube_description, hashtags, status, quality_mode, credits_used, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return <MyVideosClient videos={videos ?? []} />
}
