// ═══ KINEO-EMAILS-REGIAO-2026-10-13 — o 1º filme por e-mail para as contas 'region_paid_only' que nunca fizeram filme ════
//
// QUEM (montado ao vivo do banco, nunca lista chumbada): conta trial_status='region_paid_only' (nunca 'blocked') que
//   · nunca fez filme: nenhuma linha em `videos` com status ≠ 'failed' que não seja clipe de efeito (o clipe grátis de 5 s
//     não é filme; mas ele conta na admissão do filme grátis — quem só fez o clipe recebe a carta do passe);
//   · nunca pagou: has_paid === false, plano grátis, nenhum `payment_success` na história;
//   · não optou por sair, não é conta da casa (isInternalEmail + a régua josephsskaf|josephskaf|josepghsskaf|@usekineo.com),
//     nem descartável, nem da lista "nunca escrever" (winbackProfileOk, a régua da carta irmã de hoje);
//   · passou da janela do cron do 1º filme (cadastro há mais de 6 h — antes disso, quem cuida é o send-activation-nudge);
//   · nunca recebeu ESTA carta (carimbo region_first_film_emailed OU reserva region_first_film_claimed, para sempre);
//   · não recebeu outro e-mail nosso nas últimas 24 h (loadLifecycleSuppression, FALHA FECHADA no envio).
// A carta 'free_film' ainda pula quem já recebeu a carta do 1º filme do cron (activation_nudge_sent): mesma mensagem.
//
// AS DUAS CARTAS (lib/lifecycle/regionFirstFilmEmail.ts — a régua é o SALDO, como no servidor que admite o filme):
//   · 'pass'      → "Your first Kineo film for <preço>": o passe ?pack=starter (1 filme Seedance 1.5 de 60 s, pagamento
//                   único), preço de regionPassPrice() na moeda que a Stripe vai cobrar (país do perfil), botão
//                   /api/region-pass?surface=first_film&go=1 (intent_campaign=region_paid_first_film) e um filme real da
//                   vitrine pública (/showcase);
//   · 'free_film' → "Your free film is waiting": as 3 ideias do 1º filme a 1 clique no Studio, Seedance 1.5, 15 s.
// Nenhum crédito é dado ("CRÉDITO NÃO É ISCA").
//
// MODOS (GET, só sessão de admin — sem porta de cron; NÃO entra no vercel.json):
//   (sem params)              → DRY-RUN: tamanho das listas, amostra, contadores de cada filtro. Zero envio.
//   ?confirm=SEND&limit=N     → envia para os próximos N (padrão 30, teto 60). Reserva atômica antes, carimbo depois.
//   ?variant=pass|free_film   → só uma das cartas (padrão: as duas).
//
// ANTI-1000: toda leitura de lista passa por `readAll` (páginas de 1000 com desempate; erro de página LANÇA), e os filtros
// por pessoa vão em fatias de 200 ids. Um dedupe incompleto aqui seria reenvio.
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
import { winbackProfileOk } from '@/lib/growth/winbackFilm60s'
import { nichoDoCadastro, type FonteDasIdeias } from '@/lib/lifecycle/primeiroFilmeIdeias'
import { REGION_PAID_ONLY_TRIAL_STATUS } from '@/lib/freeFilmPolicy'
import {
  REGION_FIRST_FILM_CRON_WINDOW_HOURS,
  REGION_FIRST_FILM_EMAIL_BATCH_DEFAULT,
  REGION_FIRST_FILM_EMAIL_BATCH_MAX,
  REGION_FIRST_FILM_EMAIL_CAMPAIGN,
  REGION_FIRST_FILM_EMAIL_CLAIM,
  REGION_FIRST_FILM_EMAIL_FROM,
  REGION_FIRST_FILM_EMAIL_REPLY_TO,
  REGION_FIRST_FILM_EMAIL_SENT,
  assuntoDaCarta,
  cartaDoFilmeGratis,
  cartaDoPasse,
  exemploDaVitrine,
  ideiasDaCarta,
  linguaDoPais,
  linkDoCompositor,
  linkDoPasse,
  paisDoPerfil,
  precoDaCarta,
  reservaDaCarta,
  varianteDaCarta,
  type RegionEmailLang,
  type RegionFirstFilmVariant,
} from '@/lib/lifecycle/regionFirstFilmEmail'
import { PAID_PLANS } from '../_shared/mrr'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Rota só-GET no Next 14.2 nasce com revalidate=false e leria o banco congelado (KINEO-DATA-CACHE-2026-09-02).
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])
const ROUTE = '/api/admin/send-region-first-film'
/** Fatia de ids por consulta `in.(...)` (a URL do PostgREST estoura com milhares de UUIDs). */
const CHUNK = 200
/** O evento da carta do 1º filme do cron (send-activation-nudge). */
const CRON_FIRST_FILM_SENT = 'activation_nudge_sent'

