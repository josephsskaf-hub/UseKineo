// KINEO-NUVEM-A2-2026-10-02 — a passada de logo do clipe avulso (o porquê mora em lib/clips/clipBrand.ts).
// GET                    → { available }                        (a conta vê o botão? interruptor + logo na conta)
// POST { id: clipId }    → { render_id }                        (envia a cópia com logo ao Creatomate; 1 por clipe)
// GET  ?render=<id>      → { status, progress, url }            (quando pronto, copia o MP4 para o NOSSO storage)
// Só o dono: o POST lê o clipe pela conta (loadClip) e grava `clip_brand_submitted` com o render_id; o GET só responde
// a quem tem esse evento (mesmo desenho do Espaços/Produção). Nada é cobrado do cliente; o clipe original não muda.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pollCreatomateRender, submitCreatomateRender } from '@/lib/compose'
import { persistRenderAssets } from '@/lib/renderAssets'
import { writeServerEvent } from '@/lib/serverEvents'
import { isInternalEmail } from '@/lib/internalAccounts'
import { findBrandLogoUrl, withBrandLogo } from '@/lib/brandLogo'
import { clipsVisible } from '@/lib/clips/clipLaunch'
import { clipsAdmin, loadClip } from '@/lib/clips/clipServer'
import { buildClipBrandSource, clipBrandVisible, clipBrandable } from '@/lib/clips/clipBrand'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE })
const RENDER_ID_RE = /^[0-9a-f-]{16,64}$/i
const EVENT = 'clip_brand_submitted'

async function gate() {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return { error: fail('unauthenticated', 401) }
  if (!clipsVisible(user.email) || !clipBrandVisible(isInternalEmail(user.email))) return { error: fail('not_found', 404) }
  const admin = clipsAdmin()
  if (!admin) return { error: fail('not_configured', 503) }
  return { user, admin }
}

export async function GET(req: NextRequest) {
  try {
    const { data: { user } } = await createClient().auth.getUser()
    const renderId = (req.nextUrl.searchParams.get('render') ?? '').trim()
    if (!renderId) {
      // Pergunta da tela: só diz "sim" com o interruptor (ou conta da casa) E um logo salvo na conta.
      if (!user || !clipsVisible(user.email) || !clipBrandVisible(isInternalEmail(user.email))) return NextResponse.json({ available: false }, { headers: NO_STORE })
      return NextResponse.json({ available: Boolean(await findBrandLogoUrl(user.id)) }, { headers: NO_STORE })
    }
    const g = await gate()
    if ('error' in g) return g.error
    const { user: me, admin } = g
    if (!RENDER_ID_RE.test(renderId)) return fail('bad_id', 400)
    const own = await admin.from('events').select('id').eq('user_id', me.id).eq('name', EVENT).eq('metadata->>render_id', renderId).limit(1)
    if (own.error) return fail('brand_failed', 502)
    if (!own.data?.length) return fail('not_found', 404)
    const st = await pollCreatomateRender(renderId)
    if (st.status !== 'succeeded' || !st.url) {
      return NextResponse.json({ status: st.status, progress: st.progress, url: null, error: st.error }, { headers: NO_STORE })
    }
    const saved = await persistRenderAssets({ userId: me.id, renderId: `clipbrand-${renderId}`, videoUrl: st.url, snapshotUrl: st.snapshotUrl })
    return NextResponse.json({ status: 'succeeded', progress: 1, url: saved.videoUrl }, { headers: NO_STORE })
  } catch (e) {
    console.warn('[clips/brand GET] falhou:', e instanceof Error ? e.message : String(e))
    return fail('brand_failed', 502)
  }
}

export async function POST(req: NextRequest) {
  try {
    const g = await gate()
    if ('error' in g) return g.error
    const { user, admin } = g
    const body = (await req.json().catch(() => null)) as { id?: unknown } | null
    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    if (!id) return fail('bad_id', 400)
    const row = await loadClip(admin, user.id, id)
    if (row === 'error') return fail('brand_failed', 503)
    if (!row) return fail('not_found', 404)
    if (!clipBrandable(row)) return fail('not_brandable', 422)
    // Um envio por clipe: o segundo clique devolve o mesmo render (nunca dois renders pagos do mesmo pedido).
    const prior = await admin.from('events').select('metadata').eq('user_id', user.id).eq('name', EVENT).eq('metadata->>clip_id', row.id).limit(1)
    if (prior.error) return fail('brand_failed', 502)
    const priorId = (prior.data?.[0]?.metadata as { render_id?: unknown } | undefined)?.render_id
    if (typeof priorId === 'string' && RENDER_ID_RE.test(priorId)) return NextResponse.json({ render_id: priorId, reused: true }, { headers: NO_STORE })
    const logo = await findBrandLogoUrl(user.id, admin)
    if (!logo) return fail('no_logo', 409)
    const source = withBrandLogo(buildClipBrandSource({ video_url: row.video_url as string, aspect: row.aspect, seconds: row.seconds }), logo)
    const renderId = await submitCreatomateRender(source)
    await writeServerEvent({
      name: EVENT,
      userId: user.id,
      path: '/api/clips/brand',
      metadata: { render_id: renderId, clip_id: row.id, engine: row.engine, seconds: row.seconds, aspect: row.aspect },
    })
    return NextResponse.json({ render_id: renderId }, { status: 202, headers: NO_STORE })
  } catch (e) {
    console.warn('[clips/brand POST] falhou:', e instanceof Error ? e.message : String(e))
    return fail('brand_failed', 502)
  }
}
