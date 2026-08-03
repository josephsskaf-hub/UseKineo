// lib/wallOfProof.ts — KINEO-WALL-2026-08-03
//
// Fonte única de verdade do "Wall of Proof" (/wall): os Shorts que usuários
// REALMENTE publicaram no YouTube depois de gerar na Kineo.
//
// Por que existe:
//   · prova social verificável — cada card leva a um vídeo vivo no YouTube,
//     não a um depoimento escrito por nós;
//   · retenção — dá um motivo de VOLTAR (D7 hoje é 0,4%): o usuário cola o
//     link, sobe no ranking, e volta pra ver onde ficou.
//
// Estoque: a tabela `posted_shorts`, criada em 31/07 pela ponte pós-download
// (app/api/posted-shorts/route.ts, source='pasted') e também alimentada pelo
// upload direto (app/api/youtube/upload, source='direct_upload').
//
// Schema REAL confirmado em produção (03/08/2026, projeto cqqukkvjjrguayiyjvhh):
//   id uuid · user_id uuid · video_id uuid · url text · youtube_video_id text
//   · source text · created_at timestamptz
//   + KINEO-WALL-2026-08-03 (docs/SQL-WALL-OF-PROOF.sql, aditivo):
//     views bigint · title text · channel_title text · thumbnail_url text
//     · checked_at timestamptz · hidden boolean
//   Linhas hoje: 1. A página TEM que degradar com elegância — e degrada:
//   sem linhas, /wall renderiza um empty state que convida a colar o primeiro
//   link. Nunca há seed de linha falsa.
//
// PRIVACIDADE — regra dura desta página: NENHUM e-mail chega ao HTML.
// A ordem de crédito é canal do YouTube → primeiro nome do perfil → e-mail
// MASCARADO ("jo***"). `user_id` nunca é renderizado nem devolvido ao cliente.

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { PUBLIC_BASE_URL } from '@/lib/publicVideos'

export { PUBLIC_BASE_URL }

/** Colunas realmente lidas da tabela. Nunca trocar por `*`: o client abaixo é
 *  service-role e passa por cima de RLS, então a allow-list é a trava. */
const WALL_COLUMNS =
  'id, user_id, url, youtube_video_id, source, created_at, views, title, channel_title, thumbnail_url, hidden'

/** Recorte temporal exposto na UI. */
export type WallRange = 'week' | 'all'

/** Dias que definem o recorte "This week". */
export const WALL_WEEK_DAYS = 7

/** Teto de cards renderizados. Mantém a página leve e o JSON-LD dentro do bom senso. */
export const WALL_MAX_ITEMS = 60

export type WallShort = {
  /** id da linha em posted_shorts — usado só como React key. */
  id: string
  /** Id do vídeo no YouTube. Também é a chave de deduplicação. */
  youtubeId: string
  /** Link canônico para assistir no YouTube. */
  watchUrl: string
  /** Thumbnail pública. Sempre existe (derivada do id quando não há melhor). */
  thumbnailUrl: string
  /** Título do vídeo, ou null enquanto a coleta não passou por ele. */
  title: string | null
  /** Crédito público do autor. NUNCA um e-mail cru. */
  author: string
  /** Views conhecidas, ou null quando ainda não temos a contagem. */
  views: number | null
  /** ISO-8601 de quando o link entrou no estoque. */
  addedAt: string
}

export type WallData = {
  items: WallShort[]
  /** Total de Shorts publicados no estoque (todos os tempos, já deduplicado). */
  totalAllTime: number
  /** True quando NENHUM item do recorte tem contagem de views conhecida.
   *  A página então ordena por data e diz isso em voz alta. */
  viewsPending: boolean
  /** Soma das views conhecidas no recorte. 0 quando nada é conhecido. */
  totalViews: number
  /** True quando a leitura falhou (Supabase fora / sem service role). A página
   *  mostra o mesmo empty state honesto em vez de estourar. */
  unavailable: boolean
}

// ── Helpers puros (usados também pela rota de coleta) ────────────────────────

/** Formato de id de vídeo do YouTube aceito pela ponte /api/posted-shorts. */
const YT_ID = /^[A-Za-z0-9_-]{6,20}$/

export function isYouTubeId(value: unknown): value is string {
  return typeof value === 'string' && YT_ID.test(value)
}

/**
 * Thumbnail pública do YouTube. `hqdefault.jpg` é a única que existe para
 * 100% dos vídeos (maxresdefault falha em uploads antigos/baixa resolução e
 * devolveria uma imagem quebrada no card).
 */
export function youtubeThumbUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
}

/** URL canônica do Short. */
export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/shorts/${youtubeId}`
}

/**
 * Crédito público do autor, na ordem: canal do YouTube → primeiro nome do
 * perfil → e-mail mascarado → "A Kineo creator".
 *
 * O mascaramento corta no 2º caractere ("joseph@x.com" → "jo***"), o domínio
 * some inteiro e nada é reversível. Um e-mail cru numa página indexável seria
 * (a) vazamento de PII de um usuário que nunca pediu para aparecer e (b) uma
 * lista pronta de endereços para scraper de spam.
 */
export function publicAuthorLabel(args: {
  channelTitle?: string | null
  profileName?: string | null
  profileEmail?: string | null
}): string {
  const channel = (args.channelTitle ?? '').trim()
  if (channel) return channel.slice(0, 40)

  const name = (args.profileName ?? '').trim()
  if (name) {
    const first = name.split(/\s+/)[0] ?? ''
    // Um "nome" que na verdade é o e-mail (acontece em signups OAuth) cai no
    // mascaramento em vez de vazar o endereço inteiro.
    if (first && !first.includes('@')) return first.slice(0, 24)
  }

  const email = (args.profileEmail ?? args.profileName ?? '').trim()
  const local = email.split('@')[0] ?? ''
  if (local.length >= 2) return `${local.slice(0, 2)}***`
  if (local.length === 1) return `${local}***`

  return 'A Kineo creator'
}

/** "12.4K" / "1.2M" — números grandes legíveis num card estreito. */
export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(views >= 10_000_000 ? 0 : 1)}M`
  if (views >= 1_000) return `${(views / 1_000).toFixed(views >= 10_000 ? 0 : 1)}K`
  return String(views)
}

