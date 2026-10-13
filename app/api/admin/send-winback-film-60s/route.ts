// ═══ KINEO-EMAILS-VENDA-2026-10-13 — AÇÃO 2: reativação com o PRÓPRIO filme ════════════════════════════════════════
//
// QUEM (montado ao vivo do banco, nunca lista chumbada): conta criada nos últimos `days` dias (padrão 30) que
//   · entregou pelo menos um FILME (videos.status='completed', clipe de efeito não conta);
//   · nunca pagou: has_paid === false, plano não-pago e nenhum `payment_success` na história;
//   · não optou por sair (email_opted_out), não é conta da casa (isInternalEmail + a régua
//     josephsskaf|josephskaf|josepghsskaf|@usekineo.com), nem descartável, nem da lista "nunca escrever";
//   · nunca recebeu ESTA carta (carimbo winback_film_60s_emailed OU reserva winback_film_60s_claimed, para sempre);
//   · não recebeu outro e-mail nosso nas últimas 24 h (loadLifecycleSuppression, FALHA FECHADA: se a supressão não puder
//     ler, o envio para — e o dry-run diz isso).
// Medido 13/10: 242 contas grátis de 30 dias com vídeo; 12 delas só com clipe de efeito ficam fora (não é "filme").
//
// O QUE A CARTA DIZ: ver lib/growth/winbackFilm60s.ts (título do filme DELA, link LOGADO para a biblioteca, oferta do
// Creator com os 20% do 1º mês vindos da fonte única, link de compra com intent_campaign=winback_film_60s). Nenhum
// crédito é dado — "CRÉDITO NÃO É ISCA" (winback-25: 2.375 créditos, zero cliques). A isca é o filme pronto.
//
// MODOS (GET, só sessão de admin — sem porta de cron; NÃO entra no vercel.json):
//   (sem params)              → DRY-RUN: tamanho da lista, amostra, contadores de cada filtro. Zero escrita, zero envio.
//   ?confirm=SEND&limit=N     → envia para os próximos N (padrão 30, teto 60). Reserva atômica antes, carimbo depois.
//   ?days=N                   → janela de cadastro (padrão 30, teto 60).
//
// ANTI-1000 (a armadilha do PostgREST que já mentiu MRR e dedupe na casa): TODA leitura passa por `readAll` (páginas de
// 1000 com chave única de desempate; erro de página LANÇA e derruba a corrida inteira, nunca devolve lista parcial), e os
// filtros por pessoa vão em fatias de 200 ids. Um dedupe incompleto aqui seria reenvio — por isso não existe leitura
// sem paginação nesta rota.
import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { registrarCorrida, corridaAbortada, type CorridaDeCampanha } from '@/lib/lifecycle/campaignRun'
import { dailyCap, recordResendResponse } from '@/lib/email/quota'
import {
  WINBACK_FILM_60S_BATCH_DEFAULT,
  WINBACK_FILM_60S_BATCH_MAX,
  WINBACK_FILM_60S_CAMPAIGN,
  WINBACK_FILM_60S_CLAIM,
  WINBACK_FILM_60S_DAYS_DEFAULT,
  WINBACK_FILM_60S_DAYS_MAX,
  WINBACK_FILM_60S_FROM,
  WINBACK_FILM_60S_REPLY_TO,
  WINBACK_FILM_60S_SENT,
  winbackBody,
  winbackCheckoutUrl,
  winbackClaimId,
  winbackFilmKind,
  winbackFilmTitle,
  winbackIsFilm,
  winbackOffer,
  winbackProfileOk,
  winbackSubject,
  winbackWatchUrl,
  type WinbackFilmKind,
} from '@/lib/growth/winbackFilm60s'
import { PAID_PLANS } from '../_shared/mrr'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Rota só-GET no Next 14.2 nasce com revalidate=false e leria o banco congelado (KINEO-DATA-CACHE-2026-09-02).
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const ROUTE = '/api/admin/send-winback-film-60s'
/** Fatia de ids por consulta `in.(...)` (a URL do PostgREST estoura com milhares de UUIDs). */
const CHUNK = 200

