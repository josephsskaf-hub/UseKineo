// KINEO-QUALIDADE-REGRESSOES-2910 — offline proof of the exact historical layer.
// The live quality/cast contracts remain covered by test-qualidade-todos-motores-
// 2910 and test-elenco-marcador-2910 against RAW product sources.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { QUALIDADE_ELENCO_2910 as manifest, semQualidadeElenco2910, deltaQualidadeElenco2910Exato } from './test-support/desfaz-qualidade-elenco-2910.mjs'
import { semAdsCena95Pacing2110 } from './test-support/desfaz-ads-cena-95-pacing-2110.mjs'
import { semElencoEpoca2710 } from './test-support/desfaz-consertos-2710.mjs'

const lf = s => s.replace(/\r\n/g, '\n')
const git = (...args) => lf(execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20 }))
let sources = 0, rejectedMutants = 0
for (const [file, entry] of Object.entries(manifest.scope)) {
  const raw = lf(readFileSync(file, 'utf8')), base = git('show', `${manifest.base}:${file}`)
  assert.equal(semQualidadeElenco2910(raw, file), base, `whole historical source restored: ${file}`)
  assert.equal(semQualidadeElenco2910(base, file), base, `idempotent baseline: ${file}`)
  assert.equal(semQualidadeElenco2910(raw.replace(/\n/g, '\r\n'), file), base.replace(/\n/g, '\r\n'), `CRLF: ${file}`)
  assert.ok(deltaQualidadeElenco2910Exato(raw, base, file), `exact authorized delta: ${file}`)
  assert.ok(!deltaQualidadeElenco2910Exato(raw, base + '\n// unrelated upstream edit\n', file))
  const changed = raw + '\n// unexpected change outside reviewed layer\n'
  assert.throws(() => semQualidadeElenco2910(changed, file), /fonte divergente/, file)
  assert.ok(!deltaQualidadeElenco2910Exato(changed, base, file), `path gate rejects extra edit: ${file}`)
  // Change the real changed hunk while retaining the task markers: no marker-based approval.
  const partial = raw.replace(entry.hunks[0].after, entry.hunks[0].after + '\nvoid 0;\n')
  assert.throws(() => semQualidadeElenco2910(partial, file), /fonte divergente/, file)
  rejectedMutants += 2; sources++
}
for (const file of Object.keys(manifest.addedSources)) {
  const raw = lf(readFileSync(file, 'utf8'))
  assert.equal(git('ls-tree', '--name-only', manifest.base, '--', file), '', `new file absent in historical base: ${file}`)
  assert.ok(deltaQualidadeElenco2910Exato(raw, null, file))
  assert.ok(!deltaQualidadeElenco2910Exato(raw + '\nvoid 0;\n', null, file))
  assert.ok(!deltaQualidadeElenco2910Exato(raw, raw, file), 'existing upstream module never excluded as new')
  rejectedMutants++; sources++
}
assert.equal(semQualidadeElenco2910('unrelated source', 'lib/unrelated.ts'), 'unrelated source')
assert.ok(!deltaQualidadeElenco2910Exato('KINEO-QUALIDADE-TODOS-MOTORES-2910', null, 'lib/cinematic/unreviewed.ts'))
for (const file of ['lib/ads/cena/plan.ts', 'lib/ads/cena/pipeline95.ts']) {
  const raw = lf(readFileSync(file, 'utf8')), base = git('show', `${manifest.base}:${file}`)
  assert.equal(semAdsCena95Pacing2110(raw, file), semAdsCena95Pacing2110(base, file), `entire idiomas/pacing historical chain preserved: ${file}`)
}
const route = 'app/api/generate-video-cinematic/route.ts'
const rawRoute = lf(readFileSync(route, 'utf8')), baseRoute = git('show', `${manifest.base}:${route}`)
assert.equal(semElencoEpoca2710(semQualidadeElenco2910(rawRoute, route), route), semElencoEpoca2710(baseRoute, route), 'ElencoEpoca rollback retains the exact same upstream result')
console.log(`ok qualidade/camadas: ${sources} reviewed sources; ${rejectedMutants} altered/partial-source mutants rejected; unchanged historical chains and CRLF`)
