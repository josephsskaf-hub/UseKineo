// ═══ KINEO-PORTA-DE-VOLTA-2026-09-06 — sprint-assinaturas #13 ══════════════
//
// O NÚMERO QUE MANDOU ESCREVER ISTO (medido 06/09 05:2x BRT, contas externas):
//
//   · `checkout_session_expired` em 72h: 17 pessoas.
//   · Sessões expiradas nos últimos 14 dias, sem pagamento nenhum na história
//     e sem carimbo de campanha nenhuma: 34 pessoas — 20 delas já ENTREGARAM
//     filme.
//   · Dessas 34, **31 têm um link de recuperação da Stripe vivo**.
//   · Última vez que a casa escreveu para esta coorte: **19/08**, 38 pessoas,
//     em 27 segundos. Nunca mais. 18 dias de checkout expirado empilhados.
//
// O DEFEITO ESPECÍFICO, e ele é de desperdício, não de bug: o webhook já
// recebe `checkout.session.expired` e grava `recovery_url_available: true` em
// `events.metadata` — quer dizer, a casa **detecta** que a Stripe guardou uma
// porta de volta e **descarta a porta**, guardando só o aviso de que ela
// existe. `after_expiration.recovery.url` reabre A MESMA sessão: mesmo plano,
// mesma moeda, mesmo valor que a pessoa já tinha aceitado ver. E vive 30 dias
// (conferido nos `recovery_url_expires_at` gravados: sessão de 05/09 → link
// válido até 05/10). Nenhum dos 31 expirou.
//
// POR QUE ISSO NÃO CONTRARIA A CONCLUSÃO FECHADA DO FUNDADOR (o vazamento do
// checkout é PREÇO, estudo repetido, não reabrir): esta rota **não muda preço,
// plano, oferta nem termo**. Ela devolve a porta para quem já passou pela
// decisão de preço e parou no degrau seguinte — a sessão morre sozinha de
// velhice, e hoje ninguém avisa a pessoa. A carta de 19/08 (`checkout-rescue`)
// manda a pessoa para `/pricing`, ou seja, pede que ela **re-escolha o plano e
// re-encare o preço do zero**. Esta manda de volta para o formulário.
//
// ⛔ A PARADA, e ela é a regra central deste arquivo: **se a Stripe não
// devolver `after_expiration.recovery.url` para uma pessoa, ela NÃO recebe a
// carta.** O link é a promessa inteira; sem ele a carta viraria mais um
// "volte pra gente", que é exatamente a classe de e-mail que a casa já mandou
// demais. Falha fechada, e o dry-run conta quantos caíram fora por isso.
//
// O que é herdado, sem inventar régua nova: carimbo vitalício de 1 e-mail por
// pessoa (`checkout_recovery_emailed_v1`), exclusão de quem já entrou em
// QUALQUER outra campanha, supressão de 24h fail-closed, bloqueados do ciclo,
// opt-out, cabeçalho de descadastro, teto de 30 por lote, pacing de 600ms,
// e as duas portas de autorização (cron da casa OU sessão de admin).
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
const SENT_EVENT = 'checkout_recovery_emailed_v1'
const SITE = 'https://www.usekineo.com'

/** Gatilho automático, mesmo contrato dos crons da casa. FAIL-CLOSED: sem a
 *  env, ninguém entra — uma rota que manda dezenas de e-mails nunca fica
 *  pública porque uma variável se perdeu. */
function autorizadoPorCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

/** Ninguém entra em duas campanhas — regra da casa desde o send-made-video-today
 *  e registrada no PEDIDOS pela #8 de 05/09. `checkout_rescue_emailed_v1` está
 *  aqui de propósito: as 38 pessoas de 19/08 não recebem uma segunda carta de
 *  checkout. */
