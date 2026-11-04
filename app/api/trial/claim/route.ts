// KINEO-TRIAL-A-PEDIDO-0411 — quem está no lado "a pedido" libera o filme grátis com 1 clique. O servidor confere tudo; o cliente não manda nada.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { claimOnRequestTrial } from '@/lib/reverseTrial'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const result = await claimOnRequestTrial(user.id)
  if (result.claimed || result.reason === 'already_claimed') return NextResponse.json({ ok: true, claimed: result.claimed })
  return NextResponse.json({ error: 'Your free film could not be released right now.', reason: result.reason }, { status: result.reason === 'not_on_request' ? 409 : 503 })
}
