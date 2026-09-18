// ═══ KINEO-RENOVACAO-RECUSADA-2026-09-18 — "sua renovação não passou; troque o cartão em 1 clique" ═══════════
//
// O NÚMERO (17/09, banco): dois dos nove assinantes ativos (valos87196 e akajitin) tiveram TRÊS recusas de renovação
// cada (`checkout_payment_failed` com is_renewal=true, insufficient_funds, cartão de débito), a cada ~7 dias, e nunca
// receberam uma linha nossa. A carta de 07/09 (send-card-declined) trata só de COMPRA INICIAL — por escolha, porque a
// Stripe "já tem régua de cobrança" para renovação. A régua da Stripe tenta de novo; ela não fala com a pessoa em
// nome do Joseph nem diz onde trocar o cartão. Recuperar 2 assinantes = +US$ 20 de MRR sem vender nada.
// Fundador (18/09): "Vai".
//
// O que a carta faz: diz que a renovação não passou (com o motivo do banco, traduzido), que o acesso continua por
// enquanto, e leva ao /account, onde o botão "Manage billing" abre o portal da Stripe para trocar o cartão (o portal é
// POST com sessão; por isso o link é a página, não o portal). Não oferece desconto, não muda plano, não promete nada.
//
// Régua herdada da casa: dry-run por padrão, envio só com &confirm=SEND (admin) ou cron autorizado; 1 carta por
// pessoa a cada 30 dias (carimbo renewal_declined_emailed_v1, na lista canônica); supressão de 24 h fail-closed;
// opt-out; bloqueados; teto de 30 por lote.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { PAID_PLANS } from '../_shared/mrr'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
export const SENT_EVENT = 'renewal_declined_emailed_v1'
export const CAMPAIGN = 'renewal_declined'
const SITE = 'https://www.usekineo.com'
const LOOKBACK_DAYS = 21
const RESEND_AFTER_DAYS = 30
const MAX_BATCH = 30
const BLOQUEADOS = ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']

function autorizadoPorCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export function motivoDaRenovacao(motivo: string | null | undefined): string {
  switch (motivo) {
    case 'insufficient_funds': return 'the card came back short at the moment of the charge'
    case 'expired_card': return 'the card on file has expired'
    case 'card_restricted': return 'your bank does not allow that card for recurring international charges'
    case 'authentication_required': return 'the extra verification step your bank asked for did not complete'
    case 'incorrect_card_details': return 'one of the card fields no longer matches'
    case 'fraud_or_risk': return 'your bank flagged the charge and stopped it'
    default: return 'your bank turned the charge down'
  }
}

const PLAN_NAME: Record<string, string> = { starter: 'Starter', basic: 'Creator', pro: 'Studio', autopilot: 'Autopilot', autopilot_lite: 'Autopilot Lite' }

function accountUrl(): string {
  return `${SITE}/account?utm_source=lifecycle&utm_medium=email&utm_campaign=${CAMPAIGN}`
}

export function assunto(plano: string): string {
  return `Your ${plano} renewal did not go through — 1 click to fix`
}

export function corpoTexto(plano: string, motivo: string, vezes: number, userId: string): string {
  return `Hey — Joseph here, founder of Kineo.

Your ${plano} renewal did not go through${vezes > 1 ? ` (${vezes} attempts)` : ''}. It was not you and it was not us: the charge reached your bank and ${motivo}.

Your access is still on for now. To keep it, update the card in one click:
${accountUrl()}
(Account → Manage billing → Update payment method.)

If you would rather pause, that is fine too — reply and I will sort it. Your videos stay in your library either way.

— Joseph, founder
Kineo · usekineo.com
${emailFooterText(userId)}`
}

