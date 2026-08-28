// KINEO-STRANDED-2026-08-18/19 — "o vídeo continua renderizando mesmo com a
// aba fechada" (ordem do fundador, noite de 18/08). Duas gerações do mesmo
// arquivo na mesma noite:
//
// V1 (22h): detectava o render órfão e mandava e-mail "one click to finish".
// V2 (madrugada, ESTE arquivo): o servidor TERMINA O FILME SOZINHO.
//
// O ciclo completo, a cada 15 min:
//   1. Claims cinematográficos `settled` (12min-20h) SEM compose invocado
//      (sem metadata.render_id) → confere no fal se TODAS as cenas terminaram
//      → autoriza as URLs no claim (authorizeCinematicCompletedUrls — a MESMA
//      função assinada que o poller do cliente usa; a cadeia de segurança não
//      muda) → reconstrói o payload de compose a partir da RESPOSTA guardada
//      no claim (hash-verificada) → invoca /api/compose EM PROCESSO no modo
//      serviço (Bearer CRON_SECRET + x-kineo-service-user; ver
//      KINEO-SERVICE-FINISH nas duas rotas).
//   2. Claims COM render_id e vídeo ainda não completo → consulta
//      /api/compose/status em modo serviço (a própria rota persiste o vídeo
//      quando a Creatomate termina) → quando o vídeo existe, e-mail
//      "Your video is ready 🎬" com link direto (1× por geração).
//   3. Compose falhou 2× → fallback: o e-mail de resgate da V1 ("one click
//      to finish"), 1× por geração — nunca fica pior que a V1.
//
// Guard rails: CRON_SECRET fail-closed · máx 3 composes/rodada (TTS é pesado
// e divide os 300s do cron) · dedupe por eventos (stranded_compose_attempt /
// stranded_ready_sent / stranded_rescue_sent) · pula opt-out, contas
// internas, descartáveis.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { CINEMATIC_CLAIM_EVENT, authorizeCinematicCompletedUrls, loadVerifiedCinematicClaim } from '@/lib/cinematic/claim'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { POST as composePost } from '@/app/api/compose/route'
import { GET as composeStatusGet } from '@/app/api/compose/status/[renderId]/route'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const RESCUE_EVENT = 'stranded_rescue_sent'
const ATTEMPT_EVENT = 'stranded_compose_attempt'
const READY_EVENT = 'stranded_ready_sent'
// KINEO-STRANDED-LOOP-2026-08-19 — o compose NAO grava render_id no metadata
// do claim (a leitura md.render_id nunca disparava a fase 2; o cron re-compos
// o mesmo gen a cada rodada ate o teto — 45 attempts na madrugada, zero email
// ready). Marcador PROPRIO: quando NOS compomos com sucesso, gravamos este
// evento com o render_id da resposta — a fase 2 lê daqui, nao do claim.
const COMPOSED_EVENT = 'stranded_composed'
// ⚠️ KINEO-STRANDED-FAST-2026-08-20 — O MOTOR MAIS USADO NÃO TINHA RESGATE.
// Este cron nasceu olhando SÓ o claim cinematográfico. Só que o Kineo 1
// (fast) — 281 dos 410 vídeos da semana — não passa por ele: ele grava
// `compose_submission_claim`. Resultado medido hoje: 32 renders de 26 PESSOAS
// em 7 dias foram entregues ao Creatomate, ficaram prontos lá, e nunca
// chegaram ao cliente, porque quem persiste o vídeo é o polling da ABA. A
// pessoa fechou o navegador e o vídeo dela morreu pronto na prateleira.
// É o pior tipo de perda que existe: o custo já foi pago, o produto já
// existe, e o cliente foi embora achando que não funcionou.
const FAST_READY_EVENT = 'stranded_fast_ready_sent'
const MAX_FAST_PER_RUN = 25
const MIN_AGE_MS = 12 * 60 * 1000
const MAX_AGE_MS = 20 * 60 * 60 * 1000
const MAX_COMPOSE_PER_RUN = 3
const MAX_COMPOSE_ATTEMPTS = 2

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

