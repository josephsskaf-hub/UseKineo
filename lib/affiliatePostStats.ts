// ═══ KINEO-AFILIADO-POR-POST-1610 ═══════════════════════════════════════════════════════════════════════════════════
// "De onde veio": o painel do parceiro (/affiliate) ganha a tabela "Your links" — por POST (`&p=` do link) e por
// ORIGEM (tiktok / youtube / instagram / x / other, pelo referrer do clique), nos últimos 30 dias:
//   · clicks      = visitas de GENTE: linha em affiliate_clicks (a rota /a/[code] só grava clique contado — robô e
//                   recarga no mesmo navegador nunca entram) e, de novo aqui, o filtro de robô de hoje sobre o
//                   user_agent (linhas antigas gravadas antes de a lista conhecer curl/Google-Safety/kuma saem).
//   · signups     = indicações (affiliate_referrals) criadas na janela. O post/origem de cada uma vem do evento
//                   server-only `affiliate_signup_attribution_result` (outcome=attributed), que desde 16/10 leva o
//                   post e o host do clique-prova (o 1º clique, que vale 90 dias). Indicação sem esse evento (cupom,
//                   compra sem login, ou cadastro antes de 16/10) vai para a linha "untracked" — nunca é chutada.
//   · first_film  = dessas indicações, quantas pessoas têm ≥1 vídeo `completed`.
//   · paid        = dessas indicações, quantas estão `paid`.
// Só CONTAGENS do PRÓPRIO afiliado: toda leitura filtra por affiliate_id no banco, e a conta pura filtra de novo
// (defesa em profundidade — um dublê/consulta errada não vaza linha de outro parceiro). Nenhum e-mail, id de pessoa
// ou código sai daqui. Toda leitura é PAGINADA (readAll): nada de corte silencioso em 1000 linhas.

import { readAll } from '@/lib/supabase/readAll'
import {
  affiliatePostTagFromLandingPath,
  affiliateTrafficOrigin,
  isAffiliatePreviewBot,
  normalizeAffiliatePostTag,
  type AffiliateTrafficOrigin,
} from '@/lib/affiliateDestinations'

export const AFFILIATE_LINKS_WINDOW_DAYS = 30
/** Linhas mostradas; o resto (ex.: alguém clicando com dezenas de `p=` inventados) é somado em `others`. */
export const AFFILIATE_LINKS_MAX_ROWS = 30
/** Tamanho de cada `.in('user_id', …)` — lista gigante em .in() já derrubou leitura (memória hold-de-credito). */
export const AFFILIATE_LINKS_IN_CHUNK = 100
export const AFFILIATE_SIGNUP_SOURCE_EVENT = 'affiliate_signup_attribution_result'

export type PostStatsClick = {
  affiliate_id: string | null
  landing_path: string | null
  referrer: string | null
  user_agent: string | null
  created_at: string | null
}
export type PostStatsReferral = {
  affiliate_id: string | null
  referred_user_id: string | null
  status: string | null
  first_touch_at: string | null
}
export type PostStatsSource = {
  user_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export type AffiliateLinkCounts = { clicks: number; signups: number; first_film: number; paid: number }
export type AffiliateLinkRow = AffiliateLinkCounts & { post: string | null; origin: AffiliateTrafficOrigin }
export type AffiliateLinksReport = {
  available: true
  window_days: number
  rows: AffiliateLinkRow[]
  /** Soma das linhas além de AFFILIATE_LINKS_MAX_ROWS; null quando não sobrou nada. */
  others: AffiliateLinkCounts | null
  /** Indicações da janela sem post/origem registrados (cupom, compra sem login, ou antes de 16/10). */
  untracked: AffiliateLinkCounts
  totals: AffiliateLinkCounts
  robots_excluded: number
}

const zero = (): AffiliateLinkCounts => ({ clicks: 0, signups: 0, first_film: 0, paid: 0 })

function add(into: AffiliateLinkCounts, from: AffiliateLinkCounts): void {
  into.clicks += from.clicks
  into.signups += from.signups
  into.first_film += from.first_film
  into.paid += from.paid
}

function inWindow(iso: string | null | undefined, sinceMs: number, nowMs: number): boolean {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) && t >= sinceMs && t <= nowMs + 60_000
}

