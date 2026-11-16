// KINEO-PLACAR-FILME-GRATIS-1611 — placar diário do 1º filme grátis (CEO 16/11, Semana 1). Só administrador.
// A conta está em lib/admin/placarFilmeGratis.ts e a leitura em lib/admin/placarFilmeGratisLeitura.ts (sem RPC nova).
// Grátis = conta no plano 'free' hoje, sem contas internas (mesma régua da partida da CEO, 16/11 19:45: 45 filmes, 6 com ≥ 8).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { createLiveCache } from '@/lib/admin/liveCache'
import { montarPlacar, type PlacarFilmeGratis } from '@/lib/admin/placarFilmeGratis'
import { lerFilmesDoPlacar } from '@/lib/admin/placarFilmeGratisLeitura'

export const dynamic = 'force-dynamic'
const cache = createLiveCache<PlacarFilmeGratis>(5 * 60_000)

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = serviceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  try {
    const data = await cache.get(async () => { const agora = Date.now(); return montarPlacar(await lerFilmesDoPlacar(admin, agora), agora) })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    console.warn('[admin/placar-filme-gratis] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 502 })
  }
}
