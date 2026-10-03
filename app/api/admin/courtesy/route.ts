// KINEO-CORTESIA-2026-10-03 — botão "Cortesia" de /admin/people. Ver lib/courtesy.ts (regra) e lib/courtesyStore.ts
// (escritas). Diferente de /api/admin/grant-credits, que só soma saldo (a conta free continua recusada nos motores),
// aqui o plano vira creator_trial/studio_trial com data de fim, plano anterior guardado e evento
// admin_courtesy_granted. Nunca plano cheio; nunca por cima de quem já tem plano.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { grantCourtesy } from '@/lib/courtesyStore'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const body = (await req.json().catch(() => ({}))) as { email?: string; level?: unknown; credits?: unknown; days?: unknown; reason?: unknown }
    const email = (body.email ?? '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Informe o e-mail.' }, { status: 400 })
    const { data: profile, error } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (error) throw error
    if (!profile?.id) return NextResponse.json({ error: `Ninguém com o e-mail ${email}.` }, { status: 404 })

    const result = await grantCourtesy(admin, {
      userId: profile.id as string,
      level: body.level,
      credits: body.credits,
      days: body.days,
      reason: body.reason,
      grantedBy: user.email ?? 'admin',
      source: 'admin',
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true, email, level: result.level, ends_at: result.endsAt, before: result.before, after: result.after })
  } catch (e) {
    console.error('[admin/courtesy] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Falhou ao conceder a cortesia.' }, { status: 500 })
  }
}
