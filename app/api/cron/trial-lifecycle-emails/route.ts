import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import {
  REVERSE_TRIAL_ENABLED,
  TRIAL_CREDIT_CAP,
  TRIAL_VARIANT_DAYS,
  isPayingProfile,
  isTrialActive,
  trialCreditsUsed,
  type TrialProfileFields,
  type TrialVariant,
} from '@/lib/reverseTrial'

// trial-lifecycle-emails — REVERSE TRIAL FASE 2, ITEM 4 (07/08/2026).
// [KINEO-TRIAL-EMAILS-2026-08-07]
//
// UM cron diário, CINCO e-mails, cada um no máximo UMA vez por conta, para
// sempre. A sequência (spec do fundador, ORDENS-AQUISICAO 06/08 noite):
//
//   d0_welcome         — trial ativado há <24h: "your Creator trial is live —
//                        40 credits". Um CTA só: gerar vídeo.
//   ending_soon        — variante 3d no D2 / variante 7d no D5 ("ends
//                        tomorrow"/"2 days left") + o que a pessoa perde.
//                        SEM desconto — preço cheio.
//   expired_offer_d5   — 5 dias após o fim, não converteu: 50% off Creator por
//                        3 meses, cupom COMEBACK50 (já existe na Stripe desde
//                        a ORDEM I; o checkout resolve ?promo=). REGRA DO
//                        FUNDADOR: o desconto existe SÓ nestes dois e-mails,
//                        NUNCA em superfície pública.
//   expired_lastcall_d10 — 10 dias após o fim: última chamada do mesmo cupom.
//   trial_extended     — expirou tendo usado <10 dos 40 créditos e nunca foi
//                        estendido: "we extended your trial 3 more days" +
//                        UPDATE real (trial_ends_at = now+3d, status volta a
//                        'active', trial_extended = true). Idempotente por
//                        trial_extended — UMA extensão por conta, para sempre.
//
// FLAG: KINEO_REVERSE_TRIAL_ENABLED, a MESMA do trial (não a de lifecycle).
// Estes e-mails são parte da feature — com a flag OFF não existe linha com
// trial_status preenchido, mas o gate explícito garante que nem a query roda.
// (?dry=1 atravessa o gate, como em send-credits-back: dimensionar antes de
// ligar é o motivo de o dry-run existir.)
//
// IDEMPOTÊNCIA — tabela trial_emails_log (migração 07/08), PK(user_id,
// email_kind). O cron REIVINDICA a linha ANTES de enviar (upsert com
// ignoreDuplicates; 0 linhas = outro run já pegou) e só então chama a Resend.
// Envio que falha apaga a reivindicação e reentra amanhã. Crash entre claim e
// envio perde no máximo UM e-mail — o lado barato ("perder um e-mail é barato;
// e-mail repetido queima domínio", lib/lifecycle/suppression.ts).
//
// QUEM NUNCA RECEBE NADA DAQUI: trial_status='converted' (fora da query),
// pagante por isPayingProfile (denylist invertida — na dúvida, é pagante e não
// recebe upsell), email_opted_out, contas de teste, e qualquer um que recebeu
// outro e-mail de lifecycle nas últimas 24h (supressão cruzada fail-closed).
// Na direção oposta, os envios daqui entram na janela dos outros jobs via
// trial_emails_log em lib/lifecycle/suppression.ts — mesmo commit, como manda
// a regra de lá.
//
// RELÓGIOS. Não existe trial_started_at nem trial_expired_at:
//   · início  = trial_ends_at − dias da variante (TRIAL_VARIANT_DAYS);
//   · fim     = trial_ends_at quando já passou; para quem estourou o TETO
//     antes do prazo (trial_ends_at ainda no futuro) o fim observável é
//     trial_downgraded_at, carimbado pelo cron horário de downgrade — até lá a
//     conta não entra em janela nenhuma (atraso máximo de ~1h, irrelevante em
//     janelas de dias).
//
// AGENDAMENTO: "30 16 * * *" (vercel.json). Minuto :30 não colide com nenhum
// job horário (:00/:05/:10/:15/:20/:35/:40/:45/:50/:55) e 16:30 UTC fica 1h05
// depois do send-credits-back (15:25) — a supressão cruzada de 24h resolve a
// interseção das coortes, e 16h30 UTC ainda é caixa de entrada aberta nos EUA.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/** Teto duro de envios por execução (spec: 200). */
const MAX_PER_RUN = 200
/** PostgREST manda `in.(...)` na query string — fatiar para não estourar a URL. */
const CHUNK_SIZE = 200

