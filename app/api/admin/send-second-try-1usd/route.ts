// ═══════════════════════════════════════════════════════════════════════════
// KINEO-SEGUNDA-TENTATIVA-1USD-2026-09-07 (va-r8) — A CARTA QUE A ROTAÇÃO #1
// CANCELOU, FEITA PARA A COORTE QUE EXISTE DE VERDADE
// ═══════════════════════════════════════════════════════════════════════════
//
// O CARDÁPIO PEDIA (V1): "carta para as 44 pessoas que abriram o checkout 2+
// vezes sem pagar; assunto com o TÍTULO do filme dela; abre com 'vi que você
// abriu o plano X duas vezes'".
//
// A ROTAÇÃO #1 MEDIU E RECUSOU, com razão, três coisas dessa V1:
//
//   1. "voltou 2+ vezes" contado por EVENTO dá 104 pessoas; por SESSÃO dá 9.
//      Um clique em comprar emite `checkout_cta_clicked` + `checkout_started` +
//      `checkout_attempted` com mediana de 0,86s entre eles. A frase "você
//      abriu duas vezes" seria FALSA para ~95 das 104.
//   2. 103 dessas 104 já receberam carta da casa (7,4 em média, uma recebeu
//      19), e 7 dos 9 últimos pagantes nunca tinham recebido carta nenhuma.
//   3. A pista irmã publicou hoje o `checkout_hot_nudge` (30 min depois do
//      clique), que cobre essa mesma gente melhor e mais quente.
//
// O QUE ESTA ROTA FAZ DIFERENTE, ponto a ponto:
//
//   · A PREMISSA É MEDIDA POR PESSOA, NUNCA AFIRMADA PARA A LISTA. O número de
//     visitas sai de `count(distinct session_id)` no banco, e a frase "on N
//     different visits" só existe no corpo quando N >= 2. Quem abriu uma vez
//     lê "opened the plans page" — verdade para todo mundo da lista.
//   · A COORTE NÃO É "quem clicou em comprar" (essa é do hot-nudge): é QUEM
//     ENTREGOU FILME E FICOU SEM CRÉDITO depois de bater no checkout. Medido
//     em 07/09: 129 não-pagantes com intenção de checkout na história, 86 com
//     pelo menos um filme completo, **68 desses com saldo zero**. É a única
//     coorte da casa que provou as duas coisas ao mesmo tempo — que o produto
//     entrega para ela, e que ela chegou a querer pagar.
//   · O QUE A CARTA TEM DE NOVO É UM FATO, NÃO UM PEDIDO. Até hoje 16:10 BRT a
//     porta mais barata da casa era o mês cheio. Desde hoje existe a entrada de
//     um dólar por 7 dias. Essa gente bateu num preço que MUDOU depois que ela
//     desistiu — é a primeira vez que a casa tem algo novo para dizer a ela.
//     Sem cupom, sem crédito de presente, sem desconto: só a porta que existe.
//
// ⚠️ O QUE EU MEDI E JOGUEI FORA DO CARDÁPIO: o assunto com o TÍTULO do filme.
// `videos.title` nesta casa é o PROMPT CRU truncado em 120 caracteres — a
// amostra da coorte traz frase cortada no meio ("Use the uploaded Spider-Man
// reference image as the **main character reference**. Keep the"), malaiala,
// tailandês, "Create the next episode in the same Short series about \"5
// shocking facts about Se um dia v" e, em uma linha, conteúdo adulto explícito.
// Assunto de e-mail com esse campo seria vergonha na caixa de entrada de 68
// pessoas. O que entra no assunto é a CONTAGEM de filmes — que é dela, é
// verdadeira e cabe.
//
// DINHEIRO NUNCA É DIGITADO: a taxa e a mensalidade saem de
// `lib/lifecycle/trialEntryFee.ts` (mesma fonte do cobrador), e o alcance dos
// créditos do trial sai de `trialReachClause` (que lê `creditCostFor`). Se o
// fundador mudar o preço, a carta muda sozinha.
//
// GUARD RAILS: só admin logado · DRY-RUN por padrão (?confirm=SEND envia) ·
// lote de até 30 por chamada (pacing 600ms) · 1× por pessoa PARA SEMPRE
// (carimbo `second_try_1usd_sent`, registrado em LIFECYCLE_EMAIL_EVENT_NAMES no
// mesmo commit) · supressão de 24h de toda a casa · descadastro no rodapé e nos
// headers · contatos proibidos fora por nome · e-mail interno fora.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { trialEntryFeeLabel, trialEntryFullPromise } from '@/lib/lifecycle/trialEntryFee'
import { trialReachClause } from '@/lib/lifecycle/trialReachLine'
import { CARD_TRIAL_DAYS, CARD_TRIAL_GRANT_CREDITS } from '@/lib/checkoutPricing'
import { PAID_PLANS } from '../_shared/mrr'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Mesma razão do send-winback-25: rota SÓ-GET no Next 14.2 nasce com
// revalidate=false e leria o banco como ele estava na primeira chamada.
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const STAMP = 'second_try_1usd_sent'
const CAMPAIGN = 'second_try_1usd'const APP = 'https://www.usekineo.com'
const MAX_BATCH = 30