function isInternalOrJunkEmail(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') || e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') || e.startsWith('test') ||
    e.includes('mailinator') || e.includes('yopmail') || e.includes('tempmail') ||
    e.endsWith('@hutdot.com') || e.endsWith('@beiwoh.com') || e.endsWith('@playboot.com') ||
    e.endsWith('@lanvos.com') || e.endsWith('@minitts.net') || e.endsWith('@dysonc.com')
  )
}

type ClipResult = { requestId: string; model: string; url: string }

/**
 * KINEO-STRANDED-PARTIAL-2026-08-19 — antes: exigia TODAS as cenas COMPLETED
 * e devolvia null a qualquer imperfeição. Isso é MAIS RÍGIDO que o pipeline do
 * cliente, que compõe com os clipes que sobreviveram (o poller marca o clipe
 * morto como failed e segue). Uma cena com 422 travava o filme inteiro pra
 * sempre — e o refund-sweep depois apagava o claim. Agora:
 *   · cena COMPLETED  → entra no filme
 *   · cena FAILED/422 → é PULADA (mesma decisão do cliente)
 *   · cena ainda IN_QUEUE/IN_PROGRESS → espera a próxima rodada (retorna
 *     'pending', porque compor agora perderia uma cena que VAI chegar)
 * Compõe quando não há nenhuma pendente e sobreviveu pelo menos 60% das cenas
 * (piso do FAILFAST: menos que isso é filme mutilado, melhor estornar).
 */
type ClipCollect =
  | { state: 'ready'; clips: ClipResult[] }
  | { state: 'pending'; done: number; total: number }
  | { state: 'too_few'; done: number; total: number }

async function collectFinishedClips(
  requestIds: Array<string | null>,
  models: string[],
): Promise<ClipCollect> {
  const falKey = process.env.FAL_KEY
  if (!falKey) return { state: 'pending', done: 0, total: requestIds.length }
  fal.config({ credentials: falKey })
  const out: ClipResult[] = []
  let stillRunning = 0
  let submitted = 0
  for (let i = 0; i < requestIds.length; i++) {
    const id = requestIds[i]
    const model = models[i]
    if (!id || !model) continue
    submitted++
    try {
      const st = await fal.queue.status(model, { requestId: id })
      const status = (st as { status?: string }).status
      if (status === 'IN_QUEUE' || status === 'IN_PROGRESS') { stillRunning++; continue }
      if (status !== 'COMPLETED') continue // FAILED → pula, como o cliente faz
      const res = await fal.queue.result(model, { requestId: id })
      const data = ((res as { data?: unknown }).data ?? res) as {
        video?: { url?: string }
        output?: { video?: { url?: string } }
      }
      const url = data?.video?.url ?? data?.output?.video?.url ?? null
      if (url) out.push({ requestId: id, model, url })
    } catch (e) {
      // 422/400 = clipe morto no provedor → pula. Erro de transporte também
      // cai aqui; a próxima rodada re-checa (o clipe fica de fora só se
      // continuar inacessível, e o piso de 60% protege o filme).
      const status = typeof (e as { status?: unknown })?.status === 'number' ? (e as { status: number }).status : null
      if (status !== 422 && status !== 400) stillRunning++
    }
  }
  if (stillRunning > 0) return { state: 'pending', done: out.length, total: submitted }
  if (out.length === 0 || out.length < Math.ceil(submitted * 0.6)) {
    return { state: 'too_few', done: out.length, total: submitted }
  }
  return { state: 'ready', clips: out }
}

function serviceHeaders(userId: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${process.env.CRON_SECRET}`,
    'x-kineo-service-user': userId,
  }
}

function rescueText(finishUrl: string): string {
  return `Hey — your AI scenes finished rendering. 🎬

You started a video on Kineo and the heavy part is done: every scene came out of the engine and is waiting for you. One click finishes the film — voiceover, captions and music are assembled in about two minutes while you watch.

Finish your video: ${finishUrl}

— Kineo`
}

function rescueHtml(finishUrl: string, userId: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p style="font-size:18px"><b>Your AI scenes finished rendering 🎬</b></p>
  <p>You started a video on Kineo and the heavy part is done. One click finishes the film — voiceover, captions and music are assembled in about two minutes while you watch.</p>
  <p style="margin:26px 0"><a href="${finishUrl}" style="background:#2997ff;color:#ffffff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">Finish my video &rarr;</a></p>
  <p style="color:#64748b;font-size:13px">— Kineo</p>
</div>
${emailFooterHtml(userId)}`
}

