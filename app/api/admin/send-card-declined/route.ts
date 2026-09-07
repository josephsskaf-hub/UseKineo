// ═══ KINEO-CARTA-DA-RECUSA-2026-09-07 — ciclo de pagamentos #2 ═════════════
//
// O NÚMERO QUE MANDOU ESCREVER ISTO (07/09, base inteira; o instrumento nasceu
// em 03/09): `checkout_payment_failed` tem 3 linhas na história.
//   · 2 são `stage: 'renewal'` — cliente que já paga, cartão vencendo. Essas
//     NÃO são desta carta: a Stripe já tem régua de cobrança para elas, e uma
//     carta nossa por cima é ruído.
//   · 1 é `stage: 'initial'` — 07/09 05:35 UTC, Visa PRÉ-PAGO dos EUA,
//     `card_restricted`, `declined_by_network`, risco normal, US$ 23,20.
//     Conta criada 05:32:09; checkout DOIS SEGUNDOS depois; recusa às 05:35;
//     zero filmes, 25 créditos intactos, nenhum evento desde então.
//     Ela não veio experimentar — veio COMPRAR, e o banco dela disse não.
//
// POR QUE ESTA ROTA EXISTE EM VEZ DE REUSAR `send-checkout-recovery`, e é a
// regra central do arquivo: aquela carta depende de
// `after_expiration.recovery.url`, que a Stripe só cria quando a sessão
// **EXPIRA**. Cartão recusado NÃO expira — a sessão morre com a recusa e não
// há porta de volta nenhuma para buscar. Mandar a coorte da recusa pela rota
// da expiração faria todo mundo cair no filtro "sem porta de volta" e
// **ninguém receberia nada**, silenciosamente. São duas mortes diferentes com
// dois remédios diferentes.
//
// ⛔ O QUE ESTA CARTA NÃO FAZ, e é deliberado: não oferece desconto, não cria
// preço, não promete crédito. A conclusão do fundador de 19/08 (o vazamento do
// checkout é PREÇO) segue fechada e não é reaberta por 3 linhas. Esta carta
// trata de uma coisa diferente e provada caso a caso: **o banco recusou**.
//
// A SEGUNDA PORTA QUE ELA OFERECE JÁ EXISTE E É HONESTA: o First Pack de
// US$ 4,90 (`?pack=starter`, 30 créditos, `PACK_CREDITS.starter`) é
// `mode: 'payment'` — COBRANÇA ÚNICA, não mandato recorrente. Conferido no
// código em 07/09 (`buildPackAndRedirect`, `mode: 'payment'`, linha 2365 de
// app/api/stripe/checkout/route.ts) e na margem (+36,3% a $4,90/30cr,
// documentada em lib/checkoutPricing.ts). Isso importa porque as duas coisas
// que o cartão da pessoa recusou — assinatura internacional e mandato — são
// exatamente o que a compra única NÃO pede. Não é consolo: é a única coisa
// diferente que a casa sabe fazer hoje.
//
// ⚠️ O LINK FOI SONDADO ANTES (07/09, UA de navegador):
// `GET /api/stripe/checkout?pack=starter` anônimo devolve **307 → /login** com
// o destino preservado em `redirect=`. Ou seja: um scanner corporativo (Outlook
// Safe Links) que abrir o link NÃO cunha sessão na Stripe — a armadilha que
// KINEO-RECOVERY-NO-MINT-LINK-2026-08-11 documentou está fechada por
// construção neste caminho.
//
// Herdado sem inventar régua nova: carimbo vitalício de 1 carta por pessoa
// (`card_declined_emailed_v1`, registrado em lib/lifecycle/emailEvents.ts no
// MESMO commit), exclusão de quem entrou em qualquer outra campanha, supressão
// de 24h fail-closed, bloqueados do ciclo, opt-out, cabeçalho de descadastro,
// teto de 30 por lote e pacing de 600ms.
//
// MODOS (GET):
//   (sem params)           → DRY RUN: quem receberia, e quem caiu fora e por quê.
//   ?confirm=SEND&limit=N  → envia para os próximos N (default 30, teto 30).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { dedupeTripwire } from '@/lib/truncationTripwire'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { PACK_CREDITS, packPriceLabel } from '@/lib/checkoutPricing'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Ver KINEO-DATA-CACHE-2026-09-02: rota só-GET no Next 14.2 nasce com
// revalidate=false e leria o banco congelado para sempre.
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const SENT_EVENT = 'card_declined_emailed_v1'
const SITE = 'https://www.usekineo.com'

