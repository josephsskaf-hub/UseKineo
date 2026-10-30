import { semFluxoLeva13010 } from './desfaz-fluxo-leva1-3010.mjs' // KINEO-FLUXO-LEVA1-3010 — camada mais nova (30/10) sai primeiro
import { semConsertos2710 } from './desfaz-consertos-2710.mjs' // KINEO-CONSERTOS-2710 — as 6 entregas de 27/10 (camada mais nova) saem primeiro
import { semApresentadores2410 } from './desfaz-apresentadores-2410.mjs' // KINEO-APRESENTADORES-2410
// KINEO-IDIOMAS-FORMATOS-2410 — exact leaf layer; no import of another task's undo chain.
import { semCompraAvulsa2410 } from './desfaz-compra-avulsa-2410.mjs' // KINEO-COMPRA-AVULSA-2410 — exact newer leaf before historical assertions.
import { readFileSync } from 'node:fs'
import { semDesenho15s2710 } from './desfaz-desenho-15s-aceita-2710.mjs' // KINEO-DESENHO-15S-ACEITA-2710 — camada mais nova sai primeiro
import { createHash } from 'node:crypto'
import { semVideoFiel2610 } from './desfaz-video-fiel-2610.mjs' // VIDEO-FIEL-2610: exact later layer, historical readers only.
import { semCardsGiro2410 } from './desfaz-cards-giro-2410.mjs' // KINEO-CARDS-GIRO-2410 — remove the exact newer layer before every historical chain.
import { semAmostraAnuncio2410 } from './desfaz-amostra-anuncio-2410.mjs'

import { semCartoonTracao2210 } from './desfaz-cartoon-tracao-2210.mjs' // KINEO-CARTOON-TRACAO-2210

export const IDIOMAS_FORMATOS_2410_BASE = 'dd0abba8cc711be4bde2faaac39f0aef29f3f90d'
export const IDIOMAS_FORMATOS_2410_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-idiomas-formatos-2410-fontes.json', import.meta.url), 'utf8'))
const sourceHash = text => createHash('sha256').update(text).digest('hex')
function verifiedBefore(known, integrated, rel) {
  const text = integrated ? known.integratedBefore : known.before
  const expected = integrated ? known.integratedBeforeHash : known.beforeHash
  if (typeof text !== 'string' || typeof expected !== 'string' || sourceHash(text) !== expected) throw new Error('desfaz-idiomas-formatos-2410: manifesto divergente ' + rel)
  return text
}
export function semIdiomasFormatos2410(text, file) {
  text = semFluxoLeva13010(text, file) // KINEO-FLUXO-LEVA1-3010
  text = semConsertos2710(text, file) // KINEO-CONSERTOS-2710
  text = semDesenho15s2710(text, file) // KINEO-DESENHO-15S-ACEITA-2710 — camada mais nova sai primeiro
  text = semVideoFiel2610(text, file)
  text = semCardsGiro2410(text, file) // KINEO-CARDS-GIRO-2410 — leaf has no older imports, so this creates no cycle.
  const rel = String(file ?? '').replace(/\\/g, '/')
  const known = IDIOMAS_FORMATOS_2410_MANIFEST.sources[rel]
  if (!known || typeof text !== 'string') return text
  const hash = sourceHash(text.replace(/\r\n/g, '\n'))
  if (hash === known.beforeHash) { verifiedBefore(known, false, rel); return text }
  if (known.integratedBeforeHash && hash === known.integratedBeforeHash) { verifiedBefore(known, true, rel); return text }
  // The merged current source restores the upstream source; the original pre-integration
  // source still restores its original dd0 base. Equal after hashes have the same before.
  let before
  if (hash === known.afterHash) before = verifiedBefore(known, Object.hasOwn(known, 'integratedBefore'), rel)
  else if (known.originalAfterHash && hash === known.originalAfterHash) before = verifiedBefore(known, false, rel)
  else {
    // Historical guardians re-enter with older sources and their own mutants.
    // Only an identifiable task layer can be undone; evidence survives removed comments.
    if (!text.includes('KINEO-IDIOMAS-FORMATOS-2410') && !(known.evidence ?? []).some(fragment => text.includes(fragment))) return text
    throw new Error('desfaz-idiomas-formatos-2410: fonte divergente ' + rel)
  }
  return text.includes('\r\n') ? before.replace(/\n/g, '\r\n') : before
}