/**
 * Janela do welcome. A spec diz "ativação <24h", e é isso que o cron diário
 * alcança; as 24h extras existem SÓ para o caso de o primeiro dia ter sido
 * comido pela supressão cruzada (ex.: activation-nudge saiu horas antes) — a
 * pessoa recebe o welcome no D1 em vez de nunca.
 */
const D0_WINDOW_MS = 48 * HOUR_MS

/**
 * "Ends tomorrow"/"ends soon", por variante. Com cadência diária, o disparo
 * cai no D2 da variante 3d (resta ≤36h) e no D5 da 7d (restam ≤60h) — os dias
 * exatos da spec, tolerando o jitter de um cron por dia.
 */
const ENDING_SOON_MS: Record<TrialVariant, number> = {
  '3d': 36 * HOUR_MS,
  '7d': 60 * HOUR_MS,
}

/** Janela do e-mail de oferta D5: [5, 10) dias após o fim do trial. */
const OFFER_D5_FROM_MS = 5 * DAY_MS
/** D10 (última chamada): [10, 15) dias. Depois disso, silêncio — coorte morta. */
const OFFER_D10_FROM_MS = 10 * DAY_MS
const OFFER_D10_TO_MS = 15 * DAY_MS

/** Extensão: só faz sentido logo depois do fim — não ressuscitar linha velha. */
const EXTENSION_MAX_AGE_MS = 7 * DAY_MS
/** "Mal usou o trial" = menos de 10 dos 40 créditos. */
const EXTENSION_MAX_CREDITS_USED = 10
const EXTENSION_DAYS = 3

/**
 * Cupom 50% off / 3 meses, criado na Stripe pela ORDEM I (COMEBACK50 — cupom E
 * promotion code, conferido no dashboard em GATES-ABERTOS). NADA é criado na
 * Stripe por este cron: o link /pricing?promo= já resolve no checkout
 * (PricingClient #453 → app/api/stripe/checkout).
 */
const COMEBACK_CODE = 'COMEBACK50'

type EmailKind =
  | 'd0_welcome'
  | 'ending_soon'
  | 'expired_offer_d5'
  | 'expired_lastcall_d10'
  | 'trial_extended'

/** Ordem de corte quando o teto de 200 aperta: o mais valioso primeiro. */
const KIND_PRIORITY: Record<EmailKind, number> = {
  trial_extended: 0,
  d0_welcome: 1,
  ending_soon: 2,
  expired_offer_d5: 3,
  expired_lastcall_d10: 4,
}

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

function isTestEmail(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') ||
    e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') ||
    e.startsWith('test') ||
    e.includes('mailinator') ||
    e.startsWith('smoketest')
  )
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function parseTime(raw: unknown): number {
  if (!raw) return 0
  const t = Date.parse(String(raw))
  return Number.isNaN(t) ? 0 : t
}

interface Candidate {
  id: string
  email: string
  kind: EmailKind
  variant: TrialVariant
  /** trial_status observado na leitura — vira CAS na extensão. */
  status: string
  /** true = a extensão ainda precisa do UPDATE (false = retry só do e-mail). */
  needsExtensionUpdate: boolean
  /** Saldo observado (CAS da restauração de crédito na extensão). */
  balance: number | null
  /** Créditos a devolver na extensão (só linha 'downgraded' já revogada). */
  restore: number
}

