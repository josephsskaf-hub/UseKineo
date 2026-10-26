// KINEO-FILME15-PERFEITO-2610: real failing signed prompt excerpts supplied 26/10.
// Pure visual rewrite; no env file, network, narration changes or paid work.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const file = 'lib/cinematic/objetosSemTexto15.ts'
const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const real = createOfflineLoader()(file)
const cases = [
  ['22a287e0533f', 'A close-up of a yellowed, aged document with intricate patterns, revealing cryptic text.', /blank reverse/, /intricate patterns|revealing cryptic text/i],
  ['d60117c62c20', 'A close-up of a phone screen displaying a dramatic message.', /abstract defocused color shapes/, /displaying a dramatic message/i],
  ['dd9497345030', 'A close-up of a hand holding crumpled bank fee paperwork.', /unmarked reverse/, /bank fee paperwork/i],
]
function contract(lib) {
  for (const [id, input, positive, conflict] of cases) {
    const safe = lib.sanitizarObjetos15(input, true)
    assert.match(safe, positive, id + ': physically text-free prop variant')
    assert.doesNotMatch(safe, conflict, id + ': removes the contradictory positive text request')
    assert.equal(lib.sanitizarObjetos15(input, false), input, id + ': outside Seedance15 remains byte-identical')
    assert.equal(lib.sanitizarObjetos15(safe, true), safe, id + ': safe to sanitize signed retry again')
  }
  const action = 'A woman in a red coat raises her phone screen displaying an urgent message, then turns toward the open door.'
  const safe = lib.sanitizarObjetos15(action, true)
  assert.ok(safe.startsWith('A woman in a red coat raises her phone screen'))
  assert.ok(safe.endsWith(', then turns toward the open door.'))
  assert.match(safe, /abstract defocused color shapes/)
  assert.equal(lib.sanitizarObjetos15('The same girl runs across a sunlit garden.', true), 'The same girl runs across a sunlit garden.')
  const hand = lib.sanitizarObjetos15(cases[2][1], true)
  assert.ok(hand.startsWith('A close-up of a hand holding crumpled '), 'preserve hand, holding and crumpled prop')
}
contract(real)
const mutant = raw.replace('let safe = prompt', 'return prompt; let safe = prompt')
assert.notEqual(mutant, raw)
const mutated = createOfflineLoader({ source: (name, text) => name === file ? mutant : text })(file)
assert.throws(() => contract(mutated), assert.AssertionError, 'no-op sanitizer mutant must fail the same real cases')
const route = fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8')
const line = route.split(/\r?\n/).find(text => text.includes('if (seedanceShortFilm) for') && text.includes('sanitizarObjetos15'))
assert.ok(line, 'real final vector calls sanitizer inside the Seedance15 gate')
assert.ok(route.indexOf(line) < route.indexOf('const sceneStills:'), 'sanitize before any classic still')
for (const active of [false, true]) {
  const prompts = cases.map(c => c[1]), expected = prompts.map(p => real.sanitizarObjetos15(p, active))
  vm.runInNewContext(ts.transpileModule(line, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { seedanceShortFilm: active, classicScenePrompts: prompts, sanitizarObjetos15: real.sanitizarObjetos15 })
  assert.deepEqual(prompts, expected, 'execute actual call, scope=' + active)
}
console.log('PASS 3 measured prop prompts, preserved actors/actions, exact outside scope, real route call and no-op mutant')
