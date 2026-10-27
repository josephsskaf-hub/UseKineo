import { semConsertos2710 } from './desfaz-consertos-2710.mjs' // KINEO-CONSERTOS-2710 — as 6 entregas de 27/10 (camada mais nova) saem primeiro
// KINEO-UPSELL-FILME15-2610 — exact newest layer for historical guardians only.
// Current behavior is tested raw by test-upsell-filme15-2610.mjs. No source file is changed here.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { semLevaSobreIntegracao2610 } from './leva-rebase-2610.mjs'
export const UPSELL_FILME15_2610 = JSON.parse(readFileSync(new URL('./desfaz-upsell-filme15-2610-hunks.json', import.meta.url), 'utf8'))
// The original task manifest above stays frozen. These exact inverse hunks remove
// only the upsell merge while retaining Vitrine, Affiliate50 and production gates.
export const UPSELL_FILME15_2610_INTEGRATION = JSON.parse(readFileSync(new URL('./desfaz-upsell-filme15-2610-integration.json', import.meta.url), 'utf8'))
const sha = text => createHash('sha256').update(text).digest('hex')
function integrationEntry(rel) {
  const integration = UPSELL_FILME15_2610_INTEGRATION
  const originalFiles = Object.keys({ ...UPSELL_FILME15_2610.scope, ...UPSELL_FILME15_2610.readerScope }).sort()
  if (integration.version !== 1 || integration.task !== 'KINEO-UPSELL-FILME15-2610'
      || integration.base !== 'c93ccc0a5151a3dcdd38fd3c6647731ab3399402'
      || integration.product !== '3c41db6f931d4c3840ff2f28153fd94be608f89c'
      || integration.original !== '908cdad7a8e36b3b16a0c60e3f9ef72a0b385121'
      || JSON.stringify(Object.keys(integration.scope ?? {}).sort()) !== JSON.stringify(originalFiles)) throw new Error('desfaz upsell-filme15-2610: divergent integration manifest')
  const entry = integration.scope[rel]
  if (entry && sha(JSON.stringify(entry.hunks)) !== entry.hunksSha256) throw new Error('desfaz upsell-filme15-2610: divergent integration hunks in ' + rel)
  return entry
}
export function semUpsellFilme152610(source, file) {
  source = semConsertos2710(source, file) // KINEO-CONSERTOS-2710
  const rel = String(file ?? '').replace(/\\/g, '/')
  const original = UPSELL_FILME15_2610.scope[rel] ?? UPSELL_FILME15_2610.readerScope?.[rel]
  if (!original || typeof source !== 'string') return source
  source = semLevaSobreIntegracao2610(source, file)
  const integrated = integrationEntry(rel)
  const crlf = source.includes('\r\n'); let text = source.replace(/\r\n/g, '\n')
  const digest = sha(text)
  if (digest === original.beforeSha256 || digest === integrated.beforeSha256) return source
  // Preserve the original delivery proof as well as the composed integration.
  // A known original source still restores its original immutable predecessor.
  const entry = digest === original.afterSha256 ? original : integrated
  // Older historical snapshots have no identifiable trace of this task.
  if (![...original.evidence, ...integrated.evidence].some(fragment => text.includes(fragment))) return source
  // Duplicates stay an ambiguity failure in either frozen history, including
  // when corruption prevents selecting a history by its complete source hash.
  if (digest !== original.afterSha256 && digest !== integrated.afterSha256
      && [...original.hunks, ...integrated.hunks].some(hunk => text.split(hunk.after).length > 2)) throw new Error('desfaz upsell-filme15-2610: ambiguous hunk in ' + rel)
  for (const hunk of entry.hunks) {
    const occurrences = text.split(hunk.after).length - 1
    if (occurrences !== 1) throw new Error(`desfaz upsell-filme15-2610: ${occurrences === 0 ? 'missing' : 'ambiguous'} hunk in ${rel}`)
    text = text.replace(hunk.after, () => hunk.before)
  }
  if (sha(text) !== entry.beforeSha256) throw new Error('desfaz upsell-filme15-2610: source differs from immutable predecessor in ' + rel)
  return crlf ? text.replace(/\n/g, '\r\n') : text
}
