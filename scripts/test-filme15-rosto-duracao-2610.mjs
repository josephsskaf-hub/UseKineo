// KINEO-FILME15-PERFEITO-2610 — actual pure production helpers; no provider, env file or network.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const load = createOfflineLoader()
const M = load('@/lib/cinematic/filme15Perfeito')
const json = v => JSON.parse(JSON.stringify(v))
let checks = 0
const check = (name, fn) => { fn(); checks++; console.log('OK ' + name) }
check('only Seedance 15 character_story uses one base', () => {
  assert.equal(M.usaRostoFixo15(true, 'character_story', false), true)
  for (const args of [[false, 'character_story', false], [true, 'documentary_faceless', false], [true, 'presenter', false], [true, 'character_story', true]]) assert.equal(M.usaRostoFixo15(...args), false)
})
check('three animations receive the SAME reviewed scene-1 photo, no extra sheet', () => {
  assert.deepEqual(json(M.ancorasDoRosto15('https://test.invalid/reviewed-scene-1.jpg', 3)), Array(3).fill('https://test.invalid/reviewed-scene-1.jpg'))
  assert.deepEqual(json(M.ancorasDoRosto15(null, 3)), [null, null, null])
})
const wordsOf = text => text.trim().split(/\s+/).filter(Boolean).length
check('short narration removed by sentence filters plans an APPEND to the shortest scene', () => {
  const falas = ['The cat opens a door.', 'It sees the sunlight.', 'It returns home.']
  const [p] = M.planoDeAcrescimo15(falas, wordsOf, 2.5)
  assert.equal(p.index, 2)
  assert.equal(p.text, falas[2])
  assert.equal(p.addWords, Math.ceil(15 * 2.5) - 12)
  assert.equal(p.maxWords, 3 + p.addWords + 3)
})
check('at 14 seconds or above no append; no upper-bound truncation', () => {
  for (const count of [35, 38, 55, 100]) assert.deepEqual(json(M.planoDeAcrescimo15([Array(count).fill('word').join(' ')], wordsOf, 2.5)), [])
  for (const pace of [0, -1, NaN, Infinity]) assert.deepEqual(json(M.planoDeAcrescimo15(['a b'], wordsOf, pace)), [])
})
check('exact accepted line remains untouched, rewrites and prefix collisions rejected', () => {
  assert.equal(M.aceitarAcrescimo15('The cat.', 'The cat. It walks home.'), 'The cat. It walks home.')
  assert.equal(M.aceitarAcrescimo15('The cat', 'The cat. It walks home.'), 'The cat. It walks home.')
  assert.equal(M.aceitarAcrescimo15('The cat.', 'The catalog shows a dog.'), 'The cat.')
  assert.equal(M.aceitarAcrescimo15('The cat.', 'A cat opens a door.'), 'The cat.')
  assert.equal(M.aceitarAcrescimo15('The cat.', null), 'The cat.')
})
const route = readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8')
const start = route.indexOf('      for (let start = 0; start < anchorCount')
const end = route.indexOf('      // Cost logging only', start)
assert.ok(start > 0 && end > start)
const anchorLoop = route.slice(start, end)
async function actualAnchorLoop(fixed, source = anchorLoop) {
  let paid = 0
  const stills = [null, null, null]
  const context = {
    anchorCount: 3, STILL_POOL: 3, stillDeadline: Infinity, STILL_POLL_WINDOW_MS: 12_000,
    rostoFixo15: fixed, sceneStills: stills, classicScenePrompts: ['scene one', 'scene two', 'scene three'],
    romanceAdulto: { ativo: false }, generationSeed: 1, aspectRequested: '9:16',
    generateCinematicSceneStill: async () => `photo-${++paid}`,
    criticoFilme: {}, criticoTarefas: [], criticoEventos: [],
    criticarStillClassico: async (idx, url) => ({ idx, url: `reviewed-${url}` }),
    esperarCriticos: tasks => Promise.all(tasks), esperaMaximaDoCritico: () => 100,
    scenes: [{}, {}, {}], generationId: 'generation', user: { id: 'user' },
    ancorasDoRosto15: M.ancorasDoRosto15, writeServerEvent: async () => true,
    Date, Promise, Math, Boolean,
  }
  const code = ts.transpileModule(`(async () => { let stillsMade = 0; ${source} })()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  await vm.runInNewContext(code, context)
  return { paid, stills }
}
const actual = await actualAnchorLoop(true)
assert.deepEqual(actual, { paid: 1, stills: Array(3).fill('reviewed-photo-1') })
checks++; console.log('OK actual route generates ONE still and shares the reviewed base before clip dispatch')
const outside = await actualAnchorLoop(false)
assert.deepEqual(outside, { paid: 3, stills: ['reviewed-photo-1', 'reviewed-photo-2', 'reviewed-photo-3'] })
checks++; console.log('OK actual route preserves three independent stills outside the fixed-face scope')
const mutant = anchorLoop.replace('if (!rostoFixo15 || i === 0) batch.push(i)', 'batch.push(i)')
assert.notEqual(mutant, anchorLoop)
assert.notEqual((await actualAnchorLoop(true, mutant)).paid, 1)
checks++; console.log('OK mutant that buys three independent faces is killed')
console.log(`${checks} checks passed`)
