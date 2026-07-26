// Stalled-render rescue blast (admin- or cron-gated) — idempotent + batched.
//
// KINEO-STALLED-RESCUE-2026-07-26 — a maior coorte morna do banco que NUNCA
// teve campanha: quem começou uma geração de vídeo e nunca completou nenhuma.
//
// POR QUE NENHUMA ROTA EXISTENTE ALCANÇA ESSA GENTE:
//   - app/api/cron/send-video-rescue exige >=1 linha em `videos` e faz
//     `continue` quando não há (route.ts:172). 111 dos 112 têm ZERO linhas em
//     `videos`, então a rota pula todos eles, um por um, todo dia.
//   - 103 deles receberam o activation nudge, que é o email ERRADO: ele parte
//     do princípio de que a pessoa nunca tentou. Ela tentou. Falhou.
//   - Nenhuma das 11 campanhas do repo tem como chave "started but not
//     completed" — todas as coortes são por pagamento, checkout ou ativação.
//
// A auditoria de telemetria mostrou que ~42% dos renders iniciados morrem sem
// emitir evento de falha: essas pessoas ficaram olhando um spinner que nunca
// terminou e nunca receberam erro. A queixa delas é real e tem nome. O email
// reconhece isso e NÃO vende plano — quem nunca viu o produto funcionar não
// tem por que receber uma oferta. O único objetivo é um vídeo pronto.
//
// EVENTOS DUPLICADOS: este banco dispara `generate_started` E
// `video_generation_started` juntos, e `generate_completed` E
// `video_generation_completed` juntos. Contar sem deduplicar infla tudo —
// por isso a coorte é montada com IN (...) + Set de user_id (equivalente ao
// bool_or do SQL), nunca contando linhas de evento.
//
// MODES (admin- ou cron-gated, GET):
//   (no params)            → DRY RUN: quem receberia (contagem + amostra).
//   ?confirm=SEND&limit=N  → envia para os próximos N não-flagados (default 50),
//                            pacing entre envios, marcando a flag só no sucesso.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

// hello@ = prospecção/resgate de leads (support@ is reserved for support).
const FROM_EMAIL = 'Joseph at Kineo <hello@usekineo.com>'
const REPLY_TO = 'hello@usekineo.com'

// Subject escolhido entre duas variantes (a outra: "Your Kineo video didn't
// finish rendering"). Esta nomeia a queixa nas palavras da PESSOA ("never came
// out") em vez das palavras do sistema ("didn't finish rendering") e ainda
// promete movimento. A variante descartada lê como notificação automática —
// exatamente o tipo de email que essa coorte já aprendeu a ignorar.
const SUBJECT = "That video you started never came out — let's fix it"

// KINEO-STALLED-RESCUE-2026-07-26 — coluna de idempotência desta campanha.
// AINDA NÃO EXISTE em produção: esta rota é INERTE até rodar
//   alter table public.profiles
//     add column if not exists stalled_rescue_emailed boolean not null default false;
// O preflight abaixo confirma a coluna ANTES de qualquer envio e devolve 500
// com o SQL exato. Falhar alto é obrigatório aqui: sem a coluna não há como
// marcar quem já recebeu, e um segundo run mandaria o mesmo email de novo
// para as mesmas 111 pessoas.
const FLAG_COLUMN = 'stalled_rescue_emailed'
const FLAG_MIGRATION_SQL =
  'alter table public.profiles add column if not exists stalled_rescue_emailed boolean not null default false;'

// Eventos de início e de conclusão, nas DUAS grafias que este banco dispara.
const START_EVENTS = ['generate_started', 'video_generation_started']
const COMPLETE_EVENTS = ['generate_completed', 'video_generation_completed']

const RAMON = 'ramonwilliamson@gmail.com'

const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com', 'gmeenramy.com', 'kinws.com', 'doefy.com', 'x-box.in',
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', 'tempmail.com',
  '10minutemail.com', 'trashmail.com', 'getnada.com', 'dispostable.com',
  'maildrop.cc', 'mohmal.com', 'temp-mail.org', 'fakeinbox.com',
])

function isInternal(email: string): boolean {
  if (email === RAMON) return true
  if (ADMIN_EMAILS.has(email)) return true
  if (email.startsWith('josephsskaf') || email.startsWith('josephskaf')) return true
  if (email.startsWith('joseph+') || email.startsWith('joseph-')) return true
  if (email === 'victoriaskaf96@gmail.com') return true
  const dom = email.split('@')[1] ?? ''
  if (dom === 'shortsforgeai.com' || dom === 'usekineo.com' || dom === 'theresanaiforthat.com') return true
  return false
}

const PAID_PLANS = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial'])

function isValidExternalEmail(email: string): boolean {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return false
  if (email.includes('example.com') || email.startsWith('test@') || email.startsWith('smoketest')) return false
  const dom = email.split('@')[1] ?? ''
  if (DISPOSABLE_DOMAINS.has(dom)) return false
  if (isInternal(email)) return false
  return true
}

