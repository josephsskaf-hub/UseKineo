// KINEO-STRANDED-2026-08-18 — ordem do fundador ("vamos fazer isso HOJE e já
// não ter mais esse problema"): o maior vazamento do funil medido em 72h são
// 131 eventos `idle / resolved=false resumed=false` — gente que mandou gerar,
// cansou de esperar os 15-25 min do motor de IA, FECHOU A ABA, e nunca viu o
// vídeo: o pipeline é orquestrado pelo cliente, então sem aba não há compose.
// Créditos queimados, mágica não aconteceu, trial morto.
//
// V1 (este cron, risco zero nas rotas blindadas): DETECTA e TRAZ DE VOLTA.
// A cada 15 min: acha claims cinematográficos `settled` (12min-20h de idade,
// não released), confere NO FAL se as cenas terminaram (server-side, mesma
// lógica do poller), confere que o vídeo NÃO compôs, e manda UM e-mail:
// "Your scenes are ready — one click to finish". O link cai no /generate,
// onde o resume flow já detecta o render ativo e termina o compose sozinho
// (33 retomadas bem-sucedidas nas últimas 72h — máquina batalha-testada).
// O e-mail chega ~20-30 min depois da pessoa desistir: exatamente quando o
// produto tem um presente pronto pra entregar.
//
// V2 (amanhã, de cabeça fria): compose 100% server-side via bypass CRON nas
// rotas /api/compose e /api/compose/status — exige mexer na camada de auth
// mais sensível da casa, não se faz às 22h.
//
// Guard rails (padrão dos lifecycle jobs):
// - CRON_SECRET fail-closed · RESEND obrigatório
// - 1 e-mail por GERAÇÃO, pra sempre (evento stranded_rescue_sent com
//   session_id = generationId — checado antes de enviar)
// - máx 20 por rodada · pausa 500ms entre envios
// - pula opt-out, contas internas/teste, e-mail descartável óbvio
// - só envia se TODAS as cenas do fal estão COMPLETED (clicar e ainda esperar
//   10 min seria promessa quebrada; parcial fica pra próxima rodada)
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { CINEMATIC_CLAIM_EVENT } from '@/lib/cinematic/claim'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const RESCUE_EVENT = 'stranded_rescue_sent'
const MIN_AGE_MS = 12 * 60 * 1000
const MAX_AGE_MS = 20 * 60 * 60 * 1000
const MAX_PER_RUN = 20

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

async function allClipsDone(requestIds: Array<string | null>, models: string[]): Promise<boolean> {
  const falKey = process.env.FAL_KEY
  if (!falKey) return false
  fal.config({ credentials: falKey })
  const live = requestIds
    .map((id, i) => ({ id, model: models[i] }))
    .filter((x): x is { id: string; model: string } => !!x.id && !!x.model)
  if (live.length === 0) return false
  for (const clip of live) {
    try {
      const st = await fal.queue.status(clip.model, { requestId: clip.id })
      if ((st as { status?: string }).status !== 'COMPLETED') return false
    } catch {
      // 422/400 = clipe morto no provedor; um clipe morto ainda pode compor
      // com os vivos (o resume decide) — mas para o e-mail "ready" exigimos
      // resposta limpa de todos: erro = não está pronto, próxima rodada vê.
      return false
    }
  }
  return true
}

function emailText(finishUrl: string): string {
  return `Hey — your AI scenes finished rendering. 🎬

You started a video on Kineo and the heavy part is done: every scene came out of the engine and is waiting for you. One click finishes the film — voiceover, captions and music are assembled in about two minutes while you watch.

Finish your video: ${finishUrl}

(Your scenes are held for you, but engine output doesn't wait forever — best to finish today.)

— Kineo`
}

