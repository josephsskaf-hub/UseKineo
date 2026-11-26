import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(file, imports = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file,'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const exports = {}
  Function('require','exports',outputText)(key => {
    if (key in imports) return imports[key]
    if (key === 'node:crypto') return require(key)
    throw Error('Unmocked import: '+key)
  }, exports)
  return exports
}
const labels = load('lib/engineLabel.ts')
const helpers = load('lib/admin/filmMonitor.ts', { '../engineLabel':labels })
const history = { engine_used:'kling4', motores:['gemini_omni_flash','kling4'] }
assert.equal(helpers.filmEngineProfile('kling4',history).secondary,labels.engineLabelFor(null,'omni'))
assert.equal(helpers.filmEngineProfile('h3_max_turbo',{...history,engine_used:'seedance15_fallback',motores:['gemini_omni_flash','seedance15_fallback']}).engine,'MiniMax H3 Turbo')
assert.equal(helpers.filmEngineProfile('mixed:h3_max,kling4').engineNote.includes('conjunto'),true)
assert.equal(helpers.filmEngineProfile('unknown').engine,null)
assert.equal(helpers.filmEngineProfile('kling4',{motores:['omni','kling4']}).secondary,null)
assert.equal(helpers.filmEngineProfile('h3_max',history).secondary,null)
for (const invalid of [null, undefined, '', ' ', -1, 11, Infinity, true]) assert.equal(helpers.reviewerScore(invalid),null)
for (const valid of [0, 5.5, 10]) assert.equal(helpers.reviewerScore(String(valid)),valid)
let allowed = false, broken = false, services = 0, haveDb = true
const link = 'https://example.invalid/test.mp4'
const v = { id:'a', topic:'First', video_url:link, render_id:'render-a', engine_used:'kling4' }
const r = { link, nota:0, fonte:'revisor', defeitos:['Som'], quando:'2026-11-01T11:00:00Z' }
const calls = []
function read(table) {
  const actions = []
  const builder = { then(resolve) {
    calls.push({table,actions})
    const rows = table==='videos' ? [v] : table==='film_review_notes' ? [r] : actions.some(([fn,col,val])=>fn==='eq' && col==='name' && val==='compose_submission_claim') ? [{render:'render-a',generation:'gen-a'}] : [{generation:'gen-a', ...history}]
    return Promise.resolve({ data:broken?null:rows, error:broken?{message:'fixture'}:null }).then(resolve)
  }}
  for (const name of ['select','eq','like','or','not','order','limit','in']) builder[name]=(...args)=>{ actions.push([name,...args]);return builder }
  return builder
}
const route=()=>load('app/api/admin/film-monitor/route.ts',{
  'next/server':{ NextResponse:Response },
  '@/lib/supabase/server':{ createClient:()=>({auth:{getUser:async()=>({data:{user:{email:'tester'}}})}}) },
  '../_shared/db':{ isAdminEmail:()=>allowed, serviceClient:()=>{services++;return haveDb?{from:read}:null} },
  '@/lib/admin/liveCache': load('lib/admin/liveCache.ts'),
  '@/lib/admin/filmMonitor':helpers
}).GET
const get = route()
assert.equal((await get()).status,403)
assert.equal(services,0)
allowed=true
const response=await get()
assert.equal(response.status,200)
assert.match(response.headers.get('cache-control'),/private, no-store/)
const snapshot=await response.json()
assert.equal(snapshot.recent[0].score,0)
assert.deepEqual(snapshot.reviews[0].defects,['Som'])
assert.equal(snapshot.reviews[0].title,'First')
assert.equal(snapshot.recent[0].engine,'Kling 4.0')
assert.equal(snapshot.recent[0].secondary,labels.engineLabelFor(null,'omni'))
assert.equal(helpers.filmEngineProfile('mixed:h3_max,kling4').secondary,'Kling 4.0')
assert.equal(calls.length,6)
for (const c of calls.filter(c=>c.table==='film_review_notes')) {
  assert(c.actions.some(([fn,col,val])=>fn==='eq' && col==='produto' && val==='filme'))
  assert(c.actions.some(([fn,expr])=>fn==='or' && expr==='fonte.is.null,fonte.neq.auto'))
}
for(const c of calls.slice(0,2))assert(c.actions.some(([fn,limit])=>fn==='limit' && limit===30))
allowed=false
assert.equal((await get()).status,403)
assert.equal(calls.length,6)
allowed=true; haveDb=false
assert.equal((await route()()).status,503)
haveDb=true; broken=true
assert.equal((await route()()).status,502)
console.log('Admin monitor: access before reads, private cache, source, limits, matching, grade zero and failure paths passed.')

