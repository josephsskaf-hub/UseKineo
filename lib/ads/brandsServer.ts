// KINEO-ADS-MARCAS-1510 — a parte de BANCO das marcas do Studio Ads (a regra pura mora em lib/ads/brands.ts).
//
// Sempre com a chave de serviço, DEPOIS do getUser + adsGate da rota, e sempre filtrando por owner_id = o DONO do workspace
// (lib/ads/workspace.ts: a própria conta, ou o dono do Business para o membro da equipe). O corpo nunca escolhe o dono.
//
// TABELA AUSENTE (migration não aplicada) = { ready: false }: a rota responde 200 com ready:false (GET) ou 503 'not_ready'
// (escrita), e a tela segue com o kit único de sempre. Nada aqui cobra crédito, cria pedido ou chama fornecedor.
import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingAdsTable } from '@/lib/ads/serverAccess'
import { ownedFootage } from '@/lib/ads/v2Server'
import { AD_BRANDS_TABLE, AD_BRAND_COLUMNS, adBrandFromLegacyKit, isAdBrandId, type AdBrandFields, type AdBrandView } from '@/lib/ads/brands'

type Row = AdBrandFields & { id: string; owner_id: string; from_legacy_kit?: boolean | null }

/** Coluna/tabela ausente = migration não aplicada (42P01/PGRST205 tabela; 42703/PGRST204 coluna). */
export const isMissingBrandSchema = (code: string | undefined) => isMissingAdsTable(code) || code === '42703' || code === 'PGRST204'

function view(r: Row, logos: Map<string, { url: string; isImage: boolean }> | null): AdBrandView {
  const logo = r.logo_footage_id ? logos?.get(String(r.logo_footage_id).toLowerCase()) : undefined
  const logoOk = !!logo && logo.isImage
  return {
    id: r.id,
    name: r.name,
    logo_footage_id: logoOk ? r.logo_footage_id : null,
    logo_url: logoOk ? logo!.url : null,
    color: r.color ?? null,
    color2: r.color2 ?? null,
    price: r.price ?? null,
    contact: r.contact ?? null,
    website: r.website ?? null,
    voice_language: r.voice_language ?? null,
    pronounce_word: r.pronounce_word ?? null,
    pronounce_say: r.pronounce_say ?? null,
    notes: r.notes ?? null,
  }
}

/** As marcas VIVAS do workspace (nome A→Z), com o logo conferido no user_footage DO DONO. */
export async function listAdBrands(admin: SupabaseClient, ownerId: string): Promise<{ ready: false } | { ready: true; brands: AdBrandView[] } | { error: true }> {
  const q = await admin.from(AD_BRANDS_TABLE).select(AD_BRAND_COLUMNS).eq('owner_id', ownerId).is('archived_at', null).order('name', { ascending: true }).limit(200)
  if (q.error) return isMissingBrandSchema(q.error.code) ? { ready: false } : { error: true }
  const rows = (q.data ?? []) as unknown as Row[]
  const ids = rows.map((r) => r.logo_footage_id).filter((x): x is string => !!x)
  const logos = ids.length ? await ownedFootage(admin, ownerId, ids) : new Map()
  return { ready: true, brands: rows.map((r) => view(r, logos)) }
}

/**
 * O kit antigo (ads_brand_kits) do dono vira a 1ª marca — só quando o workspace ainda NÃO tem marca nenhuma. Idempotente: o
 * índice único ad_brands_one_legacy (owner_id where from_legacy_kit) recusa a 2ª cópia (23505 = já migrado, segue). O kit
 * antigo fica intocado (nada é apagado). Devolve true quando criou.
 */
export async function migrateLegacyKit(admin: SupabaseClient, ownerId: string, actorId: string): Promise<boolean> {
  try {
    const k = await admin.from('ads_brand_kits').select('logo_footage_id, color, business, price, contact').eq('user_id', ownerId).maybeSingle()
    if (k.error || !k.data) return false
    const fields = adBrandFromLegacyKit(k.data as Record<string, string | null>)
    if (!fields) return false
    const ins = await admin.from(AD_BRANDS_TABLE).insert({ ...fields, owner_id: ownerId, created_by: actorId === ownerId ? null : actorId, from_legacy_kit: true })
    return !ins.error
  } catch {
    return false
  }
}

/** A marca existe, é DESTE workspace e está viva? (para o pedido gravar brand_id e para editar/arquivar). */
export async function loadOwnedBrand(admin: SupabaseClient, ownerId: string, brandId: string): Promise<{ ready: false } | { ready: true; row: Row | null } | { error: true }> {
  if (!isAdBrandId(brandId)) return { ready: true, row: null }
  const q = await admin.from(AD_BRANDS_TABLE).select(AD_BRAND_COLUMNS).eq('id', brandId.toLowerCase()).eq('owner_id', ownerId).is('archived_at', null).maybeSingle()
  if (q.error) return isMissingBrandSchema(q.error.code) ? { ready: false } : { error: true }
  return { ready: true, row: (q.data as unknown as Row | null) ?? null }
}

/**
 * O brand_id que o pedido NOVO grava (POST /api/ads/v2/orders): só uma marca viva DO DONO; qualquer outra coisa (ausente,
 * id de outra conta, arquivada, tabela ainda não aplicada, erro de leitura) = null — e o pedido nasce como sempre, sem a
 * coluna no insert. Nunca recusa o anúncio por causa da marca.
 */
export async function orderBrandId(admin: SupabaseClient, ownerId: string, raw: unknown): Promise<string | null> {
  if (!isAdBrandId(raw)) return null
  try {
    const r = await loadOwnedBrand(admin, ownerId, raw)
    return 'row' in r && r.row ? r.row.id : null
  } catch {
    return null
  }
}
