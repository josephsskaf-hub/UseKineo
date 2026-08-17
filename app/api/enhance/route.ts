// KINEO-ENHANCE-2026-08-17 — [STAGE] "Enhance": pos-producao Topaz no video
// pronto (aprovacao do fundador: "pode fazer as tres coisas"). E o mesmo
// acabamento que o Higgsfield vende como Video Upscale: remocao de artefato
// de compressao, recuperacao de detalhe e grain fino de filme.
// Schema conferido HOJE em fal-ai/topaz/upscale/video/llms.txt:
//   $0.02/s no tier 1080p (upscale_factor 1 = enhance sem mudar resolucao;
//   fator 2 saltaria pro tier >1080p a $0.08/s — 4x mais caro, sem ganho
//   visivel num Short). 60s ≈ $1.20 de custo → 10 creditos (~$1.50) retail.
// Fluxo em 2 tempos (Topaz demora minutos num video de 60s):
//   POST {videoId} → debita 10cr (renderId enhance-<videoId>, IDEMPOTENTE:
//     clique repetido nao cobra duas vezes) → fal.queue.submit → guarda
//     enhance_request_id na linha do video.
//   GET ?videoId= → consulta a fila; COMPLETED → copia pro nosso bucket,
//     grava enhanced_url; FAILED → refund + limpa request_id pra retry.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { debitVideoCredits } from '@/lib/credits/debit'
import { refundRenderCredits } from '@/lib/credits/refund'

export const maxDuration = 300

