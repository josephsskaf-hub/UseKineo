// ═══ KINEO-EP2-PAINEL-3110 — /api/cron/send-episode2: a carta do episódio 2, 20–28 h depois do PRIMEIRO filme ════════
//
// O porquê, a coorte e a divisão com as irmãs (`season_letter`, `next_episode_wall`) estão em lib/episode2Email.ts.
// Aqui só o encanamento, no contrato dos crons da casa:
//   · DRY-RUN por padrão; só `?confirm=SEND` envia (o vercel.json chama COM o parâmetro — memória de 01/09: crons que
//     dormiram 30 dias porque o path não tinha ?confirm=SEND).
//   · Bearer CRON_SECRET (fail-closed) ou sessão de admin (link de 1 clique do fundador para o dry-run).
//   · Toda leitura é paginada e ordenada (readAll) — nenhuma lista nasce truncada em 1000 linhas; `.in()` em lotes de 150.
//   · 1 por pessoa para sempre: carimbo `episode2_email_sent` em `events`, gravado SÓ no sucesso do Resend.
//   · Supressão de 24 h da casa (falha fechada) + cota diária do Resend (prioridade 'product': cede a vaga perto do teto).
//   · Contas internas fora (lib/internalAccounts — a régua da casa). Pagante ENTRA: assinante com um filme só é quem cancela.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { createClient as createSessionClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/app/api/admin/_shared/db'
import { PAID_PLANS } from '@/app/api/admin/_shared/mrr'
import { isInternalEmail } from '@/lib/internalAccounts'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { registrarCorrida, corridaAbortada, type CorridaDeCampanha } from '@/lib/lifecycle/campaignRun'
import { claimEmailSlot, recordResendResponse } from '@/lib/email/quota'
import { buildSeriesContinuationEmailUrl } from '@/lib/seriesContinuation'
import { pickMomentumTopic } from '@/lib/momentumTopic'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { getEffectiveEntitlement, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'
import { EPISODIO_ESCRITO_EVENT, lerGravado, memoriaAindaVale } from '@/lib/nextEpisodeMemoria'
import { TEMPORADA_EVENT, lerTemporada, temporadaAindaVale } from '@/lib/temporada'
import {
  EPISODE2_EMAIL_EVENT, EPISODE2_CAMPAIGN, EPISODE2_SOURCE, EPISODE2_MIN_H, EPISODE2_MAX_H, EPISODE2_MAX_PER_RUN,
  EPISODE2_SISTER_STAMPS, decidirEpisodio2, escolherIdeiaEpisodio2, montarCartaEpisodio2, type Episode2Skip, type Episode2Idea,
} from '@/lib/episode2Email'

export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02: rota só-GET no Next 14.2 leria o banco congelado sem esta linha.
export const fetchCache = 'force-no-store'
export const maxDuration = 120

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const SITE = 'https://www.usekineo.com'
const ROUTE = '/api/cron/send-episode2'
const IN_CHUNK = 150

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

async function isAdminSession(): Promise<boolean> {
  try {
    const supabase = createSessionClient()
    const { data: { user } } = await supabase.auth.getUser()
    return isAdminEmail(user?.email ?? '')
  } catch {
    return false
  }
}

function chunks<T>(xs: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n))
  return out
}

