// KINEO-PORTAO-FREE15-2910 — o portão do filme grátis só estorna com defeito ENCONTRADO. "pixel_evidence_unverified" (o portão não
// conseguiu confirmar a evidência) entrega e cobra normal, com evento próprio para medir. Guardião de fonte da rota de entrega.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const route = readFileSync(new URL('../app/api/compose/status/[renderId]/route.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const unverified = route.indexOf("if (gate.status === 'failed' && gate.reason === 'pixel_evidence_unverified') {")
const refund = route.indexOf("} else if (gate.status === 'failed') {\n            const creditsRefunded = await refundFailedFree15Gate({ ...ctx, reason: gate.reason })")
const checks = [
  ['unverified tem ramo próprio antes do estorno', unverified > 0 && refund > unverified],
  ['o ramo unverified não chama refundFailedFree15Gate', unverified > 0 && !route.slice(unverified, refund).includes('refundFailedFree15Gate')],
  ['o ramo unverified grava free15_gate_unverified_charged', route.slice(unverified, refund).includes("name: 'free15_gate_unverified_charged'")],
  ['defeito real continua estornando', refund > 0],
  ['o estorno continua sendo a única fonte de free15GateFailure', (route.match(/free15GateFailure = \{ reason: gate\.reason, creditsRefunded \}/g) ?? []).length === 1],
]
let ok = 0
for (const [name, pass] of checks) { assert.ok(pass, name); ok++; console.log(`ok  ${name}`) }
console.log(`portao-free15-cobra: ${ok}/${checks.length}`)
