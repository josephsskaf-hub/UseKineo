// ═══ KINEO-VOLTA-1211 — a carta de VOLTA para a base inteira (ver lib/growth/volta1211.ts) ════════════════════════════════
//
// MODOS (GET, só sessão de admin; sem porta de cron, NÃO entra no vercel.json):
//   (sem params)            → DRY-RUN: segmentos, quem fica fora e por quê, amostra das cartas, vaga do dia. Zero escrita no
//                             Resend; só o registro da corrida (campaign_run_v1), como toda campanha da casa.
//   ?confirm=SEND&limit=N   → envia os próximos N (padrão 20, teto 50) — SÓ com VOLTA_1211_SEND_LIVE = true. Hoje é false:
//                             a rota responde 423 e não chega perto do Resend.
//   ?segment=c_baixou|…     → limita a corrida a um segmento (ondas por segmento).
// ORDEM TRAVADA: o envio só alcança VOLTA_1211_SEGMENTOS_LIBERADOS (hoje só c_baixou); a, d e b entram por commit da CEO.
// DEDUPE: (1) supressão da casa com janela de 7 dias (168 h, FALHA FECHADA) — ninguém recebe 2 e-mails nossos em 7 dias;
//         (2) esta carta uma vez na vida (carimbo OU reserva); (3) um endereço = uma carta (duas contas com o mesmo e-mail).
// Leituras paginadas (readAll) e filtros por pessoa em fatias de 200 ids (a armadilha das 1.000 linhas do PostgREST).
import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { registrarCorrida, corridaAbortada, type CorridaDeCampanha } from '@/lib/lifecycle/campaignRun'
import { capForPriority, dailyCap, recordResendResponse } from '@/lib/email/quota'
import { winbackIsFilm, winbackProfileOk } from '@/lib/growth/winbackFilm60s'
import { ideiaDaPagina } from '@/lib/growth/studioPreenchido1211'
import {
  VOLTA_1211_BATCH_DEFAULT, VOLTA_1211_BATCH_MAX, VOLTA_1211_CAMPAIGN, VOLTA_1211_CLAIM, VOLTA_1211_DOWNLOAD_EVENTS,
  VOLTA_1211_FROM, VOLTA_1211_IDLE_DAYS, VOLTA_1211_ORDEM, VOLTA_1211_REGION_EVENTS, VOLTA_1211_REPLY_TO, VOLTA_1211_SEND_LIVE,
  VOLTA_1211_SENT, VOLTA_1211_SUPPRESSION_HOURS, VOLTA_1211_SEGMENTOS_LIBERADOS, voltaCarta, voltaClaimId, voltaLingua, voltaLink, voltaSegmento, voltaSegmentoLiberado, voltaTitulo,
  type VoltaLingua, type VoltaSegmento,
} from '@/lib/growth/volta1211'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com', 'josephskaf@hotmail.com'])
const ROUTE = '/api/admin/send-volta-1211'
const CHUNK = 200
const APP = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.usekineo.com').replace(/\/+$/, '')

type Alvo = { id: string; email: string; seg: VoltaSegmento; lingua: VoltaLingua; videoId: string | null; film: string | null; recencia: string }
const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex')

function inteiro(raw: string | null, padrao: number, teto: number): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), teto) : padrao
}

