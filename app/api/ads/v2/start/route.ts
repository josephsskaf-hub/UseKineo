// KINEO-ADS-V2-2026-09-28 — início do anúncio v2 (especificação, seção 5, passos 3 e 4).
//
// ORDEM DAS TRAVAS (guardião scripts/test-ads-v2-servidor-2026-09-28.mjs confere a ordem no arquivo):
//   login → loadAdsAccess/adsGate → adsV2Visible (403 'v2_closed' ANTES de qualquer débito) → pedido do dono,
//   planejado e com cartão → moderação (a mesma régua do v1: narração + frases de tela) → dry_run devolve plano e
//   custo e PARA (ensaio de US$ 0: sem débito, sem fal) → saldo → trava condicional draft|planned→generating (o
//   índice único parcial faz o "um anúncio por vez" atômico) → débito confirmado no ledger → planos gravados →
//   envio à fal (imagens das cenas antes do vídeo) → 202. O avanço (tela + cron) faz o resto.
// KINEO-ADS-AMOSTRA-2026-10-09 — a AMOSTRA GRÁTIS (lib/ads/sample.ts) entra pela mesma porta, com a ordem:
//   login → loadAdsAccess/adsGate → adsSampleOpen (só 'no_access' que ainda não usou a dela) → adsV2Visible → pedido do
//   dono, planejado e com cartão → nível/duração da amostra (403 'sample_level_only') → moderação → dry_run PARA (igual)
//   → teto global do dia (429 'sample_cap', ANTES da trava; leitura que falha = teto) → SEM saldo e SEM débito → trava
//   condicional com a chave 'adssample-…' e credits_charged 0 → evento ads_sample_started → planos → envio (igual ao pago).
//   Falha depois disso: failAdsV2Order marca failed e NUNCA estorna chave de amostra (não houve débito).
//
// KINEO-SHOPIFY-2026-10-13 (etapa 2) — o corpo foi EXTRAÍDO, sem mudar uma linha, para lib/ads/v2StartCore.ts (adsV2StartFor):
// esta rota lê o cookie (login) e o acesso do workspace e chama a função; o app da Shopify chama a mesma função com a conta
// da loja. Comportamento idêntico (guardiões do ads v2 + o de equivalência em scripts/test-shopify-app-1310.mjs).
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadAdsAccess } from '@/lib/ads/serverAccess'
import { v2Fail } from '@/lib/ads/v2Server'
import { adsV2StartFor } from '@/lib/ads/v2StartCore'

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
    return await adsV2StartFor(user, access, () => req.json().catch(() => null), started)
  } catch (e) {
    console.warn('[ads/v2/start] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('start_failed', 502)
  }
}
