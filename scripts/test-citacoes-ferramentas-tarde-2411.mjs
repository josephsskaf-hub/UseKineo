import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import fs from 'node:fs'
import {offlineModules,React,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
const require=createRequire(import.meta.url),renderer=require(process.env.KINEO_CITATION_TEST_RENDERER||'C:/Users/josep/AppData/Local/Temp/citacoes-caixa-v2-react/node_modules/react-test-renderer/index.js')
const RELEASE='lib/growth/citationPagesRelease.ts',CAT='lib/seo/intentPages.ts',PAGE='app/ai-video-generator/for/[slug]/page.tsx',DATA='lib/seo/citationTools2411.ts',FORM='components/seo/CitationToolForm2411.tsx',ENTRY='app/api/citations/tool-entry/route.ts'
const baseline=JSON.parse(source('scripts/test-support/citacoes-tarde-referencia-2411.json'))
assert.equal(createHash('sha256').update(JSON.stringify(baseline.sources)).digest('hex'),'1df6cea5e5906d2f9fcf796f2e4a576ad69bb1f93fbcb7ccd72ed0e3f7cccb3c','immutable approved baseline')
const plain=({children})=>React.createElement('div',null,children)
const mocks=Object.fromEntries(['Footer','AgencyVolumeBridge','ExitIntentOffer','LocalizedScriptHandoff','StickyFreeShortCTA','Kineo1RetiredNotice','PaidSeedanceBridge','ScriptToSeedanceBridge','BuyCreatorCta','NicheHouseFilm','GeoRodada3Sections'].map(n=>['components/'+n+'.tsx',{__esModule:true,default:plain}]))
mocks['lib/analytics.ts']={trackEvent:()=>{},trackClosedEvent:()=>{},rememberSignupCampaign:()=>{}}
mocks['components/OrganicCtaLink.tsx']={__esModule:true,default:({children,source,placement,...p})=>React.createElement('a',p,children)}
mocks['components/seo/PaginaClara.tsx']={PaginaClaraTopo:plain,PaginaClaraCards:plain,PaginaClaraVitrine:plain}
mocks['lib/scriptLibrary.ts']={SCRIPT_VERTICAL_SLUGS:[]}
mocks['components/ugc/UgcCtaLink.tsx']={__esModule:true,default:({children,href})=>React.createElement('a',{href},children)}
mocks['app/claude-connector/ShowcaseGrid.tsx']={ShowcaseStrip:plain}
mocks['app/free-ai-shorts/[niche]/page.tsx']={NICHE_SLUGS:['horror','cartoon','facts','history','psychology','geography','motivation','reddit-stories']}
mocks['app/alternatives/[competitor]/page.tsx']={COMPETITOR_SLUGS:[]}
mocks['lib/publicSurfacePolicy.ts']={CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED:false}
const gh=source('lib/gptHandoff.ts'),deps={'lib/gptHandoff.ts':gh.replace("import { createHash } from 'node:crypto'","const createHash=()=>{throw Error('No hash in offline SSR')}")}
const make=(rep={},extra={})=>offlineModules({mocks:{...mocks,...extra},replacements:{...deps,...rep}})
const state=(mode,rep={})=>({...rep,[RELEASE]:(rep[RELEASE]??source(RELEASE)).replace("CITATION_PAGES_RELEASE: CitationPagesRelease = 'off'","CITATION_PAGES_RELEASE: CitationPagesRelease = '"+mode+"'")})
const json=x=>JSON.parse(JSON.stringify(x)),render=(l,slug)=>renderToStaticMarkup(React.createElement(l(PAGE).default,{params:{slug}}))
const old=make(baseline.sources),live=make(),slugs=json(live(RELEASE).CITATION_TOOL_DRAFT_SLUGS),oldSlugs=json(old(CAT).INTENT_SLUGS)
assert.equal(slugs.length,10,'TEN explicit new tools')
assert.equal(new Set(slugs).size,10,'UNIQUE new slugs')
assert.deepEqual(json(live(CAT).INTENT_SLUGS),oldSlugs,'OFF preserves all 129 public slugs')
for(const slug of oldSlugs)assert.equal(render(live,slug),render(old,slug),'PRESERVED entire published HTML '+slug)
assert.deepEqual(json(live('app/sitemap.ts').default()),json(old('app/sitemap.ts').default()),'OFF exact sitemap')
const publicCurrent=make(state('public')),publicBaseline=make(state('public',baseline.sources))
assert.equal(publicCurrent(CAT).INTENT_SLUGS.length,142,'PUBLIC exact catalog size')
assert.equal(new Set(publicCurrent(CAT).INTENT_SLUGS).size,142,'PUBLIC unique catalog')
for(const slug of oldSlugs)assert.equal(render(publicCurrent,slug),render(publicBaseline,slug),'PRESERVED published HTML in public '+slug)
for(const mode of ['off','internal','public']){
 const l=make(state(mode)),catalog=l(CAT)
 for(const slug of slugs){
  assert.equal(catalog.INTENT_SLUGS.includes(slug),mode==='public','STATIC gated new slug')
  assert.equal(l(RELEASE).citationFormatPreviewPath('/ai-video-generator/for/'+slug),mode==='internal'?'/internal/citation-formats/'+slug:null,'PRIVATE rewrite state')
  if(mode==='off')assert.throws(()=>l(PAGE).default({params:{slug}}),/NEXT_NOT_FOUND/,'OFF closed')
  if(mode==='internal')assert.equal(l(PAGE).default({params:{slug}}).type,l('components/seo/InternalCitationPreview.tsx').default,'INTERNAL server boundary')
  if(mode==='public'){
   const h=render(l,slug),tool=l(DATA).getCitationTool(slug),meta=l(PAGE).generateMetadata({params:{slug}})
   assert.equal((h.match(/<form\b/g)||[]).length,1,'ONE real form')
   assert.ok(h.includes(tool.intro),'DIRECT unique answer')
   assert.ok(h.includes(tool.review),'LIMITS visible')
   assert.ok(h.includes('Use my script as is')&&h.includes('Write from my idea'),'TWO modes')
   assert.equal(meta.alternates.canonical,'https://www.usekineo.com/ai-video-generator/for/'+slug,'CANONICAL')
   const schemas=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]))
   assert.ok(schemas.find(x=>x['@type']==='FAQPage').mainEntity.some(x=>x.name===tool.faq[0].q),'FAQ literal question')
   assert.ok(h.includes('2026-11-24'),'DATE visible')
   assert.ok(h.includes('Historical Kineo example'),'HISTORICAL media label')
  }
 }
}
const sample='The blue lantern rings twice before the little fox returns home.'
const rendererPath=process.env.KINEO_CITATION_TEST_RENDERER||'C:/Users/josep/AppData/Local/Temp/citacoes-caixa-v2-react/node_modules/react-test-renderer/index.js'
const mountedSupport=source('scripts/gpt24h-offline-support.mjs').replace("resolve(dirname(fileURLToPath(import.meta.url)), '..')","process.cwd()").replace("const require = createRequire(resolve(root, 'package.json'))", "const local=createRequire(resolve(root,'package.json'));const rr=createRequire("+JSON.stringify(rendererPath)+");const require=n=>n==='react'||n.startsWith('react/')?rr(n):local(n)")
const {offlineModules:mountedModules}=await import('data:text/javascript;base64,'+Buffer.from(mountedSupport).toString('base64'))
function mounted(rep={}){
 const l=mountedModules({mocks,replacements:rep}),tool=l(DATA).CITATION_TOOLS[0];let tree
 renderer.act(()=>{tree=renderer.create(React.createElement(l(FORM).default,{slug:tool.slug,language:tool.language,examplePrompt:tool.examplePrompt}))})
 const text=()=>tree.root.findByType('textarea')
 renderer.act(()=>text().props.onChange({target:{value:sample}}))
 renderer.act(()=>tree.root.findAllByProps({type:'radio'}).find(x=>x.props.value==='verbatim').props.onChange())
 assert.equal(text().props.value,sample,'MODE preserves typed text')
 assert.equal(tree.root.findAllByProps({type:'radio'}).find(x=>x.props.value==='verbatim').props.checked,true,'MODE actually selected')
 assert.equal(tree.root.findByType('form').props.action,'/api/citations/tool-entry','ACTION real safe entry')
 assert.equal(tree.root.findAllByProps({type:'hidden'}).find(x=>x.props.name==='slug').props.value,tool.slug,'SLUG carried')
 renderer.act(()=>text().props.onChange({target:{value:'x'.repeat(1001)}}))
 assert.equal(tree.root.findByProps({type:'submit'}).props.disabled,true,'LIMIT overlong blocked without truncation')
 renderer.act(()=>tree.unmount())
}
mounted()
const sub=(f,a,b)=>{const s=source(f);assert.ok(s.includes(a),'mutation anchor '+a);return{[f]:s.replace(a,b)}}
for(const [label,rep,message]of[
 ['mode loses text',()=>sub(FORM,"setMode('verbatim')","{setText('');setMode('verbatim')}"),'MODE preserves typed text'],
 ['wrong destination',()=>sub(FORM,'action="/api/citations/tool-entry"','action="/studio/create"'),'ACTION real safe entry'],
 ['length bypass',()=>sub(FORM,'length<=CREATION_HANDOFF_PROMPT_MAX_CHARS','length<=9000'),'LIMIT overlong blocked without truncation'],
]){assert.throws(()=>mounted(rep()),e=>e.message.includes(message),label);console.log('PASS mutant '+label)}
const NextResponse={json:(body,init={})=>({body,status:init.status??200,headers:new Headers(init.headers)}),redirect:(url,status)=>({status,headers:new Headers({location:String(url)})})}
const entrySupport=source('scripts/gpt24h-offline-support.mjs').replace("resolve(dirname(fileURLToPath(import.meta.url)), '..')","process.cwd()").replace('function localRequire(name) {','function localRequire(name) { if(Object.hasOwn(mocks,name)) return mocks[name]')
const {offlineModules:entryModules}=await import('data:text/javascript;base64,'+Buffer.from(entrySupport).toString('base64'))
async function entryCase(mode,tool,kind,scriptMode='ai',rep={},extra=''){
 let reads=0;const base=make(rep),email=base('lib/internalAccounts.ts').INTERNAL_EXACT_EMAILS[0]
 const user=kind==='guest'?null:{email:kind==='external'?'synthetic@example.invalid':email,email_confirmed_at:kind==='unconfirmed'?null:'yes'}
 const l=entryModules({replacements:{...deps,...state(mode,rep)},mocks:{...mocks,'next/server':{NextResponse},'lib/supabase/server.ts':{createClient:()=>({auth:{getUser:async()=>{reads++;if(kind==='throws')throw Error('offline auth');return{data:{user},error:kind==='missing'?{name:'AuthSessionMissingError'}:kind==='error'?{name:'JWTError'}:null}}}})}}})
 const params=new URLSearchParams({slug:tool.slug,prompt:sample,script_mode:scriptMode})
 const response=await l(ENTRY).GET(new Request('https://www.usekineo.com/api/citations/tool-entry?'+params+extra))
 return {response,reads,l,tool}
}
async function entryChecks(rep={},all=true){
 const tools=make(rep)(DATA).CITATION_TOOLS
 for(const tool of all?tools:[tools[0]])for(const mode of ['off','internal','public'])for(const kind of ['guest','external','house','unconfirmed','error','throws'])for(const scriptMode of ['ai','verbatim']){
  const {response,reads,l}=await entryCase(mode,tool,kind,scriptMode,rep,'&redirect=https://evil.invalid&duration=90&language=ja&create_intent=fast')
  const authBad=kind==='error'||kind==='throws',allowed=mode==='public'||mode==='internal'&&kind==='house'
  assert.equal(response.status,mode==='off'?404:authBad?503:allowed?303:404,'ENTRY eligibility')
  if(mode==='off')assert.equal(reads,0,'ENTRY off no auth')
  assert.ok(response.headers.get('Cache-Control').includes('no-store'),'ENTRY private cache')
  if(response.status===303){
   const target=new URL(response.headers.get('location'))
   assert.equal(target.origin,'https://www.usekineo.com','ENTRY no open redirect')
   assert.equal(target.pathname,kind==='guest'?'/signup':'/studio','ENTRY first editable Studio')
   const destination=kind==='guest'?new URL(target.searchParams.get('redirect'),'https://www.usekineo.com'):target
   assert.equal(destination.searchParams.get('prompt'),sample,'ENTRY text intact')
   assert.equal(destination.searchParams.get('script_mode'),scriptMode,'ENTRY mode intact')
   assert.equal(destination.searchParams.get('language'),tool.language,'ENTRY catalog language authoritative')
   assert.equal(destination.searchParams.has('duration'),false,'ENTRY no forced duration')
   if(kind!=='guest')assert.equal(target.searchParams.has('create_intent'),false,'ENTRY no auto start')
  }
 }
}
await entryChecks()
for(const [label,rep,message]of[
 ['entry off opens',()=>sub(ENTRY,"if(CITATION_PAGES_RELEASE==='off')return fail(404)",'if(false)return fail(404)'),'ENTRY eligibility'],
 ['entry internal bypass',()=>sub(ENTRY,"CITATION_PAGES_RELEASE==='internal' && !citationPageVisible(user,'internal')",'false'),'ENTRY eligibility'],
 ['entry wrong Studio',()=>sub(ENTRY,'user?destinoDaIdeia(canonical)', 'user?canonical'),'ENTRY first editable Studio'],
 ['entry language lost',()=>sub(ENTRY,'language:tool.language','language:undefined'),'ENTRY catalog language authoritative'],
]){await assert.rejects(()=>entryChecks(rep(),false),e=>e.message.includes(message),label);console.log('PASS mutant '+label)}
console.log('PASS 129 entire HTML controls, exact off sitemap, 10 tools × 3 release states, mounted text/mode/length, 360 actual GET cases and 7 rejected mutants')