/** Gatilho automático, mesmo contrato dos crons da casa. FAIL-CLOSED: sem a
 *  env, ninguém entra. */
function autorizadoPorCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

/** Ninguém entra em duas campanhas. `checkout_recovery_emailed_v1` está aqui
 *  porque as duas cartas falam do mesmo momento (a página de pagamento) e a
 *  pessoa não pode levar as duas. */
const OUTRAS_CAMPANHAS = [
  'checkout_recovery_emailed_v1',
  'checkout_rescue_emailed_v1',
  'made_video_today_emailed_v1',
  'india_price_emailed_v1',
  'comeback50_emailed_v1',
  'hot_upsell_sent',
  'next_episode_wall_emailed_v1',
  'season_letter_emailed_v1',
]

/** ⛔ NUNCA escrever para estes (limite explícito do ciclo). */
const BLOQUEADOS = ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']

const DISPOSABLE = ['mailinator', 'yopmail', 'tempmail', 'hutdot.com', 'beiwoh.com', 'playboot.com', 'skyprofy.com', 'gouziben.com', 'joystill.com', 'lanvos.com', 'minitts.net', 'dysonc.com', 'guerrillamail', 'sharklasers', 'getnada', 'maildrop', 'trashmail', '10minutemail', 'dispostable', 'fakeinbox', 'temp-mail']
function isJunk(email: string): boolean {
  const e = email.toLowerCase()
  if (!e.includes('@') || e.endsWith('@')) return true
  if (e.startsWith('josephsskaf') || e.startsWith('josephskaf') || e.endsWith('@shortsforgeai.com')) return true
  return DISPOSABLE.some((d) => e.includes(d))
}
function isBloqueado(email: string): boolean {
  const e = email.toLowerCase()
  return BLOQUEADOS.some((b) => e.includes(b))
}

/**
 * A DECISÃO, isolada da rede de propósito, pura e exportada para que o guardião
 * exercite a CONDIÇÃO em vez de contar texto.
 *
 * Só recusa de COMPRA INICIAL entra. Renovação é outra coisa: o cliente já
 * paga, a Stripe já tem régua de cobrança (dunning) e a carta certa para ele é
 * "atualize o cartão", não "tente outro jeito de comprar".
 *
 * `unknown` também fica de fora, e isso é falha FECHADA de propósito: o estágio
 * só é `unknown` quando a leitura da fatura falhou, e nesse caso a casa não
 * sabe se está escrevendo para um cliente que já paga.
 */
export function recusaMereceCarta(stage: string | null | undefined): boolean {
  return stage === 'initial'
}

/**
 * A identidade é confiável o bastante para escrever para esta pessoa?
 *
 * `customer_email` é INFERÊNCIA — casamento entre o e-mail do customer na
 * Stripe e o de um perfil. Ele é o único degrau que alcança quem nunca pagou,
 * e é também o único que pode casar a pessoa errada. Escrever "seu banco
 * recusou seu cartão" para quem não tentou comprar nada é pior do que não
 * escrever, então ele NÃO envia sozinho: aparece no dry-run marcado, e o
 * fundador decide.
 *
 * `backfill_correlation` é o reparo manual de 07/09 (a recusa anônima achada
 * por correlação, com UM único checkout na janela) — é fato conferido à mão e
 * entra.
 */
export function identidadeConfiavel(fonte: string | null | undefined): boolean {
  return (
    fonte === 'intent_metadata' ||
    fonte === 'invoice_subscription' ||
    fonte === 'checkout_session' ||
    fonte === 'customer_id' ||
    fonte === 'backfill_correlation'
  )
}

/** Motivo da recusa em uma frase que o cliente entende, sem jargão de Stripe e
 *  sem acusar a pessoa. As três primeiras são culpa do EMISSOR e a carta diz
 *  isso, porque é verdade e porque muda o que a pessoa faz em seguida. */
