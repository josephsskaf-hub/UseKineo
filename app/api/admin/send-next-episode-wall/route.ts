// ═══ KINEO-PROXIMA-ACAO-CARTA-2026-09-06 — sprint-assinaturas #4 ═══════════
//
// A COORTE, e ela é a mais quente que a casa tem sem campanha nenhuma: pessoa
// que ENTREGOU um filme e ficou com saldo MENOR que o preço do filme que
// acabou de fazer. Ela não desistiu do produto — ela acabou de gostar dele e
// bateu numa parede que não diz o próprio nome.
//
// MEDIDO ANTES DE ESCREVER UMA LINHA (06/09, contas externas, 14 dias):
//   · 140 pessoas nesse estado.
//   · 106 (76%) JÁ receberam e-mail de alguma campanha. Elas NÃO entram aqui:
//     a regra da casa é 1 e-mail por pessoa, e reofertar a quem já recebeu é
//     decisão do fundador (registrado no PEDIDOS pela #8 de 05/09), não minha.
//   · sobram 34 nunca tocadas por campanha nenhuma; 1 optou por sair → 33.
//   · 0 delas tocaram o checkout, então não há disputa com o resgate de
//     checkout (a regra do send-made-video-today: não disputar a pessoa entre
//     duas campanhas).
//   · 19 vêm do chatgpt (a fonte que retém 1 em 3 no segundo filme), 14 do
//     taaft, 1 sem fonte. 33 das 34 têm título de filme para nomear.
//
// ⚠️ O QUE ESTA CARTA NÃO PROMETE, e é a lição de horas atrás neste mesmo ciclo:
// ela NÃO diz que o próximo filme sai de graça, e não nomeia motor nem preço.
// A #1 deste ciclo achou o contrato `/api/next-action` anunciando "Kineo 1 · 0
// créditos" para 798 contas de trial que a casa cobra 5 — porque o preço do
// Kineo 1 depende do trial estar vivo, e o grátis ainda depende de cota (1 por
// 30 dias) e sai com 15 segundos. Nada disso cabe num e-mail escrito horas
// antes de a pessoa clicar, e um e-mail não pode reconsultar a cota.
//
// Então a divisão de trabalho é: o E-MAIL traz a pessoa de volta nomeando o
// filme que ela fez; o PRODUTO (o NextActionCard das #2/#3, que lê a cota em
// tempo real) diz o preço exato quando ela chega. A carta afirma só o que é
// verificável no banco no instante do envio: o filme, o saldo e o que o último
// filme custou.
//
// SEM DESCONTO, SEM CRÉDITO, SEM PREÇO: nenhuma oferta nova é criada aqui
// (limite do ciclo). A porta do plano é um link, não uma promessa.
//
// MODOS (GET, admin-gated):
//   (sem params)           → DRY RUN: quem receberia, com a lista completa.
//   ?confirm=SEND&limit=N  → envia para os próximos N (default 30).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Ver o bloco KINEO-DATA-CACHE-2026-09-02 do send-made-video-today: rota só-GET
// no Next 14.2 nasce com revalidate=false e leria o banco congelado.
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const SENT_EVENT = 'next_episode_wall_emailed_v1'

/** Carimbos de e-mail de TODAS as campanhas que vivem em `events`. Ninguém
 *  entra em duas — mesma regra do send-made-video-today. */
const OTHER_CAMPAIGNS = [
  'made_video_today_emailed_v1',
  'checkout_rescue_emailed_v1',
  'india_price_emailed_v1',
  'comeback50_emailed_v1',
  'hot_upsell_sent',
]

/** Colunas de carimbo em `profiles`. A lista foi conferida contra
 *  information_schema em 06/09 — coluna inventada aqui vira erro de query e
 *  derruba o lote inteiro, então nada de adivinhar nome. */
const STAMP_COLUMNS = [
  'free_upsell_emailed', 'stalled_rescue_emailed', 'abandon_emailed', 'pack_offer_emailed',
  'comeback50_emailed', 'dfy_offer_emailed', 'feature_announce_emailed', 'avatar_launch_emailed',
  'pilot_offer_emailed',
] as const
const STAMP_DATES = [
  'activation_nudge_sent_at', 'video_rescue_sent_at', 'credits_back_sent_at',
  'post_nudge_sent_at', 'reminder_sent_at', 'cap_hit_sent_at', 'stalled_rescue_sent_at',
] as const

/** ⛔ NUNCA escrever para estes (limite explícito do ciclo de 06/09). */
const BLOQUEADOS = ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']

const DISPOSABLE = ['mailinator', 'yopmail', 'tempmail', 'hutdot.com', 'beiwoh.com', 'playboot.com', 'skyprofy.com', 'gouziben.com', 'joystill.com', 'lanvos.com', 'minitts.net', 'dysonc.com', 'guerrillamail', 'sharklasers', 'getnada', 'maildrop', 'trashmail', '10minutemail', 'dispostable', 'fakeinbox', 'temp-mail']
function isJunk(email: string): boolean {
  const e = email.toLowerCase()
  if (!e.includes('@') || e.endsWith('@')) return true
  return DISPOSABLE.some((d) => e.includes(d))
}
function isBloqueado(email: string): boolean {
  const e = email.toLowerCase()
  return BLOQUEADOS.some((b) => e.includes(b))
}

