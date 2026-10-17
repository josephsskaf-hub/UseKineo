// KINEO-ADMIN-RAPIDO-1710 — POST /api/admin/coerencia/avaliar: o botão "Avaliar pendentes" do /admin/coerencia.
//
// POR QUE EXISTE: a página julgava ATÉ 6 filmes sem nota a CADA abertura (gpt-4o-mini, até 15 s, gravando em events) —
// abrir a tela custava dinheiro e até +15 s. Agora a página só LÊ as notas (maxCompute: 0). Quem julga:
//   · o cron /api/cron/quality-radar (vercel.json, a cada 15 min, janela de 14 dias, sem as contas da casa) — já existia;
//   · este botão, para quem não quer esperar o próximo giro: julga até COERENCIA_BOTAO_MAX filmes da MESMA janela/motor/
//     filtro de casa que a tela está mostrando, grava as notas (mesmo evento de sempre) e a tela recarrega.
// Gate idêntico a toda rota /api/admin: sessão + isAdminEmail.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readAll } from '@/lib/supabase/readAll'
import { isAdminEmail, serviceClient } from '../../_shared/db'
import { listFastCoherence } from '@/lib/admin/fastCoherence'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 60

const COERENCIA_BOTAO_MAX = 6
const FOUNDER = ['josephsskaf@gmail.com'] // o mesmo corte da página (app/admin/coerencia/page.tsx)

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email?.toLowerCase() ?? '')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
    const body = (await req.json().catch(() => ({}))) as { hours?: unknown; engine?: unknown; casa?: unknown }
    const hoursRaw = Number(body.hours)
    const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 48
    const engine = typeof body.engine === 'string' && body.engine.trim() ? body.engine.trim() : undefined
    const incluirCasa = body.casa === true || body.casa === '1'
    const rows = await listFastCoherence(admin, { route: '/api/admin/coerencia/avaliar', hours, limit: 150, engine, maxCompute: COERENCIA_BOTAO_MAX, excludeEmails: incluirCasa ? [] : FOUNDER }, readAll)
    const semNota = rows.filter((r) => !r.coherence).length
    return NextResponse.json({ ok: true, films: rows.length, sem_nota: semNota })
  } catch (e) {
    console.warn('[admin/coerencia/avaliar] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 502 })
  }
}
