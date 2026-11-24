import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {offlineModules,React,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
const RELEASE='lib/growth/citationPagesRelease.ts',ACCESS='lib/growth/citationPagesAccess.ts',INTENT='app/ai-video-generator/for/[slug]/page.tsx',CAT='lib/seo/intentPages.ts',AD='app/ai-ugc-ads/product-photo-ads/page.tsx',MAP='app/sitemap.ts',AUTH='components/seo/InternalCitationPreview.tsx'
const plain=({children})=>React.createElement('div',null,children)
const mocks=Object.fromEntries(['Footer','AgencyVolumeBridge','ExitIntentOffer','LocalizedScriptHandoff','StickyFreeShortCTA','Kineo1RetiredNotice','PaidSeedanceBridge','ScriptToSeedanceBridge','BuyCreatorCta','NicheHouseFilm','GeoRodada3Sections'].map(n=>[`components/${n}.tsx`,{__esModule:true,default:plain}]))
mocks['lib/analytics.ts']={trackEvent:()=>{},trackClosedEvent:()=>{},rememberSignupCampaign:()=>{}}
mocks['lib/scriptLibrary.ts']={SCRIPT_VERTICAL_SLUGS:[]}
mocks['components/OrganicCtaLink.tsx']={__esModule:true,default:({children,source,placement,...p})=>React.createElement('a',p,children)}
mocks['components/seo/PaginaClara.tsx']={PaginaClaraTopo:plain,PaginaClaraCards:()=>React.createElement('div',{'data-control-cards':'old'}),PaginaClaraVitrine:plain}
mocks['components/ugc/UgcCtaLink.tsx']={__esModule:true,default:({children,href})=>React.createElement('a',{href},children)}
mocks['app/claude-connector/ShowcaseGrid.tsx']={ShowcaseStrip:plain}
mocks['app/free-ai-shorts/[niche]/page.tsx']={NICHE_SLUGS:['horror','cartoon','facts','history','psychology','geography','motivation','reddit-stories']}
mocks['app/alternatives/[competitor]/page.tsx']={COMPETITOR_SLUGS:[]}
mocks['lib/publicSurfacePolicy.ts']={CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED:false}
const gh=source('lib/gptHandoff.ts'),deps={'lib/gptHandoff.ts':gh.replace("import { createHash } from 'node:crypto'","const createHash=()=>{throw Error('No hash in offline SSR')}")}
const make=(rep={},auth={data:{user:null},error:null})=>offlineModules({mocks:{...mocks,'lib/supabase/server.ts':{createClient:()=>({auth:{getUser:async()=>auth}})}},replacements:{...deps,...rep}})

const HERO='components/seo/CitationFormatHero.tsx',DATA='lib/growth/citationFormatHero2411.ts',TOPIC='app/youtube-shorts-from-topic/TopicGeneratorForm.tsx'
const baseline=JSON.parse(source('scripts/test-support/citacoes-formatos-referencia-2411.json'))
assert.equal(createHash('sha256').update(JSON.stringify(baseline.sources)).digest('hex'),'6a78a933af2627240ce53a214a09bfb930aa97ff64e7e925d0946bca6f1f9c48','Exact frozen baseline, portable without unmerged git objects')
const oldSource=baseline.sources[INTENT],oldAd=baseline.sources[AD]
const render=(l,f,p={})=>renderToStaticMarkup(React.createElement(l(f).default,p))
const publicRep=rep=>({...rep,[RELEASE]:(rep[RELEASE]??source(RELEASE)).replace("CITATION_PAGES_RELEASE: CitationPagesRelease = 'off'","CITATION_PAGES_RELEASE: CitationPagesRelease = 'public'")})
const old=make(publicRep({[INTENT]:oldSource,[AD]:oldAd}))
const controls=['urdu','story-videos','faceless-videos','documentary-shorts','instagram-reels']
const schemas=h=>[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]))
const json=x=>JSON.parse(JSON.stringify(x))
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'")
const hidden=h=>new URLSearchParams([...h.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"/g)].map(x=>[decode(x[1]),decode(x[2])]))
const sample='The orange kitten found a lighthouse key under the last blue lantern.'
const expected={
 'cartoon-videos':'/previews/home-card-kids-cartoon-leo.mp4',
 'animated-story-videos':'/previews/home-card-novo-pumpkin.mp4',
 'animal-story-videos':'/previews/home-card-novo-werewolf_pup.mp4',
}
const strip=h=>h.replace(/<style data-citation-format-theme="2411">[\s\S]*?<\/style>/g,'').replace(/<section class="cfh-2411"[\s\S]*?<\/section>/g,'').replaceAll(' kpl-citation-format-2411','').replace(/ style="[^"]*"/g,'')
function verify(rep={}){
 const r=publicRep(rep),l=make(r),data=l(DATA)
 assert.equal(make(rep)(ACCESS).CITATION_PAGES_RELEASE,'off','DEFAULT remains off')
 for(const slug of Object.keys(expected)){
  const props={params:{slug}},b=render(old,INTENT,props),h=render(l,INTENT,props)
  assert.equal((h.match(/id="citation-format-(?:cartoon-videos|animated-story-videos|animal-story-videos)"/g)||[]).length,1,'HERO one form')
  assert.equal(h.match(/<video[^>]+src="([^"]+)"/)?.[1],expected[slug],'FIRST format example')
  assert.ok(h.indexOf('class="cfh-2411"')<h.indexOf('data-control-cards="old"'),'POSITION hero before shared cards')
  assert.equal(strip(h),strip(b),'CONTENT original body unchanged')
  assert.deepEqual(schemas(h),schemas(b),'SCHEMA exact')
  assert.deepEqual(json(l(INTENT).generateMetadata(props)),json(old(INTENT).generateMetadata(props)),'META exact')
  assert.ok(h.includes('data-citation-format-theme="2411"'),'THEME included only on new formats')
  assert.ok(data.CITATION_FORMAT_CSS.includes('html[data-theme="dark"] .kpl-citation-format-2411{'),'THEME explicit dark scope')
  assert.ok(h.includes('background:var(--cfh-bg)'),'THEME page reads background variable')
  const carried=publicRep({...rep,[TOPIC]:(rep[TOPIC]??source(TOPIC)).replace("useState('')",'useState('+JSON.stringify(sample)+')')})
  const params=hidden(render(make(carried),INTENT,props))
  assert.equal(params.get('create_intent'),'trial_best','OFFER trial_best preserved')
  assert.equal(params.has('duration'),false,'DURATION no forced length')
  assert.equal(params.get('script_mode'),'ai','MODE idea')
  assert.equal(params.get('intent_campaign'),'intent_'+slug,'CAMPAIGN page')
  for(const k of ['utm_source','utm_medium'])assert.equal(params.has(k),false,'ORIGIN no fake source')
  const dest=new URL(params.get('redirect'),'https://www.usekineo.com')
  assert.equal(dest.pathname,'/studio/create','HANDOFF signed-in destination')
  assert.equal(dest.searchParams.get('prompt'),sample,'HANDOFF exact text')
  assert.equal(dest.searchParams.get('create_intent'),'trial_best','HANDOFF offer')
  const target=new URLSearchParams();l('lib/creationHandoff.ts').carryCreationHandoff(new URLSearchParams({...Object.fromEntries(params),prompt:sample}),target)
  assert.equal(l('lib/creationHandoff.ts').resolveActivationCreationContract(target).prompt,sample,'CONTRACT actual activation')
 }
 for(const slug of controls){const p={params:{slug}};assert.equal(render(l,INTENT,p),render(old,INTENT,p),'CONTROL old intent byte identical');assert.deepEqual(json(l(INTENT).generateMetadata(p)),json(old(INTENT).generateMetadata(p)),'CONTROL old metadata')}
 assert.equal(render(l,AD),render(old,AD),'CONTROL product photo byte identical')
 return true
}
verify()
const sub=(file,a,b)=>{const s=source(file).replace(/\r\n/g,'\n');assert.equal(s.split(a).length,2,'unique mutation anchor '+a);return{[file]:s.replace(a,b)}}
const mutants=[
 ['missing format hero',()=>sub(INTENT,'{formatHero && <CitationFormatHero','{false && <CitationFormatHero'),'HERO one form'],
 ['wrong cartoon example',()=>sub(DATA,'...HOME_KIDS_CARD_CLIP!','src: pumpkin.src, poster: pumpkin.poster'),'FIRST format example'],
 ['wrong animal example',()=>sub(DATA,'src: pup.src, poster: pup.poster','src: pumpkin.src, poster: pumpkin.poster'),'FIRST format example'],
 ['forced length',()=>sub(HERO,'creationIntent="trial_best"','creationIntent="trial_best" duration={45}'),'DURATION no forced length'],
 ['offer changed',()=>sub(HERO,'creationIntent="trial_best"','creationIntent="fast"'),'OFFER trial_best preserved'],
 ['handoff dropped',()=>sub(HERO,' preserveHandoffForSignedIn',''),'HANDOFF signed-in destination'],
 ['dark scope removed',()=>sub(DATA,'html[data-theme="dark"] .kpl-citation-format-2411{','html[data-theme="disabled"] .kpl-citation-format-2411{'),'THEME explicit dark scope'],
 ['old page modified',()=>sub(INTENT,": PAGINA_CLARA_CLASSE}",": PAGINA_CLARA_CLASSE + ' kpl-citation-format-2411'}"),'CONTROL old intent byte identical'],
]
for(const[name,mutate,message]of mutants){assert.throws(()=>verify(mutate()),e=>e?.code==='ERR_ASSERTION'&&(e.message===message||e.message.startsWith(message+'\n')),name+' dies at exact assertion '+message);console.log('PASS mutant '+name+' -> '+message)}
console.log('PASS actual 3 format heroes, distinct own examples, native form contract, theme scope, old text/schema/meta, 5 old intents + unchanged product ad, 8 mutants')
