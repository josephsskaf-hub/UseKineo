// KINEO-ADS-CENA-SEGUE-2110 — exact newest layer, before all historical quality policies.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
export const CENA_SEGUE_MARK = 'KINEO-ADS-CENA-SEGUE-2110'
export const CENA_SEGUE_BASE = 'e10f8efeec12b7cf8c7ba29cf80d4075fa8f9f97'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-segue-2110-fontes.json'), 'utf8'))
export const CENA_SEGUE_FILES = Object.freeze(Object.keys(table))
export const CENA_SEGUE_NEW = Object.freeze([
  'docs/ADS-CENA-SEGUE-2026-10-22.md',
  'lib/ads/cena/ajusteQuality.ts',
  'scripts/test-ads-cena-segue-2110.mjs',
  'scripts/test-support/desfaz-ads-cena-segue-2110-fontes.json',
  'scripts/test-support/desfaz-ads-cena-segue-2110.mjs',
])
export function semAdsCenaSegue2110(texto, file) {
  const relative = String(file ?? '').replace(/\\/g, '/'), known = table[relative]
  if (!known || typeof texto !== 'string' || !texto.includes(CENA_SEGUE_MARK)) return texto
  const hash = createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return texto
  if (hash !== known.afterHash) throw new Error('desfaz-ads-cena-segue-2110: fonte divergente ' + relative)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
