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
import type { SupabaseClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { CINEMATIC_CLAIM_EVENT, authorizeCinematicCompletedUrls, loadVerifiedCinematicClaim } from '@/lib/cinematic/claim'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { POST as composePost } from '@/app/api/compose/route'
import { GET as composeStatusGet } from '@/app/api/compose/status/[renderId]/route'

export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'
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
// sprint-assinaturas #7 — um 400 do compose e DETERMINISTICO: com o mesmo codigo
// a 2a tentativa devolve o mesmo 400 (e7f9f000, 02/09: 03:07 e 03:15 UTC, ambos
// compose_error_400 pelo custo do claim x duracao resgatada). So um deploy muda
// isso — e o teto de 2 ja tinha sido gasto ANTES do conserto subir, entao o
// cron desistia do filme (5 cenas prontas e pagas) e mandava o e-mail de
// resgate para um trial que 90s antes clicou em checkout. Quando TODOS os
// desfechos anteriores da geracao sao compose_error_4xx, o teto ganha UMA
// tentativa extra: se o codigo mudou, entrega; se nao, 400 de novo e desiste.
// Custo de fornecedor zero (compose nao re-despacha cena).
const OUTCOME_EVENT = 'stranded_outcome'
const EXTRA_ATTEMPT_AFTER_4XX = 1

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

// ═══ sprint-assinaturas #4 (02/09) — O E-MAIL "YOUR VIDEO IS READY" SAÍA 16
// VEZES PARA A MESMA PESSOA. Medido no banco (externos, desde 20/08): 74
// e-mails DUPLICADOS de "Your video is ready 🎬" para 14 pessoas — uma trial
// (1948c6fa, 01/09) recebeu 16 cópias, uma a cada 15 min, das 09:45 às 13:45;
// outras 14, 14, 13, 7, 5. TODOS os 9 resgates do Kineo 1 (Fase 3) saíram
// repetidos. O dedupe era um lookup EM LOTE (`.in('session_id', [...200 ids])`)
// cujo erro era ignorado (`const { data } = …`) e cujo resultado alimentava um
// Set; quando o lote falha ou vem incompleto, o Set fica vazio e a rodada
// reenvia para todo mundo — e a rodada seguinte de novo, até a geração sair da
// janela de 20h. Primeiro filme entregue + 16 spams = a pior primeira
// impressão possível, no exato minuto em que a pessoa mais perto de assinar.
// Regra nova, antes de QUALQUER envio: consulta DIRETA por esta geração
// (um `.eq`, sem lista), fail-closed — erro na consulta = NÃO envia (perder um
// e-mail custa um clique; mandar 16 custa o cliente). Quando a consulta direta
// acha um marcador que o lote não tinha, grava `stranded_dedupe_miss` com o
// tamanho do lote e o erro do lote, para a próxima rodada ler a causa em SQL.
type DedupeVerdict = { send: boolean; reason: 'clear' | 'already_sent' | 'lookup_failed' }

async function alreadySentDirect(
  admin: SupabaseClient,
  args: { eventName: string; genId: string; userId: string; batchHad: boolean; batchSize: number; batchError: string | null },
): Promise<DedupeVerdict> {
  const { data, error } = await admin
    .from('events')
    .select('id')
    .eq('name', args.eventName)
    .eq('session_id', args.genId)
    .limit(1)
  if (error) {
    console.error(`[stranded] dedupe lookup failed gen=${args.genId.slice(0, 8)} event=${args.eventName}: ${error.message}`)
    return { send: false, reason: 'lookup_failed' }
  }
  const found = (data ?? []).length > 0
  if (found && !args.batchHad) {
    console.warn(`[stranded] dedupe MISS gen=${args.genId.slice(0, 8)} event=${args.eventName} batch=${args.batchSize} batchError=${args.batchError ?? 'none'}`)
    await admin.from('events').insert({
      user_id: args.userId,
      name: 'stranded_dedupe_miss',
      session_id: args.genId,
      path: '/api/cron/finish-stranded-renders',
      metadata: { event: args.eventName, batch_size: args.batchSize, batch_error: args.batchError },
    })
  }
  return found ? { send: false, reason: 'already_sent' } : { send: true, reason: 'clear' }
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
  const { data: markerRows, error: markerErr } = await admin
    .from('events')
    .select('name, session_id, metadata')
    .in('name', [RESCUE_EVENT, ATTEMPT_EVENT, READY_EVENT, COMPOSED_EVENT, OUTCOME_EVENT])
    .in('session_id', genIds.slice(0, 200))
  // sprint-assinaturas #4 — o erro deste lote era engolido; agora vai pro log e
  // viaja no `stranded_dedupe_miss` quando o lookup direto pega o que o lote perdeu.
  const markerBatchError = markerErr ? markerErr.message.slice(0, 200) : null
  if (markerErr) console.error(`[stranded] marker batch lookup failed (${genIds.length} gens): ${markerErr.message}`)
  const rescued = new Set<string>()
  const readySent = new Set<string>()
  const attempts = new Map<string, number>()
  // sprint-assinaturas #7 — desfechos por geração: só compose_error_4xx libera
  // a tentativa extra; qualquer outro desfecho (ou nenhum) mantém o teto de 2.
  const outcomes = new Map<string, { total: number; only4xx: boolean }>()
  const composedRender = new Map<string, string | null>()
  for (const m of markerRows ?? []) {
    const sid = m.session_id as string | null
    if (!sid) continue
    if (m.name === RESCUE_EVENT) rescued.add(sid)
    else if (m.name === READY_EVENT) readySent.add(sid)
    else if (m.name === ATTEMPT_EVENT) attempts.set(sid, (attempts.get(sid) ?? 0) + 1)
    else if (m.name === OUTCOME_EVENT) {
      const oc = String((m as { metadata?: { outcome?: unknown } }).metadata?.outcome ?? '')
      const prev = outcomes.get(sid) ?? { total: 0, only4xx: true }
      outcomes.set(sid, { total: prev.total + 1, only4xx: prev.only4xx && /^compose_error_4\d\d$/.test(oc) })
    }
    else if (m.name === COMPOSED_EVENT) {
      const rid = (m as { metadata?: { render_id?: unknown } }).metadata?.render_id
      composedRender.set(sid, typeof rid === 'string' && rid.length > 0 ? rid : null)
    }
  }

  let checked = 0
  let composed = 0
  let ready = 0
  let rescuedCount = 0
  // sprint-assinaturas #17 — `error` = a frase que o compose devolveu. Ate hoje
  // so o status viajava no stranded_outcome e a causa do 503 do wummm709 so
  // existia no log da Vercel (que expira). Agora fica no banco, ao lado.
  const results: Array<{ generation: string; outcome: string; error?: string }> = []

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

    // O usuário terminou SOZINHO (voltou, resume completou)? Então ele estava
    // presente e JÁ VIU — não compor de novo, não mandar e-mail.
    //
    // ═══ sprint-assinaturas #3 (02/09) — "TERMINOU SOZINHO" ERA "FEZ QUALQUER
    // VÍDEO". A pergunta antiga era `videos.status=completed AND created_at >=
    // claim.created_at` para o MESMO USUÁRIO — sem olhar QUAL vídeo. Quem tinha
    // um cinematic encalhado (cenas prontas na fal, compose nunca chamado) e
    // fazia OUTRO vídeo enquanto esperava — um Kineo 1 de 3cr, por exemplo —
    // fazia o cron declarar o encalhado como entregue, pular a Fase 1 para
    // sempre, e o refund-sweep estornar 2h depois com
    // 'cinematic_abandoned_no_delivery'. Medido (14d, externos): 4 dos 21
    // estornos têm exatamente esta assinatura — authorized_completed_urls 0/N
    // (o cron NUNCA conferiu a fal) e 1-2 vídeos completed do mesmo dono depois
    // do claim. Caso ba254eff (01/09 23:11, trial do chatgpt.com, celular):
    // Seedance 19cr aceito 6/6 às 23:12:52, o banner do ChatGPT o levou para
    // /studio às 23:13:47 (poll morreu), voltou às 23:25 e fez um Kineo 1 que
    // saiu às 23:28 — a partir daí o cron pulou o Seedance 8 rodadas seguidas
    // até o estorno de 01:31. Ele viu um vídeo de 3cr e perdeu o de 19cr; o
    // produto pagou a fal pelos dois. A pergunta certa é se ESTA geração foi
    // composta: o compose da aba grava `compose_submission_claim` com
    // session_id = generation_id (é o único caminho de compose para um claim
    // cinematográfico sem marcador nosso). Existe → a pessoa compôs sozinha;
    // não existe → o filme nunca foi montado, e outros vídeos do dono não
    // provam nada sobre este. Trava: o compose que NÓS invocamos (Fase 1)
    // também grava esse claim; se já houve tentativa nossa, a pergunta não se
    // aplica — o teto de 2 tentativas e o e-mail de resgate cuidam desse ramo.
    if (!weComposed && !claimRenderId && (attempts.get(genId) ?? 0) === 0) {
      const { data: ownCompose, error: ownComposeErr } = await admin
        .from('events')
        .select('id')
        .eq('name', 'compose_submission_claim')
        .eq('session_id', genId)
        .limit(1)
      if (ownComposeErr) console.warn(`[stranded] own-compose lookup failed gen=${gen8}:`, ownComposeErr.message)
      if ((ownCompose ?? []).length > 0) {
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
          // sprint-assinaturas #4 — confirmação direta antes de enviar (fail-closed).
          const verdict = await alreadySentDirect(admin, { eventName: READY_EVENT, genId, userId, batchHad: readySent.has(genId), batchSize: (markerRows ?? []).length, batchError: markerBatchError })
          if (!verdict.send) { results.push({ generation: gen8, outcome: verdict.reason === 'already_sent' ? 'already_notified_direct' : 'ready_dedupe_lookup_failed' }); continue }
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
    const oc = outcomes.get(genId)
    const attemptCap = oc && oc.total >= MAX_COMPOSE_ATTEMPTS && oc.only4xx
      ? MAX_COMPOSE_ATTEMPTS + EXTRA_ATTEMPT_AFTER_4XX
      : MAX_COMPOSE_ATTEMPTS
    if (attemptCount >= MAX_COMPOSE_ATTEMPTS && attemptCount < attemptCap) {
      console.log(`[stranded] gen=${gen8} extra attempt after ${oc?.total ?? 0}x compose_error_4xx (cap ${attemptCap})`)
    }
    if (attemptCount >= attemptCap) {
      // Fallback V1: e-mail de resgate (1× por geração, pra sempre)
      if (!rescued.has(genId) && mayEmail) {
        // sprint-assinaturas #4 — confirmação direta antes de enviar (fail-closed).
        const verdict = await alreadySentDirect(admin, { eventName: RESCUE_EVENT, genId, userId, batchHad: false, batchSize: (markerRows ?? []).length, batchError: markerBatchError })
        if (!verdict.send) { results.push({ generation: gen8, outcome: verdict.reason === 'already_sent' ? 'rescue_already_sent_direct' : 'rescue_dedupe_lookup_failed' }); continue }
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
    const onlyUrls = (list: unknown): string[] =>
      Array.isArray(list) ? list.filter((u): u is string => typeof u === 'string' && u.length > 0) : []
    let clipUrls = onlyUrls(vClaim.authorizedCompletedUrls)
    if (clipUrls.length === 0) {
      // ═══ sprint-assinaturas #14 (02/09) — shaunish2097 (TAAFT, 03:37 UTC):
      // Seedance 19cr aceito 5/5, clicou no checkout do Creator ENQUANTO
      // esperava o 1º filme, e o cron saiu daqui com `no_authorized_urls` 6
      // rodadas seguidas (04:03→05:16) até o estorno de 05:30 — com o claim
      // no banco mostrando 5/5 URLs autorizadas. A biblioteca (claim.ts) foi
      // executada em simulação com o mesmo fluxo (authorize → reload) e
      // devolve as 5 URLs; ou seja, ALGUMA das leituras deste cron enxerga o
      // claim diferente do banco, e este ramo escondia qual. Duas coisas:
      // (1) LOG de cada visão do claim (reload / retorno do authorize / linha
      //     do lote / clipes recém-conferidos na fal) para a próxima rodada
      //     provar a causa; (2) FALLBACK: o compose re-verifica clip_urls
      //     contra o claim ASSINADO (compose/route.ts `inputsMatch`) — então é
      //     seguro tentar com a primeira visão que tenha URLs. Se nenhuma
      //     bater, o compose devolve 400 e o cron já trata (compose_error_400,
      //     teto de tentativas, e-mail de resgate). O pior caso continua sendo
      //     o de hoje: filme pago e nunca montado.
      const fromAuthorize = authorized.ok && authorized.claim ? onlyUrls(authorized.claim.authorizedCompletedUrls) : []
      const fromBatchRow = onlyUrls(md.authorized_completed_urls)
      const fromFal = requestIds.map((id) => clips.find((c) => c.requestId === id)?.url ?? '').filter((u) => u.length > 0)
      const shape = (list: unknown) => Array.isArray(list) ? list.map((u) => (typeof u === 'string' ? (u ? 'url' : 'empty') : String(u))).join(',') : typeof list
      console.warn(
        `[stranded] gen=${gen8} no_authorized_urls diag reload=[${shape(vClaim.authorizedCompletedUrls)}] ` +
        `authorize=[${authorized.ok && authorized.claim ? shape(authorized.claim.authorizedCompletedUrls) : 'n/a'}] ` +
        `batch=[${shape(md.authorized_completed_urls)}] fal=${fromFal.length}/${requestIds.length} status=${vClaim.status}`,
      )
      const fallback = fromAuthorize.length > 0 ? { src: 'authorize', urls: fromAuthorize }
        : fromBatchRow.length > 0 ? { src: 'batch_row', urls: fromBatchRow }
        : fromFal.length > 0 ? { src: 'fal', urls: fromFal }
        : null
      if (!fallback) { results.push({ generation: gen8, outcome: 'no_authorized_urls' }); continue }
      console.warn(`[stranded] gen=${gen8} composing with ${fallback.src} URLs (${fallback.urls.length}) — reload had none`)
      await admin.from('events').insert({ user_id: userId, name: 'stranded_diag', session_id: genId, path: '/api/cron/finish-stranded-renders', metadata: { outcome: `no_authorized_urls_fallback:${fallback.src}`, reload_shape: shape(vClaim.authorizedCompletedUrls).slice(0, 200) } })
      clipUrls = fallback.urls
    }

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

    // sprint-assinaturas #1 — o insert era cego: se falhasse, o compose rodava
    // sem marcador e o teto de 2 tentativas nunca contava.
    const { error: attemptErr } = await admin.from('events').insert({ user_id: userId, name: ATTEMPT_EVENT, session_id: genId, metadata: { attempt: attemptCount + 1 } })
    if (attemptErr) console.error(`[stranded] attempt marker insert failed gen=${gen8}:`, attemptErr.message)
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
        const composeErr = typeof json?.error === 'string' ? json.error : JSON.stringify(json ?? null)
        results.push({ generation: gen8, outcome: `compose_error_${res.status}`, error: composeErr.slice(0, 200) })
      }
    } catch (e) {
      console.error(`[stranded] compose threw gen=${gen8}:`, e instanceof Error ? e.message : String(e))
      results.push({ generation: gen8, outcome: 'compose_threw', error: (e instanceof Error ? e.message : String(e)).slice(0, 200) })
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
    const { data: fastMarkers, error: fastMarkerErr } = fastGenIds.length > 0
      ? await admin.from('events').select('session_id').eq('name', FAST_READY_EVENT).in('session_id', fastGenIds.slice(0, 200))
      : { data: [] as Array<{ session_id: string | null }>, error: null }
    const alreadyFast = new Set((fastMarkers ?? []).map((m) => m.session_id as string))
    // sprint-assinaturas #4 — 9 de 9 resgates do Kineo 1 saíram repetidos; o erro
    // deste lote também era engolido.
    const fastBatchError = fastMarkerErr ? fastMarkerErr.message.slice(0, 200) : null
    if (fastMarkerErr) console.error(`[stranded-fast] marker batch lookup failed (${fastGenIds.length} gens): ${fastMarkerErr.message}`)

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
        // sprint-assinaturas #4 — confirmação direta antes de enviar (fail-closed).
        const verdict = await alreadySentDirect(admin, { eventName: FAST_READY_EVENT, genId, userId, batchHad: alreadyFast.has(genId), batchSize: (fastMarkers ?? []).length, batchError: fastBatchError })
        if (!verdict.send) { results.push({ generation: genId.slice(0, 8), outcome: verdict.reason === 'already_sent' ? 'fast_already_notified_direct' : 'fast_dedupe_lookup_failed' }); continue }
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

  // ═══ sprint-assinaturas #1 (02/09) — O CRON ERA MUDO NO CAMINHO QUE MAIS
  // IMPORTA. Medido no banco: 7 pessoas EXTERNAS em 5 dias (28/08→01/09), todas
  // no PRIMEIRO vídeo do trial, Seedance despachado e aceito, TODAS as cenas
  // prontas na fal (authorized_completed_urls cheio), compose NUNCA invocado,
  // zero stranded_* no rastro, estorno 'cinematic_abandoned_no_delivery' 2h
  // depois. 137 créditos devolvidos, 0 vídeos, 0 dessas 7 voltou. Nos logs da
  // Vercel o cron rodou 8 vezes na janela e só imprimiu 'checked=13 composed=0'
  // — cada desfecho ficava no JSON de resposta que ninguém lê. A partir daqui
  // TODO desfecho vai pro log (uma linha por rodada) e os desfechos terminais
  // silenciosos viram evento `stranded_outcome` no banco, para a próxima rodada
  // ler a causa em SQL em vez de adivinhar. Não muda nenhuma decisão do cron.
  const SILENT_TERMINAL = /^(ready_dedupe_lookup_failed|rescue_dedupe_lookup_failed|fast_dedupe_lookup_failed|authorize_failed|reload_failed|no_authorized_urls|compose_error_|compose_threw|compose_gave_up|composed_render_id_unknown|ready_email_failed|rescue_email_failed|too_few)/
  const outcomeLine = results.map((r) => `${r.generation}:${r.outcome}`).join(' ')
  console.log(`[stranded] outcomes ${outcomeLine || '(none)'}`)
  try {
    const rows = results
      .filter((r) => SILENT_TERMINAL.test(r.outcome))
      .map((r) => {
        const claim = candidates.find((c) => typeof c.session_id === 'string' && c.session_id.startsWith(r.generation))
        return claim && typeof claim.user_id === 'string' && typeof claim.session_id === 'string'
          ? { user_id: claim.user_id, name: 'stranded_outcome', session_id: claim.session_id, path: '/api/cron/finish-stranded-renders', metadata: { outcome: r.outcome.slice(0, 120), ...(r.error ? { error: r.error } : {}) } }
          : null
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
    if (rows.length > 0) {
      const { error: outcomeErr } = await admin.from('events').insert(rows)
      if (outcomeErr) console.error('[stranded] outcome events insert failed:', outcomeErr.message)
    }
  } catch (e) {
    console.error('[stranded] outcome logging failed:', e instanceof Error ? e.message : String(e))
  }

  return NextResponse.json({ checked, composed, ready, rescued: rescuedCount, fastReady, relinked, results })
}
