// ═══ KINEO-ANUAL-2o-MES-2026-10-08 — e-mail diário: quem acabou de entrar no 2º mês recebe a oferta do anual (30%) ═══
//
// Decisão do fundador (08/10 ~01h BRT): "É o mensal e no segundo mês a gente tenta trocar pro anual. Com desconto de
// 30%." A tela (cartão na conta, aviso no /studio) só alcança quem volta ao app; este e-mail alcança quem acabou de pagar
// a 1ª renovação — o momento em que o mercado mais troca do mensal para o anual (ChartMogul).
//
// QUEM RECEBE (todas, nesta ordem; cada pulo é contado na resposta):
//   1. coorte bruta: `subscription_invoice_paid` dos últimos 7 dias com billing_reason 'subscription_cycle' e que não é a
//      conversão do teste (o webhook grava uma linha por fatura paga) — uma linha por assinatura;
//   2. sem o carimbo `month2_annual_offer_sent` desta assinatura (id fixo por assinatura → 1 e-mail por assinatura, para
//      sempre);
//   3. perfil com ESTA assinatura, e-mail entregável, sem opt-out de marketing, e passando no atalho do perfil
//      (month2ProfileBlocker: não interna, fora do teste, plano da escada);
//   4. a Stripe decide pelo núcleo único (evaluateAnnualSwitch, a MESMA leitura da tela): elegível (ativa, mensal, USD,
//      sem cupom, sem cancelamento agendado, créditos iguais) e EXATAMENTE 1 renovação paga, dentro da janela;
//   5. supressão de 24 h da casa (outro e-mail nosso nas últimas 24 h = fica para amanhã, ainda dentro da janela).
// ENSAIO POR PADRÃO: sem ?confirm=SEND nada é gravado nem enviado — a resposta lista quem receberia e com que valores.
// ?confirm=SEND (cron com CRON_SECRET, ou admin logado): reserva o carimbo ANTES do envio (23505 = outra corrida já
// reservou → pula), manda pelo Resend, marca 'sent' com o id do Resend; falhou o envio → apaga a reserva (a próxima corrida
// tenta de novo). Ledger de envio (email_send_log, prioridade 'revenue') e linha `campaign_run_v1` por corrida SEND.
// INTERRUPTOR: com MONTH2_ANNUAL_OFFER_LIVE = false o SEND é recusado (409 `offer_not_live`) antes de qualquer leitura;
// o ensaio continua disponível para o fundador ver a coorte antes de dizer "liga".
// NÃO ESTÁ NO vercel.json de propósito: o fundador liga depois (doc docs/ANUAL-NO-2o-MES-2026-10-08.md traz a linha).
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { readAll } from '@/lib/supabase/readAll'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { registrarCorrida, corridaAbortada } from '@/lib/lifecycle/campaignRun'
import { recordEmailSend, recordResendResponse } from '@/lib/email/quota'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isAdminEmail } from '@/app/api/admin/_shared/db'
import { ANNUAL_REFUND_DAYS } from '@/lib/checkoutPricing'
import { isDeliverableEmail } from '@/lib/billing/renewalFailedEmail'
import { MONTH2_ANNUAL_OFFER, month2ProfileBlocker } from '@/lib/billing/annualSwitch'
import { ANNUAL_SWITCH_PROFILE_COLUMNS, evaluateAnnualSwitch, eventIdFor, type AnnualSwitchProfile } from '@/lib/billing/annualSwitchCore'
import {
  MONTH2_ANNUAL_EMAIL_CAMPAIGN,
  MONTH2_ANNUAL_EMAIL_SENT_EVENT,
  MONTH2_ANNUAL_OFFER_STARTS_AT,
  MONTH2_ANNUAL_VERSION,
  month2AnnualOfferOpen,
  month2Money,
} from '@/lib/billing/month2AnnualOffer'
import {
  MONTH2_EMAIL_FROM,
  MONTH2_EMAIL_KIND,
  MONTH2_EMAIL_MAX_BATCH,
  MONTH2_EMAIL_REPLY_TO,
  MONTH2_EMAIL_TIMEOUT_MS,
  MONTH2_EMAIL_WINDOW_DAYS,
  month2EmailLanguage,
  month2EmailMessage,
} from '@/lib/billing/month2AnnualEmail'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 300

const ROUTE_PATH = '/api/cron/send-month2-annual-offer'
const DAY_MS = 86_400_000

function autorizadoPorCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

type Candidato = {
  userId: string
  subscriptionId: string
  email: string
  tier: string | null
  monthlyMinor: number
  annualMinor: number
  creditsPerMonth: number
  renewalPaidAt: string
  language: 'en' | 'pt' | 'es'
}

