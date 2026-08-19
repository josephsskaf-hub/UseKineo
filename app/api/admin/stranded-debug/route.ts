// KINEO-STRANDED-DEBUG-2026-08-19 — a ferramenta que tira a sessão da
// cegueira. O cron finish-stranded-renders devolve um JSON riquíssimo
// (outcome por geração: pending 5/7, too_few, compose_error_500,
// deferred_budget...), mas esse JSON morre dentro da Vercel: o cron é chamado
// pela plataforma com o CRON_SECRET, e o log agregado só mostra a linha-resumo
// ("checked=12 composed=0"). Resultado: dois testes do fundador falharam e eu
// só pude adivinhar o motivo.
//
// Esta rota é um PROXY autenticado por cookie de admin: injeta o CRON_SECRET
// do servidor e devolve o JSON completo da rodada no navegador. O fundador
// abre, cola aqui, e eu vejo exatamente onde cada render parou.
//
// SEGURANÇA: mesmo gate de todo /api/admin/* (sessão + ADMIN_EMAILS). O
// segredo nunca aparece na resposta — só é usado no header interno. E como
// executa o MESMO handler do cron, não existe lógica duplicada que possa
// divergir do que roda de verdade a cada 15 min.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '../_shared/db'
import { GET as strandedCron } from '@/app/api/cron/finish-stranded-renders/route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })

  const inner = new NextRequest(`${req.nextUrl.origin}/api/cron/finish-stranded-renders`, {
    headers: { authorization: `Bearer ${secret}` },
  })
  const res = await strandedCron(inner)
  const json = await res.json().catch(() => null)
  return NextResponse.json({ ran_at: new Date().toISOString(), status: res.status, ...(json ?? {}) })
}