function readyText(videoUrl: string): string {
  return `Your video is ready. 🎬

You started a film on Kineo and we finished it for you — scenes, voiceover, captions and music, all assembled. Watch and download it here:

${videoUrl}

Post it somewhere? Paste the link in the app afterwards and you get +3 credits back.

— Kineo`
}

function readyHtml(videoUrl: string, userId: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p style="font-size:18px"><b>Your video is ready 🎬</b></p>
  <p>You started a film on Kineo and we finished it for you — scenes, voiceover, captions and music, all assembled.</p>
  <p style="margin:26px 0"><a href="${videoUrl}" style="background:#2997ff;color:#ffffff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">Watch my video &rarr;</a></p>
  <p style="color:#64748b;font-size:13px">Post it somewhere? Paste the link in the app afterwards and you get +3 credits back.</p>
  <p style="color:#64748b;font-size:13px">— Kineo</p>
</div>
${emailFooterHtml(userId)}`
}

async function sendEmail(to: string, userId: string, subject: string, text: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        reply_to: 'joseph@usekineo.com',
        subject,
        text: text + emailFooterText(userId),
        html,
        headers: unsubscribeHeaders(userId),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
  const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

  const now = Date.now()
  const minIso = new Date(now - MAX_AGE_MS).toISOString()
  const maxIso = new Date(now - MIN_AGE_MS).toISOString()

  const { data: claims, error: claimErr } = await admin
    .from('events')
    .select('user_id, session_id, created_at, metadata')
    .eq('name', CINEMATIC_CLAIM_EVENT)
    .gte('created_at', minIso)
    .lte('created_at', maxIso)
    .order('created_at', { ascending: false })
    .limit(200)
  if (claimErr) {
    console.error('[stranded] claim query failed:', claimErr.message)
    return NextResponse.json({ error: 'claim query failed' }, { status: 500 })
  }

  const candidates = (claims ?? []).filter((row) => {
    const md = row.metadata as Record<string, unknown> | null
    return md && md.status === 'settled'
  })
  if (candidates.length === 0) return NextResponse.json({ checked: 0, composed: 0, ready: 0, rescued: 0, note: 'no settled claims in window' })

  // Dedupe/attempt bookkeeping por geração.
  const genIds = candidates.map((c) => c.session_id).filter((s): s is string => !!s)
  const { data: markerRows } = await admin
    .from('events')
    .select('name, session_id, metadata')
    .in('name', [RESCUE_EVENT, ATTEMPT_EVENT, READY_EVENT, COMPOSED_EVENT])
    .in('session_id', genIds.slice(0, 200))
  const rescued = new Set<string>()
  const readySent = new Set<string>()
  const attempts = new Map<string, number>()
  const composedRender = new Map<string, string | null>()
  for (const m of markerRows ?? []) {
    const sid = m.session_id as string | null
    if (!sid) continue
    if (m.name === RESCUE_EVENT) rescued.add(sid)
    else if (m.name === READY_EVENT) readySent.add(sid)
    else if (m.name === ATTEMPT_EVENT) attempts.set(sid, (attempts.get(sid) ?? 0) + 1)
    else if (m.name === COMPOSED_EVENT) {
      const rid = (m as { metadata?: { render_id?: unknown } }).metadata?.render_id
      composedRender.set(sid, typeof rid === 'string' && rid.length > 0 ? rid : null)
    }
  }

  let checked = 0
  let composed = 0
  let ready = 0
  let rescuedCount = 0
  const results: Array<{ generation: string; outcome: string }> = []

  for (const claim of candidates) {
    const genId = claim.session_id as string | null
    const userId = claim.user_id as string | null
    if (!genId || !userId) continue
    const md = claim.metadata as Record<string, unknown>
    checked++
    const gen8 = genId.slice(0, 8)

    // Perfil (e-mail para os avisos; contas internas ainda GANHAM o finish —
    // só não recebem e-mail).
    const { data: prof } = await admin
      .from('profiles')
      .select('email, email_opted_out')
      .eq('id', userId)
      .maybeSingle()
    const email = prof?.email ?? ''
    const mayEmail = !!email && !prof?.email_opted_out && !isInternalOrJunkEmail(email)

    const claimRenderId = typeof md.render_id === 'string' && md.render_id.length > 0 ? md.render_id : null
    const ourRenderId = composedRender.has(genId) ? composedRender.get(genId) ?? null : null
    const weComposed = composedRender.has(genId)
    const renderId = ourRenderId ?? claimRenderId

    // O usuário terminou SOZINHO (voltou, resume completou)? Video completed
    // sem marcador nosso = ele estava presente e JA VIU — não mandar email.
    if (!weComposed && !claimRenderId) {
      const { data: selfDone } = await admin
        .from('videos')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', claim.created_at as string)
        .limit(1)
      if ((selfDone ?? []).length > 0) {
        results.push({ generation: gen8, outcome: 'user_finished_themselves' })
        continue
      }
    }

    if (weComposed || renderId) {
      // ── Fase 2: compose já existe — empurra o status e avisa quando pronto ──
      if (readySent.has(genId)) { results.push({ generation: gen8, outcome: 'already_notified' }); continue }
      if (!renderId) { results.push({ generation: gen8, outcome: 'composed_render_id_unknown' }); continue }
      try {
        const statusReq = new NextRequest(`${APP_URL}/api/compose/status/${renderId}`, {
          headers: serviceHeaders(userId),
        })
        await composeStatusGet(statusReq, { params: { renderId } })
      } catch (e) {
        console.warn(`[stranded] status poke failed for ${gen8}:`, e instanceof Error ? e.message : String(e))
      }
      const { data: vid } = await admin
        .from('videos')
        .select('id, status, video_url, final_video_url')
        .eq('user_id', userId)
        .eq('render_id', renderId)
        .maybeSingle()
      const finalUrl = (vid?.final_video_url ?? vid?.video_url ?? '') as string
      if (vid?.status === 'completed' && finalUrl) {
        if (mayEmail) {
          const ok = await sendEmail(email, userId, 'Your video is ready 🎬', readyText(`${APP_URL}/history?utm_source=stranded_ready`), readyHtml(`${APP_URL}/history?utm_source=stranded_ready`, userId))
          if (ok) {
            await admin.from('events').insert({ user_id: userId, name: READY_EVENT, session_id: genId, metadata: { render_id: renderId } })
            ready++
            results.push({ generation: gen8, outcome: 'ready_email_sent' })
          } else results.push({ generation: gen8, outcome: 'ready_email_failed' })
        } else {
          await admin.from('events').insert({ user_id: userId, name: READY_EVENT, session_id: genId, metadata: { render_id: renderId, email: 'skipped' } })
          results.push({ generation: gen8, outcome: 'completed_no_email' })
        }
      } else {
        results.push({ generation: gen8, outcome: 'render_in_progress' })
      }
      continue
    }

    // ── Fase 1: compose nunca foi invocado ──
    const attemptCount = attempts.get(genId) ?? 0
    if (attemptCount >= MAX_COMPOSE_ATTEMPTS) {
      // Fallback V1: e-mail de resgate (1× por geração, pra sempre)
      if (!rescued.has(genId) && mayEmail) {
        const ok = await sendEmail(email, userId, 'Your AI scenes are ready — one click to finish your video 🎬', rescueText(`${APP_URL}/generate?utm_source=stranded_rescue`), rescueHtml(`${APP_URL}/generate?utm_source=stranded_rescue`, userId))
        if (ok) {
          await admin.from('events').insert({ user_id: userId, name: RESCUE_EVENT, session_id: genId, metadata: {} })
          rescuedCount++
          results.push({ generation: gen8, outcome: 'rescue_email_sent' })
        } else results.push({ generation: gen8, outcome: 'rescue_email_failed' })
      } else {
        results.push({ generation: gen8, outcome: 'compose_gave_up' })
      }
      continue
    }
    if (composed >= MAX_COMPOSE_PER_RUN) { results.push({ generation: gen8, outcome: 'deferred_budget' }); continue }

    const requestIds = Array.isArray(md.fal_request_ids) ? (md.fal_request_ids as Array<string | null>) : []
    const models = Array.isArray(md.fal_models) ? (md.fal_models as string[]) : []
    if (requestIds.length === 0) { results.push({ generation: gen8, outcome: 'no_request_ids' }); continue }

    const collected = await collectFinishedClips(requestIds, models)
    if (collected.state !== 'ready') {
      // KINEO-STRANDED-DIAG-2026-08-19 — antes esta saída era MUDA: o render
      // do fundador ficou 1h sem um único evento e eu fiquei cego. Agora todo
      // pulo deixa rastro no log com a contagem real de cenas.
      console.log(`[stranded] gen=${gen8} skip=${collected.state} clips=${collected.done}/${collected.total}`)
      results.push({ generation: gen8, outcome: `${collected.state}:${collected.done}/${collected.total}` })
      continue
    }
    const clips = collected.clips

    // Autoriza as URLs no claim pela MESMA função assinada do poller.
    const authorized = await authorizeCinematicCompletedUrls({
      db: admin,
      secret,
      userId,
      generationId: genId,
      completed: clips,
    })
    if (!authorized.ok) { results.push({ generation: gen8, outcome: `authorize_failed:${authorized.error}`.slice(0, 60) }); continue }

    // Recarrega o claim verificado: response (hash-conferida) + URLs na ordem.
    const reloaded = await loadVerifiedCinematicClaim({ db: admin, secret, userId, generationId: genId })
    if (!reloaded.ok || !reloaded.claim) { results.push({ generation: gen8, outcome: 'reload_failed' }); continue }
    const vClaim = reloaded.claim
    const response = (vClaim.response ?? {}) as Record<string, unknown>
    const clipUrls = vClaim.authorizedCompletedUrls.filter((u): u is string => typeof u === 'string' && u.length > 0)
    if (clipUrls.length === 0) { results.push({ generation: gen8, outcome: 'no_authorized_urls' }); continue }

    const sceneSeconds = Array.isArray(response.scene_seconds) ? (response.scene_seconds as number[]) : null
    const duration =
      typeof response.duration === 'number' && response.duration > 0
        ? response.duration
        : sceneSeconds
          ? Math.max(15, Math.min(90, Math.round(sceneSeconds.reduce((a, b) => a + (Number(b) || 0), 0))))
          : 60
    const payload: Record<string, unknown> = {
      generationId: genId,
      clip_urls: clipUrls,
      voiceover_script: typeof response.voiceover_script === 'string' ? response.voiceover_script : '',
      scene_captions: Array.isArray(response.scene_captions) ? response.scene_captions : [],
      duration,
      topic: typeof response.topic === 'string' ? response.topic : undefined,
      quality: vClaim.quality,
      ...(Array.isArray(response.scene_engines) && response.scene_engines.length > 0
        ? {
            scene_engines: response.scene_engines,
            scene_narrations: response.scene_narrations ?? [],
            scene_seconds: response.scene_seconds ?? [],
            scene_dialogues: response.scene_dialogues ?? [],
          }
        : {}),
    }

    await admin.from('events').insert({ user_id: userId, name: ATTEMPT_EVENT, session_id: genId, metadata: { attempt: attemptCount + 1 } })
    try {
      const composeReq = new NextRequest(`${APP_URL}/api/compose`, {
        method: 'POST',
        headers: serviceHeaders(userId),
        body: JSON.stringify(payload),
      })
      const res = await composePost(composeReq)
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
      if (res.ok) {
        composed++
        const rid =
          (typeof json?.renderId === 'string' && json.renderId) ||
          (typeof json?.render_id === 'string' && json.render_id) ||
          (typeof (json?.render as { id?: unknown } | undefined)?.id === 'string' && (json?.render as { id: string }).id) ||
          null
        await admin.from('events').insert({ user_id: userId, name: COMPOSED_EVENT, session_id: genId, metadata: { render_id: rid } })
        console.log(`[stranded] server-finish composed gen=${gen8} renderId=${rid ?? '?'}`)
        results.push({ generation: gen8, outcome: 'composed_server_side' })
      } else if (res.status === 409 && json?.pending === true) {
        results.push({ generation: gen8, outcome: 'compose_pending_race' })
      } else {
        console.error(`[stranded] compose failed gen=${gen8}: ${res.status} ${JSON.stringify(json).slice(0, 200)}`)
        results.push({ generation: gen8, outcome: `compose_error_${res.status}` })
      }
    } catch (e) {
      console.error(`[stranded] compose threw gen=${gen8}:`, e instanceof Error ? e.message : String(e))
      results.push({ generation: gen8, outcome: 'compose_threw' })
    }
  }

  // ═══ FASE 3 — RESGATE DO CAMINHO COMPOSE (Kineo 1 e qualquer motor) ═══════
  // Mesma mecânica da Fase 2, outra porta de entrada: aqui o compose JÁ foi
  // submetido (o claim tem render_id), então nunca há re-submissão nem custo
  // novo de fornecedor — só cutucamos o status, que faz a própria rota
  // persistir o vídeo, e avisamos a pessoa. Barato e idempotente.
  let fastReady = 0
  try {
    const { data: fastClaims } = await admin
      .from('events')
      .select('user_id, session_id, created_at, metadata')
      .eq('name', 'compose_submission_claim')
      .gte('created_at', minIso)
      .lte('created_at', maxIso)
      .order('created_at', { ascending: false })
      .limit(200)

    const fastGenIds = (fastClaims ?? []).map((c) => c.session_id).filter((x): x is string => !!x)
    const { data: fastMarkers } = fastGenIds.length > 0
      ? await admin.from('events').select('session_id').eq('name', FAST_READY_EVENT).in('session_id', fastGenIds.slice(0, 200))
      : { data: [] as Array<{ session_id: string | null }> }
    const alreadyFast = new Set((fastMarkers ?? []).map((m) => m.session_id as string))

    for (const row of fastClaims ?? []) {
      if (fastReady >= MAX_FAST_PER_RUN) break
      const genId = row.session_id as string | null
      const userId = row.user_id as string | null
      const md = row.metadata as Record<string, unknown> | null
      if (!genId || !userId || !md) continue
      if (alreadyFast.has(genId)) continue
      const renderId = typeof md.render_id === 'string' ? md.render_id : null
      if (!renderId) continue

      // Já existe vídeo para este render? Então a aba da pessoa deu conta.
      const { data: existing } = await admin
        .from('videos')
        .select('id, status, video_url, final_video_url')
        .eq('user_id', userId)
        .eq('render_id', renderId)
        .maybeSingle()
      if (existing?.status === 'completed') continue

      // Cutuca o status em modo serviço — a rota persiste o vídeo se a
      // Creatomate terminou. Sem custo de fornecedor: o render já foi pago.
      try {
        const statusReq = new NextRequest(`${APP_URL}/api/compose/status/${renderId}`, { headers: serviceHeaders(userId) })
        await composeStatusGet(statusReq, { params: { renderId } })
      } catch (e) {
        console.warn(`[stranded-fast] status poke failed ${renderId.slice(0, 8)}:`, e instanceof Error ? e.message : String(e))
        continue
      }

      const { data: vid } = await admin
        .from('videos')
        .select('id, status, video_url, final_video_url')
        .eq('user_id', userId)
        .eq('render_id', renderId)
        .maybeSingle()
      const finalUrl = (vid?.final_video_url ?? vid?.video_url ?? '') as string
      if (vid?.status !== 'completed' || !finalUrl) continue

      const { data: prof } = await admin.from('profiles').select('email, email_opted_out').eq('id', userId).maybeSingle()
      const email = (prof?.email ?? '') as string
      const mayEmailFast = !!email && !prof?.email_opted_out && !isInternalOrJunkEmail(email)
      if (mayEmailFast) {
        const link = `${APP_URL}/history?utm_source=stranded_fast_ready`
        const ok = await sendEmail(email, userId, 'Your video is ready 🎬', readyText(link), readyHtml(link, userId))
        if (ok) {
          await admin.from('events').insert({ user_id: userId, name: FAST_READY_EVENT, session_id: genId, metadata: { render_id: renderId } })
          fastReady++
          results.push({ generation: genId.slice(0, 8), outcome: 'fast_ready_email_sent' })
        }
      } else {
        await admin.from('events').insert({ user_id: userId, name: FAST_READY_EVENT, session_id: genId, metadata: { render_id: renderId, email: 'skipped' } })
        results.push({ generation: genId.slice(0, 8), outcome: 'fast_recovered_no_email' })
      }
    }
  } catch (e) {
    console.error('[stranded-fast] phase failed:', e instanceof Error ? e.message : String(e))
  }

  console.log(`[stranded] checked=${checked} composed=${composed} ready=${ready} rescued=${rescuedCount} fastReady=${fastReady}`)
  // ═══ KINEO-LINHA-PERDIDA-2026-08-28 — entrega sem linha na biblioteca ════
  //
  // O CASO QUE REVELOU: omargamer2130, 27/08 20:31. O funil dele está
  // PERFEITO nos eventos — claim, checkpoint, generate_completed,
  // video_ready_viewed, até o convite de compartilhar. Ele ASSISTIU o vídeo.
  // Mas o insert canônico em `videos` falhou UMA vez naquela noite (o
  // [history] insert FAILED foi para um log da Vercel que expira) e não
  // existia segunda chance: o vídeo dele sumiu do My Videos para sempre, e o
  // painel ainda o listava como "cobrado sem entrega". Um cliente feliz na
  // hora, roubado depois.
  //
  // O PASSE: toda entrega das últimas 72h (generate_completed com render_id)
  // que não tem linha em `videos` ganha um poke no MESMO status route que o
  // resgate fast usa logo acima — a rota refaz o GET no Creatomate e roda o
  // insert canônico, que é idempotente (videos_render_id_unique). Custo de
  // fornecedor: zero (o render já foi pago e o GET é grátis). O contrato
  // vira: NENHUMA entrega fica sem linha por mais de um ciclo do cron.
  let relinked = 0
  try {
    const { data: doneEvents } = await admin
      .from('events')
      .select('user_id, metadata')
      .eq('name', 'generate_completed')
      .gte('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(500)
    const vistos = new Set<string>()
    for (const ev of doneEvents ?? []) {
      const meta = (ev as { metadata?: Record<string, unknown> }).metadata ?? {}
      const renderId = typeof meta.render_id === 'string' ? meta.render_id : ''
      const userId = (ev as { user_id?: string | null }).user_id ?? ''
      if (!renderId || !userId || vistos.has(renderId)) continue
      vistos.add(renderId)
      const { data: row } = await admin
        .from('videos').select('id').eq('render_id', renderId).limit(1).maybeSingle()
      if (row) continue
      try {
        const statusReq = new NextRequest(`${APP_URL}/api/compose/status/${renderId}`, { headers: serviceHeaders(userId) })
        await composeStatusGet(statusReq, { params: { renderId } })
        const { data: reborn } = await admin
          .from('videos').select('id').eq('render_id', renderId).limit(1).maybeSingle()
        if (reborn) {
          relinked += 1
          await admin.from('events').insert({
            user_id: userId,
            name: 'video_row_relinked',
            path: '/api/cron/finish-stranded-renders',
            metadata: { render_id: renderId, reason: 'delivered_but_row_missing' },
          })
        }
      } catch (e) {
        console.warn(`[relink] poke failed ${renderId.slice(0, 8)}:`, e instanceof Error ? e.message : String(e))
      }
    }
  } catch (e) {
    console.error('[relink] pass failed:', e instanceof Error ? e.message : String(e))
  }

  return NextResponse.json({ checked, composed, ready, rescued: rescuedCount, fastReady, relinked, results })
}
