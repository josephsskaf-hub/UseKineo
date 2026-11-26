// KINEO-PREVIA-CENAS-2026-10-03 — /studio/previa: a prévia grátis das cenas para quem nasceu fora do filme grátis
// (lib/scenePreview.ts tem o porquê). O servidor decide quem entra: conta fora da régua (ou interruptor desligado) volta ao
// Studio de sempre — esta tela nunca aparece para quem pode fazer o filme.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { voiceModeFields } from '@/lib/cinematic/filmVoice2511'
import { selectedFilmLook } from '@/lib/cinematic/filmLook2511Server'
import { PREVIA_CENAS_PUBLIC, previaEligible, type PreviaProfile } from '@/lib/scenePreview'
import { trialPedidoVisivel } from '@/lib/trialPedido' // KINEO-FLUXO2-G-0411
import ScenePreviewClient from './ScenePreviewClient'

export const metadata = { title: 'Free preview — Kineo' }
export const dynamic = 'force-dynamic'

type Props = { searchParams?: Record<string, string | string[] | undefined> }
const first = (v: string | string[] | undefined) => (typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? '' : '')

export default async function ScenePreviewPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent('/studio/previa')}`)
  const { data } = await supabase.from('profiles').select('trial_status, has_paid, plan, video_credits').eq('id', user.id).maybeSingle()
  if (!PREVIA_CENAS_PUBLIC || !previaEligible(data as PreviaProfile | null)) redirect('/studio')
  const filmLook = selectedFilmLook(searchParams?.look, authError ? null : user.email)
  const { voice_mode: voiceMode } = voiceModeFields(searchParams?.voice_mode)
  const originalScript = voiceMode === 'characters' && searchParams?.script_mode === 'verbatim'
    ? first(searchParams.prompt).slice(0, 5000) : undefined
  return <ScenePreviewClient filmLook={filmLook} {...(voiceMode ? { voiceMode } : {})} {...(originalScript ? { originalScript } : {})} initialIdea={first(searchParams?.prompt).slice(0, 2000)} from={first(searchParams?.from).slice(0, 24)} aPedido={trialPedidoVisivel(data as { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null } | null)} />
}
