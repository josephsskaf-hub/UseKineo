// KINEO-SONDA-EFEITOS-2026-10-09 — sonda INTERNA dos efeitos de anúncio de produto (fundador 09/10: "1 sim 2 sim" — testar os 5
// efeitos que o mercado mais usa antes de virarem estilos dentro do anúncio; regra da casa: efeito só entra testado com render
// real). A chave da fal só existe em produção, então o teste roda daqui, pela conta do fundador.
//
// Travas: só e-mail de administrador (a mesma lista exata das rotas /api/admin); só os modelos e efeitos do catálogo abaixo
// (nada de modelo ou texto livre vindo do cliente); a foto tem de estar no NOSSO storage público (sem SSRF). Não grava nada no
// banco nem cobra crédito: é sonda de qualidade, ~US$ 0,20–0,50 por efeito.
//   POST { probe: 'package_explosion' | …, image_url } → { model, request_id }
//   GET  ?probe=…&request_id=…                        → { status, video_url }
//   KINEO-SONDA-H3MAX-2026-10-13: POST { probe: 'h3_t2v' | 'h3max_t2v', prompt } · { probe: 'h3_i2v' | 'h3max_i2v', prompt, image_url }
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
  ocean_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Ocean ad', image_url: image, resolution: '720p', duration: '5' }) }, // KINEO-SONDA-EFEITOS-2026-10-09 — alternativa ao splash do Kling
  // KINEO-SONDA-MAIS-ESTILOS-2026-10-10 — fundador (10/10): "precisamos colocar mais estilos… só tem 5". A linha "AD" da PixVerse
  // (mesmo endpoint e preço dos 5 que já estão no anúncio) entra na sonda para o teste real antes de virar estilo.
  naked_eye_3d_ad: { model: PIXVERSE, input: (image) => ({ effect: '3D Naked-Eye AD', image_url: image, resolution: '720p', duration: '5' }) },
  beach_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Beach AD', image_url: image, resolution: '720p', duration: '5' }) },
  lighting_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Lighting AD', image_url: image, resolution: '720p', duration: '5' }) },
  supermarket_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Supermarket AD', image_url: image, resolution: '720p', duration: '5' }) },
  poster_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Poster AD', image_url: image, resolution: '720p', duration: '5' }) },
  graffiti_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Graffiti AD', image_url: image, resolution: '720p', duration: '5' }) },
  truck_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Truck AD', image_url: image, resolution: '720p', duration: '5' }) },
  shoal_surround: { model: PIXVERSE, input: (image) => ({ effect: 'Shoal Surround', image_url: image, resolution: '720p', duration: '5' }) },
  dreamlike_cloud: { model: PIXVERSE, input: (image) => ({ effect: 'Dreamlike Cloud', image_url: image, resolution: '720p', duration: '5' }) },
  parachute_delivery: { model: PIXVERSE, input: (image) => ({ effect: 'Parachute Delivery', image_url: image, resolution: '720p', duration: '5' }) },
  dishes_served: { model: PIXVERSE, input: (image) => ({ effect: 'Dishes Served', image_url: image, resolution: '720p', duration: '5' }) },
  microwave: { model: PIXVERSE, input: (image) => ({ effect: 'Microwave', image_url: image, resolution: '720p', duration: '5' }) },
  bullet_time_360: { model: KLING, input: (image) => ({ effect_scene: 'bullet_time_360', input_image_urls: [image], duration: '5' }) },
  product_closeup: { model: PIXVERSE, input: (image) => ({ effect: 'Product close-up', image_url: image, resolution: '720p', duration: '5' }) },
  splash: { model: KLING, input: (image) => ({ effect_scene: 'splashsplash', input_image_urls: [image], duration: '5' }) },
  product_up: { model: VIDU, input: (image) => ({ template: 'creatice_product_up', input_image_urls: [image], aspect_ratio: '9:16' }) },
}

// KINEO-SONDA-H3MAX-2026-10-13 — fundador (13/10: "Testar o H3"): o MiniMax H3 Max (versão pós-treinada pela fal) é candidato a
// substituir o Omni. Esta é só a SONDA de comparação: o pipeline de vídeo (lib/hollywood, lib/compose, generate-video-cinematic,
// compose) NÃO muda. Comparação justa = MESMO prompt e MESMOS parâmetros nos dois motores: 5 s, 768P, 9:16 no texto→vídeo, e
// prompt_expansion_mode 'disabled' (o mesmo padrão que a casa usa no H3 — KINEO-H3-SEM-REESCRITA; o H3 Max reescreveria o texto
// com o padrão 'balanced'). Nenhum dos dois tem chave de áudio: os dois geram som nativo sozinhos.
// Schemas lidos em 13/10/2026: https://fal.ai/models/minimax/h3/text-to-video/api · …/minimax/h3/image-to-video/api ·
// https://fal.ai/models/minimax/h3-max/text-to-video/api · https://fal.ai/models/minimax/h3-max/image-to-video/api
// (image_url = 1º quadro; saída em data.video.url nos quatro). Preço 768P: H3 US$ 0,06/s · H3 Max US$ 0,08/s (≈ US$ 0,30 × 0,40
// por clipe de 5 s). ÚNICO lugar desta rota com texto livre: o `prompt` entra SÓ nestas chaves, string, até 600 caracteres.
const H3_PROMPT_MAX = 600
const H3_SAME = { duration: 5, resolution: '768P', prompt_expansion_mode: 'disabled' } as const
const H3_PROBES: Record<string, { model: string; needsImage: boolean; input: (prompt: string, image: string) => Record<string, unknown> }> = {
  h3_t2v: { model: 'minimax/h3/text-to-video', needsImage: false, input: (prompt) => ({ prompt, ...H3_SAME, aspect_ratio: '9:16' }) },
  h3max_t2v: { model: 'minimax/h3-max/text-to-video', needsImage: false, input: (prompt) => ({ prompt, ...H3_SAME, aspect_ratio: '9:16' }) },
  h3_i2v: { model: 'minimax/h3/image-to-video', needsImage: true, input: (prompt, image) => ({ prompt, image_url: image, ...H3_SAME }) },
  h3max_i2v: { model: 'minimax/h3-max/image-to-video', needsImage: true, input: (prompt, image) => ({ prompt, image_url: image, ...H3_SAME }) },
}

