// KINEO-ADS-CENA-95-PACING-2110 — camada mais nova, snapshot exato; usado só pelos guardiões históricos.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semCartoonTracao2210 } from './desfaz-cartoon-tracao-2210.mjs' // KINEO-CARTOON-TRACAO-2210
export const CENA95_PACING_MARK = 'KINEO-ADS-CENA-95-PACING-2110'
export const CENA95_PACING_BASE = '2b2ea93971ca7fef45ec1bfa46d94d48281bd934'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-95-pacing-2110-fontes.json'), 'utf8'))
export const CENA95_PACING_FILES = Object.freeze(Object.keys(table))
export const CENA95_PACING_NEW = Object.freeze([
  "docs/ADS-CENA-95-PACING-2026-10-22.md",
  "lib/ads/cena/composition95.ts",
  "lib/ads/cena/moderation95.ts",
  "lib/ads/cena/preflight95.ts",
  "lib/ads/cena/script95Repair.ts",
  "lib/ads/cena/speech95Policy.ts",
  "scripts/test-ads-cena-95-pacing-2110.mjs",
  "scripts/test-support/ads-cena-95-pacing-fixtures-2110.mjs",
  "scripts/test-support/desfaz-ads-cena-95-pacing-2110-fontes.json",
  "scripts/test-support/desfaz-ads-cena-95-pacing-2110.mjs"
])
export function semAdsCena95Pacing2110(texto, file) {
  texto = semCartoonTracao2210(texto, file) // KINEO-CARTOON-TRACAO-2210 — direct callers also remove only the exact newer delta before the unchanged snapshot hash.
  const relative = String(file ?? '').replace(/\\/g, '/'), known = table[relative]
  if (!known || typeof texto !== 'string' || !texto.includes(CENA95_PACING_MARK)) return texto
  const hash = createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return texto
  if (hash !== known.afterHash) throw new Error('desfaz-ads-cena-95-pacing-2110: fonte divergente ' + relative)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
