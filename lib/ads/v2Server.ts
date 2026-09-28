// KINEO-ADS-V2-2026-09-28 — utilidades de servidor das rotas /api/ads/v2/* (etapa 2).
//
// ownedFootage: cada arquivo citado pelo cliente é conferido no user_footage DO DONO e a URL usada é a do BANCO,
// nunca a do navegador (mesmo padrão de app/api/ads/render/route.ts). Foto e logo: JPG/PNG; cartão final: PNG.
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FOOTAGE_PUBLIC_PREFIX } from '@/lib/userFootage'

export const ADS_V2_NO_STORE = { 'Cache-Control': 'no-store' } as const

export function v2Json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: ADS_V2_NO_STORE })
}
export function v2Fail(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: ADS_V2_NO_STORE })
}

export interface OwnedFootage {
  url: string
  isImage: boolean
  isPng: boolean
}

/** Mapa id → arquivo do DONO (só os que estão na pasta pública dele). null = leitura falhou. */
export async function ownedFootage(admin: SupabaseClient, userId: string, ids: readonly string[]): Promise<Map<string, OwnedFootage> | null> {
  const unique = [...new Set(ids.filter(Boolean))]
  const out = new Map<string, OwnedFootage>()
  if (unique.length === 0) return out
  const { data, error } = await admin.from('user_footage').select('id, url').eq('user_id', userId).in('id', unique)
  if (error) return null
  const prefix = `${FOOTAGE_PUBLIC_PREFIX().replace(/\/+$/, '')}/${userId}/`
  for (const r of (data ?? []) as { id: string; url: string }[]) {
    if (typeof r.url !== 'string' || !r.url.startsWith(prefix) || !/^https:\/\//i.test(r.url)) continue
    const isPng = /\.png(\?|#|$)/i.test(r.url)
    const isImage = isPng || /\.jpe?g(\?|#|$)/i.test(r.url)
    out.set(String(r.id).toLowerCase(), { url: r.url, isImage, isPng })
  }
  return out
}
