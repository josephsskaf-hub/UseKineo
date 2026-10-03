// KINEO-PREVIA-CENAS-2026-10-03 — /api/scene-preview: a prévia grátis das cenas (o porquê mora em lib/scenePreview.ts).
// GET  → { eligible, used, left, todayUsed, last }   (o que a tela precisa para abrir; last = a última prévia mostrada)
// POST { idea, language } → { script, scenes: [{ label, text, image }], left }
//
// ORDEM DO SERVIDOR (tudo ANTES de qualquer fornecedor que custe dinheiro):
//   login (401) → interruptor PREVIA_CENAS_PUBLIC (404) → elegível = region_paid_only sem pagar (403) → tamanho da ideia (400)
//   → tetos por conta (1/dia, 3 no total) e global (200/dia) pela contagem das reservas (429) → moderateContent no texto
//   (422/503) → RESERVA gravada (scene_preview_requested, status 'reserved') e RECONTADA em ordem (created_at, id): dois
//   cliques ao mesmo tempo gravam duas reservas e o segundo se vê além do teto → recusado ('busy'/limite).
// Só então: o roteiro pelo MESMO escritor da /api/generate-script (chamada servidor-a-servidor com o cookie da pessoa, alvo
// de 15 s do Seedance 1.5 — o filme que ela vai fazer) e 3–4 imagens FLUX schnell (mesmo slug e entrada do /images),
// conferidas pela moderação de saída e guardadas no nosso storage (persistImage: entram na galeria Images da pessoa).
// Falha de fornecedor marca a reserva 'failed' (a vaga volta) e a recusa diz isso em texto legível. Nada é cobrado.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { persistImage } from '@/lib/imageStore'
import {
  PREVIA_CENAS_PUBLIC,
  PREVIA_COPY,
  PREVIA_COUNTED_STATUSES,
  PREVIA_DAY_MS,
  PREVIA_EVENTS,
  PREVIA_GLOBAL_PER_DAY,
  PREVIA_IDEA_MAX,
  PREVIA_IDEA_MIN,
  PREVIA_IMAGE_MEGAPIXELS,
  PREVIA_IMAGE_SLUG,
  PREVIA_MIN_SCENES,
  PREVIA_PER_ACCOUNT_TOTAL,
  PREVIA_TARGET_SECONDS,
  PREVIA_ENGINE_QUALITY,
  decidePreviaLimits,
  parsePreviaScenes,
  pickPreviaScenes,
  previaEligible,
  previaImageInput,
  previaImagePrompt,
  reservationWins,
  type PreviaProfile,
  type PreviaRefusalReason,
} from '@/lib/scenePreview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }
const SCRIPT_TIMEOUT_MS = 40_000
const PATH = '/api/scene-preview'
const STATUS: Record<PreviaRefusalReason, number> = {
  not_eligible: 403, idea_too_short: 400, idea_too_long: 400, daily_limit: 429, total_limit: 429, global_limit: 429,
  moderation: 422, moderation_unavailable: 503, script_failed: 502, images_failed: 502, busy: 409,
}

function copyFor(language: string) {
  return language === 'pt' ? PREVIA_COPY.pt : language === 'es' ? PREVIA_COPY.es : PREVIA_COPY.en
}
function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}

async function refuse(userId: string | null, reason: PreviaRefusalReason, language: string, extra?: Record<string, unknown>) {
  if (userId) await writeServerEvent({ name: PREVIA_EVENTS.refused, userId, path: PATH, metadata: { reason, ...(extra ?? {}) } })
  return NextResponse.json({ error: copyFor(language).refused[reason], reason }, { status: STATUS[reason], headers: NO_STORE })
}

/** Reservas que contam (reserved/shown), em ordem; `since` = janela de 24 h. */
async function reservationIds(db: SupabaseClient, args: { userId?: string; since?: string; limit: number }): Promise<string[] | null> {
  let q = db.from('events').select('id').eq('name', PREVIA_EVENTS.requested).in('metadata->>status', [...PREVIA_COUNTED_STATUSES])
  if (args.userId) q = q.eq('user_id', args.userId)
  if (args.since) q = q.gte('created_at', args.since)
  const { data, error } = await q.order('created_at', { ascending: true }).order('id', { ascending: true }).limit(args.limit)
  if (error) return null
  return (data ?? []).map((r) => String((r as { id: unknown }).id))
}

async function setReservation(db: SupabaseClient, id: string, metadata: Record<string, unknown>) {
  await db.from('events').update({ metadata }).eq('id', id).eq('name', PREVIA_EVENTS.requested)
}