const OUTRAS_CAMPANHAS = [
  'made_video_today_emailed_v1',
  'checkout_rescue_emailed_v1',
  'india_price_emailed_v1',
  'comeback50_emailed_v1',
  'hot_upsell_sent',
  'next_episode_wall_emailed_v1',
  // sprint-assinaturas #19 (06/09) — a CARTA DA TEMPORADA. Coorte oposta
  // (saldo que AINDA paga, nunca bateu na parede), mas o aviso da #13 vale
  // nos dois sentidos: sem este carimbo, a mesma pessoa poderia levar duas
  // cartas no mesmo dia.
  'season_letter_emailed_v1',
]

/** ⛔ NUNCA escrever para estes (limite explícito do ciclo de 06/09). */
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

/** Mesma régua de "isto serve como nome de filme?" do resto da casa. Devolve
 *  null quando o texto é ordem colada do ChatGPT, rótulo de produção ou
 *  markdown — e nesse caso a carta simplesmente não nomeia filme nenhum. */
function tituloDoFilme(title: string | null | undefined, topic: string | null | undefined): string | null {
  return pickMomentumTopic(title) ?? pickMomentumTopic(topic)
}
function escaparHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** O link do plano existe SEMPRE como saída secundária (regra K1: nada de
 *  pedágio — quem quer olhar o preço de novo consegue). Etiquetado, senão uma
 *  assinatura vinda daqui chega ao painel como tráfego direto. */
function planoUrl(): string {
  return `${SITE}/pricing?utm_source=lifecycle&utm_medium=email&utm_campaign=checkout_recovery`
}

function assunto(filme: string | null): string {
  // Sem urgência falsa e sem promoção: é literalmente o que aconteceu.
  return filme
    ? `Your checkout for "${filme}" timed out`
    : 'Your Kineo checkout page timed out'
}

/** ⚠️ Cada frase desta carta tem de ser verdadeira NO INSTANTE DO ENVIO:
 *   · "timed out" — o evento é `checkout.session.expired` da própria Stripe;
 *   · "same plan, same price" — é o que o link de recuperação reabre, e por
 *     isso ele é buscado na Stripe agora e não montado à mão aqui;
 *   · nenhum crédito, cupom ou desconto é prometido em lugar nenhum. */
function corpoTexto(filme: string | null, recoveryUrl: string, userId: string, temFilme: boolean): string {
  const feito = temFilme
    ? (filme
      ? `You already made "${filme}" with Kineo, so you know what comes out the other side.`
      : `You already made a short with Kineo, so you know what comes out the other side.`)
    : `You got as far as the payment page, so something about this was worth your time.`
  return `Hey — Joseph here, founder of Kineo.

You opened our payment page and the page timed out before it went through. That happens for a hundred boring reasons: a tab that got closed, a phone that rang, a card that was in another room.

${feito}

If it was just the tab, this link puts you back on the exact same page — same plan, same price, nothing to pick again:

${recoveryUrl}

If it was not the tab — if it was the price, or something the page did not answer — hit reply and tell me in one sentence. It comes straight to me, and I would rather know than guess.

If you would rather look at the plans again first, they are here:
${planoUrl()}

— Joseph, founder
Kineo · usekineo.com
${emailFooterText(userId)}`
}

function corpoHtml(filme: string | null, recoveryUrl: string, userId: string, temFilme: boolean): string {
  const feito = temFilme
    ? (filme
      ? `You already made <strong>&ldquo;${escaparHtml(filme)}&rdquo;</strong> with Kineo, so you know what comes out the other side.`
      : `You already made a short with Kineo, so you know what comes out the other side.`)
    : `You got as far as the payment page, so something about this was worth your time.`
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>Hey &mdash; Joseph here, founder of <strong>Kineo</strong> 🎬</p>
<p>You opened our payment page and the page <strong>timed out</strong> before it went through. That happens for a hundred boring reasons: a tab that got closed, a phone that rang, a card that was in another room.</p>
<p>${feito}</p>
<p>If it was just the tab, this puts you back on the <strong>exact same page</strong> &mdash; same plan, same price, nothing to pick again:</p>
<p style="margin:26px 0">
  <a href="${recoveryUrl}" style="background:#2997ff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">Pick up where you left off &rarr;</a>
</p>
<p>If it was not the tab &mdash; if it was the price, or something the page did not answer &mdash; hit reply and tell me in one sentence. It comes straight to me, and I would rather know than guess.</p>
<p style="font-size:14px;color:#555">If you would rather look at <a href="${planoUrl()}" style="color:#2997ff">the plans</a> again first, that is fine too.</p>
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
  expiradoEm: string
}