/** O título do filme entra no assunto e no corpo. Vem do banco, então pode ter
 *  aspas, quebras e comprimento arbitrário — nada disso pode vazar para o
 *  assunto nem para o HTML. */
function limparTitulo(raw: string | null | undefined): string | null {
  const t = (raw ?? '').toString().replace(/\s+/g, ' ').trim()
  if (!t || t.length < 3) return null
  return t.length > 70 ? `${t.slice(0, 67)}…` : t
}
function escaparHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const SITE = 'https://www.usekineo.com'

function assunto(filme: string | null): string {
  // Nomeia o FILME, não o produto. A isca é o trabalho que a pessoa já fez.
  return filme ? `Episode 2 of "${filme}"` : 'Your next episode is ready to write'
}

function corpoTexto(filme: string | null, saldo: number, custo: number, userId: string): string {
  const nome = filme ? `"${filme}"` : 'the short you made with Kineo'
  return `You made ${nome} — and then the credits ran out.

Here is exactly where you stand: your last film cost ${custo} credits, and you have ${saldo}.
That is the whole reason the next one did not start.

The part most people miss: the sequel is already written. Kineo keeps the thread
of what you made, so Episode 2 does not begin on a blank page — open the studio
and it is waiting with the topic already in it.

Continue the series:
${SITE}/studio/create

If you want the bigger engines to keep running, the plans are here:
${SITE}/pricing

When you open the studio it will show you, on screen, what your current balance
still covers — I would rather you see the real number there than take my word
for it in an email.

Reply to this and tell me what you were making. I read these.

— Joseph
${emailFooterText(userId)}`
}