async function loadProfile(userId: string): Promise<PreviaProfile | null> {
  const { data } = await createClient().from('profiles').select('trial_status, has_paid, plan, video_credits').eq('id', userId).maybeSingle()
  return (data as PreviaProfile | null) ?? null
}

export async function GET() {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: NO_STORE })
  if (!PREVIA_CENAS_PUBLIC) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE })
  const profile = await loadProfile(user.id)
  const db = admin()
  const eligible = previaEligible(profile)
  if (!db) return NextResponse.json({ eligible, used: null, left: null, todayUsed: null, last: null }, { headers: NO_STORE })
  const all = await reservationIds(db, { userId: user.id, limit: 50 })
  const day = await reservationIds(db, { userId: user.id, since: new Date(Date.now() - PREVIA_DAY_MS).toISOString(), limit: 50 })
  const lastRow = await db.from('events').select('metadata, created_at').eq('user_id', user.id).eq('name', PREVIA_EVENTS.shown).order('created_at', { ascending: false }).limit(1)
  const lastMeta = (lastRow.data?.[0] as { metadata?: { script?: unknown; scenes?: unknown; idea?: unknown; language?: unknown } } | undefined)?.metadata ?? null
  const used = all ? all.length : null
  return NextResponse.json({
    eligible,
    used,
    left: used === null ? null : Math.max(0, PREVIA_PER_ACCOUNT_TOTAL - used),
    todayUsed: day ? day.length : null,
    last: lastMeta && typeof lastMeta.script === 'string' ? { script: lastMeta.script, scenes: Array.isArray(lastMeta.scenes) ? lastMeta.scenes : [], idea: typeof lastMeta.idea === 'string' ? lastMeta.idea : '', language: typeof lastMeta.language === 'string' ? lastMeta.language : 'en' } : null,
  }, { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: NO_STORE })
  if (!PREVIA_CENAS_PUBLIC) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE })
  const body = (await req.json().catch(() => null)) as { idea?: unknown; language?: unknown } | null
  const language = typeof body?.language === 'string' && /^[a-z]{2}$/.test(body.language) ? body.language : 'en'
  const idea = typeof body?.idea === 'string' ? body.idea.replace(/\s+/g, ' ').trim() : ''

  // 1. Quem pode: a mesma régua do aviso region_paid_only (sem pagar, plano grátis).
  const profile = await loadProfile(user.id)
  if (!previaEligible(profile)) return refuse(user.id, 'not_eligible', language)
  // 2. Tamanho da ideia.
  if (idea.length < PREVIA_IDEA_MIN) return refuse(user.id, 'idea_too_short', language)
  if (idea.length > PREVIA_IDEA_MAX) return refuse(user.id, 'idea_too_long', language)
  const db = admin()
  if (!db) return refuse(user.id, 'busy', language, { cause: 'service_role_missing' })
  // 3. Tetos (contagem das reservas que contam).
  const since = new Date(Date.now() - PREVIA_DAY_MS).toISOString()
  const [acctAll, acctDay, globalDay] = await Promise.all([
    reservationIds(db, { userId: user.id, limit: 50 }),
    reservationIds(db, { userId: user.id, since, limit: 50 }),
    reservationIds(db, { since, limit: PREVIA_GLOBAL_PER_DAY + 100 }),
  ])
  if (!acctAll || !acctDay || !globalDay) return refuse(user.id, 'busy', language, { cause: 'count_failed' })
  const limit = decidePreviaLimits({ accountTotal: acctAll.length, accountLastDay: acctDay.length, globalLastDay: globalDay.length })
  if (limit) return refuse(user.id, limit, language)
  // 4. Moderação do texto, antes de qualquer fornecedor.
  const check = await moderateContent({ surface: 'images', stage: 'input', userId: user.id, text: idea, meta: { feature: 'scene_preview' } })
  if (!check.ok) return refuse(user.id, check.reason === 'unavailable' ? 'moderation_unavailable' : 'moderation', language, { moderation: check.reason })

  // 5. Reserva + recontagem em ordem (a corrida de dois cliques termina aqui).
  const ins = await db.from('events').insert({ name: PREVIA_EVENTS.requested, user_id: user.id, path: PATH, metadata: { status: 'reserved', language, idea_chars: idea.length } }).select('id').single()
  if (ins.error || !ins.data) return refuse(user.id, 'busy', language, { cause: 'reserve_failed' })
  const myId = String((ins.data as { id: unknown }).id)
  const [aAll, aDay, gDay] = await Promise.all([
    reservationIds(db, { userId: user.id, limit: 50 }),
    reservationIds(db, { userId: user.id, since, limit: 50 }),
    reservationIds(db, { since, limit: PREVIA_GLOBAL_PER_DAY + 100 }),
  ])
  const lost = aAll && aDay && gDay ? reservationWins({ myId, accountAllIds: aAll, accountDayIds: aDay, globalDayIds: gDay }) : 'busy'
  if (lost) {
    await setReservation(db, myId, { status: 'refused', reason: lost, language, idea_chars: idea.length })
    return refuse(user.id, lost, language, { reservation: myId })
  }
  const fail = async (reason: 'script_failed' | 'images_failed', cause: string) => {
    await setReservation(db, myId, { status: 'failed', reason, cause: cause.slice(0, 160), language, idea_chars: idea.length })
    return refuse(user.id, reason, language, { reservation: myId, cause: cause.slice(0, 160) })
  }

  // 6. Roteiro: o MESMO escritor do Studio (/api/generate-script), alvo de 15 s no Seedance 1.5.
  let script = ''
  try {
    const res = await fetch(`${req.nextUrl.origin}/api/generate-script`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
      body: JSON.stringify({ topic: idea, language, engine: PREVIA_ENGINE_QUALITY, targetSeconds: PREVIA_TARGET_SECONDS }),
      signal: AbortSignal.timeout(SCRIPT_TIMEOUT_MS),
      cache: 'no-store',
    })
    const j = (await res.json().catch(() => null)) as { script?: unknown; error?: unknown } | null
    if (!res.ok || typeof j?.script !== 'string' || !j.script.trim()) return fail('script_failed', `generate-script ${res.status}`)
    script = j.script.trim()
  } catch (e) {
    return fail('script_failed', e instanceof Error ? e.message : String(e))
  }
  const scenes = pickPreviaScenes(parsePreviaScenes(script))
  if (scenes.length < PREVIA_MIN_SCENES) return fail('script_failed', `scenes ${scenes.length}`)

  // 7. Imagens: FLUX schnell em paralelo; moderação de saída; cópia no nosso storage.
  const images = await Promise.all(scenes.map(async (scene) => {
    try {
      const prompt = previaImagePrompt(scene)
      const r = (await fal.subscribe(PREVIA_IMAGE_SLUG, { input: previaImageInput(prompt) })) as { data?: { images?: Array<{ url?: string }> }; images?: Array<{ url?: string }> }
      const url = r?.data?.images?.[0]?.url ?? r?.images?.[0]?.url ?? null
      if (!url) return null
      const out = await moderateContent({ surface: 'images', stage: 'output', userId: user.id, text: prompt, imageUrls: [url], meta: { feature: 'scene_preview' } })
      if (!out.ok) return null
      return (await persistImage({ userId: user.id, prompt, model: 'schnell', sourceUrl: url })).url
    } catch {
      return null
    }
  }))
  const shown = scenes.map((s, i) => ({ label: s.label, text: s.text, image: images[i] })).filter((s): s is { label: string; text: string; image: string } => typeof s.image === 'string')
  if (shown.length < PREVIA_MIN_SCENES) return fail('images_failed', `images ${shown.length}/${scenes.length}`)

  // 8. Mostrada: a reserva conta para sempre; o evento leva o que é medível do custo (chamadas e megapixels).
  await setReservation(db, myId, { status: 'shown', language, idea_chars: idea.length })
  const left = Math.max(0, PREVIA_PER_ACCOUNT_TOTAL - (aAll?.length ?? PREVIA_PER_ACCOUNT_TOTAL))
  await writeServerEvent({
    name: PREVIA_EVENTS.shown,
    userId: user.id,
    path: PATH,
    metadata: {
      reservation: myId,
      language,
      idea: idea.slice(0, 500),
      script: script.slice(0, 4000),
      scenes: shown,
      images: shown.length,
      image_calls: scenes.length,
      image_model: PREVIA_IMAGE_SLUG,
      image_megapixels: Math.round(scenes.length * PREVIA_IMAGE_MEGAPIXELS * 1000) / 1000,
      script_calls: 1,
      // Custo em US$ = DESCONHECIDO no código: preço por megapixel da fal e por token da OpenAI não são lidos aqui
      // (docs/HANDOFF-ATIVACAO-2026-10-05.md diz onde ler na fatura). Os campos acima são o que a fatura multiplica.
      est_usd: null,
    },
  })
  return NextResponse.json({ script, scenes: shown, left }, { headers: NO_STORE })
}
