// KINEO-ADS-ESCOLHA-2310 — restore this newest exact layer before every older policy.
// Leaf helper: it must never import a prior desfaz, which would create a cycle.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semAdsEscolhaPublico2410 } from './desfaz-ads-escolha-publico-2410.mjs' // KINEO-ADS-ESCOLHA-PUBLICO-2410

import { semCartoonTracao2210 } from './desfaz-cartoon-tracao-2210.mjs' // KINEO-CARTOON-TRACAO-2210
export const ADS_ESCOLHA_MARK = 'KINEO-ADS-ESCOLHA-2310'
export const ADS_ESCOLHA_BASE = '36a5286aa9bc8aa16e8b4c72edc42fbf1d1ac7a7'
const table = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-ads-escolha-2310-fontes.json'), 'utf8'))
export const ADS_ESCOLHA_FILES = Object.freeze(Object.keys(table))
export const ADS_ESCOLHA_NEW = Object.freeze([
  "app/(dashboard)/ads/v2/AdsV2Escolha.tsx",
  "app/api/ads/v2/cena/route.ts",
  "docs/ADS-ESCOLHA-2026-10-23.md",
  "docs/previews/ADS-ESCOLHA-2310.html",
  "lib/ads/cena/escolhaCatalog.ts",
  "lib/ads/cena/escolhaMedia.ts",
  "lib/ads/cena/escolhaMontage.ts",
  "lib/ads/cena/escolhaPlan.ts",
  "lib/ads/cena/escolhaStills.ts",
  "lib/ads/cena/escolhaTransport.ts",
  "lib/ads/cena/escolhaVideo.ts",
  "lib/ads/cena/internalEscolha.ts",
  "scripts/test-ads-escolha-2310.mjs",
  "scripts/test-support/ads-escolha-ui-2310.mjs",
  "scripts/test-support/desfaz-ads-escolha-2310-fontes.json",
  "scripts/test-support/desfaz-ads-escolha-2310.mjs"
])

export function semAdsEscolha2310(texto, file) {
  texto = semCartoonTracao2210(texto, file) // KINEO-CARTOON-TRACAO-2210 — compose exact leaf undo before historical hashes.
  texto = semAdsEscolhaPublico2410(texto, file) // KINEO-ADS-ESCOLHA-PUBLICO-2410 — newest before every old hash/early return.
  const relative = String(file ?? '').replace(/\\/g, '/'), known = table[relative]
  if (!known || typeof texto !== 'string' || !texto.includes(ADS_ESCOLHA_MARK)) return texto
  const hash = createHash('sha256').update(texto.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return texto
  if (hash !== known.afterHash) throw new Error('desfaz-ads-escolha-2310: fonte divergente ' + relative)
  return texto.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
