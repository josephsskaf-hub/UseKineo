// KINEO-BLACK-FRIDAY-2026 — a carta da Black Friday (27/11) e da Cyber Monday (30/11) para a base.
//
// DRY-RUN POR PADRÃO: sem ?confirm=SEND devolve o retrato (quantos, por que cada um ficou fora, assunto, amostra) e não
// envia nada, em qualquer data. Com ?confirm=SEND:
//   · fora da janela (24/11 00:00 → 01/12 23:59 America/New_York) → 409, nada enviado — nem com ?wave=;
//   · dentro dela, SEM ?wave= (o cron do vercel.json) → só envia nos dias 27/11 ('bf') e 30/11 ('cyber') de Nova York;
//     nos outros dias responde 200 sem envio. Cada onda tem 30 execuções no próprio dia de NY, de 30 em 30 min
//     (BF2026_CRONS: 09:00 → 23:30 ET, atravessando dois dias UTC de cota), cada uma com até 150 cartas e um orçamento de
//     240 s (BF2026_SEND_BUDGET_MS: para de abrir envios antes do limite de 300 s da rota). A base inteira é coberta pelas
//     execuções seguintes, não por um único lote; o teto real é a cota diária (dry-run mostra `wave_reach_ceiling`);
//   · dentro dela, COM ?wave=bf|cyber (o link do fundador) → repõe um lote em qualquer dia da janela.
//
// QUEM RECEBE (bf2026EmailSkipReason, lib/billing/blackFriday2026.ts): e-mail válido · não saiu da lista
// (email_opted_out) · não é conta da casa (isInternalEmail + padrão interno) · não está na lista de nunca-escrever nem é
// descartável ("bloqueados") · não tem plano pago hoje (inclui todo anual: o checkout recusa uma 2ª assinatura, então a
// carta seria um beco; ex-assinante com plano free ENTRA) · na Cyber Monday, não comprou um anual desde 24/11 · nunca
// recebeu ESTA onda (reserva determinística por pessoa+onda: a 2ª corrida bate em 23505). Depois, a trava de 24 h da casa
// (loadLifecycleSuppression) e a cota diária de e-mail (lib/email/quota, prioridade growth). Teto por execução:
// BF2026_EMAIL_BATCH_MAX.
//
// PÚBLICO (KINEO-BF-ONDAS-PUBLICO-2411, decisão do dono de 16/11, regra pura em lib/billing/bf2026Audience.ts): além de tudo acima,
// a conta só recebe se (a) baixou filme nos últimos 60 dias OU (b) tem filme com nota do revisor ≥ 8 nos últimos 60 dias
// (fora = `fora_do_publico`), e se a CAIXA não recebeu e-mail nosso de marketing/ciclo de vida nas últimas 168 h (fora = `email_7d`;
// o "seu vídeo está pronto" não conta; as próprias ondas contam, então quem levou a 'bf' em 27/11 não leva a 'cyber' em 30/11).
// (c) "donos de canal presenteados" não tem marca no banco e não entra. Qualquer leitura nova que falhe = 500 e nada é enviado.
import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { loadLifecycleSuppression, PROFILE_TIMESTAMP_COLUMNS } from '@/lib/lifecycle/suppression'
import {
  BF2026_AUDIENCE_WINDOW_MS,
  BF2026_AUDIENCE_MIN_NOTE,
  BF2026_DOWNLOAD_EVENT,
  BF2026_RECENT_EMAIL_EVENT_NAMES,
  BF2026_RECENT_EMAIL_WINDOW_MS,
  bf2026AudienceSkipReason,
  bf2026FilmDownloaders,
  bf2026HighNoteOwners,
  bf2026LastMarketingEmail,
  bf2026RecentEmailProfileColumns,
  type Bf2026AudienceSkip,
} from '@/lib/billing/bf2026Audience'
import { registrarCorrida, corridaAbortada, type CorridaDeCampanha } from '@/lib/lifecycle/campaignRun'
import { dailyCap, recordResendResponse } from '@/lib/email/quota'
import { WINBACK_NEVER } from '@/lib/growth/winbackFilm60s'
import {
  BF2026_CAMPAIGN,
  BF2026_EMAIL_BATCH_DEFAULT,
  BF2026_EMAIL_BATCH_MAX,
  BF2026_EMAIL_CLAIM,
  BF2026_BASE_LETTER_SENT_EVENT,
  BF2026_BASE_LETTER_SUPPRESSION_HOURS,
  BF2026_EMAIL_FROM,
  BF2026_EMAIL_REPLY_TO,
  BF2026_EMAIL_SENT,
  BF2026_ENDS_AT,
  BF2026_STARTS_AT,
  bf2026ClaimSeed,
  bf2026BaseLetterSuppression,
  bf2026ProfileMatchesBaseLetterSuppression,
  bf2026EmailBody,
  bf2026EmailSkipReason,
  bf2026EmailUrl,
  bf2026NyDate,
  bf2026OutOfTime,
  bf2026PriceRows,
  bf2026SendDecision,
  bf2026Subject,
  bf2026UuidFromHex,
  bf2026WaveForDate,
  bf2026WaveReachCeiling,
  parseBf2026Wave,
  type Bf2026SkipReason,
  type Bf2026Wave,
} from '@/lib/billing/blackFriday2026'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@hotmail.com'])
const ROUTE = '/api/admin/send-black-friday-2026'
const CHUNK = 200
// Carimbo literal = BF2026_EMAIL_SENT (o compilador confere): a cobertura da supressão lê o nome literal na rota.
const STAMP_LITERAL: typeof BF2026_EMAIL_SENT = 'bf2026_emailed'
void STAMP_LITERAL

