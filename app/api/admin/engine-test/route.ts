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
import { serviceClient } from '../_shared/db'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 30

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@hotmail.com'])
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

// KINEO-SONDA-MOTORES-2311 — dono 23/11 aprovou um teste pago de 3 motores de referência (teto US$ 15,00). A chave da fal só existe no
// servidor, então a sonda roda daqui: o administrador manda o endpoint e a entrada JÁ montada; a rota só confere e repassa, idêntica.
//   POST ?probe=1 { endpoint, input }                 → { model, request_id, est_usd, day_total_usd }
//   GET  ?engine=probe&endpoint=…&request_id=…        → { status, video_url } | { status: 'failed', error }
// Trava de dinheiro NO SERVIDOR: soma o custo estimado das sondas das últimas 24 h (evento admin_engine_probe em public.events) e recusa
// se este pedido passar de PROBE_DAILY_CAP_USD. Leitura da soma falhou = recusa (fecha por padrão). Não toca em crédito de ninguém.
const PROBE_EVENT = 'admin_engine_probe'
// KINEO-SONDA-TETO-2311 — dono 23/11: aprovou US$ 15,00 (rodada 1) e depois mais US$ 5,75 (rodada 2 do Gemini, na mesma noite).
// O teto das 24 h passa a ser a soma do que ele aprovou, nem um centavo a mais. Voltar a 15 depois de 24/11.
// KINEO-SONDA-DOIS-MOTORES-2511 [revisora 25/11 §9.2; CEO 25/11 11:05] — o teto passa a ser o que o dono aprovou e ainda cai nas 24 h corridas: US$ 0,66 do
// Kling flash (aprovação da madrugada de 25/11; a sonda gravou 0,658 às 07:31–07:32 UTC) + US$ 4,00 do teste A de hoje (Gemini, Vidu, H3) = US$ 4,66.
// A conta: na janela já estão 0,658 + 1,2285 (o Gemini) = 1,8865; o Vidu (0,9975) e o H3 (1,411) de 15 s com 2 fotos levam a 4,295 ≤ 4,66; um 3º pedido
// de 15 s (o menor seria outro Gemini, 1,2285) passaria de 4,66 e é recusado. Os 20,75 eram da aprovação de 23/11, já fora da janela.
const PROBE_DAILY_CAP_USD = 4.66
const PROBE_WINDOW_MS = 24 * 60 * 60 * 1000 // "dia" = 24 h corridas antes do pedido (mais apertado que o dia do calendário)
// Preço por segundo a 720p, lido em 23/11/2026 na página de cada modelo na fal (fal.ai/models/<endpoint>).
const KLING4_REF_USD_PER_S_720P_2311 = 0.157
const KLING4_FLASH_REF_USD_PER_S_720P_2311 = 0.094
const GEMINI_OMNI_FLASH_REF_USD_PER_S_720P_2311 = 0.0819
// KINEO-SONDA-DOIS-MOTORES-2511 [dono 25/11: teste de motor substituto, opção A, teto US$ 4,00] — Vidu Q4 e H3 Max Turbo com referência. Ficha pública lida
// em 25/11 (fal.ai/models/<id>/llms.txt):
//   · Vidu Q4: reference_image_urls (até 12), duration 3–16 (inteiro), resolution "720p", aspect_ratio "9:16", audio (false = mudo, o preço não muda),
//     a foto citada no texto como [@reference_image_1]. Preço a 720p: US$ 0,0665/s com o desconto de 30% "até 30/11/2026"; depois, US$ 0,095/s;
//   · H3 Max Turbo: reference_image_urls (até 12 arquivos somando imagem, vídeo e áudio), duration até 15, resolution "768P", aspect_ratio "9:16",
//     prompt_expansion_mode (obrigatório; "disabled" = o texto vai como escrevemos), a foto citada como "Image 1". Preço a 768P: US$ 0,08/s, mais
//     US$ 0,016 por mil tokens de referência acima dos 4.096 incluídos. A ficha não diz quantos tokens uma foto custa: a estimativa reserva 4.096
//     tokens por foto (US$ 0,0655 cada), um teto e não a conta exata.
// Entram no MESMO teto diário (PROBE_DAILY_CAP_USD) e com as mesmas travas: só administrador, foto só do nosso storage ou da fal, até 3 fotos, 3 a 15 s.
const VIDU_Q4_REF_USD_PER_S_720P_PROMO_2511 = 0.0665
const VIDU_Q4_REF_USD_PER_S_720P_2511 = 0.095
const VIDU_Q4_PROMO_ATE_2511 = Date.UTC(2026, 10, 30) // [revisora §9.3] o desconto vale "até 30/11/2026" num fuso que a ficha não diz: o preço cheio já a partir de 30/11 00:00 UTC (nunca abaixo do real)
const H3_MAX_TURBO_REF_USD_PER_S_768P_2511 = 0.08
const H3_REF_RESERVA_USD_POR_FOTO_2511 = 0.0655 // 4.096 tokens × US$ 0,016/mil, por foto: a ficha não dá os tokens por foto
type PerfilDaSonda2511 = 'vidu_q4' | 'h3_max_turbo'
const PROBE_ENDPOINTS: Record<string, { usdPerSecond: number; multiPrompt: boolean; perfil?: PerfilDaSonda2511 }> = {
  'kling/v4/reference-to-video': { usdPerSecond: KLING4_REF_USD_PER_S_720P_2311, multiPrompt: true },
  'kling/v4/flash/reference-to-video': { usdPerSecond: KLING4_FLASH_REF_USD_PER_S_720P_2311, multiPrompt: false },
  'google/gemini-omni-flash/v1.2/reference-to-video': { usdPerSecond: GEMINI_OMNI_FLASH_REF_USD_PER_S_720P_2311, multiPrompt: false },
  'fal-ai/vidu/q4/reference-to-video': { usdPerSecond: VIDU_Q4_REF_USD_PER_S_720P_PROMO_2511, multiPrompt: false, perfil: 'vidu_q4' }, // KINEO-SONDA-DOIS-MOTORES-2511
  'minimax/h3-max-turbo/reference-to-video': { usdPerSecond: H3_MAX_TURBO_REF_USD_PER_S_768P_2511, multiPrompt: false, perfil: 'h3_max_turbo' }, // KINEO-SONDA-DOIS-MOTORES-2511
}
// KINEO-SONDA-DOIS-MOTORES-2511 — a entrada de cada perfil novo: as chaves exatas da ficha, todas obrigatórias (o padrão do fornecedor podia custar mais ou
// mudar o texto), e o texto cita a 1ª foto do jeito daquele motor (sem isso a foto não amarra ninguém e o render pago se perde).
const PERFIS_DA_SONDA_2511: Record<PerfilDaSonda2511, { chaves: readonly string[]; resolution: string; fixas: Record<string, unknown>; citaFoto: string }> = {
  vidu_q4: { chaves: ['prompt', 'duration', 'resolution', 'aspect_ratio', 'reference_image_urls', 'audio'], resolution: '720p', fixas: { audio: false }, citaFoto: '[@reference_image_1]' },
  h3_max_turbo: { chaves: ['prompt', 'duration', 'resolution', 'aspect_ratio', 'reference_image_urls', 'prompt_expansion_mode'], resolution: '768P', fixas: { prompt_expansion_mode: 'disabled' }, citaFoto: 'Image 1' },
}
function probePerfilInputError(perfil: PerfilDaSonda2511, input: Record<string, unknown>): string | null {
  const p = PERFIS_DA_SONDA_2511[perfil]
  const chaves = Object.keys(input)
  if (chaves.some((k) => !p.chaves.includes(k))) return 'unknown_input_key'
  if (p.chaves.some((k) => !Object.prototype.hasOwnProperty.call(input, k))) return 'missing_input_key'
  const d = input.duration
  if (typeof d !== 'number' || !Number.isInteger(d) || d < 3 || d > 15) return 'bad_duration'
  if (input.resolution !== p.resolution) return 'bad_resolution'
  if (input.aspect_ratio !== '9:16') return 'bad_aspect_ratio'
  for (const [k, v] of Object.entries(p.fixas)) if (input[k] !== v) return 'bad_' + k
  const imgs = input.reference_image_urls
  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/`
  if (!Array.isArray(imgs) || imgs.length < 1 || imgs.length > 3 || !imgs.every((u) => imageAllowed(u, storageBase))) return 'image_not_allowed'
  if (!probeText(input.prompt, PROBE_PROMPT_MAX)) return 'bad_prompt'
  return (input.prompt as string).includes(p.citaFoto) ? null : 'prompt_sem_a_foto'
}
/** O custo estimado da sonda, por endpoint e data: o Vidu muda de preço em 01/12; o H3 soma a reserva das fotos. */
function probeEstUsd(model: string, endpoint: { usdPerSecond: number; perfil?: PerfilDaSonda2511 }, input: Record<string, unknown>, agora: number): number {
  const seconds = input.duration as number
  if (endpoint.perfil === 'vidu_q4') return seconds * (agora < VIDU_Q4_PROMO_ATE_2511 ? VIDU_Q4_REF_USD_PER_S_720P_PROMO_2511 : VIDU_Q4_REF_USD_PER_S_720P_2511)
  // [revisora §9.1] a ficha: "output can run up to about 0.7 s longer than requested" — a estimativa cobre 1 s a mais (nunca abaixo do real)
  if (endpoint.perfil === 'h3_max_turbo') return (seconds + 1) * H3_MAX_TURBO_REF_USD_PER_S_768P_2511 + (input.reference_image_urls as unknown[]).length * H3_REF_RESERVA_USD_POR_FOTO_2511
  return seconds * endpoint.usdPerSecond
}
const PROBE_INPUT_KEYS = new Set(['prompt', 'multi_prompt', 'duration', 'resolution', 'aspect_ratio', 'image_urls'])
const PROBE_PROMPT_MAX = 4000
const PROBE_SHOT_PROMPT_MAX = 512
const PROBE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
// Dinheiro em décimos de milésimo de dólar (inteiro): 14 + 2,355 não pode virar 16,354999… e escapar da comparação.
const toUnits = (usd: number) => Math.round(usd * 10000)
const fromUnits = (units: number) => units / 10000

function probeEndpointFrom(raw: unknown) {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(PROBE_ENDPOINTS, raw) ? PROBE_ENDPOINTS[raw] : undefined
}

function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
}

function probeText(raw: unknown, max: number): boolean {
  return typeof raw === 'string' && raw.trim().length > 0 && raw.length <= max && !PROBE_CONTROL.test(raw)
}

function probeInputError(endpoint: { multiPrompt: boolean; perfil?: PerfilDaSonda2511 }, input: unknown): string | null {
  if (!isPlainObject(input)) return 'bad_input'
  if (endpoint.perfil) return probePerfilInputError(endpoint.perfil, input) // KINEO-SONDA-DOIS-MOTORES-2511
  if (Object.keys(input).some((k) => !PROBE_INPUT_KEYS.has(k))) return 'unknown_input_key'
  const d = input.duration
  if (typeof d !== 'number' || !Number.isInteger(d) || d < 3 || d > 15) return 'bad_duration'
  if (input.resolution !== '720p') return 'bad_resolution'
  if (input.aspect_ratio !== '9:16') return 'bad_aspect_ratio'
  const imgs = input.image_urls
  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/`
  if (!Array.isArray(imgs) || imgs.length < 1 || imgs.length > 3 || !imgs.every((u) => imageAllowed(u, storageBase))) return 'image_not_allowed'
  const hasPrompt = Object.prototype.hasOwnProperty.call(input, 'prompt')
  const hasMulti = Object.prototype.hasOwnProperty.call(input, 'multi_prompt')
  if (hasPrompt === hasMulti) return 'prompt_xor_multi_prompt'
  if (hasPrompt) return probeText(input.prompt, PROBE_PROMPT_MAX) ? null : 'bad_prompt'
  if (!endpoint.multiPrompt) return 'multi_prompt_not_supported'
  const shots = input.multi_prompt
  if (!Array.isArray(shots) || shots.length < 1 || shots.length > 6) return 'bad_multi_prompt'
  let sum = 0
  for (const shot of shots) {
    if (!isPlainObject(shot) || Object.keys(shot).some((k) => k !== 'prompt' && k !== 'duration')) return 'bad_multi_prompt'
    if (!probeText(shot.prompt, PROBE_SHOT_PROMPT_MAX)) return 'bad_multi_prompt'
    if (typeof shot.duration !== 'number' || !Number.isInteger(shot.duration) || shot.duration < 1) return 'bad_multi_prompt'
    sum += shot.duration
  }
  return sum === d ? null : 'multi_prompt_duration_mismatch'
}

