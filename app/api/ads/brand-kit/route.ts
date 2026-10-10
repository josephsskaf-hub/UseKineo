// KINEO-ADS-UX-MARCA-2026-10-10 — o KIT DA MARCA do Studio Ads: logo, cor, nome, preço e contato do cartão final, salvos
// por conta (tabela public.ads_brand_kits, migrations_pending/2026-10-10_brand_kit.sql). A tela do modo simples lê na
// abertura (preenche só o que a pessoa ainda não mexeu) e grava depois que o anúncio começou ("Save as my brand kit").
//
// Portas: as mesmas das rotas /api/ads/v2/* — login (getUser); adsGate 'ok' OU a amostra grátis aberta (adsSampleOpen);
// adsV2Visible. O dono é SEMPRE o da sessão: o corpo nunca traz user_id (sanitizeBrandKit recusa chave extra), a leitura e
// a escrita filtram por uid (KINEO-EQUIPE-BUSINESS-2026-10-10: o dono do workspace — a própria conta, ou o dono do Business
// para o membro da equipe, que usa e grava o kit DA EMPRESA), e o logo só entra se for um arquivo de imagem do user_footage DO DONO (ownedFootage,
// a mesma conferência do /plan). A tabela não tem policy nenhuma: o navegador não alcança o kit de ninguém pelo PostgREST.
//
// O QUE ESTA ROTA NUNCA FAZ: cobrar crédito, criar ou mexer em pedido, chamar fornecedor. Tabela não aplicada = GET
// { kit: null, ready: false } (200) e PUT 503 'not_ready' — a tela ignora as duas.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adsGate, adsSampleOpen, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { ownedFootage, v2Fail, v2Json } from '@/lib/ads/v2Server'
import { sanitizeBrandKit, type AdsBrandKit } from '@/lib/ads/v2SimpleUx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const KIT_COLUMNS = 'logo_footage_id, color, business, price, contact'

/** Login + portão do Studio Ads (pago ou amostra) + v2. null = pode seguir; senão a resposta de recusa. */
async function gateFor() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fail: v2Fail('unauthenticated', 401) } as const
  const { admin, reason, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true })
  const uid: string = ws.ownerId ?? user.id // KINEO-EQUIPE-BUSINESS-2026-10-10 — workspace: membro do Business age na conta do DONO (stub/chamador antigo = pessoal)
  const gate = adsGate(reason)
  const sample = gate === 'no_access' && (await adsSampleOpen(admin, uid, reason))
  if (gate !== 'ok' && !sample) return { fail: v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403) } as const
  if (!adsV2Visible(user.email)) return { fail: v2Fail('v2_closed', 403) } as const
  return { user, admin, uid } as const
}

export async function GET() {
  try {
    const g = await gateFor()
    if ('fail' in g) return g.fail
    const { admin, uid } = g
    const { data, error } = await admin.from('ads_brand_kits').select(KIT_COLUMNS).eq('user_id', uid).maybeSingle()
    if (error) return isMissingAdsTable(error.code) ? v2Json({ kit: null, logo_url: null, ready: false }) : v2Fail('brand_kit_failed', 502)
    if (!data) return v2Json({ kit: null, logo_url: null, ready: true })
    const kit = data as AdsBrandKit
    let logoUrl: string | null = null
    if (kit.logo_footage_id) {
      const owned = await ownedFootage(admin, uid, [kit.logo_footage_id])
      const f = owned?.get(String(kit.logo_footage_id).toLowerCase())
      logoUrl = f && f.isImage ? f.url : null
    }
    return v2Json({ kit: { ...kit, logo_footage_id: logoUrl ? kit.logo_footage_id : null }, logo_url: logoUrl, ready: true })
  } catch (e) {
    console.warn('[ads/brand-kit GET] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('brand_kit_failed', 502)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const g = await gateFor()
    if ('fail' in g) return g.fail
    const { admin, uid } = g
    const parsed = sanitizeBrandKit(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const kit = parsed.value
    if (kit.logo_footage_id) {
      const owned = await ownedFootage(admin, uid, [kit.logo_footage_id])
      if (!owned) return v2Fail('brand_kit_failed', 502)
      const f = owned.get(kit.logo_footage_id)
      if (!f || !f.isImage) return v2Fail('bad_logo', 400)
    }
    const { error } = await admin.from('ads_brand_kits').upsert({ user_id: uid, ...kit }, { onConflict: 'user_id' })
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('brand_kit_failed', 502)
    return v2Json({ ok: true })
  } catch (e) {
    console.warn('[ads/brand-kit PUT] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('brand_kit_failed', 502)
  }
}
