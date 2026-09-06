// ═══ KINEO-CARTA-DA-TEMPORADA-2026-09-06 (sprint-assinaturas #19) ══════════
//
// A COORTE QUE NENHUMA CAMPANHA DA CASA MIRA — e é a maior de todas.
//
// Medido em 7 dias (contas externas, 06/09): 234 cadastros → 151 fizeram o
// filme 1 → **114 pararam em EXATAMENTE UM** → 2 pagaram. Das 114:
//   ·  9 (8%) bateram na parede de crédito → é quem a `next_episode_wall` mira
//   · 70 AINDA TÊM SALDO para outro filme agora
//   · **64 nunca esbarraram em nada** (`upgrade_modal_opened` = 0) — 33 do
//     chatgpt, 25 com o filme feito nas últimas 48h
//
// Elas não foram barradas. Foram embora **satisfeitas**, ~30 min depois do
// filme ficar pronto. Toda a máquina de porta-de-saldo construída até aqui
// resolve 8% do problema; estas 64 não são público de campanha nenhuma.
//
// POR QUE UMA CARTA DE SALDO NÃO SERVE PARA ELAS: elas TÊM saldo. Dizer
// "seus créditos acabaram" seria falso, e a casa proibiu frase falsa no #5 de
// 02/09. Elas não precisam de crédito nem de porta de pagamento — precisam de
// MOTIVO. Vieram buscar um vídeo, receberam um vídeo, e o negócio fechou.
//
// O QUE ESTA CARTA FAZ DE DIFERENTE DE TODAS AS OUTRAS DA CASA: ela não pede
// nada. Ela ENTREGA — os títulos dos episódios 2 a 6 da série que a pessoa
// começou, escritos pela casa (#18). O assunto é o nome do episódio 2. O corpo
// é a temporada. Deixa de ser "volte e faça outro" (pedido) e passa a ser
// "a sua temporada existe e o episódio 2 está aqui" (entrega).
//
// A MONETIZAÇÃO, e ela não toca em preço: o rodapé conta quantos episódios da
// temporada o saldo de HOJE paga — número vindo de `creditCostForDuration`,
// a fonte única — e diz que o plano é o que cobre o resto. "O resto da sua
// temporada" em vez de "60 créditos". Nenhum valor, plano, cupom ou promessa
// nasce neste arquivo; a página de preços é que fala de preço.
//
// SEGURANÇA (idêntica à das irmãs, nada afrouxado): opt-out, domínio
// descartável, bloqueados do ciclo, 1 e-mail por pessoa para sempre (carimbo
// vitalício em `events` + colunas de carimbo em `profiles`), supressão de 24h
// FAIL-CLOSED, cabeçalho de descadastro, teto de 30 por chamada, e
// `?confirm=SEND` obrigatório.
//
// ⚠️ O DRY-RUN CUSTA ZERO, POR CONSTRUÇÃO. Nenhuma das 64 tem temporada
// escrita (o filme delas é anterior ao deploy de hoje), então o dry-run
// consulta a memória com `escrever: false` e relata quantas TERIAM de ser
// escritas. A escrita só acontece no `confirm=SEND`, e só para o lote.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { pickMomentumTopic } from '@/lib/momentumTopic'
import { composerUrl } from '@/lib/lifecycle/composerUrl'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { getEffectiveEntitlement, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'
import { TOTAL_EPISODIOS, type TemporadaEscrita } from '@/lib/temporada'
import { garantirTemporada } from '@/lib/temporadaServer'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Ver KINEO-DATA-CACHE-2026-09-02: rota só-GET no Next 14.2 nasce com
// revalidate=false e leria o banco congelado.
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const SITE = 'https://www.usekineo.com'
const CAMPANHA = 'season_letter'
const SENT_EVENT = 'season_letter_emailed_v1'

/** Gatilho automático. Mesmo contrato dos crons da casa. FAIL-CLOSED: sem a
 *  env, ninguém entra — rota que dispara e-mail nunca fica pública porque uma
 *  variável se perdeu. */
function autorizadoPorCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

/** Carimbos de e-mail de TODAS as campanhas que vivem em `events`. Ninguém
 *  entra em duas. ⚠️ O aviso da #13 vale nos dois sentidos: quem criar
 *  campanha nova tem de acrescentar o carimbo dela AQUI, e o
 *  `season_letter_emailed_v1` foi acrescentado nas irmãs no mesmo commit. */
const OTHER_CAMPAIGNS = [
  'made_video_today_emailed_v1',
  'checkout_rescue_emailed_v1',
  'india_price_emailed_v1',
  'comeback50_emailed_v1',
  'hot_upsell_sent',
  'next_episode_wall_emailed_v1',
  'checkout_recovery_emailed_v1',
]

/** Colunas de carimbo em `profiles`, conferidas contra information_schema em
 *  06/09 — coluna inventada aqui derruba a query e o lote inteiro. */
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

/** `videos.topic` frequentemente NÃO é um título — é a ordem que a pessoa
 *  colou do ChatGPT. `pickMomentumTopic` é a régua da casa para isso e é
 *  reusada aqui de propósito: uma segunda régua divergiria da do produto
 *  (memória `predicado-do-cobrador-nao-se-redigita`). null é resposta válida. */
function tituloDoFilme(title: string | null | undefined, topic: string | null | undefined): string | null {
  return pickMomentumTopic(title) ?? pickMomentumTopic(topic)
}
function escaparHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function planoUrl(): string {
  return `${SITE}/pricing?utm_source=lifecycle&utm_medium=email&utm_campaign=${CAMPANHA}`
}
function episodioUrl(seed: string): string {
  return composerUrl({ base: SITE, campaign: CAMPANHA, prompt: seed })
}

// ── A CARTA ───────────────────────────────────────────────────────────────
// Regra de honestidade desta copy: ela só afirma o que a casa pode cumprir.
// Diz que os TÍTULOS estão escritos (estão — e o clique leva o tema para o
// compositor). NÃO diz que os cinco filmes estão prontos, NÃO promete
// roteiro completo por e-mail, e NÃO cita preço.

function assunto(t: TemporadaEscrita): string {
  return `Episode 2: "${t.episodes[0].title}"`
}

function corpoTexto(t: TemporadaEscrita, saldo: number, custo: number, cabem: number, userId: string): string {
  const nome = t.fromTitle ? `"${t.fromTitle}"` : 'the short you made with Kineo'
  const resto = t.episodes.slice(1)
  // A frase do saldo é DERIVADA, nunca digitada: `cabem` sai do custo real do
  // motor que a pessoa usou dividido pelo saldo dela.
  const linhaSaldo =
    cabem >= TOTAL_EPISODIOS
      ? `You have ${saldo} credits — enough for the whole season at ${custo} credits an episode.`
      : cabem > 0
        ? `You have ${saldo} credits: enough for ${cabem} more ${cabem === 1 ? 'episode' : 'episodes'} at ${custo} credits each. A plan is what covers the rest of the season.`
        : `Each episode costs ${custo} credits at the engine you used. A plan is what covers the season.`
  return `You made ${nome}. What you may not know is that you started a series.

I wrote the rest of it. Episode 2 is called "${t.episodes[0].title}".

Your season:
${t.episodes.map((e) => `  Ep${e.n} — ${e.title}`).join('\n')}

Start episode 2 (it opens the studio with the topic already in the box):
${episodioUrl(t.episodes[0].seed)}

${resto.length ? `And when you want ${resto.length === 1 ? 'the last one' : `the other ${resto.length}`}, they are waiting under the same series.` : ''}

${linhaSaldo}
${planoUrl()}

These titles came from your own episode 1 — not from a template. If none of
them is the direction you wanted, reply and tell me where the series should
actually go. I read these.

— Joseph
${emailFooterText(userId)}`
}

function corpoHtml(t: TemporadaEscrita, saldo: number, custo: number, cabem: number, userId: string): string {
  const nome = t.fromTitle ? `&ldquo;${escaparHtml(t.fromTitle)}&rdquo;` : 'the short you made with Kineo'
  const linhaSaldo =
    cabem >= TOTAL_EPISODIOS
      ? `You have <strong>${saldo} credits</strong> — enough for the whole season at ${custo} credits an episode.`
      : cabem > 0
        ? `You have <strong>${saldo} credits</strong>: enough for <strong>${cabem} more ${cabem === 1 ? 'episode' : 'episodes'}</strong> at ${custo} credits each. <a href="${planoUrl()}" style="color:#2997ff">A plan</a> is what covers the rest of the season.`
        : `Each episode costs ${custo} credits at the engine you used. <a href="${planoUrl()}" style="color:#2997ff">A plan</a> is what covers the season.`
  const linhas = t.episodes
    .map(
      (e, i) => `<tr>
  <td style="padding:9px 12px 9px 0;color:#8a8a8a;font-size:13px;white-space:nowrap;vertical-align:top">Ep${e.n}</td>
  <td style="padding:9px 0;font-size:15px;vertical-align:top">${i === 0 ? '<strong>' : ''}${escaparHtml(e.title)}${i === 0 ? '</strong>' : ''}</td>
</tr>`,
    )
    .join('')
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>You made <strong>${nome}</strong>. What you may not know is that you started a series.</p>
<p>I wrote the rest of it. Episode&nbsp;2 is called <strong>&ldquo;${escaparHtml(t.episodes[0].title)}&rdquo;</strong>.</p>
<table style="border-collapse:collapse;margin:18px 0;width:100%">${linhas}</table>
<p style="margin:26px 0">
  <a href="${episodioUrl(t.episodes[0].seed)}" style="background:#2997ff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">Start episode 2 &rarr;</a>
</p>
<p style="font-size:14px;color:#555">${linhaSaldo}</p>
<p style="font-size:14px;color:#555">These titles came from your own episode&nbsp;1 — not from a template. If none of them is the direction you wanted, reply and tell me where the series should actually go. I read these.</p>
<p>&mdash; Joseph</p>
${emailFooterHtml(userId)}</div>`
}

type Destinatario = {
  id: string
  email: string
  fonte: string
  saldo: number
  custo: number
  filme: string | null
  videoId: string
  /** o filme cru, para o escritor da temporada */
  filmeRaw: { id: string; title: unknown; topic: unknown; quality_mode: unknown; duration_seconds: unknown }
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

    // ── 1. filmes entregues nos últimos 14 dias ────────────────────────────
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: vids, error: vidsErr } = await admin
      .from('videos')
      .select('id, user_id, credits_used, created_at, title, topic, quality_mode, duration_seconds')
      .eq('status', 'completed')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000)
    if (vidsErr) return NextResponse.json({ error: 'videos query failed' }, { status: 503 })

    // A coorte é "fez EXATAMENTE UM filme". A contagem é por pessoa dentro da
    // janela, e quem tem 2+ sai — inclusive quem fez o segundo ontem.
    const contagem = new Map<string, number>()
    const ultimoDe = new Map<string, Destinatario['filmeRaw'] & { custo: number }>()
    for (const raw of (vids ?? []) as unknown as Record<string, unknown>[]) {
      const uid = raw.user_id as string
      if (!uid) continue
      contagem.set(uid, (contagem.get(uid) ?? 0) + 1)
      if (ultimoDe.has(uid)) continue // já ordenado por created_at desc
      const vid = raw.id
      if (typeof vid !== 'string' || !vid) continue
      const bruto = raw.credits_used
      ultimoDe.set(uid, {
        id: vid,
        title: raw.title,
        topic: raw.topic,
        quality_mode: raw.quality_mode,
        duration_seconds: raw.duration_seconds,
        custo: typeof bruto === 'number' && bruto > 0 ? Math.floor(bruto) : 0,
      })
    }
    const ids = [...ultimoDe.keys()].filter((u) => contagem.get(u) === 1)
    if (ids.length === 0) return NextResponse.json({ mode: 'DRY_RUN', elegiveis: 0 })

    // ── 2. perfis + carimbos + a PAREDE (que aqui é critério de EXCLUSÃO) ──
    const colunas = [
      'id', 'email', 'email_opted_out', 'has_paid', 'plan', 'video_credits',
      'utm_source', 'signup_utm_source', TRIAL_ENTITLEMENT_COLUMNS,
      ...STAMP_COLUMNS, ...STAMP_DATES,
    ].join(', ')
    const [profRes, evtRes] = await Promise.all([
      admin.from('profiles').select(colunas).in('id', ids),
      admin.from('events').select('user_id, name')
        .in('user_id', ids)
        .in('name', [SENT_EVENT, ...OTHER_CAMPAIGNS, 'checkout_started', 'checkout_attempted', 'upgrade_modal_opened']),
    ])
    if (profRes.error || evtRes.error) {
      return NextResponse.json({ error: 'profile/event query failed' }, { status: 503 })
    }

    const jaEmailado = new Set<string>()
    const tocouCheckout = new Set<string>()
    const bateuNaParede = new Set<string>()
    for (const e of (evtRes.data ?? []) as unknown as Record<string, unknown>[]) {
      const uid = e.user_id as string
      const n = e.name as string
      if (n === 'checkout_started' || n === 'checkout_attempted') tocouCheckout.add(uid)
      else if (n === 'upgrade_modal_opened') bateuNaParede.add(uid)
      else jaEmailado.add(uid)
    }

    const PAGOS = new Set(['starter', 'basic', 'pro', 'creator', 'studio', 'autopilot'])
    const candidatos: Destinatario[] = []
    for (const raw of (profRes.data ?? []) as unknown as Record<string, unknown>[]) {
      const id = raw.id as string
      const email = (raw.email as string | null) ?? ''
      const filme = ultimoDe.get(id)
      if (!filme) continue
      if (!email || raw.email_opted_out === true) continue
      if (raw.has_paid === true) continue
      if (PAGOS.has(((raw.plan as string) ?? '').toLowerCase())) continue
      if (isJunk(email) || isBloqueado(email)) continue

      // ── O QUE DEFINE ESTA COORTE, e é o inverso da `next_episode_wall`:
      // saldo que AINDA PAGA outro episódio, e nenhuma batida na parede.
      const saldo = typeof raw.video_credits === 'number' ? Math.max(0, Math.floor(raw.video_credits)) : -1
      if (saldo < 0) continue
      const ent = getEffectiveEntitlement(raw)
      const q = typeof filme.quality_mode === 'string' ? (filme.quality_mode as Quality) : null
      const seg = typeof filme.duration_seconds === 'number' && filme.duration_seconds > 0 ? filme.duration_seconds : 60
      let custo: number | null = null
      try {
        custo = q ? creditCostForDuration(q, ent.treatAsPaid, seg) : null
      } catch {
        custo = null
      }
      // Sem custo confiável não dá para dizer nada honesto sobre o saldo.
      if (custo === null || custo <= 0) continue
      if (saldo < custo) continue // essa é a coorte da `next_episode_wall`
      if (bateuNaParede.has(id)) continue // e essa também

      if (jaEmailado.has(id)) continue
      if (STAMP_COLUMNS.some((c) => raw[c] === true)) continue
      if (STAMP_DATES.some((c) => raw[c] != null)) continue
      if (tocouCheckout.has(id)) continue

      candidatos.push({
        id, email, saldo, custo,
        filme: tituloDoFilme(filme.title as string | null, filme.topic as string | null),
        videoId: filme.id,
        filmeRaw: filme,
        fonte: ((raw.utm_source as string) || (raw.signup_utm_source as string) || 'sem fonte'),
      })
    }

    // ── 3. supressão de 24h (falha FECHADA: suprime o lote se não puder ler)
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const destinatarios = candidatos
      .filter((c) => !sup.isSuppressed(c.id))
      // chatgpt primeiro: é a fonte que retém 1 em 3 no segundo filme e a
      // única que já produziu pagante nesta base.
      .sort((a, b) => Number(b.fonte === 'chatgpt') - Number(a.fonte === 'chatgpt') || b.saldo - a.saldo)

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limiteParam = Number(req.nextUrl.searchParams.get('limit'))
    const lote = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, 30) : 30

    if (!confirm) {
      // O dry-run custa ZERO: `escrever: false` NUNCA chama o modelo. O que
      // ele relata é quantas já têm temporada gravada — hoje perto de zero por
      // construção, porque a memória só existe para filmes posteriores ao
      // deploy de 06/09 14:30 UTC. É adoção, não fracasso.
      const amostra = destinatarios.slice(0, lote)
      let comTemporada = 0
      for (const d of amostra) {
        const t = await garantirTemporada(admin, d.id, d.filmeRaw, { escrever: false })
        if (t) comTemporada++
      }
      return NextResponse.json({
        mode: 'DRY_RUN',
        coorte: 'entregou EXATAMENTE 1 filme · saldo AINDA paga outro · nunca bateu na parede · fora do checkout · não pagante · sem campanha anterior',
        elegiveis: destinatarios.length,
        suprimidos_24h: sup.suppressedCount,
        supressao_degradada: sup.degraded,
        por_fonte: destinatarios.reduce<Record<string, number>>((acc, d) => {
          acc[d.fonte] = (acc[d.fonte] ?? 0) + 1; return acc
        }, {}),
        sem_titulo: destinatarios.filter((d) => !d.filme).length,
        no_lote: amostra.length,
        ja_com_temporada_escrita: comTemporada,
        temporadas_a_escrever_no_envio: amostra.length - comTemporada,
        custo_estimado_do_envio_usd: Number(((amostra.length - comTemporada) * 0.0003).toFixed(4)),
        lista: amostra.map((d) => `${d.email} · ${d.fonte} · saldo ${d.saldo} · episódio custa ${d.custo} · cabem ${Math.floor(d.saldo / d.custo)} · ${d.filme ?? '(sem título)'}`),
        from: FROM_EMAIL,
        hint: 'Append &confirm=SEND (optionally &limit=N, máx 30) to send. A temporada é escrita no envio, uma vez por pessoa.',
      })
    }

    const batch = destinatarios.slice(0, lote)
    let enviados = 0, falhas = 0, semTemporada = 0
    const resultados: Array<{ email: string; outcome: string }> = []
    for (const d of batch) {
      try {
        // A temporada é escrita AQUI, uma vez, e fica gravada: se a pessoa
        // clicar e voltar, o app encontra a MESMA temporada (lição do #14).
        const t = await garantirTemporada(admin, d.id, d.filmeRaw)
        if (!t) {
          // Sem temporada não há carta. Mandar "sua temporada existe" sem a
          // temporada seria a mentira que esta peça foi feita para remover —
          // e a pessoa NÃO é carimbada, então ela continua elegível amanhã.
          semTemporada++
          resultados.push({ email: d.email, outcome: 'skipped: sem temporada' })
          continue
        }
        const cabem = Math.min(TOTAL_EPISODIOS, Math.floor(d.saldo / d.custo))
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL, to: d.email, reply_to: REPLY_TO,
            subject: assunto(t),
            text: corpoTexto(t, d.saldo, d.custo, cabem, d.id),
            html: corpoHtml(t, d.saldo, d.custo, cabem, d.id),
            headers: unsubscribeHeaders(d.id),
          }),
        })
        if (!res.ok) throw new Error(`resend ${res.status}`)
        // Carimbo SÓ no sucesso — é o que garante "1 por pessoa" de verdade.
        await admin.from('events').insert({
          user_id: d.id, name: SENT_EVENT,
          metadata: {
            fonte: d.fonte, saldo: d.saldo, custo_episodio: d.custo, cabem,
            ep2: t.episodes[0].title, video_id: d.videoId,
          },
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
      mode: 'SENT', enviados, falhas, sem_temporada: semTemporada,
      restantes: destinatarios.length - batch.length,
      resultados,
    })
  } catch (e) {
    console.error('[send-season-letter] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
