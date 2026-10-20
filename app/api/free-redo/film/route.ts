// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — "Refazer uma cena (grátis, 1×)".
// A regra inteira mora em lib/freeRedo/filmServer.ts (e o porquê em lib/freeRedo/core.ts); aqui só o login e as peças
// reais. Ninguém aqui toca em crédito: não há débito, nem render_jobs, nem claim do /api/compose.
//
//   GET  /api/free-redo/film?videoId=<uuid>[&lite=1]  → estado (+ cenas, sem lite) e o passo seguinte quando é a vez dele
//   POST /api/free-redo/film { videoId, sceneIndex }  → começa a refação grátis daquela cena (idempotente)
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { fal } from '@fal-ai/client'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { loadVerifiedCinematicClaim } from '@/lib/cinematic/claim'
import { submitFalQueueOnce } from '@/lib/falQueue'
import { pollCreatomateRender, submitCreatomateRender } from '@/lib/compose'
import { persistRenderAssets } from '@/lib/renderAssets'
import { writeServerEvent } from '@/lib/serverEvents'
import { MARCA_REFAZER_1910 } from '@/lib/freeRedo/core'
import { acompanharRefacaoFilme, iniciarRefacaoFilme, type FreeRedoFilmDeps } from '@/lib/freeRedo/filmServer'

// Cópia do MP4 pronto para o bucket (o mesmo orçamento do /api/compose/status).
export const maxDuration = 60
export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02 — leitura do banco nunca do Data Cache da Vercel.
export const fetchCache = 'force-no-store'

/** Mídia que o Creatomate não vai conseguir baixar (clipe da fal expirado, objeto apagado). Erro de rede não condena. */
async function urlsMortas(urls: string[]): Promise<string[]> {
  const mortas: string[] = []
  await Promise.all(urls.slice(0, 80).map(async (u) => {
    try {
      const res = await fetch(u, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(8000) })
      if ([400, 403, 404, 410].includes(res.status)) mortas.push(u)
    } catch { /* timeout/rede não prova que o arquivo sumiu */ }
  }))
  return mortas
}

/** Mesma leitura do /api/cinematic-clip-status: COMPLETED com erro = falhou; resultado = data.video.url. */
async function pollScene(model: string, requestId: string): Promise<{ status: 'pending' | 'done' | 'failed'; url: string | null; error?: string | null }> {
  const key = process.env.FAL_KEY
  if (!key) return { status: 'pending', url: null }
  fal.config({ credentials: key })
  const st = await fal.queue.status(model, { requestId })
  const s = (st as { status?: string }).status
  const fim = st as unknown as { request_id?: unknown; error?: unknown }
  if (fim.request_id !== requestId) return { status: 'pending', url: null }
  if (s === 'FAILED') return { status: 'failed', url: null, error: 'FAILED' }
  if (s !== 'COMPLETED') return { status: 'pending', url: null }
  if (typeof fim.error === 'string' && fim.error.trim()) return { status: 'failed', url: null, error: fim.error.slice(0, 200) }
  const result = await fal.queue.result(model, { requestId })
  const data = ((result as { data?: unknown }).data ?? result) as { video?: { url?: string }; output?: { video?: { url?: string } } }
  const url = data?.video?.url ?? data?.output?.video?.url ?? null
  return url && url.startsWith('https://') ? { status: 'done', url } : { status: 'pending', url: null }
}

async function deps(): Promise<{ ok: true; userId: string; d: FreeRedoFilmDeps } | { ok: false; res: NextResponse }> {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return { ok: false, res: NextResponse.json({ marca: MARCA_REFAZER_1910, ok: false, motivo: 'sem_login' }, { status: 401 }) }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret || !process.env.FAL_KEY) {
    return { ok: false, res: NextResponse.json({ marca: MARCA_REFAZER_1910, ok: false, motivo: 'servidor_sem_configuracao' }, { status: 503 }) }
  }
  const db = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const d: FreeRedoFilmDeps = {
    db,
    secret,
    now: () => Date.now(),
    random: () => Math.random(),
    newOwner: () => randomUUID(),
    loadClaim: async ({ userId, generationId }) => {
      try { return await loadVerifiedCinematicClaim({ db, secret, userId, generationId }) } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'claim' } }
    },
    submitScene: (model, input) => submitFalQueueOnce(model, input),
    pollScene,
    submitRender: (source) => submitCreatomateRender(source),
    pollRender: (renderId) => pollCreatomateRender(renderId),
    persist: (a) => persistRenderAssets(a),
    deadUrls: urlsMortas,
    event: (e) => writeServerEvent(e),
  }
  return { ok: true, userId: user.id, d }
}

function responder(r: { status: number; body: Record<string, unknown> }): NextResponse {
  return NextResponse.json(r.body, { status: r.status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  try {
    const x = await deps()
    if (!x.ok) return x.res
    return responder(await acompanharRefacaoFilme(x.d, { userId: x.userId, videoId: req.nextUrl.searchParams.get('videoId'), lite: req.nextUrl.searchParams.get('lite') === '1' }))
  } catch (err) {
    console.error(`[free-redo/film] ${MARCA_REFAZER_1910} erro:`, err instanceof Error ? err.message : String(err))
    return NextResponse.json({ marca: MARCA_REFAZER_1910, ok: false, motivo: 'erro_inesperado' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const x = await deps()
    if (!x.ok) return x.res
    const body = (await req.json().catch(() => null)) as { videoId?: unknown; sceneIndex?: unknown } | null
    // O cliente manda SÓ o filme e a cena. Preço, "grátis", motor e prompt: tudo decidido aqui.
    return responder(await iniciarRefacaoFilme(x.d, { userId: x.userId, videoId: body?.videoId, sceneIndex: body?.sceneIndex }))
  } catch (err) {
    console.error(`[free-redo/film] ${MARCA_REFAZER_1910} erro:`, err instanceof Error ? err.message : String(err))
    return NextResponse.json({ marca: MARCA_REFAZER_1910, ok: false, motivo: 'erro_inesperado' }, { status: 500 })
  }
}