export function corpoHtml(plano: string, motivo: string, vezes: number, userId: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>Hey &mdash; Joseph here, founder of <strong>Kineo</strong>.</p>
<p>Your <strong>${plano}</strong> renewal did not go through${vezes > 1 ? ` (${vezes} attempts)` : ''}. It was not you and it was not us: the charge reached your bank and ${motivo}.</p>
<p>Your access is still on for now. To keep it, update the card in one click:</p>
<p style="margin:18px 0 6px"><a href="${accountUrl()}" style="background:#2997ff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">Update payment method &rarr;</a></p>
<p style="margin:0 0 18px;color:#555;font-size:13px">Account &rarr; Manage billing &rarr; Update payment method.</p>
<p>If you would rather pause, that is fine too &mdash; reply and I will sort it. Your videos stay in your library either way.</p>
<p>&mdash; Joseph, founder<br>Kineo &middot; <a href="${SITE}" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`
}

type Candidato = { id: string; email: string; plano: string; motivoBruto: string | null; motivo: string; vezes: number; recusadoEm: string }

export async function GET(req: NextRequest) {
  try {
    if (!autorizadoPorCron(req)) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !ADMIN_EMAILS.has((user.email ?? '').toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

    const desde = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()
    const { data: recusas, error: recErr } = await admin
      .from('events').select('user_id, created_at, metadata').eq('name', 'checkout_payment_failed')
      .gte('created_at', desde).order('created_at', { ascending: false }).limit(2000)
    if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })

    // Última recusa de RENOVAÇÃO por pessoa, com a contagem de tentativas na janela.
    const porPessoa = new Map<string, { motivoBruto: string | null; vezes: number; recusadoEm: string; tier: string | null }>()
    for (const r of recusas ?? []) {
      const uid = r.user_id as string | null
      const md = (r.metadata ?? {}) as Record<string, unknown>
      if (!uid || md.is_renewal !== true) continue
      const cur = porPessoa.get(uid)
      if (cur) { cur.vezes += 1; continue }
      porPessoa.set(uid, {
        motivoBruto: typeof md.reason_category === 'string' ? md.reason_category : null,
        vezes: 1,
        recusadoEm: r.created_at as string,
        tier: typeof md.tier === 'string' ? md.tier : null,
      })
    }
    const ids = [...porPessoa.keys()]
    if (ids.length === 0) return NextResponse.json({ mode: 'DRY_RUN', elegiveis: 0, note: `nenhuma recusa de renovação com dono em ${LOOKBACK_DAYS} dias` })

    const { data: perfis, error: perfErr } = await admin
      .from('profiles').select('id, email, plan, has_paid, email_opted_out').in('id', ids.slice(0, 1000))
    if (perfErr) return NextResponse.json({ error: perfErr.message }, { status: 500 })

    // Quem já pagou uma fatura DEPOIS da recusa se recuperou sozinho; quem já recebeu esta carta em 30 dias espera.
    const [{ data: pagasRows }, { data: jaRows }] = await Promise.all([
      admin.from('events').select('user_id, created_at').eq('name', 'subscription_invoice_paid').gte('created_at', desde).in('user_id', ids),
      admin.from('events').select('user_id, created_at').eq('name', SENT_EVENT).gte('created_at', new Date(Date.now() - RESEND_AFTER_DAYS * 86_400_000).toISOString()).in('user_id', ids),
    ])
    const pagouDepois = new Map<string, string>()
    for (const r of pagasRows ?? []) { const u = r.user_id as string; const t = r.created_at as string; if (!pagouDepois.has(u) || t > (pagouDepois.get(u) ?? '')) pagouDepois.set(u, t) }
    const jaRecebeu = new Set((jaRows ?? []).map((r) => r.user_id as string))

    const excluidos = { nao_assinante: 0, optout: 0, interno_ou_bloqueado: 0, recuperado: 0, ja_recebeu_30d: 0 }
    const candidatos: Candidato[] = []
    for (const p of perfis ?? []) {
      const id = p.id as string
      const email = String(p.email ?? '').toLowerCase()
      const rec = porPessoa.get(id)
      if (!rec) continue
      if (p.has_paid !== true || !PAID_PLANS.has(String(p.plan ?? ''))) { excluidos.nao_assinante++; continue }
      if (p.email_opted_out === true) { excluidos.optout++; continue }
      if (!email || isInternalEmail(email) || BLOQUEADOS.some((b) => email.includes(b))) { excluidos.interno_ou_bloqueado++; continue }
      const pagaEm = pagouDepois.get(id)
      if (pagaEm && pagaEm > rec.recusadoEm) { excluidos.recuperado++; continue }
      if (jaRecebeu.has(id)) { excluidos.ja_recebeu_30d++; continue }
      const plano = PLAN_NAME[String(p.plan)] ?? PLAN_NAME[rec.tier ?? ''] ?? 'Kineo'
      candidatos.push({ id, email, plano, motivoBruto: rec.motivoBruto, motivo: motivoDaRenovacao(rec.motivoBruto), vezes: rec.vezes, recusadoEm: rec.recusadoEm })
    }

    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const alvos = candidatos.filter((c) => !sup.isSuppressed(c.id)).sort((a, b) => b.recusadoEm.localeCompare(a.recusadoEm))

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limiteParam = Number(req.nextUrl.searchParams.get('limit'))
    const lote = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, MAX_BATCH) : MAX_BATCH
    const doLote = alvos.slice(0, lote)

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        coorte: `assinante com renovação recusada em ${LOOKBACK_DAYS} d · sem fatura paga depois · sem esta carta em ${RESEND_AFTER_DAYS} d · opt-in`,
        candidatos_apos_filtros: alvos.length,
        no_proximo_lote: doLote.length,
        suprimidos_24h: sup.suppressedCount, supressao_degradada: sup.degraded,
        excluidos,
        lista: doLote.map((c) => `${c.email} · ${c.plano} · ${c.motivoBruto ?? '?'} · ${c.vezes}× · última ${c.recusadoEm.slice(0, 10)}`),
        assunto_exemplo: doLote[0] ? assunto(doLote[0].plano) : null,
        hint: 'Acrescente &confirm=SEND (e opcionalmente &limit=N) para enviar.',
      })
    }

    let enviados = 0, falhas = 0
    const resultados: Array<{ email: string; outcome: string }> = []
    for (const c of doLote) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL, to: c.email, reply_to: REPLY_TO,
            subject: assunto(c.plano),
            text: corpoTexto(c.plano, c.motivo, c.vezes, c.id),
            html: corpoHtml(c.plano, c.motivo, c.vezes, c.id),
            headers: unsubscribeHeaders(c.id),
          }),
        })
        if (!res.ok) throw new Error(`resend ${res.status}`)
        await admin.from('events').insert({ user_id: c.id, name: SENT_EVENT, metadata: { campaign: CAMPAIGN, plan: c.plano, reason_category: c.motivoBruto, attempts: c.vezes, declined_at: c.recusadoEm } })
        enviados++
        resultados.push({ email: c.email, outcome: 'sent' })
        await new Promise((r) => setTimeout(r, 600))
      } catch (e) {
        falhas++
        resultados.push({ email: c.email, outcome: `failed: ${e instanceof Error ? e.message : 'error'}` })
      }
    }
    return NextResponse.json({ mode: 'SENT', enviados, falhas, restam_apos_lote: Math.max(0, alvos.length - doLote.length), resultados })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