/** `.in()` em lotes + readAll em cada lote (ordem estável, sem truncar). Qualquer erro LANÇA: lista parcial nunca
 *  chega a uma decisão de envio. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readIn<T>(ids: string[], build: (part: string[]) => any, table: string): Promise<T[]> {
  const rows: T[] = []
  for (const part of chunks(ids, IN_CHUNK)) {
    const { data, error } = await readAll<T>(() => build(part), { route: ROUTE, table })
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
  }
  return rows
}

type Video = {
  id: string; user_id: string | null; created_at: string; title: string | null; topic: string | null
  quality_mode: string | null; duration_seconds: number | null; thumbnail_url: string | null
}

type Target = {
  id: string; email: string; videoId: string; filmTitle: string | null; thumb: string | null
  idea: Episode2Idea; cost: number; balance: number; hours: number; plan: string
}

function episodeUrl(seed: string): string {
  return buildSeriesContinuationEmailUrl(SITE, seed, EPISODE2_SOURCE, {
    utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: EPISODE2_CAMPAIGN,
  })
}

export async function GET(req: NextRequest) {
  try {
    return await handle(req)
  } catch (e) {
    console.error('[send-episode2] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handle(req: NextRequest) {
  const viaCron = isCronAuthorized(req)
  if (!viaCron && !(await isAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
  const admin: SupabaseClient = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

  const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const modo: CorridaDeCampanha['modo'] = confirm ? 'SENT' : 'DRY_RUN'
  const now = Date.now()

  // ── 1. filmes entregues dentro da janela (20–28 h atrás) ───────────────────
  const { data: janela } = await readAll<Video>(() => admin.from('videos')
    .select('id, user_id, created_at, title, topic, quality_mode, duration_seconds, thumbnail_url')
    .eq('status', 'completed')
    .gte('created_at', new Date(now - EPISODE2_MAX_H * 3_600_000).toISOString())
    .lte('created_at', new Date(now - EPISODE2_MIN_H * 3_600_000).toISOString()), { route: ROUTE, table: 'videos' })
  const naJanela = (janela ?? []).filter((v) => v.user_id && v.quality_mode !== 'ads_v2')
  const ids = [...new Set(naJanela.map((v) => v.user_id as string))]
  if (ids.length === 0) {
    await registrarCorrida(admin, corridaAbortada(EPISODE2_CAMPAIGN, modo, 'coorte_vazia'))
    return NextResponse.json({ mode: modo, eligible: 0, window_h: [EPISODE2_MIN_H, EPISODE2_MAX_H] })
  }

  // ── 2. a vida inteira dessas contas: quantos filmes, e qual foi o PRIMEIRO ──
  const todos = await readIn<Video>(ids, (part) => admin.from('videos')
    .select('id, user_id, created_at, title, topic, quality_mode, duration_seconds, thumbnail_url')
    .eq('status', 'completed').in('user_id', part), 'videos')
  const vida = new Map<string, { count: number; first: Video }>()
  for (const v of todos) {
    if (!v.user_id || v.quality_mode === 'ads_v2') continue
    const cur = vida.get(v.user_id)
    if (!cur) vida.set(v.user_id, { count: 1, first: v })
    else {
      cur.count += 1
      if (v.created_at < cur.first.created_at) cur.first = v
    }
  }

  // ── 3. perfis + carimbos (desta carta e das irmãs) + a ideia já escrita ────
  type Prof = Record<string, unknown> & { id: string; email: string | null; email_opted_out: boolean | null; plan: string | null; video_credits: number | null }
  const profs = await readIn<Prof>(ids, (part) => admin.from('profiles')
    .select(`id, email, email_opted_out, plan, video_credits, ${TRIAL_ENTITLEMENT_COLUMNS}`).in('id', part), 'profiles')
  const stamps = await readIn<{ id: string; user_id: string; name: string }>(ids, (part) => admin.from('events')
    .select('id, user_id, name').in('user_id', part).in('name', [EPISODE2_EMAIL_EVENT, ...EPISODE2_SISTER_STAMPS]), 'events')
  const firstIds = [...vida.values()].map((x) => x.first.id)
  const ideias = await readIn<{ id: string; user_id: string | null; name: string; session_id: string | null; metadata: unknown; created_at: string }>(
    firstIds, (part) => admin.from('events')
      .select('id, user_id, name, session_id, metadata, created_at')
      .in('name', [EPISODIO_ESCRITO_EVENT, TEMPORADA_EVENT]).in('session_id', part), 'events')

  const proprio = new Set<string>(), irma = new Set<string>()
  for (const s of stamps) (s.name === EPISODE2_EMAIL_EVENT ? proprio : irma).add(s.user_id)
  // a MAIS RECENTE de cada tipo, por filme (e do mesmo dono)
  const escrito = new Map<string, { title?: unknown }>(), temporada = new Map<string, { title?: unknown; seed?: unknown }>()
  const ordenadas = [...ideias].sort((a, b) => a.created_at.localeCompare(b.created_at))
  for (const e of ordenadas) {
    if (!e.session_id) continue
    if (e.name === EPISODIO_ESCRITO_EVENT && memoriaAindaVale(e.created_at, now)) {
      const ep = lerGravado(e.metadata)
      if (ep) escrito.set(`${e.user_id}:${e.session_id}`, { title: ep.title })
    } else if (e.name === TEMPORADA_EVENT && temporadaAindaVale(e.created_at, now)) {
      const t = lerTemporada(e.metadata)
      if (t?.episodes[0]) temporada.set(`${e.user_id}:${e.session_id}`, { title: t.episodes[0].title, seed: t.episodes[0].seed })
    }
  }

  // ── 4. a decisão ───────────────────────────────────────────────────────────
  const skipped: Record<Episode2Skip | 'sem_tema' | 'sem_perfil', number> = {
    fora_da_janela: 0, ja_tem_segundo_filme: 0, sem_email: 0, descadastrado: 0, interna: 0, ja_recebeu: 0,
    recebeu_carta_irma: 0, sem_custo: 0, sem_saldo: 0, sem_tema: 0, sem_perfil: 0,
  }
  const profById = new Map(profs.map((p) => [p.id, p]))
  const candidatos: Target[] = []
  for (const id of ids) {
    const v = vida.get(id)
    const p = profById.get(id)
    if (!v || !p) { skipped.sem_perfil++; continue }
    const plan = String(p.plan ?? '').toLowerCase()
    const ent = getEffectiveEntitlement(p as never, { isPaidAccount: PAID_PLANS.has(plan) })
    const seg = typeof v.first.duration_seconds === 'number' && v.first.duration_seconds > 0 ? v.first.duration_seconds : 35
    let cost: number | null = null
    try {
      cost = v.first.quality_mode ? creditCostForDuration(v.first.quality_mode as Quality, ent.treatAsPaid, seg) : null
    } catch {
      cost = null
    }
    const balance = typeof p.video_credits === 'number' ? Math.floor(p.video_credits) : null
    const email = (p.email ?? '').trim()
    const d = decidirEpisodio2({
      completedFilms: v.count, firstFilmAtMs: Date.parse(v.first.created_at), nowMs: now,
      email, optedOut: p.email_opted_out === true, internal: isInternalEmail(email),
      alreadyStamped: proprio.has(id), sisterLetter: irma.has(id), balance, cost,
    })
    if (!d.ok) { skipped[d.reason]++; continue }
    const filmTitle = pickMomentumTopic(v.first.title) ?? pickMomentumTopic(v.first.topic)
    const chave = `${id}:${v.first.id}`
    const idea = escolherIdeiaEpisodio2({ written: escrito.get(chave) ?? null, season: temporada.get(chave) ?? null, filmTitle })
    if (!idea) { skipped.sem_tema++; continue }
    candidatos.push({
      id, email, videoId: v.first.id, filmTitle, thumb: v.first.thumbnail_url, idea, cost: cost as number,
      balance: balance as number, hours: Math.round((now - Date.parse(v.first.created_at)) / 360_000) / 10, plan,
    })
  }

  // ── 5. supressão de 24 h (falha FECHADA) ──────────────────────────────────
  const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
  const elegiveis = candidatos.filter((c) => !sup.isSuppressed(c.id))
  const lote = elegiveis.slice(0, EPISODE2_MAX_PER_RUN)
  const base = {
    campanha: EPISODE2_CAMPAIGN, modo, coorte_bruta: ids.length, candidatos: candidatos.length,
    suprimidos_24h: sup.suppressedCount, supressao_degradada: sup.degraded, elegiveis: elegiveis.length, no_lote: lote.length,
  }

  if (!confirm) {
    await registrarCorrida(admin, { ...base, enviados: 0, falhas: 0, pulados: 0 })
    const ex = lote[0]
    return NextResponse.json({
      mode: 'DRY_RUN',
      armed_in_vercel_json: `${ROUTE}?confirm=SEND (de hora em hora)`,
      coorte: `primeiro filme entregue há ${EPISODE2_MIN_H}-${EPISODE2_MAX_H} h · ainda UM filme · saldo paga o episódio 2 no motor do filme 1 · fora internas/descadastro · nunca recebeu esta carta nem season_letter/next_episode_wall · fora da supressão de 24 h`,
      bruta: ids.length, skipped, candidatos: candidatos.length, suprimidos_24h: sup.suppressedCount,
      supressao_degradada: sup.degraded, elegiveis: elegiveis.length, no_lote: lote.length,
      por_ideia: {
        next_episode_written: elegiveis.filter((c) => c.idea.source === 'next_episode_written').length,
        season_written: elegiveis.filter((c) => c.idea.source === 'season_written').length,
        so_tema_do_filme: elegiveis.filter((c) => c.idea.source === 'film_title').length,
      },
      exemplo: ex ? { assunto: montarCartaEpisodio2({ filmTitle: ex.filmTitle, thumbnailUrl: ex.thumb, idea: ex.idea, url: episodeUrl(ex.idea.seed) }).subject, link: episodeUrl(ex.idea.seed) } : null,
      sample: lote.slice(0, 12).map((c) => `${c.email} · ${c.hours}h · saldo ${c.balance}/${c.cost} · ${c.idea.source} · ${(c.idea.title ?? c.filmTitle ?? '').slice(0, 50)}`),
      hint: 'Append &confirm=SEND to send.',
    })
  }

  let enviados = 0, falhas = 0, pulados = 0
  const results: Array<{ email: string; outcome: string }> = []
  for (const c of lote) {
    const slot = await claimEmailSlot({ kind: EPISODE2_CAMPAIGN, priority: 'product', admin })
    if (!slot.allowed) { pulados++; results.push({ email: c.email, outcome: 'yielded_quota' }); continue }
    const carta = montarCartaEpisodio2({ filmTitle: c.filmTitle, thumbnailUrl: c.thumb, idea: c.idea, url: episodeUrl(c.idea.seed) })
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL, to: [c.email], reply_to: 'hello@usekineo.com',
          subject: carta.subject,
          text: `${carta.text}${emailFooterText(c.id)}`,
          html: `${carta.html}\n${emailFooterHtml(c.id)}`,
          headers: unsubscribeHeaders(c.id),
        }),
      })
      void recordResendResponse({ kind: EPISODE2_CAMPAIGN, priority: 'product', userId: c.id, res, admin })
      if (!res.ok) throw new Error(`resend ${res.status}`)
      // Carimbo SÓ no sucesso — falha volta na próxima rodada (enquanto a janela durar).
      await admin.from('events').insert({
        user_id: c.id, name: EPISODE2_EMAIL_EVENT, path: ROUTE,
        metadata: { video_id: c.videoId, idea_source: c.idea.source, ep2: c.idea.title, hours_since_first: c.hours, balance: c.balance, cost: c.cost, plan: c.plan, via: viaCron ? 'cron' : 'admin_session' },
      })
      enviados++
      results.push({ email: c.email, outcome: 'sent' })
    } catch (e) {
      falhas++
      results.push({ email: c.email, outcome: `failed: ${e instanceof Error ? e.message : 'error'}` })
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  await registrarCorrida(admin, { ...base, enviados, falhas, pulados })
  console.log(`[send-episode2] sent=${enviados} failed=${falhas} yielded=${pulados} of ${elegiveis.length} eligible`)
  return NextResponse.json({ mode: 'SENT', enviados, falhas, pulados, elegiveis: elegiveis.length, skipped, results })
}