/**
 * Os quatro contatos que a ordem do fundador mantém FORA de qualquer disparo
 * automático. Casamento por substring do e-mail em minúsculas — de propósito
 * mais largo que a igualdade: um mesmo humano com dois domínios continua fora.
 */
const CONTATOS_PROIBIDOS = ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']
function proibido(email: string): boolean {
  const e = email.toLowerCase()
  return CONTATOS_PROIBIDOS.some((c) => e.includes(c))
}

/**
 * Gatilho automático — MESMO contrato das outras campanhas de admin da casa
 * (`send-next-episode-wall`, `send-card-declined`, `send-checkout-hot-nudge`):
 * o Vercel manda `Authorization: Bearer ${CRON_SECRET}` nas rotas listadas no
 * `vercel.json`, então ninguém precisa conhecer o segredo para a carta sair.
 *
 * FAIL-CLOSED de propósito: env ausente → `false`. Uma rota que manda e-mail
 * para dezenas de pessoas nunca fica pública porque uma variável se perdeu.
 */
function autorizadoPorCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

/** Os três nomes de evento que significam "esta pessoa foi ao checkout". */
const CHECKOUT_INTENT = ['checkout_started', 'checkout_attempted', 'checkout_cta_clicked']

export interface SecondTryPerson {
  id: string
  email: string
  films: number
  visits: number
  lastCheckoutAt: string | null
}

/**
 * A idade da INTENÇÃO do lote, em dias, para o dry-run.
 *
 * Existe por causa de um erro medido: o primeiro lote de 30 cartas saiu para
 * uma coorte cuja intenção tinha mediana de 23,4 dias, e o dry-run que a
 * aprovou não dizia nada sobre idade. A casa só sabe de uma coisa que prevê
 * venda — recência — e era exatamente a coisa que a tela de aprovação não
 * mostrava.
 *
 * Função pura, sem I/O: o guardião a exercita com datas fixas.
 */
export function intentAgeReport(
  batch: Array<{ lastCheckoutAt: string | null }>,
  now: Date = new Date(),
): { median: number | null; within_48h: number; within_7d: number; older_than_30d: number; unknown: number } {
  const idades = batch
    .map((p) => p.lastCheckoutAt)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map((s) => (now.getTime() - new Date(s).getTime()) / 86_400_000)
    // Data ilegível não vira idade 0 — descartar é honesto, 0 seria uma
    // afirmação de que a intenção é de hoje (memória: sentinela lido como
    // valor real).
    .filter((d) => Number.isFinite(d))
    .sort((a, b) => a - b)

  const meio = idades.length === 0
    ? null
    : idades.length % 2 === 1
      ? idades[(idades.length - 1) / 2]
      : (idades[idades.length / 2 - 1] + idades[idades.length / 2]) / 2

  return {
    median: meio === null ? null : Math.round(meio * 10) / 10,
    within_48h: idades.filter((d) => d <= 2).length,
    within_7d: idades.filter((d) => d <= 7).length,
    older_than_30d: idades.filter((d) => d > 30).length,
    unknown: batch.length - idades.length,
  }
}

/**
 * A carta. Seis linhas, voz do fundador, uma pergunta de verdade no fim.
 *
 * `visits` só vira frase quando é >= 2 — é a correção literal do achado da
 * rotação #1. `films` idem para o plural.
 */