interface ProfileRow extends TrialProfileFields {
  id?: unknown
  email?: unknown
  plan?: unknown
  has_paid?: unknown
  trial_variant?: unknown
  trial_extended?: unknown
  trial_credits_granted?: unknown
  trial_downgraded_at?: unknown
  video_credits?: unknown
}

function variantOf(raw: unknown): TrialVariant {
  return raw === '7d' ? '7d' : '3d'
}

/**
 * Decide QUAL e-mail (se algum) esta linha deve receber hoje. No máximo UM
 * kind por conta por execução — as coortes são disjuntas por status, e os dois
 * cruzamentos possíveis são resolvidos por prioridade explícita:
 *   · trial recém-nascido da variante 3d: welcome (D0/D1) ganha de ending_soon;
 *   · expirado com <10 créditos usados: extensão ganha da oferta D5/D10.
 */
function dueKind(row: ProfileRow, now: number): Candidate | null {
  const id = typeof row.id === 'string' ? row.id : ''
  const email = typeof row.email === 'string' ? row.email.trim() : ''
  if (!id || !email || isTestEmail(email)) return null
  // Pagante NUNCA recebe e-mail de trial — nem welcome (o webhook da Stripe
  // carimba 'converted', mas a denylist invertida cobre a janela até lá).
  if (isPayingProfile(row)) return null

  const status = typeof row.trial_status === 'string' ? row.trial_status : ''
  const variant = variantOf(row.trial_variant)
  const used = trialCreditsUsed(row)
  const extended = row.trial_extended === true
  const endsMs = parseTime(row.trial_ends_at)

  const base = { id, email, variant, status, needsExtensionUpdate: false, balance: null, restore: 0 }

  if (status === 'active') {
    // Retry do e-mail de extensão: o UPDATE aconteceu num run anterior mas o
    // envio falhou depois do claim ser desfeito (ou o processo morreu antes
    // dele). A assinatura é inconfundível: já estendido, ativo, e o novo prazo
    // cabe dentro dos 3 dias da extensão. Sem UPDATE novo — só o e-mail.
    if (extended && endsMs > now && endsMs - now <= EXTENSION_DAYS * DAY_MS) {
      return { ...base, kind: 'trial_extended' }
    }
    // 'active' no banco mas já vencido (relógio ou teto) = limbo pré-cron de
    // downgrade. Nenhum e-mail: "ends tomorrow" depois do fim é mentira, e a
    // coorte pós-fim pega a linha quando o status virar.
    if (!isTrialActive(row, now)) return null
    const startMs = endsMs - TRIAL_VARIANT_DAYS[variant] * DAY_MS
    if (now - startMs < 24 * HOUR_MS) return { ...base, kind: 'd0_welcome' }
    if (endsMs - now <= ENDING_SOON_MS[variant]) return { ...base, kind: 'ending_soon' }
    if (now - startMs < D0_WINDOW_MS) return { ...base, kind: 'd0_welcome' }
    return null
  }

  if (status === 'expired' || status === 'downgraded') {
    // Fim observável: trial_ends_at quando já passou; senão (teto estourado
    // antes do prazo) o carimbo do cron de downgrade. Sem nenhum dos dois, a
    // linha ainda não tem relógio — espera o próximo run.
    const downAt = parseTime(row.trial_downgraded_at)
    const endedAt = endsMs > 0 && endsMs <= now ? endsMs : downAt > 0 && downAt <= now ? downAt : 0
    if (endedAt === 0) return null
    const sinceEnd = now - endedAt

    if (!extended && used < EXTENSION_MAX_CREDITS_USED && sinceEnd < EXTENSION_MAX_AGE_MS) {
      const rawBalance = row.video_credits
      const balance = typeof rawBalance === 'number' && Number.isFinite(rawBalance) ? rawBalance : null
      const grantedRaw = row.trial_credits_granted
      const granted = typeof grantedRaw === 'number' && Number.isFinite(grantedRaw) ? grantedRaw : 0
      // Linha 'downgraded' já teve o não-gasto revogado pelo cron de downgrade;
      // a extensão devolve granted−used — o teto do que aquela revogação pode
      // ter tirado (ela revoga min(saldo, não-gasto), então no caso raro de o
      // saldo estar abaixo do não-gasto isto devolve um pouco mais do que saiu;
      // limitado a UMA vez por conta via trial_extended e a ≤40 por construção,
      // é o lado barato do erro). Linha sem registro de concessão (granted 0)
      // devolve 0 — mesma regra de dinheiro de downgradeExpiredTrial. Linha
      // 'expired' ainda tem o saldo: devolver seria conceder em dobro.
      const restore = status === 'downgraded' ? Math.max(0, granted - used) : 0
      return { ...base, kind: 'trial_extended', needsExtensionUpdate: true, balance, restore }
    }
    if (sinceEnd >= OFFER_D5_FROM_MS && sinceEnd < OFFER_D10_FROM_MS) {
      return { ...base, kind: 'expired_offer_d5' }
    }
    if (sinceEnd >= OFFER_D10_FROM_MS && sinceEnd < OFFER_D10_TO_MS) {
      return { ...base, kind: 'expired_lastcall_d10' }
    }
  }

  return null
}

