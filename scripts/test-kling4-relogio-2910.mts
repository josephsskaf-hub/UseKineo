// KINEO-KLING4-RELOGIO-2910 — a janela da oferta Kling 4.0 é reancorada na chegada: relógio do visitante adiantado não esconde a oferta.
import assert from 'node:assert/strict'
import { rebaseKling4Lease, validKling4PaidAvailability, kling4PromoVisible } from '../lib/kling4PaidPresentation.ts'
const server = Date.parse('2026-10-30T00:11:58.994Z')
const a = { paidLive: true, promoLive: true, promoAvailable: false, publicOfferLive: true, reason: 'not_subscribed', checkedAt: new Date(server).toISOString(), validUntil: new Date(server + 15000).toISOString(), expiresAt: null }
const clientAhead = server + 141_000
assert.equal(validKling4PaidAvailability(a, clientAhead), false)
const r = rebaseKling4Lease(a, clientAhead)
assert.equal(validKling4PaidAvailability(r, clientAhead + 100), true)
assert.equal(kling4PromoVisible(r, clientAhead + 100), true)
assert.equal(validKling4PaidAvailability(r, clientAhead + 16000), false)
console.log('rebase ok 4/4')
