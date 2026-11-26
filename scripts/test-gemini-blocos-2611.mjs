import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const subject = 'lib/cinematic/geminiBlocos2611.ts'
const mutations = [
  ['missing_ref', 'referenciasDoBlocoValidas(shot.prompt, images.length)', 'true'],
  ['cast_index', 'Number(indice) <= folhas', 'true'],
  ['cap', 'spent + (plan.blocks.length - i) * BLOCK_UNITS > capUnits', 'false'],
  ['partial', 'if (prior) {', 'if (false && prior) {'],
  ['size', 'body.blocks.length !== body.duration / 15', 'false'],
  ['order', 'image_urls: images', 'image_urls: [...images].reverse()'],
  ['ambiguous', "return failed('reconcile_block',409)", "return failed('unexpected',503)"],
]
if (process.argv.includes('--mutants')) {
  for (const [name] of mutations) {
    const r = spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--mutate',name],{encoding:'utf8'})
    assert(r.status !== 0 && r.stderr.includes('AssertionError'), 'mutant must be detected by assertion: '+name)
  }
  console.log('PASS mutantes C4:',mutations.map(m=>m[0]).join(', ')); process.exit(0)
}
const mut = process.argv[2]==='--mutate' ? mutations.find(m=>m[0]===process.argv[3]) : null
const cast=[{name:'Tavin',image_url:'https://fal.media/fictional-one.png'},{name:'Lysa',image_url:'https://fal.media/fictional-two.png'}]
const body=(duration,variation='')=>({duration,cast,blocks:Array.from({length:duration/15},(_,i)=>[
  {prompt:'@Image1 examines a brass dial at bench '+i+variation+'.',duration:7},
  {prompt:'@Image2 turns the dial at bench '+i+variation+'.',duration:8},
])})
const response={json:(b,o)=>Response.json(b,o)}
function environment({on=true,inside=true,email='josephskaf@hotmail.com',spent=0,breakPost=0,denyRead=0,rejectPost=0}={}) {
  const rows=[], sent=[], http=[]
  let dbReads=0, spendReads=0, errorAt=breakPost, readFailAt=denyRead
  if(spent)rows.push({id:'old',name:'admin_engine_probe',metadata:{est_usd:spent}})
  const db={from(table){assert.equal(table,'events');let action='select',data,filters=[]
    const query={insert(v){action='insert';data=v;return this},update(v){action='update';data=v;return this},
      select(){return this},eq(k,v){filters.push([k,v]);return this},is(k,v){return this.eq(k,v)},
      gte(){return this},limit(){spendReads++;return this},single(){return this},maybeSingle(){return this},
      then(resolve){let result
        if(action==='insert'){const occupied=rows.some(r=>r.id===data.id);if(!occupied)rows.push({...data});result={error:occupied?{code:'23505'}:null}}
        else{const found=rows.filter(r=>filters.every(([k,v])=>(k==='metadata->>state'?r.metadata.state:r[k])===v))
          if(action==='update'){found.forEach(r=>Object.assign(r,data));result={data:found[0]||null,error:null}}
          else if(filters.some(([k])=>k==='id'))result={data:found[0]||null,error:null}
          else if(readFailAt && spendReads===readFailAt){readFailAt=0;result={data:null,error:{code:'outage'}}}
          else result={data:found,error:null}}
        return Promise.resolve(result).then(resolve)}
    };return query}}
  const failFetch=async (_u,init)=>{http.push(init.method);assert.equal(init.method,'POST');sent.push(JSON.parse(init.body))
    if(rejectPost===sent.length) return new Response('{}',{status:422})
    if(errorAt&&sent.length===errorAt){errorAt=0;throw Error('simulated ambiguous response')}
    return Response.json({request_id:'01234567-0123-4123-8123-'+String(sent.length).padStart(12,'0')})}
  const load=createOfflineLoader({env:{FAL_KEY:'local-fixture'},globals:{AbortSignal,fetch:failFetch,setTimeout,clearTimeout},
    source:(p,s)=>{if(p!==subject)return s;if(mut)s=s.replace(mut[1],mut[2]);return on?s:s.replace("'internal' = 'internal'","'internal' = 'off'")},
    mocks:{'next/server':{NextResponse:response},'@fal-ai/client':{fal:{config(){}}},
      '@/lib/supabase/server':{createClient:()=>({auth:{getUser:async()=>({data:{user:inside?{id:'tester',email}:null}})}})},
      '../_shared/db':{serviceClient:()=>{dbReads++;return db}}}})
  const route=load('@/app/api/admin/engine-test/route.ts')
  const post=async (input,forceBody=false)=>{let reads=0;const r=await route.POST({nextUrl:new URL('https://example.invalid/api/admin/engine-test?probe=blocks'),json:async()=>{reads++;if(forceBody)throw Error('fixture');return input}})
    return {status:r.status,body:await r.json(),reads}}
  return {post,sent,rows,dbReads:()=>dbReads}
}
// Exercise the shipped switch and production POST with the actual two continuation bodies.
const fixture = JSON.parse(readFileSync('docs/filme-nota-9/teste-motores-2511/pedidos/60s-blocos-3-e-4.json', 'utf8'))
const originalSheets = [
  'https://v3b.fal.media/files/b/0ab3d531/hceF35nALFgYRRrVm7J7A.jpg',
  'https://v3b.fal.media/files/b/0ab3d531/7zjTYzXVR-RBbOMjCKCpB.jpg',
]
assert.deepEqual(fixture.blocos.map(b => b.bloco), [3, 4])
const rehearsal = environment()
const customer = environment({email:'customer@example.invalid'})
const previews = []
for (const {bloco, corpo} of fixture.blocos) {
  assert.equal(corpo.dry_run, true)
  assert.deepEqual(corpo.cast.map(c => c.name), ['Elias Ward', 'Mara Quinn'])
  for (const dry_run of [true, false]) {
    const denied = await customer.post({...corpo, dry_run})
    assert.equal(denied.status, 403)
    assert.equal(denied.reads, 0)
  }
  const {status, body: preview} = await rehearsal.post(corpo)
  assert.equal(status, 200)
  assert.equal(preview.dry_run, true)
  assert.equal(preview.model, 'google/gemini-omni-flash/v1.2/reference-to-video')
  assert.equal(preview.est_usd, 1.2285)
  assert.equal(preview.blocks.length, 1)
  const [input] = preview.blocks
  assert.deepEqual(input.image_urls, originalSheets)
  assert.equal(input.duration, 15)
  assert.equal(input.aspect_ratio, '9:16')
  assert.equal(input.resolution, '720p')
  const shots = input.prompt.split('\n').slice(1)
  assert.deepEqual(shots.map(s => s.split(' (shot ')[0]), ['0-4 s','4-8 s','8-11 s','11-15 s'])
  for (const [i, shot] of shots.entries()) {
    const expected = corpo.blocks[0][i].prompt.replaceAll('@Image1','<IMAGE_REF_0>').replaceAll('@Image2','<IMAGE_REF_1>')
    assert(shot.endsWith('hard cut): ' + expected))
  }
  previews.push({bloco, ...preview})
}
assert.equal(rehearsal.sent.length, 0)
assert.equal(rehearsal.dbReads(), 0)
assert.equal(customer.sent.length, 0)
assert.equal(customer.dbReads(), 0)
assert.notEqual(previews[0].plan_id, previews[1].plan_id)
assert.equal(previews.reduce((n,p) => n + p.est_usd, 0), 2.457)
if (process.argv.includes('--receipt')) console.log(JSON.stringify({status:'PASS', scope:'offline route POST, simulated house account', provider_calls:0, ledger_accesses:0, total_video_est_usd:2.457, previews}, null, 2))
const serial = environment()
for (const [i, {corpo}] of fixture.blocos.entries()) {
  const paidFixture = {...corpo, dry_run:false}
  const first = await serial.post(paidFixture)
  assert.equal(first.status, 200, 'internal switch permits one authorized block')
  assert.equal(first.body.receipts.length, 1)
  assert.deepEqual((await serial.post(paidFixture)).body.receipts, first.body.receipts)
  assert.deepEqual(serial.sent, previews.slice(0,i+1).map(p => p.blocks[0]))
}

