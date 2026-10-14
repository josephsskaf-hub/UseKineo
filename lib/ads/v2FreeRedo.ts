// KINEO-ADS-REFACAO-ATOR-1410 — a 1ª refação de cada anúncio entregue é GRÁTIS (fundador 14/10). As seguintes custam o de
// sempre (adsV2RetakeCredits, lib/ads/v2Tiers.ts: 5 cr Kling O3, 12 cr herói Seedance — esse preço NÃO muda).
//
// A REGRA (uma só, usada pela rota /api/ads/v2/retake para cobrar e pelo /api/ads/v2/status para a tela mostrar "grátis"):
//   · só o anúncio ORIGINAL (parent_order_id nulo): a refação de uma refação é sempre paga — senão a corrente
//     (refazer → refazer a refação → …) daria refação grátis sem fim;
//   · a amostra grátis (chave 'adssample-…', lib/ads/sample.ts) não ganha refação grátis;
//   · nenhuma refação DESTE anúncio viva ou entregue (generating/assembling/delivered — qualquer status que não seja
//     failed/cancelled). Refação que falhou foi estornada (ou era grátis): não gasta a vez.
//
// CORRIDA (dois cliques na 1ª refação, mesmo em CENAS diferentes): a refação grátis tem id DETERMINÍSTICO por ANÚNCIO,
// sem a cena — adsV2FreeRedoSeed(pai, n). Os dois cliques calculam o MESMO id; a chave primária de ads_v2_orders aceita um
// e recusa o outro (23505). Quem perde recebe 409 'price_changed' com o preço normal (a tela relê o pedido e mostra o
// preço). `n` = quantas refações GRÁTIS deste anúncio já falharam/foram canceladas: uma grátis que falhou devolve a vez
// com OUTRO id; duas leituras juntas contam o mesmo n = o mesmo id. Leitura velha nunca dá duas grátis vivas: a 2ª bate
// na chave da 1ª. E o índice ads_v2_orders_one_active_per_user_slot continua valendo (um pedido ativo por conta).
//
// Sem débito: a refação grátis grava credits_charged 0 e NÃO chama chargeAdsV2 (que recusa custo 0). A chave
// 'adsv2redo-<id>' continua sendo a do pedido; sem linha em credit_debits, a falha estorna 0 (refundAdsV2Confirmed =
// 'missing') e a varredura sweepAbandonedAdsV2Debits nem a vê (ela parte do débito). O prazo de 90 min do pedido segue.
//
// LIB PURA (só `import type`): o guardião scripts/test-ads-refacao-ator-1410.mjs importa este arquivo cru no Node.
import type { SupabaseClient } from '@supabase/supabase-js'

/** Interruptor ÚNICO da 1ª refação grátis. false = toda refação cobra o preço de sempre (a tela volta a mostrar créditos). */
export const ADS_V2_FIRST_REDO_FREE = true

/** Espelho de ADS_SAMPLE_PREFIX (lib/ads/sample.ts) — o guardião confere que os dois batem. */
export const ADS_V2_FREE_REDO_SAMPLE_PREFIX = 'adssample-'

/** Status de refação que NÃO gastam a vez grátis (estornada ou nunca começou). */
export const ADS_V2_FREE_REDO_CLOSED: readonly string[] = ['failed', 'cancelled']

export interface AdsV2FreeRedoParent {
  parent_order_id: string | null
  billing_ref: string | null
}

export interface AdsV2FreeRedoPrior {
  status: string
  credits_charged: number | null
}

/** A decisão (pura): a próxima refação deste anúncio é grátis? E a semente da refação grátis (nº de grátis que falharam). */
export function adsV2FirstRedoDecision(parent: AdsV2FreeRedoParent, priors: readonly AdsV2FreeRedoPrior[]): { free: boolean; seed: number } {
  const list = Array.isArray(priors) ? priors : []
  const seed = list.filter((r) => Number(r.credits_charged) === 0 && ADS_V2_FREE_REDO_CLOSED.includes(r.status)).length
  if (!ADS_V2_FIRST_REDO_FREE) return { free: false, seed }
  if (parent.parent_order_id) return { free: false, seed }
  if (typeof parent.billing_ref === 'string' && parent.billing_ref.startsWith(ADS_V2_FREE_REDO_SAMPLE_PREFIX)) return { free: false, seed }
  const used = list.some((r) => !ADS_V2_FREE_REDO_CLOSED.includes(r.status))
  return { free: !used, seed }
}

/** Semente do id da refação grátis: por ANÚNCIO (sem a cena), para dois cliques em cenas diferentes darem o MESMO id. */
export function adsV2FreeRedoSeed(parentId: string, seed: number): string {
  return `adsv2redo-free:${parentId}:${seed}`
}

/** O preço que a tela mostra e manda de volta (expected_credits): 0 na 1ª refação grátis, o preço do plano depois. */
export function adsV2RedoPrice(retakeCredits: number, firstFree: boolean | null | undefined): number {
  return firstFree === true ? 0 : retakeCredits
}

/**
 * Lê as refações do anúncio e decide (servidor). null = leitura falhou (a rota recusa com 502; a tela não mostra "grátis").
 * Só o anúncio original consulta o banco: refação e amostra nunca são grátis.
 */
export async function adsV2FirstRedoFor(
  admin: SupabaseClient,
  parent: AdsV2FreeRedoParent & { id: string },
  uid: string,
): Promise<{ free: boolean; seed: number } | null> {
  const bare = adsV2FirstRedoDecision(parent, [])
  if (!bare.free) return bare
  const r = await admin.from('ads_v2_orders').select('status, credits_charged').eq('parent_order_id', parent.id).eq('user_id', uid)
  if (r.error) return null
  return adsV2FirstRedoDecision(parent, (r.data ?? []) as AdsV2FreeRedoPrior[])
}