function emailHtml(finishUrl: string, userId: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p style="font-size:18px"><b>Your AI scenes finished rendering 🎬</b></p>
  <p>You started a video on Kineo and the heavy part is done: every scene came out of the engine and is waiting for you. One click finishes the film — voiceover, captions and music are assembled in about two minutes while you watch.</p>
  <p style="margin:26px 0">
    <a href="${finishUrl}" style="background:#2997ff;color:#ffffff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">Finish my video &rarr;</a>
  </p>
  <p style="color:#64748b;font-size:13px">Your scenes are held for you, but engine output doesn't wait forever — best to finish today.</p>
  <p style="color:#64748b;font-size:13px">— Kineo</p>
</div>
${emailFooterHtml(userId)}`
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

  // Claims settled na janela. metadata->>'status' settled = créditos cobrados,
  // cenas submetidas; released = já resolvido (composto ou estornado).
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
  if (candidates.length === 0) return NextResponse.json({ checked: 0, sent: 0, note: 'no settled claims in window' })

  // Dedupe: 1 resgate por geração, pra sempre.
  const genIds = candidates.map((c) => c.session_id).filter((s): s is string => !!s)
  const { data: alreadyRows } = await admin
    .from('events')
    .select('session_id')
    .eq('name', RESCUE_EVENT)
    .in('session_id', genIds.slice(0, 200))
  const already = new Set((alreadyRows ?? []).map((r) => r.session_id))

  let sent = 0
  let checked = 0
  const results: Array<{ generation: string; outcome: string }> = []

  for (const claim of candidates) {
    if (sent >= MAX_PER_RUN) break
    const genId = claim.session_id as string | null
    const userId = claim.user_id as string | null
    if (!genId || !userId || already.has(genId)) continue
    checked++

    const md = claim.metadata as Record<string, unknown>
    const requestIds = Array.isArray(md.fal_request_ids) ? (md.fal_request_ids as Array<string | null>) : []
    const models = Array.isArray(md.fal_models) ? (md.fal_models as string[]) : []
    if (requestIds.length === 0) { results.push({ generation: genId.slice(0, 8), outcome: 'no_request_ids' }); continue }

    // O compose já foi invocado? Quando /api/compose consome o claim ele grava
    // metadata.render_id (linha ~703 de compose/route.ts) — se existe, o
    // usuário voltou (ou o resume terminou) e este cron não tem nada a fazer.
    // Claims released (refund) já ficaram de fora no filtro de status.
    if (typeof md.render_id === 'string' && md.render_id.length > 0) {
      results.push({ generation: genId.slice(0, 8), outcome: 'compose_already_started' })
      continue
    }

    // Perfil: e-mail válido, sem opt-out, não interno.
    const { data: prof } = await admin
      .from('profiles')
      .select('email, email_opted_out')
      .eq('id', userId)
      .maybeSingle()
    const email = prof?.email ?? ''
    if (!email || prof?.email_opted_out || isInternalOrJunkEmail(email)) {
      results.push({ generation: genId.slice(0, 8), outcome: 'no_valid_email' })
      continue
    }

    // Todas as cenas prontas no fal? (promessa do e-mail: "one click finishes")
    const ready = await allClipsDone(requestIds, models)
    if (!ready) { results.push({ generation: genId.slice(0, 8), outcome: 'clips_not_ready_yet' }); continue }

    const finishUrl = `${APP_URL}/generate?utm_source=stranded_rescue`
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          reply_to: 'joseph@usekineo.com',
          subject: 'Your AI scenes are ready — one click to finish your video 🎬',
          text: emailText(finishUrl) + emailFooterText(userId),
          html: emailHtml(finishUrl, userId),
          headers: unsubscribeHeaders(userId),
        }),
      })
      if (!res.ok) throw new Error(`resend ${res.status}`)
      await admin.from('events').insert({
        user_id: userId,
        name: RESCUE_EVENT,
        session_id: genId,
        metadata: { email_masked: email.replace(/^(.{2}).*(@.*)$/, '$1***$2') },
      })
      sent++
      results.push({ generation: genId.slice(0, 8), outcome: 'sent' })
      await new Promise((r) => setTimeout(r, 500))
    } catch (e) {
      console.error('[stranded] send failed:', e instanceof Error ? e.message : String(e))
      results.push({ generation: genId.slice(0, 8), outcome: 'send_failed' })
    }
  }

  console.log(`[stranded] checked=${checked} sent=${sent}`)
  return NextResponse.json({ checked, sent, results })
}