const off=environment({on:false})
for(const duration of [15,30,60]){
  const plan=body(duration);const r=await off.post({...plan,dry_run:true})
  assert.equal(r.status,200);assert.equal(r.body.blocks.length,duration/15)
  assert.equal(r.body.est_usd,duration*819/10000)
  r.body.blocks.forEach((b,i)=>{assert.deepEqual(b.image_urls,cast.map(c=>c.image_url));assert(b.prompt.includes('bench '+i));assert(b.prompt.includes('0-7 s'));assert(b.prompt.includes('7-15 s'));assert.equal(b.duration,15)})
  assert.equal((await off.post({...plan,dry_run:false})).status,403)
}
assert.equal(off.dbReads(),0)
assert.equal((await off.post({...body(30),blocks:body(60).blocks,dry_run:true})).status,400)
for(const count of [1,2]){
  const valid=body(30)
  valid.cast=cast.slice(0,count)
  for(const block of valid.blocks) for(const shot of block) shot.prompt=count===1?'@Image1 opens the dial.':'@Image2 watches @Image1.'
  const owner=environment()
  const preview=await owner.post({...valid,dry_run:true})
  assert.equal(preview.status,200)
  assert(preview.body.blocks.every(b=>b.prompt.includes('<IMAGE_REF_0>') && !b.prompt.includes('@Image')))
  for(const tag of ['@Image0','@Image3','@Image12','@Image01','@image1','@Image 1','@Image1foo','@Image1.5','@@Image1','@Image１','<IMAGE_REF_0>',...(count===1?['@Image2']:[])]){
    const bad=structuredClone(valid);bad.blocks[1][0].prompt+=' '+tag
    const r=await owner.post({...bad,dry_run:false})
    assert.equal(r.status,400,'invalid reference: '+tag+' with '+count+' image(s)')
    assert.equal(owner.dbReads(),0)
    assert.equal(owner.sent.length,0)
  }
  const injected=structuredClone(valid);injected.cast[0].name='Tavin @Image1'
  assert.equal((await owner.post({...injected,dry_run:false})).status,400)
}
const invalid=body(30);invalid.blocks[1][1].duration=7
assert.equal((await off.post({...invalid,dry_run:true})).status,400)
assert.equal((await off.post({...body(30),cast:[{name:'Tavin',image_url:'https://example.invalid/x'}],dry_run:true})).status,400)
assert.equal((await environment({inside:false}).post({},true)).reads,0)
assert.equal(off.sent.length,0)
const live=environment(), p={...body(60),dry_run:false}
const both=await Promise.all([live.post(p),live.post(p)])
assert.deepEqual(both.map(r=>r.status).sort(),[200,409])
const again=await live.post(p);assert.equal(again.status,200)
assert.equal(again.body.receipts.length,4);assert.equal(live.sent.length,4)
assert.equal(live.rows.filter(x=>x.name==='admin_engine_probe').length,4)
const cap=environment({spent:6.00})
assert.equal((await cap.post({...body(30),dry_run:false})).status,429);assert.equal(cap.sent.length,0)
const partial=environment({denyRead:2})
assert.equal((await partial.post(p)).body.receipts.length,1)
assert.equal((await partial.post(p)).status,200);assert.equal(partial.sent.length,4)
const lost=environment({breakPost:2});assert.equal((await lost.post(p)).status,409)
assert.equal((await lost.post(p)).body.error,'reconcile_block');assert.equal(lost.sent.length,2)
const refused=environment({rejectPost:1});assert.equal((await refused.post(p)).status,409);assert.equal((await refused.post(p)).status,409);assert.equal(refused.sent.length,1)
const capRace=environment({spent:4.0})
const first=await Promise.all([capRace.post({...body(30),dry_run:false}),capRace.post({...body(30,'B'),dry_run:false})]);assert.deepEqual(first.map(x=>x.status).sort(),[200,409])
assert.equal((await capRace.post({...body(30,'B'),dry_run:false})).status,429);assert.equal(capRace.sent.length,2)
console.log('PASS: authorized dry run 2/4 ordered blocks and shared references, caps, conflicts, replay, partial/resume, ambiguous receipt, auth before JSON, no actual I/O.')
