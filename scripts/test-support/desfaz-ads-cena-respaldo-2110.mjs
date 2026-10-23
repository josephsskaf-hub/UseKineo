// KINEO-ADS-CENA-RESPALDO-2110 — camada mais nova, snapshot exato; usado só pelos guardiões históricos.
import { readFileSync } from 'node:fs'
import { semAdsCenaSegue2110 } from './desfaz-ads-cena-segue-2110.mjs' // KINEO-ADS-CENA-SEGUE-2110
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
export const CENA_RESPALDO_MARK = 'KINEO-ADS-CENA-RESPALDO-2110'
export const CENA_RESPALDO_BASE = '68d3c13b935a14c17d3a6e7228fe5eab1be027ab'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-respaldo-2110-fontes.json'), 'utf8'))
export const CENA_RESPALDO_FILES = Object.freeze(Object.keys(table))
export const CENA_RESPALDO_NEW = Object.freeze([
  "docs/ADS-CENA-RESPALDO-2026-10-22.md",
  "lib/ads/cena/ajusteRespaldo.ts",
  "scripts/test-ads-cena-respaldo-2110.mjs",
  "scripts/test-support/desfaz-ads-cena-respaldo-2110-fontes.json",
  "scripts/test-support/desfaz-ads-cena-respaldo-2110.mjs"
])
export function semAdsCenaRespaldo2110(texto, file) {
  texto = semAdsCenaSegue2110(texto, file) // KINEO-ADS-CENA-SEGUE-2110 — restore the newest policy before this snapshot.
  const relative = String(file ?? '').replace(/\\/g, '/'), known = table[relative]
  if (!known || typeof texto !== 'string' || !texto.includes(CENA_RESPALDO_MARK)) return texto
  const hash = createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return texto
  if (hash !== known.afterHash) throw new Error('desfaz-ads-cena-respaldo-2110: fonte divergente ' + relative)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
