// KINEO-COPIA-ORCAMENTO-CONTADOR-0211 — a ÚNICA leitura dos contadores públicos (selo do rodapé, faixa da home, /pricing,
// parede de upgrade). Herda a régua do KINEO-VALOR-NO-CHECKOUT-3110 (antes só no /api/films-made), a mais correta das duas:
//   · filme = linha de `videos` com status 'completed' (falha e render em andamento não contam);
//   · contas internas FORA (lib/internalAccounts.ts — a mesma régua do admin), em filmes E em contas;
//   · paginado de verdade (readAll): o PostgREST corta em 1000 linhas SEM erro — a lição do painel de 28/08.
// /api/stats/public e /api/films-made chamam esta função; nenhum dos dois conta nada por conta própria.
// Só leitura, chave de serviço no servidor, nenhum dado pessoal sai. Erro de leitura = null e a tela fica muda — nunca um
// número inventado, nunca "0" fingindo verdade. Cache de 1 h na memória da instância (as rotas ainda têm o do CDN).
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isInternalEmail } from '@/lib/internalAccounts'
import { readAll } from '@/lib/supabase/readAll'
import { FILMS_MADE_WINDOW_DAYS } from '@/lib/valorNoCheckout'
import type { PublicStats } from '@/lib/publicStats'

const TTL_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
let cached: { at: number; stats: PublicStats } | null = null

async function countPublicStats(): Promise<PublicStats | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const admin = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const [films, profiles] = await Promise.all([
    readAll<{ id: string; user_id: string | null; created_at: string | null }>(
      () => admin.from('videos').select('id,user_id,created_at').eq('status', 'completed') as never,
      { route: '/api/stats/public', table: 'videos', key: 'id' },
    ),
    readAll<{ id: string; email: string | null }>(
      () => admin.from('profiles').select('id,email') as never,
      { route: '/api/stats/public', table: 'profiles', key: 'id' },
    ),
  ])
  if (films.error || !films.data || profiles.error || !profiles.data) return null

  const internal = new Set<string>()
  for (const p of profiles.data) if (isInternalEmail(p.email)) internal.add(p.id)
  const accounts = profiles.data.length - internal.size

  const now = Date.now()
  const since7 = now - 7 * DAY_MS
  const since30 = now - FILMS_MADE_WINDOW_DAYS * DAY_MS
  const external = films.data.filter((r) => typeof r.user_id === 'string' && r.user_id.length > 0 && !internal.has(r.user_id))
  const at = (r: { created_at: string | null }) => Date.parse(String(r.created_at ?? ''))
  const last7 = external.filter((r) => at(r) >= since7)
  const last30 = external.filter((r) => at(r) >= since30)

  return {
    films: external.length,
    films7d: last7.length,
    films30d: last30.length,
    creators30d: new Set(last30.map((r) => r.user_id)).size,
    accounts,
  }
}

/** Os números públicos, da régua única. null = erro de leitura (a tela não mostra nada). */
export async function readPublicStats(): Promise<PublicStats | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.stats
  try {
    const stats = await countPublicStats()
    if (stats) cached = { at: Date.now(), stats }
    return stats
  } catch {
    return null
  }
}