/** KINEO-SONDA-H3MAX-2026-10-13 — prompt da sonda H3: só texto (string), sem caractere de controle além de quebra de linha/tab, 1–600. */
function h3Prompt(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const p = raw.trim()
  if (!p || p.length > H3_PROMPT_MAX) return null
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(p)) return null
  return p
}

async function adminUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && ADMIN_EMAILS.has((user.email ?? '').toLowerCase()) ? user : null
}

/** A fal devolve o motivo no corpo do erro (ApiError.body); sem ele, 'Unprocessable Entity' não diz qual campo. */
function falDetail(e: unknown): string {
  const body = (e as { body?: unknown } | null)?.body
  const msg = e instanceof Error ? e.message : String(e)
  return (body ? msg + ' ' + JSON.stringify(body) : msg).slice(0, 600)
}

function falReady(): boolean {
  const key = process.env.FAL_KEY
  if (!key) return false
  fal.config({ credentials: key })
  return true
}

export async function POST(req: NextRequest) {
  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = (await req.json().catch(() => null)) as { probe?: unknown; image_url?: unknown; prompt?: unknown } | null
  const key = typeof body?.probe === 'string' ? body.probe : ''
  const h3 = Object.prototype.hasOwnProperty.call(H3_PROBES, key) ? H3_PROBES[key] : undefined // KINEO-SONDA-H3MAX-2026-10-13
  const probe = !h3 && Object.prototype.hasOwnProperty.call(PROBES, key) ? PROBES[key] : undefined
  if (!probe && !h3) return NextResponse.json({ error: 'unknown_probe', probes: [...Object.keys(PROBES), ...Object.keys(H3_PROBES)] }, { status: 400 })
  // KINEO-SONDA-H3MAX-2026-10-13 — o resto do catálogo continua SEM texto livre: prompt fora das chaves h3* é recusado.
  if (probe && body?.prompt !== undefined) return NextResponse.json({ error: 'prompt_not_allowed' }, { status: 400 })
  const prompt = h3 ? h3Prompt(body?.prompt) : null
  if (h3 && !prompt) return NextResponse.json({ error: 'bad_prompt', max_chars: H3_PROMPT_MAX }, { status: 400 })
  const image = typeof body?.image_url === 'string' ? body.image_url.trim() : ''
  const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/`
  const needsImage = h3 ? h3.needsImage : true
  if (needsImage && (!image || !storage.startsWith('https://') || !image.startsWith(storage))) return NextResponse.json({ error: 'image_must_be_our_storage' }, { status: 400 })
  if (!falReady()) return NextResponse.json({ error: 'fal_unavailable' }, { status: 503 })
  const model = h3 ? h3.model : probe!.model
  const input = h3 ? h3.input(prompt as string, image) : probe!.input(image)
  try {
    const sub = await fal.queue.submit(model, { input })
    return NextResponse.json({ model, request_id: sub.request_id })
  } catch (e) {
    return NextResponse.json({ error: 'submit_failed', detail: falDetail(e) }, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // KINEO-SONDA-H3MAX-2026-10-13 — o status das chaves h3* sai pelo mesmo caminho (a saída do H3/H3 Max é data.video.url).
  const key = req.nextUrl.searchParams.get('probe') ?? ''
  const isH3 = Object.prototype.hasOwnProperty.call(H3_PROBES, key)
  const probe = isH3 ? H3_PROBES[key] : Object.prototype.hasOwnProperty.call(PROBES, key) ? PROBES[key] : undefined
  const requestId = (req.nextUrl.searchParams.get('request_id') ?? '').trim()
  if (!probe || !/^[0-9a-f-]{20,64}$/i.test(requestId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  if (!falReady()) return NextResponse.json({ error: 'fal_unavailable' }, { status: 503 })
  try {
    const st = (await fal.queue.status(probe.model, { requestId })) as { status?: string }
    if (st.status !== 'COMPLETED') return NextResponse.json({ status: st.status ?? 'UNKNOWN', video_url: null })
    const res = (await fal.queue.result(probe.model, { requestId })) as { data?: { video?: { url?: string }; expanded_prompt?: string | null } }
    if (isH3) return NextResponse.json({ status: 'COMPLETED', model: probe.model, video_url: res.data?.video?.url ?? null, expanded_prompt: res.data?.expanded_prompt ?? null })
    return NextResponse.json({ status: 'COMPLETED', video_url: res.data?.video?.url ?? null })
  } catch (e) {
    return NextResponse.json({ status: 'ERROR', detail: falDetail(e), video_url: null })
  }
}
