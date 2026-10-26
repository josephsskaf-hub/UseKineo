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
console.log(`${checks} duration checks passed`)
