// Exercita o classificador e o persist da entrega com dois polls e um banco em memória.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const status = 'app/api/compose/status/[renderId]/route.ts'
const load = createOfflineLoader()
const { filmEngineUsed } = load('@/lib/filmEngineUsed')
const { recordedFilmEngine, engineLabelFor } = load('@/lib/engineLabel')
const ref = 'minimax/h3-max/reference-to-video'
const turbo = 'minimax/h3-max-turbo/image-to-video'
const sameFamily = 'minimax/h3-max/image-to-video'
const receipt = (falModels, authorizedCompletedUrls) => ({
  falModels, authorizedCompletedUrls, falRequestIds: falModels.map((_, i) => String(i)),
})

assert.equal(filmEngineUsed(receipt([ref, turbo], [null, null])), 'unknown')
assert.equal(filmEngineUsed(receipt([ref, turbo], ['a', null])), 'h3_max_reference')
assert.equal(filmEngineUsed(receipt([turbo, ref, turbo], ['a', 'b', 'c'])), 'mixed:h3_max_reference,h3_max_turbo')
assert.equal(filmEngineUsed(receipt([ref, sameFamily], ['a', 'b'])), 'h3_max')
assert.equal(filmEngineUsed(receipt([ref, 'other-provider'], ['a', 'b'])), 'unknown')
assert.equal(filmEngineUsed(receipt([ref, turbo], ['a'])), 'unknown')
assert.equal(filmEngineUsed(null, 'fast'), 'kineo1')
assert.equal(filmEngineUsed(null, 'cinematic_ai'), 'unknown')
for (const missing of [null, '', 'unknown', 'mixed', 'mixed:kling4,kling4', 'mixed:kling4,invalid', '__proto__']) {
  assert.equal(recordedFilmEngine(missing), null)
  assert.equal(engineLabelFor('cinematic_ai', missing), 'Seedance 1.5')
  assert.equal(engineLabelFor(null, missing), null)
}
assert.equal(engineLabelFor('cinematic_ai','mixed:h3_max_reference,h3_max_turbo'), 'Multiple engines · MiniMax H3 Max + MiniMax H3 Turbo')

// Extração por AST: roda o mesmo persistCompletedVideo e o mesmo CAS da rota.
function productionFunction(code, name) {
  const source = ts.createSourceFile(status, code, ts.ScriptTarget.Latest, true)
  const fn = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.ok(fn, name)
  return fn.getText(source)
}
const args = { userId:'owner', renderId:'render', videoUrl:'https://video.test/result.mp4', snapshotUrl:null, quality:'cinematic_ai', duration:60, topic:'A film', creditsUsed:0 }
function world(row, fail, mutate) {
  const store = { row, repaired:[], warnings:[] }
  const db = { from(table) {
    assert.equal(table, 'videos')
    const filters = []
    let op = 'read', patch
    return {
      insert(data) { op = 'insert'; patch = data; return this },
      select() { return this },
      update(data) { op = 'update'; patch = data; return this },
      eq(field, value) { filters.push([field,value]); return this },
      is(field, value) { return this.eq(field,value) },
      async maybeSingle() {
        if (op === 'insert') {
          if (store.row) return { error:{ code:'23505' } }
          store.row = { ...patch, id:'id' }
          return { data:store.row }
        }
        if (fail === op + '-return') return {error:{message:'offline test failure'}}
        if (fail === op + '-throw') throw Error('offline test failure')
        if (!filters.every(([key,value]) => store.row?.[key] === value)) return { data:null }
        if (op === 'update') Object.assign(store.row, patch)
        return { data:{...store.row} }
      },
    }
  } }
  const modules = createOfflineLoader({
    mocks:{ '@supabase/supabase-js':{createClient:()=>db} },
    env:{NEXT_PUBLIC_SUPABASE_URL:'https://fake.test', SUPABASE_SERVICE_ROLE_KEY:'test'},
    globals:{console:{ log(){}, info(...x){store.repaired.push(x)}, warn(...x){store.warnings.push(x)}, error(){} }},
    source(rel, code) {
      if (mutate) code = mutate(rel, code)
      if (rel !== status) return code
      return [
        "import { createClient as createAdminClient } from '@supabase/supabase-js'",
        "import { existingFilmId } from '@/lib/duplicateFilmReceipt'",
        "import { escolherTemaDoFilme } from '@/lib/pedidoCerto'",
        productionFunction(code, 'safeUrlHost'),
        'export ' + productionFunction(code, 'persistCompletedVideo'),
      ].join('\n')
    },
  })
  const persist = modules(status).persistCompletedVideo
  return { store, save:(engineUsed) => persist({...args, engineUsed}) }
}
const historical = before => ({ id:'id', user_id:'owner', render_id:'render', engine_used:before, credits_used:7 })
async function verify(mutate) {
  const first = world(null, null, mutate)
  assert.equal((await first.save(null)).ok, true)
  assert.equal(first.store.row.engine_used, null)
  for (const before of [null, 'unknown']) {
    const w = world(historical(before), null, mutate)
    const outcomes = await Promise.all([w.save('kling4'), w.save('h3_max_turbo')])
    assert.ok(outcomes.every(r => r.ok && r.duplicate && r.id === 'id'))
    assert.equal(w.store.repaired.length, 1)
    assert.equal(w.store.repaired[0][1].before, before)
    assert.equal(w.store.repaired[0][1].after, w.store.row.engine_used)
    assert.equal(w.store.row.credits_used, 7)
    const mismatched = world({...historical(before), user_id:'other'}, null, mutate)
    assert.equal((await mismatched.save('kling4')).id, undefined)
    assert.equal(mismatched.store.row.engine_used, before)
  }
  const known = world(historical('kling4'), null, mutate)
  await known.save('h3_max_turbo')
  assert.equal(known.store.row.engine_used, 'kling4')
  assert.equal(known.store.repaired.length, 0)
  for (const fail of ['read-throw','read-return','update-throw','update-return']) {
    const w = world(historical(null), fail, mutate)
    const result = await w.save('kling4')
    assert.ok(result.ok && result.duplicate)
    if (fail.startsWith('update')) assert.equal(result.id, 'id')
    assert.equal(w.store.warnings.length, 1)
    assert.equal(w.store.row.engine_used, null)
  }
}
await verify()

