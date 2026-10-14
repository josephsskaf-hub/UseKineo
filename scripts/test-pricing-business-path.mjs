import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const repo = process.cwd()
const read = (path) => readFileSync(join(repo, path), 'utf8')
let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks += 1 }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1 }

const pricing = read('app/pricing/PricingClient.tsx')
const bridge = read('components/AgencyVolumeBridge.tsx')

// reancorado KINEO-PRECOS-LIMPEZA-1510 — o fundador tirou do /pricing o cartão do Business ("não faz sentido nenhum mais
// estar na tela", 15/10). A faixa (AgencyVolumeBridge entry="pricing"), o rastreador do caminho e a política dele saíram
// juntos; esta trava agora prova a AUSÊNCIA. A faixa compartilhada continua nas outras páginas (checks de baixo, intactos).
check(!pricing.includes('PricingBusinessPathTelemetry'), 'reancorado KINEO-PRECOS-LIMPEZA-1510: pricing no longer imports or mounts the business-path tracker')
check(!pricing.includes('PRICING_BUSINESS_PATH_TARGET_ID'), 'reancorado KINEO-PRECOS-LIMPEZA-1510: pricing no longer carries the business-path observation target')
equal((pricing.match(/<AgencyVolumeBridge/g) ?? []).length, 0, 'reancorado KINEO-PRECOS-LIMPEZA-1510: pricing renders no agency bridge')
check(!pricing.includes("from '@/components/AgencyVolumeBridge'"), 'reancorado KINEO-PRECOS-LIMPEZA-1510: pricing does not import the agency bridge')
check(!existsSync(join(repo, 'components/PricingBusinessPathTelemetry.tsx')), 'reancorado KINEO-PRECOS-LIMPEZA-1510: orphan tracker deleted')
check(!existsSync(join(repo, 'lib/growth/pricingBusinessPath.ts')), 'reancorado KINEO-PRECOS-LIMPEZA-1510: orphan policy deleted')
check(pricing.includes('<PricingBusinessBlock '), 'reancorado KINEO-PRECOS-LIMPEZA-1510: the Business plan card with its own buy button stays on pricing')

check(bridge.includes('See one-time volume packs →'), 'existing CTA copy is unchanged')
check(bridge.includes('Self-service · one account · no recurring contract'), 'existing subscription clarification is unchanged')
check(bridge.includes('agencyPacksHref(entry)'), 'existing destination still comes from the canonical helper')

console.log(`pricing-business-path: ${checks}/${checks} checks passed`)