export function fraseDoMotivo(motivo: string | null | undefined): string {
  switch (motivo) {
    case 'card_restricted':
      return 'your bank does not allow that card for international recurring charges'
    case 'insufficient_funds':
      return 'the card came back short at the moment of the charge'
    case 'fraud_or_risk':
      return 'your bank flagged an unfamiliar merchant and stopped it'
    case 'authentication_required':
      return 'the extra verification step your bank asked for did not complete'
    case 'expired_card':
      return 'the card had expired'
    case 'incorrect_card_details':
      return 'one of the card fields did not match'
    default:
      return 'your bank turned it down'
  }
}

function checkoutUrl(caminho: string, campanha: string): string {
  const sep = caminho.includes('?') ? '&' : '?'
  return `${SITE}${caminho}${sep}utm_source=lifecycle&utm_medium=email&utm_campaign=${campanha}`
}
/** A compra única — o que o cartão recusado NÃO precisa de mandato para pagar. */
function packUrl(): string {
  return checkoutUrl('/api/stripe/checkout?pack=starter', 'card_declined_pack')
}
/** Tentar de novo, mesmo plano e mesmo preço: nada é reescolhido. */
function tentarDeNovoUrl(tier: string | null): string {
  return checkoutUrl(`/api/stripe/checkout?tier=${tier ?? 'starter'}`, 'card_declined_retry')
}
function planosUrl(): string {
  return checkoutUrl('/pricing', 'card_declined')
}

function assunto(): string {
  // Sem urgência falsa, sem promoção, e sem culpar a pessoa: é literalmente o
  // que o webhook da Stripe informou.
  return 'Your bank blocked the payment — here are two ways around it'
}

/** ⚠️ Cada frase tem de ser verdadeira NO INSTANTE DO ENVIO:
 *   · "your bank" — o evento traz `declined_by_network`, ou seja, quem disse
 *     não foi o emissor, não nós e não a Stripe;
 *   · "one-time charge, not a subscription" — `?pack=starter` é
 *     `mode: 'payment'`, conferido no código;
 *   · o número de créditos vem de PACK_CREDITS, nunca cravado na copy. */
function corpoTexto(motivo: string, tier: string | null, userId: string): string {
  return `Hey — Joseph here, founder of Kineo.

You tried to pay for Kineo and it did not go through. I want to be clear about whose fault that was: it was not yours, and it was not a problem on our side. The charge reached your bank and ${motivo}.

Two things actually work when that happens.

1) Try again with a different card. Same plan, same price, nothing to pick again:
${tentarDeNovoUrl(tier)}

2) Skip the subscription entirely. ${PACK_CREDITS.starter} credits for ${packPriceLabel()}, paid once:
${packUrl()}

Option 2 is worth a look even if option 1 sounds easier. It is a single charge, not a recurring one — and a card that refuses to sign up for a monthly international charge will often accept a one-off without blinking. No plan, no renewal, and the credits do not expire.

If neither works, hit reply and tell me which country you are in. I am adding local payment methods right now, and knowing where the wall is decides which one I finish first.

Plans, if you want to look again:
${planosUrl()}

— Joseph, founder
Kineo · usekineo.com
${emailFooterText(userId)}`
}

function corpoHtml(motivo: string, tier: string | null, userId: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>Hey &mdash; Joseph here, founder of <strong>Kineo</strong> 🎬</p>
<p>You tried to pay for Kineo and it did not go through. I want to be clear about whose fault that was: <strong>it was not yours</strong>, and it was not a problem on our side. The charge reached your bank and ${motivo}.</p>
<p>Two things actually work when that happens.</p>
<p style="margin:22px 0 10px"><strong>1) Try again with a different card.</strong> Same plan, same price, nothing to pick again.</p>
<p style="margin:0 0 22px">
  <a href="${tentarDeNovoUrl(tier)}" style="background:#2997ff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">Try a different card &rarr;</a>
</p>
<p style="margin:22px 0 10px"><strong>2) Skip the subscription entirely.</strong> ${PACK_CREDITS.starter} credits for ${packPriceLabel()}, paid once.</p>
<p style="margin:0 0 22px">
  <a href="${packUrl()}" style="background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">Get ${PACK_CREDITS.starter} credits for ${packPriceLabel()} &rarr;</a>