// O resgate administrativo com o crédito já devolvido conserva o vídeo mesmo se o recibo sumiu.
async function rescue(lookup, confirm) {
  const writes = [], lookups = []
  const row = { user_id:'owner', session_id:'generation', created_at:'2026-11-18', metadata:{ status:'done', quality:'cinematic_ai', render_id:'render' } }
  const batches = [[row], [row], [{id:'owner',email:'viewer@example.test'}], []]
  const db = { from(table) { return { insert(data) {
    writes.push({table, data})
    return { select() { return { maybeSingle:async () => ({data:{id:'id'}}) } } }
  } } } }
  const modules = createOfflineLoader({
    env:{ NEXT_PUBLIC_SUPABASE_URL:'https://fake.test', SUPABASE_SERVICE_ROLE_KEY:'test', CREATOMATE_API_KEY:'test' },
    mocks:{
      'next/server':{ NextResponse:{ json:(body, init) => ({body, status:init?.status ?? 200}) } },
      '@/lib/supabase/server':{ createClient:() => ({ auth:{ getUser:async () => ({data:{user:{email:'josephsskaf@gmail.com'}}}) } }) },
      '@supabase/supabase-js':{createClient:()=>db},
      '@/lib/supabase/readAll':{ readAll:async () => ({data:batches.shift()}) },
      '@/lib/compose':{ pollCreatomateRender:async () => ({status:'succeeded',url:'https://fake.test/ready.mp4'}) },
      '@/lib/cinematic/claim':{ loadSettledCinematicClaimForRender:async args => {
        lookups.push([args.userId, args.renderId])
        return lookup()
      }},
    },
  })
  const result = await modules('app/api/admin/rescue-composed-films/route.ts').GET({
    nextUrl:new URL('https://fake.test/rescue' + (confirm ? '?confirm=PERSIST' : '')),
  })
  assert.equal(result.status, 200)
  return {writes, lookups}
}
for (const [lookup, expected] of [
  [() => ({ok:true,claim:receipt([ref,turbo],['a','b'])}), 'mixed:h3_max_reference,h3_max_turbo'],
  [() => ({ok:true,claim:null}), null],
  [() => ({ok:false,error:'missing signed evidence'}), null],
  [() => { throw Error('network fixture') }, null],
]) {
  const {writes, lookups} = await rescue(lookup, true)
  assert.deepEqual(lookups, [['owner','render']])
  assert.deepEqual(writes.map(w => w.table), ['videos','events'])
  assert.equal(writes[0].data.engine_used, expected)
  assert.equal(writes[0].data.credits_used, 0)
}
const dry = await rescue(() => { throw Error('unexpected lookup') }, false)
assert.deepEqual(dry, {writes:[], lookups:[]})
for (const [file, before, after] of [
  [status, 'return { ok: true, duplicate: true, id,', 'return { ok: false, duplicate: true, id,'],
  ['lib/duplicateFilmReceipt.ts', "before !== null && before !== 'unknown'", 'false'],
  ['lib/duplicateFilmReceipt.ts', "before === null ? update.is('engine_used', null) : update.eq('engine_used', before)", 'update'],
  ['lib/duplicateFilmReceipt.ts', "if (repair.data) console.info", 'if (false) console.info'],
]) {
  assert.ok(fs.readFileSync(file,'utf8').includes(before))
  await assert.rejects(verify((rel, code) => rel === file ? code.replace(before, after) : code), {name:'AssertionError'})
}
console.log('Recibo e rótulo, persistência, concorrência e falhas da duplicata passaram; 4 mutantes detectados.')
