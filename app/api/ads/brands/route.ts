// KINEO-ADS-MARCAS-1510 — as MARCAS (clientes) do Studio Ads: GET lista, POST cria, PATCH edita, DELETE arquiva.
//
// Portas: as mesmas do /api/ads/brand-kit — login (getUser); adsGate 'ok' OU a amostra grátis aberta; adsV2Visible. O dono é
// SEMPRE o do workspace da sessão (loadAdsAccess { workspace: true }): conta sozinha = ela; membro ativo de um Business = o
// dono do Business, e todas as vagas veem e usam as mesmas marcas. O corpo nunca traz owner_id (sanitizeAdBrand recusa).
// O logo só entra se for imagem do user_footage DO DONO (ownedFootage, a mesma conferência do /plan e do kit).
// Regras (lib/ads/brands.ts): teto de marcas vivas (Business/interna 50; resto 1), nome único por workspace, arquivar só o
// dono. Na 1ª leitura de um workspace SEM marca, o kit antigo (ads_brand_kits) vira a 1ª marca (migrateLegacyKit).
//
// O QUE ESTA ROTA NUNCA FAZ: cobrar crédito, criar ou mexer em pedido, chamar fornecedor, apagar linha.
// Tabela não aplicada = GET 200 { ready: false, brands: [] } e escrita 503 'not_ready' — a tela volta ao kit único.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adsGate, adsSampleOpen, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { ownedFootage, v2Fail, v2Json } from '@/lib/ads/v2Server'
import { writeServerEvent } from '@/lib/serverEvents'
import { AD_BRANDS_TABLE, adBrandCan, adBrandCanCreate, adBrandLimit, adBrandNameTaken, isAdBrandId, sanitizeAdBrand } from '@/lib/ads/brands'
import { isMissingBrandSchema, listAdBrands, loadOwnedBrand, migrateLegacyKit } from '@/lib/ads/brandsServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

async function gateFor() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fail: v2Fail('unauthenticated', 401) } as const
  const { admin, reason, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true })
  const ownerId: string = ws.ownerId ?? user.id
  const role: 'owner' | 'member' = ws.role === 'member' ? 'member' : 'owner'
  const gate = adsGate(reason)
  const sample = gate === 'no_access' && (await adsSampleOpen(admin, ownerId, reason))
  if (gate !== 'ok' && !sample) return { fail: v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403) } as const
  if (!adsV2Visible(user.email)) return { fail: v2Fail('v2_closed', 403) } as const
  const limit = adBrandLimit(ws.ownerPlan, reason === 'internal')
  return { user, admin, ownerId, role, limit } as const
}

