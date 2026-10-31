// ═══ KINEO-PUBLICAR-GANHAR-3110 — o cron que paga o "Publish & earn" ═══
//
// Dono publicou o filme (clique na tela de pronto) → alguém chegou pelo "Make your own version" (remix_signup) → essa
// conta TERMINOU o primeiro filme → o dono ganha 10 créditos (1x por conta indicada, teto 100/mês, nunca para si,
// nunca conta interna). As regras e a idempotência estão em lib/publicarGanhar3110Server.ts.
//
// DRY-RUN POR PADRÃO: sem `?confirm=SEND` só relata quem ganharia. O vercel.json chama com `?confirm=SEND`.
// Autorização: Bearer CRON_SECRET (o cron da Vercel) ou sessão de admin (ADMIN_EMAILS) para conferir à mão.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { runRemixRewards } from '@/lib/publicarGanhar3110Server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

async function authorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true
  try {
    const { data: { user } } = await createClient().auth.getUser()
    return !!user && isAdminEmail(user.email)
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const admin = serviceClient()
  if (!admin) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  const dryRun = req.nextUrl.searchParams.get('confirm') !== 'SEND'
  try {
    const result = await runRemixRewards(admin, { dryRun })
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[remix-reward] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, dry_run: dryRun, error: 'failed' }, { status: 500 })
  }
}