type Alvo = {
  id: string
  email: string
  variant: RegionFirstFilmVariant
  lang: RegionEmailLang
  country: string | null
  niche: string | null
  createdAt: string
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

    const lote = inteiro(req.nextUrl.searchParams.get('limit'), REGION_FIRST_FILM_EMAIL_BATCH_DEFAULT, REGION_FIRST_FILM_EMAIL_BATCH_MAX)
    const pedida = req.nextUrl.searchParams.get('variant')
    const soVariante: RegionFirstFilmVariant | null = pedida === 'pass' || pedida === 'free_film' ? pedida : null
    const fimDaJanelaDoCron = new Date(Date.now() - REGION_FIRST_FILM_CRON_WINDOW_HOURS * 3_600_000).toISOString()

    // ── 1. perfis da região (paginado; `readAll` lança se uma página falhar) ─────────────────────────────────────────
    const { data: perfis } = await readAll(() => admin
      .from('profiles')
      .select('id, email, plan, has_paid, email_opted_out, created_at, trial_status, video_credits, signup_country, last_country, signup_utm_campaign')
      .eq('trial_status', REGION_PAID_ONLY_TRIAL_STATUS)
      .order('created_at', { ascending: true }), { route: ROUTE, table: 'profiles' })
    const contadores = {
      regiao: 0, nao_regiao: 0, interno: 0, plano_pago: 0, perfil_recusado: 0, alias_repetido: 0, na_janela_do_cron: 0,
      ja_fez_filme: 0, pagou: 0, ja_recebeu: 0, ja_recebeu_carta_do_cron: 0, fora_das_cartas: 0, outra_variante: 0,
    }
    type Vivo = { id: string; email: string; row: Record<string, unknown> }
    const vivos: Vivo[] = []
    const emailsVistos = new Set<string>()
    for (const p of perfis ?? []) {
      contadores.regiao++
      // Defesa em profundidade: a consulta já filtra, mas 'blocked' (ou qualquer outro status) NUNCA passa daqui.
      if (p.trial_status !== REGION_PAID_ONLY_TRIAL_STATUS) { contadores.nao_regiao++; continue }
      const email = String(p.email ?? '').trim().toLowerCase()
      if (isInternalEmail(email)) { contadores.interno++; continue }
      if (PAID_PLANS.has(String(p.plan ?? '').trim().toLowerCase())) { contadores.plano_pago++; continue }
      if (!winbackProfileOk(p)) { contadores.perfil_recusado++; continue }
      // O mesmo endereço em duas contas recebe UMA carta (dedupe por e-mail, além do dedupe por perfil).
      if (emailsVistos.has(email)) { contadores.alias_repetido++; continue }
      emailsVistos.add(email)
      if (String(p.created_at ?? '') > fimDaJanelaDoCron) { contadores.na_janela_do_cron++; continue }
      vivos.push({ id: String(p.id), email, row: p as Record<string, unknown> })
    }
    if (vivos.length === 0) {
      await registrarCorrida(admin, corridaAbortada(REGION_FIRST_FILM_EMAIL_CAMPAIGN, modo, 'coorte_vazia', { coorte_bruta: contadores.regiao }))
      return NextResponse.json({ mode: modo, elegiveis: 0, contadores })
    }

    // ── 2. por fatia: filmes (não falhos), pagamento, esta carta e a carta do cron (todos paginados) ─────────────────
    const fezFilme = new Set<string>()
    const videosNaoFalhos = new Map<string, number>()
    const pagou = new Set<string>()
    const jaRecebeu = new Set<string>()
    const cartaDoCron = new Set<string>()
    for (let i = 0; i < vivos.length; i += CHUNK) {
      const ids = vivos.slice(i, i + CHUNK).map((v) => v.id)
      const [vids, evts] = await Promise.all([
        readAll(() => admin
          .from('videos')
          .select('id, user_id, status, quality_mode')
          .in('user_id', ids)
          .neq('status', 'failed'), { route: ROUTE, table: 'videos' }),
        readAll(() => admin
          .from('events')
          .select('id, user_id, name')
          .in('user_id', ids)
          .in('name', ['payment_success', REGION_FIRST_FILM_EMAIL_SENT, REGION_FIRST_FILM_EMAIL_CLAIM, CRON_FIRST_FILM_SENT]), { route: ROUTE, table: 'events' }),
      ])
      for (const v of vids.data ?? []) {
        const uid = String(v.user_id)
        videosNaoFalhos.set(uid, (videosNaoFalhos.get(uid) ?? 0) + 1)
        // clipe de efeito (quality_mode 'clip') não é filme: quem só fez o clipe de 5 s segue na coorte.
        if (v.quality_mode !== 'clip') fezFilme.add(uid)
      }
      for (const e of evts.data ?? []) {
        const uid = String(e.user_id)
        if (e.name === 'payment_success') pagou.add(uid)
        else if (e.name === CRON_FIRST_FILM_SENT) cartaDoCron.add(uid)
        else jaRecebeu.add(uid)
      }
    }

    const candidatos: Alvo[] = []
    for (const v of vivos) {
      if (fezFilme.has(v.id)) { contadores.ja_fez_filme++; continue }
      if (pagou.has(v.id)) { contadores.pagou++; continue }
      if (jaRecebeu.has(v.id)) { contadores.ja_recebeu++; continue }
      const variant = varianteDaCarta(v.row as never, videosNaoFalhos.get(v.id) ?? 0)
      if (!variant) { contadores.fora_das_cartas++; continue }
      if (variant === 'free_film' && cartaDoCron.has(v.id)) { contadores.ja_recebeu_carta_do_cron++; continue }
      if (soVariante && variant !== soVariante) { contadores.outra_variante++; continue }
      const country = paisDoPerfil(v.row)
      candidatos.push({
        id: v.id, email: v.email, variant, lang: linguaDoPais(country), country,
        niche: nichoDoCadastro(v.row.signup_utm_campaign), createdAt: String(v.row.created_at ?? ''),
      })
    }

    // ── 3. supressão de 24 h (FALHA FECHADA no envio) ────────────────────────────────────────────────────────────────
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    const supressaoDegradada = sup.degraded || sup.eventsDegraded === true
    const elegiveis = candidatos
      .filter((c) => !sup.isSuppressed(c.id))
      // o filme grátis parado primeiro (custa zero de oferta e é o mais fresco); dentro de cada carta, o cadastro mais novo.
      .sort((a, b) => (a.variant === b.variant ? b.createdAt.localeCompare(a.createdAt) : a.variant === 'free_film' ? -1 : 1))
    const batch = elegiveis.slice(0, lote)

    // Cota do dia (leitura pura — claimEmailSlot escreveria até no ensaio). Campanha é 'growth': cede a vaga em 60%.
    const inicioDoDia = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()
    const cota = await admin.from('email_send_log').select('id', { count: 'exact', head: true }).eq('ok', true).gte('sent_at', inicioDoDia)
    const tetoGrowth = Math.floor(dailyCap() * 0.6)
    const usadosHoje = cota.error || cota.count === null ? null : cota.count
    const vagas = usadosHoje === null ? 0 : Math.max(0, tetoGrowth - usadosHoje)

    const base = {
      campanha: REGION_FIRST_FILM_EMAIL_CAMPAIGN, modo, coorte_bruta: contadores.regiao, candidatos: candidatos.length,
      suprimidos_24h: sup.suppressedCount, supressao_degradada: supressaoDegradada, elegiveis: elegiveis.length,
    }
    const conta = <K extends string>(f: (a: Alvo) => K) => elegiveis.reduce<Record<string, number>>((acc, e) => { const k = f(e); acc[k] = (acc[k] ?? 0) + 1; return acc }, {})

    if (!confirm) {
      await registrarCorrida(admin, { ...base, no_lote: Math.min(batch.length, vagas), enviados: 0, falhas: 0, pulados: 0 })
      const exPass = elegiveis.find((e) => e.variant === 'pass') ?? null
      const exFree = elegiveis.find((e) => e.variant === 'free_film') ?? null
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: `trial_status=region_paid_only · nenhum filme não falho (clipe não conta) · has_paid=false · plano free · sem payment_success · opt-in · externo · cadastro > ${REGION_FIRST_FILM_CRON_WINDOW_HOURS} h · nunca recebeu ${REGION_FIRST_FILM_EMAIL_SENT}`,
        elegiveis: elegiveis.length,
        candidatos_antes_da_supressao: candidatos.length,
        suprimidos_24h: sup.suppressedCount,
        supressao_degradada: supressaoDegradada,
        contadores,
        por_carta: conta((e) => e.variant),
        por_lingua: conta((e) => e.lang),
        por_moeda_do_passe: conta((e) => (e.variant === 'pass' ? precoDaCarta(e.country).currency : 'n/a')),
        proximo_lote: Math.min(batch.length, vagas),
        cota_do_dia: { usados_hoje: usadosHoje, teto_growth: tetoGrowth, vagas },
        links: { passe: linkDoPasse(), exemplo: exemploDaVitrine()?.href ?? null, compositor: linkDoCompositor() },
        assunto_exemplo: {
          pass: exPass ? assuntoDaCarta('pass', exPass.lang, precoDaCarta(exPass.country)) : null,
          free_film: exFree ? assuntoDaCarta('free_film', exFree.lang, precoDaCarta(exFree.country)) : null,
        },
        amostra: batch.slice(0, 12).map((e) => `${e.email} · ${e.variant} · ${e.lang} · ${e.country ?? '?'}${e.variant === 'pass' ? ` · ${precoDaCarta(e.country).label}` : ''}`),
        from: REGION_FIRST_FILM_EMAIL_FROM,
        hint: `Append ?confirm=SEND&limit=N (max ${REGION_FIRST_FILM_EMAIL_BATCH_MAX}) to send the next batch; &variant=pass|free_film for one letter only.`,
      })
    }

    // ── 4. ENVIO ─────────────────────────────────────────────────────────────────────────────────────────────────────
    if (supressaoDegradada) {
      await registrarCorrida(admin, corridaAbortada(REGION_FIRST_FILM_EMAIL_CAMPAIGN, modo, 'query', base))
      return NextResponse.json({ error: 'Suppression unavailable; no email sent' }, { status: 503 })
    }
    if (usadosHoje === null) {
      await registrarCorrida(admin, corridaAbortada(REGION_FIRST_FILM_EMAIL_CAMPAIGN, modo, 'query', base))
      return NextResponse.json({ error: 'Email quota unavailable; no email sent' }, { status: 503 })
    }
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })

    const daVez = batch.slice(0, vagas)
    let enviados = 0, falhas = 0, pulados = 0
    const resultados: Array<{ email: string; variant: RegionFirstFilmVariant; outcome: string }> = []
    for (const a of daVez) {
      // Reserva ANTES do envio, com id determinístico: um segundo clique (ou duas abas) bate na chave primária e pula.
      const reserva = await admin.from('events').insert({
        id: reservaDaCarta(sha256Hex, a.id), user_id: a.id, name: REGION_FIRST_FILM_EMAIL_CLAIM, path: ROUTE,
        metadata: { campaign: REGION_FIRST_FILM_EMAIL_CAMPAIGN, variant: a.variant, admin: adminEmail },
      })
      if (reserva.error) { pulados++; resultados.push({ email: a.email, variant: a.variant, outcome: 'skipped_claim_exists' }); continue }
      try {
        const footer = { text: emailFooterText(a.id), html: emailFooterHtml(a.id) }
        const price = precoDaCarta(a.country)
        let fonte: FonteDasIdeias | null = null
        let corpo: { text: string; html: string }
        if (a.variant === 'pass') {
          corpo = cartaDoPasse(a.lang, price, footer)
        } else {
          const escolha = ideiasDaCarta(a.niche)
          fonte = escolha.fonte
          corpo = cartaDoFilmeGratis(a.lang, escolha.ideias, footer)
        }
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: REGION_FIRST_FILM_EMAIL_FROM, to: [a.email], reply_to: REGION_FIRST_FILM_EMAIL_REPLY_TO,
            subject: assuntoDaCarta(a.variant, a.lang, price), text: corpo.text, html: corpo.html, headers: unsubscribeHeaders(a.id),
          }),
        })
        await recordResendResponse({ kind: REGION_FIRST_FILM_EMAIL_CAMPAIGN, priority: 'growth', userId: a.id, res, admin })
        if (!res.ok) { falhas++; resultados.push({ email: a.email, variant: a.variant, outcome: `resend ${res.status} (reserva mantida, sem reenvio)` }); continue }
        // Carimbo SÓ no envio aceito. Sem PII na metadata.
        await admin.from('events').insert({
          user_id: a.id, name: REGION_FIRST_FILM_EMAIL_SENT, path: ROUTE,
          metadata: {
            campaign: REGION_FIRST_FILM_EMAIL_CAMPAIGN, variant: a.variant, lang: a.lang, country: a.country,
            currency: a.variant === 'pass' ? price.currency : null, amount_minor: a.variant === 'pass' ? price.amountMinor : null,
            ideas_source: fonte, niche: a.niche,
          },
        })
        enviados++
        resultados.push({ email: a.email, variant: a.variant, outcome: 'sent' })
        await new Promise((r) => setTimeout(r, 600))
      } catch (e) {
        falhas++
        resultados.push({ email: a.email, variant: a.variant, outcome: `error ${e instanceof Error ? e.message : 'unknown'}` })
      }
    }
    await registrarCorrida(admin, { ...base, no_lote: daVez.length, enviados, falhas, pulados })
    return NextResponse.json({
      mode: 'SENT', enviados, falhas, pulados,
      restantes: Math.max(0, elegiveis.length - enviados - pulados),
      cota_restante_hoje: Math.max(0, vagas - daVez.length),
      cortado_pela_cota: batch.length > daVez.length,
      resultados,
    })
  } catch (e) {
    console.error('[send-region-first-film] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error; inspect events before retrying' }, { status: 500 })
  }
}
