// ═══ KINEO-SILENCIO-QUENTE-2026-09-07 — rotina FECHAR A VENDA, rotação #4 ═══
//
// O NÚMERO QUE MANDOU ESCREVER ISTO (medido 07/09 ~17:35 BRT, contas externas,
// 30 dias, contando PESSOAS):
//
//   · `checkout_started` .................................... 107 pessoas
//   · dessas, `payment_success` ............................. 6
//   · não pagaram ........................................... 101
//   · **horas até a casa dizer QUALQUER COISA a essas 101: 27** (média)
//   · e 19 delas nunca receberam carta nenhuma.
//
// Vinte e sete horas. A pessoa aperta "comprar", chega na página de pagamento
// da Stripe, não conclui — e a casa, que sabe disso no mesmo segundo, leva
// mais de um dia para abrir a boca. Não por descuido: por ARQUITETURA. A única
// carta desta coorte (`send-checkout-recovery`, #13 de 06/09) espera o evento
// `checkout.session.expired`, e a sessão da casa vive **24 horas**
// (KINEO-CHECKOUT-24H-2026-08-30). Some-se o cron dela, que roda duas vezes ao
// dia, e o piso é ~24h+ antes de qualquer palavra. Medido em regime: das 3
// sessões que expiraram DEPOIS daquela rota nascer, **0 receberam carta** — ela
// drenou o passivo de 18 dias em 06/09 e ainda não pegou um caso novo.
//
// ESTA ROTA NÃO ESPERA A SESSÃO MORRER. Ela fala com a pessoa **30 minutos**
// depois do clique de comprar, enquanto a página de pagamento dela ainda está
// VIVA — e é justamente por estar viva que a carta pode fazer a única promessa
// que vale: *o teu link continua de pé, não precisas escolher nada de novo.*
//
// ⛔ A PARADA, herdada da #13 e endurecida aqui: **se a Stripe não devolver uma
// sessão `open` com `url` viva, a pessoa NÃO recebe a carta.** Sessão paga,
// expirada, cancelada ou irrespondível = silêncio. O link é a promessa inteira;
// sem ele isto viraria mais um "volte pra gente", que é exatamente a classe de
// e-mail que a casa já mandou demais (memória `carta-nova-so-depois-da-velha-mover`).
//
// POR QUE ISSO NÃO CONTRARIA A CONCLUSÃO FECHADA DO FUNDADOR (19/08 — "o
// vazamento do checkout é PREÇO", estudo repetido, não reabrir): a carta **não
// cria preço, cupom nem desconto**. O botão principal reabre a MESMA sessão,
// mesmo plano, mesmo valor que a pessoa já aceitou ver. A segunda linha nomeia
// uma oferta que já é pública desde hoje de manhã — o trial de $1 por 7 dias no
// Creator (`c902516f`, `CARD_TRIAL_ENABLED = true`) — porque se o problema foi
// preço, esconder a saída barata é que seria desonesto.
//
// PRECEDÊNCIA (memória `cron-no-mesmo-minuto-nao-tem-ordem`): esta carta e a de
// sessão expirada falam do MESMO momento e se excluem nos dois sentidos — o
// carimbo desta entra em `OUTRAS_CAMPANHAS` da #13 no mesmo commit. Quem levou
// a carta quente não leva a de expiração, e vice-versa. O cron roda em
// `6,21,36,51`, longe dos minutos :00/:30 das outras campanhas de checkout.
//
// MODOS (GET):
//   (sem params)           → DRY RUN: quem receberia, e quem caiu fora e por quê.
//   ?confirm=SEND&limit=N  → envia para os próximos N (default 30, teto 30).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { dedupeTripwire } from '@/lib/truncationTripwire'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { pickMomentumTopic } from '@/lib/momentumTopic'

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
const SENT_EVENT = 'checkout_hot_nudge_emailed_v1'
const SITE = 'https://www.usekineo.com'

/** A JANELA, e ela é o produto inteiro desta rota.
 *
 *  Piso de 30 minutos: menos que isso e a carta chega enquanto a pessoa ainda
 *  está digitando o cartão — seria a casa atropelando a própria venda.
 *  Teto de 6 horas: passado isso o momento esfriou e a coorte passa a ser da
 *  carta de expiração, que tem o link de recuperação e o texto certo para
 *  quem já desistiu. O cron de 15 em 15 minutos varre a janela inteira várias
 *  vezes; o carimbo vitalício garante uma carta por pessoa. */
