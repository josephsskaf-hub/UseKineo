// KINEO-ADS-CENA-TEXTO-2310 — restore this exact text layer before the prior AJUSTE policies.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semAdsEscolha2310 } from './desfaz-ads-escolha-2310.mjs' // KINEO-ADS-ESCOLHA-2310 — newest layer first, including files outside TEXTO.
export const CENA_TEXTO_MARK = 'KINEO-ADS-CENA-TEXTO-2310'
export const CENA_TEXTO_BASE = '45b6083a6c39005d076491eb33b5d312f3e7e757'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-cena-texto-2310-fontes.json'), 'utf8'))
export const CENA_TEXTO_FILES = Object.freeze(Object.keys(table))
export const CENA_TEXTO_NEW = Object.freeze([
  'docs/ADS-CENA-TEXTO-2026-10-23.md',
  'scripts/test-ads-cena-texto-2310.mjs',
  'scripts/test-support/desfaz-ads-cena-texto-2310-fontes.json',
  'scripts/test-support/desfaz-ads-cena-texto-2310.mjs',
])
export function semAdsCenaTexto2310(texto, file) {
  texto = semAdsEscolha2310(texto, file) // KINEO-ADS-ESCOLHA-2310 — restore before every marker/hash/unknown-file early return.
  const relative = String(file ?? '').replace(/\\/g, '/'), known = table[relative]
  if (!known || typeof texto !== 'string' || !texto.includes(CENA_TEXTO_MARK)) return texto
  const hash = createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return texto
  if (hash !== known.afterHash) throw new Error('desfaz-ads-cena-texto-2310: fonte divergente ' + relative)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
