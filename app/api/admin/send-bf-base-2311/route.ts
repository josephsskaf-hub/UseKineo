// ═══ KINEO-BF-BASE-2311 — a carta da semana da Black Friday para a base (regra pura: lib/lifecycle/bfBase2311.ts) ═══════════════
//
// MODOS (GET, só sessão de admin; sem porta de cron, NÃO entra no vercel.json — o disparo é manual, pela CEO):
//   (sem confirm=SEND)                      → ENSAIO: não envia, não grava NADA. Devolve elegíveis, cada metade, quem ficou fora por
//                                             qual trava e 3 ids curtos (8 caracteres) por metade. ?arm=a|b|both só filtra a contagem.
//   ?confirm=SEND&limit=N&arm=a|b|both      → envia até N (obrigatório, teto 150). Selo bf_base_2311_sent ANTES de cada envio, com id
//                                             determinístico por conta (o 2º insert bate na chave primária = nunca duas vezes).
//                                             Para e devolve erro quando a cota diária de e-mail acaba. A metade A só sai com a Black
//                                             Friday aberta (bf2026Open); fora dela, arm=a responde 409 e arm=both manda só a B.
// DEDUPE: (1) supressão da casa de 168 h (FALHA FECHADA), mais o último e-mail aceito em email_send_log/trial_emails_log na régua pura;
//         (2) esta carta uma vez na vida (selo); (3) um endereço = uma carta.
// Leituras paginadas (readAll) e filtros por pessoa em fatias de 200 ids (a armadilha das 1.000 linhas do PostgREST).
import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { capForPriority, dailyCap, recordResendResponse } from '@/lib/email/quota'
import { bf2026Open } from '@/lib/billing/blackFriday2026'
import {
  BF_BASE_2311_CAMPAIGN, BF_BASE_2311_FROM, BF_BASE_2311_REPLY_TO, BF_BASE_2311_SENT, BF_BASE_2311_SUPPRESSION_HOURS,
  bfBaseArmPedido, bfBaseCarta, bfBaseClaimId, bfBaseMetade, bfBasePedido, bfBaseTrava, bfBaseTravaPerfil,
  type BfBaseArm, type BfBaseTrava,
} from '@/lib/lifecycle/bfBase2311'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@hotmail.com'])
const ROUTE = '/api/admin/send-bf-base-2311'
const CHUNK = 200
const SEND_BUDGET_MS = 240_000
const APP = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.usekineo.com').replace(/\/+$/, '')