/** Conta pura (sem banco): o guardião scripts/test-afiliado-por-post-1610.mjs a executa com dados sintéticos. */
export function buildAffiliateLinkStats(input: {
  affiliateId: string
  clicks: readonly PostStatsClick[]
  referrals: readonly PostStatsReferral[]
  sources: readonly PostStatsSource[]
  filmUserIds: ReadonlySet<string> | readonly string[]
  nowMs: number
  windowDays?: number
}): AffiliateLinksReport {
  const windowDays = input.windowDays ?? AFFILIATE_LINKS_WINDOW_DAYS
  const sinceMs = input.nowMs - windowDays * 24 * 60 * 60 * 1000
  const films = input.filmUserIds instanceof Set ? input.filmUserIds : new Set(input.filmUserIds as readonly string[])
  const byKey = new Map<string, AffiliateLinkRow>()
  const rowFor = (post: string | null, origin: AffiliateTrafficOrigin): AffiliateLinkRow => {
    const key = `${post ?? ''}|${origin}`
    let row = byKey.get(key)
    if (!row) {
      row = { post, origin, ...zero() }
      byKey.set(key, row)
    }
    return row
  }

  let robots = 0
  for (const click of input.clicks) {
    if (click.affiliate_id !== input.affiliateId) continue
    if (!inWindow(click.created_at, sinceMs, input.nowMs)) continue
    if (isAffiliatePreviewBot(click.user_agent)) {
      robots++
      continue
    }
    rowFor(affiliatePostTagFromLandingPath(click.landing_path), affiliateTrafficOrigin(click.referrer)).clicks++
  }

  // Indicações do PRÓPRIO afiliado na janela, uma por pessoa (referred_user_id é único no banco; aqui também).
  const referrals = new Map<string, PostStatsReferral>()
  for (const r of input.referrals) {
    if (r.affiliate_id !== input.affiliateId || !r.referred_user_id) continue
    if (!inWindow(r.first_touch_at, sinceMs, input.nowMs)) continue
    if (!referrals.has(r.referred_user_id)) referrals.set(r.referred_user_id, r)
  }

  // Origem de cada indicação: o evento do servidor, e só se for do MESMO afiliado e de uma pessoa que é indicação
  // dele. O mais antigo vence (é o da criação da indicação).
  const sourceByUser = new Map<string, { post: string | null; origin: AffiliateTrafficOrigin; at: number }>()
  for (const ev of input.sources) {
    const meta = ev.metadata ?? {}
    if (!ev.user_id || !referrals.has(ev.user_id)) continue
    if (meta.affiliate_id !== input.affiliateId || meta.outcome !== 'attributed') continue
    const at = Date.parse(ev.created_at ?? '') || 0
    const prev = sourceByUser.get(ev.user_id)
    if (prev && prev.at <= at) continue
    sourceByUser.set(ev.user_id, {
      post: normalizeAffiliatePostTag(typeof meta.post === 'string' ? meta.post : null),
      origin: affiliateTrafficOrigin(typeof meta.referrer_host === 'string' ? meta.referrer_host : null),
      at,
    })
  }

  const untracked = zero()
  referrals.forEach((r, userId) => {
    const src = sourceByUser.get(userId)
    const counts: AffiliateLinkCounts = src ? rowFor(src.post, src.origin) : untracked
    counts.signups++
    if (films.has(userId)) counts.first_film++
    if ((r.status ?? '').toLowerCase() === 'paid') counts.paid++
  })

  const sorted = Array.from(byKey.values()).sort((a, b) =>
    b.clicks - a.clicks ||
    b.signups - a.signups ||
    b.paid - a.paid ||
    (a.post ?? '￿').localeCompare(b.post ?? '￿') ||
    a.origin.localeCompare(b.origin),
  )
  const rows = sorted.slice(0, AFFILIATE_LINKS_MAX_ROWS)
  let others: AffiliateLinkCounts | null = null
  for (const extra of sorted.slice(AFFILIATE_LINKS_MAX_ROWS)) {
    others = others ?? zero()
    add(others, extra)
  }
  const totals = zero()
  for (const row of sorted) add(totals, row)
  add(totals, untracked)

  return { available: true, window_days: windowDays, rows, others, untracked, totals, robots_excluded: robots }
}

type Db = {
  from(table: string): any // eslint-disable-line @typescript-eslint/no-explicit-any
}

function chunks<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

/** Leitura completa e paginada, sempre com affiliate_id do dono logado. Erro de leitura = exceção (nunca número parcial). */
export async function readAffiliateLinkStats(db: Db, affiliateId: string, nowMs = Date.now()): Promise<AffiliateLinksReport> {
  const route = '/api/affiliate/me'
  const sinceIso = new Date(nowMs - AFFILIATE_LINKS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  // O evento nasce no instante da indicação; 1 dia de folga cobre relógio e o insert logo antes da janela.
  const sourceSinceIso = new Date(nowMs - (AFFILIATE_LINKS_WINDOW_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString()

  const [clicks, referrals, sources] = await Promise.all([
    readAll<PostStatsClick>(
      () => db.from('affiliate_clicks')
        .select('id, affiliate_id, landing_path, referrer, user_agent, created_at')
        .eq('affiliate_id', affiliateId)
        .gte('created_at', sinceIso),
      { route, table: 'affiliate_clicks' },
    ),
    readAll<PostStatsReferral>(
      () => db.from('affiliate_referrals')
        .select('id, affiliate_id, referred_user_id, status, first_touch_at')
        .eq('affiliate_id', affiliateId)
        .gte('first_touch_at', sinceIso),
      { route, table: 'affiliate_referrals' },
    ),
    readAll<PostStatsSource>(
      () => db.from('events')
        .select('id, user_id, metadata, created_at')
        .eq('name', AFFILIATE_SIGNUP_SOURCE_EVENT)
        .eq('metadata->>affiliate_id', affiliateId)
        .eq('metadata->>outcome', 'attributed')
        .gte('created_at', sourceSinceIso),
      { route, table: 'events' },
    ),
  ])

  const referralRows = (referrals.data ?? []).filter((r) => r.affiliate_id === affiliateId)
  const userIds = Array.from(new Set(referralRows.map((r) => r.referred_user_id).filter((id): id is string => !!id)))
  const filmUserIds = new Set<string>()
  for (const ids of chunks(userIds, AFFILIATE_LINKS_IN_CHUNK)) {
    const { data } = await readAll<{ user_id: string | null }>(
      () => db.from('videos').select('id, user_id').in('user_id', ids).eq('status', 'completed'),
      { route, table: 'videos' },
    )
    for (const v of data ?? []) if (v.user_id) filmUserIds.add(v.user_id)
  }

  return buildAffiliateLinkStats({
    affiliateId,
    clicks: clicks.data ?? [],
    referrals: referralRows,
    sources: sources.data ?? [],
    filmUserIds,
    nowMs,
  })
}
