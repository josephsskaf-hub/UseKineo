// Actual React handlers + SSR and actual authenticated read route with in-memory data.
// No network, credentials, paid providers or database writes.
import assert from 'node:assert/strict'
import { renderPage } from './preview-ux-complete.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let checks=0
const ok=(v,m)=>{assert.ok(v,m);checks++}
const equal=(a,b,m)=>{assert.deepEqual(a,b,m);checks++}
const load=createOfflineLoader()
const nav=load('@/lib/ui/workspaceNavigation')
// KINEO-MENU-4-VIDEO-IMAGEM-2026-09-25 — Animate virou item próprio do "More" (não acende Studio junto); os demais modos de vídeo seguem sob Video.
for(const p of ['/studio','/studio/create','/avatar'])ok(nav.workspaceNavActive(p,'/studio'),'all video tools share Video')
ok(!nav.workspaceNavActive('/animate','/studio')&&nav.MORE_NAV.some(i=>i.href==='/animate')&&nav.workspaceNavActive('/animate','/animate'),'Animate has its own More item (25/09)')
for(const p of ['/history','/my-videos','/library'])ok(nav.workspaceNavActive(p,'/library'),'legacy history remains in Library context')
for(const p of ['/studio-not-real','/library-extra'])ok(!nav.workspaceNavActive(p,'/studio')&&!nav.workspaceNavActive(p,'/library'),'path boundary')
for(const p of ['/studio','/history','/images'])ok(!nav.workspaceNavActive(p,'/'),'home exact match')
const text=node=>Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):typeof node==='string'||typeof node==='number'?String(node):''
function page(file,initial={},props={}){
 const state={demoOffer:true,demoShell:true,...initial}, controls=[]
 const render=()=>{controls.length=0;return renderPage(file,false,{...state,captureControls:controls,onStateChange:(name,value)=>state[name]=typeof value==='function'?value(state[name]):value},props)}
 const click=label=>{const control=controls.find(c=>c.type==='button'&&text(c.children).trim()===label);assert.ok(control,'button '+label);control.props.onClick()}
 return {state,controls,render,click}
}
const studio=page('app/(dashboard)/studio/StudioClient.tsx',{prompt:'A lighthouse in a storm',balance:100})
let html=studio.render()
ok(html.indexOf('studio-generation-review')<html.indexOf('<section class="composer-proposal-settings"'),'cost and action are with idea')
studio.click('Clip');html=studio.render();equal(studio.state.scriptMode,'clip','real Clip handler')
ok(html.includes('Render clip · 5 cr'),'clip cost from server constant')
ok(html.includes('without narration'),'clip does not promise film narration')
studio.click('Film');html=studio.render();equal(studio.state.scriptMode,'ai','real Film handler')
equal(studio.state.prompt,'A lighthouse in a storm','mode change preserves input')
studio.state.scriptMode='verbatim';studio.render();studio.click('Film');equal(studio.state.scriptMode,'verbatim','film tab preserves own script mode')
for(const href of ['/avatar','/animate'])ok(html.includes(`href="${href}"`),'existing dedicated mode '+href)
const videos=[{id:'completed-demo',title:'Lighthouse story',status:'completed',video_url:'/demo.mp4',thumbnail_url:null},{id:'pending-demo',title:'Forest story',status:'processing',video_url:null,thumbnail_url:null},{id:'failed-demo',title:'Ocean story',status:'failed',video_url:null,thumbnail_url:null}]
const library=page('app/(dashboard)/library/LibraryClient.tsx',{loaded:true,vids:videos,imgs:[{id:'image-demo',url:'/demo.webp',model:'Demo image'}],auds:[{id:'audio-demo',url:'/demo.mp3',text:'Demo voice',model:'Demo audio'}]})
html=library.render()
for(const v of videos)ok(html.includes(`/history#v-${v.id}`),'every status keeps its authoritative detail destination')
ok(html.includes('All</span>')||html.includes('All'),'All filter exists')
ok(html.includes('Needs review')&&html.includes('Processing'),'non-playable projects are visible')
ok(html.includes('1 of your first 4 Shorts')&&!html.includes('3 of your first 4 Shorts'),'only finished videos count toward creation milestones')
const search=library.controls.find(c=>c.type==='input'&&c.props.type==='search');ok(search,'search visible below six projects')
search.props.onChange({target:{value:'Forest'}});html=library.render()
ok(html.includes('/history#v-pending-demo')&&!html.includes('/history#v-completed-demo'),'real search keeps matched processing project')
library.click('Images · 1');html=library.render();equal(library.state.tab,'images','real media tab');equal(library.state.q,'','changing tab resets query')
ok(html.includes('/demo.webp')&&!html.includes('/history#v-failed-demo'),'image filter narrows display only')
for(const language of ['en','es','hi']){
 const h=renderPage('components/MobileNav.tsx',false,{interfaceLanguage:language},{isLoggedIn:true})
 // KINEO-MENU-4-VIDEO-IMAGEM-2026-09-25 — Home saiu da barra de abas (o logo da gaveta leva a /); Images e Ads viraram abas.
 // 25/09 founder: Ads opens the creator directly; server access gates still apply.
 for(const href of ['/studio','/images','/ads/new','/library','/audio','/pricing','/account'])ok(h.includes(`href="${href}"`),'mobile destination '+href)
 ok(!h.includes('href="/"'),'mobile tab bar no longer carries Home (25/09)')
 for(const href of ['/history','/thumbnail-generator','/avatar'])ok(!h.includes(`href="${href}"`),'no redundant top-level menu '+href)
}
const pricing=page('app/pricing/PricingClient.tsx',{displayCurrency:'usd',signedIn:true})
html=pricing.render();ok(html.indexOf('id="plans"')<html.indexOf('class="pricing-secondary"'),'plan choice before secondary offer')
ok(html.includes('credits / month'),'credits visible without expanding details')
ok(!html.includes('Make 0 AI films'),'no impossible trial film count')
pricing.click('Annual2 MONTHS FREE');html=pricing.render();equal(pricing.state.billing,'annual','real annual switch')
ok(html.includes('billed annually'),'annual payment disclosure retained')
pricing.click('Monthly');html=pricing.render();equal(pricing.state.billing,'monthly','real monthly switch')
for(const [value,want] of [[null,48],['300',300],['9999',300],['0',1],['-1',48],['oops',48]])equal(load('@/lib/ui/libraryListing').videoListLimit(value),want,'bounded video list')
// Run the real GET route. Authenticated owner predicate must survive all limits.
for(const [limit,want] of [['300',300],['9999',300],[null,48]]){
 const queries=[]
 const client={auth:{getUser:async()=>({data:{user:{id:'synthetic-owner'}}})},from:table=>{
  const q={table,filters:[],head:false,limit:null};queries.push(q)
  const chain={select:(_columns,opts)=>{q.head=!!opts?.head;return chain},eq:(key,value)=>{q.filters.push([key,value]);return chain},order:()=>chain,limit:n=>{q.limit=n;return chain},then:resolve=>Promise.resolve(q.head?{count:1,error:null}:{data:videos.slice(0,q.limit).map(v=>({...v,created_at:'2026-09-22'})),error:null}).then(resolve)}
  return chain
 }}
 const route=createOfflineLoader({mocks:{'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}},'@/lib/supabase/server':{createClient:()=>client},'@/lib/jwtSkewFallback':{isJwtSkewError:()=>false,skewFallbackClient:()=>{throw Error('Unexpected elevated client')}}}})('app/api/videos/route.ts')
 const response=await route.GET(new Request('https://example.invalid/api/videos'+(limit?'?limit='+limit:''))),result=await response.json()
 equal(response.status,200,'read succeeds');equal(result.videos.length,3,'read keeps all states');equal(queries.find(q=>!q.head).limit,want,'real query bounded')
 for(const q of queries)ok(q.filters.some(([key,value])=>key==='user_id'&&value==='synthetic-owner'),'owner predicate on every query')
}
const signedOutRoute=createOfflineLoader({mocks:{
 'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}},
 '@/lib/supabase/server':{createClient:()=>({auth:{getUser:async()=>({data:{user:null}})},from:()=>{throw Error('Signed-out read must never query videos')}})},
 '@/lib/jwtSkewFallback':{isJwtSkewError:()=>false,skewFallbackClient:()=>{throw Error('Unexpected elevated client')}},
}})('app/api/videos/route.ts')
equal((await signedOutRoute.GET(new Request('https://example.invalid/api/videos?limit=300'))).status,401,'larger library read still requires authentication')
console.log(`App blue: ${checks} actual-handler, navigation, billing and owner-scoped read checks passed; no external calls.`)
