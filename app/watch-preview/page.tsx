import type { Metadata } from 'next'
import HomePage from '@/app/page'
import KineoLanding from '@/app/KineoLanding'
import { FaqStructuredData } from '@/components/StructuredData'
import { createClient } from '@/lib/supabase/server'
import WatchPreviewAudit from '@/components/home/WatchPreviewAudit'

export const metadata: Metadata = {
  title: 'Kineo WATCH · visitor preview',
  robots: { index:false, follow:true, googleBot:{index:false,follow:true} },
  alternates: { canonical:'https://www.usekineo.com/watch-preview' },
}
export const dynamic = 'force-dynamic'

export default async function WatchPreviewPage(){
  const {data:{user}}=await createClient().auth.getUser()
  // Step 1 is visitor-only. A real signed-in session keeps the complete home,
  // including its resume strip and account/credit handling.
  if(user)return <HomePage />
  return <><FaqStructuredData/><KineoLanding watchVisitor watchPreview initialUser={null}/><WatchPreviewAudit/></>
}
