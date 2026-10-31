// KINEO-VALOR-NO-CHECKOUT-3110 — a prova social REAL perto do botão de pagar: quantos filmes ficaram prontos na Kineo nos
// últimos 30 dias e por quantas pessoas, com as contas internas FORA (lib/internalAccounts.ts — a mesma régua do admin).
// Medido no banco em 31/10: 474 filmes concluídos por 424 pessoas (658 com a casa; a casa = 166 fica fora).
//
// Só leitura, chave de serviço no servidor, nenhum dado pessoal sai: a resposta é { films, creators, window_days, line }.
// Cache: 1 h no servidor (memória da instância + CDN s-maxage). Erro de leitura = { films: null } e a tela fica muda — nunca
// um número inventado, nunca "0" fingindo verdade.
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isInternalEmail } from '@/lib/internalAccounts'
import { readAll } from '@/lib/supabase/readAll'
import { FILMS_MADE_WINDOW_DAYS, filmsMadeLine } from '@/lib/valorNoCheckout'

export const dynamic = 'force-dynamic'

const TTL_MS = 60 * 60 * 1000
let cached: { at: number; body: FilmsMadeBody } | null = null

type FilmsMadeBody = { films: number | null; creators: number | null; window_days: number; line: string | null }

const EMPTY: FilmsMadeBody = { films: null, creators: null, window_days: FILMS_MADE_WINDOW_DAYS, line: null }

async function countFilms(): Promise<FilmsMadeBody> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return EMPTY
  const admin = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const since = new Date(Date.now() - FILMS_MADE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  // Paginado de verdade (readAll): o PostgREST corta em 1000 linhas SEM erro — a lição do painel de 28/08.
  const { data: rows, error } = await readAll<{ id: string; user_id: string | null }>(
    () => admin.from('videos').select('id,user_id').eq('status', 'completed').gte('created_at', since) as never,
    { route: '/api/films-made', table: 'videos', key: 'id' },
  )
  if (error || !rows) return EMPTY
  const owners = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => typeof id === 'string' && id.length > 0))]
  const internal = new Set<string>()
  for (let i = 0; i < owners.length; i += 200) {
    const slice = owners.slice(i, i + 200)
    const { data: profiles, error: pErr } = await admin.from('profiles').select('id,email').in('id', slice)
    if (pErr) return EMPTY
    for (const p of (profiles ?? []) as Array<{ id: string; email: string | null }>) if (isInternalEmail(p.email)) internal.add(p.id)
  }
  const external = rows.filter((r) => typeof r.user_id === 'string' && !internal.has(r.user_id))
  const films = external.length
  const creators = new Set(external.map((r) => r.user_id)).size
  return { films, creators, window_days: FILMS_MADE_WINDOW_DAYS, line: filmsMadeLine({ films, creators }) }
}

export async function GET() {
  const headers = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
  if (cached && Date.now() - cached.at < TTL_MS) return NextResponse.json(cached.body, { headers })
  try {
    const body = await countFilms()
    if (body.films !== null) cached = { at: Date.now(), body }
    return NextResponse.json(body, { headers: body.films !== null ? headers : { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(EMPTY, { headers: { 'Cache-Control': 'no-store' } })
  }
}
