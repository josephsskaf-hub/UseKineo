import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShowcaseConsent from '@/components/ShowcaseConsent'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const metadata: Metadata = { title: 'Film privacy | Kineo', robots: { index: false, follow: false } }

export default async function ManagePage({ searchParams }: { searchParams: { videoId?: string } }) {
  const videoId = typeof searchParams.videoId === 'string' ? searchParams.videoId : ''
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/made-with-kineo/manage?videoId=${videoId}`)}`)
  return <main style={{ minHeight: '100vh', background: '#080d16', color: '#edf3ff', padding: '40px 24px' }}>
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <Link href="/library" style={{ color: '#83c3ff' }}>← My library</Link>
      <h1 style={{ fontSize: 32, fontWeight: 500, marginTop: 36 }}>Your film’s public visibility</h1>
      {videoId ? <ShowcaseConsent key={videoId} videoId={videoId} /> : <p>Open this page from the privacy link on one of your films.</p>}
    </div>
  </main>
}
