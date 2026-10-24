// KINEO-IDIOMAS-FORMATOS-2410 — exact newest source layer, before historical guardians.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const IDIOMAS_FORMATOS_2410_BASE = 'dd0abba8cc711be4bde2faaac39f0aef29f3f90d'
export const IDIOMAS_FORMATOS_2410_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-idiomas-formatos-2410-fontes.json', import.meta.url), 'utf8'))
export function semIdiomasFormatos2410(text, file) {
  const rel = String(file ?? '').replace(/\\/g, '/')
  const known = IDIOMAS_FORMATOS_2410_MANIFEST.sources[rel]
  if (!known || typeof text !== 'string') return text
  const hash = createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex')
  if (hash === known.beforeHash) return text
  if (hash !== known.afterHash) throw new Error('desfaz-idiomas-formatos-2410: fonte divergente ' + rel)
  return text.includes('\r\n') ? known.before.replace(/\n/g, '\r\n') : known.before
}