export async function GET() {
  try {
    const g = await gateFor()
    if ('fail' in g) return g.fail
    let r = await listAdBrands(g.admin, g.ownerId)
    if ('error' in r) return v2Fail('brands_failed', 502)
    if (!r.ready) return v2Json({ ready: false, brands: [], limit: g.limit, role: g.role, can_create: false })
    if (r.brands.length === 0 && (await migrateLegacyKit(g.admin, g.ownerId, g.user.id))) {
      const again = await listAdBrands(g.admin, g.ownerId)
      if ('ready' in again && again.ready) r = again
    }
    const brands = r.ready ? r.brands : []
    return v2Json({ ready: true, brands, limit: g.limit, role: g.role, can_create: adBrandCanCreate(brands.length, g.limit) })
  } catch (e) {
    console.warn('[ads/brands GET] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('brands_failed', 502)
  }
}

async function logoOk(admin: Parameters<typeof ownedFootage>[0], ownerId: string, id: string | null | undefined): Promise<boolean | null> {
  if (!id) return true
  const owned = await ownedFootage(admin, ownerId, [id])
  if (!owned) return null
  return !!owned.get(id)?.isImage
}

export async function POST(req: NextRequest) {
  try {
    const g = await gateFor()
    if ('fail' in g) return g.fail
    if (!adBrandCan(g.role, 'create')) return v2Fail('forbidden', 403)
    const parsed = sanitizeAdBrand(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const v = parsed.value
    const list = await listAdBrands(g.admin, g.ownerId)
    if ('error' in list) return v2Fail('brands_failed', 502)
    if (!list.ready) return v2Fail('not_ready', 503)
    if (!adBrandCanCreate(list.brands.length, g.limit)) return v2Fail('brand_limit', 409, { limit: g.limit })
    if (adBrandNameTaken(list.brands, v.name ?? '')) return v2Fail('brand_name_taken', 409)
    const lo = await logoOk(g.admin, g.ownerId, v.logo_footage_id)
    if (lo === null) return v2Fail('brands_failed', 502)
    if (!lo) return v2Fail('bad_logo', 400)
    const ins = await g.admin
      .from(AD_BRANDS_TABLE)
      .insert({ ...v, owner_id: g.ownerId, created_by: g.role === 'member' ? g.user.id : null })
      .select('id')
      .maybeSingle()
    if (ins.error) return isMissingBrandSchema(ins.error.code) ? v2Fail('not_ready', 503) : ins.error.code === '23505' ? v2Fail('brand_name_taken', 409) : v2Fail('brands_failed', 502)
    const id = String((ins.data as { id: string }).id)
    await writeServerEvent({ name: 'ads_brand_created', userId: g.user.id, path: '/api/ads/brands', metadata: { brand_id: id, owner_id: g.ownerId, role: g.role, count: list.brands.length + 1 } })
    return v2Json({ id }, 201)
  } catch (e) {
    console.warn('[ads/brands POST] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('brands_failed', 502)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const g = await gateFor()
    if ('fail' in g) return g.fail
    if (!adBrandCan(g.role, 'edit')) return v2Fail('forbidden', 403)
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const id = body && typeof body === 'object' ? body.id : null
    if (!isAdBrandId(id)) return v2Fail('bad_brand_id', 400)
    const rest = { ...(body as Record<string, unknown>) }
    delete rest.id
    const parsed = sanitizeAdBrand(rest, { partial: true })
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const v = parsed.value
    const cur = await loadOwnedBrand(g.admin, g.ownerId, id)
    if ('error' in cur) return v2Fail('brands_failed', 502)
    if (!cur.ready) return v2Fail('not_ready', 503)
    if (!cur.row) return v2Fail('brand_not_found', 404)
    if (v.name) {
      const list = await listAdBrands(g.admin, g.ownerId)
      if ('error' in list) return v2Fail('brands_failed', 502)
      if (list.ready && adBrandNameTaken(list.brands, v.name, cur.row.id)) return v2Fail('brand_name_taken', 409)
    }
    if (v.pronounce_say && !v.pronounce_word && v.name === undefined) {
      // a pronúncia é conferida contra o nome que fica (o de agora)
      const again = sanitizeAdBrand({ name: cur.row.name, pronounce_say: v.pronounce_say })
      if (!again.ok) return v2Fail(again.error, 400)
    }
    const lo = await logoOk(g.admin, g.ownerId, v.logo_footage_id)
    if (lo === null) return v2Fail('brands_failed', 502)
    if (!lo) return v2Fail('bad_logo', 400)
    if (!Object.keys(v).length) return v2Json({ id: cur.row.id })
    const upd = await g.admin.from(AD_BRANDS_TABLE).update(v).eq('id', cur.row.id).eq('owner_id', g.ownerId).is('archived_at', null).select('id').maybeSingle()
    if (upd.error) return isMissingBrandSchema(upd.error.code) ? v2Fail('not_ready', 503) : upd.error.code === '23505' ? v2Fail('brand_name_taken', 409) : v2Fail('brands_failed', 502)
    if (!upd.data) return v2Fail('brand_not_found', 404)
    return v2Json({ id: cur.row.id })
  } catch (e) {
    console.warn('[ads/brands PATCH] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('brands_failed', 502)
  }
}

/** Arquivar (só o dono): a marca sai da lista e do seletor; a linha fica (os pedidos antigos continuam apontando para ela). */
export async function DELETE(req: NextRequest) {
  try {
    const g = await gateFor()
    if ('fail' in g) return g.fail
    if (!adBrandCan(g.role, 'archive')) return v2Fail('forbidden', 403)
    const id = req.nextUrl.searchParams.get('id')
    if (!isAdBrandId(id)) return v2Fail('bad_brand_id', 400)
    const upd = await g.admin.from(AD_BRANDS_TABLE).update({ archived_at: new Date().toISOString() }).eq('id', id.toLowerCase()).eq('owner_id', g.ownerId).is('archived_at', null).select('id').maybeSingle()
    if (upd.error) return isMissingBrandSchema(upd.error.code) ? v2Fail('not_ready', 503) : v2Fail('brands_failed', 502)
    if (!upd.data) return v2Fail('brand_not_found', 404)
    await writeServerEvent({ name: 'ads_brand_archived', userId: g.user.id, path: '/api/ads/brands', metadata: { brand_id: id.toLowerCase(), owner_id: g.ownerId } })
    return v2Json({ ok: true })
  } catch (e) {
    console.warn('[ads/brands DELETE] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('brands_failed', 502)
  }
}
