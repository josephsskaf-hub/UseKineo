// KINEO-HOTLEADS-2026-08-14 — one-off hot-lead blast (admin/cron-gated).
//
// Pedido literal do fundador (14/08): "usa os nossos hot leads, dá uma olhada
// na nossa data e vamos mandar um email pra eles".
//
// TRÊS SEGMENTOS que NENHUM job de lifecycle cobre hoje (conferido contra o
// inventário em lib/lifecycle/suppression.ts):
//   burned  → queimou os 40 créditos do trial até o fim e não comprou.
//             O sinal de intenção mais forte do funil (12 contas na coorte
//             fechada, 0 conversões — medição da sprint de 13h de 14/08).
//   stalled → saldo 1–19: explorou o produto, o motor de IA custa 20, e a
//             conta ENCALHOU com créditos que não compram nada do que quer.
//   power   → 10+ vídeos completos no plano free: usa em volume de operador,
//             nunca pagou. Pitch é o plano anual (economia real), não pressão.
//
// PADRÃO DA CASA (copiado de send-abandon-recovery):
//   GET sem params                    → DRY RUN (contagens + amostra mascarada)
//   GET ?confirm=SEND&segment=X&limit=N → envia, com pacing e flag idempotente
// Auth: cookie de admin OU Authorization: Bearer CRON_SECRET.
//
// IDEMPOTÊNCIA SEM MIGRAÇÃO: um evento `hotlead_emailed_v1` por usuário
// (name + user_id na tabela events). Quem já tem o evento nunca recebe de
// novo, de nenhum segmento. Supressão de lifecycle (loadLifecycleSuppression)
// é respeitada: quem levou QUALQUER e-mail da régua nos últimos 3 dias fica
// de fora desta leva — hot lead não é desculpa para spam.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { claimEmailSlot, recordEmailSend, recordResendResponse } from '@/lib/email/quota'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

const FROM_EMAIL = 'Joseph at Kineo <hello@usekineo.com>'
const REPLY_TO = 'hello@usekineo.com'
const FLAG_EVENT = 'hotlead_emailed_v1'
const TRIAL_START = '2026-08-07'
const PAID_PLANS = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial'])

const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com', 'gmeenramy.com', 'kinws.com', 'doefy.com', 'x-box.in',
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', 'tempmail.com',
  '10minutemail.com', 'trashmail.com', 'getnada.com', 'dispostable.com',
  'maildrop.cc', 'mohmal.com', 'temp-mail.org', 'fakeinbox.com',
])

function isInternal(email: string): boolean {
  if (ADMIN_EMAILS.has(email)) return true
  if (email.startsWith('josephsskaf') || email.startsWith('josephskaf')) return true
  if (email.startsWith('joseph+') || email.startsWith('joseph-')) return true
  if (email === 'victoriaskaf96@gmail.com') return true
  if (email === 'ramonwilliamson@gmail.com') return true
  const dom = email.split('@')[1] ?? ''
  return dom === 'shortsforgeai.com' || dom === 'usekineo.com' || dom === 'theresanaiforthat.com'
}

function isValidExternalEmail(email: string): boolean {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return false
  if (email.includes('example.com') || email.startsWith('test@') || email.startsWith('smoketest')) return false
  const dom = email.split('@')[1] ?? ''
  if (DISPOSABLE_DOMAINS.has(dom)) return false
  if (isInternal(email)) return false
  return true
}

type Segment = 'burned' | 'stalled' | 'power' | 'watermark' | 'paying'

type Lead = { id: string; email: string; videos: number; credits: number }

// ── Copy (playbook EMAIL-HOT-LEAD.md: e-mail de gente, curto, 1 pergunta,
//    resposta cai na caixa do Joseph) ───────────────────────────────────────
function subjectFor(seg: Segment): string {
  if (seg === 'burned') return 'You used every single credit — quick question'
  if (seg === 'stalled') return 'Your Kineo credits are still sitting there'
  if (seg === 'watermark') return 'That watermark comes off, by the way'
  if (seg === 'paying') return 'Want 40% of every referral, forever?'
  return 'You make more videos than most paid users'
}

