// KINEO-VALOR-NO-CHECKOUT-3110 — a prova social REAL perto do botão de pagar: quantos filmes ficaram prontos na Kineo nos
// últimos 30 dias e por quantas pessoas, com as contas internas FORA (lib/internalAccounts.ts — a mesma régua do admin).
// KINEO-COPIA-ORCAMENTO-CONTADOR-0211 — a contagem saiu daqui para lib/publicStatsServer.ts (readPublicStats), a ÚNICA leitura
// de todos os contadores públicos (selo do rodapé, faixa da home, /pricing). Esta rota só devolve a fatia de 30 dias.
//
// Só leitura, nenhum dado pessoal sai: a resposta é { films, creators, window_days, line }. Erro de leitura = { films: null }
// e a tela fica muda — nunca um número inventado, nunca "0" fingindo verdade.
import { NextResponse } from 'next/server'
import { readPublicStats } from '@/lib/publicStatsServer'
import { FILMS_MADE_WINDOW_DAYS, filmsMadeLine } from '@/lib/valorNoCheckout'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

type FilmsMadeBody = { films: number | null; creators: number | null; window_days: number; line: string | null }

const EMPTY: FilmsMadeBody = { films: null, creators: null, window_days: FILMS_MADE_WINDOW_DAYS, line: null }

export async function GET() {
  const stats = await readPublicStats()
  if (!stats) return NextResponse.json(EMPTY, { headers: { 'Cache-Control': 'no-store' } })
  const films = stats.films30d
  const creators = stats.creators30d
  const body: FilmsMadeBody = { films, creators, window_days: FILMS_MADE_WINDOW_DAYS, line: filmsMadeLine({ films, creators }) }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
