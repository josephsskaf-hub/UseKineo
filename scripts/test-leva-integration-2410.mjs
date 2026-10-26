// KINEO-LEVA-2410 — exact live integration, all sibling layers preserved in reverse merge order.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LEVA, LEVA_MANIFEST_PATH, levaGit, levaBlob, levaHash, levaLf, verifyLevaCurrentTree, levaTaskInventory, levaCurrentInventory } from './test-support/leva-integration-2410.mjs'
import { semCartoonTracao2210, reverseCartoonIntegrated2410, CARTOON_TRACAO_INTEGRATED_HUNKS } from './test-support/desfaz-cartoon-tracao-2210.mjs'
import { semCompraAvulsa2410 } from './test-support/desfaz-compra-avulsa-2410.mjs'
import { semApresentadores2410 } from './test-support/desfaz-apresentadores-2410.mjs'
import { semAmostraAnuncio2410 } from './test-support/desfaz-amostra-anuncio-2410.mjs'
import { semCardsGiro2410 } from './test-support/desfaz-cards-giro-2410.mjs'
const stages = [['purchase', semCompraAvulsa2410], ['presenters', semApresentadores2410], ['sample', semAmostraAnuncio2410], ['cartoon', semCartoonTracao2210], ['cards', semCardsGiro2410]]
assert.equal(LEVA.base, '1c078ed013302ac47c42f783305df688c4e97cfd')
assert.equal(LEVA.head, '68c65670')
assert.deepEqual(stages.map(([key]) => LEVA.layers[key].after), ['68c65670', '418971fd', 'cfd30692', '618bed34', '3ec6c9d9'])
const expectedLayers = {
  cards: { base: LEVA.base, original: '3ec6c9d9', before: LEVA.base, after: '3ec6c9d9' },
  sample: { base: LEVA.base, original: '17afd045d', before: '618bed34', after: 'cfd30692' },
  presenters: { base: LEVA.base, original: '3a4db3096', before: 'cfd30692', after: '418971fd' },
  purchase: { base: '7950e41134dd03388e67c131501d3e2bce61a3eb', original: '51b6431ce', before: '418971fd', after: '68c65670' },
  cartoon: { base: '7950e41134dd03388e67c131501d3e2bce61a3eb', original: 'c91476688', before: '3ec6c9d9', after: '618bed34' },
  languages: { base: '8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405', original: '7950e41134dd03388e67c131501d3e2bce61a3eb' },
}
for (const layer of Object.values(expectedLayers)) if (layer.after) layer.files = levaGit('diff', '--name-only', '--diff-filter=M', layer.before, layer.after).trim().split('\n').filter(Boolean)
assert.deepEqual(LEVA.layers, expectedLayers, 'every layer identity, original baseline and complete immutable modified-file list is pinned')
const textFiles = LEVA.inventory.filter(file => file !== LEVA_MANIFEST_PATH && /\.(?:mjs|cjs|js|jsx|ts|tsx|json|ya?ml|sql|md|html|css|txt|log)$/.test(file)).sort()
assert.deepEqual(Object.keys(LEVA.sources).sort(), textFiles, 'every inventoried text file has exactly one current-source seal; no source can be omitted')
for (const entry of Object.values(LEVA.sources)) assert.match(entry.hash, /^[0-9a-f]{64}$/, 'source seal is a complete SHA256')
verifyLevaCurrentTree()
const guardFile = 'scripts/test-leva-integration-2410.mjs', savedSeal = LEVA.sources[guardFile]
try { delete LEVA.sources[guardFile]; assert.throws(verifyLevaCurrentTree, /manifesto divergente/, 'omitting a live source hash fails closed') } finally { LEVA.sources[guardFile] = savedSeal }
for (const key of ['before', 'original']) {
  const saved = LEVA.layers.sample[key]
  try { LEVA.layers.sample[key] = '0000000'; assert.throws(verifyLevaCurrentTree, /manifesto divergente/, 'mutated ' + key + ' metadata fails closed') } finally { LEVA.layers.sample[key] = saved }
}
const savedFiles = LEVA.layers.sample.files
try { LEVA.layers.sample.files = savedFiles.slice(1); assert.throws(verifyLevaCurrentTree, /manifesto divergente/, 'omitting an immutable layer source fails closed') } finally { LEVA.layers.sample.files = savedFiles }
let checks = 0
assert.equal(levaLf(readFileSync('scripts/test-support/desfaz-cartoon-tracao-2210-original-hunks.json', 'utf8')), levaBlob('c91476688', 'scripts/test-support/desfaz-cartoon-tracao-2210-hunks.json'), 'original immutable Cartoon hunk map remains byte-exact')
assert.deepEqual(Object.keys(CARTOON_TRACAO_INTEGRATED_HUNKS), LEVA.layers.cartoon.files.filter(file => file !== 'app/api/admin/send-kids-launch/route.ts').sort((a,b) => Object.keys(CARTOON_TRACAO_INTEGRATED_HUNKS).indexOf(a)-Object.keys(CARTOON_TRACAO_INTEGRATED_HUNKS).indexOf(b)), 'integrated Cartoon hunks cover every modified existing source')
for (const [file, hunks] of Object.entries(CARTOON_TRACAO_INTEGRATED_HUNKS)) {
  const candidate = levaBlob('618bed34', file), before = levaBlob('3ec6c9d9', file)
  assert.equal(reverseCartoonIntegrated2410(candidate, file), before, 'recorded integrated hunks actually restore the Giro base: ' + file)
  for (const hunk of hunks) {
    assert.equal(candidate.split(hunk.after).length-1, 1, 'each reanchored context matches once: ' + file)
    const index = candidate.indexOf(hunk.after), offset = Math.floor(hunk.after.length/2)
    const tampered = candidate.slice(0,index+offset) + (candidate[index+offset] === 'X' ? 'Y' : 'X') + candidate.slice(index+offset+1)
    for (const bad of [tampered, candidate.replace(hunk.after,''), candidate+'\n'+hunk.after]) assert.throws(() => reverseCartoonIntegrated2410(bad,file), /context|fonte divergente/, 'integrated context tamper/missing/duplicate rejects: ' + file)
    checks += 4
  }
}
const workflow = readFileSync('.github/workflows/guardiao.yml','utf8')
assert.equal(levaLf(semAmostraAnuncio2410(workflow,'.github/workflows/guardiao.yml')),levaBlob('618bed34','.github/workflows/guardiao.yml'),'strip Compra, Apresentadores and Amostra before Cartoon workflow hunks')
assert.equal(levaLf(semCartoonTracao2210(workflow,'.github/workflows/guardiao.yml')),levaBlob('3ec6c9d9','.github/workflows/guardiao.yml'),'Cartoon reanchored workflow reverse preserves exact Cards/Giro bytes')
assert.equal(levaLf(semCardsGiro2410(workflow,'.github/workflows/guardiao.yml')),levaBlob(LEVA.base,'.github/workflows/guardiao.yml'),'Cards/Giro original workflow hash/reverse stays exact after all later layers leave')
for (const [task, undo] of stages) {
  const layer = LEVA.layers[task]
  for (const file of layer.files) {
    const raw = readFileSync(file, 'utf8'), expected = levaBlob(layer.before, file)
    const actual = undo(raw, file)
    assert.equal(levaLf(actual), expected, task + ': all newer layers leave the exact previous merge prefix: ' + file)
    assert.equal(undo(actual, file), actual, task + ': integrated fixed point: ' + file)
    assert.equal(undo(levaLf(raw).replace(/\n/g, '\r\n'), file.replaceAll('/', '\\')), expected.replace(/\n/g, '\r\n'), task + ': CRLF + Windows path: ' + file)
    assert.throws(() => assert.equal(levaLf(undo(raw + '\n// KINEO-' + ({ cartoon:'CARTOON-TRACAO-2210',purchase:'COMPRA-AVULSA-2410',presenters:'APRESENTADORES-2410',sample:'AMOSTRA-ANUNCIO-2410',cards:'CARDS-GIRO-2410' }[task]) + ' unreviewed\n', file)), expected), undefined, task + ': altered integrated bytes cannot silently restore: ' + file)
    checks += 4
  }
}
for (const task of ['cards','purchase','cartoon','languages']) {
  assert.throws(() => levaTaskInventory(task, [...levaCurrentInventory(LEVA.layers[task].base), 'docs/unreviewed-integration.txt']), /inventário/, 'unknown path remains red in ' + task)
  checks++
}
assert.equal(levaHash('same\r\n'), levaHash('same\n'))
console.log(`PASS KINEO-LEVA-2410: ${checks} exact prefix/CRLF/Windows/idempotence/tamper/inventory checks; all current text hashes sealed; original branch assertions remain separate`)
