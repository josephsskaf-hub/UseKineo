// KINEO-SHOPIFY-2026-10-13 — os webhooks do app: os 3 de privacidade (obrigatórios para a App Store) + app/uninstalled.
//
// ORDEM DAS TRAVAS (o guardião scripts/test-shopify-app-1310.mjs confere):
//   interruptor (404) → credenciais (503) → corpo CRU lido UMA vez (req.text(), nunca req.json() antes) → HMAC base64 do
//   X-Shopify-Hmac-Sha256 sobre o corpo cru (401 — a Shopify exige 401 para assinatura errada) → loja do cabeçalho pela regex
//   (400) → idempotência pelo X-Shopify-Webhook-Id → ação do tópico → 200 rápido (a Shopify corta em 5 s).
//
// O QUE CADA TÓPICO FAZ AQUI:
//   · app/uninstalled         → token apagado na hora, linha 'uninstalled'.
//   · shop/redact (48 h após) → linha da loja apagada.
//   · customers/data_request  → a Kineo NÃO guarda dado de cliente final da loja (só lê produto): nada a exportar; registra.
//   · customers/redact        → idem: nada a apagar; registra. (Se um dia guardarmos pedido/cliente, apagar aqui em ≤ 30 dias.)
// O evento gravado leva loja, tópico e id da entrega — NUNCA e-mail/telefone do cliente que vem no corpo.
import { NextRequest, NextResponse } from 'next/server'
import { normalizeShop, readShopifyCreds, shopifyAppLive, shopifyNotFound, verifyWebhookHmac, SHOPIFY_WEBHOOK_TOPICS } from '@/lib/shopify/core'
import { firstWebhookDelivery, forgetWebhookDelivery, markUninstalled, redactShop, shopifyAdmin } from '@/lib/shopify/server'
import { writeServerEvent } from '@/lib/serverEvents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const creds = readShopifyCreds()
  if (!creds) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  const raw = await req.text()
  if (!verifyWebhookHmac(raw, req.headers.get('x-shopify-hmac-sha256'), creds.apiSecret)) return NextResponse.json({ error: 'invalid_hmac' }, { status: 401 })
  const shop = normalizeShop(req.headers.get('x-shopify-shop-domain'))
  if (!shop) return NextResponse.json({ error: 'invalid_shop' }, { status: 400 })
  const topic = (req.headers.get('x-shopify-topic') ?? '').trim().toLowerCase()
  const webhookId = (req.headers.get('x-shopify-webhook-id') ?? '').trim()
  if (!(SHOPIFY_WEBHOOK_TOPICS as readonly string[]).includes(topic)) return NextResponse.json({ ok: true, ignored: true })

  const admin = shopifyAdmin()
  if (!admin) return NextResponse.json({ error: 'not_ready' }, { status: 503 })
  if (!(await firstWebhookDelivery(admin, webhookId, topic, shop))) return NextResponse.json({ ok: true, duplicate: true })

  let done = true
  if (topic === 'app/uninstalled') done = await markUninstalled(admin, shop)
  else if (topic === 'shop/redact') done = await redactShop(admin, shop)
  // customers/data_request e customers/redact: nenhum dado de cliente final é guardado — nada a exportar ou apagar.

  await writeServerEvent({ name: 'shopify_webhook_received', path: '/api/shopify/webhooks', metadata: { shop, topic, webhook_id: webhookId.slice(0, 120), done } })
  // Falha no banco = o recibo sai e 500 → a Shopify reenvia (8 vezes em 4 h) com o MESMO id e a ação roda de novo
  // (idempotente: update/delete por loja).
  if (!done) await forgetWebhookDelivery(admin, webhookId)
  return done ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'retry' }, { status: 500 })
}