export const JANELA_MIN_MINUTOS = 30
export const JANELA_MAX_MINUTOS = 360

/** Ninguém entra em duas campanhas — regra da casa desde o send-made-video-today.
 *  `checkout_recovery_emailed_v1` e `checkout_rescue_emailed_v1` estão aqui de
 *  propósito: são cartas sobre ESTE mesmo momento. */
const OUTRAS_CAMPANHAS = [
  'checkout_recovery_emailed_v1',
  'checkout_rescue_emailed_v1',
  'checkout30_emailed_v1',
  'card_declined_emailed_v1',
  'made_video_today_emailed_v1',
  'india_price_emailed_v1',
  'comeback50_emailed_v1',
  'hot_upsell_sent',
  'next_episode_wall_emailed_v1',
  'season_letter_emailed_v1',
]

/** ⛔ NUNCA escrever para estes (limite explícito do ciclo de 06/09). */
/**
 * A regra "ninguém entra em duas campanhas" TEM PRAZO — desde va-r15 (08/09).
 *
 * ERRADO ATÉ AQUI: `OUTRAS_CAMPANHAS` era consultada sem nenhum limite de
 * tempo, então uma `season_letter` de agosto calava PARA SEMPRE a carta que
 * fala em 30 minutos. Medido no banco em 08/09: das 99 pessoas com nome que
 * bateram no checkout em 30 dias, **74 (75%) estavam excluídas para sempre** —
 * sobravam 25. A carta genérica e antiga vencia a carta rara e quente, que é
 * exatamente a doença da memória `supressao-sem-precedencia-cala-a-carta-boa`.
 *
 * A regra continua valendo onde ela protege: quem recebeu OUTRA campanha nos
 * últimos 7 dias continua fora, porque aí a caixa de entrada dela é nossa de
 * verdade. O que morre é a exclusão eterna.
 *
 * Isto NÃO afrouxa nenhuma das outras travas: a supressão de 24h da casa, o
 * `SENT_EVENT` 1×-para-sempre, o opt-out, os bloqueados e o filtro de pagante
 * seguem intactos e sem prazo.
 */
export const OUTRAS_CAMPANHAS_JANELA_DIAS = 7

/** Pura e exportada: o guardião prova a fronteira, não a existência da constante. */
export function corteOutrasCampanhas(agoraMs: number, dias: number = OUTRAS_CAMPANHAS_JANELA_DIAS): string {
  return new Date(agoraMs - dias * 24 * 60 * 60 * 1000).toISOString()
}

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

function tituloDoFilme(title: string | null | undefined, topic: string | null | undefined): string | null {
  return pickMomentumTopic(title) ?? pickMomentumTopic(topic)
}
function escaparHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** A saída barata, etiquetada — senão uma assinatura vinda daqui chega ao
 *  painel como tráfego direto. NÃO é preço novo: o trial de $1 no Creator está
 *  público desde 07/09 de manhã. */
function planoUrl(): string {
  return `${SITE}/pricing?utm_source=lifecycle&utm_medium=email&utm_campaign=checkout_hot_nudge`
}

function assunto(filme: string | null): string {
  // Sem urgência falsa, sem contador inventado: é literalmente o estado da
  // sessão que a Stripe acabou de confirmar como `open`.
  return filme
    ? `Your payment page for "${filme}" is still open`
    : 'Your Kineo payment page is still open'
}

/** ⚠️ Cada frase desta carta tem de ser verdadeira NO INSTANTE DO ENVIO:
 *   · "still open" — a Stripe respondeu `status: 'open'` segundos atrás;
 *   · "same plan, same price" — é a MESMA sessão, buscada agora, não montada
 *     à mão aqui;
 *   · "$1 for 7 days" — oferta pública viva (CARD_TRIAL_ENABLED = true);
 *   · nenhum crédito, cupom ou desconto novo é prometido em lugar nenhum. */