</p>
<p>Option 2 is worth a look even if option 1 sounds easier. It is a <strong>single charge, not a recurring one</strong> &mdash; and a card that refuses to sign up for a monthly international charge will often accept a one-off without blinking. No plan, no renewal, and the credits do not expire.</p>
<p>If neither works, <strong>hit reply and tell me which country you are in</strong>. I am adding local payment methods right now, and knowing where the wall is decides which one I finish first.</p>
<p style="font-size:14px;color:#555">Or look at <a href="${planosUrl()}" style="color:#2997ff">the plans</a> again first.</p>
<p>&mdash; Joseph, founder<br/>Kineo &middot; <a href="https://usekineo.com" style="color:#2997ff">usekineo.com</a></p>
${emailFooterHtml(userId)}</div>`
}

type Candidato = {
  id: string
  email: string
  motivo: string
  motivoBruto: string | null
  tier: string | null
  pais: string
  fonteDoNome: string | null
  valor: number | null
  recusadoEm: string
}

export async function GET(req: NextRequest) {
  try {
    const porCron = autorizadoPorCron(req)
    if (!porCron) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !ADMIN_EMAILS.has((user.email ?? '').toLowerCase())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

    // ── 1. a recusa MAIS RECENTE de cada pessoa, 14 dias ────────────────────
    const desde = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recusas, error: recErr } = await admin
      .from('events')
      .select('user_id, created_at, metadata')
      .eq('name', 'checkout_payment_failed')
      .gte('created_at', desde)
      .order('created_at', { ascending: false })
      .limit(5000)
    if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })

    const fora = { renovacao_ou_desconhecido: 0, sem_dono: 0, identidade_inferida: 0 }
    const ultima = new Map<string, Omit<Candidato, 'email'>>()
    for (const r of recusas ?? []) {
      const uid = r.user_id as string | null
      const md = (r.metadata ?? {}) as Record<string, unknown>
      if (!uid) { fora.sem_dono++; continue }
      if (ultima.has(uid)) continue // a lista vem do mais novo para o mais velho
      const stage = typeof md.stage === 'string' ? md.stage : null
      if (!recusaMereceCarta(stage)) { fora.renovacao_ou_desconhecido++; continue }
      const fonte = typeof md.identity_source === 'string' ? md.identity_source : null
      if (!identidadeConfiavel(fonte)) { fora.identidade_inferida++; continue }
      const motivoBruto = typeof md.reason_category === 'string' ? md.reason_category : null
      const valorMinor = Number(md.amount_minor)
      ultima.set(uid, {
        id: uid,
        motivo: fraseDoMotivo(motivoBruto),
        motivoBruto,
        tier: typeof md.tier === 'string' ? md.tier : null,
        pais: typeof md.ip_country === 'string' ? md.ip_country : (typeof md.card_country === 'string' ? md.card_country : ''),
        fonteDoNome: fonte,
        valor: Number.isFinite(valorMinor) ? valorMinor / 100 : null,
        recusadoEm: r.created_at as string,
      })
    }
    const ids = [...ultima.keys()]
    if (ids.length === 0) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        elegiveis: 0,
        fora,
        note: 'nenhuma recusa de COMPRA INICIAL com dono confiável em 14 dias',
      })
    }

    // ── 2. quem sai da lista, e por quê ─────────────────────────────────────
    const { data: perfis, error: perfErr } = await admin
      .from('profiles')
      .select('id, email, email_opted_out, has_paid')
      .in('id', ids.slice(0, 1000))
    if (perfErr) return NextResponse.json({ error: perfErr.message }, { status: 500 })

    const excluidos = { pagante: 0, optout: 0, junk: 0, bloqueado: 0, outra_campanha: 0, ja_recebeu: 0 }
    const base = (perfis ?? []).filter((p) => {
      const e = (p.email as string | null) ?? ''
      if (p.has_paid === true) { excluidos.pagante++; return false }
      if (p.email_opted_out === true) { excluidos.optout++; return false }
      if (!e || isJunk(e)) { excluidos.junk++; return false }
      if (isBloqueado(e)) { excluidos.bloqueado++; return false }
      return true
    })
    const baseIds = base.map((p) => p.id as string)

    // Os três dedupes com tripwire: truncar em 1000 aqui é reenviar campanha
    // (KINEO-TRIPWIRE-1000-2026-08-28).
    const { data: pagouRows } = await admin
      .from('events').select('user_id').eq('name', 'payment_success').in('user_id', baseIds)
    const pagou = new Set(dedupeTripwire(pagouRows, 'card-declined payment_success').map((r) => r.user_id as string))
    const { data: outrasRows } = await admin
      .from('events').select('user_id').in('name', OUTRAS_CAMPANHAS).in('user_id', baseIds)
    const outras = new Set(dedupeTripwire(outrasRows, 'card-declined OUTRAS_CAMPANHAS').map((r) => r.user_id as string))
    const { data: jaRows } = await admin
      .from('events').select('user_id').eq('name', SENT_EVENT).in('user_id', baseIds)
    const ja = new Set(dedupeTripwire(jaRows, 'card-declined SENT_EVENT').map((r) => r.user_id as string))

    const candidatos: Candidato[] = []
    for (const p of base) {
      const id = p.id as string
      if (pagou.has(id)) { excluidos.pagante++; continue }
      if (outras.has(id)) { excluidos.outra_campanha++; continue }
      if (ja.has(id)) { excluidos.ja_recebeu++; continue }
      const rec = ultima.get(id)
      if (!rec) continue
      candidatos.push({ ...rec, email: p.email as string })
    }

    // ── 3. supressão de 24h (falha FECHADA) ─────────────────────────────────
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const alvos = candidatos
      .filter((c) => !sup.isSuppressed(c.id))
      .sort((a, b) => b.recusadoEm.localeCompare(a.recusadoEm))

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limiteParam = Number(req.nextUrl.searchParams.get('limit'))
    const lote = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, 30) : 30
    const doLote = alvos.slice(0, lote)

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        coorte: 'recusa de COMPRA INICIAL em 14d · dono confiável · nunca pagou · nenhuma outra campanha · opt-in',
        candidatos_apos_filtros: alvos.length,
        no_proximo_lote: doLote.length,
        suprimidos_24h: sup.suppressedCount,
        supressao_degradada: sup.degraded,
        recusas_fora_da_coorte: fora,
        excluidos,
        assunto: assunto(),
        lista: doLote.map((c) => `${c.email} · ${c.pais || '??'} · ${c.motivoBruto ?? '?'} · ${c.tier ?? '?'} · $${c.valor ?? '?'} · nome via ${c.fonteDoNome ?? '?'} · recusado ${c.recusadoEm}`),
        from: FROM_EMAIL,
        hint: 'Acrescente &confirm=SEND (e opcionalmente &limit=N) para enviar.',
      })
    }

    let enviados = 0
    let falhas = 0
    const resultados: Array<{ email: string; outcome: string }> = []
    for (const c of doLote) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: c.email,
            reply_to: REPLY_TO,
            subject: assunto(),
            text: corpoTexto(c.motivo, c.tier, c.id),
            html: corpoHtml(c.motivo, c.tier, c.id),
            headers: unsubscribeHeaders(c.id),
          }),
        })
        if (!res.ok) throw new Error(`resend ${res.status}`)
        await admin.from('events').insert({
          user_id: c.id,
          name: SENT_EVENT,
          metadata: {
            reason_category: c.motivoBruto,
            tier: c.tier,
            country: c.pais,
            amount: c.valor,
            identity_source: c.fonteDoNome,
            declined_at: c.recusadoEm,
            offered_pack: true,
          },
        })
        enviados++
        resultados.push({ email: c.email, outcome: 'sent' })
        await new Promise((r) => setTimeout(r, 600))
      } catch (e) {
        falhas++
        resultados.push({ email: c.email, outcome: `failed: ${e instanceof Error ? e.message : 'error'}` })
      }
    }

    return NextResponse.json({
      mode: 'SENT',
      enviados,
      falhas,
      restam_apos_lote: Math.max(0, alvos.length - doLote.length),
      resultados,
    })
  } catch (e) {
    console.error('[send-card-declined] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
