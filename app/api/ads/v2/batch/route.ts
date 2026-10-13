// KINEO-ADS-LOTE-1310 — /api/ads/v2/batch, o modo LOTE do Studio Ads (regras e porquê: lib/ads/v2BatchRules.ts; servidor:
// lib/ads/v2Batch.ts). Fundador 13/10: "manda fazer … lote agora".
//
// POST { action: 'plan', rows: [<corpo do /plan>…] }               → 1 a 10 roteiros, cada um por adsV2PlanFor (sem cobrar).
// POST { action: 'start', batch_id?, order_ids, expected_credits }  → grava a fila e começa a 1ª linha por adsV2StartFor.
// POST { action: 'tick', batch_id }                                 → a tela aberta empurra a fila (próxima linha, se livre).
// POST { action: 'cancel', batch_id }                               → as linhas que ainda não começaram não começam mais.
// GET  ?batch=<id> | ?latest=1                                      → o estado do lote (só leitura).
//
// ORDEM DAS TRAVAS (o guardião scripts/test-ads-lote-1310.mjs confere): login → loadAdsAccess (workspace) →
// adsV2BatchGate (SÓ adsGate 'ok' + adsV2Visible; a amostra grátis nunca abre o lote: 403 'no_access' com a oferta do
// Business lida de lib/businessPlan.ts) → corpo (sanitizeBatchBody: até 10 linhas) → as funções do anúncio único.
// Nenhum débito, estorno, saldo ou fal nesta rota: tudo isso mora em adsV2PlanFor/adsV2StartFor.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { loadAdsAccess } from '@/lib/ads/serverAccess'
import { isUuid } from '@/lib/ads/v2Contract'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'
import { businessAdsOffer } from '@/lib/businessPlan'
import { sanitizeBatchBody } from '@/lib/ads/v2BatchRules'
import { adsV2BatchCancel, adsV2BatchGate, adsV2BatchPlan, adsV2BatchStart, adsV2BatchTick, adsV2BatchView } from '@/lib/ads/v2Batch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
// 10 roteiros em sequência (cada um com o modelo) cabem aqui; o /plan sozinho tem 60 s.
export const maxDuration = 300

const PATH = '/api/ads/v2/batch'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const raw = (req.nextUrl.searchParams.get('batch') ?? '').toLowerCase()
    const latest = req.nextUrl.searchParams.get('latest') === '1'
    if (!latest && !isUuid(raw)) return v2Fail('bad_batch_id', 400)
    const access = await loadAdsAccess(user.id, user.email, { workspace: true })
    const r = await adsV2BatchView(user, access, latest ? null : raw)
    return v2Json(r.body, r.status)
  } catch (e) {
    console.warn('[ads/v2/batch GET] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('batch_failed', 502)
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const access = await loadAdsAccess(user.id, user.email, { workspace: true })
    const parsed = sanitizeBatchBody(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const body = parsed.value
    // Parar a fila é sempre permitido (nada começa, nada é cobrado).
    if (body.action === 'cancel') {
      const r = await adsV2BatchCancel(user, access, body.batch_id)
      return v2Json(r.body, r.status)
    }
    const gate = adsV2BatchGate(user, access)
    if (gate !== 'ok') {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: PATH, metadata: { reason: gate, batch: true, action: body.action } })
      // Conta sem o Studio Ads (free/trial, inclusive com a amostra grátis aberta): o lote é do Business — a oferta vai pronta.
      return v2Fail(gate === 'no_access' ? 'no_access' : gate, 403, gate === 'no_access' ? { business: businessAdsOffer() } : {})
    }
    if (body.action === 'plan') {
      const r = await adsV2BatchPlan(user, access, body.rows, started)
      return v2Json(r.body, r.status)
    }
    if (body.action === 'start') {
      const r = await adsV2BatchStart(user, access, { batch_id: body.batch_id, order_ids: body.order_ids, expected_credits: body.expected_credits })
      return v2Json(r.body, r.status)
    }
    const t = await adsV2BatchTick(user, access, body.batch_id, 'tick')
    return v2Json({ batch_id: body.batch_id, tick: t })
  } catch (e) {
    console.warn('[ads/v2/batch] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('batch_failed', 502)
  }
}
