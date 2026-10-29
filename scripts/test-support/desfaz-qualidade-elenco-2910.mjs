// KINEO-QUALIDADE-REGRESSOES-2910 — exact historical projection of the two reviewed
// 29/10 commits plus the NO_TEXT regression restoration. They added filmQuality
// and moved existing helpers; older byte/hash
// guardians must remove this NEWER layer before removing idiomas/pacing/elenco.
// Product/current-quality tests read raw sources. Never use this helper in lib/app.
// Unknown edits are never discarded: whole-source hashes, unique hunks and the
// complete restored hash must agree. A marker alone grants no exception.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const QUALIDADE_ELENCO_2910 = JSON.parse(readFileSync(new URL('./desfaz-qualidade-elenco-2910-fontes.json', import.meta.url), 'utf8'))
const lf = text => text.replace(/\r\n/g, '\n')
const sha = text => createHash('sha256').update(text).digest('hex')
const rel = file => String(file ?? '').replace(/\\/g, '/')

export function semQualidadeElenco2910(source, file) {
  const path = rel(file), entry = QUALIDADE_ELENCO_2910.scope[path]
  if (typeof source !== 'string' || !entry) return source
  const text = lf(source), hash = sha(text)
  if (hash === entry.beforeSha256) return source
  if (hash !== entry.afterSha256) {
    // A historical guardian can re-enter with its already-projected source and
    // mutants. Only absence of ALL newer hunk evidence permits that pass-through.
    if (!text.includes('KINEO-QUALIDADE-TODOS-MOTORES-2910') && !text.includes('KINEO-ELENCO-MARCADOR-2910') && !entry.hunks.some(h => text.includes(h.after))) return source
    throw Error('desfaz-qualidade-elenco-2910: fonte divergente ' + path)
  }
  let result = text
  for (const hunk of entry.hunks) {
    if (!hunk.after || result.split(hunk.after).length !== 2) throw Error('desfaz-qualidade-elenco-2910: trecho ausente/ambiguo ' + path)
    result = result.replace(hunk.after, () => hunk.before)
  }
  if (sha(result) !== entry.beforeSha256) throw Error('desfaz-qualidade-elenco-2910: resultado divergente ' + path)
  return source.includes('\r\n') ? result.replace(/\n/g, '\r\n') : result
}

// Used ONLY for the historical 8.2 path gate. Exact reviewed delta from the
// actual upstream source is required, including bytes of newly added modules.
export function deltaQualidadeElenco2910Exato(source, upstream, file) {
  if (typeof source !== 'string') return false
  const path = rel(file), text = lf(source), entry = QUALIDADE_ELENCO_2910.scope[path]
  if (entry) return typeof upstream === 'string' && sha(text) === entry.afterSha256
    && sha(lf(upstream)) === entry.beforeSha256 && semQualidadeElenco2910(text, path) === lf(upstream)
  const added = QUALIDADE_ELENCO_2910.addedSources[path]
  return !!added && upstream === null && sha(text) === added
}
