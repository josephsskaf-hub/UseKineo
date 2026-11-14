// Real /check and presentation source; account/storage/event dependencies are inert fixtures.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROUTE='app/api/recreate/seu-video/check/route.ts',PRESENTATION='lib/recreate/seuVideoPresentation.ts',RULES='lib/recreate/seuVideoRules.ts'
let checks=0
const ok=(value,message)=>{checks++;assert(value,message)}
function world(overrides={},{signedIn=true,paid=false,seconds=7,width=720,height=1280}={}){
  const calls=[]
  let load
  load=createOfflineLoader({globals:{Response,Uint8Array},mocks:{
    'server-only':{},
    'next/server':{NextResponse:{json:(body,{status=200,headers={}}={})=>new Response(JSON.stringify(body),{status,headers})}},
    '@/lib/clips/clipServer':{clipsAdmin:()=>({}),loadClipAccount:async()=>({balance:99,plan:paid?'basic':'free'})},
    '@/app/api/admin/_shared/mrr':{isPayingPlan:plan=>plan==='basic'},
    '@/lib/recreate/server':{RECREATE_HEADERS:{'Cache-Control':'no-store'}},
    '@/lib/recreate/seuVideoServer':{
      seuVideoSession:async()=>({supabase:{},user:signedIn?{id:'fixture-account'}:null}),
      ioDoTextoReal:()=>({quadro:async()=>null,visao:async()=>null}), // reancorado KINEO-RECREATE-TEXTO-DO-PEDIDO-1311: sem quadro e sem visão = o texto da tela, byte a byte (guardião próprio: scripts/test-recreate-texto-do-pedido-1311.mjs)
      lerVideoDoCliente:async(admin,user,path)=>{calls.push({user,path});const meta={segundos:seconds,fps:30,largura:width,altura:height},m=load('lib/recreate/seuVideo.ts'),result=m.validarVideo(meta,9000,'video/mp4',m.SEU_VIDEO_MOTOR);return result.ok?{ok:true,meta,bytes:9000,gerados:seconds,proporcao:'9:16',creditos:40}:result},
    },
    '@/lib/serverEvents':{writeServerEvent:async()=>true},
  },source:(rel,text)=>Object.hasOwn(overrides,rel)?overrides[rel]:text})
  const route=load(ROUTE)
  const post=async body=>{
    const request={headers:new Headers(),nextUrl:new URL('https://www.usekineo.com/api/recreate/seu-video/check'),json:async()=>body}
    try{const response=await route.POST(request);return{status:response.status,body:await response.json()}}catch{return{status:'threw',body:{}}}
  }
  return{post,load,calls}
}
async function verify(overrides={}){
  const W=world(overrides),m=W.load('lib/recreate/seuVideo.ts'),safe=W.load(RULES),presentation=W.load(PRESENTATION).seuVideoPresentation()
  const legacy=await W.post({video_path:'owned.mp4',people:1})
  ok(legacy.status===200&&legacy.body.prompt===m.promptDoSeuVideo(m.SEU_VIDEO_MOTOR,1,[]),'legacy check keeps its existing default prompt')
  ok(JSON.stringify(legacy.body.presentation)===JSON.stringify(presentation),'check and SSR share the selected presentation')
  ok(legacy.body.credits===40&&legacy.body.balance===99&&legacy.body.shortfall===0&&legacy.body.needs_plan===false,'additive presentation preserves checked quote and account fields')
  ok(presentation.resolution==='720p'&&presentation.minSeconds===3&&presentation.minSide===700&&presentation.audio==='silent'&&presentation.waitLabel==='About 2 minutes','public facts derive from current server configuration')
  ok(!/kling|seedance|fal|model|usd|0\.094|0\.1323/i.test(JSON.stringify(presentation)),'public facts contain no provider identity or supplier price')
  for(const genders of[['man'],['woman'],['man','woman'],['woman','man','woman']]){
    const positions=genders.length===1?[]:genders.length===2?['on the left','on the right']:['on the left','in the center','on the right']
    const checked=await W.post({video_path:'owned.mp4',people:genders.length,genders,positions})
    ok(checked.status===200&&checked.body.prompt===safe.promptPorGenero(genders,positions)&&checked.body.prompt_edited===true,'check builds selected gender prompt and marks it edited')
    ok(safe.validarPrompt(checked.body.prompt,genders.length).ok,'server gender prompt passes actual submit validation')
  }
  for(const genders of[[],[''],['man','woman'],['robot']]){
    const checked=await W.post({video_path:'owned.mp4',people:1,genders})
    ok(checked.status===400&&checked.body.code==='genders','incomplete or invalid gender returns an explicit refusal')
  }
  const guest=await world(overrides,{signedIn:false}).post({people:1,genders:['man']})
  ok(guest.status===404,'check remains restricted by existing account gate')
  for(const settings of[{seconds:2.9},{width:699}]){
    const invalid=await world(overrides,settings).post({video_path:'owned.mp4',people:1,genders:['man']})
    ok(invalid.status===422&&['duration','resolution'].includes(invalid.body.code),'server validation still rejects invalid current inputs')
  }
  const unpaid=await world(overrides,{seconds:12}).post({video_path:'owned.mp4',people:1,genders:['man']})
  ok(unpaid.body.needs_plan===true,'longer video keeps paid-plan requirement')
}
await verify()
const baseline=checks
const replace=(rel,from,to)=>{const source=fs.readFileSync(rel,'utf8').replace(/\r\n/g,'\n');assert.equal(source.split(from).length-1,1,'unique mutant anchor');return{[rel]:source.replace(from,to)}}
const mutations=[
  ['check omits public config',()=>replace(ROUTE,'presentation: seuVideoPresentation(),','presentation: undefined,'),'check and SSR share the selected presentation'],
  ['check ignores chosen gender',()=>replace(ROUTE,'genders ? promptPorGenero(genders as SeuVideoGender[], positions) : promptDoSeuVideo(SEU_VIDEO_MOTOR, people, positions)','promptDoSeuVideo(SEU_VIDEO_MOTOR, people, positions)'),'check builds selected gender prompt and marks it edited'],
  ['check drops edited marker',()=>replace(ROUTE,'{ prompt_edited: true }','{ prompt_edited: false }'),'check builds selected gender prompt and marks it edited'],
  ['current presentation stuck at old quality',()=>replace(PRESENTATION,"resolution: current ? '720p' : '480p'","resolution: '480p'"),'public facts derive from current server configuration'],
  ['presentation exposes provider identity',()=>replace(PRESENTATION,'return Object.freeze({','return Object.freeze({ provider: SEU_VIDEO_MOTOR,'),'public facts contain no provider identity or supplier price'],
]
for(const[name,mutate,message]of mutations){let error;try{await verify(mutate())}catch(e){error=e}assert(error instanceof assert.AssertionError&&error.message===message,'mutant must fail at intended assertion: '+name+'; received '+error?.message);console.log('  ok mutant: '+name)}
console.log(`PASS seuVideo presentation/check: ${baseline} checks and ${mutations.length} mutants; offline only.`)
