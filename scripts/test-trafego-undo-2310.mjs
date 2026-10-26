// Exact complete task delta, in memory only. No production/credentials/network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { semIdiomasFormatos2410 } from './test-support/desfaz-idiomas-formatos-2410.mjs' // KINEO-IDIOMAS-FORMATOS-2410 — restore only the later layer in this historical undo proof; pages/index/health execute current sources.
import { semTrafego2310, TRAFEGO_2310_BASE, TRAFEGO_2310_HUNKS, TRAFEGO_2310_NEW_PRODUCT_FILES } from './test-support/desfaz-trafego-2310.mjs'
import { semVitrine2610 } from './test-support/desfaz-vitrine-filmes-2610.mjs' // KINEO-VITRINE-FILMES-2610 — exact later layer removed before legacy byte-for-byte, EOL, tamper and protected-source proofs.
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'
// KINEO-AFILIADO-50-2610: remove only this later layer before historical source checks; retain raw EOL.
const affiliateRaw = (rel, source) => { const projected = semAfiliado50_2610(rel, source); return source.includes('\r\n') ? projected.replace(/\n/g, '\r\n') : projected }
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
const lf = (s) => s.replace(/\r\n/g, '\n')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
for (const [file, hunks] of Object.entries(TRAFEGO_2310_HUNKS)) {
  const integrated = semVitrine2610(affiliateRaw(file, fs.readFileSync(file, 'utf8')), file), actual = semIdiomasFormatos2410(integrated, file), current = lf(actual), base = lf(git('show', `${TRAFEGO_2310_BASE}:${file}`)) // KINEO-IDIOMAS-FORMATOS-2410
  check(current === lf(git('show', `8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405:${file}`)), file + ': Idiomas removal preserves the exact published Traffic layer') // KINEO-IDIOMAS-FORMATOS-2410
  check(semTrafego2310(current, file) === base, file + ': complete source returns exactly to immutable base')
  check(lf(semTrafego2310(actual, file)) === base, file + ': actual filesystem EOL')
  check(semTrafego2310(current.replace(/\n/g, '\r\n'), file) === base.replace(/\n/g, '\r\n'), file + ': CRLF roundtrip')
  check(semTrafego2310(base, file) === base, file + ': base idempotent')
  check(semTrafego2310(current, file.replace(/\//g, '\\')) === base, file + ': Windows separators')
  const extra = '\n// unrelated edit survives\r\n'
  check(semTrafego2310(current + extra, file) === base + extra, file + ': unrelated edits preserved')
  for (const hunk of hunks) {
    assert.throws(() => semTrafego2310(current.replace(hunk.after, hunk.after.replace(/\S/, '@')), file), /expected exactly 1 candidate match/, file + ': mutated hunk must reject'); checks++
    assert.throws(() => semTrafego2310(current + '\n' + hunk.after, file), /expected exactly 1 candidate match/); checks++
  }
}
for (const file of TRAFEGO_2310_NEW_PRODUCT_FILES) {
  check(fs.existsSync(file), file + ': new file present')
  check(git('ls-tree', '--name-only', TRAFEGO_2310_BASE, '--', file).trim() === '', file + ': absent in base')
}
for (const file of ['lib/checkoutPricing.ts', 'lib/settlementCurrency.ts', 'vercel.json', 'app/robots.ts']) {
  check(lf(semVitrine2610(affiliateRaw(file, fs.readFileSync(file, 'utf8')), file)) === lf(git('show', `${TRAFEGO_2310_BASE}:${file}`)), file + ': protected source untouched')
}
check(semTrafego2310(null, 'app/sitemap.ts') === null && semTrafego2310('untouched', 'other.ts') === 'untouched', 'unrelated/null unchanged')
console.log(`KINEO-TRAFEGO-2310-UNDO: ${checks} passed, 0 failed.`)