type Alvo = { id: string; email: string; arm: BfBaseArm; title: unknown; topic: unknown; recencia: string }
const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex')
const ms = (raw: unknown) => { const t = Date.parse(String(raw ?? '')); return Number.isFinite(t) ? t : 0 }

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const pedido = bfBasePedido({ confirm: sp.get('confirm'), limit: sp.get('limit'), arm: sp.get('arm') })
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = (user?.email ?? '').trim().toLowerCase()
    if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if ('erro' in pedido) return NextResponse.json({ error: pedido.erro }, { status: pedido.status })
    const bfAberta = bf2026Open()
    if (pedido.modo === 'SEND' && pedido.arm === 'a' && !bfAberta) {
      return NextResponse.json({ error: 'A Black Friday não está aberta (bf2026Open = false): a metade A não sai. Nada foi enviado.' }, { status: 409 })
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !svc) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
    const agora = Date.now()
    const desde7d = new Date(agora - BF_BASE_2311_SUPPRESSION_HOURS * 3_600_000).toISOString()

    // ── 1. perfis (todos; paginado) e as travas de perfil ──────────────────────────────────────────────────────────────────
    const { data: perfis, error: perfisErr } = await readAll(() => admin
      .from('profiles')
      .select('id, email, has_paid, email_opted_out, signup_country, last_country, stripe_subscription_id, paypal_subscription_id, created_at')
      .order('created_at', { ascending: true }), { route: ROUTE, table: 'profiles' })
    if (perfisErr) return NextResponse.json({ error: 'profiles unavailable; no email sent' }, { status: 503 })
    const fora: Record<BfBaseTrava | 'email_repetido', number> = {
      sem_email: 0, casa: 0, pais_fora: 0, saiu: 0, pagou: 0, sem_filme: 0, ja_recebeu_esta: 0, email_7d: 0, email_repetido: 0,
    }
    type Vivo = { id: string; email: string; p: Record<string, unknown> }
    const vivos: Vivo[] = []
    const vistos = new Set<string>()
    for (const p of (perfis ?? []) as Array<Record<string, unknown>>) {
      const fatos = {
        email: p.email, signupCountry: p.signup_country, lastCountry: p.last_country, emailOptedOut: p.email_opted_out, hasPaid: p.has_paid,
        stripeSubscriptionId: p.stripe_subscription_id, paypalSubscriptionId: p.paypal_subscription_id,
      }
      const t = bfBaseTravaPerfil(fatos)
      if (t) { fora[t]++; continue }
      const email = String(p.email).trim().toLowerCase()
      if (vistos.has(email)) { fora.email_repetido++; continue }
      vistos.add(email)
      vivos.push({ id: String(p.id), email, p })
    }

    // ── 2. por fatia: filmes concluídos, pagamento, selo desta carta, último e-mail aceito em 7 dias ─────────────────────────
    const filmes = new Map<string, number>()
    const ultimoFilme = new Map<string, { title: unknown; topic: unknown; at: string }>()
    const pagou = new Set<string>(), recebeuEsta = new Set<string>()
    const ultimoEmail = new Map<string, number>()
    const bump = (uid: unknown, t: number) => { const k = String(uid); if (t > (ultimoEmail.get(k) ?? 0)) ultimoEmail.set(k, t) }
    for (let i = 0; i < vivos.length; i += CHUNK) {
      const ids = vivos.slice(i, i + CHUNK).map((v) => v.id)
      const [vids, marcas, ledger, trial] = await Promise.all([
        readAll(() => admin.from('videos').select('id, user_id, title, topic, created_at')
          .eq('status', 'completed').in('user_id', ids).order('created_at', { ascending: false }), { route: ROUTE, table: 'videos' }),
        readAll(() => admin.from('events').select('id, user_id, name').in('user_id', ids)
          .in('name', ['payment_success', BF_BASE_2311_SENT]).order('id', { ascending: true }), { route: ROUTE, table: 'events' }),
        readAll(() => admin.from('email_send_log').select('id, user_id, sent_at').in('user_id', ids).gte('sent_at', desde7d)
          .eq('ok', true).not('yielded', 'is', true).order('id', { ascending: true }), { route: ROUTE, table: 'email_send_log' }),
        readAll(() => admin.from('trial_emails_log').select('user_id, email_kind, sent_at').in('user_id', ids).gte('sent_at', desde7d)
          .order('user_id', { ascending: true }), { route: ROUTE, table: 'trial_emails_log', key: ['user_id', 'email_kind'] }),
      ])
      if (vids.error || marcas.error || ledger.error || trial.error) {
        return NextResponse.json({ error: 'read failed (videos/events/email_send_log/trial_emails_log); no email sent' }, { status: 503 })
      }
      for (const v of vids.data ?? []) {
        const uid = String(v.user_id)
        filmes.set(uid, (filmes.get(uid) ?? 0) + 1)
        if (!ultimoFilme.has(uid)) ultimoFilme.set(uid, { title: v.title, topic: v.topic, at: String(v.created_at ?? '') })
      }
      for (const e of marcas.data ?? []) {
        if (e.name === 'payment_success') pagou.add(String(e.user_id))
        else recebeuEsta.add(String(e.user_id))
      }
      for (const r of ledger.data ?? []) bump(r.user_id, ms(r.sent_at))
      for (const r of trial.data ?? []) bump(r.user_id, ms(r.sent_at))
    }

    const candidatos: Alvo[] = []
    for (const v of vivos) {
      const t = bfBaseTrava({
        email: v.p.email, signupCountry: v.p.signup_country, lastCountry: v.p.last_country, emailOptedOut: v.p.email_opted_out,
        hasPaid: v.p.has_paid, stripeSubscriptionId: v.p.stripe_subscription_id, paypalSubscriptionId: v.p.paypal_subscription_id,
        paymentEvent: pagou.has(v.id), films: filmes.get(v.id) ?? 0, alreadyGotThis: recebeuEsta.has(v.id),
        lastEmailMs: ultimoEmail.get(v.id) ?? null, nowMs: agora,
      })
      if (t) { fora[t]++; continue }
      const f = ultimoFilme.get(v.id)
      candidatos.push({ id: v.id, email: v.email, arm: bfBaseMetade(v.id), title: f?.title ?? null, topic: f?.topic ?? null, recencia: f?.at ?? '' })
    }

    // ── 3. supressão da casa de 168 h (todas as fontes, FALHA FECHADA): quem cair aqui conta em email_7d ──────────────────────
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id), BF_BASE_2311_SUPPRESSION_HOURS)
    const degradada = sup.degraded || sup.eventsDegraded === true
    const elegiveis: Alvo[] = []
    for (const c of candidatos) {
      if (sup.isSuppressed(c.id)) { fora.email_7d++; continue }
      elegiveis.push(c)
    }
    elegiveis.sort((a, b) => b.recencia.localeCompare(a.recencia)) // o filme mais recente primeiro
    const porMetade = { a: elegiveis.filter((e) => e.arm === 'a').length, b: elegiveis.filter((e) => e.arm === 'b').length }

    // Cota do dia (leitura pura). Campanha 'growth' cede a vaga em 60% do teto diário (lib/email/quota).
    const inicioDoDia = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()
    const cota = await admin.from('email_send_log').select('id', { count: 'exact', head: true }).eq('ok', true).gte('sent_at', inicioDoDia)
    const tetoGrowth = capForPriority('growth')
    const usadosHoje = cota.error || cota.count === null ? null : cota.count
    const vagas = usadosHoje === null ? 0 : Math.max(0, tetoGrowth - usadosHoje)

    // ── ENSAIO: devolve e sai. Nenhum insert, nenhum fetch ao Resend, nenhum registro de corrida. ─────────────────────────────
    if (pedido.modo === 'DRY_RUN') {
      const FOOT = { text: '[unsubscribe footer]', html: '<p>[unsubscribe footer]</p>' }
      return NextResponse.json({
        mode: 'DRY_RUN', campanha: BF_BASE_2311_CAMPAIGN, arm_pedido: pedido.arm, black_friday_aberta: bfAberta,
        coorte_bruta: (perfis ?? []).length, elegiveis: elegiveis.length, por_metade: porMetade,
        elegiveis_no_arm_pedido: elegiveis.filter((e) => bfBaseArmPedido(pedido.arm, e.arm)).length,
        fora, supressao_degradada: degradada,
        amostra: {
          a: elegiveis.filter((e) => e.arm === 'a').slice(0, 3).map((e) => e.id.slice(0, 8)),
          b: elegiveis.filter((e) => e.arm === 'b').slice(0, 3).map((e) => e.id.slice(0, 8)),
        },
        cartas: {
          a: bfBaseCarta({ arm: 'a', filmTitle: null, app: APP, footer: FOOT }),
          b: bfBaseCarta({ arm: 'b', filmTitle: null, app: APP, footer: FOOT }),
        },
        cota_do_dia: { teto: dailyCap(), usados_hoje: usadosHoje, teto_growth: tetoGrowth, vagas },
        from: BF_BASE_2311_FROM, reply_to: BF_BASE_2311_REPLY_TO,
      })
    }

    // ── 4. ENVIO ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (degradada || usadosHoje === null) {
      return NextResponse.json({ error: 'Suppression or quota unavailable; no email sent' }, { status: 503 })
    }
    if (vagas <= 0) {
      return NextResponse.json({ error: 'Cota diária de e-mail esgotada para campanha growth; nada foi enviado.', usados_hoje: usadosHoje, teto_growth: tetoGrowth }, { status: 429 })
    }
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })

    const pulouAFechada = !bfAberta && bfBaseArmPedido(pedido.arm, 'a') ? elegiveis.filter((e) => e.arm === 'a').length : 0
    const daChamada = elegiveis.filter((e) => bfBaseArmPedido(pedido.arm, e.arm) && (e.arm === 'b' || bfAberta))
    const daVez = daChamada.slice(0, Math.min(pedido.limit, vagas))
    const inicio = Date.now()
    let enviados = 0, falhas = 0, pulados = 0, cotaAcabou = daChamada.length > daVez.length && daVez.length < pedido.limit, semTempo = false
    const porArm = { a: 0, b: 0 }
    for (const a of daVez) {
      if (Date.now() - inicio > SEND_BUDGET_MS) { semTempo = true; break }
      // O selo ANTES do envio: id determinístico — se já existe, a conta já levou (ou está levando) esta carta.
      const selo = bfBaseClaimId(sha256Hex, a.id)
      const reserva = await admin.from('events').insert({ id: selo, user_id: a.id, name: BF_BASE_2311_SENT, path: ROUTE, metadata: { campaign: BF_BASE_2311_CAMPAIGN, arm: a.arm, ok: null } })
      if (reserva.error) { pulados++; continue }
      try {
        const m = bfBaseCarta({ arm: a.arm, filmTitle: a.title, filmTopic: a.topic, app: APP, footer: { text: emailFooterText(a.id), html: emailFooterHtml(a.id) } })
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: BF_BASE_2311_FROM, to: [a.email], reply_to: BF_BASE_2311_REPLY_TO, subject: m.subject, text: m.text, html: m.html, headers: unsubscribeHeaders(a.id), tags: [{ name: 'campaign', value: BF_BASE_2311_CAMPAIGN }, { name: 'arm', value: a.arm }] }),
        })
        await recordResendResponse({ kind: BF_BASE_2311_CAMPAIGN, priority: 'growth', userId: a.id, res, admin })
        const corpo = res.ok ? ((await res.json().catch(() => null)) as { id?: unknown } | null) : null
        const resendId = typeof corpo?.id === 'string' && corpo.id ? corpo.id : null
        await admin.from('events').update({ metadata: { campaign: BF_BASE_2311_CAMPAIGN, arm: a.arm, ok: res.ok, http_status: res.status, resend_id: resendId } }).eq('id', selo)
        if (res.status === 429) { falhas++; cotaAcabou = true; break }
        if (!res.ok) { falhas++; continue }
        enviados++
        porArm[a.arm]++
        await new Promise((r) => setTimeout(r, 600))
      } catch { falhas++ }
    }
    const corpo = {
      mode: 'SENT', arm_pedido: pedido.arm, enviados, por_metade: porArm, falhas, pulados,
      metade_a_fora_da_black_friday: pulouAFechada, restantes_no_arm: Math.max(0, daChamada.length - enviados - pulados),
      cortado_pela_cota: cotaAcabou, parou_pelo_tempo: semTempo,
    }
    if (cotaAcabou) return NextResponse.json({ ...corpo, error: 'Cota diária de e-mail acabou no meio do lote; o resto fica para amanhã.' }, { status: 429 })
    return NextResponse.json(corpo)
  } catch (e) {
    console.error('[send-bf-base-2311] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error; inspect events before retrying' }, { status: 500 })
  }
}
