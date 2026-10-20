import type { readAll as ReadAllRows } from '../supabase/readAll'
// KINEO-META95-REGUA-1910 — leitura do PLACAR DA RÉGUA 95 para o /admin/coerencia (só leitura; quem julga é o cron
// /api/cron/regua-95). Por produto (Filmes / Ads / UGC / Clipes) e por motor: n, média e "% ≥ 95" das notas NOVAS
// (coherence_v2 e pixel_score) e da nota combinada (a menor das duas — o vídeo só é 95 se o texto E o pixel forem 95),
// com corte por data de entrega (padrão: o dia do deploy desta régua). Contas da casa fora por padrão (lib/internalAccounts).
import type { SupabaseClient } from '@supabase/supabase-js'
import { COHERENCE_V2_EVENT, COHERENCE_V2_VERSION, type ProdutoRegua } from '@/lib/regua95/coherenceV2'
import { PIXEL_SCORE_EVENT, PIXEL_SCORE_VERSION } from '@/lib/regua95/pixelScore'
import { PRODUTOS_REGUA, REGUA95_DEPLOY_DESDE, notaRegua, placar, type LinhaPlacar } from '@/lib/regua95/contexto'
import { isInternalEmail } from '@/lib/internalAccounts'

export type NotaRegua95 = {
  key: string
  user_id: string | null
  product: ProdutoRegua
  engine: string
  delivered_at: string
  video_id: string | null
  video_url: string | null
  coerencia: number | null
  pixel: number | null
  nota: number | null
  idea_source: string | null
  pixel_caps: string[]
  pixel_summary: string
  coerencia_problems: string[]
  usd: number
}

export type LinhaRegua95 = { rotulo: string; coerencia: LinhaPlacar; pixel: LinhaPlacar; nota: LinhaPlacar; usd: number }

type EventRow = { created_at: string; session_id: string | null; user_id: string | null; metadata: Record<string, unknown> | null }

const str = (x: unknown) => (typeof x === 'string' ? x : '')
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null)

/** Eventos (os dois juízes, versão vigente; o mais recente por entrega vence) → uma nota por entrega. Pura. */
export function juntarNotasRegua(eventos: Array<EventRow & { name: string }>, desdeIso: string): NotaRegua95[] {
  const porChave = new Map<string, NotaRegua95>()
  const visto = new Set<string>()
  const ordenados = [...eventos].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  for (const e of ordenados) {
    const m = e.metadata ?? {}
    const key = e.session_id
    if (!key) continue
    const ehCoer = e.name === COHERENCE_V2_EVENT && m.version === COHERENCE_V2_VERSION
    const ehPix = e.name === PIXEL_SCORE_EVENT && m.version === PIXEL_SCORE_VERSION
    if (!ehCoer && !ehPix) continue
    const marca = `${e.name}:${key}`
    if (visto.has(marca)) continue
    visto.add(marca)
    const entregue = str(m.delivered_at) || e.created_at
    if (entregue < desdeIso) continue
    const produto = (PRODUTOS_REGUA as string[]).includes(str(m.product)) ? (str(m.product) as ProdutoRegua) : 'filme'
    const n = porChave.get(key) ?? { key, user_id: e.user_id, product: produto, engine: str(m.engine) || 'unknown', delivered_at: entregue, video_id: str(m.video_id) || null, video_url: null, coerencia: null, pixel: null, nota: null, idea_source: null, pixel_caps: [], pixel_summary: '', coerencia_problems: [], usd: 0 }
    if (ehCoer) {
      n.coerencia = num(m.score)
      n.idea_source = str(m.idea_source) || null
      n.coerencia_problems = Array.isArray(m.problems) ? (m.problems as unknown[]).filter((p): p is string => typeof p === 'string').slice(0, 4) : []
    } else {
      n.pixel = num(m.score)
      n.video_url = str(m.video_url) || n.video_url
      n.pixel_caps = Array.isArray(m.caps) ? (m.caps as unknown[]).filter((p): p is string => typeof p === 'string').slice(0, 6) : []
      n.pixel_summary = str(m.summary)
    }
    n.usd += num(m.usd) ?? 0
    n.nota = notaRegua(n.coerencia, n.pixel)
    porChave.set(key, n)
  }
  return Array.from(porChave.values()).sort((a, b) => (a.delivered_at < b.delivered_at ? 1 : -1))
}

/** Placar por um campo (produto ou produto·motor). Pura. */
export function placarRegua(notas: NotaRegua95[], chave: (n: NotaRegua95) => string): LinhaRegua95[] {
  const grupos = new Map<string, NotaRegua95[]>()
  for (const n of notas) { const k = chave(n); grupos.set(k, [...(grupos.get(k) ?? []), n]) }
  return Array.from(grupos.entries())
    .map(([rotulo, xs]) => ({ rotulo, coerencia: placar(xs.map((x) => x.coerencia)), pixel: placar(xs.map((x) => x.pixel)), nota: placar(xs.map((x) => x.nota)), usd: Math.round(xs.reduce((a, x) => a + x.usd, 0) * 1e4) / 1e4 }))
    .sort((a, b) => b.nota.n - a.nota.n || a.rotulo.localeCompare(b.rotulo))
}

/** Lê o placar no banco (service role). `desde` ISO; `incluirCasa` = contas internas entram. */
export async function lerRegua95(
  admin: SupabaseClient,
  opts: { desde?: string; incluirCasa?: boolean; route?: string },
  readAll: typeof ReadAllRows,
): Promise<{ notas: NotaRegua95[]; desde: string; casaFora: number }> {
  const desde = opts.desde && !Number.isNaN(Date.parse(opts.desde)) ? new Date(opts.desde).toISOString() : REGUA95_DEPLOY_DESDE
  const route = opts.route ?? '/admin/coerencia'
  const r = await readAll(() => admin.from('events').select('name, created_at, session_id, user_id, metadata').in('name', [COHERENCE_V2_EVENT, PIXEL_SCORE_EVENT]).gte('created_at', desde), { route, table: 'events' })
  let notas = juntarNotasRegua((r.data ?? []) as Array<EventRow & { name: string }>, desde)
  let casaFora = 0
  if (!opts.incluirCasa && notas.length > 0) {
    const ids = Array.from(new Set(notas.map((n) => n.user_id).filter((x): x is string => !!x)))
    const interno = new Set<string>()
    for (let i = 0; i < ids.length; i += 100) {
      const part = ids.slice(i, i + 100)
      const p = await admin.from('profiles').select('id, email').in('id', part).limit(part.length)
      for (const row of (p.data ?? []) as Array<{ id: string; email: string | null }>) if (isInternalEmail(row.email)) interno.add(row.id)
    }
    const antes = notas.length
    notas = notas.filter((n) => !n.user_id || !interno.has(n.user_id))
    casaFora = antes - notas.length
  }
  return { notas, desde, casaFora }
}
