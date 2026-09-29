// KINEO-ADS-V2-2026-09-28 — utilidades de servidor das rotas /api/ads/v2/* (etapa 2).
//
// ownedFootage: cada arquivo citado pelo cliente é conferido no user_footage DO DONO e a URL usada é a do BANCO,
// nunca a do navegador (mesmo padrão de app/api/ads/render/route.ts). Foto e logo: JPG/PNG; cartão final: PNG.
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FOOTAGE_PUBLIC_PREFIX } from '@/lib/userFootage'
import { probeMp4DurationSeconds } from '@/lib/mp4Duration'

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
  /** KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — vídeo MP4/MOV (o tipo gravado pelo /api/footage vem dos primeiros bytes). */
  isVideo: boolean
}

/**
 * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 (revisão) — a URL gravada no user_footage mora MESMO na pasta do dono? A linha
 * pode ser escrita pelo próprio cliente (policy user_footage_insert_own), então "começa com a pasta" não basta:
 * `…/<meuId>/../<outroId>/x.mp4` começa com a pasta e o fetch/Creatomate normalizam o `..` para o arquivo de OUTRA
 * conta. Recusa qualquer segmento `.`/`..`, barra invertida e ponto/barra codificados, e confere a pasta de novo DEPOIS
 * de normalizar (new URL). Puro, exportado para o guardião.
 */
export function footageUrlInFolder(raw: unknown, folder: string): boolean {
  if (typeof raw !== 'string' || !/^https:\/\//i.test(raw) || !raw.startsWith(folder)) return false
  if (/\\|%2e|%2f|%5c/i.test(raw)) return false
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  const rawPath = raw.slice(raw.indexOf('/', 'https://'.length)).split(/[?#]/)[0]
  if (rawPath.split('/').some((seg) => seg === '.' || seg === '..')) return false
  return `${u.origin}${u.pathname}`.startsWith(folder)
}

/** Mapa id → arquivo do DONO (só os que estão na pasta pública dele). null = leitura falhou. */
export async function ownedFootage(admin: SupabaseClient, userId: string, ids: readonly string[]): Promise<Map<string, OwnedFootage> | null> {
  const unique = [...new Set(ids.filter(Boolean))]
  const out = new Map<string, OwnedFootage>()
  if (unique.length === 0) return out
  const { data, error } = await admin.from('user_footage').select('id, url, kind').eq('user_id', userId).in('id', unique)
  if (error) return null
  const prefix = `${FOOTAGE_PUBLIC_PREFIX().replace(/\/+$/, '')}/${userId}/`
  for (const r of (data ?? []) as { id: string; url: string; kind?: string | null }[]) {
    if (!footageUrlInFolder(r.url, prefix)) continue
    const isPng = /\.png(\?|#|$)/i.test(r.url)
    const isImage = isPng || /\.jpe?g(\?|#|$)/i.test(r.url)
    const isVideo = r.kind === 'video' && /\.(mp4|mov)(\?|#|$)/i.test(r.url)
    out.set(String(r.id).toLowerCase(), { url: r.url, isImage, isPng, isVideo })
  }
  return out
}

/** Primeira caixa ISO-BMFF de MP4/MOV (ftyp; MOV antigo pode abrir com moov/wide/free/skip/mdat/pnot). Puro. */
const MP4_MOV_FIRST_BOXES: readonly string[] = ['ftyp', 'moov', 'wide', 'free', 'skip', 'mdat', 'pnot']
export function isMp4OrMovHead(bytes: Uint8Array): boolean {
  if (!(bytes instanceof Uint8Array) || bytes.length < 16) return false
  const box = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
  return MP4_MOV_FIRST_BOXES.includes(box)
}

/**
 * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — duração MEDIDA do vídeo do cliente no bucket (mvhd, lib/mp4Duration.ts; o
 * arquivo tem no máximo 50 MB pelo /api/footage). null = não deu para medir (a tela cai no plano B: quadros viram fotos).
 * A duração do navegador nunca manda: o trecho da montagem é conferido contra ESTE número.
 */
export async function measureFootageVideo(url: string, timeoutMs = 25_000): Promise<number | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    // O tipo não vem da coluna `kind` (o cliente pode escrevê-la): os PRIMEIROS BYTES têm de ser de MP4/MOV.
    if (!isMp4OrMovHead(bytes)) return null
    const secs = probeMp4DurationSeconds(bytes)
    return typeof secs === 'number' && Number.isFinite(secs) && secs > 0 ? Math.round(secs * 1000) / 1000 : null
  } catch {
    return null
  }
}