// Soma (em unidades) do custo estimado das sondas das últimas 24 h. null = não deu para saber → quem chama recusa.
async function probeSpentUnits(db: NonNullable<ReturnType<typeof serviceClient>>, since: string): Promise<number | null> {
  try {
    const { data, error } = await db.from('events').select('metadata').eq('name', PROBE_EVENT).gte('created_at', since).limit(1000)
    if (error || !Array.isArray(data) || data.length >= 1000) return null
    let units = 0
    for (const row of data as Array<{ metadata?: { est_usd?: unknown } | null }>) {
      const v = row?.metadata?.est_usd
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null
      units += toUnits(v)
    }
    return units
  } catch {
    return null
  }
}

async function probePost(req: NextRequest) {
  // Segunda guarda de propósito: a sonda gasta dinheiro e o evento precisa do id de quem pediu (a guarda do POST não o devolve).
  const admin = await adminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const userId = admin.id
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown; input?: unknown } | null
  const endpoint = probeEndpointFrom(body?.endpoint)
  if (!endpoint) return NextResponse.json({ error: 'unknown_endpoint', endpoints: Object.keys(PROBE_ENDPOINTS) }, { status: 400 })
  const model = body?.endpoint as string
  const bad = probeInputError(endpoint, body?.input)
  if (bad) return NextResponse.json({ error: bad }, { status: 400 })
  const input = body?.input as Record<string, unknown>
  const seconds = input.duration as number
  const estUnits = toUnits(probeEstUsd(model, endpoint, input, Date.now())) // KINEO-SONDA-DOIS-MOTORES-2511 (os 3 de antes: segundos × preço, como era)
  const db = serviceClient()
  if (!db) return NextResponse.json({ error: 'spend_unreadable' }, { status: 503 })
  const spent = await probeSpentUnits(db, new Date(Date.now() - PROBE_WINDOW_MS).toISOString())
  if (spent === null) return NextResponse.json({ error: 'spend_unreadable' }, { status: 503 })
  if (spent + estUnits > toUnits(PROBE_DAILY_CAP_USD)) {
    return NextResponse.json({ error: 'daily_cap', cap_usd: PROBE_DAILY_CAP_USD, day_total_usd: fromUnits(spent), est_usd: fromUnits(estUnits) }, { status: 429 })
  }
  if (!falReady()) return NextResponse.json({ error: 'fal_unavailable' }, { status: 503 })
  let requestId: string
  try {
    requestId = (await fal.queue.submit(model, { input: input as never })).request_id
  } catch (e) {
    return NextResponse.json({ error: 'submit_failed', detail: falDetail(e) }, { status: 502 })
  }
  const est_usd = fromUnits(estUnits)
  // A fila já aceitou: o pedido custa mesmo que o evento falhe. Por isso o aviso volta na resposta em vez de esconder.
  const logged = await Promise.resolve(
    db.from('events').insert({ user_id: userId, name: PROBE_EVENT, path: '/api/admin/engine-test', metadata: { endpoint: model, seconds, est_usd, request_id: requestId } }),
  ).then((r) => !(r as { error?: unknown } | null)?.error, () => false)
  if (!logged) console.error('[engine-test probe] evento não gravado; o teto do dia não vê este pedido:', requestId)
  return NextResponse.json({ model, request_id: requestId, est_usd, day_total_usd: fromUnits(spent + estUnits), ...(logged ? {} : { warning: 'event_not_logged' }) })
}

