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
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'
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
