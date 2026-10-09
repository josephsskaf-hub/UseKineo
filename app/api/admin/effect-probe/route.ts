// KINEO-SONDA-EFEITOS-2026-10-09 — sonda INTERNA dos efeitos de anúncio de produto (fundador 09/10: "1 sim 2 sim" — testar os 5
// efeitos que o mercado mais usa antes de virarem estilos dentro do anúncio; regra da casa: efeito só entra testado com render
// real). A chave da fal só existe em produção, então o teste roda daqui, pela conta do fundador.
//
// Travas: só e-mail de administrador (a mesma lista exata das rotas /api/admin); só os modelos e efeitos do catálogo abaixo
// (nada de modelo ou texto livre vindo do cliente); a foto tem de estar no NOSSO storage público (sem SSRF). Não grava nada no
// banco nem cobra crédito: é sonda de qualidade, ~US$ 0,20–0,50 por efeito.
//   POST { probe: 'package_explosion' | …, image_url } → { model, request_id }
//   GET  ?probe=…&request_id=…                        → { status, video_url }
import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 30

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])

const PIXVERSE = 'fal-ai/pixverse/v5/effects'
const KLING = 'fal-ai/kling-video/v1.6/standard/effects'
const VIDU = 'fal-ai/vidu/template-to-video'

/** Catálogo fechado: chave → modelo + entrada fixa (a foto entra no lugar certo de cada fornecedor). */
const PROBES: Record<string, { model: string; input: (image: string) => Record<string, unknown> }> = {
  package_explosion: { model: PIXVERSE, input: (image) => ({ effect: 'Package Explosion', image_url: image, resolution: '720p', duration: '5' }) },
  billboard_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Billboard AD', image_url: image, resolution: '720p', duration: '5' }) },
  naked_eye_3d: { model: PIXVERSE, input: (image) => ({ effect: '3D Naked-Eye AD', image_url: image, resolution: '720p', duration: '5' }) },
  giant_product: { model: PIXVERSE, input: (image) => ({ effect: 'Giant Product', image_url: image, resolution: '720p', duration: '5' }) },
  mechanical_assembly: { model: PIXVERSE, input: (image) => ({ effect: 'Mechanical Assembly', image_url: image, resolution: '720p', duration: '5' }) },
  product_closeup: { model: PIXVERSE, input: (image) => ({ effect: 'Product close-up', image_url: image, resolution: '720p', duration: '5' }) },
  splash: { model: KLING, input: (image) => ({ effect_scene: 'splashsplash', input_image_urls: [image], duration: '5' }) },
  product_up: { model: VIDU, input: (image) => ({ template: 'creatice_product_up', input_image_urls: [image], aspect_ratio: '9:16' }) },
}

async function adminUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && ADMIN_EMAILS.has((user.email ?? '').toLowerCase()) ? user : null
}

function falReady(): boolean {
  const key = process.env.FAL_KEY
  if (!key) return false
  fal.config({ credentials: key })
  return true
}

export async function POST(req: NextRequest) {
  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = (await req.json().catch(() => null)) as { probe?: unknown; image_url?: unknown } | null
  const probe = typeof body?.probe === 'string' ? PROBES[body.probe] : undefined
  if (!probe) return NextResponse.json({ error: 'unknown_probe', probes: Object.keys(PROBES) }, { status: 400 })
  const image = typeof body?.image_url === 'string' ? body.image_url.trim() : ''
  const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/`
  if (!image || !storage.startsWith('https://') || !image.startsWith(storage)) return NextResponse.json({ error: 'image_must_be_our_storage' }, { status: 400 })
  if (!falReady()) return NextResponse.json({ error: 'fal_unavailable' }, { status: 503 })
  try {
    const sub = await fal.queue.submit(probe.model, { input: probe.input(image) })
    return NextResponse.json({ model: probe.model, request_id: sub.request_id })
  } catch (e) {
    return NextResponse.json({ error: 'submit_failed', detail: e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300) }, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const probe = PROBES[req.nextUrl.searchParams.get('probe') ?? '']
  const requestId = (req.nextUrl.searchParams.get('request_id') ?? '').trim()
  if (!probe || !/^[0-9a-f-]{20,64}$/i.test(requestId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  if (!falReady()) return NextResponse.json({ error: 'fal_unavailable' }, { status: 503 })
  try {
    const st = (await fal.queue.status(probe.model, { requestId })) as { status?: string }
    if (st.status !== 'COMPLETED') return NextResponse.json({ status: st.status ?? 'UNKNOWN', video_url: null })
    const res = (await fal.queue.result(probe.model, { requestId })) as { data?: { video?: { url?: string } } }
    return NextResponse.json({ status: 'COMPLETED', video_url: res.data?.video?.url ?? null })
  } catch (e) {
    return NextResponse.json({ status: 'ERROR', detail: e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300), video_url: null })
  }
}
