import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { creditCostFor } from '@/lib/credits/engineCost'
import { buildSeriesContinuationEmailUrl } from '@/lib/seriesContinuation'

// ═══ KINEO-MOMENTUM-2026-08-20 — O E-MAIL QUE MIRA O 4º VÍDEO ═════════════
//
// A DESCOBERTA QUE ORIGINOU ESTE ARQUIVO (medida em 20/08, 854 contas):
//   1 vídeo feito     → 0,33% assinam
//   2-3 vídeos        → 0,86%
//   4-6 vídeos        → 11,76%   ← 24× mais
//   7+ vídeos         → 18,18%   ← 37× mais
// A compra não acontece no checkout: acontece no QUARTO VÍDEO. E só 28 de 854
// pessoas chegaram lá.
//
// O funil tinha cobertura nas duas pontas e um buraco no meio exatamente onde
// mora o dinheiro: `send-activation-nudge` cuida de quem fez ZERO vídeos, e as
// campanhas de checkout cuidam de quem já foi ao pagamento. Ninguém falava com
// quem fez 1, 2 ou 3 vídeos e parou — que são 154 + 67 pessoas em 14 dias, o
// maior grupo do funil depois dos que nunca geraram.
//
// POR QUE ESTE E-MAIL NÃO TEM CUPOM (decisão consciente):
// A pessoa não parou por preço — ela nem chegou ao preço. Ela parou por
// inércia. Desconto aqui seria responder uma objeção que ela não fez, e ainda
// ensinaria que parar rende prêmio. O gancho é o PRÓXIMO VÍDEO, e a prova de
// que ela consegue é o vídeo que ela já fez.
//
// O QUE TORNA ESTE E-MAIL DIFERENTE DE UM "VOLTA PRA GENTE":
// ele cita o tema do vídeo QUE ELA FEZ (temos `topic` na tabela videos) e
// sugere o próximo passo concreto. Não é lembrete, é continuação.
//
// Guard rails: 1× por pessoa para sempre (marcador `momentum_nudge_sent`),
// só quem tem crédito suficiente para de fato fazer o próximo vídeo (senão o
// e-mail manda a pessoa bater num 402 — o erro que já cometemos em 5 telas),
// pula pagante, opt-out, conta interna e descartável.

// ═══ KINEO-SPRINT-V1V4-2026-09-01 (#24) — DUAS COISAS ERRADAS AQUI ════════
//
// (A) ESTE E-MAIL NUNCA FOI ENVIADO. `select count(*) from events where
//     name='momentum_nudge_sent'` = ZERO, desde 20/08. A causa nao esta neste
//     arquivo: em `vercel.json` o cron chama
//         "/api/cron/send-momentum-nudge"  (schedule 30 13 * * *)
//     SEM `?confirm=SEND`. A rota exige esse parametro para sair do DRY_RUN
//     (linha `const confirm = ...` abaixo). Ou seja: ha 11 dias a plataforma
//     acorda esta rota todo dia as 13:30 UTC, ela calcula a lista de elegiveis
//     com capricho, devolve `mode: DRY_RUN` e nao manda um unico e-mail.
//     A unica campanha da casa escrita para empurrar o video 1 ate o 4 e uma
//     carta escrita e nunca postada.
//     ⚠ NAO ARMEI SOZINHO — armar dispara ate 40 e-mails reais por rodada, e
//     e-mail que sai e decisao do fundador. A resposta DRY_RUN agora explica
//     isso em `armed` / `why` / `to_arm`, para o defeito parar de ser
//     invisivel. Para armar: por `?confirm=SEND` no path do vercel.json.
//
// (B) O BOTAO JOGAVA FORA O TEMA QUE O PROPRIO TEXTO CITA. A carta diz
//     "Your film about X is sitting in your library" e o botao levava para um
//     `/generate` PELADO — Studio em branco, tudo para reescrever.
//     Medido em 30 dias (externos): 123 pessoas voltaram de verdade numa
//     sessao posterior ao 1o video e 30 fizeram outro video = 24%. Pelo
//     caminho de continuacao de serie: 59 chegadas -> 31 videos = 53%.
//     Mais que o DOBRO, com o MESMO clique — muda so o destino. Agora o botao
//     carrega o tema (`buildSeriesContinuationEmailUrl`), o mesmo helper que
//     /history, /studio e a tela de video pronto ja usam. Sem tema utilizavel
//     (cleanTopic devolve null), a URL volta a ser exatamente a de antes:
//     nunca inventamos o assunto do video da pessoa.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const STAMP = 'momentum_nudge_sent'
const MAX_PER_RUN = 40
// Janela: cedo o bastante para a memória estar fresca, tarde o bastante para
// não atropelar quem ainda está na sessão. 20h-96h desde o último vídeo.
const MIN_IDLE_H = 20
const MAX_IDLE_H = 96

