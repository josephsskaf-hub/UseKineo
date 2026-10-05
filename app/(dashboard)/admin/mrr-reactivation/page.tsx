import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MrrReactivationReview from '@/components/growth/MrrReactivationReview'

export const dynamic = 'force-dynamic'
export default async function MrrReactivationPage() {
  const { data: { user } } = await createClient().auth.getUser()
  if (user?.email?.trim().toLowerCase() !== 'josephsskaf@gmail.com') redirect('/login')
  return <MrrReactivationReview />
}
