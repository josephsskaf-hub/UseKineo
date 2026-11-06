// KINEO-TESTE-MOTORES-0511 — fundador 05/11: "Vamos testar o H3 Turbo, Kling 4 e o Wan 3 hoje". Rota interna para animar os MESMOS
// quadros nos 3 candidatos, antes de qualquer decisão de oferta (docs/PROPOSTA-CREDITOS-B-E-MOTORES-2026-11-05.md). A chave da fal só
// existe em produção, então o teste roda daqui, pela conta do fundador.
//
// Travas: só e-mail de administrador; só os 3 modelos abaixo; quadro só do nosso storage ou da fal. Não grava nada no banco e não
// cobra crédito. Nenhum cliente chega aqui: o motor só entra no produto depois da nota do fundador.
//   POST { engine, prompt, image_url, seconds } → { model, request_id }
//   GET  ?engine=…&request_id=…                 → { status, video_url }
// Schemas lidos em 05/11 no OpenAPI da fal, um por modelo.
import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 30

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com', 'josephskaf@hotmail.com'])
const PROMPT_MAX = 2000

const ENGINES: Record<string, { model: string; min: number; max: number; input: (prompt: string, image: string, seconds: number) => Record<string, unknown> }> = {
  h3_max_turbo: { model: 'minimax/h3-max-turbo/image-to-video', min: 2, max: 15, input: (prompt, image, seconds) => ({ prompt, image_url: image, duration: seconds, resolution: '768P', prompt_expansion_mode: 'disabled' }) },
  kling4_flash: { model: 'kling/v4/flash/image-to-video', min: 3, max: 20, input: (prompt, image, seconds) => ({ prompt, start_image_url: image, duration: seconds, resolution: '720p' }) },
  wan3: { model: 'fal-ai/wan-3/image-to-video', min: 2, max: 30, input: (prompt, image, seconds) => ({ prompt, start_image_url: image, duration: seconds, resolution: '720p', audio: false }) },
}

function engineFrom(raw: unknown) {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(ENGINES, raw) ? ENGINES[raw] : undefined
}

function promptFrom(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const p = raw.trim()
  if (!p || p.length > PROMPT_MAX) return null
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(p)) return null
  return p
}

function imageAllowed(raw: unknown, storageBase: string): boolean {
  if (typeof raw !== 'string') return false
  const base = storageBase.endsWith('/') ? storageBase : storageBase + '/'
  if (base.startsWith('https://') && raw.startsWith(base)) return true
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && (u.hostname === 'fal.media' || u.hostname.endsWith('.fal.media'))
  } catch {
    return false
  }
}

function secondsFrom(raw: unknown, min: number, max: number): number | null {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= min && raw <= max ? raw : null
}

async function adminUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && ADMIN_EMAILS.has((user.email ?? '').toLowerCase()) ? user : null
}

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

// KINEO-MOTION-SONDA-0611 — fundador 06/11: "motion com várias câmeras… me dá dois exemplos". Vários planos num clipe só, no Kling 3 (multi_prompt, schema lido em 06/11; US$ 0,112/s sem áudio). Só exemplo: não entra em produto nenhum.
const MOTION_MODEL = 'fal-ai/kling-video/v3/pro/text-to-video'
const MOTION_NEGATIVE = 'text, letters, numbers, logo, watermark, caption, subtitles, on-screen text, readable signs, blur, distort, low quality'
function planosFrom(raw: unknown): Array<{ prompt: string; duration: string }> | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 6) return null
  const planos = raw.map((p) => ({ prompt: promptFrom((p as { prompt?: unknown })?.prompt), seconds: (p as { seconds?: unknown })?.seconds }))
  if (planos.some((p) => !p.prompt || p.prompt.length > 512 || !Number.isInteger(p.seconds) || (p.seconds as number) < 1)) return null
  if (planos.reduce((soma, p) => soma + (p.seconds as number), 0) > 15) return null
  return planos.map((p) => ({ prompt: p.prompt as string, duration: String(p.seconds) }))
}

export async function POST(req: NextRequest) {
  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (req.nextUrl.searchParams.get('motion') === '1') {
    const planos = planosFrom(((await req.json().catch(() => null)) as { shots?: unknown } | null)?.shots)
    if (!planos) return NextResponse.json({ error: 'bad_shots' }, { status: 400 })
    if (!falReady()) return NextResponse.json({ error: 'fal_unavailable' }, { status: 503 })
    try {
      const sub = await fal.queue.submit(MOTION_MODEL, { input: { multi_prompt: planos, shot_type: 'customize', aspect_ratio: '9:16', generate_audio: false, negative_prompt: MOTION_NEGATIVE } as never })
      return NextResponse.json({ model: MOTION_MODEL, request_id: sub.request_id })
    } catch (e) {
      return NextResponse.json({ error: 'submit_failed', detail: falDetail(e) }, { status: 502 })
    }
  }
  const body = (await req.json().catch(() => null)) as { engine?: unknown; prompt?: unknown; image_url?: unknown; seconds?: unknown } | null
  const engine = engineFrom(body?.engine)
  if (!engine) return NextResponse.json({ error: 'unknown_engine', engines: Object.keys(ENGINES) }, { status: 400 })
  const prompt = promptFrom(body?.prompt)
  if (!prompt) return NextResponse.json({ error: 'bad_prompt', max_chars: PROMPT_MAX }, { status: 400 })
  if (!imageAllowed(body?.image_url, `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/`)) return NextResponse.json({ error: 'image_not_allowed' }, { status: 400 })
  const seconds = secondsFrom(body?.seconds, engine.min, engine.max)
  if (seconds === null) return NextResponse.json({ error: 'bad_seconds', min: engine.min, max: engine.max }, { status: 400 })
  if (!falReady()) return NextResponse.json({ error: 'fal_unavailable' }, { status: 503 })
  try {
    const sub = await fal.queue.submit(engine.model, { input: engine.input(prompt, body?.image_url as string, seconds) })
    return NextResponse.json({ model: engine.model, request_id: sub.request_id })
  } catch (e) {
    return NextResponse.json({ error: 'submit_failed', detail: falDetail(e) }, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const motion = req.nextUrl.searchParams.get('engine') === 'motion' // KINEO-MOTION-SONDA-0611
  const engine = motion ? { model: MOTION_MODEL } : engineFrom(req.nextUrl.searchParams.get('engine'))
  const requestId = (req.nextUrl.searchParams.get('request_id') ?? '').trim()
  if (!engine || !/^[0-9a-f-]{20,64}$/i.test(requestId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  if (!falReady()) return NextResponse.json({ error: 'fal_unavailable' }, { status: 503 })
  try {
    const st = (await fal.queue.status(engine.model, { requestId })) as { status?: string }
    if (st.status !== 'COMPLETED') return NextResponse.json({ status: st.status ?? 'UNKNOWN', video_url: null })
    const res = (await fal.queue.result(engine.model, { requestId })) as { data?: { video?: { url?: string } } }
    return NextResponse.json({ status: 'COMPLETED', model: engine.model, video_url: res.data?.video?.url ?? null })
  } catch (e) {
    return NextResponse.json({ status: 'ERROR', detail: falDetail(e), video_url: null })
  }
}
