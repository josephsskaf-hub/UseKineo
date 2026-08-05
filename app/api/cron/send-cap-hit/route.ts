import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { LIFECYCLE_SKIP_STAMP } from '@/lib/lifecycle/skipStamp'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { isInternalEmail } from '@/lib/internalAccounts'
import { TIER_PRICES, INTRO_PRICES, TIER_CREDITS } from '@/lib/checkoutPricing'

// send-cap-hit — Ordem 4 (docs/ORDENS-CONVERSAO-2026-08-02.md), 03/08/2026.
//
// "Quem faz o 3º vídeo do dia provou 3× que quer o produto HOJE." A free user
// who completes their 3rd Fast video inside 24h has just hit the wall the
// in-app counter shows (compose FREE_FAST_PREVIEW_LIMIT = 3, rolling 24h).
// This cron runs every 30 min and emails them within the hour, while intent
// is hot: Starter removes the wall, first month half off.
//
// Copy mirrors the APPROVED in-app refusal message (app/api/compose/route.ts):
// "Keep creating with Starter for $4.90 your first month, then $9.90/month."
// Prices/credits come from lib/checkoutPricing.ts — the single price source.
//
// Guard rails (same as the other lifecycle jobs):
// - max 1 per user EVER (profiles.cap_hit_sent_at). Pulo por atributo
//   IRREVERSIVEL carimba LIFECYCLE_SKIP_STAMP; pagante (reversivel) nao carimba.
// - 24h cross-suppression via lib/lifecycle/suppression.ts (fail-closed)
// - KINEO_LIFECYCLE_EMAILS_ENABLED gate, CRON_SECRET fail-closed
// - skips test/founder accounts, paid plans, opted-out users
//
// Metric (Ordem 4): cap_hit_sent_at → checkout_started same day.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const LIFECYCLE_EMAILS_ENABLED = process.env.KINEO_LIFECYCLE_EMAILS_ENABLED === 'true'
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const PAID_PLANS = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial', 'autopilot', 'autopilot_trial'])

/** The free wall this email is about (compose/route.ts FREE_FAST_PREVIEW_LIMIT). */
const FREE_CAP = 3

// Tetos explícitos (padrão de send-blackout-winback). Um incidente de fornecedor
// EMPURRA gente para o muro — reserva abandonada consome cota — então a coorte
// pode inchar de repente. Sem teto, um blackout viraria um disparo em massa.
const MAX_PER_RUN = 60
const MAX_COHORT_IDS = 300

// A lista de contas internas mora em lib/internalAccounts.ts — cópia local
// deixava de fora a irmã do fundador, os aliases `joseph+…` e o revisor do
// TAAFT. Antes isso quase nunca importava (exigia 3 vídeos completos em 24h);
// com a coorte lendo o muro, bastava UMA recusa para queimar essas contas.

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

