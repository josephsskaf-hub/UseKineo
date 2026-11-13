import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { releaseVisible } from '@/lib/recreate/access'
import { SEU_VIDEO_RELEASE } from '@/lib/recreate/seuVideo'
import { SEU_VIDEO_PREVIEW_ENABLED } from '@/lib/recreate/seuVideoPreviewRelease'
import SeuVideoRecreateClient from './SeuVideoRecreateClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Recreate with your video · Kineo preview',
  robots: {index:false,follow:true,googleBot:{index:false,follow:true}},
  alternates: {canonical:'https://www.usekineo.com/recreate-preview'},
}
export default async function SeuVideoPreviewPage({searchParams={}}:{searchParams?:Record<string,string|string[]|undefined>}){
  if(!SEU_VIDEO_PREVIEW_ENABLED)notFound()
  const {data:{user}}=await createClient().auth.getUser()
  return <SeuVideoRecreateClient signedIn={!!user} generationAllowed={!!user&&releaseVisible(user.email,SEU_VIDEO_RELEASE)} accountKey={user?.id??null} initialExample={typeof searchParams.example==='string'?searchParams.example:undefined} draftRef={typeof searchParams.draft==='string'?searchParams.draft:undefined}/>
}
