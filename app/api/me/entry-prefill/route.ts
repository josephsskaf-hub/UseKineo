// KINEO-STUDIO-PREENCHIDO-1211 — a ideia-exemplo da página por onde ESTA conta entrou, para o Studio escrever na caixa.
// Só lê; nada gera, nada cobra, nada grava. Conta nova (≤ 24 h) e sem filme pronto; fora disso, ou em qualquer falha, responde sem
// ideia e o Studio abre vazio como antes. A página de entrada é o pouso (landing_session_started) do MESMO session_id dos eventos da
// conta — o mesmo vínculo que ligou 817 de 827 cadastros de 30 dias. Resposta privada: muda por conta e não pode ir para cache.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/gptHandoffStore'
import { contaRecebePreenchimento, ideiaDaPagina, normalizarPagina } from '@/lib/growth/studioPreenchido1211'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const VAZIO = { page: null, idea: null, language: null }

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(VAZIO, { status: 401 })
    const admin = serviceClient()
    if (!admin) return NextResponse.json(VAZIO)
    const { count } = await admin.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed')
    if (!contaRecebePreenchimento({ accountCreatedAt: user.created_at, completedFilms: typeof count === 'number' ? count : null, nowMs: Date.now() })) {
      return NextResponse.json(VAZIO)
    }
    const { data: own } = await admin.from('events').select('session_id').eq('user_id', user.id).not('session_id', 'is', null)
      .order('created_at', { ascending: true }).limit(50)
    const sessions = Array.from(new Set((own ?? []).map((r: { session_id?: string | null }) => r.session_id).filter((s): s is string => typeof s === 'string' && s.length > 0)))
    if (sessions.length === 0) return NextResponse.json(VAZIO)
    const { data: pouso } = await admin.from('events').select('path').eq('name', 'landing_session_started').in('session_id', sessions)
      .order('created_at', { ascending: true }).limit(1)
    const page = normalizarPagina((pouso?.[0] as { path?: string | null } | undefined)?.path)
    const ideia = ideiaDaPagina(page)
    return NextResponse.json({ page, idea: ideia?.idea ?? null, language: ideia?.language ?? null })
  } catch {
    return NextResponse.json(VAZIO)
  }
}