type Row = Record<string, unknown>
type Alvo = {
  id: string
  email: string
  film: string | null
  kind: WinbackFilmKind
  seconds: number | null
  filmAt: string
}

const sha256Hex = (input: string) => createHash('sha256').update(input).digest('hex')

function inteiro(raw: string | null, padrao: number, teto: number): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), teto) : padrao
}

export async function GET(req: NextRequest) {
  // DRY-RUN POR PADRÃO: só a string exata SEND arma o envio. Qualquer outra coisa (vazio, 'send', '1') é ensaio.
  const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const modo: CorridaDeCampanha['modo'] = confirm ? 'SENT' : 'DRY_RUN'
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = (user?.email ?? '').trim().toLowerCase()
    if (!user || !ADMIN_EMAILS.has(adminEmail)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !svc) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

    const days = inteiro(req.nextUrl.searchParams.get('days'), WINBACK_FILM_60S_DAYS_DEFAULT, WINBACK_FILM_60S_DAYS_MAX)
    const lote = inteiro(req.nextUrl.searchParams.get('limit'), WINBACK_FILM_60S_BATCH_DEFAULT, WINBACK_FILM_60S_BATCH_MAX)
    const desde = new Date(Date.now() - days * 86_400_000).toISOString()

    // ── 1. perfis da janela (paginado; `readAll` lança se uma página falhar) ─────────────────────────────────────────
    const { data: perfis } = await readAll(() => admin
      .from('profiles')
      .select('id, email, plan, has_paid, email_opted_out, created_at')
      .gte('created_at', desde)
      .order('created_at', { ascending: true }), { route: ROUTE, table: 'profiles' })
    const contadores = { janela: 0, perfil_recusado: 0, interno: 0, plano_pago: 0, alias_repetido: 0, sem_filme: 0, so_clipe: 0, pagou: 0, ja_recebeu: 0 }
    const vivos: Array<{ id: string; email: string }> = []
    const emailsVistos = new Set<string>()
    for (const p of perfis ?? []) {
      contadores.janela++
      const email = String(p.email ?? '').trim().toLowerCase()
      if (isInternalEmail(email)) { contadores.interno++; continue }
      if (PAID_PLANS.has(String(p.plan ?? '').trim().toLowerCase())) { contadores.plano_pago++; continue }
      if (!winbackProfileOk(p)) { contadores.perfil_recusado++; continue }
      // O mesmo endereço em duas contas recebe UMA carta (dedupe por e-mail, além do dedupe por perfil).
      if (emailsVistos.has(email)) { contadores.alias_repetido++; continue }
      emailsVistos.add(email)
      vivos.push({ id: String(p.id), email })
    }
    if (vivos.length === 0) {
      await registrarCorrida(admin, corridaAbortada(WINBACK_FILM_60S_CAMPAIGN, modo, 'coorte_vazia', { coorte_bruta: contadores.janela }))
      return NextResponse.json({ mode: modo, elegiveis: 0, contadores })
    }

    // ── 2. por fatia: o último FILME, pagamento na história, e carimbo/reserva desta carta (todos paginados) ─────────
    const ultimoFilme = new Map<string, Row>()
    const temSoClipe = new Set<string>()
    const pagou = new Set<string>()
    const jaRecebeu = new Set<string>()
    for (let i = 0; i < vivos.length; i += CHUNK) {
      const ids = vivos.slice(i, i + CHUNK).map((v) => v.id)
      const [vids, evts] = await Promise.all([
        readAll(() => admin
          .from('videos')
          .select('id, user_id, status, quality_mode, title, topic, duration, duration_seconds, created_at')
          .eq('status', 'completed')
          .in('user_id', ids)
          .order('created_at', { ascending: false }), { route: ROUTE, table: 'videos' }),
        readAll(() => admin
          .from('events')
          .select('id, user_id, name')
          .in('user_id', ids)
          .in('name', ['payment_success', WINBACK_FILM_60S_SENT, WINBACK_FILM_60S_CLAIM]), { route: ROUTE, table: 'events' }),
      ])
      for (const v of vids.data ?? []) {
        const uid = String(v.user_id)
        if (!winbackIsFilm(v)) { temSoClipe.add(uid); continue }
        if (!ultimoFilme.has(uid)) ultimoFilme.set(uid, v) // ordenado do mais novo para o mais antigo
      }
      for (const e of evts.data ?? []) {
        const uid = String(e.user_id)
        if (e.name === 'payment_success') pagou.add(uid)
        else jaRecebeu.add(uid)
      }
    }

    const candidatos: Alvo[] = []
    for (const v of vivos) {
      const filme = ultimoFilme.get(v.id)
      if (!filme) { if (temSoClipe.has(v.id)) contadores.so_clipe++; else contadores.sem_filme++; continue }
      if (pagou.has(v.id)) { contadores.pagou++; continue }
      if (jaRecebeu.has(v.id)) { contadores.ja_recebeu++; continue }
      const seconds = typeof filme.duration_seconds === 'number' ? filme.duration_seconds
        : typeof filme.duration === 'number' ? filme.duration : null
      candidatos.push({
        id: v.id,
        email: v.email,
        film: winbackFilmTitle(filme.title, filme.topic),
        kind: winbackFilmKind(filme.quality_mode, seconds),
        seconds,
        filmAt: String(filme.created_at ?? ''),
      })
    }

    // ── 3. supressão de 24 h (FALHA FECHADA) ─────────────────────────────────────────────────────────────────────────
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const supressaoDegradada = sup.degraded || sup.eventsDegraded === true
    const elegiveis = candidatos
      .filter((c) => !sup.isSuppressed(c.id))
      // o filme mais recente primeiro: é quem ainda lembra do que fez.
      .sort((a, b) => b.filmAt.localeCompare(a.filmAt))
    const batch = elegiveis.slice(0, lote)

    // Cota do dia (leitura pura — claimEmailSlot escreveria até no ensaio). Campanha é 'growth': cede a vaga em 60%.
    const inicioDoDia = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()
    const cota = await admin.from('email_send_log').select('id', { count: 'exact', head: true }).eq('ok', true).gte('sent_at', inicioDoDia)
    const tetoGrowth = Math.floor(dailyCap() * 0.6)
    const usadosHoje = cota.error || cota.count === null ? null : cota.count
    const vagas = usadosHoje === null ? 0 : Math.max(0, tetoGrowth - usadosHoje)

    const base = {
      campanha: WINBACK_FILM_60S_CAMPAIGN, modo, coorte_bruta: contadores.janela, candidatos: candidatos.length,
      suprimidos_24h: sup.suppressedCount, supressao_degradada: supressaoDegradada, elegiveis: elegiveis.length,
    }

    if (!confirm) {
      await registrarCorrida(admin, { ...base, no_lote: Math.min(batch.length, vagas), enviados: 0, falhas: 0, pulados: 0 })
      const exemplo = batch[0] ?? candidatos[0] ?? null
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: `cadastro <= ${days}d · >=1 filme completed (clipe nao conta) · has_paid=false · plano free · sem payment_success · opt-in · externo · nunca recebeu ${WINBACK_FILM_60S_SENT}`,
        elegiveis: elegiveis.length,
        candidatos_antes_da_supressao: candidatos.length,
        suprimidos_24h: sup.suppressedCount,
        supressao_degradada: supressaoDegradada,
        contadores,
        por_tipo: elegiveis.reduce<Record<string, number>>((acc, e) => { acc[e.kind] = (acc[e.kind] ?? 0) + 1; return acc }, {}),
        sem_titulo: elegiveis.filter((e) => !e.film).length,
        proximo_lote: Math.min(batch.length, vagas),
        cota_do_dia: { usados_hoje: usadosHoje, teto_growth: tetoGrowth, vagas },
        oferta: winbackOffer(),
        links: { assistir: winbackWatchUrl(), comprar: winbackCheckoutUrl() },
        assunto_exemplo: exemplo ? winbackSubject(exemplo.film, exemplo.kind) : null,
        amostra: batch.slice(0, 12).map((e) => `${e.email} · ${e.kind} · ${e.seconds ?? '?'}s · ${e.film ?? '(sem titulo)'}`),
        from: WINBACK_FILM_60S_FROM,
        hint: `Append ?confirm=SEND&limit=N (max ${WINBACK_FILM_60S_BATCH_MAX}) to send the next batch.`,
      })
    }

    // ── 4. ENVIO ─────────────────────────────────────────────────────────────────────────────────────────────────────
    if (supressaoDegradada) {
      await registrarCorrida(admin, corridaAbortada(WINBACK_FILM_60S_CAMPAIGN, modo, 'query', base))
      return NextResponse.json({ error: 'Suppression unavailable; no email sent' }, { status: 503 })
    }
    if (usadosHoje === null) {
      await registrarCorrida(admin, corridaAbortada(WINBACK_FILM_60S_CAMPAIGN, modo, 'query', base))
      return NextResponse.json({ error: 'Email quota unavailable; no email sent' }, { status: 503 })
    }
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })

    const daVez = batch.slice(0, vagas)
    let enviados = 0, falhas = 0, pulados = 0
    const resultados: Array<{ email: string; outcome: string }> = []
    for (const a of daVez) {
      // Reserva ANTES do envio, com id determinístico: um segundo clique (ou duas abas) bate na chave primária e pula.
      const reserva = await admin.from('events').insert({
        id: winbackClaimId(sha256Hex, a.id), user_id: a.id, name: WINBACK_FILM_60S_CLAIM, path: ROUTE,
        metadata: { campaign: WINBACK_FILM_60S_CAMPAIGN, admin: adminEmail },
      })
      if (reserva.error) { pulados++; resultados.push({ email: a.email, outcome: 'skipped_claim_exists' }); continue }
      try {
        const { text, html } = winbackBody(a.film, a.kind, { text: emailFooterText(a.id), html: emailFooterHtml(a.id) })
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: WINBACK_FILM_60S_FROM, to: [a.email], reply_to: WINBACK_FILM_60S_REPLY_TO,
            subject: winbackSubject(a.film, a.kind), text, html, headers: unsubscribeHeaders(a.id),
          }),
        })
        await recordResendResponse({ kind: WINBACK_FILM_60S_CAMPAIGN, priority: 'growth', userId: a.id, res, admin })
        if (!res.ok) { falhas++; resultados.push({ email: a.email, outcome: `resend ${res.status} (reserva mantida, sem reenvio)` }); continue }
        // Carimbo SÓ no envio aceito. Sem PII na metadata.
        await admin.from('events').insert({
          user_id: a.id, name: WINBACK_FILM_60S_SENT, path: ROUTE,
          metadata: { campaign: WINBACK_FILM_60S_CAMPAIGN, kind: a.kind, had_title: !!a.film, film_seconds: a.seconds, offer_first_month: winbackOffer().firstMonth },
        })
        enviados++
        resultados.push({ email: a.email, outcome: 'sent' })
        await new Promise((r) => setTimeout(r, 600))
      } catch (e) {
        falhas++
        resultados.push({ email: a.email, outcome: `error ${e instanceof Error ? e.message : 'unknown'}` })
      }
    }
    await registrarCorrida(admin, { ...base, no_lote: daVez.length, enviados, falhas, pulados })
    return NextResponse.json({
      mode: 'SENT', enviados, falhas, pulados,
      restantes: Math.max(0, elegiveis.length - enviados - pulados),
      cota_restante_hoje: Math.max(0, vagas - daVez.length),
      // o lote pedido foi maior que a vaga do dia: o resto fica para amanhã (nunca passa da cota de 'growth').
      cortado_pela_cota: batch.length > daVez.length,
      resultados,
    })
  } catch (e) {
    console.error('[send-winback-film-60s] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error; inspect events before retrying' }, { status: 500 })
  }
}