function usd(minor: number): string {
  const v = minor / 100
  return Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`
}

function buildEmail(userId: string) {
  const url = `${APP_URL}/pricing?utm_source=lifecycle&utm_medium=email&utm_campaign=cap_hit`
  const intro = usd(INTRO_PRICES.starter.usd)
  const monthly = usd(TIER_PRICES.starter.usd)
  const credits = TIER_CREDITS.starter

  const text = `Hey,

You've used up today's free Fast previews — the cap is ${FREE_CAP} every 24 hours.

If you're on a roll, Starter removes the wall: ${credits} credits every month, clean exports with no watermark, and your first month is half off — ${intro}, then ${monthly}/month. Cancel anytime.

Keep creating: ${url}

Or wait for the reset — free previews come back every 24 hours, and your videos stay in your library either way.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">You've used up <strong>today's free Fast previews</strong> — the cap is ${FREE_CAP} every 24 hours.</p>
  <p style="margin:0 0 14px;">If you're on a roll, Starter removes the wall: <strong>${credits} credits every month</strong>, clean exports with no watermark, and your first month is half off — <strong>${intro}</strong>, then ${monthly}/month. Cancel anytime.</p>
  <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Keep creating &rarr;</a></p>
  <p style="margin:0 0 14px;">Or wait for the reset — free previews come back every 24 hours, and your videos stay in your library either way.</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!LIFECYCLE_EMAILS_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'lifecycle_email_gate' })
  }
  if (!RESEND_API_KEY) {
    console.error('[send-cap-hit] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service env missing' }, { status: 500 })
  }
  // KINEO-LIFECYCLE-FRESH-READ-2026-08-05 — `global.fetch` sem cache. Este job
  // decide "eu ja mandei este e-mail?" lendo o banco; leitura velha vira
  // reenvio, e reenvio custa a reputacao do dominio. Ver lib/lifecycle/freshFetch.ts.
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: freshFetch },
  })

  // ── KINEO-CAPHIT-READS-THE-WALL-2026-08-05 ────────────────────────────────
  // BUG CORRIGIDO: este cron existe para o momento em que a pessoa BATE no muro
  // — e não lia o muro. Ele reconstruía a coorte a partir de `videos` completos
  // (>= 3 em 24h), enquanto o muro de verdade (compose/route.ts) conta RESERVAS
  // (`compose_submission_claim`), não vídeos. Os dois denominadores discordam:
  // uma reserva abandonada consome a cota e não vira vídeo.
  //
  // Medido em 05/08: 27 de 231 reservas gratuitas em 7 dias (11,7%) não viraram
  // vídeo. Efeito prático — as 3 pessoas que bateram no muro nas últimas 24h
  // tinham 2 vídeos completos cada, ABAIXO do corte de 3. Este cron era
  // estruturalmente cego para elas: 8 das 11 pessoas que bateram no muro em
  // toda a história nunca receberam o e-mail, e nenhuma das 11 comprou.
  //
  // Fonte primária agora é `compose_refused` — o registro que o próprio muro
  // escreve quando devolve 402. O proxy antigo (>= FREE_CAP vídeos em 24h)
  // continua como fonte SECUNDÁRIA: quem completou a cota e ainda não tentou a
  // 4ª também está no muro, só não esbarrou nele ainda.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [refusalsResult, videosResult] = await Promise.all([
    admin
      .from('events')
      .select('user_id')
      .eq('name', 'compose_refused')
      .eq('metadata->>reason', 'free_fast_limit')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000),
    // O proxy tem que contar O MESMO que o muro conta: Fast e sem crédito
    // (compose/route.ts reserveFreeFastPreviewSlot). Sem `quality_mode`/
    // `credits_used` aqui, renders cinematográficos e Fast PAGOS entravam na
    // coorte — e um comprador com plan='free' recebia "você bateu no teto free".
    admin
      .from('videos')
      .select('user_id')
      .eq('status', 'completed')
      .eq('quality_mode', 'fast')
      .eq('credits_used', 0)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000),
  ])

  if (refusalsResult.error || videosResult.error) {
    const msg = refusalsResult.error?.message ?? videosResult.error?.message ?? 'unknown'
    console.error('[send-cap-hit] cohort query error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // (a) Bateram no muro de verdade — sinal quente, sem ambiguidade.
  const refusedIds = new Set<string>()
  for (const row of refusalsResult.data ?? []) {
    const id = row.user_id as string | null
    if (id) refusedIds.add(id)
  }

  // (b) Proxy antigo: completaram a cota inteira na janela.
  const perUser = new Map<string, number>()
  for (const row of videosResult.data ?? []) {
    const id = row.user_id as string | null
    if (!id) continue
    perUser.set(id, (perUser.get(id) ?? 0) + 1)
  }

  // `.in('id', ...)` viaja na query string do PostgREST — mesma armadilha que
  // lib/lifecycle/suppression.ts documenta (CHUNK_SIZE 200). Com a fonte nova a
  // coorte pode crescer, então o teto é explícito. O resto volta na próxima
  // rodada (30 min) — ninguém é perdido, só adiado.
  const cappedIds = Array.from(
    new Set<string>([
      ...refusedIds,
      ...Array.from(perUser.entries())
        .filter(([, n]) => n >= FREE_CAP)
        .map(([id]) => id),
    ]),
  ).slice(0, MAX_COHORT_IDS)

  if (cappedIds.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, total: 0, refused: 0, cohort: 0 })
  }

  const { data: candidates, error } = await admin
    .from('profiles')
    .select('id, email, plan, cap_hit_sent_at')
    .in('id', cappedIds)
    .is('cap_hit_sent_at', null)
    .eq('email_opted_out', false)

  if (error) {
    console.error('[send-cap-hit] profiles query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── KINEO-CAPHIT-FORENSICS-2026-08-05 ──────────────────────────────────────
  // Em 05/08 este cron reenviou o MESMO e-mail 3× para a mesma pessoa (21:45Z,
  // 22:45Z, 23:15Z). Para ser reselecionada, a linha dela precisa passar pelo
  // `.is('cap_hit_sent_at', null)` acima — mas uma consulta SQL direta ao banco,
  // nos mesmos minutos, mostrava o carimbo lá, estável. Ou seja: **o cron enxerga
  // uma versão da tabela diferente da que o Postgres serve ao SQL direto.**
  // Na mesma rodada, alguém sem NENHUM carimbo aparecia como suprimido.
  //
  // Já foram eliminados com evidência: trigger do banco, escrita de NULL no
  // código, linha duplicada (lower/btrim), réplica de leitura, outro cron
  // sobrescrevendo, e a montagem da coorte.
  //
  // Estes três logs decidem entre as duas explicações que sobraram, em UMA rodada:
  //   · valor cru NULL  → leitura velha/cache; o alvo é o cliente Supabase do cron.
  //   · valor cru com timestamp → o `.is(col, null)` do PostgREST não faz o que o
  //     código diz, e o problema vale para TODOS os crons de lifecycle.
  // Some daqui assim que a causa estiver fechada.
  console.log(
    `[send-cap-hit][forense] coorte=${cappedIds.length} candidatos=${(candidates ?? []).length} ` +
    `valores_crus=${JSON.stringify((candidates ?? []).map((u) => [u.id, u.cap_hit_sent_at]))}`,
  )

  // ── TRAVA DE REENVIO: RESERVA ATÔMICA (KINEO-CAPHIT-NO-REPEAT-2026-08-05) ──
  // Em 05/08 a mesma pessoa recebeu 3 e-mails idênticos em 90 minutos porque a
  // ÚNICA memória de "já enviei" era `profiles.cap_hit_sent_at` — e é exatamente
  // ela que o cron relê como nula.
  //
  // ⚠️ A PRIMEIRA VERSÃO DESTA TRAVA ESTAVA ERRADA, E A REVISÃO ADVERSARIAL
  // PEGOU. Ela consultava `events` antes de enviar, e o comentário chamava isso
  // de "outro caminho de escrita, outra tabela". **Não é.** É o MESMO cliente
  // Supabase, o MESMO PostgREST, a MESMA conexão — só muda o nome da tabela. E
  // este arquivo já lê `events` por esse caminho para montar a coorte, logo
  // acima. Se a causa raiz for leitura velha/cache, uma checagem em código falha
  // EXATAMENTE IGUAL, porque depende da mesma propriedade quebrada: a de que uma
  // leitura reflete uma escrita anterior. O comentário anterior teria convencido
  // o próximo leitor de que o problema estava fechado. Esse era o pior defeito.
  //
  // A trava real não PERGUNTA, ela RESERVA. O índice único parcial
  // `events_cap_hit_sent_once_per_user` (migration `cap_hit_sent_unique_per_user`,
  // aplicada em 05/08) faz o BANCO recusar o segundo registro. O laço abaixo
  // insere o evento ANTES de mandar o e-mail e só envia se o insert foi aceito;
  // violação de unicidade (23505) significa "alguém já recebeu" e pula.
  //
  // Isso troca esperança por garantia e NÃO depende de descobrir a causa raiz.
  // Preço aceito, explicitamente: se o Resend falhar DEPOIS da reserva, a pessoa
  // perde este e-mail para sempre. Um e-mail a menos é barato; um loop de
  // reenvio queima o domínio da empresa inteira.
  let reservationFailed = 0
  let alreadyReserved = 0

  const suppression = await loadLifecycleSuppression(
    admin,
    (candidates ?? []).map((u) => u.id as string),
  )

  let sent = 0
  let skipped = 0
  let suppressed = 0

  for (const u of candidates ?? []) {
    if (sent >= MAX_PER_RUN) break

    // Suppressed = another lifecycle email in the last 24h. NOT stamped — they
    // stay eligible on the next run while still inside their hot window.
    if (suppression.isSuppressed(u.id as string)) {
      suppressed++
      continue
    }

    const email = u.email?.trim()
    const plan = (u.plan ?? 'free').toLowerCase()

    // Plano é REVERSÍVEL e o carimbo é VITALÍCIO: carimbar um pagante aqui o
    // queima para sempre caso ele volte para o free. Pagante só pula.
    if (email && !isInternalEmail(email) && PAID_PLANS.has(plan)) {
      skipped++
      continue
    }

    // Conta interna / sem e-mail: carimba, porque isso nunca muda.
    if (!email || isInternalEmail(email)) {
      skipped++
      // Sentinela de pulo (KINEO-SKIP-STAMP-2026-08-05): a linha nunca é
      // reconsiderada, mas o carimbo não entra na janela de 24h da supressão.
      await admin
        .from('profiles')
        .update({ cap_hit_sent_at: LIFECYCLE_SKIP_STAMP })
        .eq('id', u.id)
      continue
    }

    // ── RESERVA: o banco decide se este envio pode acontecer ─────────────────
    // Vem ANTES do Resend de propósito. O índice único parcial recusa o segundo
    // insert, então duas rodadas nunca mandam o mesmo e-mail — mesmo que a
    // leitura de `profiles` esteja velha, que é a causa raiz suspeita.
    const stampedAt = new Date().toISOString()
    const { error: reserveErr } = await admin.from('events').insert({
      user_id: u.id,
      name: 'cap_hit_sent',
      path: '/api/cron/send-cap-hit',
      // `email` aqui de propósito: numa investigação de "quem recebeu duas
      // vezes", é o único campo que responde a pergunta sem outro JOIN.
      metadata: { email, reserved_at: stampedAt },
    })

    if (reserveErr) {
      // 23505 = unique_violation. Não é erro: é a trava fazendo o trabalho dela.
      if (reserveErr.code === '23505') {
        alreadyReserved++
        console.log(`[send-cap-hit] ${u.id} JA RECEBEU (reserva existente) — reenvio impedido pelo banco`)
      } else {
        reservationFailed++
        console.error(
          `[send-cap-hit] reserva falhou para ${u.id}: ${reserveErr.code ?? '?'} ${reserveErr.message}` +
          ' — NAO enviado (sem reserva nao ha garantia de envio unico)',
        )
      }
      continue
    }

    const { text, html } = buildEmail(u.id)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          reply_to: 'hello@usekineo.com',
          subject: "You hit today's free limit — Starter removes the wall",
          text,
          html,
          headers: unsubscribeHeaders(u.id),
        }),
      })

      if (res.ok) {
        sent++
        // KINEO-CAPHIT-FORENSICS-2026-08-05 — o erro deste update era IGNORADO
        // (nos 5 crons de lifecycle). Escrita que falha em silêncio é
        // indistinguível de escrita que funcionou. A reserva acima já garante o
        // envio único; o carimbo abaixo continua sendo a métrica da Ordem 4.
        const { data: written, error: stampErr } = await admin
          .from('profiles')
          .update({ cap_hit_sent_at: stampedAt })
          .eq('id', u.id)
          .select('id, cap_hit_sent_at')
        if (stampErr) {
          console.error(
            `[send-cap-hit][forense] FALHA AO CARIMBAR ${email}: ${stampErr.code ?? '?'} ${stampErr.message}` +
            ' — esta pessoa vai receber o e-mail DE NOVO na próxima rodada',
          )
        } else if (!written || written.length === 0) {
          console.error(
            `[send-cap-hit][forense] carimbo de ${email} nao afetou NENHUMA linha (0 rows) —` +
            ' a escrita foi aceita e nao persistiu; reenvio garantido na proxima rodada',
          )
        } else {
          // ⚠️ O `.select()` acima é o RETURNING do PRÓPRIO update: ele prova que
          // a linha foi casada, e NADA sobre o que um SELECT posterior enxerga.
          // Como staleness é justamente a hipótese, a sonda tem que ser uma
          // leitura INDEPENDENTE, emitida depois. Se as duas discordarem, a
          // causa raiz está provada e o alvo é o cliente/PostgREST, não o código.
          const { data: reRead } = await admin
            .from('profiles')
            .select('cap_hit_sent_at')
            .eq('id', u.id)
            .maybeSingle()
          const escrito = written[0].cap_hit_sent_at
          const relido = reRead?.cap_hit_sent_at ?? null
          if (escrito !== relido) {
            console.error(
              `[send-cap-hit][forense] 🔴 LEITURA DIVERGE DA ESCRITA para ${u.id}: ` +
              `RETURNING=${escrito} mas SELECT posterior=${relido} — leitura velha CONFIRMADA`,
            )
          } else {
            console.log(`[send-cap-hit][forense] carimbo de ${u.id} confirmado e relido: ${relido}`)
          }
        }
        console.log(`[send-cap-hit] sent to ${email}`)
      } else {
        // ⚠️ A RESERVA JÁ FOI GRAVADA e não é desfeita de propósito: esta pessoa
        // não recebe mais este e-mail. Preço aceito da garantia de envio único —
        // mas tem que ser ALTO no log, senão vira perda silenciosa de lead quente.
        console.error(
          `[send-cap-hit] 🔴 resend RECUSOU ${email} DEPOIS da reserva — esta pessoa NAO recebera` +
          ` o e-mail do muro: ${await res.text()}`,
        )
      }
    } catch (err) {
      console.error(`[send-cap-hit] 🔴 erro para ${email} DEPOIS da reserva (nao recebera):`, err)
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    total: (candidates ?? []).length,
    // Observabilidade da correção: quantos vieram do MURO (compose_refused) vs.
    // do proxy antigo. `refused` alto com `sent` 0 = coorte já carimbada.
    refused: refusedIds.size,
    cohort: cappedIds.length,
    suppressed_recent_lifecycle: suppressed,
    suppression_degraded: suppression.degraded,
    // Quantos a TRAVA impediu de receber duas vezes. > 0 de forma recorrente =
    // a coorte continua trazendo gente ja atendida, ou seja, a causa raiz da
    // leitura velha SEGUE VIVA e o indice unico e a unica coisa nos segurando.
    already_reserved: alreadyReserved,
    // > 0 = o banco recusou a reserva por um motivo que NAO e duplicata. Ninguem
    // foi enviado nesses casos: sem reserva, sem garantia, sem e-mail.
    reservation_failed: reservationFailed,
  })
}
