// ═══════════════════════════════════════════════════════════════════════════
// KINEO-AFILIADOS-ACORDAM-2026-09-07 (va-r11) — A CASA FALA COM OS 15 SÓCIOS
// QUE NUNCA TIVERAM MOTIVO PARA POSTAR
// ═══════════════════════════════════════════════════════════════════════════
//
// O CARDÁPIO PEDIA (V3): "carta para os 12 com o link deles, o trial de $1 como
// gancho, 3 vídeos da vitrine para postar e a comissão como está — MAS antes,
// confira que o link do afiliado ATRIBUI".
//
// O PORTÃO FOI CONFERIDO, E ELE ABRE. A auditoria de 28/08 dizia que o cookie
// `sf_aff` só era lido por rota chamada de dentro do (dashboard), e por isso
// "0 atribuições na história". Medido hoje, ponta a ponta:
//
//   · CLIQUE — sonda em produção com UA de navegador (07/09 01:19 UTC, código
//     do afiliado INTERNO para não distorcer parceiro): 307 + `sf_aff=<code>`
//     + `sf_aff_click=<uuid>` + `sf_aff_hint=1`, e a linha em `affiliate_clicks`
//     gravada. CONTROLE na mesma medição: código inexistente → 307 para a home
//     e NENHUM Set-Cookie. A perna do clique está viva.
//   · CADASTRO — `app/auth/callback/route.ts:171` chama de verdade
//     `finalizeAffiliateSignupAttribution` com os dois cookies, enquanto o OAuth
//     ainda os carrega (não é mais só o gatilho do dashboard).
//   · DINHEIRO — `app/api/stripe/webhook/route.ts:613` lança a linha em
//     `affiliate_commissions` e marca o referral como `paid`. A comissão que
//     esta carta cita é executável pelo produto sozinho; não é promessa de
//     "faço na mão depois" (a lição do Rick, 24/08).
//
// ENTÃO POR QUE 0 REFERRALS? NÃO É DEFEITO — É AUSÊNCIA DE TRÁFEGO. Medido:
// 15 sócios ativos, **25 cliques em 5 semanas**, concentrados em 5 códigos
// (10 deles num único dia, de 3 IPs — cara de auto-teste), vários com UA de
// robô. **10 dos 15 nunca tiveram um único clique na vida.** O evento
// `affiliate_signup_attribution_result` nunca existiu porque nenhum cadastro
// jamais chegou carregando o cookie: ninguém foi convidado a clicar.
// Contar "0 escritas" sem contar as oportunidades teria virado um conserto
// inventado (memória `zero-escritas-conte-as-oportunidades`).
//
// O QUE A CARTA TEM DE NOVO É UM FATO, NÃO UM PEDIDO: até hoje o sócio tinha de
// convencer alguém a assinar um mês inteiro. Desde esta tarde a porta mais
// barata da casa é a entrada de um dólar. O que ele pede ao público dele mudou
// de "compre um plano" para "gaste um dólar" — e isso mudou DEPOIS que ele
// parou de postar.
//
// ⚠️ O QUE EU MEDI E RECUSEI ESCREVER: "seu link teve N cliques". É verdade
// aritmética e mentira útil. Dos 25 cliques, os 10 do maior vieram de 3 IPs no
// mesmo dia e há UA de robô no meio; elogiar o sócio com um número inflado é
// exatamente o tipo de frase que a casa não pode sustentar quando ele responder
// perguntando quantos viraram conta. A carta não cita clique nenhum — nem para
// os 5 que têm, nem para os 10 que não têm. O que ela cita é o LINK dele, que é
// verdadeiro para os 15.
//
// DINHEIRO NUNCA É DIGITADO: a taxa de entrada e a mensalidade saem de
// `lib/lifecycle/trialEntryFee.ts` (mesma fonte do cobrador) e a comissão sai
// de `affiliates.commission_rate` LIDA POR PESSOA — nunca dos "40%" que eu vi
// na página. Se o fundador mudar qualquer um dos três, a carta muda sozinha.
//
// GUARD RAILS: só admin logado (ou cron por Bearer) · DRY-RUN por padrão
// (?confirm=SEND envia) · lote de até 30 (pacing 600ms) · 1× por pessoa PARA
// SEMPRE (carimbo `affiliate_wakeup_1usd_sent`) · supressão de 24h da casa
// inteira · descadastro no rodapé e nos headers · contatos proibidos fora ·
// e-mail interno fora · sócio inativo fora.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { trialEntryFeeLabel, trialEntryFullPromise } from '@/lib/lifecycle/trialEntryFee'
import { CARD_TRIAL_DAYS } from '@/lib/checkoutPricing'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Mesma razão do send-second-try-1usd: rota SÓ-GET no Next 14.2 nasce com
// revalidate=false e leria o banco como ele estava na primeira chamada.
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const STAMP = 'affiliate_wakeup_1usd_sent'
const CAMPAIGN = 'affiliate_wakeup_1usd'
const APP = 'https://www.usekineo.com'
const MAX_BATCH = 30

