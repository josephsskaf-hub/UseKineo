// Production-derived anonymized metadata only. No network, environment, or DB access.
// Run from any directory: node <this file> [--expect-original-bug]
const { readFileSync } = require('node:fs')
const { resolve, dirname, join } = require('node:path')
const { createRequire } = require('node:module')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const root = resolve(__dirname, '../../..')
const ts = createRequire(join(root, 'package.json'))('typescript')
const corpus = JSON.parse(readFileSync(join(__dirname, 'corpus-anonimo.json'), 'utf8'))
const cache = new Map()
function load(file) {
  file = resolve(root, file)
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const req = id => {
    assert.ok(id.startsWith('./') || id.startsWith('@/'), `offline loader refuses external import: ${id}`)
    return load((id.startsWith('@/') ? resolve(root, id.slice(2)) : resolve(dirname(file), id)) + '.ts')
  }
  vm.runInNewContext(`(function(require,exports){${code}\n})`, {})(req, exports)
  return exports
}
const R = load('lib/refusalSpiral.ts')
const N = load('lib/narrationFit.ts')
const E = load('lib/expandPolicy.ts')
const D = load('lib/durationByEngine.ts')
let route = readFileSync(join(root, 'app/api/generate-video-cinematic/route.ts'), 'utf8').replace(/\r\n/g,'\n')
if(process.argv.includes('--mutant-read-after-insert')) route=route.replace('historico: historicoGuard,','historico: await historicoDeParedes(cinematicAdmin, user.id, agoraEsp),')
const start = route.indexOf('      if (!fit.ok) {\n        // ═══ KINEO-GUARD-DEVOLVE')
assert.ok(start > 0, 'locates the actual terminal narration guard')
const end = route.indexOf('\n    // ═══ KINEO-DEBITO-DEPOIS-DA-TRAVA-2026-09-02', start)
assert.ok(end > start)
// Includes the terminal if block and its enclosing verbatim block's closing brace.
const body = route.slice(start, end).replace(/\n    }\s*$/, '')
const js = ts.transpileModule(`async function execute() { ${body} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

function fakeDb(rows, now, operations, failHistory=false) {
  return { from(table) {
    assert.equal(table, 'events')
    const q = {
      select() { operations.push('history-select'); return q },
      eq() { return q }, in() { return q }, gte() { return q }, order() { return q },
      limit() { return Promise.resolve(failHistory ? {data:null,error:{message:'test transport unavailable'}} : { data: [...rows].sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,20), error: null }) },
      async insert(row) { operations.push(row.name); rows.push({ ...row, created_at: new Date(now).toISOString() }); return { error: null } },
    }
    return q
  } }
}

async function replay(c, failHistory=false) {
  const now = 1800000000000 + c.bucketOffsetMs
  const rows = c.pastRefusals.map(r => ({ name:r.name, metadata:r.metadata, created_at:new Date(now+r.offsetMs).toISOString() }))
  const operations = []
  const db = fakeDb(rows, now, operations, failHistory)
  const expectedHistory = await R.historicoDeParedes(db, 'anonymous', now)
  const expected = R.avaliarEspiral({ historico:expectedHistory, paredeAtual:'narracao_curta', agora:now })
  operations.length=0
  const sandbox = {
    fit:{ ok:false, speech:c.speech_seconds, target:c.target_seconds, silence:c.target_seconds-c.speech_seconds, coverage:c.speech_seconds/c.target_seconds, missingWords:c.missing_words },
    duration:c.target_seconds, MIN_COVERAGE:N.MIN_COVERAGE, SUPPORTED_DURATIONS:E.SUPPORTED_DURATIONS,
    releaseBirthClaim:async () => operations.push('claim-release'), cinematicAdmin:db, user:{id:'anonymous'}, activeBirthClaim:null,
    Date:class extends Date { static now() { return now } }, console:{warn(){}},
    narrationTooShortMessage:N.narrationTooShortMessage, largestFittingDuration:E.largestFittingDuration,
    historicoDeParedes:R.historicoDeParedes, avaliarEspiral:R.avaliarEspiral, mensagemComEspiral:R.mensagemComEspiral,
    NextResponse:{ json:(value,init) => ({value,...init}) },
  }
  const result = await vm.runInNewContext(js+'\nexecute()', sandbox)
  const spirals=rows.filter(r=>r.name==='refusal_spiral')
  const actual=spirals.at(-1)?.metadata.posicao ?? null
  assert.equal(result.status,422, `${c.case}: guard remains 422`)
  const expectedMessage = R.mensagemComEspiral(N.narrationTooShortMessage(sandbox.fit,E.SUPPORTED_DURATIONS), expected)
  assert.equal(rows.filter(r=>r.name==='narration_guard_blocked').length,c.pastRefusals.filter(r=>r.name==='narration_guard_blocked').length+1)
  assert.equal(rows.at(c.pastRefusals.length).metadata.charged,false)
  assert.equal(operations[0],'claim-release',`${c.case}: claim release stays first`)
  return {case:c.case,internal:c.internal,expected:expected?.posicao??null,actual,operations,charged:false,messageMatches:result.value.error===expectedMessage}
}

;(async()=>{
  const replayed=[]
  for(const c of corpus.cases) replayed.push(await replay(c))
  const differences=replayed.filter(r=>r.actual!==r.expected)
  if(process.argv.includes('--expect-original-bug')) {
    assert.equal(differences.length,30,'original ordering miscounts every recorded refusal')
    console.log(JSON.stringify({mode:'original-bug-confirmed',cases:30,wrongPositions:differences.length,firstRefusalsExternal:replayed.filter(r=>!r.internal&&r.expected===null).length}))
  } else {
    assert.equal(differences.length,0,`history must exclude this same refusal: ${JSON.stringify(differences.map(r=>({case:r.case,expected:r.expected,actual:r.actual})))}`)
    for(const r of replayed) assert.ok(r.operations.indexOf('history-select')<r.operations.indexOf('narration_guard_blocked'))
    assert.ok(replayed.every(r=>r.messageMatches),'base message plus only a genuine prior-refusal suffix')
    const unavailable=await replay(corpus.cases.at(-1),true)
    assert.equal(unavailable.actual,null,'unavailable history never invents a prior refusal')
    assert.equal(unavailable.messageMatches,true,'unavailable history keeps the base message')
    console.log(JSON.stringify({mode:'candidate',cases:30,wrongPositions:0,external:29,paidCases:corpus.cases.filter(c=>!c.internal&&c.paidBeforeBlock).length,guardStatus:422,charged:false}))
  }
  // Sensitivity on rounded metadata, NOT an exact script/render replay.
  const sensitivity=corpus.cases.filter(c=>!c.internal).map(c=>{
    const speech=c.speech_seconds
    const interval=[Math.max(0,speech-.5),speech+.5]
    const offered=D.supportedDurationsFor(c.engine)
    const old=E.largestFittingDuration(speech)
    const possible=E.largestFittingDuration(speech,offered)
    const stable=E.largestFittingDuration(interval[0],offered)===E.largestFittingDuration(interval[1],offered)
    return {case:c.case,old,candidate:possible,stable,paid:c.paidBeforeBlock,inputComplete:c.inputComplete}
  })
  assert.equal(sensitivity.filter(r=>r.candidate!==r.old).length,9)
  assert.equal(sensitivity.filter(r=>r.paid&&r.candidate!==r.old).length,4)
  console.log(JSON.stringify({sensitivityOnly:true,changedCandidates:sensitivity.filter(r=>r.candidate!==r.old),exactInputAvailable:corpus.cases.filter(c=>!c.internal&&c.inputComplete).length,missingExactInput:corpus.cases.filter(c=>!c.internal&&!c.inputComplete).length,fullThreePayerReplay:'BLOCKED',narrationRuleChanged:false}))
})().catch(error=>{ console.error(error.message);process.exitCode=1 })
