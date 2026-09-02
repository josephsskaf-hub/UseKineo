// KINEO-RESGATE-FILME-MONTADO-2026-09-02 — sprint-assinaturas #18
//
// O QUE ISTO CONSERTA (medido 02/09, 14 dias, so externos):
// 7 filmes chegaram a ser MONTADOS na Creatomate (compose_submission_claim
// status=done com render_id, stranded_composed gravado) e NUNCA viraram linha
// em `videos`. Duas horas depois o refund-sweep, corretamente pela regra dele
// ("render_id sem linha em videos = nao entregue"), estornou o credito e
// liberou o claim de nascimento. A partir dai o /api/compose/status devolve
// `cinematic_claim_released` ("credits were refunded") para um MP4 PRONTO —
// o filme e jogado fora de proposito. Quem pagou fal + Creatomate fomos nos;
// quem ficou sem o 1o video foi o cliente (wummm709 hoje; ab732fd8 era um
// Kling 3 de 75cr em 21/08). Causa dos casos novos: o Data Cache da Vercel em
// rota so-GET (#17) — ja no ar depois do clique.
//
// O QUE ESTA ROTA FAZ: lista os filmes montados-e-descartados, pergunta a
// Creatomate se o arquivo AINDA EXISTE (GET de status, sem custo) e, so com
// ?confirm=PERSIST, grava a linha canonica em `videos` (mesmo esquema do
// persist do compose/status, credits_used=0 porque o credito ja voltou) e o
// evento `rescued_film_persisted`. O cliente ve o filme na Library. Nao envia
// e-mail (proximo passo, separado), nao cobra, nao mexe em claim.
//
// GUARD RAILS: so admin logado · dry-run por padrao · so casos com
// credits_refunded (credito ja devolvido = zero risco de cobrar) · idempotente
// pelo indice videos_render_id_unique (23505 = ja existe, conta como skip).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { pollCreatomateRender } from '@/lib/compose'
import { isInternalEmail } from '@/lib/internalAccounts'
import { decideRescue, rescueTitle, type RescueVerdict } from '@/lib/admin/rescueComposedFilms'

export const maxDuration = 120
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const REFUND_REASON = 'cinematic_abandoned_no_delivery'
const STAMP = 'rescued_film_persisted'

