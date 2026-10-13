// KINEO-ADS-CENA-2026-10-13 — o lado servidor da CENA e do anúncio de PRODUTO (Studio Ads v2). Duas portas, cada uma
// chamada por UMA linha marcada nas rotas (as rotas do dinheiro ficam byte a byte as de antes, tirando as linhas marcadas):
//
//   1) adsV2SceneForDraft (POST /api/ads/v2/orders): a cena e o tipo (produto/lugar) do rascunho, campo a campo
//      (sanitizeAdsV2SceneBody — limpa, teto, régua de honestidade, só Comercial/Premium) e pela MESMA moderação do texto do
//      produto (moderateContent, surface 'ads_brief', stage 'input'). Recusa = a resposta pronta, nada gravado.
//
//   2) adsV2ProductResearch (POST /api/ads/v2/research): fundador, 13/10, foto de perfume + "Amber Perfume 50ml": a pesquisa
//      na web (feita para LUGAR/imóvel) ofereceu 6 fatos de perfumes de OUTRAS marcas (Thameen Amber Room, Nemat Amber,
//      Clive Christian…). Anúncio de PRODUTO não busca na web aberta: com o link da PRÓPRIA página do produto, os fatos vêm
//      só dela (factsFromPageText, a mesma régua do plano B do link); sem link, nada é buscado e a tela pede o link.
//      Lugar = null (a pesquisa de sempre segue, intocada).
// Nenhuma das duas cobra, debita, estorna ou chama fornecedor pago.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'
// A moderação e a leitura do link só carregam quando são usadas (import dinâmico): o /orders sem cena nunca puxa o leitor de
// páginas (DNS) nem o cliente de moderação — o caminho de sempre fica com as mesmas dependências de antes.
import { writeServerEvent } from '@/lib/serverEvents'
import { factsFromPageText, type AdsV2ResearchFact } from '@/lib/ads/v2Research'
import { adsV2IsProductOrder, sanitizeAdsV2SceneBody } from '@/lib/ads/v2Scene'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'

/** O motivo gravado quando o anúncio de produto não tem link: a tela pede o link (nunca lista outras marcas). */
export const ADS_V2_PRODUCT_NO_LINK = 'product_no_link'

/**
 * Cena + tipo do rascunho. ok = os campos a gravar no brief (só as chaves que vieram: sem cena e sem tipo = {} — o pedido de
 * antes, chave por chave). Falha = a resposta pronta (400 do contrato, ou a recusa da moderação com o status da política).
 */
export async function adsV2SceneForDraft(body: unknown, tier: string, userId: string): Promise<{ ok: true; fields: Record<string, unknown> } | { ok: false; fail: NextResponse }> {
  const parsed = sanitizeAdsV2SceneBody(body, tier)
  if (!parsed.ok) return { ok: false, fail: v2Fail(parsed.error, 400) }
  const fields: Record<string, unknown> = {}
  if (parsed.kind) fields.kind = parsed.kind
  if (parsed.scene) {
    const { moderateContent } = await import('@/lib/safety/contentModeration')
    const { moderationRefusalMessage, moderationRefusalStatus } = await import('@/lib/safety/moderationPolicy')
    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId, text: parsed.scene, meta: { v2: true, scene: true } })
    if (!safety.ok) {
      return { ok: false, fail: v2Fail(safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, moderationRefusalStatus(safety.reason), { message: moderationRefusalMessage(safety.reason) }) }
    }
    fields.scene = parsed.scene
  }
  return { ok: true, fields }
}

/** Trocar produto ↔ lugar não herda a pesquisa do rascunho anterior (a de lugar listaria fatos da web num produto). Pura. */
export function adsV2SameKind(prevBrief: unknown, nextBrief: Record<string, unknown>): boolean {
  const pk = prevBrief && typeof prevBrief === 'object' ? (prevBrief as Record<string, unknown>).kind ?? null : null
  return (pk ?? null) === (nextBrief.kind ?? null)
}

/**
 * Pesquisa de um anúncio de PRODUTO: só a página do próprio produto (o link que a pessoa colou), nunca a web aberta. null =
 * não é produto (a rota segue com a pesquisa de lugar de sempre). Grava no pedido só se ninguém gravou antes (mesma trava
 * condicional da rota) e devolve { status, facts, why }.
 */
export async function adsV2ProductResearch(args: {
  admin: SupabaseClient
  order: { id: string; sector: string | null }
  uid: string
  brief0: Record<string, unknown>
  started: number
}): Promise<NextResponse | null> {
  const { admin, order, uid, brief0, started } = args
  if (!adsV2IsProductOrder(brief0, order.sector)) return null
  const link = typeof brief0.link === 'string' && /^https?:\/\//i.test(brief0.link) ? brief0.link : null
  let facts: AdsV2ResearchFact[] = []
  if (link) {
    const { adsV2LinkText } = await import('@/lib/ads/v2Link')
    const page = await adsV2LinkText(link).catch(() => null)
    if (page) facts = factsFromPageText(page.text, link).facts
  }
  const ok = facts.length > 0
  const why = ok ? null : link ? 'nothing_found' : ADS_V2_PRODUCT_NO_LINK
  const ms = Date.now() - started
  const stored = ok
    ? { status: 'ok', at: new Date().toISOString(), facts, model: 'none', source: 'link', ms }
    : { status: 'failed', at: new Date().toISOString(), facts: [], model: 'none', source: link ? 'link' : 'none', ms, why }
  await admin
    .from('ads_v2_orders')
    .update({ brief: { ...brief0, research: stored } })
    .eq('id', order.id)
    .eq('user_id', uid)
    .in('status', ['draft', 'planned'])
    .is('brief->research', null)
  await writeServerEvent({ name: 'ads_v2_research_served', userId: uid, path: '/api/ads/v2/research', metadata: { order_id: order.id, ok, facts: facts.length, searches: 0, ms, model: 'none', source: link ? 'link' : 'none', product: true, why } })
  return v2Json({ order_id: order.id, status: ok ? 'ok' : 'failed', facts, ...(why ? { why } : {}) })
}