function isInternalOrJunk(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') || e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') || e.startsWith('test') ||
    e.includes('mailinator') || e.startsWith('smoketest') ||
    e.endsWith('@gouziben.com') || e.endsWith('@ptct.net')
  )
}

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false // fail-closed: env sumida não abre o endpoint
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

/** Limpa o tema para uso em texto: o `topic` guarda a linha do HOOK, que pode
 *  vir com marcadores do script. Nunca deixa passar HTML. */
function cleanTopic(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = raw
    .replace(/\b(HOOK|MICRO REWARD|ESCALATION|PAYOFF|RHYTHM)\b:?/gi, '')
    .replace(/[<>]/g, '')
    .trim()
  if (t.length < 8 || t.length > 90) return null
  return t
}

function buildEmail(userId: string, videosMade: number, topic: string | null) {
  // O tema viaja no botao. Sem tema, cai na MESMA url de antes (so utm).
  const url = buildSeriesContinuationEmailUrl(APP_URL, topic, 'momentum_email', {
    utm_source: 'lifecycle',
    utm_medium: 'email',
    utm_campaign: 'momentum',
  })
  // Rotulo honesto: so promete "episodio 2 pronto" quando o tema REALMENTE
  // viaja no link. Botao que promete preenchimento e entrega tela em branco e
  // exatamente o defeito que esta rodada esta consertando.
  const cta = topic ? 'Open episode 2 →' : 'Make the next one →'
  // A frase que ancora no que ELA fez. Sem tema utilizável, cai numa versão
  // neutra — nunca inventamos o assunto do vídeo dela.
  const anchor = topic
    ? `Your film about ${topic} is sitting in your library.`
    : videosMade === 1
      ? `You made your first film with Kineo.`
      : `You made ${videosMade} films with Kineo.`

  const text = `Hey,

${anchor}

Here's something we noticed looking at how people use Kineo: the difference between someone who makes one video and someone who builds a channel is almost never talent — it's the fourth video. That's where it stops feeling like a tool you're testing and starts feeling like a workflow you own.

You're ${videosMade === 1 ? 'three' : videosMade === 2 ? 'two' : 'one'} away.

Pick anything — a mystery, a country, a story you can't stop thinking about — and the AI writes the script, records the voiceover, cuts the captions and scores it.

${topic ? 'Episode 2 is already written for you — one click and the idea is in the box:' : 'Make the next one:'} ${url}

If something got in the way last time, just reply and tell me. It lands with a real person.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">${anchor}</p>
  <p style="margin:0 0 14px;">Here's something we noticed looking at how people use Kineo: the difference between someone who makes one video and someone who builds a channel is almost never talent — it's <strong>the fourth video</strong>. That's where it stops feeling like a tool you're testing and starts feeling like a workflow you own.</p>
  <p style="margin:0 0 14px;">You're <strong>${videosMade === 1 ? 'three' : videosMade === 2 ? 'two' : 'one'}</strong> away.</p>
  <p style="margin:0 0 14px;">Pick anything — a mystery, a country, a story you can't stop thinking about — and the AI writes the script, records the voiceover, cuts the captions and scores it.</p>
  <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">${cta}</a></p>
  <p style="margin:0 0 14px;">If something got in the way last time, just reply and tell me. It lands with a real person.</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
  const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

  const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const now = Date.now()
  const idleMin = new Date(now - MAX_IDLE_H * 3600_000).toISOString()
  const idleMax = new Date(now - MIN_IDLE_H * 3600_000).toISOString()

  // Candidatos: vídeos concluídos na janela de ociosidade. Agregamos por
  // pessoa em memória (o Supabase JS não faz GROUP BY).
  const { data: vids, error } = await admin
    .from('videos')
    .select('user_id, created_at, topic')
    .eq('status', 'completed')
    .gte('created_at', new Date(now - 30 * 24 * 3600_000).toISOString())
    .limit(4000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Agg = { count: number; last: string; topic: string | null }
  const byUser = new Map<string, Agg>()
  for (const v of vids ?? []) {
    const uid = v.user_id as string | null
    if (!uid) continue
    const created = v.created_at as string
    const cur = byUser.get(uid)
    if (!cur) byUser.set(uid, { count: 1, last: created, topic: (v.topic as string | null) ?? null })
    else {
      cur.count += 1
      if (created > cur.last) { cur.last = created; cur.topic = (v.topic as string | null) ?? null }
    }
  }

  // A faixa que este e-mail existe para mover: 1 a 3 vídeos, parado na janela.
  const candidates = [...byUser.entries()].filter(([, a]) =>
    a.count >= 1 && a.count <= 3 && a.last >= idleMin && a.last <= idleMax,
  )
  if (candidates.length === 0) {
    return NextResponse.json({ mode: confirm ? 'SENT' : 'DRY_RUN', eligible: 0, note: 'ninguém na faixa 1-3 vídeos dentro da janela' })
  }

  const ids = candidates.map(([id]) => id)
  const [{ data: profs }, { data: stamps }] = await Promise.all([
    admin.from('profiles').select('id, email, email_opted_out, video_credits, stripe_subscription_id').in('id', ids.slice(0, 1000)),
    admin.from('events').select('user_id').eq('name', STAMP).in('user_id', ids.slice(0, 1000)),
  ])
  const already = new Set((stamps ?? []).map((s) => s.user_id as string))
  const profById = new Map((profs ?? []).map((p) => [p.id as string, p]))

  // Crédito mínimo para o próximo vídeo REALMENTE acontecer. Deriva de
  // creditCostFor — nunca número cravado (o Kineo 1 mudou de preço 3× em 2
  // dias; copy que promete o que não cabe é como quebramos 7 promessas na V6).
  const minCredits = creditCostFor('fast', true)

  const targets: Array<{ id: string; email: string; count: number; topic: string | null }> = []
  for (const [id, agg] of candidates) {
    if (already.has(id)) continue
    const p = profById.get(id)
    if (!p) continue
    const email = (p.email ?? '') as string
    if (!email || p.email_opted_out || isInternalOrJunk(email)) continue
    if (p.stripe_subscription_id) continue // já é cliente
    if (((p.video_credits as number) ?? 0) < minCredits) continue
    targets.push({ id, email, count: agg.count, topic: cleanTopic(agg.topic) })
  }

  if (!confirm) {
    return NextResponse.json({
      mode: 'DRY_RUN',
      cohort: `fez 1-3 vídeos · parado há ${MIN_IDLE_H}-${MAX_IDLE_H}h · tem ≥${minCredits} créditos · não paga · nunca recebeu este e-mail`,
      eligible: targets.length,
      por_quantidade: {
        um_video: targets.filter((t) => t.count === 1).length,
        dois: targets.filter((t) => t.count === 2).length,
        tres: targets.filter((t) => t.count === 3).length,
      },
      subject: 'The fourth video is the one that changes things',
      // KINEO-SPRINT-V1V4-2026-09-01 (#24) — o defeito para de ser invisivel.
      armed: false,
      why: 'sem ?confirm=SEND na URL esta rota NUNCA envia. Em vercel.json o cron chama /api/cron/send-momentum-nudge sem esse parametro desde 20/08 — momentum_nudge_sent = 0 no banco.',
      to_arm: 'trocar o path em vercel.json por "/api/cron/send-momentum-nudge?confirm=SEND" (o mesmo formato ja usado pelo send-hotlead-blast).',
      com_tema: targets.filter((t) => t.topic).length,
      sem_tema: targets.filter((t) => !t.topic).length,
      exemplo_link: buildSeriesContinuationEmailUrl(APP_URL, targets.find((t) => t.topic)?.topic ?? null, 'momentum_email', { utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: 'momentum' }),
      sample: targets.slice(0, 12).map((t) => `${t.email} (${t.count}v${t.topic ? ` · ${t.topic.slice(0, 40)}` : ''})`),
      hint: 'Append &confirm=SEND to send.',
    })
  }

  let sent = 0
  const results: Array<{ email: string; outcome: string }> = []
  for (const t of targets.slice(0, MAX_PER_RUN)) {
    const { text, html } = buildEmail(t.id, t.count, t.topic)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [t.email],
          reply_to: 'hello@usekineo.com',
          subject: 'The fourth video is the one that changes things',
          text,
          html,
          headers: unsubscribeHeaders(t.id),
        }),
      })
      if (res.ok) {
        // Carimbo só no SUCESSO — falha volta na próxima rodada.
        await admin.from('events').insert({ user_id: t.id, name: STAMP, metadata: { videos: t.count } })
        sent++
        results.push({ email: t.email, outcome: 'sent' })
      } else {
        results.push({ email: t.email, outcome: `failed_${res.status}` })
      }
    } catch {
      results.push({ email: t.email, outcome: 'threw' })
    }
    await new Promise((r) => setTimeout(r, 600))
  }

  console.log(`[momentum] sent=${sent} of ${targets.length} eligible`)
  return NextResponse.json({ mode: 'SENT', sent, eligible: targets.length, results })
}
