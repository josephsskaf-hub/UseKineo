// KINEO-ADMIN-NUMEROS-0311 — fundador 03/11: "coloca todos esses dados também no admin na 1ª página, lado esquerdo as pessoas que entram, lado direito os números da empresa".
// A conta inteira mora na RPC admin_numeros_empresa, que conta no banco. A lista de contas internas continua só em lib/internalAccounts.ts e viaja por parâmetro.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { INTERNAL_EXACT_EMAILS, INTERNAL_LIKE_PATTERNS } from '@/lib/internalAccounts'
import { createLiveCache } from '@/lib/admin/liveCache'
import type { NumerosEmpresa } from '@/lib/admin/numerosEmpresa'

export const dynamic = 'force-dynamic'

const cache = createLiveCache<NumerosEmpresa>(5 * 60_000)

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    const data = await cache.get(async () => {
      const { data: linhas, error } = await admin.rpc('admin_numeros_empresa', { p_exact_emails: INTERNAL_EXACT_EMAILS, p_like_patterns: INTERNAL_LIKE_PATTERNS })
      if (error) throw new Error(error.message)
      return linhas as NumerosEmpresa
    })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    console.error('[admin/numeros-empresa] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Failed to load company numbers.' }, { status: 500 })
  }
}