/**
 * Os quatro contatos que a ordem do fundador mantém FORA de qualquer disparo
 * automático. Casamento por substring do e-mail em minúsculas — de propósito
 * mais largo que a igualdade.
 */
const CONTATOS_PROIBIDOS = ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']
function proibido(email: string): boolean {
  const e = email.toLowerCase()
  return CONTATOS_PROIBIDOS.some((c) => e.includes(c))
}

/**
 * Gatilho automático — MESMO contrato das outras campanhas de admin da casa.
 * FAIL-CLOSED de propósito: env ausente → `false`.
 */
function autorizadoPorCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

/**
 * A comissão vem do banco, por sócio, e é formatada aqui. `0.4` → "40%".
 * Um sócio com taxa ausente ou não-positiva NÃO recebe carta (ver `alvos`):
 * é melhor não convidar do que convidar sem saber o que se está prometendo.
 */
export function formatCommissionRate(rate: number): string {
  const pct = rate * 100
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)}%`
}

export interface AffiliateWakeupPerson {
  id: string
  email: string
  code: string
  rate: number
}

/**
 * A carta. Voz do fundador, curta, uma pergunta de verdade no fim.
 *
 * NÃO cita cliques (ver o bloco do topo), NÃO cita conversões (são zero para
 * os 15) e NÃO promete calendário de pagamento — a casa nunca pagou uma
 * comissão porque nunca houve uma, e inventar um prazo aqui seria a promessa
 * sem executor que custou o e-mail "Feeling forgotten" em 22/08.
 */
export function buildAffiliateWakeupEmail(p: AffiliateWakeupPerson): { subject: string; text: string; html: string } {
  const fee = trialEntryFeeLabel({ compact: true })
  const promise = trialEntryFullPromise(CARD_TRIAL_DAYS)
  const link = `${APP}/a/${p.code.toUpperCase()}`
  const showcase = `${APP}/examples`
  const ratePct = formatCommissionRate(p.rate)

  const subject = `Your Kineo link — and the ${fee} door that opened today`

  const text = `Hey,

You took a Kineo partner link and I never gave you a reason to actually post it. That's on me.

Here's one. Until this afternoon, the cheapest way into Kineo was a full month. Now it's ${promise}. What you're asking your audience to do just went from "buy a plan" to "spend ${fee}" — and that changed after you stopped posting.

Your link: ${link}
Your terms, unchanged: ${ratePct} recurring on every subscription that comes through it.

Need something to post? ${showcase} has the house reel — pick any three films there. Every one of them was made by the product itself, from a line of text.

And if there's a reason you haven't posted it, hit reply and tell me what it is. It comes to me, not a helpdesk.