/** "3 days ago" — sem dependência de biblioteca de datas. */
export function relativeDay(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const days = Math.floor((Date.now() - t) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? 'last month' : `${months} months ago`
}

// ── Acesso a dados ──────────────────────────────────────────────────────────

/**
 * Client service-role. Mesmo motivo de lib/publicVideos.ts: `posted_shorts` tem
 * RLS "só a própria linha", e a página pública não tem sessão nenhuma. A
 * segurança aqui é a allow-list de colunas + o fato de `user_id` nunca sair
 * desta função.
 */
export function wallAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type WallRow = {
  id: string
  user_id: string | null
  url: string | null
  youtube_video_id: string | null
  source: string | null
  created_at: string | null
  views: number | string | null
  title: string | null
  channel_title: string | null
  thumbnail_url: string | null
  hidden: boolean | null
}

/** `bigint` volta do PostgREST como string. */
function toViews(value: number | string | null): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

/**
 * Ranking: views desc, NULLs por último; empate (ou tudo NULL) resolve pelo
 * mais recente. A ordenação é feita em código — e não no `.order()` do
 * PostgREST — porque a deduplicação por youtube_video_id acontece antes e
 * precisa acabar num array único e determinístico.
 */
function rankShorts(a: WallShort, b: WallShort): number {
  const av = a.views
  const bv = b.views
  if (av != null && bv != null && av !== bv) return bv - av
  if (av != null && bv == null) return -1
  if (av == null && bv != null) return 1
  return Date.parse(b.addedAt) - Date.parse(a.addedAt)
}

/**
 * Os Shorts publicados, prontos para render. NUNCA lança: um incidente no
 * Supabase deve deixar /wall com o empty state, não com um 500 numa página
 * pública e indexável.
 */
export async function getWallData(range: WallRange): Promise<WallData> {
  const empty: WallData = {
    items: [],
    totalAllTime: 0,
    viewsPending: true,
    totalViews: 0,
    unavailable: false,
  }

  const admin = wallAdminClient()
  if (!admin) return { ...empty, unavailable: true }

  try {
    const { data, error } = await admin
      .from('posted_shorts')
      .select(WALL_COLUMNS)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error || !data) return { ...empty, unavailable: true }

    const rows = data as unknown as WallRow[]
    const cutoff = Date.now() - WALL_WEEK_DAYS * 86_400_000

    // Perfis só para o crédito de autor, e só para quem não tem canal
    // preenchido. Uma consulta separada porque não há FK declarada de
    // posted_shorts.user_id → profiles.id (o FK aponta para auth.users), então
    // o embed do PostgREST não resolveria.
    const needProfile = Array.from(
      new Set(
        rows
          .filter((r) => !(r.channel_title ?? '').trim() && r.user_id)
          .map((r) => r.user_id as string),
      ),
    ).slice(0, 200)

    const profiles = new Map<string, { name: string | null; email: string | null }>()
    if (needProfile.length > 0) {
      const { data: profileRows } = await admin
        .from('profiles')
        .select('id, name, email')
        .in('id', needProfile)
      for (const p of (profileRows ?? []) as { id: string; name: string | null; email: string | null }[]) {
        profiles.set(p.id, { name: p.name, email: p.email })
      }
    }

    const seen = new Set<string>()
    const all: WallShort[] = []
    for (const row of rows) {
      const youtubeId = row.youtube_video_id
      if (!isYouTubeId(youtubeId)) continue
      // O mesmo vídeo pode ter sido colado por dois caminhos (pasted +
      // direct_upload) ou por duas contas. Uma linha por vídeo no wall.
      if (seen.has(youtubeId)) continue
      seen.add(youtubeId)

      const profile = row.user_id ? profiles.get(row.user_id) : undefined
      const addedAt = row.created_at ? new Date(Date.parse(row.created_at)).toISOString() : new Date(0).toISOString()

      all.push({
        id: row.id,
        youtubeId,
        watchUrl: youtubeWatchUrl(youtubeId),
        thumbnailUrl: (row.thumbnail_url ?? '').trim() || youtubeThumbUrl(youtubeId),
        title: (row.title ?? '').trim() || null,
        author: publicAuthorLabel({
          channelTitle: row.channel_title,
          profileName: profile?.name ?? null,
          profileEmail: profile?.email ?? null,
        }),
        views: toViews(row.views),
        addedAt,
      })
    }

    const scoped = range === 'week' ? all.filter((s) => Date.parse(s.addedAt) >= cutoff) : all
    const items = scoped.sort(rankShorts).slice(0, WALL_MAX_ITEMS)
    const known = items.filter((s) => s.views != null)

    return {
      items,
      totalAllTime: all.length,
      viewsPending: known.length === 0,
      totalViews: known.reduce((sum, s) => sum + (s.views ?? 0), 0),
      unavailable: false,
    }
  } catch {
    return { ...empty, unavailable: true }
  }
}
