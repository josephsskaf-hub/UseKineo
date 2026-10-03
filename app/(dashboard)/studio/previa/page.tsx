// KINEO-PREVIA-CENAS-2026-10-03 — /studio/previa: a prévia grátis das cenas para quem nasceu fora do filme grátis
// (lib/scenePreview.ts tem o porquê). O servidor decide quem entra: conta fora da régua (ou interruptor desligado) volta ao
// Studio de sempre — esta tela nunca aparece para quem pode fazer o filme.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PREVIA_CENAS_PUBLIC, previaEligible, type PreviaProfile } from '@/lib/scenePreview'
import ScenePreviewClient from './ScenePreviewClient'

export const metadata = { title: 'Free preview — Kineo' }
export const dynamic = 'force-dynamic'

type Props = { searchParams?: Record<string, string | string[] | undefined> }
const first = (v: string | string[] | undefined) => (typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? '' : '')

export default async function ScenePreviewPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent('/studio/previa')}`)
  const { data } = await supabase.from('profiles').select('trial_status, has_paid, plan, video_credits').eq('id', user.id).maybeSingle()
  if (!PREVIA_CENAS_PUBLIC || !previaEligible(data as PreviaProfile | null)) redirect('/studio')
  return <ScenePreviewClient initialIdea={first(searchParams?.prompt).slice(0, 2000)} from={first(searchParams?.from).slice(0, 24)} />
}