Joseph
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>You took a Kineo partner link and I never gave you a reason to actually post it. That's on me.</p>
  <p>Here's one. Until this afternoon, the cheapest way into Kineo was a full month. Now it's <strong>${promise}</strong>. What you're asking your audience to do just went from &ldquo;buy a plan&rdquo; to &ldquo;spend ${fee}&rdquo; &mdash; and that changed after you stopped posting.</p>
  <p style="margin:20px 0 6px">Your link:</p>
  <p style="margin:0 0 14px"><a href="${link}" style="color:#2997ff;font-weight:bold">${link}</a></p>
  <p style="margin:0 0 20px">Your terms, unchanged: <strong>${ratePct} recurring</strong> on every subscription that comes through it.</p>
  <p>Need something to post? <a href="${showcase}" style="color:#2997ff">${showcase}</a> has the house reel &mdash; pick any three films there. Every one of them was made by the product itself, from a line of text.</p>
  <p>And if there's a reason you haven't posted it, hit reply and tell me what it is. It comes to me, not a helpdesk.</p>
  <p style="margin:0 0 2px">Joseph</p>
  <p style="margin:0"><a href="${APP}" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(p.id)}`

  return { subject, text: `${text}${emailFooterText(p.id)}`, html }
}

export async function GET(req: NextRequest) {
  try {
    const porCron = autorizadoPorCron(req)
    if (!porCron) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmail = (user?.email ?? '').toLowerCase()
      if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const resendKey = process.env.RESEND_API_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!resendKey || !url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 500 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batch = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_BATCH) : MAX_BATCH

    // 1) sócios ATIVOS — lidos em páginas (regra anti-1000: o PostgREST trunca
    //    em 1000 SEM ERRO). Hoje são 15; a paginação é a apólice de amanhã.
    const socios: Array<{ id: string; email: string; code: string; rate: number }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from('affiliates')
        .select('user_id, email, code, status, commission_rate')
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .range(from, from + 999)
      if (error) throw error
      for (const a of data ?? []) {
        const email = String(a.email ?? '').toLowerCase()
        const uid = a.user_id as string | null
        const code = String(a.code ?? '').trim()
        const rate = Number(a.commission_rate ?? 0)
        // Sem dono, sem e-mail, sem link ou sem taxa conhecida a casa não tem o
        // que dizer: não dá para carimbar, entregar, linkar nem prometer.
        if (!uid || !email || !code) continue
        if (!Number.isFinite(rate) || rate <= 0) continue
        if (isInternalEmail(email) || proibido(email)) continue
        socios.push({ id: uid, email, code, rate })
      }
      if (!data || data.length < 1000) break
    }
    const ids = socios.map((s) => s.id)

    // 2) opt-out (a tabela de perfil é a dona da preferência) e quem já recebeu
    //    esta carta — o carimbo de 1× para sempre.
    const optOut = new Set<string>()
    const jaAvisado = new Set<string>()
    for (let i = 0; i < ids.length; i += 500) {
      const slice = ids.slice(i, i + 500)
      const [{ data: p, error: pe }, { data: s, error: se }] = await Promise.all([
        admin.from('profiles').select('id, email_opted_out').in('id', slice),
        admin.from('events').select('user_id').eq('name', STAMP).in('user_id', slice).limit(5000),
      ])
      if (pe) throw pe
      if (se) throw se
      for (const r of p ?? []) if (r.email_opted_out) optOut.add(r.id as string)
      for (const r of s ?? []) jaAvisado.add(r.user_id as string)
    }

    const candidatos: AffiliateWakeupPerson[] = socios.filter(
      (s) => !optOut.has(s.id) && !jaAvisado.has(s.id),
    )

    // 3) supressão de 24h da casa inteira — nunca dois e-mails nossos no mesmo
    //    dia para a mesma pessoa. Um sócio também é cliente: 6 dos 15 já
    //    receberam carta da casa nas últimas 24h (medido em 07/09), e é a
    //    supressão que os empurra para o lote seguinte em vez de dobrar a dose.
    const supressao = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const alvos = candidatos.filter((c) => !supressao.isSuppressed(c.id))

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: 'affiliates.status=active · com user_id, e-mail e código · commission_rate > 0 · opt-in · externo · fora dos proibidos · nao suprimido 24h · nunca recebeu esta carta',
        active_affiliates: socios.length,
        opted_out: optOut.size,
        already_sent: jaAvisado.size,
        candidates: candidatos.length,
        suppressed_24h: supressao.suppressedCount,
        suppression_degraded: supressao.degraded,
        remaining_unemailed: alvos.length,
        next_batch_size: Math.min(batch, alvos.length),
        sample: alvos.slice(0, 20).map((a) => ({ email: a.email, code: a.code, rate: formatCommissionRate(a.rate) })),
        subject_preview: alvos.length > 0 ? buildAffiliateWakeupEmail(alvos[0]).subject : null,
        hint: `Append &confirm=SEND (optionally &limit=N, max ${MAX_BATCH}) to send the next batch.`,
      })
    }

    let sent = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const a of alvos.slice(0, batch)) {
      const { subject, text, html } = buildAffiliateWakeupEmail(a)
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL, to: [a.email], reply_to: REPLY_TO,
            subject, text, html, headers: unsubscribeHeaders(a.id),
          }),
        })
        if (!res.ok) { results.push({ email: a.email, outcome: `resend ${res.status}` }); continue }
        await admin.from('events').insert({
          user_id: a.id,
          name: STAMP,
          metadata: {
            campaign: CAMPAIGN,
            // O código NÃO entra aqui: o carimbo é analítico e o código é o
            // ativo financeiro do sócio. A taxa entra porque é o que a carta
            // prometeu, e amanhã pode mudar.
            rate: formatCommissionRate(a.rate),
            // Carimbo do deploy: linha SEM `fee` é de antes desta carta e não
            // se mistura na medição.
            fee: trialEntryFeeLabel({ compact: true }),
          },
        })
        sent += 1
        results.push({ email: a.email, outcome: 'sent' })
        await new Promise((r) => setTimeout(r, 600))
      } catch (e) {
        results.push({ email: a.email, outcome: `error ${e instanceof Error ? e.message : String(e)}` })
      }
    }
    return NextResponse.json({ mode: 'SENT', sent, remaining_after: Math.max(0, alvos.length - batch), results })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
