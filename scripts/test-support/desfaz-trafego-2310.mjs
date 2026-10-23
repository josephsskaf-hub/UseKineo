// KINEO-TRAFEGO-2310 — pure, exact in-memory source undo for older guardians.
// No writes/network. New task guardians always execute actual current sources.
import { readFileSync } from 'node:fs'
const table = JSON.parse(readFileSync(new URL('./desfaz-trafego-2310-hunks.json', import.meta.url), 'utf8'))
export const TRAFEGO_2310_BASE = table.base
export const TRAFEGO_2310_HUNKS = table.files
export const TRAFEGO_2310_NEW_PRODUCT_FILES = Object.freeze(table.newProductFiles)
const offsets = (source, needle) => {
  const found = []
  for (let at = source.indexOf(needle); at >= 0; at = source.indexOf(needle, at + 1)) found.push(at)
  return found
}
export function semTrafego2310(source, file) {
  const relative = typeof file === 'string' ? file.replace(/\\/g, '/') : file
  const hunks = table.files[relative]
  if (typeof source !== 'string' || !hunks) return source
  const flat = source.replace(/\r\n/g, '\n')
  const evidence = /KINEO-TRAFEGO-2310|\b(?:CitationDirectAnswer|CitationDetails|checkTrafficHealth|trafego2310Sitemap|trafego2310FilmIntro|semTrafego2310|idempotencyKey|emailOnly)\b|test-trafego-(?:pages|index|health|undo)-2310/.test(flat)
  if (hunks.every((h) => offsets(flat, h.after).length === 0) && !evidence) return source
  const rawOffset = (position) => { let raw = 0; for (let n = 0; n < position; n++) raw += source[raw] === '\r' && source[raw + 1] === '\n' ? 2 : 1; return raw }
  const plans = hunks.map((h, n) => {
    const found = offsets(flat, h.after)
    if (found.length !== 1) throw Error(`KINEO-TRAFEGO-2310: ${relative} hunk ${n}: expected exactly 1 candidate match, found ${found.length}`)
    const at = rawOffset(found[0]), end = rawOffset(found[0] + h.after.length)
    return { at, end, replacement: source.slice(at, end).includes('\r\n') ? h.before.replace(/\n/g, '\r\n') : h.before }
  }).sort((a, b) => b.at - a.at)
  for (let n = 1; n < plans.length; n++) if (plans[n].end > plans[n - 1].at) throw Error('Overlapping task hunks')
  let result = source
  for (const p of plans) result = result.slice(0, p.at) + p.replacement + result.slice(p.end)
  return result
}