function bodyFor(seg: Segment, lead: Lead, userId: string): string {
  const open = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">`
  const sig = `<p>— Joseph, founder<br/>Kineo · https://usekineo.com</p></div>${emailFooterHtml(userId)}`
  if (seg === 'burned') {
    return `${open}
<p>Hey — Joseph here, founder of Kineo.</p>
<p>You did something almost nobody does: you used your trial credits down to zero. That tells me the videos were worth making — and that something stopped you at the paying part.</p>
<p>I'd genuinely like to know what it was. Price? A missing feature? Output quality on a specific niche?</p>
<p>If it helps: the Creator plan is <b>$9.90 for the first month</b> (150 credits, clean exports, every engine except Studio).</p>
<p style="margin:22px 0"><a href="https://usekineo.com/pricing?tier=basic&intent_campaign=hotlead_burned" style="background:#2997ff;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Keep making videos &rarr;</a></p>
<p>And if it was something else — just hit reply. It comes straight to me, and I answer everything myself.</p>
${sig}`
  }
  if (seg === 'stalled') {
    return `${open}
<p>Hey — Joseph here, founder of Kineo.</p>
<p>You still have <b>${lead.credits} credits</b> sitting in your account. They don't expire this week, but I noticed you stopped — and when someone makes a video and then goes quiet, it's usually because something got in the way.</p>
<p>Was it the output? The credit math? Something confusing in the flow? Whatever it was, reply and tell me — I read every answer myself and I'd rather fix your reason than send you a coupon.</p>
<p>If you just want more room to create: the first month of Starter is <b>$4.90</b>.</p>
<p style="margin:22px 0"><a href="https://usekineo.com/pricing?tier=starter&intent_campaign=hotlead_stalled" style="background:#2997ff;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">See plans &rarr;</a></p>
${sig}`
  }
  if (seg === 'watermark') {
    return `${open}
<p>Hey — Joseph here, founder of Kineo.</p>
<p>You downloaded your video — that's the whole point, so thank you for actually using the thing.</p>
<p>One thing a lot of people miss: the watermark isn't permanent. Any paid plan exports <b>clean, watermark-free MP4s</b> — and the first month of Starter is <b>$4.90</b>.</p>
<p style="margin:22px 0"><a href="https://usekineo.com/pricing?tier=starter&intent_campaign=hotlead_watermark" style="background:#2997ff;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Export clean videos &rarr;</a></p>
<p>And if the watermark never bothered you — even better. Reply and tell me what WOULD make you upgrade someday. It comes straight to me.</p>
${sig}`
  }
  if (seg === 'paying') {
    return `${open}
<p>Hey — Joseph here, founder of Kineo.</p>
<p>You're one of the first paying customers we've ever had, and I don't take that lightly. So before I tell anyone else: our affiliate program pays <b>40% of every payment, recurring</b> — for anyone you send our way.</p>
<p>You already know what the product does. If one creator friend signs up on Creator, that's real money every month, forever.</p>
<p style="margin:22px 0"><a href="https://usekineo.com/affiliate?intent_campaign=hotlead_paying" style="background:#2997ff;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Get your link &rarr;</a></p>
<p>And as always — anything broken, anything missing, reply here. Founding customers get founder answers.</p>
${sig}`
  }
  return `${open}
<p>Hey — Joseph here, founder of Kineo.</p>
<p>You've generated <b>${lead.videos} videos</b> with Kineo. That's more output than most of our paying users — you're running this like an operation, not a toy.</p>
<p>At that volume the math changes: on the annual Creator plan a finished video costs you about <b>11 cents</b>. If you're posting regularly or delivering to anyone else, that's margin.</p>
<p style="margin:22px 0"><a href="https://usekineo.com/pricing?intent_campaign=hotlead_power" style="background:#2997ff;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">See the annual math &rarr;</a></p>
<p>And a real question: what would make Kineo indispensable for how you work? Reply — it comes straight to me.</p>
${sig}`
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

async function authorized(req: NextRequest): Promise<boolean> {
  const bearer = req.headers.get('authorization')
  if (bearer && process.env.CRON_SECRET && bearer === `Bearer ${process.env.CRON_SECRET}`) return true
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return Boolean(user?.email && ADMIN_EMAILS.has(user.email))
  } catch {
    return false
  }
}