export async function GET(req: NextRequest) {
  try {
    return await corrida(req)
  } catch (e) {
    // Nada aqui pode virar 500 mudo para o cron da Vercel: o motivo volta no corpo (o log guarda o resto).
    console.error('[send-month2-annual-offer] corrida falhou:', e)
    return NextResponse.json({ error: 'run_failed', detail: (e instanceof Error ? e.message : String(e)).slice(0, 200) }, { status: 500 })
  }
}

async function corrida(req: NextRequest): Promise<NextResponse> {
  const readAt = Date.now()
  if (!autorizadoPorCron(req)) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const modo = confirm ? 'SENT' : 'DRY_RUN'
  if (confirm && !month2AnnualOfferOpen()) {
    return NextResponse.json({
      error: 'offer_not_live',
      mode: 'SEND_REFUSED',
      nothing_sent: true,
      hint: `Oferta fechada: MONTH2_ANNUAL_OFFER_LIVE false ou antes de ${MONTH2_ANNUAL_OFFER_STARTS_AT} (lib/billing/month2AnnualOffer.ts). O ensaio (sem confirm) mostra a coorte.`,
    }, { status: 409 })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
  const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: freshFetch } })
  const resendKey = process.env.RESEND_API_KEY ?? ''
  if (!process.env.STRIPE_SECRET_KEY || (confirm && !resendKey)) {
    if (confirm) await registrarCorrida(admin, corridaAbortada(MONTH2_ANNUAL_EMAIL_CAMPAIGN, 'SENT', 'env'))
    return NextResponse.json({ error: !process.env.STRIPE_SECRET_KEY ? 'stripe_not_configured' : 'RESEND_API_KEY missing' }, { status: 503 })
  }

  // ── 1. coorte bruta: renovações pagas na janela, uma por assinatura (a mais recente) ─────────────────────────────
  const desde = new Date(readAt - MONTH2_EMAIL_WINDOW_DAYS * DAY_MS).toISOString()
  // readAll LANÇA quando o banco falha (nunca devolve meia lista): a corrida para aqui, com a linha do motivo.
  let faturas: Array<{ user_id?: unknown; created_at?: unknown; metadata?: unknown }> = []
  try {
    faturas = (await readAll(() => admin
      .from('events').select('id, user_id, created_at, metadata').eq('name', 'subscription_invoice_paid')
      .gte('created_at', desde), { route: ROUTE_PATH, table: 'events' })).data ?? []
  } catch (e) {
    if (confirm) await registrarCorrida(admin, corridaAbortada(MONTH2_ANNUAL_EMAIL_CAMPAIGN, 'SENT', 'query'))
    return NextResponse.json({ error: 'read_failed', detail: (e instanceof Error ? e.message : String(e)).slice(0, 200), nothing_sent: true }, { status: 500 })
  }
  const porAssinatura = new Map<string, { userId: string; at: string }>()
  for (const r of faturas) {
    const md = (r.metadata ?? {}) as Record<string, unknown>
    const uid = typeof r.user_id === 'string' ? r.user_id : null
    const sid = typeof md.stripe_subscription_id === 'string' ? md.stripe_subscription_id : null
    if (!uid || !sid) continue
    if (md.billing_reason !== 'subscription_cycle' || md.trial_conversion === true) continue
    const at = String(r.created_at ?? '')
    const cur = porAssinatura.get(sid)
    if (!cur || at > cur.at) porAssinatura.set(sid, { userId: uid, at })
  }
  const coorteBruta = porAssinatura.size
  const excluidos: Record<string, number> = {
    ja_recebeu: 0, sem_perfil: 0, assinatura_trocada: 0, optout: 0, sem_email: 0, perfil_bloqueia: 0,
    ja_anual: 0, stripe_indisponivel: 0, nao_elegivel: 0, nao_e_a_1a_renovacao: 0, renovacao_fora_da_janela: 0,
  }
  const motivos: Record<string, number> = {}
  if (coorteBruta === 0) {
    if (confirm) await registrarCorrida(admin, corridaAbortada(MONTH2_ANNUAL_EMAIL_CAMPAIGN, 'SENT', 'coorte_vazia'))
    return NextResponse.json({ mode: modo, live: month2AnnualOfferOpen(), coorte_bruta: 0, note: `nenhuma renovação paga em ${MONTH2_EMAIL_WINDOW_DAYS} dias` })
  }

  // ── 2. já recebeu (carimbo de id fixo por assinatura) e 3. perfis ───────────────────────────────────────────────
  const subs = [...porAssinatura.keys()]
  const markerOf = (sid: string) => eventIdFor(`${MONTH2_ANNUAL_EMAIL_SENT_EVENT}:${sid}`)
  const userIds = [...new Set([...porAssinatura.values()].map((v) => v.userId))]
  let carimbos: Array<{ id?: unknown }> = []
  let perfis: unknown[] = []
  try {
    carimbos = (await readAll(() => admin
      .from('events').select('id').in('id', subs.map(markerOf)), { route: ROUTE_PATH, table: 'events' })).data ?? []
    perfis = (await readAll(() => admin
      .from('profiles').select(`${ANNUAL_SWITCH_PROFILE_COLUMNS}, email_opted_out, signup_country, last_country`)
      .in('id', userIds), { route: ROUTE_PATH, table: 'profiles' })).data ?? []
  } catch (e) {
    // Sem saber quem já recebeu, nada sai (1 e-mail por assinatura vale mais que "hoje").
    if (confirm) await registrarCorrida(admin, corridaAbortada(MONTH2_ANNUAL_EMAIL_CAMPAIGN, 'SENT', 'query', { coorte_bruta: coorteBruta }))
    return NextResponse.json({ error: 'read_failed', detail: (e instanceof Error ? e.message : String(e)).slice(0, 200), nothing_sent: true }, { status: 500 })
  }
  const jaRecebeu = new Set(carimbos.map((r) => String(r.id)))
  const perfilPorId = new Map(perfis.map((p) => [String((p as { id?: unknown }).id), p as unknown as AnnualSwitchProfile & { email_opted_out?: boolean | null; signup_country?: string | null; last_country?: string | null }]))

  // ── 4. a Stripe decide, pelo núcleo único (a mesma leitura da tela) ──────────────────────────────────────────────
  const candidatos: Candidato[] = []
  for (const [sid, v] of porAssinatura) {
    if (jaRecebeu.has(markerOf(sid))) { excluidos.ja_recebeu++; continue }
    const p = perfilPorId.get(v.userId)
    if (!p) { excluidos.sem_perfil++; continue }
    if (p.stripe_subscription_id !== sid) { excluidos.assinatura_trocada++; continue }
    if (p.email_opted_out === true) { excluidos.optout++; continue }
    const email = String(p.email ?? '').trim().toLowerCase()
    if (!isDeliverableEmail(email)) { excluidos.sem_email++; continue }
    const pre = month2ProfileBlocker(p)
    if (pre) { excluidos.perfil_bloqueia++; motivos[pre] = (motivos[pre] ?? 0) + 1; continue }
    const ev = await evaluateAnnualSwitch({ admin, profile: p, offer: MONTH2_ANNUAL_OFFER, requirePaidRenewal: true, nowMs: readAt })
    if (ev.state === 'already_switched') { excluidos.ja_anual++; continue }
    if (ev.state !== 'evaluated') { excluidos.stripe_indisponivel++; continue }
    if (!ev.eligible || ev.monthlyMinor === null || ev.annualMinor === null || !ev.credits) {
      excluidos.nao_elegivel++
      for (const b of ev.blockers) motivos[b.code] = (motivos[b.code] ?? 0) + 1
      continue
    }
    if (!ev.renewals || ev.renewals.count !== 1 || ev.renewals.firstPaidAtMs === null) { excluidos.nao_e_a_1a_renovacao++; continue }
    if (ev.renewals.firstPaidAtMs < readAt - MONTH2_EMAIL_WINDOW_DAYS * DAY_MS) { excluidos.renovacao_fora_da_janela++; continue }
    candidatos.push({
      userId: v.userId,
      subscriptionId: sid,
      email,
      tier: ev.tier,
      monthlyMinor: ev.monthlyMinor,
      annualMinor: ev.annualMinor,
      creditsPerMonth: ev.credits.perMonthAfter,
      renewalPaidAt: new Date(ev.renewals.firstPaidAtMs).toISOString(),
      language: month2EmailLanguage(p.last_country || p.signup_country),
    })
  }

  // ── 5. supressão de 24 h da casa + lote ──────────────────────────────────────────────────────────────────────────
  const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.userId))
  const alvos = candidatos.filter((c) => !sup.isSuppressed(c.userId))
  const limiteParam = Number(req.nextUrl.searchParams.get('limit'))
  const lote = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(Math.floor(limiteParam), MONTH2_EMAIL_MAX_BATCH) : MONTH2_EMAIL_MAX_BATCH
  const doLote = alvos.slice(0, lote)
  const mensagem = (c: Candidato) => month2EmailMessage({ language: c.language, tier: c.tier, monthlyMinor: c.monthlyMinor, annualMinor: c.annualMinor, creditsPerMonth: c.creditsPerMonth, refundDays: ANNUAL_REFUND_DAYS })

  if (!confirm) {
    return NextResponse.json({
      mode: 'DRY_RUN',
      live: month2AnnualOfferOpen(),
      coorte: `1ª renovação paga nos últimos ${MONTH2_EMAIL_WINDOW_DAYS} d · elegível à troca (núcleo) · sem este e-mail · opt-in · sem e-mail nosso em 24 h`,
      coorte_bruta: coorteBruta,
      candidatos_apos_filtros: candidatos.length,
      suprimidos_24h: sup.suppressedCount,
      supressao_degradada: sup.degraded,
      no_proximo_lote: doLote.length,
      excluidos,
      motivos_dos_bloqueios: motivos,
      lista: doLote.map((c) => `${c.email} · ${c.tier ?? '?'} · ${month2Money(c.monthlyMinor)}/mês → ${month2Money(c.annualMinor)}/ano · ${c.language} · renovou ${c.renewalPaidAt.slice(0, 10)}`),
      assunto_exemplo: doLote[0] ? mensagem(doLote[0]).subject : null,
      hint: month2AnnualOfferOpen() ? 'Acrescente ?confirm=SEND (e opcionalmente &limit=N) para enviar.' : `Oferta FECHADA: o SEND é recusado até ${MONTH2_ANNUAL_OFFER_STARTS_AT} (e com MONTH2_ANNUAL_OFFER_LIVE = true).`,
    })
  }

  // ── SEND: reserva → envio → marca (falhou o envio = a reserva some) ──────────────────────────────────────────────
  let enviados = 0
  let falhas = 0
  let pulados = 0
  const resultados: Array<{ subscription: string; outcome: string }> = []
  for (const c of doLote) {
    const markerId = markerOf(c.subscriptionId)
    const msg = mensagem(c)
    const base = {
      campaign: MONTH2_ANNUAL_EMAIL_CAMPAIGN,
      offer: MONTH2_ANNUAL_OFFER,
      version: MONTH2_ANNUAL_VERSION,
      stripe_subscription_id: c.subscriptionId,
      tier: c.tier,
      monthly_minor: c.monthlyMinor,
      annual_minor: c.annualMinor,
      renewal_paid_at: c.renewalPaidAt,
      language: msg.language,
    }
    const { error: claimErr } = await admin.from('events').insert({
      id: markerId,
      name: MONTH2_ANNUAL_EMAIL_SENT_EVENT,
      user_id: c.userId,
      path: ROUTE_PATH,
      session_id: null,
      metadata: { ...base, status: 'claimed' },
    })
    if (claimErr) {
      if (claimErr.code === '23505') { pulados++; resultados.push({ subscription: c.subscriptionId, outcome: 'already_claimed' }) }
      else { falhas++; resultados.push({ subscription: c.subscriptionId, outcome: `claim_failed:${claimErr.code ?? '?'}` }) }
      continue
    }
    let res: Response
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(MONTH2_EMAIL_TIMEOUT_MS),
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: MONTH2_EMAIL_FROM,
          to: [c.email],
          reply_to: MONTH2_EMAIL_REPLY_TO,
          subject: msg.subject,
          text: `${msg.text}\n${emailFooterText(c.userId)}`,
          html: `${msg.html}${emailFooterHtml(c.userId)}`,
          headers: unsubscribeHeaders(c.userId),
        }),
      })
    } catch (e) {
      const detail = (e instanceof Error ? e.message : String(e)).slice(0, 200)
      await recordEmailSend({ kind: MONTH2_EMAIL_KIND, priority: 'revenue', userId: c.userId, ok: false, detail, admin })
      await admin.from('events').delete().eq('id', markerId)
      falhas++
      resultados.push({ subscription: c.subscriptionId, outcome: `send_threw:${detail}` })
      continue
    }
    await recordResendResponse({ kind: MONTH2_EMAIL_KIND, priority: 'revenue', userId: c.userId, res, admin })
    if (!res.ok) {
      await admin.from('events').delete().eq('id', markerId)
      falhas++
      resultados.push({ subscription: c.subscriptionId, outcome: `resend_${res.status}` })
      continue
    }
    const receipt = (await res.json().catch(() => null)) as { id?: unknown } | null
    await admin.from('events').update({ metadata: { ...base, status: 'sent', resend_id: typeof receipt?.id === 'string' ? receipt.id : null, sent_at: new Date().toISOString() } }).eq('id', markerId)
    enviados++
    resultados.push({ subscription: c.subscriptionId, outcome: 'sent' })
  }
  await registrarCorrida(admin, {
    campanha: MONTH2_ANNUAL_EMAIL_CAMPAIGN,
    modo: 'SENT',
    coorte_bruta: coorteBruta,
    candidatos: candidatos.length,
    suprimidos_24h: sup.suppressedCount,
    supressao_degradada: sup.degraded,
    elegiveis: alvos.length,
    no_lote: doLote.length,
    enviados,
    falhas,
    pulados,
  })
  return NextResponse.json({ mode: 'SENT', enviados, falhas, pulados, restam_apos_lote: Math.max(0, alvos.length - doLote.length), excluidos, resultados })
}
