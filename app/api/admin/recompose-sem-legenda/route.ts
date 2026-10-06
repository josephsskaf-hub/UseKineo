// KINEO-SEM-LEGENDA-2026-10-06 — VERSÃO B DE UM FILME PRONTO (só a voz, sem legenda e sem título-gancho).
//
// Fundador, 06/10: "vai sem legenda, pode montar o teste". A = o filme como saiu; B = o MESMO filme remontado com os
// mesmos clipes, a mesma narração já gravada, a mesma música, os mesmos cortes, o mesmo logo e a mesma marca d'água —
// sem nenhum texto por cima. Ver o cabeçalho de lib/semLegenda.ts.
//
// COMO FUNCIONA: todo filme de conta interna montado depois deste deploy grava o próprio RenderScript já sem legenda e
// sem gancho (evento film_source_b_saved, ligado pelo render_id — app/api/compose). Esta rota pega ESSE RenderScript e o
// reenvia ao Creatomate. Não refaz cena (fal), não refaz voz (TTS), não roda Whisper, NÃO DEBITA CRÉDITO: nada aqui chama
// débito, nem grava intenção de cobrança (render_jobs), nem claim do /api/compose — e /api/compose/status devolve 404 para
// um render sem intenção, então o render da versão B não tem por onde ser cobrado. O custo é só a montagem no Creatomate.
// O filme B vira uma linha NOVA em `videos` ("[B sem legenda] …", credits_used 0); o vínculo com o original vai no evento
// film_variant (variant A/B, video_id, original) — a tabela `videos` não tem coluna de metadado.
//
// FILME MONTADO ANTES DESTE DEPLOY: não tem RenderScript guardado → 409 'sem_fonte' com a lista exata do que falta.
//
// CHAMADAS (logado como conta interna, dono do filme):
//   GET  /api/admin/recompose-sem-legenda?videoId=<uuid>               → ensaio (nada é enviado) ou acompanhamento
//   GET  /api/admin/recompose-sem-legenda?videoId=<uuid>&confirm=SEND  → envia a montagem B (um B por filme)
//   POST /api/admin/recompose-sem-legenda  { "videoId": "<uuid>" }       → igual ao confirm=SEND
// Depois de enviado, o GET sem confirm acompanha o render e, pronto, copia o MP4 para o nosso bucket e cria a linha B.
import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { isInternalEmail } from '@/lib/internalAccounts'
import { CreatomateSubmitError, pollCreatomateRender, submitCreatomateRender } from '@/lib/compose'
import { persistRenderAssets } from '@/lib/renderAssets'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  EVENTO_FONTE_B,
  EVENTO_PEDIDO_B,
  EVENTO_VERSAO,
  SEM_LEGENDA_MARCA,
  avaliarPedidoB,
  metadadosVersao,
  tituloVersaoB,
  validarFonteB,
} from '@/lib/semLegenda'

// Download do MP4 pronto + cópia para o bucket (o mesmo orçamento do /api/compose/status).
export const maxDuration = 60
export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02 — leitura do banco nunca do Data Cache da Vercel.
export const fetchCache = 'force-no-store'

const ROTA = '/api/admin/recompose-sem-legenda'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Pedido parado em 'pending' há mais que isto (lambda morta / envio ambíguo) pode ser retomado com confirm=SEND. */
const PENDENTE_VELHO_MS = 10 * 60_000

type Meta = Record<string, unknown>
type VideoRow = {
  id: string
  user_id: string
  status: string | null
  render_id: string | null
  title: string | null
  topic: string | null
  quality_mode: string | null
  duration: number | null
  platform: string | null
  youtube_description: string | null
}

