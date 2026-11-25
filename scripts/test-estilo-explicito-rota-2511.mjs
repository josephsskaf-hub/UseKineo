import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const src = readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8').replace(/\r\n/g, '\n')
const start = src.indexOf('const styleAnchor = deriveStyleAnchor(')
const romanceEnd = src.indexOf('\n', src.indexOf('if (romanceAdulto.ativo) Object.assign(styleAnchor', start))
assert.ok(start >= 0 && romanceEnd > start)
assert.match(src, /body = await req\.json\(\)/)
const block = src.slice(start, romanceEnd)
const loader = createOfflineLoader()
const style = loader('@/lib/cinematic/sceneStyle')
const gate = loader('@/lib/cinematic/filmLook2511Server')
const shared = loader('@/lib/cinematic/filmLook2511')
const internalEmail = loader('@/lib/internalAccounts').INTERNAL_EXACT_EMAILS[0]
function probe(source) {
  const js = ts.transpileModule(source + '\nstyleAnchor', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
  const compiled = new vm.Script(js)
  return (text, look, house = true, romance = false, suffix = '') => compiled.runInNewContext({
    ...style, ...gate, prompt: text, body:{look}, user:{email:house ? internalEmail : 'external@example.invalid'},
    romanceAdulto:{ativo:romance}, styleSuffix:suffix, textoDoLook:(script, idea)=>[script,idea].filter(Boolean).join(' '),
  })
}
const resolve = probe(block)
const cases = ['A cartoon guard', 'An anime detective', 'Harbor at night', 'dark cinematic 3D animation', 'film noir', 'not cartoon']
for (const text of cases) for (const suffix of ['', ', candlelight']) {
  const base = style.deriveStyleAnchor(text, suffix)
  for (const value of [undefined, null, '', 'realistic', {}, 1]) assert.deepEqual(resolve(text,value,true,false,suffix),base)
  for (const value of ['anime','photoreal','animated3d']) assert.deepEqual(resolve(text,value,false,false,suffix),base)
}
function casesExplicit(resolve) {
  assert.equal(resolve('A cartoon guard','photoreal').look,'photoreal','explicit realistic')
  assert.equal(resolve('A guard','animated3d').look,'animated3d','explicit cartoon')
  assert.equal(resolve('A cartoon guard','anime').look,'anime','explicit anime')
  assert.equal(resolve('A couple','anime',true,true).look,'photoreal','romance must remain photoreal')
  assert.equal(resolve('Plain scene','anime',false).look,'photoreal','external bypassed gate')
}
casesExplicit(resolve)
for (const [before, after, reason] of [
  ['selectedFilmLook(body.look, user.email)', 'undefined','explicit realistic'],
  ['selectedFilmLook(body.look, user.email)', 'body.look','external bypassed gate'],
  ['if (romanceAdulto.ativo)', 'if (false)','romance must remain photoreal'],
]) {
  assert.ok(block.includes(before))
  assert.throws(()=>casesExplicit(probe(block.replace(before,after))),err=>err.code==='ERR_ASSERTION' && err.message.startsWith(reason))
}
assert.equal(shared.filmLookEnabled(true,'off'),false)
assert.equal(shared.filmLookEnabled(false,'internal'),false)
for(const [text,expected] of [['tall guard','photoreal'],['un dessin animé','animated3d'],['anime chase','anime'],['no cartoon','photoreal']]) {
  assert.equal(shared.suggestedFilmLook(text),expected)
}
console.log('Film look: route consumer, eligible accounts, invalid values, fallback, romance and 3 targeted mutants passed.')
