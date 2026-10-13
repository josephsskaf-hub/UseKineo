// KINEO-ADS-V2-2026-09-28 — plano do anúncio v2 (especificação, seção 5, passo 2). SEM COBRAR e sem chamar a fal.
//
// Recebe setor, logo, 1 a 7 fotos (KINEO-ADS-1FOTO-LINK-2026-10-10: eram 3 a 7) JÁ recortadas em 9:16 no navegador (cada uma com o tipo marcado) e, se quiser, o
// cartão final. Extrai o brief da frase (ou do link) com gpt-4o-mini (lib/ads/v2Brief.ts), monta a lista de planos
// pelo molde do setor (lib/ads/v2ShotLists.ts planShots, determinístico), passa os validadores anti-invenção pela
// narração, pelas frases de tela E por cada prompt de movimento/cena, e devolve o custo em créditos e em US$
// estimado. O pedido vira 'planned'. Teto diário de planos por pessoa (evento ads_v2_plan_served) ANTES do modelo.
//
// KINEO-SHOPIFY-2026-10-13 (etapa 2) — o corpo foi EXTRAÍDO, sem mudar uma linha, para lib/ads/v2PlanCore.ts (adsV2PlanFor):
// esta rota lê o cookie (login) e o acesso do workspace e chama a função; o app da Shopify chama a mesma função com a conta
// da loja. Comportamento idêntico (guardiões do ads v2 + o de equivalência em scripts/test-shopify-app-1310.mjs).
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadAdsAccess } from '@/lib/ads/serverAccess'
import { v2Fail } from '@/lib/ads/v2Server'
import { adsV2PlanFor } from '@/lib/ads/v2PlanCore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const access = await loadAdsAccess(user.id, user.email, { workspace: true })
    return await adsV2PlanFor(user, access, () => req.json().catch(() => null), started)
  } catch (e) {
    console.warn('[ads/v2/plan] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('plan_failed', 502)
  }
}
