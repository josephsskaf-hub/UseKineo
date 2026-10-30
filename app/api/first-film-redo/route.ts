// KINEO-REFAZER-1O-FILME-3010 [vai do fundador 30/10 "D sim — limite de 1 por conta"] — regra em lib/growth/refazerPrimeiroFilme.ts.
// GET  ?video_id=  → a tela pergunta se mostra o cartão (dono, 1º vídeo pronto, até 72 h, nunca refez).
// POST {video_id, defect} → grava a refação (PK = conta: clique duplo nunca credita duas vezes), devolve EXATAMENTE os créditos do
// vídeo pelo mesmo RPC atômico dos pagamentos (add_video_credits) e devolve para onde a pessoa volta com a ideia preenchida.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/gptHandoffStore'
import { writeServerEvent } from '@/lib/serverEvents'
import { creditosDoRefazer, hrefDoRefazer, podeRefazer, REFAZER_DEFEITOS, REFAZER_EVENTOS, type DefeitoDoRefazer, type VideoDoRefazer } from '@/lib/growth/refazerPrimeiroFilme'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function avaliar(videoId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 401 as const }
  const admin = serviceClient()
  if (!admin) return { status: 503 as const }
  const { data: video } = await admin.from('videos')
    .select('id, user_id, status, credits_used, created_at, prompt, topic, quality_mode').eq('id', videoId).maybeSingle()
  const v = (video ?? null) as VideoDoRefazer | null
  const [{ count: antes }, { data: refeito }] = await Promise.all([
    v ? admin.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed').lt('created_at', v.created_at)
      : Promise.resolve({ count: 0 }),
    admin.from('first_film_redos').select('user_id').eq('user_id', user.id).maybeSingle(),
  ])
  const motivo = podeRefazer({ video: v, userId: user.id, videosAntes: antes ?? 0, jaRefez: !!refeito, agora: Date.now() })
  return { status: 200 as const, user, admin, video: v, motivo }
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('video_id') ?? ''
  if (!UUID_RE.test(videoId)) return NextResponse.json({ eligible: false, reason: 'bad_request' }, { status: 400 })
  try {
    const r = await avaliar(videoId)
    if (r.status !== 200) return NextResponse.json({ eligible: false }, { status: r.status })
    return NextResponse.json({ eligible: r.motivo === 'ok', reason: r.motivo, credits: r.motivo === 'ok' && r.video ? creditosDoRefazer(r.video.credits_used) : 0 })
  } catch (e) {
    console.error('[first-film-redo] GET falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ eligible: false }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { video_id?: string; defect?: string }
  const videoId = String(body.video_id ?? '')
  const defect = (REFAZER_DEFEITOS as readonly string[]).includes(String(body.defect)) ? String(body.defect) as DefeitoDoRefazer : null
  if (!UUID_RE.test(videoId) || !defect) return NextResponse.json({ ok: false, error: 'Choose what went wrong.' }, { status: 400 })
  try {
    const r = await avaliar(videoId)
    if (r.status !== 200) return NextResponse.json({ ok: false }, { status: r.status })
    const { user, admin, video, motivo } = r
    if (motivo !== 'ok' || !video) {
      void writeServerEvent({ name: REFAZER_EVENTOS.refused, userId: user.id, path: '/api/first-film-redo', metadata: { video_id: videoId, reason: motivo, defect } })
      return NextResponse.json({ ok: false, reason: motivo, error: motivo === 'already_used' ? 'Your free redo was already used.' : 'This video can’t be redone for free.' }, { status: 409 })
    }
    const credits = creditosDoRefazer(video.credits_used)
    // A PK (user_id) é a trava: o segundo pedido falha aqui, antes de qualquer crédito.
    const { error: claimErr } = await admin.from('first_film_redos').insert({ user_id: user.id, video_id: video.id, credits, defect })
    if (claimErr) {
      void writeServerEvent({ name: REFAZER_EVENTOS.refused, userId: user.id, path: '/api/first-film-redo', metadata: { video_id: videoId, reason: 'claim_conflict', defect } })
      return NextResponse.json({ ok: false, reason: 'already_used', error: 'Your free redo was already used.' }, { status: 409 })
    }
    const { error: creditErr } = await admin.rpc('add_video_credits', { p_user: user.id, p_amount: credits })
    if (creditErr) {
      await admin.from('first_film_redos').delete().eq('user_id', user.id) // sem crédito, a refação não fica gasta
      throw new Error(creditErr.message)
    }
    void writeServerEvent({ name: REFAZER_EVENTOS.granted, userId: user.id, path: '/api/first-film-redo', metadata: { video_id: video.id, credits, defect, credits_used: video.credits_used, quality_mode: video.quality_mode, version: 'refazer_1o_filme_3010' } })
    return NextResponse.json({ ok: true, credits, href: hrefDoRefazer(video) })
  } catch (e) {
    console.error('[first-film-redo] POST falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: 'Something went wrong. Nothing was charged — please try again.' }, { status: 500 })
  }
}
