// KINEO-SHOPIFY-2026-10-13 (etapa 2) — a CONTA KINEO DA LOJA e o acesso ao Studio Ads que ela tem.
//
// Por que existe: o requisito 2.2.2 da App Store reprova app que manda o lojista para fora do admin. O anúncio nasce DENTRO da
// tela embutida, na conta Kineo vinculada à loja (shopify_shops.owner_user_id), sem cadastro nem senha.
//
// A conta: e-mail = o do dono da loja (Admin API `shop.email`). Já existe conta com o e-mail → VINCULA (nunca duplica), mas SÓ
// quando a Shopify prova que quem abriu é dono daquele e-mail (token online: associated_user com email_verified e o MESMO
// e-mail) — sem a prova, quem cria uma loja com o e-mail de outra pessoa gastaria os créditos e veria os vídeos dela. Não existe →
// CRIA (auth.admin.createUser, sem senha; o gatilho handle_new_user cria o perfil com 0 crédito e plano free). A regra mora em
// lib/shopify/core.ts decideShopAccount (pura, executada pelo guardião); aqui só a rede e o banco.
// O vínculo é CONDICIONAL (owner_user_id is null): duas aberturas ao mesmo tempo nunca vinculam duas contas.
//
// O acesso: o plano da Shopify NUNCA escreve profiles.plan (a conta pode ser de alguém que já assina pela Stripe; trocar o plano
// dela quebraria o site). O acesso ao Studio Ads da conta é o de sempre (loadAdsAccess, conta pessoal) e, se ele for 'none', o plano
// PAGO ativo da loja vale como 'subscriber' — fora isso, a conta da loja é free e só abre a amostra grátis (lib/ads/sample.ts).
import type { SupabaseClient } from '@supabase/supabase-js'
import { decideShopAccount, normalizeEmail, onlineTokenExchangeBody, parseAssociatedUser, redactForLog, testShopAllowed, type ShopifyCreds } from '@/lib/shopify/core'
import { SHOPIFY_SHOPS_TABLE, adminGraphql, postTokenRaw } from '@/lib/shopify/server'
import { loadAdsAccess, type AdsAccessLoad } from '@/lib/ads/serverAccess'
import { writeServerEvent } from '@/lib/serverEvents'

export interface ShopLink {
  shop_domain: string
  owner_user_id: string | null
  shop_gid: string | null
  partner_development: boolean | null
  plan_handle: string | null
  plan_status: string
  plan_checked_at: string | null
  scopes: string | null
}

const LINK_COLUMNS = 'shop_domain, owner_user_id, shop_gid, partner_development, plan_handle, plan_status, plan_checked_at, scopes'

/** A linha da loja com as colunas da etapa 2. null = leitura falhou (migration da etapa 2 ausente = 'not_ready' no chamador). */
export async function loadShopLink(admin: SupabaseClient, shop: string): Promise<{ row: ShopLink | null; error: boolean }> {
  const r = await admin.from(SHOPIFY_SHOPS_TABLE).select(LINK_COLUMNS).eq('shop_domain', shop).maybeSingle()
  if (r.error) {
    console.warn('[shopify] leitura do vínculo falhou', redactForLog({ shop, code: r.error.code ?? null }))
    return { row: null, error: true }
  }
  return { row: (r.data as ShopLink | null) ?? null, error: false }
}

const SHOP_QUERY = `query KineoShop { shop { id email name myshopifyDomain plan { partnerDevelopment } } }`
interface ShopData {
  shop: { id: string; email: string | null; name: string; myshopifyDomain: string; plan: { partnerDevelopment: boolean } | null } | null
}

export type ShopAccountResult =
  | { ok: true; userId: string; email: string | null; link: ShopLink; created: boolean }
  | { ok: false; error: 'not_ready' | 'shopify_unavailable' | 'no_shop_email' | 'unverified_owner' | 'account_failed' }

/** O e-mail de login da conta (auth), para adsV2Visible e a régua da conta interna. Falha = null. */
async function authEmail(admin: SupabaseClient, userId: string): Promise<string | null> {
  const r = await admin.auth.admin.getUserById(userId).catch(() => null)
  return normalizeEmail(r?.data?.user?.email ?? null)
}

