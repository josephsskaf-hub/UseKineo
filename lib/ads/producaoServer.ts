// KINEO-PRODUCAO-ADS-2026-10-01 — a porta das rotas /api/ads/producao/* (servidor). A régua pura mora em lib/ads/producao.ts.
// Ordem (falha fechada, tudo ANTES de qualquer gasto): login (401) → interruptor PRODUCAO_PUBLIC / conta da casa pela lista
// EXATA do Ads (404, como o /spaces) → acesso ao Studio Ads (passe/assinante/interna; 403).
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { PRODUCAO_PUBLIC, producaoVisibleFor } from '@/lib/ads/producao'

export const PRODUCAO_NO_STORE = { 'Cache-Control': 'no-store' }
export const producaoFail = (error: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...(extra ?? {}) }, { status, headers: PRODUCAO_NO_STORE })

export type ProducaoGate =
  | { ok: true; user: User; admin: Awaited<ReturnType<typeof loadAdsAccess>>['admin'] }
  | { ok: false; res: NextResponse }

export async function producaoGate(): Promise<ProducaoGate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, res: producaoFail('unauthenticated', 401) }
  if (!producaoVisibleFor(PRODUCAO_PUBLIC, isAdsInternalEmail(user.email))) return { ok: false, res: producaoFail('not_found', 404) }
  const { admin, reason } = await loadAdsAccess(user.id, user.email)
  if (adsGate(reason) !== 'ok') return { ok: false, res: producaoFail('no_access', 403) }
  return { ok: true, user, admin }
}
