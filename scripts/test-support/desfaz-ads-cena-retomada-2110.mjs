// KINEO-ADS-CENA-RETOMADA-2110 — camada mais nova, snapshot exato; usado só pelos guardiões históricos.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
export const CENA_RETOMADA_MARK = 'KINEO-ADS-CENA-RETOMADA-2110'
export const CENA_RETOMADA_BASE = '796333e9a07ee0c83bb414312a062b63f8fc32bb'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-retomada-2110-fontes.json'), 'utf8'))
export const CENA_RETOMADA_FILES = Object.freeze(Object.keys(table))
export const CENA_RETOMADA_NEW = Object.freeze([])
export function semAdsCenaRetomada2110(texto, file) {
  const relative = String(file ?? '').replace(/\\/g, '/'), known = table[relative]
  if (!known || typeof texto !== 'string' || !texto.includes(CENA_RETOMADA_MARK)) return texto
  const hash = createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return texto
  if (hash !== known.afterHash) throw new Error('desfaz-ads-cena-retomada-2110: fonte divergente ' + relative)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