// KINEO-CHECKOUT-TRIAGE-2026-07-25 — nenhum link de email aponta para
// /api/stripe/checkout: scanners corporativos (Outlook Safe Links, Proofpoint,
// Mimecast) fazem GET em todo link antes do humano ver. Aqui o destino é
// /generate, que é página comum e não tem efeito colateral — e, de qualquer
// forma, esta campanha não pede dinheiro.
const CTA_URL = 'https://usekineo.com/generate?intent_campaign=stalled_rescue'

const EMAIL_TEXT = `Hey — Joseph here, founder of Kineo.

You started a video with Kineo and never got one out. It should have worked. It didn't — and you got no error and no explanation, which is the part that bothers me most.

I'd like to get a finished video into your hands. One click and you're back at the generator:

${CTA_URL}

If it stalls on you again, reply to this email with the topic you wanted and I'll build the video by hand and send you the file myself. That's a real offer — replies come straight to me.

— Joseph, founder
Kineo · https://usekineo.com`

// KINEO-UNSUBSCRIBE-2026-07-26 — recebe userId para montar o rodapé com o link
// de descadastro (CAN-SPAM §7704(a)(3)/(a)(5)).
function emailHtml(userId: string): string {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, founder of <b>Kineo</b> 🎬</p>
  <p>You started a video with Kineo and never got one out. It should have worked. It didn't — and you got no error and no explanation, which is the part that bothers me most.</p>
  <p style="font-size:18px;margin:18px 0"><b>I'd like to get a finished video into your hands.</b> One click and you're back at the generator.</p>
  <p style="margin:26px 0">
    <a href="${CTA_URL}" style="background:#2997ff;color:#ffffff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">Make my video &rarr;</a>
  </p>
  <p style="color:#475569;font-size:14px">If it stalls on you again, reply to this email with the topic you wanted and I'll build the video by hand and send you the file myself. That's a real offer — replies come straight to me.</p>
  <p>— Joseph, founder<br/>Kineo · https://usekineo.com</p>
</div>
${emailFooterHtml(userId)}`
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

type AdminDb = ReturnType<typeof adminClient>

/**
 * Coleta TODOS os user_id distintos que dispararam qualquer um dos `names`.
 *
 * Pagina explicitamente com .range(): o PostgREST corta em 1000 linhas por
 * padrão e hoje existem ~2.4k linhas só de evento de início. Sem paginação a
 * coorte sairia silenciosamente truncada — o pior tipo de bug numa campanha,
 * porque o número parece plausível.
 */
async function distinctUserIdsForEvents(
  admin: AdminDb,
  names: string[],
): Promise<{ ids: Set<string>; error?: string }> {
  const ids = new Set<string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('events')
      .select('user_id')
      .in('name', names)
      .not('user_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) return { ids, error: error.message }
    const rows = (data ?? []) as Array<{ user_id: string | null }>
    for (const r of rows) if (r.user_id) ids.add(r.user_id)
    if (rows.length < PAGE) break
    // Trava de segurança: nunca varrer indefinidamente se a tabela crescer.
    if (from > 200_000) break
  }
  return { ids }
}

/** .in() com lista grande estoura o tamanho da URL — busca em blocos. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function GET(req: NextRequest) {
  try {
    // Auth: cookie de admin OU `Authorization: Bearer ${CRON_SECRET}` para a
    // chamada server-to-server do cron diário. Só honra o bearer se o segredo
    // estiver realmente configurado.
    const cronSecret = process.env.CRON_SECRET
    const isCronCall =
      !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`

    if (!isCronCall) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const email = (user?.email ?? '').toLowerCase()
      if (!user || !ADMIN_EMAILS.has(email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Service credentials not configured' }, { status: 500 })
    }

    const admin = adminClient()

    // 0) PREFLIGHT DA COLUNA DE IDEMPOTÊNCIA — antes de qualquer coisa.
    // Sem a coluna não existe memória de envio, e um segundo run reenviaria
    // para todo mundo. Falha alto, com o SQL exato, e não manda nada.
    {
      const { error: flagErr } = await admin
        .from('profiles')
        .select(`id, ${FLAG_COLUMN}`)
        .limit(1)
      if (flagErr) {
        console.error('[stalled-rescue] idempotency column missing:', flagErr.message)
        return NextResponse.json(
          {
            error: `Idempotency column profiles.${FLAG_COLUMN} is missing — refusing to send.`,
            detail: flagErr.message,
            fix_sql: FLAG_MIGRATION_SQL,
            note: 'This route is inert until that column exists. Without it there is no record of who was already emailed, and a second run would re-send to the entire cohort.',
          },
          { status: 500 },
        )
      }
    }

    // 1) Quem COMEÇOU (dedupe pelas duas grafias do evento).
    const started = await distinctUserIdsForEvents(admin, START_EVENTS)
    if (started.error) {
      return NextResponse.json({ error: `start events query failed: ${started.error}` }, { status: 500 })
    }
    // 2) Quem COMPLETOU alguma vez (idem).
    const completed = await distinctUserIdsForEvents(admin, COMPLETE_EVENTS)
    if (completed.error) {
      return NextResponse.json({ error: `completion events query failed: ${completed.error}` }, { status: 500 })
    }

    // 3) Começou e NUNCA completou.
    const stalledIds = Array.from(started.ids).filter((id) => !completed.ids.has(id))
    if (stalledIds.length === 0) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        remaining_unemailed: 0,
        note: 'no users with a start event and no completion event',
      })
    }

    type Row = {
      id: string
      email: string | null
      plan: string | null
      is_pro: boolean | null
      has_paid: boolean | null
    }

    // 4) Perfis dessa gente: não pagantes, não-pro, não opt-out, ainda não
    // emailados nesta campanha. `email_opted_out = false` está na query da
    // COORTE — ou seja, vale igualmente para o `remaining_unemailed` do dry
    // run, não só para o envio.
    const rows: Row[] = []
    for (const ids of chunk(stalledIds, 200)) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, plan, is_pro, has_paid')
        .in('id', ids)
        .eq('has_paid', false)
        .eq('is_pro', false)
        .eq(FLAG_COLUMN, false)
        // KINEO-UNSUBSCRIBE-2026-07-26 — quem pediu para sair NUNCA entra em coorte.
        .eq('email_opted_out', false)
      if (error) {
        return NextResponse.json({ error: `profiles query failed: ${error.message}` }, { status: 500 })
      }
      rows.push(...((data ?? []) as Row[]))
    }

    // Diagnóstico (não é coorte): quantos da lista pediram para sair. Serve
    // para o relatório `skipped_opted_out` sem jamais tocar em quem optou.
    let optedOutCount = 0
    for (const ids of chunk(stalledIds, 200)) {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('id', ids)
        .eq('email_opted_out', true)
      optedOutCount += count ?? 0
    }

    // Quem tem evento mas nenhuma linha em `profiles` (conta apagada, evento
    // anônimo remapeado). Não dá para emailar nem para marcar.
    let profilesFound = 0
    for (const ids of chunk(stalledIds, 200)) {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('id', ids)
      profilesFound += count ?? 0
    }
    const skippedNoProfile = Math.max(0, stalledIds.length - profilesFound)

    const seen = new Set<string>()
    const recipients = rows
      .map((row) => ({
        id: row.id,
        email: (row.email ?? '').trim().toLowerCase(),
        plan: (row.plan ?? '').toLowerCase(),
        is_pro: !!row.is_pro,
        has_paid: !!row.has_paid,
      }))
      // free / unpaid only — nunca perseguir quem já paga
      .filter((r) => !r.has_paid && !r.is_pro && !PAID_PLANS.has(r.plan))
      // válido, externo, não descartável, não interno
      .filter((r) => isValidExternalEmail(r.email))
      // de-dupe por email
      .filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)))

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batchSize = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 50

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: 'started a generation, never completed one, unpaid, non-disposable, not yet stalled-rescue-emailed',
        started_total: started.ids.size,
        completed_total: completed.ids.size,
        started_never_completed: stalledIds.length,
        skipped_no_profile: skippedNoProfile,
        skipped_opted_out: optedOutCount,
        remaining_unemailed: recipients.length,
        next_batch_size: Math.min(batchSize, recipients.length),
        sample: recipients.slice(0, 8).map((r) => r.email),
        subject: SUBJECT,
        from: FROM_EMAIL,
        hint: 'Append &confirm=SEND (optionally &limit=N) to send the next batch.',
      })
    }

    const batch = recipients.slice(0, batchSize)
    const results: Array<{ email: string; outcome: string }> = []
    let sent = 0
    let failed = 0
    for (const r of batch) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [r.email],
            reply_to: REPLY_TO,
            subject: SUBJECT,
            text: `${EMAIL_TEXT}${emailFooterText(r.id)}`,
            html: emailHtml(r.id),
            headers: unsubscribeHeaders(r.id),
          }),
        })
        if (res.ok) {
          sent += 1
          results.push({ email: r.email, outcome: 'sent' })
          // Marca só no sucesso — um envio falho continua pendente pro próximo batch.
          await admin.from('profiles').update({ [FLAG_COLUMN]: true }).eq('id', r.id)
        } else {
          failed += 1
          results.push({ email: r.email, outcome: 'failed' })
          console.error(`[stalled-rescue] resend failed for ${r.email}:`, await res.text())
        }
      } catch (e) {
        failed += 1
        results.push({ email: r.email, outcome: 'failed' })
        console.error(`[stalled-rescue] send threw for ${r.email}:`, e instanceof Error ? e.message : String(e))
      }
      await new Promise((res) => setTimeout(res, 700))
    }

    console.log(`[stalled-rescue] batch done: sent=${sent} failed=${failed}`)
    return NextResponse.json({
      mode: 'SENT',
      sent,
      failed,
      skipped_no_profile: skippedNoProfile,
      skipped_opted_out: optedOutCount,
      batch_size: batch.length,
      remaining_after_batch: Math.max(0, recipients.length - batch.length),
      results,
    })
  } catch (err) {
    console.error('[stalled-rescue] unexpected:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
