// KINEO-LOGO-DA-MARCA-2026-10-01 — fundador 01/10: uma cliente quer o logo da EMPRESA dela no vídeo ("não é estrela
// de um rosto, é só um logo… para todos os motores… rápido, para ela conseguir usar").
//
// Desenho: o logo mora num caminho FIXO da conta (avatars/<uid>/brand-logo.<png|jpg>). A montagem (/api/compose)
// pergunta ao storage se ele existe — o cliente não precisa mandar nada, então vale também para o filme que termina
// com a aba fechada e para todos os motores (clássico e hollywood passam pelo mesmo compose). Remover = apagar o
// arquivo do próprio usuário. O `?v=` com a data de atualização fura o cache quando a pessoa troca o logo.
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

export const BRAND_LOGO_BUCKET = 'avatars'
export const BRAND_LOGO_BASENAME = 'brand-logo'
export const BRAND_LOGO_MAX_BYTES = 5 * 1024 * 1024
export const BRAND_LOGO_TYPES: Readonly<Record<string, 'png' | 'jpg'>> = { 'image/png': 'png', 'image/jpeg': 'jpg' }

let cached: SupabaseClient | null = null
export function brandLogoAdmin(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin is not configured.')
  cached = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return cached
}

/**
 * O elemento do logo para o Creatomate: faixa 10 (livre — os montadores usam 1–9), filme inteiro, canto SUPERIOR
 * ESQUERDO. Em 9:16 a caixa vai de x≈32 a 248 px e y≈77 a 230 px; a plaquinha da marca d'água (faixa 9) ocupa
 * x≈342–738 e a legenda começa em ~1350 px, então nada se toca. fit 'contain' preserva a proporção de qualquer logo.
 * Só URL https. Entra DEPOIS de montado (mesmo padrão do "sem legenda" do Ads): lib/compose (trava 8.2) não muda.
 */
export function brandLogoElement(url: string | null | undefined, totalDuration: unknown): Record<string, unknown> | null {
  const d = Number(totalDuration)
  if (typeof url !== 'string' || !/^https:\/\//.test(url) || !(d > 0)) return null
  return { type: 'image', track: 10, time: 0, duration: d, source: url, x: '14%', y: '8%', width: '20%', height: '8%', fit: 'contain' }
}

/** Acrescenta o logo a um source já montado (usa a duração do próprio source). Sem logo = source intacto. */
export function withBrandLogo<T extends Record<string, unknown>>(source: T, url: string | null): T {
  const els = (source as { elements?: unknown }).elements
  const el = brandLogoElement(url, (source as { duration?: unknown }).duration)
  if (el && Array.isArray(els)) els.push(el)
  return source
}

/** URL pública do logo da conta (com `?v=` de versão), ou null. Nunca lança: sem logo = filme como sempre. */
export async function findBrandLogoUrl(userId: string, admin: SupabaseClient = brandLogoAdmin()): Promise<string | null> {
  try {
    if (!userId) return null
    const { data, error } = await admin.storage.from(BRAND_LOGO_BUCKET).list(userId, { search: BRAND_LOGO_BASENAME, limit: 10 })
    if (error || !Array.isArray(data)) return null
    const file = data
      .filter((f) => f.name === `${BRAND_LOGO_BASENAME}.png` || f.name === `${BRAND_LOGO_BASENAME}.jpg`)
      .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))[0]
    if (!file) return null
    const { data: pub } = admin.storage.from(BRAND_LOGO_BUCKET).getPublicUrl(`${userId}/${file.name}`)
    if (!pub?.publicUrl) return null
    const v = Date.parse(String(file.updated_at ?? '')) || 0
    return `${pub.publicUrl}?v=${v}`
  } catch (err) {
    console.warn('[brand-logo] lookup failed (render continues without logo):', err instanceof Error ? err.message : String(err))
    return null
  }
}

/** Grava o logo (substitui o anterior, de qualquer extensão). Devolve a URL versionada. */
export async function saveBrandLogo(userId: string, bytes: Uint8Array, mime: string, admin: SupabaseClient = brandLogoAdmin()): Promise<string> {
  const ext = BRAND_LOGO_TYPES[mime]
  if (!ext) throw new Error('Only PNG or JPG logos are supported.')
  const other = ext === 'png' ? 'jpg' : 'png'
  await admin.storage.from(BRAND_LOGO_BUCKET).remove([`${userId}/${BRAND_LOGO_BASENAME}.${other}`]).catch(() => undefined)
  const { error } = await admin.storage
    .from(BRAND_LOGO_BUCKET)
    .upload(`${userId}/${BRAND_LOGO_BASENAME}.${ext}`, bytes, { contentType: mime, cacheControl: '60', upsert: true })
  if (error) throw new Error(`Logo upload failed: ${error.message}`)
  const url = await findBrandLogoUrl(userId, admin)
  if (!url) throw new Error('Logo stored but not found.')
  return url
}

/** Tira o logo dos próximos filmes (apaga só o arquivo de logo do próprio usuário). */
export async function removeBrandLogo(userId: string, admin: SupabaseClient = brandLogoAdmin()): Promise<void> {
  await admin.storage.from(BRAND_LOGO_BUCKET).remove([
    `${userId}/${BRAND_LOGO_BASENAME}.png`,
    `${userId}/${BRAND_LOGO_BASENAME}.jpg`,
  ])
}