async function probeGet(req: NextRequest) {
  const model = req.nextUrl.searchParams.get('endpoint') ?? ''
  const requestId = (req.nextUrl.searchParams.get('request_id') ?? '').trim()
  if (!probeEndpointFrom(model) || !/^[0-9a-f-]{20,64}$/i.test(requestId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  if (!falReady()) return NextResponse.json({ error: 'fal_unavailable' }, { status: 503 })
  try {
    const st = (await fal.queue.status(model, { requestId })) as { status?: string }
    if (st.status !== 'COMPLETED') return NextResponse.json({ status: st.status ?? 'UNKNOWN', video_url: null })
    const res = (await fal.queue.result(model, { requestId })) as { data?: { video?: { url?: string } } }
    return NextResponse.json({ status: 'COMPLETED', model, video_url: res.data?.video?.url ?? null })
  } catch (e) {
    return NextResponse.json({ status: 'failed', error: falDetail(e).slice(0, 300) })
  }
}

export async function POST(req: NextRequest) {
  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (req.nextUrl.searchParams.get('probe') === '1') return probePost(req) // KINEO-SONDA-MOTORES-2311
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
  if (req.nextUrl.searchParams.get('engine') === 'probe') return probeGet(req) // KINEO-SONDA-MOTORES-2311
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