export async function GET(req: NextRequest) {
  // DRY-RUN POR PADRÃO: só a string exata SEND arma o envio — e mesmo ela para no interruptor.
  const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const modo: CorridaDeCampanha['modo'] = confirm ? 'SENT' : 'DRY_RUN'
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = (user?.email ?? '').trim().toLowerCase()
    if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (confirm && !VOLTA_1211_SEND_LIVE) {
      return NextResponse.json({ error: 'Envio trancado: VOLTA_1211_SEND_LIVE = false (lib/growth/volta1211.ts). Nada foi enviado.' }, { status: 423 })
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !svc) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

    const lote = inteiro(req.nextUrl.searchParams.get('limit'), VOLTA_1211_BATCH_DEFAULT, VOLTA_1211_BATCH_MAX)
    const soSeg = (VOLTA_1211_ORDEM as readonly string[]).includes(req.nextUrl.searchParams.get('segment') ?? '')
      ? (req.nextUrl.searchParams.get('segment') as VoltaSegmento) : null
    const agora = Date.now()
    const desde7d = new Date(agora - VOLTA_1211_IDLE_DAYS * 86_400_000).toISOString()

    // ── 1. perfis (todos; paginado) ─────────────────────────────────────────────────────────────────────────────────────
    const { data: perfis } = await readAll(() => admin
      .from('profiles')
      .select('id, email, plan, has_paid, email_opted_out, signup_country, last_country, created_at')
      .order('created_at', { ascending: true }), { route: ROUTE, table: 'profiles' })
    const fora: Record<string, number> = { perfil_recusado: 0, interno: 0, alias_repetido: 0, pagou: 0, ativo_7d: 0, ja_recebeu: 0, outro_segmento: 0, nao_liberado: 0 }
    const vivos: Array<{ id: string; email: string; country: unknown; createdAt: string }> = []
    const vistos = new Set<string>()
    for (const p of perfis ?? []) {
      const email = String(p.email ?? '').trim().toLowerCase()
      if (isInternalEmail(email)) { fora.interno++; continue }
      if (!winbackProfileOk(p)) { fora.perfil_recusado++; continue } // e-mail inválido, opt-out, has_paid≠false, plano pago, descartável
      if (vistos.has(email)) { fora.alias_repetido++; continue }
      vistos.add(email)
      vivos.push({ id: String(p.id), email, country: p.signup_country ?? p.last_country, createdAt: String(p.created_at ?? '') })
    }

    // ── 2. por fatia: último filme, filme/atividade nos últimos 7 dias, baixou, porta de país, pagou, já recebeu ─────────────
    const ultimoFilme = new Map<string, { id: string; title: unknown; topic: unknown; at: string }>()
    const filmes = new Map<string, number>()
    const ativo = new Set<string>(), baixou = new Set<string>(), regiao = new Set<string>(), pagou = new Set<string>(), recebeu = new Set<string>()
    for (let i = 0; i < vivos.length; i += CHUNK) {
      const ids = vivos.slice(i, i + CHUNK).map((v) => v.id)
      const [vids, marcas, recentes] = await Promise.all([
        readAll(() => admin.from('videos').select('id, user_id, status, quality_mode, title, topic, created_at')
          .eq('status', 'completed').in('user_id', ids).order('created_at', { ascending: false }), { route: ROUTE, table: 'videos' }),
        readAll(() => admin.from('events').select('id, user_id, name').in('user_id', ids)
          .in('name', ['payment_success', VOLTA_1211_SENT, VOLTA_1211_CLAIM, ...VOLTA_1211_DOWNLOAD_EVENTS, ...VOLTA_1211_REGION_EVENTS])
          .order('id', { ascending: true }), { route: ROUTE, table: 'events' }),
        readAll(() => admin.from('events').select('id, user_id').in('user_id', ids).gte('created_at', desde7d)
          .order('id', { ascending: true }), { route: ROUTE, table: 'events' }),
      ])
      for (const v of vids.data ?? []) {
        if (!winbackIsFilm(v)) continue
        const uid = String(v.user_id)
        filmes.set(uid, (filmes.get(uid) ?? 0) + 1)
        if (!ultimoFilme.has(uid)) ultimoFilme.set(uid, { id: String(v.id), title: v.title, topic: v.topic, at: String(v.created_at ?? '') })
        if (String(v.created_at ?? '') >= desde7d) ativo.add(uid)
      }
      for (const e of marcas.data ?? []) {
        const uid = String(e.user_id), n = String(e.name)
        if (n === 'payment_success') pagou.add(uid)
        else if (n === VOLTA_1211_SENT || n === VOLTA_1211_CLAIM) recebeu.add(uid)
        else if ((VOLTA_1211_DOWNLOAD_EVENTS as readonly string[]).includes(n)) baixou.add(uid)
        else regiao.add(uid)
      }
      for (const e of recentes.data ?? []) ativo.add(String(e.user_id))
    }

    const candidatos: Alvo[] = []
    const porSegmento: Record<VoltaSegmento, number> = { c_baixou: 0, a_filme_parado: 0, d_pais_pago: 0, b_sem_filme: 0 }
    for (const v of vivos) {
      if (pagou.has(v.id)) { fora.pagou++; continue }
      if (recebeu.has(v.id)) { fora.ja_recebeu++; continue }
      const r = voltaSegmento({
        paid: false, optedOut: false, internal: false, films: filmes.get(v.id) ?? 0, downloaded: baixou.has(v.id), regionPaidOnly: regiao.has(v.id),
        lastActiveMs: ativo.has(v.id) ? agora : 0, nowMs: agora,
      })
      if ('fora' in r) { fora[r.fora] = (fora[r.fora] ?? 0) + 1; continue }
      if (soSeg && r.seg !== soSeg) { fora.outro_segmento++; continue }
      // Ordem travada: o ENVIO só alcança os segmentos liberados (dia 1 = só c). O ensaio mostra todos.
      if (confirm && !voltaSegmentoLiberado(r.seg)) { fora.nao_liberado++; continue }
      const f = ultimoFilme.get(v.id)
      candidatos.push({ id: v.id, email: v.email, seg: r.seg, lingua: voltaLingua(v.country), videoId: f?.id ?? null, film: f ? voltaTitulo(f.title, f.topic) : null, recencia: f?.at ?? v.createdAt })
    }

    // ── 3. supressão de 7 dias (FALHA FECHADA) e ordem da onda: segmento mais quente primeiro, o mais recente primeiro ──────
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id), VOLTA_1211_SUPPRESSION_HOURS)
    const degradada = sup.degraded || sup.eventsDegraded === true
    const elegiveis = candidatos.filter((c) => !sup.isSuppressed(c.id))
      .sort((a, b) => VOLTA_1211_ORDEM.indexOf(a.seg) - VOLTA_1211_ORDEM.indexOf(b.seg) || b.recencia.localeCompare(a.recencia))
    for (const c of elegiveis) porSegmento[c.seg]++
    const batch = elegiveis.slice(0, lote)

    // A ideia da página de entrada só para quem está no lote e não tem filme (pouso = landing_session_started do mesmo session_id).
    const ideia = new Map<string, string>()
    const semFilme = batch.filter((b) => !b.videoId).map((b) => b.id)
    if (semFilme.length) {
      const { data: sess } = await readAll(() => admin.from('events').select('id, user_id, session_id').in('user_id', semFilme)
        .not('session_id', 'is', null).order('id', { ascending: true }), { route: ROUTE, table: 'events' })
      const sessoes = new Map<string, string>()
      for (const s of sess ?? []) sessoes.set(String(s.session_id), String(s.user_id))
      const ids = Array.from(sessoes.keys())
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { data: pousos } = await readAll(() => admin.from('events').select('id, session_id, path').eq('name', 'landing_session_started')
          .in('session_id', ids.slice(i, i + CHUNK)).order('id', { ascending: true }), { route: ROUTE, table: 'events' })
        for (const p of pousos ?? []) {
          const uid = sessoes.get(String(p.session_id))
          const achou = uid && !ideia.has(uid) ? ideiaDaPagina(p.path) : null
          if (uid && achou) ideia.set(uid, achou.idea)
        }
      }
    }

    // Cota do dia (leitura pura). Campanha 'growth' cede a vaga em 60% do teto diário (lib/email/quota).
    const inicioDoDia = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()
    const cota = await admin.from('email_send_log').select('id', { count: 'exact', head: true }).eq('ok', true).gte('sent_at', inicioDoDia)
    const tetoGrowth = capForPriority('growth')
    const usadosHoje = cota.error || cota.count === null ? null : cota.count
    const vagas = usadosHoje === null ? 0 : Math.max(0, tetoGrowth - usadosHoje)

    const montar = (a: Alvo) => {
      const idea = a.videoId ? null : ideia.get(a.id) ?? null
      const link = voltaLink(APP, { videoId: a.videoId, idea })
      return { link, ...voltaCarta({ seg: a.seg, lingua: a.lingua, film: a.film, idea, link, footer: { text: emailFooterText(a.id), html: emailFooterHtml(a.id) } }) }
    }
    const base = { campanha: VOLTA_1211_CAMPAIGN, modo, coorte_bruta: (perfis ?? []).length, candidatos: candidatos.length, suprimidos_24h: sup.suppressedCount, supressao_degradada: degradada, elegiveis: elegiveis.length }

    if (!confirm) {
      await registrarCorrida(admin, { ...base, no_lote: Math.min(batch.length, vagas), enviados: 0, falhas: 0, pulados: 0 })
      const exemplos = VOLTA_1211_ORDEM.map((s) => batch.find((e) => e.seg === s) ?? elegiveis.find((e) => e.seg === s)).filter((x): x is Alvo => !!x)
      return NextResponse.json({
        mode: 'DRY_RUN', send_live: VOLTA_1211_SEND_LIVE, segmentos_liberados: VOLTA_1211_SEGMENTOS_LIBERADOS, segmento: soSeg ?? 'todos',
        elegiveis: elegiveis.length, por_segmento: porSegmento,
        por_lingua: elegiveis.reduce<Record<string, number>>((acc, e) => { acc[e.lingua] = (acc[e.lingua] ?? 0) + 1; return acc }, {}),
        suprimidos_7d: sup.suppressedCount, supressao_degradada: degradada, fora,
        proximo_lote: Math.min(batch.length, vagas), cota_do_dia: { teto: dailyCap(), usados_hoje: usadosHoje, teto_growth: tetoGrowth, vagas },
        ideia_preenchida_no_lote: `${ideia.size} de ${semFilme.length} sem filme`,
        amostra: exemplos.map((e) => { const m = montar(e); return { seg: e.seg, lingua: e.lingua, user: e.id.slice(0, 8), subject: m.subject, link: m.link, text: m.text.split('\n\n').slice(0, 3).join(' / ') } }),
        from: VOLTA_1211_FROM,
      })
    }

    // ── 4. ENVIO (só chega aqui com VOLTA_1211_SEND_LIVE = true) ───────────────────────────────────────────────────────────
    if (degradada || usadosHoje === null) {
      await registrarCorrida(admin, corridaAbortada(VOLTA_1211_CAMPAIGN, modo, 'query', base))
      return NextResponse.json({ error: 'Suppression or quota unavailable; no email sent' }, { status: 503 })
    }
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })
    const daVez = batch.slice(0, vagas)
    let enviados = 0, falhas = 0, pulados = 0
    for (const a of daVez) {
      const reserva = await admin.from('events').insert({ id: voltaClaimId(sha256Hex, a.id), user_id: a.id, name: VOLTA_1211_CLAIM, path: ROUTE, metadata: { campaign: VOLTA_1211_CAMPAIGN, seg: a.seg } })
      if (reserva.error) { pulados++; continue }
      try {
        const m = montar(a)
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: VOLTA_1211_FROM, to: [a.email], reply_to: VOLTA_1211_REPLY_TO, subject: m.subject, text: m.text, html: m.html, headers: unsubscribeHeaders(a.id), tags: [{ name: 'campaign', value: VOLTA_1211_CAMPAIGN }] }),
        })
        await recordResendResponse({ kind: VOLTA_1211_CAMPAIGN, priority: 'growth', userId: a.id, res, admin })
        if (!res.ok) { falhas++; continue }
        // KINEO-VOLTA-STATUS-1311 — o id que o Resend devolve ({ id }) vai no carimbo: /api/admin/volta-1211-status consulta o estado
        // (entregue, devolvido, spam) por ele. Os 50 primeiros (13/11 16:40) nasceram sem id e são achados pela lista do Resend.
        const corpo = (await res.json().catch(() => null)) as { id?: unknown } | null
        const resendId = typeof corpo?.id === 'string' && corpo.id ? corpo.id : null
        await admin.from('events').insert({ user_id: a.id, name: VOLTA_1211_SENT, path: ROUTE, metadata: { campaign: VOLTA_1211_CAMPAIGN, seg: a.seg, lingua: a.lingua, had_film: !!a.videoId, resend_id: resendId } })
        enviados++
        await new Promise((r) => setTimeout(r, 600))
      } catch { falhas++ }
    }
    await registrarCorrida(admin, { ...base, no_lote: daVez.length, enviados, falhas, pulados })
    return NextResponse.json({ mode: 'SENT', enviados, falhas, pulados, restantes: Math.max(0, elegiveis.length - enviados - pulados), cortado_pela_cota: batch.length > daVez.length })
  } catch (e) {
    console.error('[send-volta-1211] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error; inspect events before retrying' }, { status: 500 })
  }
}
