// KINEO-ADS-CENA-RETOMADA-2110 — camada mais nova, snapshot exato; usado só pelos guardiões históricos.
import { semPaginasIaClaras2110 } from './desfaz-paginas-ia-claras-2110.mjs' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semAdsCenaRespaldo2110 } from './desfaz-ads-cena-respaldo-2110.mjs' // KINEO-ADS-CENA-RESPALDO-2110
import { semCartoonConsistencia2210 } from './desfaz-cartoon-consistencia-2210.mjs' // KINEO-CARTOON-CONSISTENCIA-2210
export const CENA_RETOMADA_MARK = 'KINEO-ADS-CENA-RETOMADA-2110'
export const CENA_RETOMADA_BASE = '796333e9a07ee0c83bb414312a062b63f8fc32bb'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-retomada-2110-fontes.json'), 'utf8'))
export const CENA_RETOMADA_FILES = Object.freeze(Object.keys(table))
export const CENA_RETOMADA_NEW = Object.freeze([
  "docs/ADS-CENA-RETOMADA-2026-10-22.md",
  "docs/previews/ads-cena-retomada-2110.html",
  "docs/previews/ads-cena-retomada-2110.png",
  "lib/ads/cena/ajusteMedia.ts",
  "lib/ads/cena/ajusteMontage.ts",
  "lib/ads/cena/ajustePlan.ts",
  "lib/ads/cena/ajustePreflight.ts",
  "lib/ads/cena/internalAjuste.ts",
  "lib/ads/cena/live.ts",
  "scripts/test-ads-cena-retomada-2110.mjs",
  "scripts/test-support/desfaz-ads-cena-retomada-2110-fontes.json",
  "scripts/test-support/desfaz-ads-cena-retomada-2110.mjs"
])
export function semAdsCenaRetomada2110(texto, file) {
  texto = semCartoonConsistencia2210(texto, file) // KINEO-CARTOON-CONSISTENCIA-2210 — newest exact layer before main adapters and unchanged hashes.
  texto = semAdsCenaRespaldo2110(texto, file) // KINEO-ADS-CENA-RESPALDO-2110 — antes das demais camadas e do hash da retomada.
  texto = semPaginasIaClaras2110(texto, file) // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"] — antes das camadas Ads e do hash integral.
  const relative = String(file ?? '').replace(/\\/g, '/'), known = table[relative]
  if (!known || typeof texto !== 'string' || !texto.includes(CENA_RETOMADA_MARK)) return texto
  const hash = createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return texto
  if (hash !== known.afterHash) throw new Error('desfaz-ads-cena-retomada-2110: fonte divergente ' + relative)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