/** O Vercel chama com `Authorization: Bearer ${CRON_SECRET}`. Sem a env, ninguém entra por aqui (fail-closed). */
function autorizadoPorCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

function inteiro(raw: string | null, padrao: number, teto: number): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), teto) : padrao
}

const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex')
/** Links de nota por chamada (URLs longas na query string do PostgREST). 15, não 40: com 40 a fatia real passava de 6 mil caracteres
 *  codificados (revisor 24/11) e, se o gateway recusar a URL, a onda inteira falha fechada e manda zero. */
const LINK_CHUNK = 15
const fatias = <T,>(xs: readonly T[], n: number): T[][] => { const out: T[][] = []; for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n)); return out }

export async function GET(req: NextRequest) {
  const nowMs = Date.now()
  const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const modo: CorridaDeCampanha['modo'] = confirm ? 'SENT' : 'DRY_RUN'
  const requestedWave = req.nextUrl.searchParams.get('wave')
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = (user?.email ?? '').trim().toLowerCase()
    const porCron = autorizadoPorCron(req)
    if ((!user || !ADMIN_EMAILS.has(adminEmail)) && !porCron) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // A trava da data vem ANTES de qualquer leitura: fora da janela, ?confirm=SEND não envia nada.
    const decision = bf2026SendDecision({ nowMs, requestedWave })
    if (confirm && !decision.ok) {
      if (decision.reason === 'not_a_send_day') {
        return NextResponse.json({ mode: 'NOOP', nothing_sent: true, reason: decision.reason, ny_date: bf2026NyDate(nowMs) })
      }
      return NextResponse.json({ error: decision.reason, nothing_sent: true, window: { starts: BF2026_STARTS_AT, ends: BF2026_ENDS_AT }, ny_date: bf2026NyDate(nowMs) }, { status: 409 })
    }
    // Dry-run: mostra a onda pedida, a do dia ou (fora de época) a da Black Friday, só para o retrato.
    const wave: Bf2026Wave = decision.ok ? decision.wave : (parseBf2026Wave(requestedWave) ?? bf2026WaveForDate(nowMs) ?? 'bf')

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !svc) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
    const lote = inteiro(req.nextUrl.searchParams.get('limit'), BF2026_EMAIL_BATCH_DEFAULT, BF2026_EMAIL_BATCH_MAX)

    // 1) a base inteira (lida em páginas; regra anti-1000)
    const { data: perfis, error: perfisErr } = await readAll(() => admin
      .from('profiles')
      .select('id, email, plan, email_opted_out')
      .order('id', { ascending: true }), { route: ROUTE, table: 'profiles' })
    if (perfisErr) throw perfisErr

    // 2) quem comprou um anual desde o início da janela e quem já recebeu ESTA onda
    const [{ data: compras, error: comprasErr }, { data: reservas, error: reservasErr }, { data: cartasBase, error: cartasBaseErr }] = await Promise.all([
      readAll(() => admin.from('events').select('user_id, metadata').eq('name', 'payment_success').gte('created_at', BF2026_STARTS_AT).not('user_id', 'is', null).order('created_at', { ascending: true }), { route: ROUTE, table: 'events' }),
      readAll(() => admin.from('events').select('user_id, metadata').eq('name', BF2026_EMAIL_CLAIM).not('user_id', 'is', null).order('created_at', { ascending: true }), { route: ROUTE, table: 'events' }),
      readAll(() => admin.from('events').select('user_id, created_at').eq('name', BF2026_BASE_LETTER_SENT_EVENT).gte('created_at', new Date(nowMs - BF2026_BASE_LETTER_SUPPRESSION_HOURS * 60 * 60 * 1000).toISOString()).not('user_id', 'is', null).order('created_at', { ascending: true }), { route: ROUTE, table: 'events' }),
    ])
    if (comprasErr) throw comprasErr
    if (reservasErr) throw reservasErr
    if (cartasBaseErr) throw cartasBaseErr
    const compradorAnual = new Set<string>()
    for (const r of compras ?? []) {
      const m = (r.metadata ?? {}) as Record<string, unknown>
      if (m.billing === 'annual' || m.promo_campaign === BF2026_CAMPAIGN) compradorAnual.add(String(r.user_id))
    }
    const jaRecebeu = new Set<string>()
    for (const r of reservas ?? []) {
      const m = (r.metadata ?? {}) as Record<string, unknown>
      if (m.wave === wave) jaRecebeu.add(String(r.user_id))
    }
    const supressaoCartaBase = bf2026BaseLetterSuppression(perfis ?? [], cartasBase ?? [], nowMs)

    // 3) KINEO-BF-ONDAS-PUBLICO-2411 — o público: (a) download de filme e (b) nota ≥ 8, nos últimos 60 dias. Leituras paginadas;
    //    erro em qualquer uma LANÇA (readAll) e cai no catch: 500, nada enviado.
    const desde60d = new Date(nowMs - BF2026_AUDIENCE_WINDOW_MS).toISOString()
    const [{ data: downloads, error: downloadsErr }, { data: notas, error: notasErr }] = await Promise.all([
      readAll(() => admin.from('events').select('id, user_id, name, created_at, metadata').eq('name', BF2026_DOWNLOAD_EVENT).gte('created_at', desde60d).not('user_id', 'is', null).order('created_at', { ascending: true }), { route: ROUTE, table: 'events' }),
      readAll(() => admin.from('film_review_notes_com_motor').select('link, nota, quando').gte('nota', BF2026_AUDIENCE_MIN_NOTE).gte('quando', desde60d), { route: ROUTE, table: 'film_review_notes_com_motor', key: 'link' }),
    ])
    if (downloadsErr) throw downloadsErr
    if (notasErr) throw notasErr
    const linksDeNota = Array.from(new Set((notas ?? []).map((n) => n.link).filter((l): l is string => typeof l === 'string' && l.length > 0)))
    const filmesDeNota: Array<{ user_id: unknown; video_url: unknown; final_video_url: unknown }> = []
    for (const parte of fatias(linksDeNota, LINK_CHUNK)) {
      const [porVideo, porFinal] = await Promise.all([
        readAll(() => admin.from('videos').select('id, user_id, video_url, final_video_url').in('video_url', parte), { route: ROUTE, table: 'videos' }),
        readAll(() => admin.from('videos').select('id, user_id, video_url, final_video_url').in('final_video_url', parte), { route: ROUTE, table: 'videos' }),
      ])
      if (porVideo.error) throw porVideo.error
      if (porFinal.error) throw porFinal.error
      filmesDeNota.push(...(porVideo.data ?? []), ...(porFinal.data ?? []))
    }
    const baixouFilme = bf2026FilmDownloaders(downloads ?? [], nowMs)
    const notaAlta = bf2026HighNoteOwners(notas ?? [], filmesDeNota, nowMs)

    const fora: Record<Bf2026SkipReason | Bf2026AudienceSkip | 'duplicate_email' | 'recent_bf_base_2311', number> = { bad_email: 0, opted_out: 0, internal: 0, blocked: 0, paying_plan: 0, annual_buyer: 0, already_got_wave: 0, duplicate_email: 0, recent_bf_base_2311: 0, fora_do_publico: 0, email_7d: 0 }
    const emails = new Set<string>()
    const noPublico: Array<{ id: string; email: string }> = []
    for (const p of perfis ?? []) {
      const id = String(p.id)
      const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : ''
      if (supressaoCartaBase.userIds.has(id)) { fora.recent_bf_base_2311++; continue }
      const motivo = bf2026EmailSkipReason(p, { isInternal: isInternalEmail, neverEmail: WINBACK_NEVER, annualBuyer: wave === 'cyber' && compradorAnual.has(id), alreadyGotWave: jaRecebeu.has(id) })
      if (motivo) { fora[motivo]++; continue }
      if (bf2026ProfileMatchesBaseLetterSuppression({ id, email: p.email }, supressaoCartaBase)) { fora.recent_bf_base_2311++; continue }
      // O público vem ANTES do dedupe: a vaga da caixa vai para a conta que está no público, não para a 1ª pelo id.
      const forado = bf2026AudienceSkipReason({ downloadedFilm: baixouFilme.has(id), highNoteFilm: notaAlta.has(id), lastMarketingEmailMs: null, nowMs })
      if (forado) { fora[forado]++; continue }
      if (emails.has(email)) { fora.duplicate_email++; continue }
      emails.add(email)
      noPublico.push({ id, email })
    }

    // 4) 7 dias sem e-mail nosso de marketing/ciclo de vida, por CAIXA: lê todas as contas com o mesmo endereço, em fatias de 200.
    const idsPorCaixa = new Map<string, string[]>()
    for (const p of perfis ?? []) {
      const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : ''
      if (!email) continue
      idsPorCaixa.set(email, [...(idsPorCaixa.get(email) ?? []), String(p.id)])
    }
    const idsParaLer = Array.from(new Set(noPublico.flatMap((c) => idsPorCaixa.get(c.email) ?? [c.id])))
    const desde7d = new Date(nowMs - BF2026_RECENT_EMAIL_WINDOW_MS).toISOString()
    const colunas = bf2026RecentEmailProfileColumns(PROFILE_TIMESTAMP_COLUMNS)
    const linhas7d = { ledger: [] as Array<Record<string, unknown> & { user_id: unknown; sent_at: unknown }>, trial: [] as Array<{ user_id: unknown; sent_at: unknown }>, events: [] as Array<{ user_id: unknown; name: unknown; created_at: unknown }>, abandoned: [] as Array<{ user_id: unknown; recovery_sent_at: unknown }>, profiles: [] as Array<Record<string, unknown>>, profileColumns: colunas }
    for (const ids of fatias(idsParaLer, CHUNK)) {
      const [ledger, trial, carimbos, abandono, datas] = await Promise.all([
        readAll(() => admin.from('email_send_log').select('id, user_id, sent_at, kind, ok, yielded').in('user_id', ids).gte('sent_at', desde7d).eq('ok', true).not('yielded', 'is', true), { route: ROUTE, table: 'email_send_log' }),
        readAll(() => admin.from('trial_emails_log').select('user_id, email_kind, sent_at').in('user_id', ids).gte('sent_at', desde7d), { route: ROUTE, table: 'trial_emails_log', key: ['user_id', 'email_kind'] }),
        readAll(() => admin.from('events').select('id, user_id, name, created_at').in('user_id', ids).in('name', BF2026_RECENT_EMAIL_EVENT_NAMES as string[]).gte('created_at', desde7d), { route: ROUTE, table: 'events' }),
        readAll(() => admin.from('checkout_abandoned').select('id, user_id, recovery_sent_at').in('user_id', ids).gte('recovery_sent_at', desde7d), { route: ROUTE, table: 'checkout_abandoned' }),
        readAll(() => admin.from('profiles').select(['id', ...colunas].join(', ')).in('id', ids), { route: ROUTE, table: 'profiles' }),
      ])
      if (ledger.error || trial.error || carimbos.error || abandono.error || datas.error) {
        throw new Error('read failed (email_send_log/trial_emails_log/events/checkout_abandoned/profiles); no email sent')
      }
      linhas7d.ledger.push(...(ledger.data ?? []))
      linhas7d.trial.push(...(trial.data ?? []))
      linhas7d.events.push(...(carimbos.data ?? []))
      linhas7d.abandoned.push(...(abandono.data ?? []))
      linhas7d.profiles.push(...((datas.data ?? []) as unknown as Array<Record<string, unknown>>))
    }
    const ultimoEmail = bf2026LastMarketingEmail(linhas7d, nowMs)
    const publico = { por_download: 0, por_nota_8: 0, pelos_dois: 0, por_presente_de_canal: 0 }
    const candidatos: Array<{ id: string; email: string }> = []
    for (const c of noPublico) {
      const ultimoDaCaixa = Math.max(0, ...(idsPorCaixa.get(c.email) ?? [c.id]).map((i) => ultimoEmail.get(i) ?? 0))
      const motivo = bf2026AudienceSkipReason({ downloadedFilm: baixouFilme.has(c.id), highNoteFilm: notaAlta.has(c.id), lastMarketingEmailMs: ultimoDaCaixa, nowMs })
      if (motivo) { fora[motivo]++; continue }
      if (baixouFilme.has(c.id)) publico.por_download++
      if (notaAlta.has(c.id)) publico.por_nota_8++
      if (baixouFilme.has(c.id) && notaAlta.has(c.id)) publico.pelos_dois++
      candidatos.push(c)
    }

    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const supressaoDegradada = sup.degraded || sup.eventsDegraded === true
    const elegiveis = candidatos.filter((c) => !sup.isSuppressed(c.id))

    const inicioDoDia = new Date(new Date(nowMs).setUTCHours(0, 0, 0, 0)).toISOString()
    const cota = await admin.from('email_send_log').select('id', { count: 'exact', head: true }).eq('ok', true).gte('sent_at', inicioDoDia)
    const tetoGrowth = Math.floor(dailyCap() * 0.6)
    const usadosHoje = cota.error || cota.count === null ? null : cota.count
    const vagas = usadosHoje === null ? 0 : Math.max(0, tetoGrowth - usadosHoje)
    const daVez = elegiveis.slice(0, Math.min(lote, vagas))

    const rows = bf2026PriceRows()
    const base = {
      campanha: BF2026_CAMPAIGN, modo, coorte_bruta: (perfis ?? []).length, candidatos: candidatos.length,
      suprimidos_24h: sup.suppressedCount, supressao_degradada: supressaoDegradada, elegiveis: elegiveis.length,
    }

    if (!confirm) {
      await registrarCorrida(admin, { ...base, no_lote: daVez.length, enviados: 0, falhas: 0, pulados: 0 })
      return NextResponse.json({
        mode: 'DRY_RUN',
        wave,
        send_decision_now: decision.ok ? `would send wave ${decision.wave}` : decision.reason,
        window: { starts: BF2026_STARTS_AT, ends: BF2026_ENDS_AT, ny_date_now: bf2026NyDate(nowMs) },
        base: (perfis ?? []).length,
        excluded: fora,
        // KINEO-BF-ONDAS-PUBLICO-2411 — quem entrou e por quê (uma conta pode entrar pelos dois; (c) não tem marca no banco).
        audience: { ...publico, presente_de_canal: 'not_built: no readable marker for gifted channel owners', window_days: BF2026_AUDIENCE_WINDOW_MS / 86_400_000, min_note: BF2026_AUDIENCE_MIN_NOTE, recent_email_hours: BF2026_RECENT_EMAIL_WINDOW_MS / 3_600_000 },
        candidates_before_24h_suppression: candidatos.length,
        suppressed_24h: sup.suppressedCount,
        suppression_degraded: supressaoDegradada,
        eligible: elegiveis.length,
        next_batch: daVez.length,
        quota_today: { used: usadosHoje, growth_cap: tetoGrowth, free_slots: vagas, batch_cap: lote },
        // O teto da ONDA inteira (todas as execuções do cron dessa onda), não só deste lote — ver bf2026WaveReachCeiling.
        wave_reach_ceiling: bf2026WaveReachCeiling({ eligible: elegiveis.length, wave, batch: BF2026_EMAIL_BATCH_DEFAULT, growthCapPerDay: tetoGrowth }),
        subject: bf2026Subject(wave),
        link: bf2026EmailUrl(wave),
        prices: rows.map((r) => `${r.name}: ${r.bfMinor} (regular ${r.annualMinor}) minor USD`),
        sample: daVez.slice(0, 12).map((a) => a.email),
        hint: `Inside the window, append ?confirm=SEND&wave=${wave}&limit=N (max ${BF2026_EMAIL_BATCH_MAX}) to send the next batch.`,
      })
    }

    if (supressaoDegradada) {
      await registrarCorrida(admin, corridaAbortada(BF2026_CAMPAIGN, modo, 'query', base))
      return NextResponse.json({ error: 'Suppression unavailable; no email sent' }, { status: 503 })
    }
    if (usadosHoje === null) {
      await registrarCorrida(admin, corridaAbortada(BF2026_CAMPAIGN, modo, 'query', base))
      return NextResponse.json({ error: 'Email quota unavailable; no email sent' }, { status: 503 })
    }
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })

    let enviados = 0, falhas = 0, pulados = 0, paradosPorTempo = 0
    const resultados: Array<{ email: string; outcome: string }> = []
    for (const a of daVez) {
      // Orçamento da execução: perto do limite de 300 s, para de ABRIR envios (nenhuma reserva fica sem envio por isso).
      // Quem sobrou fica para a próxima execução do cron da mesma onda (30 min depois).
      if (bf2026OutOfTime(nowMs, Date.now())) { paradosPorTempo = daVez.length - enviados - falhas - pulados; break }
      // A reserva vem ANTES do envio: duas corridas simultâneas (cron + link) nunca mandam a mesma onda duas vezes.
      const reserva = await admin.from('events').insert({
        id: bf2026UuidFromHex(sha256Hex(bf2026ClaimSeed(a.id, wave))), user_id: a.id, name: BF2026_EMAIL_CLAIM, path: ROUTE,
        metadata: { campaign: BF2026_CAMPAIGN, wave, by: porCron ? 'cron' : adminEmail },
      })
      if (reserva.error) { pulados++; resultados.push({ email: a.email, outcome: 'skipped_claim_exists' }); continue }
      try {
        const { text, html } = bf2026EmailBody(wave, rows, { text: emailFooterText(a.id), html: emailFooterHtml(a.id) })
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: BF2026_EMAIL_FROM, to: [a.email], reply_to: BF2026_EMAIL_REPLY_TO,
            subject: bf2026Subject(wave), text, html, headers: unsubscribeHeaders(a.id),
          }),
        })
        await recordResendResponse({ kind: BF2026_CAMPAIGN, priority: 'growth', userId: a.id, res, admin })
        if (!res.ok) { falhas++; resultados.push({ email: a.email, outcome: `resend ${res.status} (reserva mantida, sem reenvio)` }); continue }
        await admin.from('events').insert({ user_id: a.id, name: BF2026_EMAIL_SENT, path: ROUTE, metadata: { campaign: BF2026_CAMPAIGN, wave } })
        enviados++
        resultados.push({ email: a.email, outcome: 'sent' })
        await new Promise((r) => setTimeout(r, 400))
      } catch (e) {
        falhas++
        resultados.push({ email: a.email, outcome: `error ${e instanceof Error ? e.message : String(e)}` })
      }
    }
    await registrarCorrida(admin, { ...base, no_lote: daVez.length, enviados, falhas, pulados })
    return NextResponse.json({ mode: 'SENT', wave, sent: enviados, failed: falhas, skipped: pulados, stopped_for_time: paradosPorTempo, remaining_after: Math.max(0, elegiveis.length - (daVez.length - paradosPorTempo)), results: resultados })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
