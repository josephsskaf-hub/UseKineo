// KINEO-ADS-CENA-95-PLAN-FAILED-2110 — camada mais nova, snapshot exato; usado só pelos guardiões históricos.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
export const ADS_CENA_95_PLAN_FAILED_MARK = 'KINEO-ADS-CENA-95-PLAN-FAILED-2110'
export const ADS_CENA_95_PLAN_FAILED_BASE = '3e7ef8a42ea6c1f8566a6dbb55f10cc838b0dbdb'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-95-plan-failed-2110-fontes.json'), 'utf8'))
export const ADS_CENA_95_PLAN_FAILED_FILES = Object.freeze(Object.keys(table))
export const ADS_CENA_95_PLAN_FAILED_NEW = Object.freeze([
  'lib/ads/cena/script95Contract.ts', 'scripts/test-ads-cena-95-plan-failed-2110.mjs',
  'scripts/test-support/desfaz-ads-cena-95-plan-failed-2110.mjs', 'scripts/test-support/desfaz-ads-cena-95-plan-failed-2110-fontes.json',
  'docs/ADS-CENA-95-PLAN-FAILED-2026-10-22.md',
])
export function semAdsCena95PlanFailed2110(texto, file) {
  const relative = String(file ?? '').replace(/\\/g, '/'), known = table[relative]
  if (!known || typeof texto !== 'string' || !texto.includes(ADS_CENA_95_PLAN_FAILED_MARK)) return texto
  const hash = createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return texto
  if (hash !== known.afterHash) throw new Error('desfaz-ads-cena-95-plan-failed-2110: fonte divergente ' + relative)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
