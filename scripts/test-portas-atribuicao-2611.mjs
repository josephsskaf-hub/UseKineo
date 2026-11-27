import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(import.meta.url)('typescript')
const analyticsPath = 'lib/analytics.ts'
const policyPath = 'lib/acquisitionSource.ts'
const mediaPath = 'lib/create/visitorMediaDraft.ts'
const recreatePath = 'app/recreate/RecreateClient.tsx'
const filmPath = 'lib/create/publicEditor.ts'
const source = file => readFileSync(resolve(root,file),'utf8')
const approvedId = '01234567-89ab-4cde-8fab-0123456789ab'
const site = 'https://www.usekineo.com'

function storage(){
  return { getItem(k){return Object.hasOwn(this,k)?this[k]:null}, setItem(k,v){this[k]=String(v)}, removeItem(k){delete this[k]} }
}
function sandbox(overrides={}){
  const local = storage(),session = storage(),cookies=new Map(),requests=[]
  function clearTab(){for(const key of Object.keys(session))if(typeof session[key]!=='function')session.removeItem(key)}
  const document={referrer:'',get cookie(){return [...cookies].map(([k,v])=>k+'='+v).join('; ')},set cookie(header){const [pair]=header.split(';'),i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1))}}
  const window={location:new URL(site),crypto:{randomUUID:()=>approvedId}}
  const drafts=new Map()
  const indexedDB={open(){const req={result:{close(){},transaction(){const tx={objectStore:()=>({openCursor:()=>({}),put(v,k){drafts.set(k,v)}})};queueMicrotask(()=>tx.oncomplete?.());return tx}}};queueMicrotask(()=>req.onsuccess());return req}}
  const globals={window,document,sessionStorage:session,localStorage:local,crypto:window.crypto,indexedDB,Date,Set,Map,URL,URLSearchParams,console,Intl,fetch:async(url,init)=>{requests.push([url,JSON.parse(init.body)]);return {ok:true,json:async()=>({ok:true})}}}
  const cache=new Map()
  function load(file){
    if(cache.has(file))return cache.get(file)
    const module={exports:{}};cache.set(file,module.exports)
    const src=overrides[file]??source(file)
    function req(name){
      if(name==='@/lib/acquisitionSource')return load(policyPath)
      if(name==='@/lib/analytics')return load(analyticsPath)
      if(name==='@/lib/growth/checkoutAuthSessionBridge')return {CHECKOUT_AUTH_SESSION_COOKIE:'auth',EVENT_SESSION_COOKIE:'event'}
      if(file===filmPath&&['./publicEditorRelease','./motorOpcional','@/lib/growth/studioSimples','@/lib/analyzeLimits','@/lib/textLanguage'].includes(name))return {}
      throw Error('Unexpected module: '+name)
    }
    const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
    vm.runInNewContext(js,{...globals,require:req,module,exports:module.exports},{filename:file})
    return module.exports
  }
  const analytics=load(analyticsPath)
  function visit(path,referrer=''){window.location=new URL(path,site);document.referrer=referrer;analytics.captureUtmsOnce();analytics.captureSourceOnce()}
  function signupSource(){analytics.trackSignupSource();return requests.find(([u])=>u==='/api/track-signup-source')[1]}
  return {analytics,load,visit,signupSource,clearTab,window,drafts,local}
}
function checkNext(href,route,origin){
  const signup=new URL(href,site),back=new URL(signup.searchParams.get('redirect'),site)
  assert.equal(signup.pathname,'/signup');assert.equal(back.pathname,route)
  for(const [key,value]of Object.entries(origin)){
    assert.equal(signup.searchParams.get(key),value,'signup '+key)
    assert.equal(back.searchParams.get(key),value,'return '+key)
  }
  assert.equal(back.searchParams.get('draft'),approvedId)
  assert.equal(back.searchParams.get('volta'),'1')
}
async function verify(overrides={}){
 const source= {utm_source:'chatgpt',utm_medium:'answer',utm_campaign:'original',utm_source_platform:'assistant_app',intent_campaign:'origem'}
 const landing='/ai-ugc-ads?'+new URLSearchParams(source)
 for(const route of ['film','cartoon','ads','clip','recreate']){
  const b=sandbox(overrides);b.visit(landing)
  b.clearTab() // next editor can open in a new tab; durable first touch must survive
  b.visit((route==='recreate'?'/recreate/elevator':'/create/'+route)+'?entry=ugc&utm_source=seo&utm_medium=ugc_pages&utm_campaign=ugc_pillar',site+landing)
  let href
  if(route==='film') href=b.load(filmPath).filmSignup({text:'fixture film',duration:15,language:'en',aspect:'9:16',verbatim:false,engine:'seedance',dialogue:null})
  else if(route==='recreate'){
    const file=overrides[recreatePath]??readFileSync(resolve(root,recreatePath),'utf8')
    const expr=file.match(/window\.location\.assign\((publicEditorSignup\([^\n]+draft: ref[^\n]+)\)/)
    assert.ok(expr,'Recreate draft uses original signup builder')
    href=vm.runInNewContext(expr[1],{publicEditorSignup:b.analytics.publicEditorSignup,flowBasePath:'/recreate',selected:{id:'elevator'},ref:approvedId,URLSearchParams})
  }else{href=await b.load(mediaPath).saveMediaDraft(route,{text:'fixture prompt'},[]);assert.equal(b.drafts.get(approvedId).fields.text,'fixture prompt')}
  checkNext(href,route==='recreate'?'/recreate/elevator':'/create/'+route,source)
  b.visit(href)
  const posted=b.signupSource()
  assert.equal(posted.signup_utm_source,'chatgpt','stored acquisition')
  assert.equal(posted.signup_utm_campaign,'original','original paid or organic campaign wins over product intent')
 }
 for (const surface of ['nav','nav-mobile']){
  const b=sandbox(overrides)
  b.visit('/create/film?utm_source='+surface)
  const back=b.analytics.publicEditorSignup('/create/film',new URLSearchParams({draft:approvedId,volta:'1'}))
  assert.equal(new URL(back,site).searchParams.has('utm_source'),false,'menu must not become a signup source')
  const body=b.signupSource();assert.equal(body.signup_surface,surface,'signup surface')
  assert.equal(body.signup_utm_source,null,'no invented source');assert.equal(body.utm_source,null)
 }
 const retry=sandbox(overrides)
 retry.visit('/create/film?utm_source=nav&utm_medium=menu&utm_campaign=row')
 retry.visit('/ai-ugc-ads?utm_source=chatgpt')
 const afterNav=retry.analytics.editorSignupAttribution()
 assert.equal(afterNav.get('utm_source'),'chatgpt','later true origin wins after an internal-only tag')
 assert.equal(afterNav.get('utm_medium'),null,'old navigation labels do not pollute real acquisition')
 assert.equal(afterNav.get('utm_campaign'),null)
 const ref=sandbox(overrides);ref.visit('/ai-ugc-ads','https://chatgpt.com/');ref.visit('/create/ads?entry=ugc&utm_source=seo&utm_medium=ugc_pages&utm_campaign=ugc_pillar',site+'/ai-ugc-ads')
 const response=ref.signupSource();assert.equal(response.signup_utm_source,null,'referrer-only acquisition never becomes editorial SEO')
 assert.ok(response.signup_referrer.includes('chatgpt.com'),'raw external referrer retained')
 const paid=sandbox(overrides);paid.visit('/?utm_source=bing&utm_medium=cpc&utm_campaign=brand&msclkid=abc');paid.visit('/create/film?utm_source=nav',site+'/')
 const attrs=paid.analytics.editorSignupAttribution();assert.equal(attrs.get('msclkid'),'abc');assert.equal(attrs.get('utm_source'),'bing');assert.equal(paid.signupSource().signup_surface,'nav')
}
await verify()
const cases=[
 [analyticsPath, "rememberSignupCampaign(query.get('intent_campaign')!)","void 0",'signup intent_campaign'],
 [analyticsPath, 'new URLSearchParams(first.editor_tracking ?? {})','new URLSearchParams()','signup utm_source_platform'],
 [policyPath,"  'nav-mobile',","  'other-surface',",'menu must not become a signup source'],
 [mediaPath,"return publicEditorSignup('/create/' + surface, query)","return '/signup?' + new URLSearchParams({redirect:'/create/' + surface + '?' + query})",'signup utm_source'],
]
for(const [file,a,b,msg]of cases){
 const raw=source(file);assert.ok(raw.includes(a),'mutant anchor '+a)
 await assert.rejects(()=>verify({[file]:raw.replace(a,b)}),e=>e.code==='ERR_ASSERTION'&&e.message.startsWith(msg),'must detect '+msg)
}
console.log('PASS 5 editor redirects, 5 signup payloads, 2 menu surfaces, external ChatGPT referrer, paid Bing click, cross-tab first touch and 4 targeted mutants.')