type Candidate = {
  user_id: string
  email: string
  generation_id: string
  render_id: string
  quality: string | null
  duration: number | null
  topic: string | null
  composed_at: string
  refunded_at: string
  refunded_credits: number | null
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = (user?.email ?? '').toLowerCase()
    if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 500 })
    if (!process.env.CREATOMATE_API_KEY) return NextResponse.json({ error: 'CREATOMATE_API_KEY missing' }, { status: 500 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

    const confirm = req.nextUrl.searchParams.get('confirm') === 'PERSIST'
    const daysParam = Number(req.nextUrl.searchParams.get('days'))
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 60) : 30
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    // 1) estornos "nunca entregue" na janela (lote pequeno: ~2-3/dia).
    const { data: refunds, error: rErr } = await admin
      .from('events')
      .select('user_id, session_id, created_at, metadata')
      .eq('name', 'credits_refunded')
      .eq('metadata->>reason', REFUND_REASON)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
    if (rErr) throw rErr
    const gens = (refunds ?? []).filter((r) => r.session_id).map((r) => String(r.session_id))
    if (gens.length === 0) return NextResponse.json({ dry_run: !confirm, days, candidates: [], summary: {} })

    // 2) claims de compose que chegaram a 'done' com render_id para essas geracoes.
    const { data: claims, error: cErr } = await admin
      .from('events')
      .select('user_id, session_id, created_at, metadata')
      .eq('name', 'compose_submission_claim')
      .in('session_id', gens)
      .limit(1000)
    if (cErr) throw cErr

    const refundByGen = new Map((refunds ?? []).map((r) => [String(r.session_id), r]))
    const candidates: Candidate[] = []
    for (const c of claims ?? []) {
      const md = (c.metadata ?? {}) as Record<string, unknown>
      const renderId = typeof md.render_id === 'string' ? md.render_id : ''
      if (md.status !== 'done' || !renderId) continue
      const refund = refundByGen.get(String(c.session_id))
      if (!refund) continue
      const rmd = (refund.metadata ?? {}) as Record<string, unknown>
      candidates.push({
        user_id: String(c.user_id),
        email: '',
        generation_id: String(c.session_id),
        render_id: renderId,
        quality: typeof md.quality === 'string' ? md.quality : null,
        duration: typeof md.duration === 'number' ? md.duration : null,
        topic: typeof md.topic === 'string' ? md.topic : null,
        composed_at: String(c.created_at),
        refunded_at: String(refund.created_at),
        refunded_credits: typeof rmd.amount === 'number' ? rmd.amount : null,
      })
    }
    if (candidates.length === 0) return NextResponse.json({ dry_run: !confirm, days, candidates: [], summary: { refunds: gens.length } })

    // 3) e-mail (para excluir internos) + linhas ja persistidas.
    const userIds = Array.from(new Set(candidates.map((c) => c.user_id)))
    const { data: profiles } = await admin.from('profiles').select('id, email').in('id', userIds)
    const emailById = new Map((profiles ?? []).map((p) => [String(p.id), String(p.email ?? '')]))
    const { data: existing } = await admin
      .from('videos')
      .select('render_id')
      .in('render_id', candidates.map((c) => c.render_id))
    const persisted = new Set((existing ?? []).map((v) => String(v.render_id)))

    // 4) Creatomate: o arquivo ainda existe? (GET de status; sem custo)
    type Row = Candidate & { verdict: RescueVerdict; file_url?: string; file_seconds?: number; persisted_id?: string; error?: string }
    const rows: Row[] = []
    for (const c of candidates) {
      c.email = emailById.get(c.user_id) ?? ''
      let state: Awaited<ReturnType<typeof pollCreatomateRender>> | null = null
      let lookupError: string | undefined
      const internal = isInternalEmail(c.email)
      if (!internal && !persisted.has(c.render_id)) {
        try {
          state = await pollCreatomateRender(c.render_id)
        } catch (e) {
          lookupError = e instanceof Error ? e.message : String(e)
        }
      }
      const verdict = decideRescue({ alreadyPersisted: persisted.has(c.render_id), internal, state })
      const row: Row = { ...c, verdict, error: lookupError }
      if (state?.url) row.file_url = state.url
      if (typeof state?.durationSeconds === 'number') row.file_seconds = Math.round(state.durationSeconds)
      if (verdict === 'persist' && confirm && state?.url) {
        const { data, error } = await admin
          .from('videos')
          .insert({
            user_id: c.user_id,
            status: 'completed',
            video_url: state.url,
            thumbnail_url: state.snapshotUrl ?? null,
            render_id: c.render_id,
            topic: c.topic,
            title: rescueTitle(c.topic),
            platform: 'YouTube Shorts',
            duration: row.file_seconds ?? c.duration,
            quality_mode: c.quality,
            credits_used: 0,
          })
          .select('id')
          .maybeSingle()
        if (error && error.code !== '23505') {
          row.error = error.message
        } else {
          row.persisted_id = data?.id ? String(data.id) : 'existing'
          await admin.from('events').insert({
            user_id: c.user_id,
            name: STAMP,
            path: '/api/admin/rescue-composed-films',
            session_id: c.generation_id,
            metadata: {
              render_id: c.render_id,
              video_id: row.persisted_id,
              quality: c.quality,
              refunded_credits: c.refunded_credits,
              composed_at: c.composed_at,
              refunded_at: c.refunded_at,
              file_seconds: row.file_seconds ?? null,
              admin: adminEmail,
            },
          })
        }
      }
      rows.push(row)
    }

    const summary: Record<string, number> = {}
    for (const r of rows) summary[r.verdict] = (summary[r.verdict] ?? 0) + 1
    summary.persisted_now = rows.filter((r) => r.persisted_id && r.persisted_id !== 'existing').length
    return NextResponse.json({
      dry_run: !confirm,
      days,
      hint: confirm ? 'gravado' : 'dry-run: adicione ?confirm=PERSIST para gravar em videos',
      summary,
      candidates: rows.map((r) => ({ ...r, topic: r.topic ? r.topic.slice(0, 80) : null })),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
