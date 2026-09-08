// Real route execution, in-memory data/auth/events. No network or live credentials.
import fs from 'node:fs'
import vm from 'node:vm'
import crypto from 'node:crypto'
import ts from 'typescript'
import assert from 'node:assert/strict'
let checks=0
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++}
const ok=(v,m)=>{assert.ok(v,m);checks++}
const env={VIDEO_SHARE_SECRET:'synthetic-share-secret-for-local-tests',NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic-not-a-real-key',VERCEL_ENV:'production'}
function load(file,imports={},environment=env){
 const exports={}
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText
 vm.runInNewContext(code,{exports,require:id=>{if(id in imports)return imports[id];throw Error('Unapproved import '+id)},process:{env:environment},URL,URLSearchParams,Headers,Buffer,console:{log(){},error(){}},Date},{timeout:5000})
 return exports
}
class Reply extends Response {
 static redirect(url,opts={}){return new Reply(null,{status:opts.status??307,headers:{...opts.headers,location:url}})}
 static json(body,opts={}){return new Reply(JSON.stringify(body),{status:opts.status??200,headers:opts.headers})}
}
const next={'next/server':{NextResponse:Reply}}
// KINEO-SANDBOX-IMPORT-2026-09-07 — em 07/09 o sink de eventos ganhou um import
// novo e a caixa de areia deste guardiao, que so aceita imports da lista,
// passou a ESTOURAR com "Unapproved import" ANTES da primeira verificacao: a
// trava que decide QUAIS eventos um chamador anonimo pode inserir parou de
// rodar, calada, num commit de outra pista.
//
// O import original era `@/lib/gptHandoffStore`, que arrasta o cliente Supabase
// para dentro de uma rota de analytics. O conserto NAO foi abrir a lista para
// ele: as tres funcoes foram extraidas para `@/lib/requestIdentity` (puro, so
// crypto) e e ESSE modulo que entra na lista, com coto inerte — os helpers sao
// INCIDENTAIS ao que este arquivo julga (carimbo de origem, nao autorizacao).
// Se um dia a autorizacao passar a DEPENDER de um deles, o coto tem de sair
// daqui e virar a funcao real — e este comentario e o aviso.
const shares=load('lib/videoShareLink.ts',{crypto})
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222'
const now=Date.now(), signed=shares.mintShareConfirmation(id,'publish',now)
eq(shares.verifyShareConfirmation(id,'publish',signed,now),true,'matching action accepted')
eq(shares.verifyShareConfirmation(id,'unpublish',signed,now),false,'action cannot be flipped')
eq(shares.verifyShareConfirmation(other,'publish',signed,now),false,'another video rejected')
eq(shares.verifyShareConfirmation(id,'publish',signed,now+901000),false,'expired token rejected')
eq(shares.verifyShareConfirmation(id,'publish',signed,now-901000),false,'implausibly future token rejected')
eq(shares.verifyShareConfirmation(id,'publish',shares.mintShareToken(id),now),false,'legacy inbox token is not a POST capability')
for(const bad of ['',null,'bad','0.x','<script>'])eq(shares.verifyShareConfirmation(id,'publish',String(bad),now),false,'malformed confirmation')
const noKey=load('lib/videoShareLink.ts',{crypto},{})
eq(noKey.mintShareConfirmation(id,'publish'),null,'no secret fails closed')
eq(noKey.verifyShareConfirmation(id,'publish',signed),false,'no secret accepts nothing')

function route(options={}) {
 const events=[],mutations=[],filters=[];let clients=0,reads=0
 const row={id,user_id:'owner',status:'completed',video_url:'https://example.invalid/demo.mp4',published_at:null,...options.row}
 const admin={from:table=>{
   assert.equal(table,'videos')
   return {
     select:()=>({eq:()=>({single:async()=>{reads++;return options.missing?{data:null,error:null}:{data:row,error:options.readError??null}}})}),
     update:payload=>{
       mutations.push(payload)
       const chain={eq:(k,v)=>{filters.push([k,v]);return chain},is:(k,v)=>{filters.push([k,v]);return chain},select:()=>chain,maybeSingle:async()=>({data:options.zeroRows?null:{id,published_at:payload.published_at},error:options.updateError??null})}
       return chain
     }
   }
 }}
 const mod=load('app/api/video/publish/route.ts',{...next,'@supabase/supabase-js':{createClient:()=>{clients++;return admin}},'@/lib/serverEvents':{writeServerEvent:async e=>events.push(e)},'@/lib/videoShareLink':shares})
 return {mod,events,mutations,filters,get clients(){return clients},get reads(){return reads}}
}
function request(action='publish',token=shares.mintShareConfirmation(id,action),origin='https://example.invalid'){
 const body=new URLSearchParams({v:id,action,confirmation:token,src:'test'})
 return new Request('https://example.invalid/api/video/publish',{method:'POST',headers:{origin},body})
}
for(const undo of [false,true]){
 const r=route(),url=`https://example.invalid/api/video/publish?v=${id}&t=${shares.mintShareToken(id)}${undo?'&undo=1':''}&src=%22%3E%3Cscript%3E`
 const response=await r.mod.GET(new Request(url)),html=await response.text()
 eq(response.status,200,'GET confirmation works for old inbox link')
 eq(r.clients,0,'GET never opens privileged client');eq(r.mutations.length,0,'GET is inert')
 ok(html.includes('method="post"'),'explicit form confirmation')
 ok(!html.includes('<script>'),'source escaped')
 eq(response.headers.get('referrer-policy'),'no-referrer','capability cannot leak in referer')
 ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"),'no clickjacking')
 for(const failure of [{updateError:{message:'denied'}},{zeroRows:true}]){
   const rr=route({...failure,row:{published_at:undo?'2026-09-01':null}})
   const res=await rr.mod.POST(request(undo?'unpublish':'publish'))
   eq(res.status,503,'failed or zero-row mutation is not success');eq(rr.events.length,0,'no false event')
 }
 const success=route({row:{published_at:undo?'2026-09-01':null}})
 const res=await success.mod.POST(request(undo?'unpublish':'publish'))
 eq(res.status,303,'explicit successful mutation redirects')
 eq(success.mutations.length,1,'one video mutation');eq(success.events.length,1,'one confirmed event')
 ok(success.filters.some(([k,v])=>k==='id'&&v===id),'mutation filters exact video')
 ok(success.filters.some(([k])=>k==='published_at'),'compare and set guards races')
 const already=route({row:{published_at:undo?null:'2026-09-01'}})
 eq((await already.mod.POST(request(undo?'unpublish':'publish'))).status,303,'idempotent state')
 eq(already.mutations.length,0,'idempotent click no mutation');eq(already.events.length,0,'no duplicate event')
}
for(const [req,label] of [[request('publish','bad'),'bad token'],[request('unpublish',signed),'wrong action'],[request('publish',signed,'https://evil.invalid'),'cross-origin']]){
 const r=route();await r.mod.POST(req);eq(r.clients,0,label+' blocked before data')
}
for(const row of [{status:'processing'},{video_url:null},{status:'failed'}]){
 const r=route({row});await r.mod.POST(request());eq(r.mutations.length,0,'unplayable video never published')
}
const invalid=route();await invalid.mod.GET(new Request('https://example.invalid/api/video/publish?v=bad&t=bad'));eq(invalid.clients,0,'invalid link inert')

const admins=load('app/api/admin/_shared/db.ts',{'@supabase/supabase-js':{createClient:()=>{throw Error('No DB')}}})
for(const user of [null,{email:'outside@example.invalid'},{email:'josephsskaf@gmail.com'}]){
 let mutations=0
 const chain={eq:()=>chain,select:async()=>({error:null,count:1})}
 const mod=load('app/api/admin/flag-video/route.ts',{...next,'@/lib/supabase/server':{createClient:()=>({auth:{getUser:async()=>({data:{user}})}})},'@supabase/supabase-js':{createClient:()=>({from:()=>({update:()=>{mutations++;return chain}})})},'../_shared/db':admins})
 const res=await mod.POST({json:async()=>({render_id:'synthetic-render',flagged:true})})
 eq(res.status,!user?401:admins.isAdminEmail(user.email)?200:403,'admin authorization')
 eq(mutations,user&&admins.isAdminEmail(user.email)?1:0,'outside actor never writes metrics')
}
for(const name of ['payment_success','video_published_v1','video_unpublished_v1','library_recent_project_opened']){
 let inserted=0
 let lastRow=null
 // KINEO-QUEM-E-GENTE-2026-09-07 (fv-r10) — RESOLUCAO DAS DUAS CORRECOES, que
 // as duas sessoes escreveram para o mesmo defeito e sao COMPLEMENTARES:
 //  · a caixa de areia so aceita imports da lista, e a rota passou a depender
 //    de '@/lib/requestIdentity' — modulo PURO (so crypto), extraido justamente
 //    para o sink de analytics nao arrastar o cliente Supabase junto. O coto
 //    devolve o que o modulo real devolveria para ESTA entrada.
 //  · o pedido falso nao tinha `headers`, e a rota lia cabecalho: o resultado
 //    era `inserted=0` para os QUATRO nomes e a suite lia isso como
 //    "evento reservado bloqueado" — verde por acidente. Agora o pedido tem
 //    cabecalhos de verdade, como o Next entrega, E a rota tolera a ausencia.
 const identity={clientIp:()=>null,hashIp:()=>null,isLikelyBot:ua=>!ua}
 const mod=load('app/api/events/route.ts',{...next,'@/lib/requestIdentity':identity,'@/lib/supabase/server':{createClient:()=>({auth:{getUser:async()=>({data:{user:null}})}})},'@supabase/supabase-js':{createClient:()=>({from:()=>({insert:async(row)=>{inserted++;lastRow=row;return {error:null}}})})}})
 await mod.POST({nextUrl:{hostname:'www.usekineo.com'},headers:new Headers({'user-agent':'Mozilla/5.0 (teste)'}),json:async()=>({name})})
 eq(inserted,name==='library_recent_project_opened'?1:0,'authoritative events reserved; harmless analytics works')
 // A rota nao pode gravar sem carimbo, e o carimbo nao pode conter IP cru.
 if(name==='library_recent_project_opened'){
  eq(typeof lastRow?.metadata?.is_bot,'boolean','stored analytics row carries the server bot stamp')
  eq('raw_ip' in (lastRow?.metadata??{}),false,'stored analytics row never carries a raw IP')
 }
}
console.log(`Sharing safety: ${checks} checks passed; no network, live data or credentials.`)