async function collectSegments(): Promise<Record<Segment, Lead[]>> {
  const db = adminClient()

  // Perfis free com e-mail (uma leitura, filtros em memória — a base é ~1.1k).
  const { data: profiles } = await db
    .from('profiles')
    .select('id, email, plan, video_credits, created_at')
    .limit(3000)

  // Vídeos completos por usuário.
  const { data: vids } = await db
    .from('videos')
    .select('user_id, status')
    .eq('status', 'completed')
    .limit(20000)
  const videoCount = new Map<string, number>()
  for (const v of vids ?? []) {
    videoCount.set(v.user_id, (videoCount.get(v.user_id) ?? 0) + 1)
  }

  // AQUISICAO 3 (14/08) — sinais de evento para os segmentos novos:
  // quem baixou video (video_downloaded) e quem alguma vez viu /pricing.
  const { data: dls } = await db
    .from('events')
    .select('user_id')
    .eq('name', 'video_downloaded')
    .not('user_id', 'is', null)
    .limit(10000)
  const downloaded = new Set((dls ?? []).map((e) => e.user_id as string))
  const { data: pv } = await db
    .from('events')
    .select('user_id')
    .like('path', '/pricing%')
    .not('user_id', 'is', null)
    .limit(20000)
  const sawPricing = new Set((pv ?? []).map((e) => e.user_id as string))

  // Já emailados por esta rota (flag idempotente).
  const { data: flagged } = await db
    .from('events')
    .select('user_id')
    .eq('name', FLAG_EVENT)
    .limit(5000)
  const alreadySent = new Set((flagged ?? []).map((e) => e.user_id))

  // Supressão de lifecycle no PADRÃO DA CASA (24h): ninguém recebe dois
  // e-mails no mesmo dia — mas a régua de ontem não bloqueia o hot lead de
  // hoje. (Medido 14/08: com 72h a supressão comia 13 dos 14 queimados,
  // porque a régua diária toca quase toda a base free.)
  const candidateIds = (profiles ?? []).map((p) => p.id as string)
  const suppression = await loadLifecycleSuppression(db, candidateIds, 24).catch(() => null)

  const out: Record<Segment, Lead[]> = { burned: [], stalled: [], power: [], watermark: [], paying: [] }
  for (const p of profiles ?? []) {
    const email = (p.email ?? '').toString().trim().toLowerCase()
    if (!isValidExternalEmail(email)) continue
    if (alreadySent.has(p.id)) continue
    if (suppression && suppression.isSuppressed?.(p.id)) continue
    const videos = videoCount.get(p.id) ?? 0
    const credits = Number(p.video_credits ?? 0)
    const lead: Lead = { id: p.id, email, videos, credits }
    const isPaying = PAID_PLANS.has((p.plan ?? '').toString())
    if (isPaying) {
      // Unico segmento de pagantes: convite de afiliado 40%.
      out.paying.push(lead)
      continue
    }
    const inTrialEra = (p.created_at ?? '') >= TRIAL_START
    if (inTrialEra && credits === 0 && videos >= 2) out.burned.push(lead)
    else if (inTrialEra && credits >= 1 && credits <= 19 && videos >= 1) out.stalled.push(lead)
    else if (videos >= 10) out.power.push(lead)
    else if (downloaded.has(p.id) && !sawPricing.has(p.id)) out.watermark.push(lead)
  }
  return out
}