function corpoHtml(filme: string | null, saldo: number, custo: number, userId: string): string {
  const nome = filme ? `&ldquo;${escaparHtml(filme)}&rdquo;` : 'the short you made with Kineo'
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>You made <strong>${nome}</strong> — and then the credits ran out.</p>
<p>Here is exactly where you stand: your last film cost <strong>${custo} credits</strong>, and you have <strong>${saldo}</strong>. That is the whole reason the next one did not start.</p>
<p>The part most people miss: <strong>the sequel is already written.</strong> Kineo keeps the thread of what you made, so Episode&nbsp;2 does not begin on a blank page — open the studio and it is waiting with the topic already in it.</p>
<p style="margin:26px 0">
  <a href="${SITE}/studio/create" style="background:#2997ff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">Continue the series &rarr;</a>
</p>
<p style="font-size:14px;color:#555">If you want the bigger engines to keep running, <a href="${SITE}/pricing" style="color:#2997ff">the plans are here</a>.</p>
<p style="font-size:14px;color:#555">When you open the studio it will show you, on screen, what your current balance still covers — I would rather you see the real number there than take my word for it in an email.</p>
<p>Reply to this and tell me what you were making. I read these.</p>
<p>&mdash; Joseph</p>
${emailFooterHtml(userId)}</div>`
}

type Destinatario = {
  id: string
  email: string
  filme: string | null
  saldo: number
  custo: number
  fonte: string
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !ADMIN_EMAILS.has((user.email ?? '').toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

    // ── 1. o ÚLTIMO filme entregue de cada pessoa, nos últimos 14 dias ──────
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: vids, error: vidsErr } = await admin
      .from('videos')
      .select('user_id, credits_used, created_at, title, topic, status')
      .eq('status', 'completed')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000)
    if (vidsErr) return NextResponse.json({ error: 'videos query failed' }, { status: 503 })

    const ultimoDe = new Map<string, { custo: number; filme: string | null }>()
    for (const v of vids ?? []) {
      const uid = (v as { user_id: string }).user_id
      if (!uid || ultimoDe.has(uid)) continue // já ordenado por created_at desc
      const bruto = (v as { credits_used: number | null }).credits_used
      ultimoDe.set(uid, {
        custo: typeof bruto === 'number' && bruto > 0 ? Math.floor(bruto) : 0,
        filme: limparTitulo((v as { title: string | null }).title)
          ?? limparTitulo((v as { topic: string | null }).topic),
      })
    }
    const ids = [...ultimoDe.keys()]
    if (ids.length === 0) return NextResponse.json({ mode: 'DRY_RUN', elegiveis: 0 })

    // ── 2. perfis + carimbos de campanha ───────────────────────────────────
    const colunas = [
      'id', 'email', 'email_opted_out', 'has_paid', 'plan', 'video_credits',
      'utm_source', 'signup_utm_source',
      ...STAMP_COLUMNS, ...STAMP_DATES,
    ].join(', ')
    const [profRes, evtRes] = await Promise.all([
      admin.from('profiles').select(colunas).in('id', ids),
      admin.from('events').select('user_id, name')
        .in('user_id', ids)
        .in('name', [SENT_EVENT, ...OTHER_CAMPAIGNS, 'checkout_started', 'checkout_attempted']),
    ])
    if (profRes.error || evtRes.error) {
      return NextResponse.json({ error: 'profile/event query failed' }, { status: 503 })
    }

    const jaEmailado = new Set<string>()
    const tocouCheckout = new Set<string>()
    for (const e of evtRes.data ?? []) {
      const uid = (e as { user_id: string }).user_id
      const n = (e as { name: string }).name
      if (n === 'checkout_started' || n === 'checkout_attempted') tocouCheckout.add(uid)
      else jaEmailado.add(uid)
    }

    const PAGOS = new Set(['starter', 'basic', 'pro', 'creator', 'studio', 'autopilot'])
    const candidatos: Destinatario[] = []
    for (const raw of (profRes.data ?? []) as unknown as Record<string, unknown>[]) {
      const id = raw.id as string
      const email = (raw.email as string | null) ?? ''
      const ultimo = ultimoDe.get(id)
      if (!ultimo) continue
      if (!email || raw.email_opted_out === true) continue
      if (raw.has_paid === true) continue
      if (PAGOS.has(((raw.plan as string) ?? '').toLowerCase())) continue
      if (isJunk(email) || isBloqueado(email)) continue
      // A parede: saldo MENOR que o preço do filme que ela acabou de fazer.
      const saldo = typeof raw.video_credits === 'number' ? Math.max(0, Math.floor(raw.video_credits)) : -1
      if (saldo < 0 || ultimo.custo <= 0 || saldo >= ultimo.custo) continue
      // 1 e-mail por pessoa, para sempre: qualquer carimbo de campanha exclui.
      if (jaEmailado.has(id)) continue
      if (STAMP_COLUMNS.some((c) => raw[c] === true)) continue
      if (STAMP_DATES.some((c) => raw[c] != null)) continue
      // Quem tocou o checkout pertence ao resgate de checkout.
      if (tocouCheckout.has(id)) continue
      candidatos.push({
        id, email, filme: ultimo.filme, saldo, custo: ultimo.custo,
        fonte: ((raw.utm_source as string) || (raw.signup_utm_source as string) || 'sem fonte'),
      })
    }

    // ── 3. supressão de 24h (falha FECHADA: suprime o lote se não puder ler)
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const destinatarios = candidatos
      .filter((c) => !sup.isSuppressed(c.id))
      // chatgpt primeiro: é a fonte que retém 1 em 3 no segundo filme.
      .sort((a, b) => Number(b.fonte === 'chatgpt') - Number(a.fonte === 'chatgpt') || b.saldo - a.saldo)

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limiteParam = Number(req.nextUrl.searchParams.get('limit'))
    const lote = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, 30) : 30

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        coorte: 'entregou filme · saldo < preço do último filme · nunca recebeu campanha · fora do checkout · não pagante',
        elegiveis: destinatarios.length,
        suprimidos_24h: sup.suppressedCount,
        supressao_degradada: sup.degraded,
        por_fonte: destinatarios.reduce<Record<string, number>>((acc, d) => {
          acc[d.fonte] = (acc[d.fonte] ?? 0) + 1; return acc
        }, {}),
        sem_titulo: destinatarios.filter((d) => !d.filme).length,
        assunto_exemplo: assunto(destinatarios[0]?.filme ?? null),
        lista: destinatarios.map((d) => `${d.email} · ${d.fonte} · saldo ${d.saldo} · último custou ${d.custo} · ${d.filme ?? '(sem título)'}`),
        from: FROM_EMAIL,
        hint: 'Append &confirm=SEND (optionally &limit=N, máx 30) to send.',
      })
    }

    const batch = destinatarios.slice(0, lote)
    let enviados = 0, falhas = 0
    const resultados: Array<{ email: string; outcome: string }> = []
    for (const d of batch) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL, to: d.email, reply_to: REPLY_TO,
            subject: assunto(d.filme),
            text: corpoTexto(d.filme, d.saldo, d.custo, d.id),
            html: corpoHtml(d.filme, d.saldo, d.custo, d.id),
            headers: unsubscribeHeaders(d.id),
          }),
        })
        if (!res.ok) throw new Error(`resend ${res.status}`)
        // Carimbo SÓ no sucesso — é o que garante "1 por pessoa" de verdade.
        await admin.from('events').insert({
          user_id: d.id, name: SENT_EVENT,
          metadata: { fonte: d.fonte, saldo: d.saldo, custo_ultimo: d.custo, tinha_titulo: !!d.filme },
        })
        enviados++
        resultados.push({ email: d.email, outcome: 'sent' })
        await new Promise((r) => setTimeout(r, 600))
      } catch (e) {
        falhas++
        resultados.push({ email: d.email, outcome: `failed: ${e instanceof Error ? e.message : 'error'}` })
      }
    }
    return NextResponse.json({
      mode: 'SENT', enviados, falhas,
      restantes: destinatarios.length - batch.length,
      resultados,
    })
  } catch (e) {
    console.error('[send-next-episode-wall] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
