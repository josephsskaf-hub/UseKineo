// KINEO-ADS-ESCOLHA-PUBLICO-2410 — newest leaf layer; restore exact sources before historical guards.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semIdiomasFormatos2410 } from './desfaz-idiomas-formatos-2410.mjs' // KINEO-IDIOMAS-FORMATOS-2410 — remove newest exact layer before historical snapshots.
import { semTrafego2310 } from './desfaz-trafego-2310.mjs' // KINEO-TRAFEGO-2310 — exact newest source layer before Public2410 hashes.

export const ADS_ESCOLHA_PUBLICO_MARK = 'KINEO-ADS-ESCOLHA-PUBLICO-2410'
export const ADS_ESCOLHA_PUBLICO_BASE = '07f1da96cdfdf69ade9e5514d0c4c524cb8b2294'
const manifest = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-escolha-publico-2410-fontes.json'), 'utf8'))
export const ADS_ESCOLHA_PUBLICO_FILES = Object.freeze(Object.keys(manifest.sources))
export const ADS_ESCOLHA_PUBLICO_NEW = Object.freeze(manifest.newFiles)
export const ADS_ESCOLHA_PUBLICO_ARTIFACTS = Object.freeze(manifest.artifacts ?? [])
export function semAdsEscolhaPublico2410(text, file) {
  text = semIdiomasFormatos2410(text, file) // KINEO-IDIOMAS-FORMATOS-2410
  text = semTrafego2310(text, file) // KINEO-TRAFEGO-2310 — before every marker/hash/unknown-path early return; pure leaf, no older imports.
  const path = String(file ?? '').replace(/\\/g, '/'), known = manifest.sources[path]
  if (!known || typeof text !== 'string' || !text.includes(ADS_ESCOLHA_PUBLICO_MARK)) return text
  const hash = createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return text
  if (hash !== known.afterHash) throw new Error('desfaz-ads-escolha-publico-2410: fonte divergente ' + path)
  return text.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