/** Conta Kineo da loja: a vinculada, ou cria/vincula agora. Nunca duplica, nunca vincula sem a prova do e-mail. */
export async function ensureShopAccount(admin: SupabaseClient, creds: ShopifyCreds, shop: string, sessionToken: string, accessToken: string): Promise<ShopAccountResult> {
  const first = await loadShopLink(admin, shop)
  if (first.error || !first.row) return { ok: false, error: 'not_ready' }
  if (first.row.owner_user_id) return { ok: true, userId: first.row.owner_user_id, email: await authEmail(admin, first.row.owner_user_id), link: first.row, created: false }

  const data = await adminGraphql<ShopData>(shop, accessToken, SHOP_QUERY)
  if (!data?.shop) return { ok: false, error: 'shopify_unavailable' }
  const opener = parseAssociatedUser(await postTokenRaw(shop, onlineTokenExchangeBody(creds, sessionToken)))
  const shopEmail = normalizeEmail(data.shop.email)
  let existing: string | null = null
  if (shopEmail) {
    const p = await admin.from('profiles').select('id').eq('email', shopEmail).limit(2)
    if (p.error) return { ok: false, error: 'account_failed' }
    const rows = (p.data ?? []) as { id: string }[]
    if (rows.length > 1) return { ok: false, error: 'account_failed' }
    existing = rows[0]?.id ?? null
  }
  let decision = decideShopAccount({ shopEmail, opener, existingUserId: existing })
  let userId: string | null = null
  let created = false
  if (decision.action === 'create') {
    const c = await admin.auth.admin.createUser({
      email: decision.email,
      email_confirm: decision.confirmed,
      app_metadata: { kineo_source: 'shopify', shopify_shop: shop },
      user_metadata: { source: 'shopify' },
    })
    if (c.data?.user?.id) {
      userId = c.data.user.id
      created = true
    } else {
      // Corrida (o e-mail entrou agora por outro caminho): a conta existe — vale a regra do VÍNCULO, com a mesma prova.
      const again = await admin.from('profiles').select('id').eq('email', decision.email).limit(2)
      const rows = (again.data ?? []) as { id: string }[]
      if (again.error || rows.length !== 1) return { ok: false, error: 'account_failed' }
      decision = decideShopAccount({ shopEmail, opener, existingUserId: rows[0].id })
    }
  }
  if (decision.action === 'refuse') {
    await writeServerEvent({ name: 'shopify_account_refused', path: '/api/shopify', metadata: { shop, reason: decision.reason } })
    return { ok: false, error: decision.reason }
  }
  if (decision.action === 'link') userId = decision.userId
  if (!userId) return { ok: false, error: 'account_failed' }

  const upd = await admin
    .from(SHOPIFY_SHOPS_TABLE)
    .update({ owner_user_id: userId, shop_gid: data.shop.id, partner_development: data.shop.plan?.partnerDevelopment === true, updated_at: new Date().toISOString() })
    .eq('shop_domain', shop)
    .is('owner_user_id', null)
    .select('shop_domain')
    .maybeSingle()
  if (upd.error) return { ok: false, error: 'account_failed' }
  const now = await loadShopLink(admin, shop)
  if (now.error || !now.row?.owner_user_id) return { ok: false, error: 'account_failed' }
  const winner = now.row.owner_user_id
  if (upd.data) await writeServerEvent({ name: 'shopify_account_linked', userId: winner, path: '/api/shopify', metadata: { shop, mode: created ? 'created' : 'linked', confirmed: decision.action === 'create' ? decision.confirmed : true } })
  return { ok: true, userId: winner, email: await authEmail(admin, winner), link: now.row, created: created && winner === userId }
}

/** O plano da loja vale como acesso pago? Só ativo, pago e fora de loja de desenvolvimento (salvo a lista do fundador). */
export function shopPaidPlanActive(link: Pick<ShopLink, 'shop_domain' | 'plan_handle' | 'plan_status' | 'partner_development'>): boolean {
  const paid = link.plan_handle === 'starter' || link.plan_handle === 'business'
  const devOk = link.partner_development !== true || testShopAllowed(link.shop_domain)
  return paid && link.plan_status === 'active' && devOk
}

/** O acesso ao Studio Ads da conta da loja (conta PESSOAL, sem workspace): o da conta; se 'none', o plano pago da loja. */
export async function shopAdsAccess(userId: string, email: string | null, link: ShopLink): Promise<AdsAccessLoad> {
  const own = await loadAdsAccess(userId, email)
  if (own.reason !== 'none' || !shopPaidPlanActive(link)) return own
  return { ...own, reason: 'subscriber' }
}
