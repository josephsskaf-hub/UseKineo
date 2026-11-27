import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { queryDaChegada } from '@/lib/create/entry'
import { PUBLIC_CREATE_EDITORS } from '@/lib/create/publicEditorRelease'
import { publicEditor } from '@/lib/create/publicEditorServer'
import { clipNaMolduraVisivel } from '@/lib/create/clipNaMoldura'
import { abaRecreateVisivel } from '@/lib/create/clipRecreateJuntos'
import CreateMolduraTopo from '@/components/create/CreateMolduraTopo'
import ImagesClient from '@/app/(dashboard)/images/ImagesClient'

export const metadata = { title: 'Image — Kineo', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function CreateImage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { data: { user }, error } = await createClient().auth.getUser()
  const signedIn = Boolean(user && !error)
  if (!signedIn && !PUBLIC_CREATE_EDITORS) {
    const query = queryDaChegada(searchParams)
    redirect('/signup?redirect=' + encodeURIComponent('/create/image' + (query ? '?' + query : '')))
  }
  return <>
    <CreateMolduraTopo active="image" signedIn={signedIn} showClip={publicEditor('clip') || clipNaMolduraVisivel(user?.email)} showRecreate={abaRecreateVisivel(user?.email)} />
    <ImagesClient publicEditor visitor={!signedIn} restoring={signedIn && typeof searchParams.draft === 'string' && searchParams.volta === '1'} />
  </>
}