function corpoTexto(filme: string | null, liveUrl: string, userId: string, temFilme: boolean): string {
  const feito = temFilme
    ? (filme
      ? `You already made "${filme}" with Kineo, so you know what comes out the other side.`
      : `You already made a short with Kineo, so you know what comes out the other side.`)
    : `You got as far as the payment page, so something about this was worth your time.`
  return `Hey — Joseph here, founder of Kineo.

You opened the payment page a little while ago and it is still sitting there, open. No charge was made.

${feito}

If life just got in the way, this is the same page you left — same plan, same price, nothing to pick again:

${liveUrl}

If it was the price and not the tab: Creator is $1 for the first 7 days, then $15/month. Same engines, same films.
${planoUrl()}

And if something on that page did not add up, hit reply and tell me in one sentence. It comes straight to me, and I would rather know than guess.

— Joseph, founder
Kineo · usekineo.com
${emailFooterText(userId)}`
}

function corpoHtml(filme: string | null, liveUrl: string, userId: string, temFilme: boolean): string {
  const feito = temFilme
    ? (filme
      ? `You already made <strong>&ldquo;${escaparHtml(filme)}&rdquo;</strong> with Kineo, so you know what comes out the other side.`
      : `You already made a short with Kineo, so you know what comes out the other side.`)
    : `You got as far as the payment page, so something about this was worth your time.`
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>Hey &mdash; Joseph here, founder of <strong>Kineo</strong> 🎬</p>
<p>You opened the payment page a little while ago and it is <strong>still sitting there, open</strong>. No charge was made.</p>
<p>${feito}</p>
<p>If life just got in the way, this is the <strong>same page you left</strong> &mdash; same plan, same price, nothing to pick again:</p>
<p style="margin:26px 0">
  <a href="${liveUrl}" style="background:#2997ff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">Finish where you left off &rarr;</a>
</p>
<p style="font-size:14px;color:#555">If it was the price and not the tab: <a href="${planoUrl()}" style="color:#2997ff">Creator is $1 for the first 7 days</a>, then $15/month. Same engines, same films.</p>
<p>And if something on that page did not add up, hit reply and tell me in one sentence. It comes straight to me, and I would rather know than guess.</p>
<p>&mdash; Joseph, founder<br/>Kineo &middot; <a href="https://usekineo.com" style="color:#2997ff">usekineo.com</a></p>
${emailFooterHtml(userId)}</div>`
}

type Candidato = {
  id: string
  email: string
  sessionId: string
  tier: string | null
  pais: string
  filme: string | null
  temFilme: boolean
  clicouEm: string
}

/** A DECISÃO, isolada da rede de propósito: dada a sessão que a Stripe
 *  devolve, esta carta pode ser enviada?
 *
 *  Fica exportada e PURA para que o guardião exercite a condição de verdade em
 *  vez de contar texto — um mutante que troque qualquer termo por `true` faz o
 *  teste cair (memória `guardiao-contar-texto-nao-prova-condicao`).
 *
 *  Quatro portas, todas fechadas por padrão:
 *   1. `status` tem de ser exatamente `'open'` — `complete` é gente que PAGOU e
 *      `expired` é a coorte da outra carta;
 *   2. `payment_status` não pode ser `'paid'` (cinto e suspensório: uma sessão
 *      recém-paga pode ser lida antes de virar `complete`);
 *   3. `url` tem de existir — é a promessa inteira da carta;
 *   4. `expires_at` da Stripe vem em SEGUNDOS. Comparar com `Date.now()` sem os
 *      mil seria dizer que toda sessão morreu em 1970 e a carta nunca sairia. */
export function escolherPaginaViva(
  sessao: {
    status?: string | null
    payment_status?: string | null
    url?: string | null
    expires_at?: number | null
  } | null | undefined,
  agoraMs: number,
): string | null {
  if (!sessao) return null
  if (sessao.status !== 'open') return null
  if (sessao.payment_status === 'paid') return null
  const url = sessao.url ?? null
  if (!url) return null
  const expira = sessao.expires_at ?? null
  if (expira !== null && expira !== undefined && expira * 1000 <= agoraMs) return null
  return url
}

/** Um `checkout_started` entra na janela? Pura, exportada, e é o que separa
 *  esta carta da carta de expiração — o guardião prova os dois lados da
 *  fronteira, não a existência das constantes. */
export function dentroDaJanela(
  clicadoEmMs: number,
  agoraMs: number,
  minMinutos: number = JANELA_MIN_MINUTOS,
  maxMinutos: number = JANELA_MAX_MINUTOS,
): boolean {
  const idadeMin = (agoraMs - clicadoEmMs) / 60000
  return idadeMin >= minMinutos && idadeMin <= maxMinutos
}

/** Busca na Stripe a página viva desta sessão. Devolve null quando a sessão
 *  não está aberta, quando já foi paga, quando não há url, quando ela morreu,
 *  ou quando a Stripe não responde — os cinco casos significam a mesma coisa
 *  para a carta: ela não pode ser enviada. */
async function paginaViva(sessionId: string): Promise<string | null> {
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId)
    return escolherPaginaViva(s, Date.now())
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const porCron = Boolean(cronSecret) && req.headers.get('authorization') === `Bearer ${cronSecret}`
    if (!porCron) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !ADMIN_EMAILS.has((user.email ?? '').toLowerCase())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'STRIPE_SECRET_KEY missing' }, { status: 503 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

    const agora = Date.now()
    // ── 1. o clique de comprar MAIS RECENTE de cada pessoa, dentro da janela ──
    const desde = new Date(agora - JANELA_MAX_MINUTOS * 60 * 1000).toISOString()
    const ate = new Date(agora - JANELA_MIN_MINUTOS * 60 * 1000).toISOString()
    const { data: csRows, error: csErr } = await admin
      .from('events')
      .select('user_id, created_at, metadata')
      .eq('name', 'checkout_started')
      .gte('created_at', desde)
      .lte('created_at', ate)
      .order('created_at', { ascending: false })
      .limit(5000)
    if (csErr) return NextResponse.json({ error: csErr.message }, { status: 500 })

    const ultimaSessao = new Map<string, { sessionId: string; tier: string | null; pais: string; quando: string }>()
    for (const r of csRows ?? []) {
      const uid = r.user_id as string | null
      if (!uid || ultimaSessao.has(uid)) continue // a lista já vem do mais novo para o mais velho
      const md = (r.metadata ?? {}) as Record<string, unknown>
      const sid = typeof md.stripe_session_id === 'string' ? md.stripe_session_id : null
      if (!sid) continue
      // Redundante com o filtro do banco, e de propósito: a janela é a regra
      // desta rota e ela fica auditável em código, não só na query.
      if (!dentroDaJanela(new Date(r.created_at as string).getTime(), agora)) continue
      ultimaSessao.set(uid, {
        sessionId: sid,
        tier: typeof md.tier === 'string' ? md.tier : null,
        pais: typeof md.ip_country === 'string' ? md.ip_country : '',
        quando: r.created_at as string,
      })
    }
    const ids = [...ultimaSessao.keys()]
    if (ids.length === 0) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        janela_minutos: [JANELA_MIN_MINUTOS, JANELA_MAX_MINUTOS],
        elegiveis: 0,
        note: 'ninguém apertou comprar dentro da janela quente',
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
    const pagou = new Set(dedupeTripwire(pagouRows, 'checkout-hot-nudge payment_success').map((r) => r.user_id as string))
    const { data: outrasRows } = await admin
      .from('events').select('user_id').in('name', OUTRAS_CAMPANHAS).in('user_id', baseIds)
      .gte('created_at', corteOutrasCampanhas(agora))
    const outras = new Set(dedupeTripwire(outrasRows, 'checkout-hot-nudge OUTRAS_CAMPANHAS').map((r) => r.user_id as string))
    const { data: jaRows } = await admin
      .from('events').select('user_id').eq('name', SENT_EVENT).in('user_id', baseIds)
    const ja = new Set(dedupeTripwire(jaRows, 'checkout-hot-nudge SENT_EVENT').map((r) => r.user_id as string))

    // Filmes entregues — a carta muda de frase conforme a pessoa já tenha
    // recebido filme ou não, e nomear um filme que não existe é mentira.
    const filmes = new Map<string, { title: string | null; topic: string | null }>()
    for (let i = 0; i < baseIds.length; i += 200) {
      const slice = baseIds.slice(i, i + 200)
      const { data: vids } = await admin
        .from('videos').select('user_id, title, topic, created_at')
        .in('user_id', slice).order('created_at', { ascending: false }).limit(5000)
      for (const v of vids ?? []) {
        const uid = v.user_id as string
        if (!filmes.has(uid)) filmes.set(uid, { title: v.title as string | null, topic: v.topic as string | null })
      }
    }

    const candidatos: Candidato[] = []
    for (const p of base) {
      const id = p.id as string
      if (pagou.has(id)) { excluidos.pagante++; continue }
      if (outras.has(id)) { excluidos.outra_campanha++; continue }
      if (ja.has(id)) { excluidos.ja_recebeu++; continue }
      const sess = ultimaSessao.get(id)
      if (!sess) continue
      const f = filmes.get(id)
      candidatos.push({
        id,
        email: p.email as string,
        sessionId: sess.sessionId,
        tier: sess.tier,
        pais: sess.pais,
        filme: f ? tituloDoFilme(f.title, f.topic) : null,
        temFilme: Boolean(f),
        clicouEm: sess.quando,
      })
    }

    // ── 3. supressão de 24h (falha FECHADA) ─────────────────────────────────
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const naoSuprimidos = candidatos
      .filter((c) => !sup.isSuppressed(c.id))
      // Quem já entregou filme primeiro: essa pessoa viu o produto funcionar
      // e a carta dela é a mais verdadeira. Depois, o clique mais recente.
      .sort((a, b) => Number(b.temFilme) - Number(a.temFilme) || b.clicouEm.localeCompare(a.clicouEm))

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limiteParam = Number(req.nextUrl.searchParams.get('limit'))
    const lote = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, 30) : 30

    // ── 4. a página viva, na Stripe, uma por pessoa ─────────────────────────
    const alvo = naoSuprimidos.slice(0, lote)
    const comPagina: Array<Candidato & { liveUrl: string }> = []
    let semPagina = 0
    for (const c of alvo) {
      const link = await paginaViva(c.sessionId)
      if (!link) { semPagina++; continue }
      comPagina.push({ ...c, liveUrl: link })
    }

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        coorte: `apertou comprar há ${JANELA_MIN_MINUTOS}-${JANELA_MAX_MINUTOS} min · sessão ainda ABERTA na Stripe · nunca pagou · nenhuma outra campanha nos últimos ${OUTRAS_CAMPANHAS_JANELA_DIAS} dias · opt-in · e-mail real`,
        janela_minutos: [JANELA_MIN_MINUTOS, JANELA_MAX_MINUTOS],
        outras_campanhas_janela_dias: OUTRAS_CAMPANHAS_JANELA_DIAS,
        candidatos_apos_filtros: naoSuprimidos.length,
        no_proximo_lote: alvo.length,
        com_pagina_viva: comPagina.length,
        sem_pagina_viva_nao_recebem: semPagina,
        suprimidos_24h: sup.suppressedCount,
        supressao_degradada: sup.degraded,
        excluidos,
        assunto_exemplo: assunto(comPagina[0]?.filme ?? null),
        lista: comPagina.map((c) => `${c.email} · ${c.pais || '??'} · ${c.tier ?? '?'} · ${c.temFilme ? 'com filme' : 'SEM filme'} · ${c.filme ?? '(sem título)'} · clicou ${c.clicouEm}`),
        from: FROM_EMAIL,
        hint: 'Acrescente &confirm=SEND (e opcionalmente &limit=N) para enviar.',
      })
    }

    let enviados = 0
    let falhas = 0
    const resultados: Array<{ email: string; outcome: string }> = []
    for (const c of comPagina) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: c.email,
            reply_to: REPLY_TO,
            subject: assunto(c.filme),
            text: corpoTexto(c.filme, c.liveUrl, c.id, c.temFilme),
            html: corpoHtml(c.filme, c.liveUrl, c.id, c.temFilme),
            headers: unsubscribeHeaders(c.id),
          }),
        })
        if (!res.ok) throw new Error(`resend ${res.status}`)
        await admin.from('events').insert({
          user_id: c.id,
          name: SENT_EVENT,
          metadata: {
            tier: c.tier,
            country: c.pais,
            has_film: c.temFilme,
            film: c.filme,
            checkout_started_at: c.clicouEm,
            minutes_after_click: Math.round((agora - new Date(c.clicouEm).getTime()) / 60000),
            stripe_session_id: c.sessionId,
            // O link NÃO é gravado: é uma porta de pagamento pessoal.
            live_url_used: true,
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
      sem_pagina_viva_nao_receberam: semPagina,
      restam_apos_lote: Math.max(0, naoSuprimidos.length - alvo.length),
      resultados,
    })
  } catch (e) {
    console.error('[send-checkout-hot-nudge] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