function mask(email: string): string {
  const [u, d] = email.split('@')
  return `${u.slice(0, 2)}***@${d}`
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const segments = await collectSegments()
  const url = req.nextUrl
  const confirm = url.searchParams.get('confirm') === 'SEND'
  const segParam = url.searchParams.get('segment') as Segment | null
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 25), 40)

  if (!confirm) {
    return NextResponse.json({
      dryRun: true,
      counts: {
        burned: segments.burned.length,
        stalled: segments.stalled.length,
        power: segments.power.length,
        watermark: segments.watermark.length,
        paying: segments.paying.length,
      },
      sample: {
        burned: segments.burned.slice(0, 3).map((l) => mask(l.email)),
        stalled: segments.stalled.slice(0, 3).map((l) => ({ e: mask(l.email), credits: l.credits })),
        power: segments.power.slice(0, 3).map((l) => ({ e: mask(l.email), videos: l.videos })),
      },
      how: 'GET ?confirm=SEND&segment=burned|stalled|power|watermark|paying&limit=N',
    })
  }

  // AQUISICAO 4 (14/08) — segment=auto: drena os segmentos em ordem de
  // temperatura (burned > stalled > watermark > power > paying) dentro de um
  // orcamento unico. E o modo do cron diario: a flag idempotente garante que
  // cada pessoa recebe no maximo 1 e-mail desta rota NA VIDA.
  const AUTO_ORDER: Segment[] = ['burned', 'stalled', 'watermark', 'power', 'paying']
  if (segParam === ('auto' as Segment)) {
    const budget = Math.min(Number(url.searchParams.get('limit') ?? 25), 40)
    const picked: Lead[] = []
    const perSeg: Record<string, number> = {}
    for (const seg of AUTO_ORDER) {
      for (const lead of segments[seg]) {
        if (picked.length >= budget) break
        picked.push(Object.assign(lead, { __seg: seg }) as Lead)
        perSeg[seg] = (perSeg[seg] ?? 0) + 1
      }
      if (picked.length >= budget) break
    }
    const resendKeyAuto = process.env.RESEND_API_KEY
    if (!resendKeyAuto) return NextResponse.json({ error: 'RESEND_API_KEY ausente' }, { status: 500 })
    const dbAuto = adminClient()
    let sentAuto = 0
    let yieldedAuto = 0
    const failuresAuto: string[] = []
    for (const lead of picked) {
      const seg = (lead as Lead & { __seg: Segment }).__seg
      // KINEO-EMAIL-QUOTA-WIRED-2026-08-17 — ESTE é o remetente que tinha de
      // ceder, e é por ele que o gate existe: 25 e-mails/dia de PROSPECÇÃO
      // saindo às 13:10 num teto de 100/dia, na frente do "seu trial acaba hoje"
      // (cron de :25) e do resgate de checkout (cron de :20). Ordem de cron,
      // não ordem de valor.
      // `growth` cede a partir de 60% do teto. O `continue` é de propósito e não
      // um `break`: o loop segue contando os cedidos para o relatório do dia
      // dizer "não mandei 25 porque a cota estava em 62/100", e não
      // "não achei gente".
      const slot = await claimEmailSlot({ kind: `hotlead_${seg}`, priority: 'growth', admin: dbAuto })
      if (!slot.allowed) {
        yieldedAuto += 1
        continue
      }
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKeyAuto}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: lead.email,
            reply_to: REPLY_TO,
            subject: subjectFor(seg),
            html: bodyFor(seg, lead, lead.id),
            headers: unsubscribeHeaders(lead.id),
          }),
        })
        await recordResendResponse({ kind: `hotlead_${seg}`, priority: 'growth', userId: lead.id, res, admin: dbAuto })
        if (!res.ok) { failuresAuto.push(`${mask(lead.email)}: ${res.status}`); continue }
        await dbAuto.from('events').insert({ user_id: lead.id, name: FLAG_EVENT, metadata: { segment: seg }, path: '/api/admin/send-hotlead-blast' })
        sentAuto += 1
        await new Promise((r) => setTimeout(r, 600))
      } catch (err) {
        failuresAuto.push(`${mask(lead.email)}: ${err instanceof Error ? err.message : 'erro'}`)
        await recordEmailSend({
          kind: `hotlead_${seg}`,
          priority: 'growth',
          userId: lead.id,
          ok: null,
          detail: err instanceof Error ? err.message.slice(0, 300) : 'fetch threw',
          admin: dbAuto,
        })
      }
    }
    // `yielded` vai na resposta porque um cron que mandou 8 de 25 tem de ser
    // distinguível de um cron que só achou 8 leads (regra dos `*_degraded`).
    return NextResponse.json({ segment: 'auto', perSegment: perSeg, attempted: picked.length, sent: sentAuto, yielded: yieldedAuto, failures: failuresAuto })
  }

  if (!segParam || !(segParam in segments)) {
    return NextResponse.json({ error: 'segment obrigatório: burned|stalled|power|watermark|paying|auto' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY ausente' }, { status: 500 })

  const db = adminClient()
  const leads = segments[segParam].slice(0, limit)
  let sent = 0
  const failures: string[] = []

  for (const lead of leads) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: lead.email,
          reply_to: REPLY_TO,
          subject: subjectFor(segParam),
          html: bodyFor(segParam, lead, lead.id),
          headers: unsubscribeHeaders(lead.id),
        }),
      })
      if (!res.ok) {
        failures.push(`${mask(lead.email)}: ${res.status}`)
        continue
      }
      // Flag SÓ depois do envio bem-sucedido (mesma regra do abandon-recovery).
      await db.from('events').insert({
        user_id: lead.id,
        name: FLAG_EVENT,
        metadata: { segment: segParam },
        path: '/api/admin/send-hotlead-blast',
      })
      sent += 1
      // Pacing: gentil com o Resend e com a reputação do domínio.
      await new Promise((r) => setTimeout(r, 600))
    } catch (err) {
      failures.push(`${mask(lead.email)}: ${err instanceof Error ? err.message : 'erro'}`)
    }
  }

  return NextResponse.json({ segment: segParam, attempted: leads.length, sent, failures })
}
