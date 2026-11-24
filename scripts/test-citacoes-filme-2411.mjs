// Real pages/forms; no network, account, render or payment.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {citationFilmBaseline} from './test-support/citacoes-crescimento-referencias-2411.mjs'
import {offlineModules,React,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
const FREE='app/free-ai-shorts-generator/page.tsx',PAY='app/how-much-do-youtube-shorts-pay/page.tsx',CHEAP='app/cheapest-ai-shorts-maker/page.tsx'
const BEST='app/best-ai-shorts-generators/page.tsx',REELS='app/how-much-do-instagram-reels-pay/page.tsx',STATE='app/state-of-ai-shorts-2026/page.tsx'
const FORM='app/text-to-video-shorts/TextToVideoIntentForm.tsx',TOPIC='app/youtube-shorts-from-topic/TopicGeneratorForm.tsx',PROVIDER='components/seo/CitationFilmExperiment.tsx',RELEASE='lib/growth/citationFilmRelease.ts'
const plain=({children})=>React.createElement('div',null,children)
const mocks=Object.fromEntries(['Footer','AgencyVolumeBridge','ExitIntentOffer','LocalizedScriptHandoff','StickyFreeShortCTA','Kineo1RetiredNotice','PaidSeedanceBridge','ScriptToSeedanceBridge','BuyCreatorCta','NicheHouseFilm'].map(n=>['components/'+n+'.tsx',{__esModule:true,default:plain}]))
mocks['lib/analytics.ts']={trackEvent(){},trackClosedEvent(){},rememberSignupCampaign(){}}
mocks['lib/supabase/client.ts']={createClient(){throw Error('SSR must not request auth')}}
mocks['components/OrganicCtaLink.tsx']={__esModule:true,default:({children,source,placement,...props})=>React.createElement('a',props,children)}
mocks['components/seo/PaginaClara.tsx']={PaginaClaraTopo:plain,PaginaClaraCards:plain,PaginaClaraVitrine:plain}
const originals=Object.fromEntries([FREE,PAY,CHEAP,BEST,REELS,STATE,FORM].map(f=>[f,citationFilmBaseline(f)]))
const dep={'lib/gptHandoff.ts':source('lib/gptHandoff.ts').replace("import { createHash } from 'node:crypto'","const createHash=()=>{throw Error('Hash not used here')}")}
function make(rep={},country='US',reverse=true,skeleton=false){
 const replacements={...dep,...rep}
 replacements[FREE]=(rep[FREE]??source(FREE)).replace("import { headers } from 'next/headers'",'const headers=()=>({get:()=>'+JSON.stringify(country)+'}) //').replace('const OFFER = getFreeTierOffer()','const OFFER = {...getFreeTierOffer(),reverseTrial:'+reverse+'}')
 const stub={__esModule:true,default:()=>React.createElement('i',{'data-form-placeholder':'yes'})}
 return offlineModules({mocks:skeleton?{...mocks,[FORM]:stub,[TOPIC]:stub,'components/seo/CitationFilmProof.tsx':{__esModule:true,default:({children})=>children},'components/seo/CitationFilmShortAnswer.tsx':{__esModule:true,default:()=>null}}:mocks,replacements})
}
const release=(rep,v)=>({...rep,[RELEASE]:(rep[RELEASE]??source(RELEASE)).replace("CITATION_FILM_RELEASE: CitationFilmRelease = 'off'","CITATION_FILM_RELEASE: CitationFilmRelease = '"+v+"'")})
const render=(l,f,p={})=>renderToStaticMarkup(React.createElement(l(f).default,p))
const strip=h=>h.replaceAll('<i data-form-placeholder="yes"></i>','').replace(/<style data-citation-film-layout-2411="">[\s\S]*?<\/style>/g,'')
const schemas=h=>[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]))
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'")
const hidden=h=>new URLSearchParams([...h.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"/g)].map(x=>[decode(x[1]),decode(x[2])]))
const sample='The brass owl counted three lanterns. At dawn only the smallest one glowed.'
const partner={searchParams:{utm_source:'affiliate',utm_medium:'partner',utm_campaign:make()('lib/affiliateDestinations.ts').AFFILIATE_DESTINATIONS.find(x=>x.key==='video').campaign}}
const oldCache=new Map(),proof=[]
const oldFor=(country,reverse,skeleton=false)=>{const key=JSON.stringify([country,reverse,skeleton]);if(!oldCache.has(key))oldCache.set(key,make(originals,country,reverse,skeleton));return oldCache.get(key)}
async function verify(rep={}){
 assert.equal(make(rep)(RELEASE).CITATION_FILM_RELEASE,'off','DEFAULT switch off')
 const short=Object.keys(rep).length>0
 for(const country of(short?['US']:['US','IN',null]))for(const props of(short?[{}]:[{},partner]))for(const reverse of(short?[true]:[true,false])){
  const old=oldFor(country,reverse),off=make(rep,country,reverse),internal=make(release(rep,'internal'),country,reverse)
  for(const f of[FREE,PAY,CHEAP,BEST,REELS,STATE]){
   const b=render(old,f,props)
   assert.equal(render(off,f,props),b,'OFF original HTML exact')
   assert.equal(render(internal,f,props),b,'INTERNAL pending original HTML exact')
   let baseSkeleton=strip(render(oldFor(country,reverse,true),f,props))
   let pubSkeleton=strip(render(make(release(rep,'public'),country,reverse,true),f,props))

   const moved=[]
   if(f===BEST)moved.push(renderToStaticMarkup(React.createElement(old('components/seo/BuyerDecision2011.tsx').BuyerLead2011,{kind:'cost'})))
   if(f===CHEAP){
    moved.push(renderToStaticMarkup(React.createElement(old('components/PaginasMotor1610.tsx').CheapestAnswer1610)))
    moved.push([...baseSkeleton.matchAll(/<p\b[\s\S]*?<\/p>/g)].map(x=>x[0]).find(x=>x.includes('Kineo turns a single idea into a finished Short')))
   }
   if(f===REELS)moved.push([...baseSkeleton.matchAll(/<p\b[\s\S]*?<\/p>/g)].map(x=>x[0]).find(x=>x.includes('Instagram does not publish a pay rate')))
   for(const block of moved){
    assert.ok(block,'CONTENT known movable block')
    assert.equal(baseSkeleton.split(block).length,2,'CONTENT original block exactly once')
    assert.equal(pubSkeleton.split(block).length,2,'CONTENT complete cited block retained exactly once')
    baseSkeleton=baseSkeleton.replace(block,'');pubSkeleton=pubSkeleton.replace(block,'')
   }
   assert.equal(pubSkeleton,baseSkeleton,'CONTENT outside forms exact')
   for(const mode of['idea','finished_script']){
    const r=release(rep,'public');r[FORM]=(r[FORM]??source(FORM)).replace("useState<TextToVideoInputMode>('idea')","useState<TextToVideoInputMode>('"+mode+"')")
    r[TOPIC]=(r[TOPIC]??source(TOPIC)).replace("useState('')",'useState('+JSON.stringify(sample)+')')
    const l=make(r,country,reverse),h=render(l,f,props),params=hidden(h)
    assert.equal((h.match(/<form\b/g)||[]).length,1,'ONE form per page')
    assert.ok(h.includes('action="/api/citations/film-entry"'),'ENTRY real server routing')
    assert.deepEqual(schemas(h),schemas(b),'SCHEMA exact')
    assert.deepEqual(JSON.parse(JSON.stringify(l(f).metadata ?? await l(f).generateMetadata())),JSON.parse(JSON.stringify(old(f).metadata ?? await old(f).generateMetadata())),'META exact')
    const expectedCampaign=hidden(b).get('intent_campaign')
    assert.equal(params.get('intent_campaign'),expectedCampaign,'CAMPAIGN preserved')
    assert.equal(params.get('create_intent'),hidden(b).get('create_intent'),'OFFER preserved')
    assert.equal(params.get('script_mode'),mode==='idea'?'ai':'verbatim','MODE exact')
    assert.equal(params.has('duration'),false,'DURATION no forced length')
    for(const key of['utm_source','utm_medium','utm_campaign'])assert.equal(params.has(key),false,'ORIGIN no invented UTM')
    const target=new URL(params.get('redirect'),'https://www.usekineo.com')
    assert.equal(target.pathname,'/studio/create','HANDOFF canonical saved preview')
    assert.equal(target.searchParams.get('prompt'),sample,'HANDOFF exact prompt')
    assert.equal(target.searchParams.get('create_intent'),params.get('create_intent'),'HANDOFF canonical offer preview')
    assert.equal(target.searchParams.get('script_mode'),params.get('script_mode'),'HANDOFF same mode')
    const afterAuth=new URL(l('lib/growth/ideiaPousaNoStudio.ts').destinoDaIdeia(target.pathname+target.search),'https://www.usekineo.com')
    assert.equal(afterAuth.pathname,'/studio','AUTH actual destination rule')
    assert.equal(afterAuth.searchParams.get('prompt'),sample,'AUTH editable text preserved')
    assert.equal(afterAuth.searchParams.get('script_mode'),params.get('script_mode'),'AUTH editable mode preserved')
    assert.equal(afterAuth.searchParams.has('create_intent'),false,'AUTH autostart removed')

    const dst=new URLSearchParams();l('lib/creationHandoff.ts').carryCreationHandoff(new URLSearchParams({...Object.fromEntries(params),prompt:sample}),dst)
    const contract=l('lib/creationHandoff.ts').resolveActivationCreationContract(dst)
    assert.equal(contract.prompt,sample,'CONTRACT editable prompt')
    assert.equal(contract.scriptMode,params.get('script_mode'),'CONTRACT editable mode')
    if(!short)proof.push({page:f,country,partner:!!props.searchParams,reverse,mode,campaign:expectedCampaign,intent:params.get('create_intent')})
   }
  }
 }
 assert.equal(render(make(rep),FORM,{formId:'control'}),render(make(originals),FORM,{formId:'control'}),'SHARED defaults exact')
}
await verify()
const sub=(file,a,b)=>{const s=source(file).replace(/\r\n/g,'\n');assert.equal(s.split(a).length,2,'unique mutant anchor');return{[file]:s.replace(a,b)}}
const mutants=[
 ['default public',()=>sub(RELEASE,"CITATION_FILM_RELEASE: CitationFilmRelease = 'off'","CITATION_FILM_RELEASE: CitationFilmRelease = 'public'"),'DEFAULT switch off'],
 ['duplicate positions',()=>sub(PROVIDER,'if (state.enabled !== active) return null','if (false) return null'),'OFF original HTML exact'],
 ['internal guest granted',()=>sub(PROVIDER,"(CITATION_FILM_RELEASE === 'internal' && accessGranted)","(CITATION_FILM_RELEASE === 'internal')"),'INTERNAL pending original HTML exact'],
 ['forced length',()=>sub(FORM,'duration={topicOptions ? topicOptions.duration : selected.duration}','duration={selected.duration}'),'DURATION no forced length'],
 ['wrong campaign',()=>sub(FORM,'campaign={campaign}','campaign="wrong"'),'CAMPAIGN preserved'],
 ['dropped auth handoff',()=>sub(FORM,'preserveHandoffForSignedIn={preserveHandoffForSignedIn}','preserveHandoffForSignedIn={false}'),'HANDOFF canonical saved preview'],
 ['review bypassed',()=>sub(FORM,'reviewInStudio={!!topicOptions}','reviewInStudio={false}'),'ENTRY real server routing'],
 ['downgraded trial',()=>sub(FREE,"creationIntent: OFFER.reverseTrial ? 'trial_best' : 'fast'","creationIntent: 'fast'"),'OFFER preserved'],
]
for(const[name,mutate,message]of mutants){
 await assert.rejects(()=>verify(mutate()),e=>e?.code==='ERR_ASSERTION'&&e.message.startsWith(message),'mutant '+name+' exact assertion')
 console.log('PASS mutant '+name+' -> '+message)
}
if(process.env.KINEO_CITATION_FILM_PROOF)fs.writeFileSync(process.env.KINEO_CITATION_FILM_PROOF,JSON.stringify({scope:'Actual SSR/native form contracts, synthetic initial states; no account/network/render/payment',cases:proof,mutants:mutants.length},null,2))
console.log('PASS '+proof.length+' actual page/mode/geo/partner/offer contracts; old HTML off, cited content/schema, one form, exact handoff; '+mutants.length+' exact mutants')