const SLUG = 'fal-ai/topaz/upscale/video'
const ENHANCE_COST = 10

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function configFal(): boolean {
  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
  if (!falKey) return false
  fal.config({ credentials: falKey })
  return true
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  if (!configFal()) return NextResponse.json({ error: 'Provider not configured.' }, { status: 500 })

  let body: { videoId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const videoId = String(body.videoId ?? '')
  if (!videoId) return NextResponse.json({ error: 'videoId required.' }, { status: 400 })

  const { data: video } = await supabase
    .from('videos')
    .select('id,video_url,enhanced_url,enhance_request_id')
    .eq('id', videoId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!video?.video_url) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })
  if (video.enhanced_url) return NextResponse.json({ status: 'done', url: video.enhanced_url })
  if (video.enhance_request_id) return NextResponse.json({ status: 'processing' })

  // KINEO-PRICING-V5-2026-08-17 — Studio (plan 'pro') inclui 2 enhances HD
  // gratis por mes (contados por videos.enhanced_at no mes corrente). Do 3º em
  // diante, e a partir de qualquer outro plano, custa os 10cr normais.
  let freeGrant = false
  try {
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle()
    const plan = String((profile as { plan?: string | null } | null)?.plan ?? '').toLowerCase()
    if (plan === 'pro') {
      const monthStart = new Date()
      monthStart.setUTCDate(1)
      monthStart.setUTCHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('enhanced_at', monthStart.toISOString())
      if ((count ?? 0) < 2) freeGrant = true
    }
  } catch {
    // fail-closed pro debito normal — nunca bloqueia o enhance
  }

  // Débito idempotente por VÍDEO: enhance-<videoId>. Re-clique = mesmo renderId
  // = sem cobrança dupla. Com o grant gratis do Studio, o debito e pulado.
  if (!freeGrant) {
    const debit = await debitVideoCredits(supabase, { userId: user.id, renderId: `enhance-${videoId}`, cost: ENHANCE_COST })
    if (debit.error || debit.data === null) {
      return NextResponse.json({ error: 'Not enough credits.', code: 'credits' }, { status: 402 })
    }
  }

  try {
    const { request_id } = await fal.queue.submit(SLUG, {
      input: {
        video_url: video.video_url,
        model: 'Proteus',
        upscale_factor: 1,
        compression: 0.6,
        recover_detail: 0.6,
        grain: 0.02,
        H264_output: true,
      },
    })
    const admin = svc()
    if (admin) await admin.from('videos').update({ enhance_request_id: request_id }).eq('id', videoId)
    console.log(`[enhance] user=${user.id.slice(0, 8)} video=${videoId} submitted req=${request_id}`)
    return NextResponse.json({ status: 'processing' })
  } catch (e) {
    console.error('[enhance] submit failed — refunding:', e instanceof Error ? e.message : String(e))
    await refundRenderCredits(`enhance-${videoId}`).catch(() => {})
    return NextResponse.json({ error: 'Enhance failed to start. Credits refunded.' }, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  if (!configFal()) return NextResponse.json({ error: 'Provider not configured.' }, { status: 500 })

  const videoId = String(req.nextUrl.searchParams.get('videoId') ?? '')
  if (!videoId) return NextResponse.json({ error: 'videoId required.' }, { status: 400 })

  const { data: video } = await supabase
    .from('videos')
    .select('id,enhanced_url,enhance_request_id')
    .eq('id', videoId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 })
  if (video.enhanced_url) {
    // KINEO-ENHANCE-SELFHEAL-2026-08-17 — o Maracaibo de 88MB estourou o
    // file_size_limit do bucket (50MB default; elevado a 250MB via SQL hoje) e
    // a URL ficou presa no fal, que EXPIRA. Todo GET re-tenta a copia enquanto
    // a URL for do fal — o acervo se conserta sozinho conforme o dono abre o
    // My Videos. Best-effort: falhou, segue com a URL do fal desta vez.
    if (/\bfal\.(media|run)\b/.test(video.enhanced_url)) {
      const admin = svc()
      if (admin) {
        try {
          const res = await fetch(video.enhanced_url, { signal: AbortSignal.timeout(180000) })
          if (res.ok) {
            const buf = await res.arrayBuffer()
            const path = `enhanced/${user.id}/${videoId}.mp4`
            const { error } = await admin.storage.from('renders').upload(path, buf, { contentType: 'video/mp4', upsert: true })
            if (!error) {
              const { data: pub } = admin.storage.from('renders').getPublicUrl(path)
              await admin.from('videos').update({ enhanced_url: pub.publicUrl }).eq('id', videoId)
              console.log(`[enhance] SELFHEAL video=${videoId} copiado pro bucket`)
              return NextResponse.json({ status: 'done', url: pub.publicUrl })
            }
            console.warn('[enhance] selfheal upload falhou:', error.message)
          }
        } catch (e) {
          console.warn('[enhance] selfheal falhou:', e instanceof Error ? e.message : String(e))
        }
      }
    }
    return NextResponse.json({ status: 'done', url: video.enhanced_url })
  }
  if (!video.enhance_request_id) return NextResponse.json({ status: 'idle' })

  try {
    const status = (await fal.queue.status(SLUG, { requestId: video.enhance_request_id, logs: false })) as { status?: string }
    if (status?.status === 'COMPLETED') {
      const result = (await fal.queue.result(SLUG, { requestId: video.enhance_request_id })) as {
        data?: { video?: { url?: string } }
        video?: { url?: string }
      }
      const falUrl = result?.data?.video?.url ?? result?.video?.url ?? null
      if (!falUrl) throw new Error('completed but no video url')
      // Persistencia no NOSSO bucket (lei do storage): URL do fal expira.
      let finalUrl = falUrl
      const admin = svc()
      if (admin) {
        try {
          const res = await fetch(falUrl, { signal: AbortSignal.timeout(120000) })
          if (res.ok) {
            const buf = await res.arrayBuffer()
            const path = `enhanced/${user.id}/${videoId}.mp4`
            const { error } = await admin.storage.from('renders').upload(path, buf, { contentType: 'video/mp4', upsert: true })
            if (!error) {
              const { data: pub } = admin.storage.from('renders').getPublicUrl(path)
              finalUrl = pub.publicUrl
            }
          }
        } catch (copyErr) {
          console.warn('[enhance] copy to bucket failed — using fal url:', copyErr instanceof Error ? copyErr.message : String(copyErr))
        }
        await admin.from('videos').update({ enhanced_url: finalUrl, enhance_request_id: null, enhanced_at: new Date().toISOString() }).eq('id', videoId)
      }
      console.log(`[enhance] video=${videoId} DONE`)
      return NextResponse.json({ status: 'done', url: finalUrl })
    }
    if (status?.status === 'IN_QUEUE' || status?.status === 'IN_PROGRESS') {
      return NextResponse.json({ status: 'processing' })
    }
    // Estado desconhecido/erro → refund + retry habilitado.
    throw new Error(`unexpected status ${status?.status}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // 4xx/falha real do job → estorna e limpa; erro transitorio de rede segue "processing".
    if (/unexpected status|not found|4\d\d/i.test(msg)) {
      console.error('[enhance] job failed — refunding:', msg)
      await refundRenderCredits(`enhance-${videoId}`).catch(() => {})
      const admin = svc()
      if (admin) await admin.from('videos').update({ enhance_request_id: null }).eq('id', videoId)
      return NextResponse.json({ status: 'failed', error: 'Enhance failed. Credits refunded — try again.' })
    }
    console.warn('[enhance] poll transient error:', msg)
    return NextResponse.json({ status: 'processing' })
  }
}
