import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
const load = createOfflineLoader()
const { agruparLegendaFaceless15: group } = load('@/lib/filmes/faceless15')
const { buildFree15CanonicalCaptions: canonical } = load('@/lib/free15CanonicalCaptions')
const { idiomaDaLegendaDeSentido: gate } = load('@/lib/filmes/legendaSentido')
const fixture = JSON.parse(fs.readFileSync('scripts/test-support/cooper-legenda-2411.json', 'utf8'))
const tokens = text => text.trim().split(/\s+/)
function timed(text, starts, end = 13.75) {
  const words = tokens(text)
  const times = starts ?? words.map((_, i) => end * i / words.length)
  assert.equal(times.length, words.length)
  return words.map((word, i) => ({ word, start: times[i], end: times[i + 1] ?? end }))
}
const wordsOf = cards => JSON.stringify(cards.flatMap(b => b.words))
const normalize = value => value.toLowerCase().replace(/[.,?!]/g, '')
function defects(cards, annotated) {
  let bad = 0
  for (let i = 1; i < cards.length; i++) {
    const boundary = [cards[i - 1].words.at(-1).word, cards[i].words[0].word].join(' ')
    if (annotated.includes(normalize(boundary))) bad++
  }
  return bad
}

let reads = 0
const authentic = async () => { reads++; return true }
assert.equal(await gate('pt-BR', true), 'pt')
assert.equal(await gate('ES_mx', true, authentic), 'es')
assert.equal(await gate('en', true, async () => false), undefined)
assert.equal(await gate('en', true, async () => { throw Error('auth unavailable') }), undefined)
assert.equal(await gate('en', false, authentic), undefined)
assert.equal(await gate('en', true, authentic, 'off'), undefined)
assert.equal(await gate('de', true, authentic), undefined)
assert.equal(reads, 1, 'no extra identity lookup for external, disabled or unsupported')
const route = fs.readFileSync('app/api/compose/route.ts', 'utf8')
assert.match(route, /faceless15\.formato\s*\?\s*await idiomaDaLegendaDeSentido\(language, contaDaCasaExata\(user\.email\), isServiceFinish/)
assert.match(route, /composeAdmin\.auth\.admin\.getUserById\(authenticatedUserId\)\s*return !error && contaDaCasaExata\(data\?\.user\?\.email\)/)
assert.equal((route.match(/buildFree15CanonicalCaptions\(\{[^{}]+idiomaDeSentido \}\)/g) ?? []).length, 2)
assert.equal((route.match(/aplicarFaceless15\([^\n]+\{ idiomaDeSentido, whisperWords:/g) ?? []).length, 2)

const { contaDaCasaExata, INTERNAL_EXACT_EMAILS } = load('@/lib/internalAccounts')
const statement = route.slice(route.indexOf('    const idiomaDeSentido ='), route.indexOf('    const faceless15Relato ='))
const runRouteGate = new (Object.getPrototypeOf(async function() {}).constructor)(
  'faceless15','language','user','isServiceFinish','composeAdmin','authenticatedUserId','idiomaDaLegendaDeSentido','contaDaCasaExata',
  statement + '\nreturn idiomaDeSentido'
)
const realInternal = INTERNAL_EXACT_EMAILS[0], fakeInternal = 'test-preview@example.org'
const noLookup = { auth: { admin: { getUserById() { throw Error('unexpected') } } } }
assert.equal(await runRouteGate({formato:true},'en',{email:fakeInternal},false,noLookup,'id-1',gate,contaDaCasaExata),undefined)
assert.equal(await runRouteGate({formato:true},'en',{email:realInternal},false,noLookup,'id-1',gate,contaDaCasaExata),'en')
let verifiedId
const serviceAdmin = {auth:{admin:{getUserById:async id => {verifiedId=id;return {data:{user:{email:fakeInternal}}}}}}}
assert.equal(await runRouteGate({formato:true},'en',{email:realInternal},true,serviceAdmin,'id-1',gate,contaDaCasaExata),undefined)
assert.equal(verifiedId,'id-1')
assert.equal(await runRouteGate({formato:false},'en',{email:realInternal},false,noLookup,'id-1',gate,contaDaCasaExata),undefined)

const segment = (list, cuts) => {
  const ends = [...cuts, list.length]
  return ends.map((end, i) => ({ words: list.slice(ends[i - 1] ?? 0, end) }))
}
for (const track of fixture.tracks) {
  const { lang, text, starts, end, bind } = track
  const words = timed(text, starts, end)
  const before = group(words, 15)
  const after = group(words, 15, 5, await gate(lang, true))
  assert.equal(wordsOf(before), wordsOf(after), 'every token/start/end identical')
  assert.equal(JSON.stringify(before), JSON.stringify(group(words, 15, 5, await gate(lang, false))))
  assert.ok(after.every(b => b.words.length <= 5 && (b.words.length >= 2 || b.fraseInteira)))
  const a = track.originalCuts ? segment(words, track.originalCuts) : before
  assert.ok(defects(a, bind) > 0, 'original has annotated defect')
  assert.equal(defects(after, bind), 0)
  assert.ok(defects(before, bind) > defects(after, bind), 'mutant with segmentation off fails')
  const rendered = canonical({ script: text, audioSeconds: 13.75, source: {}, idiomaDeSentido: lang })
  const pair = { en: 'BLACK TIE', pt: 'GRAVATA PRETA', es: 'CORBATA NEGRA' }[lang]
  assert.ok(rendered.some(e => e.text.includes(pair)), 'canonical repair also protects the observed split')
  console.log(lang, { cardsA: a.length, badA: defects(a,bind), cardsB: after.length, badB: defects(after,bind), replayA: defects(before,bind) })
}
const carrington = JSON.parse(fs.readFileSync('scripts/test-support/fixture-whisper-carrington-1910.json', 'utf8'))
const whisper = carrington.whisperWords ?? carrington.words
assert.ok(whisper.length > 20)
assert.equal(JSON.stringify(group(whisper, carrington.audioDuration)), JSON.stringify(group(whisper, carrington.audioDuration, 5, 'en')))
for (const t of ['A black. Tie the rope carefully.', 'The room was black and white.', 'Green was his favourite colour.']) {
  assert.equal(JSON.stringify(group(timed(t), 15)), JSON.stringify(group(timed(t), 15, 5, 'en')))
}
// Archived reviewer dataset is local to the evidence branch. Production CI never requires it.
if (process.argv.includes('--replay')) {
  const pathAtCommit = '7af247b9d:docs/filme-nota-9/entradas-replay-2311.json'
  const rows = JSON.parse(execFileSync('git', ['show', pathAtCommit], { encoding: 'utf8' }))
  assert.equal(rows.length, 7)
  for (const row of rows) {
    const id = row.id.slice(0, 8)
    const lang = ({ '6cce958f': 'de', e3864c10: 'ur' })[id] ?? 'en'
    const words = timed(row.scenes.map(s => s.voice).join(' '), undefined, 15)
    const a = group(words, 15), b = group(words, 15, 5, await gate(lang,true))
    assert.equal(JSON.stringify(a), JSON.stringify(b), id)
    console.log(id, words.length, a.length, createHash('sha256').update(JSON.stringify(a)).digest('hex').slice(0,12))
  }
}

// Each mutant must violate its named invariant, not merely fail to compile.
function variant(file, from, to) {
  const contents = fs.readFileSync(file, 'utf8')
  assert.equal(contents.split(from).length, 2, 'mutation has exactly one anchor: ' + from)
  return createOfflineLoader({ source: (path, text) => path === file ? text.replace(from, to) : text })
}
const semantic = 'lib/filmes/legendaSentido.ts', partition = 'lib/filmes/faceless15.ts'
async function pairCut(loader, lang, pair) {
  const t = fixture.tracks.find(t => t.lang === lang)
  const cards = loader('@/lib/filmes/faceless15').agruparLegendaFaceless15(timed(t.text,t.starts,t.end),15,5,lang)
  return defects(cards,[pair])
}
assert.equal(await pairCut(variant(semantic, 'return cores.en.test(palavra)', 'return false && cores.en.test(palavra)'), 'en','black tie'), 1)
assert.equal(await pairCut(variant(semantic, "if (lang !== 'en') return cores[lang].test(prox)", "if (lang !== 'en') return false"), 'pt','gravata preta'), 1)
assert.equal(await pairCut(variant(semantic, 'if (nomeComMaiuscula(palavras[i + 1])', 'if (false && nomeComMaiuscula(palavras[i + 1])'), 'es','dan cooper'), 1)
assert.equal(await pairCut(variant(semantic, 'if (sujeitos[lang].test(palavra)', 'if (false && sujeitos[lang].test(palavra)'), 'en','he demanded'), 1)
assert.equal(await pairCut(variant(partition, 'if (antes.some(i => unidos[i]))', 'if (false)'), 'en','black tie'), 1)
const gatesOf = loader => loader('@/lib/filmes/legendaSentido').idiomaDaLegendaDeSentido
assert.equal(await gatesOf(variant(semantic, "if (release === 'off' || !interna)", "if (release === 'off')"))('en', false), 'en')
assert.equal(await gatesOf(variant(semantic, 'if (!await confirmarConta())', 'if (false)'))('en', true, async () => false), 'en')
const brokenRepair = variant('lib/free15CanonicalCaptions.ts','seconds, undefined, input.idiomaDeSentido)','seconds, undefined)').call(null,'@/lib/free15CanonicalCaptions')
const brokenEnglish = brokenRepair.buildFree15CanonicalCaptions({script:fixture.tracks[0].text,audioSeconds:13.75,source:{},idiomaDeSentido:'en'})
assert.ok(!brokenEnglish.some(e => e.text.includes('BLACK TIE')), 'bypassing canonical repair restores the broken tie')
console.log('8 applied mutants reproduced the expected boundary or exposure failure.')
