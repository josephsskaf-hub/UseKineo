// KINEO-APRESENTADORES-2410 — real profile module and actual escolha synthesis callback; all paid boundaries mocked.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const FILE = 'lib/ads/presenterVoice2410.ts', RUNTIME = 'lib/ads/cena/runtime.ts'
const read = file => readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const plain = value => JSON.parse(JSON.stringify(value))
const candidates = [['liana','woman',20],['mateo','man',22],['zuri','woman',28],['omar','man',31],['meilin','woman',43],['diego','man',46],['priya','woman',37],['samir','man',40],['elena','woman',62],['joao','man',65],['naomi','woman',54],['tariq','man',57]].map(([id,gender,ageMin]) => ({id,gender,ageMin,ageMax:ageMin}))
const legacy = ['sofia','amara','rahul','kenji','jade','robert']
function modules(overrides = {}) {
  const load = createOfflineLoader({ source: (file, raw) => overrides[file] ?? raw })
  return { V: load('@/lib/ads/presenterVoice2410'), T: load('@/lib/textLanguage'), C: load('@/lib/ads/cena/voice95') }
}
function profiles(M) {
  const languages = M.T.NARRATION_LANGUAGES.filter(row => row.minimaxBoost)
  assert.equal(languages.length, 37)
  for (const language of languages) for (const gender of ['woman','man']) for (const [ageMin,age] of [[20,'young_adult'],[40,'adult'],[65,'mature']]) {
    const voice = M.V.presenterCandidateVoice2410({gender,ageMin}, language.code)
    const table = M.C.CENA95_NARRATOR_VOICES[['pt','es'].includes(language.code) ? language.code : 'en']
    assert.deepEqual(plain(voice), { model: 'fal-ai/minimax/speech-2.8-hd', voiceId: table[gender === 'man' ? 'male' : 'female'][age], languageBoost: language.minimaxBoost, speed: 1 }, `${language.code}/${gender}/${age}`)
  }
  for (const language of ['ur','bn','',undefined,'constructor','zz']) assert.throws(() => M.V.presenterCandidateVoice2410({gender:'man',ageMin:40},language), /language_unsupported/)
  for (const entry of [{gender:'other',ageMin:40},{gender:'man',ageMin:19},{gender:'woman',ageMin:66},{gender:'woman',ageMin:40,ageMax:39},{gender:'man',ageMin:22.5},null]) assert.throws(() => M.V.presenterCandidateVoice2410(entry,'en'), /bad_profile/)
}
function actualSynthesize(M, presenterId, language, { runtime = read(RUNTIME), fail = false } = {}) {
  const ast = ts.createSourceFile(RUNTIME, runtime, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), found = []
  const walk = node => { if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'synthesize') found.push(node.initializer); ts.forEachChild(node,walk) }
  walk(ast); assert.equal(found.length,1,'the production escolha media callback is unique')
  const exports = {}, calls = []
  const code = ts.transpileModule(`exports.invoke = (${found[0].getText(ast)});`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, {
    exports, state: {plan:{input:{language},escolha:{presenterId}}}, order:{user_id:'offline-user',id:'offline-order'},
    estimateMp3DurationSeconds: audio => { calls.push(['measure',audio.toString()]); return 11 },
    synthesizeTtsFallback: async (text,context) => { calls.push(['legacy',text,context]); return Buffer.from('legacy') },
    require: name => {
      if (name === '../presenterCandidates2410') return {presenterCandidateById2410:id => candidates.find(c => c.id === id) ?? null}
      if (name === '../presenterVoice2410') return M.V
      if (name === '@/lib/avatar/voice') return {synthesizeWithVoice:async input => {calls.push(['candidate',input]);if(fail) throw Error('offline-provider-failed');return Buffer.from('candidate')}}
      throw Error('offline: unexpected import ' + name)
    },
  }, {timeout:5000})
  return {invoke:exports.invoke,calls}
}
async function runtimeContract(M, runtime) {
  for (const candidate of candidates) for (const language of M.T.NARRATION_LANGUAGES.filter(row => row.minimaxBoost)) {
    const world = actualSynthesize(M,candidate.id,language.code,{runtime}), result = await world.invoke('Complete narration.')
    assert.equal(result.audio.toString(),'candidate');assert.equal(result.seconds,11)
    assert.deepEqual(plain(world.calls), [['candidate',{text:'Complete narration.',...plain(M.V.presenterCandidateVoice2410(candidate,language.code))}],['measure','candidate']], 'selected candidate reaches the real synthesis boundary: '+candidate.id+'/'+language.code)
  }
  for (const id of legacy) {
    const world = actualSynthesize(M,id,'pt',{runtime}), result = await world.invoke('Existing narration.')
    assert.equal(result.audio.toString(),'legacy')
    assert.deepEqual(plain(world.calls),[['legacy','Existing narration.',{userId:'offline-user',generationId:'offline-order',language:'pt'}],['measure','legacy']], 'old selection keeps its exact synthesis call: '+id)
  }
  const failed = actualSynthesize(M,'joao','ja',{runtime,fail:true})
  await assert.rejects(failed.invoke('Do not replace this voice.'),/offline-provider-failed/)
  assert.equal(failed.calls.some(c => c[0] === 'legacy'),false,'candidate failure cannot fall back to a female/default voice')
  const unsupported = actualSynthesize(M,'mateo','ur',{runtime})
  await assert.rejects(unsupported.invoke('Unsupported language.'),/language_unsupported/)
  assert.equal(unsupported.calls.length,0,'unsupported candidate language cannot reach either provider')
}

const M = modules(); profiles(M); await runtimeContract(M,read(RUNTIME))
const original = read(FILE)
for (const [name,from,to] of [
  ['male defaults to female',"entry.gender === 'man' ? 'male' : 'female'","entry.gender === 'man' ? 'female' : 'female'"],
  ['mature uses adult',"minimum >= 50 ? 'mature'","minimum >= 50 ? 'adult'"],
  ['language boost lost','languageBoost, speed: 1',"languageBoost: 'English', speed: 1"],
]) {
  const mutant = original.replace(from,to); assert.notEqual(mutant,original,name)
  assert.throws(() => profiles(modules({[FILE]:mutant})),{code:'ERR_ASSERTION'},name)
}
const runtime = read(RUNTIME), mutant = runtime.replace('const candidate = presenterCandidateById2410(state.plan.escolha?.presenterId)','const candidate = null')
assert.notEqual(mutant,runtime)
await assert.rejects(runtimeContract(M,mutant),{code:'ERR_ASSERTION'},'inert candidate metadata fails the production callback contract')
console.log('ok apresentadores voice: 37 boosts × 6 age/gender profiles; 12 candidates × 37 actual synthesis callbacks; six old calls preserved; failure closed; four mutants rejected; zero paid/network/env operations')