function responder(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json({ marca: SEM_LEGENDA_MARCA, ...body }, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** Um pedido B por (conta, filme): id determinístico na tabela events (a PK é a trava entre instâncias). */
function pedidoBId(userId: string, videoId: string): string {
  const hex = createHash('sha256').update(`kineo:sem-legenda-b:v1:${userId}:${videoId}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Mídia que o Creatomate não vai conseguir baixar (clipe da fal expirado, objeto apagado). Erro de rede não condena. */
async function urlsMortas(urls: string[]): Promise<string[]> {
  const mortas: string[] = []
  await Promise.all(urls.slice(0, 80).map(async (u) => {
    try {
      const r = await fetch(u, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(8000) })
      if ([400, 403, 404, 410].includes(r.status)) mortas.push(u)
    } catch {
      // timeout/rede: não prova que o arquivo sumiu; o Creatomate decide e a falha volta no acompanhamento.
    }
  }))
  return mortas
}

/** Atualiza a linha-trava do pedido B só se ela ainda estiver como foi lida (status + dono). */
async function atualizarPedido(admin: SupabaseClient, id: string, userId: string, meta: Meta, esperado: { status: string; owner: string }): Promise<boolean> {
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    const { data, error } = await admin
      .from('events')
      .update({ metadata: { ...meta, updated_at: new Date().toISOString() } })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('name', EVENTO_PEDIDO_B)
      .eq('metadata->>status', esperado.status)
      .eq('metadata->>owner', esperado.owner)
      .select('id')
      .maybeSingle()
    if (!error) return data?.id === id
  }
  return false
}

async function atender(videoIdRaw: unknown, confirmar: boolean): Promise<NextResponse> {
  // 1) Portão: login + conta interna, ANTES de qualquer leitura.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const interna = isInternalEmail(user?.email)
  if (!user) return responder({ ok: false, motivo: 'sem_login' }, 401)
  if (!interna) return responder({ ok: false, motivo: 'so_conta_interna' }, 403)
  const videoId = typeof videoIdRaw === 'string' ? videoIdRaw.trim() : ''
  if (!UUID.test(videoId)) return responder({ ok: false, motivo: 'video_id_invalido' }, 400)
  const admin = adminClient()
  if (!admin) return responder({ ok: false, motivo: 'servidor_sem_configuracao' }, 503)

  // 2) O filme e o RenderScript B guardado na montagem dele (só da própria conta, só do mesmo render).
  const { data: videoData, error: videoErr } = await admin
    .from('videos')
    .select('id, user_id, status, render_id, title, topic, quality_mode, duration, platform, youtube_description')
    .eq('id', videoId)
    .maybeSingle()
  if (videoErr) return responder({ ok: false, motivo: 'banco_indisponivel' }, 503)
  const video = (videoData ?? null) as VideoRow | null
  let fonte: unknown = undefined
  let fonteMeta: Meta | null = null
  if (video && video.user_id === user.id && typeof video.render_id === 'string' && video.render_id) {
    const { data: ev, error: evErr } = await admin
      .from('events')
      .select('metadata, created_at')
      .eq('name', EVENTO_FONTE_B)
      .eq('user_id', user.id)
      .eq('metadata->>render_id', video.render_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (evErr) return responder({ ok: false, motivo: 'banco_indisponivel' }, 503)
    fonteMeta = ev?.metadata && typeof ev.metadata === 'object' ? (ev.metadata as Meta) : null
    fonte = fonteMeta ? fonteMeta.source_b : undefined
  }
  const avaliacao = avaliarPedidoB({ userId: user.id, interna, video, fonte })
  if (!avaliacao.ok) return responder({ ok: false, motivo: avaliacao.motivo, ...(avaliacao.falta ? { falta: avaliacao.falta } : {}) }, avaliacao.status)
  const valida = validarFonteB(fonte)
  if (!valida.ok || !video || !video.render_id) return responder({ ok: false, motivo: 'sem_fonte', falta: valida.ok ? [] : valida.falta }, 409)

  // 3) A linha-trava do pedido B deste filme.
  const pedidoId = pedidoBId(user.id, video.id)
  const { data: pedidoRow, error: pedidoErr } = await admin.from('events').select('id, metadata, created_at').eq('id', pedidoId).maybeSingle()
  if (pedidoErr) return responder({ ok: false, motivo: 'banco_indisponivel' }, 503)
  const pedido = pedidoRow ? ((pedidoRow.metadata && typeof pedidoRow.metadata === 'object' ? pedidoRow.metadata : {}) as Meta) : null
  const status = pedido ? String(pedido.status ?? '') : ''
  const confirmarUrl = `${ROTA}?videoId=${video.id}&confirm=SEND`
  const acompanharUrl = `${ROTA}?videoId=${video.id}`

  if (pedido && (status === 'submitted' || status === 'done')) {
    return acompanhar({ admin, userId: user.id, video, pedidoId, pedido })
  }
  const pendenteVelho = status === 'pending' &&
    Date.now() - (Date.parse(String(pedido?.updated_at ?? pedidoRow?.created_at ?? '')) || 0) > PENDENTE_VELHO_MS
  if (pedido && status === 'pending' && !pendenteVelho) {
    return responder({ ok: true, status: 'submitting', motivo: 'em_andamento', acompanhar: acompanharUrl }, 202)
  }
  if (!confirmar) {
    return responder({
      ok: true,
      mode: 'DRY_RUN',
      video: { id: video.id, title: video.title, quality_mode: video.quality_mode, render_id: video.render_id },
      versao_b: {
        title: tituloVersaoB(video.title),
        elements: Array.isArray((valida.fonte as { elements?: unknown }).elements) ? ((valida.fonte as { elements: unknown[] }).elements.length) : 0,
        media_urls: valida.urls.length,
        captions_removed: fonteMeta?.captions_removed ?? null,
        hook_removed: fonteMeta?.hook_removed ?? null,
        credits: 0,
        cost: 'só a montagem no Creatomate (sem fal, sem TTS, sem crédito)',
      },
      ...(status === 'failed' ? { ultima_tentativa: { status, erro: pedido?.error ?? null } } : {}),
      confirmar: confirmarUrl,
    })
  }

  // 4) Envio. Toma a trava (nova, ou retomada de uma falha / de um pendente velho, condicional ao que foi lido).
  const owner = randomUUID()
  const meuPedido: Meta = {
    ...(pedido ?? {}),
    marca: SEM_LEGENDA_MARCA,
    original_video_id: video.id,
    original_render_id: video.render_id,
    owner,
    status: 'pending',
    tentativa: pedido ? (Number(pedido.tentativa) || 1) + 1 : 1,
    error: null,
  }
  if (!pedido) {
    const { error } = await admin.from('events').insert({
      id: pedidoId,
      user_id: user.id,
      name: EVENTO_PEDIDO_B,
      path: ROTA,
      session_id: video.id,
      metadata: { ...meuPedido, updated_at: new Date().toISOString() },
    })
    if (error) {
      if ((error as { code?: string }).code === '23505') return responder({ ok: true, status: 'submitting', motivo: 'em_andamento', acompanhar: acompanharUrl }, 202)
      return responder({ ok: false, motivo: 'banco_indisponivel' }, 503)
    }
  } else {
    const retomou = await atualizarPedido(admin, pedidoId, user.id, meuPedido, { status, owner: String(pedido.owner ?? '') })
    if (!retomou) return responder({ ok: true, status: 'submitting', motivo: 'em_andamento', acompanhar: acompanharUrl }, 202)
  }

  const mortas = await urlsMortas(valida.urls)
  if (mortas.length > 0) {
    await atualizarPedido(admin, pedidoId, user.id, { ...meuPedido, status: 'failed', error: 'arquivo_expirou', dead_urls: mortas.slice(0, 10) }, { status: 'pending', owner })
    return responder({ ok: false, motivo: 'arquivo_expirou', urls: mortas, explicacao: 'Algum clipe ou áudio deste filme já não existe no fornecedor; a versão B precisa dos arquivos originais.' }, 409)
  }

  let renderId: string
  try {
    renderId = await submitCreatomateRender(valida.fonte)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const ambiguo = err instanceof CreatomateSubmitError && err.ambiguous
    // Ambíguo: o render pode existir — fica 'pending' (retomável em 10 min). Recusa clara: 'failed' (retomável já).
    await atualizarPedido(admin, pedidoId, user.id, { ...meuPedido, status: ambiguo ? 'pending' : 'failed', error: msg.slice(0, 300), ambiguous: ambiguo }, { status: 'pending', owner })
    return responder({ ok: false, motivo: ambiguo ? 'envio_ambiguo' : 'creatomate_recusou', erro: msg.slice(0, 300) }, 502)
  }
  await atualizarPedido(admin, pedidoId, user.id, { ...meuPedido, status: 'submitted', render_id: renderId, submitted_at: new Date().toISOString() }, { status: 'pending', owner })
  console.log(`[recompose-sem-legenda] ${SEM_LEGENDA_MARCA} video=${video.id} render_b=${renderId} (0 créditos)`)
  return responder({ ok: true, status: 'rendering', render_id: renderId, credits: 0, acompanhar: acompanharUrl }, 202)
}

/** Acompanha o render B; pronto, copia o MP4 para o nosso bucket, cria a linha B (0 crédito) e grava as versões A e B. */
async function acompanhar(a: { admin: SupabaseClient; userId: string; video: VideoRow; pedidoId: string; pedido: Meta }): Promise<NextResponse> {
  const { admin, userId, video, pedidoId, pedido } = a
  const renderId = String(pedido.render_id ?? '')
  if (pedido.status === 'done' && typeof pedido.b_video_id === 'string') {
    return responder({ ok: true, status: 'done', b_video_id: pedido.b_video_id, video_url: pedido.video_url ?? null, render_id: renderId, credits: 0 })
  }
  if (!renderId) return responder({ ok: false, motivo: 'pedido_sem_render' }, 409)
  let estado: Awaited<ReturnType<typeof pollCreatomateRender>>
  try {
    estado = await pollCreatomateRender(renderId)
  } catch (err) {
    return responder({ ok: false, motivo: 'creatomate_indisponivel', render_id: renderId, erro: err instanceof Error ? err.message.slice(0, 200) : String(err) }, 503)
  }
  if (estado.status === 'failed' || estado.status === 'cancelled') {
    await atualizarPedido(admin, pedidoId, userId, { ...pedido, status: 'failed', error: estado.error ?? estado.status }, { status: 'submitted', owner: String(pedido.owner ?? '') })
    return responder({ ok: false, status: 'failed', motivo: 'render_falhou', erro: estado.error ?? null, render_id: renderId, tentar_de_novo: `${ROTA}?videoId=${video.id}&confirm=SEND` })
  }
  if (estado.status !== 'succeeded' || !estado.url) {
    return responder({ ok: true, status: estado.status, progress: estado.progress, render_id: renderId }, 202)
  }

  const assets = await persistRenderAssets({ userId, renderId, videoUrl: estado.url, snapshotUrl: estado.snapshotUrl })
  const segundos = [assets.measuredSeconds, estado.durationSeconds, video.duration].find((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
  const row: Record<string, unknown> = {
    user_id: userId,
    status: 'completed',
    video_url: assets.videoUrl,
    thumbnail_url: assets.thumbnailUrl,
    render_id: renderId,
    topic: video.topic,
    title: tituloVersaoB(video.title),
    platform: video.platform ?? 'YouTube Shorts',
    duration: typeof segundos === 'number' ? Math.round(segundos) : null,
    quality_mode: video.quality_mode,
    // A versão B não custa crédito: o original já foi pago; aqui só existe a montagem.
    credits_used: 0,
  }
  if (video.youtube_description) row.youtube_description = video.youtube_description
  let bVideoId: string | null = null
  let criado = false
  const ins = await admin.from('videos').insert(row).select('id').maybeSingle()
  if (!ins.error && ins.data?.id) {
    bVideoId = String(ins.data.id)
    criado = true
  } else if ((ins.error as { code?: string } | null)?.code === '23505') {
    const ex = await admin.from('videos').select('id').eq('render_id', renderId).eq('user_id', userId).maybeSingle()
    bVideoId = ex.data?.id ? String(ex.data.id) : null
  }
  if (!bVideoId) return responder({ ok: false, motivo: 'gravar_video_falhou', erro: ins.error?.message ?? null, render_id: renderId, video_url: assets.videoUrl }, 500)

  if (criado) {
    // Uma linha por versão do par: B (o novo) e A (o original), as duas com `original` = o filme A.
    await writeServerEvent({ name: EVENTO_VERSAO, userId, path: ROTA, sessionId: bVideoId, metadata: metadadosVersao({ variant: 'B', videoId: bVideoId, original: video.id, renderId, generationId: null, via: 'recompose', quality: video.quality_mode }) })
    await writeServerEvent({ name: EVENTO_VERSAO, userId, path: ROTA, sessionId: video.id, metadata: metadadosVersao({ variant: 'A', videoId: video.id, original: video.id, renderId: video.render_id, generationId: null, via: 'recompose', quality: video.quality_mode }) })
  }
  await atualizarPedido(admin, pedidoId, userId, { ...pedido, status: 'done', b_video_id: bVideoId, video_url: assets.videoUrl, done_at: new Date().toISOString() }, { status: 'submitted', owner: String(pedido.owner ?? '') })
  return responder({ ok: true, status: 'done', b_video_id: bVideoId, original: video.id, title: row.title, video_url: assets.videoUrl, render_id: renderId, credits: 0 })
}

export async function GET(req: NextRequest) {
  try {
    return await atender(req.nextUrl.searchParams.get('videoId'), req.nextUrl.searchParams.get('confirm') === 'SEND')
  } catch (err) {
    console.error('[recompose-sem-legenda] erro:', err instanceof Error ? err.message : String(err))
    return responder({ ok: false, motivo: 'erro_inesperado' }, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { videoId?: unknown; video_id?: unknown } | null
    return await atender(body?.videoId ?? body?.video_id, true)
  } catch (err) {
    console.error('[recompose-sem-legenda] erro:', err instanceof Error ? err.message : String(err))
    return responder({ ok: false, motivo: 'erro_inesperado' }, 500)
  }
}