function utm(campaign: string): string {
  return `utm_source=lifecycle&utm_medium=email&utm_campaign=${campaign}&intent_campaign=${campaign}`
}

function buildEmail(c: Candidate): { subject: string; text: string; html: string } {
  const footerText = emailFooterText(c.id)
  const footerHtml = emailFooterHtml(c.id)
  const wrap = (inner: string) =>
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">${inner}</div>\n${footerHtml}`
  const cta = (url: string, label: string) =>
    `<p style="margin:0 0 20px;"><a href="${url}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">${label} &rarr;</a></p>`
  const sig = `<p style="margin:0 0 2px;">Kineo Team</p>\n<p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>`

  if (c.kind === 'd0_welcome') {
    const url = `${APP_URL}/generate?${utm('trial_d0')}`
    const text = `Hey,

Your Creator trial is live. ${TRIAL_CREDIT_CAP} credits just landed in your account — everything Creator has is unlocked, no card needed.

The fastest way to see what that means: make one Short. Type any topic, hit generate, and it's done in about a minute.

Make your first Short: ${url}

Kineo Team
usekineo.com`
    const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>Your Creator trial is live.</strong> ${TRIAL_CREDIT_CAP} credits just landed in your account &mdash; everything Creator has is unlocked, no card needed.</p>
  <p style="margin:0 0 14px;">The fastest way to see what that means: make one Short. Type any topic, hit generate, and it's done in about a minute.</p>
  ${cta(url, 'Make your first Short')}
  ${sig}`)
    return { subject: `Your Creator trial is live — ${TRIAL_CREDIT_CAP} credits inside`, text: `${text}${footerText}`, html }
  }

  if (c.kind === 'ending_soon') {
    const url = `${APP_URL}/pricing?${utm('trial_ending')}`
    const when = c.variant === '3d' ? 'tomorrow' : 'in 2 days'
    const subject = c.variant === '3d' ? 'Your Creator trial ends tomorrow' : '2 days left on your Creator trial'
    const text = `Hey,

Your Creator trial ends ${when}. After that you're back on the free plan, which means:

- Your unused trial credits expire
- The Creator AI engines lock
- You're back to the free daily limit

If Kineo's been working for you, keep everything exactly as it is: ${url}

Kineo Team
usekineo.com`
    const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>Your Creator trial ends ${when}.</strong> After that you're back on the free plan, which means:</p>
  <ul style="margin:0 0 14px;padding-left:20px;color:#475569;">
    <li>Your unused trial credits expire</li>
    <li>The Creator AI engines lock</li>
    <li>You're back to the free daily limit</li>
  </ul>
  <p style="margin:0 0 14px;">If Kineo's been working for you, keep everything exactly as it is:</p>
  ${cta(url, 'Keep Creator')}
  ${sig}`)
    return { subject, text: `${text}${footerText}`, html }
  }

  if (c.kind === 'expired_offer_d5') {
    const url = `${APP_URL}/pricing?promo=${COMEBACK_CODE}&${utm('trial_offer_d5')}`
    const text = `Hey,

Your Creator trial ended a few days ago. If the timing wasn't right, here's a better deal than the trial ever was:

50% off Creator for 3 months, with code ${COMEBACK_CODE}.

Claim it here — the code applies at checkout: ${url}

Everything you had in the trial comes back the moment you subscribe.

Kineo Team
usekineo.com`
    const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">Your Creator trial ended a few days ago. If the timing wasn't right, here's a better deal than the trial ever was:</p>
  <p style="margin:0 0 14px;font-size:16px;"><strong>50% off Creator for 3 months</strong>, with code <strong>${COMEBACK_CODE}</strong>.</p>
  <p style="margin:0 0 14px;">Everything you had in the trial comes back the moment you subscribe.</p>
  ${cta(url, `Claim 50% off`)}
  <p style="margin:0 0 20px;font-size:13px;color:#64748b;">The code applies automatically at checkout.</p>
  ${sig}`)
    return { subject: 'Come back to Creator — 50% off for 3 months', text: `${text}${footerText}`, html }
  }

  if (c.kind === 'expired_lastcall_d10') {
    const url = `${APP_URL}/pricing?promo=${COMEBACK_CODE}&${utm('trial_offer_d10')}`
    const text = `Hey,

Quick heads-up, and then we'll leave you alone: your 50% off Creator for 3 months (code ${COMEBACK_CODE}) is still live, but this is the last time we'll mention it.

Grab it here: ${url}

After this it's full price. No hard feelings either way.

Kineo Team
usekineo.com`
    const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">Quick heads-up, and then we'll leave you alone: your <strong>50% off Creator for 3 months</strong> (code <strong>${COMEBACK_CODE}</strong>) is still live, but this is the last time we'll mention it.</p>
  ${cta(url, 'Claim 50% off')}
  <p style="margin:0 0 20px;font-size:13px;color:#64748b;">After this it's full price. No hard feelings either way.</p>
  ${sig}`)
    return { subject: `Last call: 50% off Creator expires`, text: `${text}${footerText}`, html }
  }

  // trial_extended
  const url = `${APP_URL}/generate?${utm('trial_extended')}`
  const text = `Hey,

Looks like you barely got a chance to try your Creator trial — so we extended it. You have ${EXTENSION_DAYS} more days, starting now.

Your credits are back in your account. Type any topic, hit generate, and see what Creator can do: ${url}

Kineo Team
usekineo.com`
  const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">Looks like you barely got a chance to try your Creator trial &mdash; so <strong>we extended it. You have ${EXTENSION_DAYS} more days, starting now.</strong></p>
  <p style="margin:0 0 14px;">Your credits are back in your account. Type any topic, hit generate, and see what Creator can do.</p>
  ${cta(url, 'Use your trial')}
  ${sig}`)
  return { subject: `We added ${EXTENSION_DAYS} more days to your Creator trial`, text: `${text}${footerText}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?dry=1 — mede o público sem enviar, sem estender e sem reivindicar nada.
  const dryRun = req.nextUrl.searchParams.get('dry') === '1'

  if (!dryRun && !REVERSE_TRIAL_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'reverse_trial_flag_off' })
  }
  if (!dryRun && !RESEND_API_KEY) {
    console.error('[trial-lifecycle-emails] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service env missing' }, { status: 500 })
  }
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // Leitura de cron nunca vem de cache (KINEO-LIFECYCLE-FRESH-READ-2026-08-05).
    global: { fetch: freshFetch },
  })

  const now = Date.now()

  // ── 1) Toda conta que já teve trial e ainda pode receber algo ──────────────
  // 'converted' fica FORA da query — quem pagou nunca mais entra aqui, nem por
  // bug de janela. Volume: trials nascem só com a flag ON, coorte de dias.
  const { data: rows, error: rowsErr } = await admin
    .from('profiles')
    .select(
      'id, email, plan, has_paid, trial_status, trial_ends_at, trial_downgraded_at, trial_variant, trial_credits_used, trial_credits_granted, trial_extended, video_credits',
    )
    .in('trial_status', ['active', 'expired', 'downgraded'])
    .eq('email_opted_out', false)
    .limit(5000)

  if (rowsErr) {
    console.error('[trial-lifecycle-emails] cohort query failed:', rowsErr.message)
    return NextResponse.json({ error: rowsErr.message }, { status: 500 })
  }

  const candidates: Candidate[] = []
  for (const row of (rows ?? []) as ProfileRow[]) {
    const c = dueKind(row, now)
    if (c) candidates.push(c)
  }

  if (candidates.length === 0) {
    return NextResponse.json({ sent: 0, cohort: (rows ?? []).length, eligible: 0, reason: 'nobody_due' })
  }

  // ── 2) Idempotência: quem já recebeu este kind não entra nem no batch ──────
  // (O claim do passo 4 é a trava real contra corrida; este filtro só evita
  // gastar supressão e teto com quem certamente será pulado.)
  const alreadySent = new Set<string>()
  for (const part of chunk(Array.from(new Set(candidates.map((c) => c.id))), CHUNK_SIZE)) {
    const { data: logRows, error: logErr } = await admin
      .from('trial_emails_log')
      .select('user_id, email_kind')
      .in('user_id', part)
    if (logErr) {
      // Falha fechada: sem enxergar o log, enviar é arriscar duplicata.
      console.error('[trial-lifecycle-emails] log query failed:', logErr.message)
      return NextResponse.json({ error: 'email_log_unavailable' }, { status: 503 })
    }
    for (const r of (logRows ?? []) as Array<Record<string, unknown>>) {
      if (typeof r.user_id === 'string' && typeof r.email_kind === 'string') {
        alreadySent.add(`${r.user_id}:${r.email_kind}`)
      }
    }
  }
  const fresh = candidates.filter((c) => !alreadySent.has(`${c.id}:${c.kind}`))

  // ── 3) Supressão cruzada de 24h (fail-closed) + teto por execução ──────────
  const suppression = await loadLifecycleSuppression(admin, fresh.map((c) => c.id))
  const eligible = fresh.filter((c) => !suppression.isSuppressed(c.id))
  eligible.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])
  const batch = eligible.slice(0, MAX_PER_RUN)

  const byKind: Record<string, number> = {}
  for (const c of batch) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      sent: 0,
      would_send: batch.length,
      by_kind: byKind,
      cohort: (rows ?? []).length,
      due: candidates.length,
      already_sent_filtered: candidates.length - fresh.length,
      suppressed_recent_lifecycle: suppression.suppressedCount,
      suppression_degraded: suppression.degraded,
      capped_out: Math.max(0, eligible.length - batch.length),
      flag_enabled: REVERSE_TRIAL_ENABLED,
    })
  }

  let sent = 0
  let failed = 0
  let skippedClaimed = 0
  let skippedExtensionRace = 0
  let creditsRestored = 0

  for (const c of batch) {
    // ── 4a) Extensão: o UPDATE vem ANTES do e-mail ──────────────────────────
    // CAS em trial_extended=false + trial_status observado (+ saldo quando há
    // dinheiro a devolver). 0 linhas = corrida perdida (outro run estendeu, ou
    // a pessoa pagou e o webhook mudou o status) → NADA é enviado. Sem retry:
    // amanhã este cron reavalia com dados frescos. trial_extended=true na
    // mesma escrita é o que torna a extensão UMA por conta, para sempre —
    // mesmo que o e-mail falhe depois, o UPDATE nunca se repete.
    if (c.kind === 'trial_extended' && c.needsExtensionUpdate) {
      const patch: Record<string, unknown> = {
        trial_status: 'active',
        trial_ends_at: new Date(now + EXTENSION_DAYS * DAY_MS).toISOString(),
        trial_extended: true,
      }
      if (c.restore > 0) patch.video_credits = (c.balance ?? 0) + c.restore
      let write = admin
        .from('profiles')
        .update(patch)
        .eq('id', c.id)
        .eq('trial_extended', false)
        .eq('trial_status', c.status)
      if (c.restore > 0) {
        write = c.balance === null ? write.is('video_credits', null) : write.eq('video_credits', c.balance)
      }
      const { data: updated, error: updateErr } = await write.select('id')
      if (updateErr || !updated || updated.length === 0) {
        if (updateErr) console.error(`[trial-lifecycle-emails] extension update failed for ${c.id.slice(0, 8)}:`, updateErr.message)
        skippedExtensionRace++
        continue
      }
      creditsRestored += c.restore
      console.log(`[trial-lifecycle-emails] EXTENDED user=${c.id.slice(0, 8)} +${EXTENSION_DAYS}d restored=${c.restore}cr`)
    }

    // ── 4b) Claim do e-mail ANTES do envio ──────────────────────────────────
    // ignoreDuplicates + PK(user_id, email_kind): 0 linhas = já reivindicado
    // (execução paralela ou run anterior) → não envia. Duplo envio é
    // impossível por construção; o pior caso (crash entre claim e envio) perde
    // um e-mail, que é o lado barato.
    const { data: claimed, error: claimErr } = await admin
      .from('trial_emails_log')
      .upsert(
        { user_id: c.id, email_kind: c.kind, sent_at: new Date().toISOString() },
        { onConflict: 'user_id,email_kind', ignoreDuplicates: true },
      )
      .select('user_id')
    if (claimErr) {
      console.error(`[trial-lifecycle-emails] claim failed for ${c.id.slice(0, 8)}:`, claimErr.message)
      failed++
      continue
    }
    if (!claimed || claimed.length === 0) {
      skippedClaimed++
      continue
    }

    const body = buildEmail(c)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [c.email],
          reply_to: 'hello@usekineo.com',
          subject: body.subject,
          text: body.text,
          html: body.html,
          headers: unsubscribeHeaders(c.id),
        }),
      })
      if (res.ok) {
        sent++
        // Instrumentação: denominador do funil por kind (sent → arrived → paid).
        await admin.from('events').insert({
          user_id: c.id,
          name: 'trial_lifecycle_email_sent',
          path: '/api/cron/trial-lifecycle-emails',
          metadata: { kind: c.kind, variant: c.variant, restored: c.restore },
        })
        console.log(`[trial-lifecycle-emails] sent ${c.kind} to ${c.email}`)
      } else {
        failed++
        console.error(`[trial-lifecycle-emails] resend failed (${c.kind}) for ${c.email}:`, await res.text())
        // Devolve a reivindicação — reentra amanhã. Para a extensão, o UPDATE
        // fica (é idempotente e já é verdade); o ramo de retry em dueKind()
        // reenvia só o e-mail.
        await admin.from('trial_emails_log').delete().eq('user_id', c.id).eq('email_kind', c.kind)
      }
    } catch (err) {
      failed++
      console.error(`[trial-lifecycle-emails] error (${c.kind}) for ${c.email}:`, err)
      await admin.from('trial_emails_log').delete().eq('user_id', c.id).eq('email_kind', c.kind)
    }
  }

  return NextResponse.json({
    sent,
    failed,
    by_kind: byKind,
    cohort: (rows ?? []).length,
    due: candidates.length,
    already_sent_filtered: candidates.length - fresh.length,
    eligible: eligible.length,
    capped_out: Math.max(0, eligible.length - batch.length),
    skipped_claimed: skippedClaimed,
    skipped_extension_race: skippedExtensionRace,
    credits_restored: creditsRestored,
    suppressed_recent_lifecycle: suppression.suppressedCount,
    suppression_degraded: suppression.degraded,
  })
}