/** A DECISÃO, isolada da rede de propósito: dado o objeto `recovery` que a
 *  Stripe devolve, esta carta pode ser enviada? Fica exportada e pura para que
 *  o guardião exercite a condição de verdade em vez de contar texto — um
 *  mutante que troque a checagem de validade por `true` faz o teste cair
 *  (memória `guardiao-contar-texto-nao-prova-condicao`).
 *
 *  `expires_at` da Stripe vem em SEGUNDOS. Comparar com `Date.now()` sem os
 *  mil seria dizer que todo link já morreu em 1970 — e a carta nunca sairia. */
export function escolherPortaDeVolta(
  recovery: { url?: string | null; expires_at?: number | null } | null | undefined,
  agoraMs: number,
): string | null {
  const url = recovery?.url ?? null
  if (!url) return null
  const expira = recovery?.expires_at ?? null
  if (expira !== null && expira !== undefined && expira * 1000 <= agoraMs) return null
  return url
}

/** Busca na Stripe a porta de volta desta sessão. Devolve null quando não há
 *  link, quando ele já morreu, ou quando a Stripe não responde — os três casos
 *  significam a mesma coisa para a carta: ela não pode ser enviada. */
async function portaDeVolta(sessionId: string): Promise<string | null> {
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId)
    return escolherPortaDeVolta(s.after_expiration?.recovery ?? null, Date.now())
  } catch {
    return null
  }
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
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'STRIPE_SECRET_KEY missing' }, { status: 503 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

    // ── 1. a sessão expirada MAIS RECENTE de cada pessoa, 14 dias ───────────
    const desde = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: expRows, error: expErr } = await admin
      .from('events')
      .select('user_id, created_at, metadata')
      .eq('name', 'checkout_session_expired')
      .gte('created_at', desde)
      .order('created_at', { ascending: false })
      .limit(5000)
    if (expErr) return NextResponse.json({ error: expErr.message }, { status: 500 })

    const ultimaSessao = new Map<string, { sessionId: string; tier: string | null; pais: string; quando: string }>()
    for (const r of expRows ?? []) {
      const uid = r.user_id as string | null
      if (!uid || ultimaSessao.has(uid)) continue // a lista já vem do mais novo para o mais velho
      const md = (r.metadata ?? {}) as Record<string, unknown>
      const sid = typeof md.stripe_session_id === 'string' ? md.stripe_session_id : null
      if (!sid) continue
      ultimaSessao.set(uid, {
        sessionId: sid,
        tier: typeof md.tier === 'string' ? md.tier : null,
        pais: typeof md.ip_country === 'string' ? md.ip_country : '',
        quando: r.created_at as string,
      })
    }
    const ids = [...ultimaSessao.keys()]
    if (ids.length === 0) {
      return NextResponse.json({ mode: 'DRY_RUN', elegiveis: 0, note: 'nenhuma sessão expirada com id da Stripe em 14 dias' })
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

    // Quem já pagou alguma vez na história (não só `has_paid`), quem já entrou
    // em outra campanha, e quem já recebeu ESTA. Os três com tripwire: dedupe
    // truncado em 1000 é reenvio de campanha (KINEO-TRIPWIRE-1000-2026-08-28).
    const { data: pagouRows } = await admin
      .from('events').select('user_id').eq('name', 'payment_success').in('user_id', baseIds)
    const pagou = new Set(dedupeTripwire(pagouRows, 'checkout-recovery payment_success').map((r) => r.user_id as string))
    const { data: outrasRows } = await admin
      .from('events').select('user_id').in('name', OUTRAS_CAMPANHAS).in('user_id', baseIds)
    const outras = new Set(dedupeTripwire(outrasRows, 'checkout-recovery OUTRAS_CAMPANHAS').map((r) => r.user_id as string))
    const { data: jaRows } = await admin
      .from('events').select('user_id').eq('name', SENT_EVENT).in('user_id', baseIds)
    const ja = new Set(dedupeTripwire(jaRows, 'checkout-recovery SENT_EVENT').map((r) => r.user_id as string))

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
        expiradoEm: sess.quando,
      })
    }

    // ── 3. supressão de 24h (falha FECHADA) ─────────────────────────────────
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const naoSuprimidos = candidatos
      .filter((c) => !sup.isSuppressed(c.id))
      // Quem já entregou filme primeiro: essa pessoa viu o produto funcionar
      // e a carta dela é a mais verdadeira. Depois, o mais recente primeiro.
      .sort((a, b) => Number(b.temFilme) - Number(a.temFilme) || b.expiradoEm.localeCompare(a.expiradoEm))

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limiteParam = Number(req.nextUrl.searchParams.get('limit'))
    const lote = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, 30) : 30

    // ── 4. a porta de volta, na Stripe, uma por pessoa ──────────────────────
    // Só para quem entraria no lote: cada consulta é uma chamada de rede, e no
    // dry-run só precisamos saber quantas portas EXISTEM entre as candidatas
    // do próximo lote — não da lista inteira.
    const alvo = naoSuprimidos.slice(0, lote)
    const comPorta: Array<Candidato & { recoveryUrl: string }> = []
    let semPorta = 0
    for (const c of alvo) {
      const link = await portaDeVolta(c.sessionId)
      if (!link) { semPorta++; continue }
      comPorta.push({ ...c, recoveryUrl: link })
    }

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        coorte: 'checkout expirado em 14d · nunca pagou · nenhuma outra campanha · opt-in · e-mail real',
        candidatos_apos_filtros: naoSuprimidos.length,
        no_proximo_lote: alvo.length,
        com_porta_de_volta: comPorta.length,
        sem_porta_de_volta_nao_recebem: semPorta,
        suprimidos_24h: sup.suppressedCount,
        supressao_degradada: sup.degraded,
        excluidos,
        assunto_exemplo: assunto(comPorta[0]?.filme ?? null),
        lista: comPorta.map((c) => `${c.email} · ${c.pais || '??'} · ${c.tier ?? '?'} · ${c.temFilme ? 'com filme' : 'SEM filme'} · ${c.filme ?? '(sem título)'} · expirou ${c.expiradoEm}`),
        from: FROM_EMAIL,
        hint: 'Acrescente &confirm=SEND (e opcionalmente &limit=N) para enviar.',
      })
    }

    let enviados = 0
    let falhas = 0
    const resultados: Array<{ email: string; outcome: string }> = []
    for (const c of comPorta) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: c.email,
            reply_to: REPLY_TO,
            subject: assunto(c.filme),
            text: corpoTexto(c.filme, c.recoveryUrl, c.id, c.temFilme),
            html: corpoHtml(c.filme, c.recoveryUrl, c.id, c.temFilme),
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
            expired_at: c.expiradoEm,
            stripe_session_id: c.sessionId,
            // O link NÃO é gravado: é uma porta de pagamento pessoal.
            recovery_url_used: true,
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
      sem_porta_de_volta_nao_receberam: semPorta,
      restam_apos_lote: Math.max(0, naoSuprimidos.length - alvo.length),
      resultados,
    })
  } catch (e) {
    console.error('[send-checkout-recovery] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