export function buildSecondTryEmail(p: SecondTryPerson): { subject: string; text: string; html: string } {
  const fee = trialEntryFeeLabel({ compact: true })
  const promise = trialEntryFullPromise(CARD_TRIAL_DAYS)
  // O alcance dos créditos do trial, lido da tabela do cobrador. `null` = o
  // saldo não cobre um render inteiro, e aí a carta sai sem conta nenhuma em
  // vez de prometer um número que o servidor recusa.
  const reach = trialReachClause(CARD_TRIAL_GRANT_CREDITS)
  const url = `${APP}/api/stripe/checkout?tier=basic&billing=monthly&trial=1`
    + `&intent_campaign=${CAMPAIGN}`
    + `&utm_source=email&utm_medium=lifecycle&utm_campaign=${CAMPAIGN}`

  const filmWord = p.films === 1 ? 'film' : 'films'
  const filmPhrase = p.films === 1 ? 'a film' : `${p.films} films`
  // A frase da segunda visita NÃO é afirmada para a lista: ela nasce do número
  // medido desta pessoa. Uma visita = a casa não diz nada sobre visitas.
  const visitClause = p.visits >= 2 ? ` — on ${p.visits} separate visits` : ''
  const reachSentence = reach
    ? `That comes with ${CARD_TRIAL_GRANT_CREDITS} credits: ${reach}.`
    : `That comes with ${CARD_TRIAL_GRANT_CREDITS} credits.`

  const subject = p.films === 1
    ? `Your Kineo film — and a ${fee} door that didn't exist last week`
    : `Your ${p.films} Kineo ${filmWord} — and a ${fee} door that didn't exist last week`

  const text = `Hey,

You made ${filmPhrase} with Kineo, ran out of credits, and went to look at the plans${visitClause}. You didn't buy. I never asked you why, and that's on me.

One thing changed today: the cheapest way in is no longer a full month. It's ${promise}. ${reachSentence} Cancel inside the ${CARD_TRIAL_DAYS} days and you paid ${fee}.

${url}

And if it wasn't the price — hit reply and tell me what actually stopped you. It comes to me, not a helpdesk.

Joseph
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>You made ${filmPhrase} with Kineo, ran out of credits, and went to look at the plans${visitClause}. You didn't buy. I never asked you why, and that's on me.</p>
  <p>One thing changed today: the cheapest way in is no longer a full month. It's <strong>${promise}</strong>. ${reachSentence} Cancel inside the ${CARD_TRIAL_DAYS} days and you paid ${fee}.</p>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Start the ${CARD_TRIAL_DAYS}-day Creator trial &rarr;</a></p>
  <p>And if it wasn't the price &mdash; hit reply and tell me what actually stopped you. It comes to me, not a helpdesk.</p>
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

    // 1) contas ZERADAS, nunca pagantes, opt-in, externas — lidas em páginas
    //    (regra anti-1000: o PostgREST trunca em 1000 SEM ERRO).
    const zeradas: Array<{ id: string; email: string }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, plan, has_paid, email_opted_out, video_credits')
        .eq('video_credits', 0)
        .order('created_at', { ascending: true })
        .range(from, from + 999)
      if (error) throw error
      for (const p of data ?? []) {
        const email = String(p.email ?? '').toLowerCase()
        if (!email || p.email_opted_out || p.has_paid || PAID_PLANS.has(String(p.plan ?? ''))) continue
        if (isInternalEmail(email) || proibido(email)) continue
        zeradas.push({ id: p.id as string, email })
      }
      if (!data || data.length < 1000) break
    }
    const ids = zeradas.map((z) => z.id)

    // 2) filmes entregues · intenção de checkout (com contagem de VISITAS) ·
    //    quem já recebeu esta carta.
    const filmes = new Map<string, number>()
    const visitas = new Map<string, Set<string>>()
    const ultimoCheckout = new Map<string, string>()
    const jaAvisado = new Set<string>()
    for (let i = 0; i < ids.length; i += 500) {
      const slice = ids.slice(i, i + 500)
      const [{ data: v }, { data: s }] = await Promise.all([
        admin.from('videos').select('user_id').eq('status', 'completed').in('user_id', slice).limit(20000),
        admin.from('events').select('user_id').eq('name', STAMP).in('user_id', slice).limit(5000),
      ])
      // Os eventos de checkout vêm PAGINADOS e não com `.limit()`: o PostgREST
      // trunca em 1000 SEM ERRO, e um truncamento aqui não erra para mais — ele
      // some com gente da coorte em silêncio (o achado #3 da auditoria de
      // 28/08, "truncamento sistêmico", em 40+ pontos).
      const c: Array<{ user_id: string | null; session_id: string | null; created_at: string | null }> = []
      for (let from = 0; ; from += 1000) {
        const { data: page, error: pageErr } = await admin
          .from('events')
          .select('user_id, session_id, created_at')
          .in('name', CHECKOUT_INTENT)
          .in('user_id', slice)
          .order('created_at', { ascending: true })
          .range(from, from + 999)
        if (pageErr) throw pageErr
        for (const r of page ?? []) c.push(r as { user_id: string | null; session_id: string | null; created_at: string | null })
        if (!page || page.length < 1000) break
      }
      for (const r of v ?? []) {
        const uid = r.user_id as string
        filmes.set(uid, (filmes.get(uid) ?? 0) + 1)
      }
      for (const r of c) {
        const uid = r.user_id as string
        if (!uid) continue
        const sid = typeof r.session_id === 'string' && r.session_id ? r.session_id : null
        // Sessão ausente NÃO vira visita — contar `null` como sessão é o erro
        // que transforma 9 pessoas em 104. Um evento sem sessão ainda prova
        // INTENÇÃO (entra na coorte), só não conta como visita distinta.
        if (!visitas.has(uid)) visitas.set(uid, new Set<string>())
        if (sid) visitas.get(uid)!.add(sid)
        const when = String(r.created_at ?? '')
        if (when && (ultimoCheckout.get(uid) ?? '') < when) ultimoCheckout.set(uid, when)
      }
      for (const r of s ?? []) jaAvisado.add(r.user_id as string)
    }

    const candidatos: SecondTryPerson[] = zeradas
      .filter((z) => (filmes.get(z.id) ?? 0) >= 1 && visitas.has(z.id) && !jaAvisado.has(z.id))
      .map((z) => ({
        id: z.id,
        email: z.email,
        films: filmes.get(z.id) ?? 0,
        visits: visitas.get(z.id)?.size ?? 0,
        lastCheckoutAt: ultimoCheckout.get(z.id) ?? null,
      }))

    // 3) supressão de 24h da casa inteira (5 fontes) — nunca dois e-mails
    //    nossos no mesmo dia para a mesma pessoa.
    const supressao = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const alvos = candidatos
      .filter((c) => !supressao.isSuppressed(c.id))
      // A ORDEM É A RECÊNCIA DA INTENÇÃO — corrigido na rotação #14 (07/09).
      //
      // Até aqui a fila era `b.films - a.films`: "quem mais entregou primeiro,
      // é quem mais tem a perder". Soa certo e está errado, e a casa já tinha
      // a prova no próprio banco. Em 90 dias, 12 pagantes: 10 pagaram em menos
      // de 48h do primeiro checkout e NENHUM pagante orgânico nasceu depois do
      // D2 (docs/queries/VENDA-ASSISTIDA-2026-09-07.sql, seção 1). Recência da
      // intenção é o único preditor que a casa já mediu; contagem de filmes
      // nunca previu uma venda.
      //
      // O preço de ordenar por filmes foi medido: as 30 primeiras cartas
      // saíram para uma coorte de intenção com MEDIANA de 23,4 dias — zero
      // dentro de 48h, zero dentro de 7 dias — enquanto 25 pessoas com
      // intenção mais nova que 7 dias (4 delas dentro de 48h) ficaram na fila
      // por terem feito MENOS filmes. Zero retornos.
      //
      // `lastCheckoutAt` null vai para o fim: sem carimbo de intenção não há
      // recência para afirmar. Filmes viram só o desempate.
      .sort((a, b) =>
        (b.lastCheckoutAt ?? '').localeCompare(a.lastCheckoutAt ?? '')
        || b.films - a.films
        || b.visits - a.visits,
      )

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: 'video_credits=0 · >=1 filme completo · >=1 evento de checkout · nunca pagou · opt-in · externo · fora dos proibidos · nao suprimido 24h · nunca recebeu esta carta',
        candidates: candidatos.length,
        suppressed_24h: supressao.suppressedCount,
        suppression_degraded: supressao.degraded,
        remaining_unemailed: alvos.length,
        next_batch_size: Math.min(batch, alvos.length),
        visits_2_or_more: alvos.filter((a) => a.visits >= 2).length,
        // A IDADE DA INTENÇÃO DO LOTE QUE VAI SAIR — sem isto o dry-run
        // aprovava 30 cartas para intenção de 23 dias sem dizer uma palavra
        // sobre idade, que é justamente o número que decide se a carta tem
        // chance. Medido sobre o LOTE (`slice(0, batch)`), não sobre a fila
        // inteira: é o lote que é enviado.
        intent_age_days: intentAgeReport(alvos.slice(0, batch)),
        sample: alvos.slice(0, 12).map((a) => ({ email: a.email, films: a.films, visits: a.visits, last_checkout: a.lastCheckoutAt })),
        subject_preview: alvos.length > 0 ? buildSecondTryEmail(alvos[0]).subject : null,
        hint: `Append &confirm=SEND (optionally &limit=N, max ${MAX_BATCH}) to send the next batch.`,
      })
    }

    let sent = 0
    const results: Array<{ email: string; outcome: string }> = []
    for (const a of alvos.slice(0, batch)) {
      const { subject, text, html } = buildSecondTryEmail(a)
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
            films: a.films,
            visits: a.visits,
            last_checkout_at: a.lastCheckoutAt,
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
