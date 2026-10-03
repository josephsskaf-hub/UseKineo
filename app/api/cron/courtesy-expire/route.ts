// KINEO-CORTESIA-2026-10-03 — validade da conta cortesia: vencido o prazo, o plano volta ao anterior.
// DRY-RUN POR PADRÃO: sem `?confirm=APPLY` só lista o que faria. NÃO está no vercel.json (decisão do fundador ligar):
//   { "path": "/api/cron/courtesy-expire?confirm=APPLY", "schedule": "35 * * * *" }
// Saldo que sobra = interruptor COURTESY_LEFTOVER_RULE em lib/courtesy.ts (hoje 'keep'). Quem trocou de plano no
// meio (assinou) não é tocado: a cortesia vira 'superseded'. CAS no plano e no saldo: perdeu a corrida, tenta na
// próxima rodada.
// Acesso: CRON_SECRET (Bearer) ou sessão de admin (o fundador pode abrir o dry-run no navegador).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { expireCourtesies } from '@/lib/courtesyStore'
import { COURTESY_EXPIRE_MAX_PER_RUN, COURTESY_LEFTOVER_RULE } from '@/lib/courtesy'

export const dynamic = 'force-dynamic'
// Rota só-GET no Next 14.2: sem isto o supabase-js lê o banco do primeiro pedido para sempre (KINEO-DATA-CACHE-2026-09-02).
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 60

async function authorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return Boolean(user && isAdminEmail(user.email))
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = serviceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  const apply = req.nextUrl.searchParams.get('confirm') === 'APPLY'
  try {
    const result = await expireCourtesies(admin, { apply, limit: COURTESY_EXPIRE_MAX_PER_RUN })
    return NextResponse.json({ ok: true, dry_run: !apply, leftover_rule: COURTESY_LEFTOVER_RULE, ...result })
  } catch (e) {
    console.error('[cron/courtesy-expire] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: 'courtesy_grants indisponível (migration 20261003120000 aplicada?)' }, { status: 503 })
  }
}
