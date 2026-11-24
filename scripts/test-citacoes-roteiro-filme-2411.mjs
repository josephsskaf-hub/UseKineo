import assert from 'node:assert/strict'
import fs from 'node:fs'
import {citationFilmBaseline} from './test-support/citacoes-crescimento-referencias-2411.mjs'
import {createRequire} from 'node:module'
import {offlineModules,React,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
const ts=createRequire(import.meta.url)('typescript')
const CLIENT='app/free-script-generator/FreeScriptClient.tsx',PAGE='app/free-script-generator/page.tsx',PROVIDER='components/seo/CitationFilmExperiment.tsx',RELEASE='lib/growth/citationFilmRelease.ts',FORM='app/text-to-video-shorts/TextToVideoIntentForm.tsx',PROOF='components/seo/CitationFilmProof.tsx'
const old=Object.fromEntries([PAGE,CLIENT,FORM].map(f=>[f,citationFilmBaseline(f)]))
const plain=({children})=>React.createElement('div',null,children)
const mocks={'lib/analytics.ts':{trackEvent(){},trackClosedEvent(){},rememberSignupCampaign(){}},'components/StickyFreeShortCTA.tsx':{__esModule:true,default:plain},'components/Footer.tsx':{__esModule:true,default:plain},'components/ExitIntentOffer.tsx':{__esModule:true,default:plain}}
const dep={'lib/gptHandoff.ts':source('lib/gptHandoff.ts').replace("import { createHash } from 'node:crypto'","const createHash=()=>{throw Error('No hash in this proof')}")}
const make=(rep={})=>offlineModules({mocks,replacements:{...dep,...rep}})
const set=(rep,value)=>({...rep,[RELEASE]:(rep[RELEASE]??source(RELEASE)).replace("CITATION_FILM_RELEASE: CitationFilmRelease = 'off'","CITATION_FILM_RELEASE: CitationFilmRelease = '"+value+"'")})
const render=(l,f,props={})=>renderToStaticMarkup(React.createElement(l(f).default,props))
const view=(l,props)=>renderToStaticMarkup(React.createElement(l(PROVIDER).default,null,React.createElement(l(PROVIDER).CitationFilmDraftScope,null,React.createElement(l(CLIENT).default,props))))
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'")
const sample='The lighthouse keeper found three keys.\nOnly the smallest key opened the door.'
function body(code,name){const sf=ts.createSourceFile('fixture.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;const visit=n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n.body.getText(sf).replace(/\r\n/g,'\n');ts.forEachChild(n,visit)};visit(sf);assert.ok(found,'function exists');return found}
let checks=0
function verify(rep={}){
 const l=make(rep),base=make(old)
 assert.equal(body(rep[CLIENT]??source(CLIENT),'generate'),body(old[CLIENT],'generate'),'FREE writer request and handling unchanged')
 assert.equal(render(l,PAGE),render(base,PAGE),'OFF script page exact')
 assert.equal(render(make(set(rep,'internal')),PAGE),render(base,PAGE),'INTERNAL script page exact')
 for(const props of [{initialTopic:sample},{initialTopic:sample,fromPublicVideo:true,sourceVideoId:'11111111-1111-4111-8111-111111111111'},{initialTopic:sample,fromWebShareTarget:true}]){
  assert.equal(view(l,props),render(base,CLIENT,props),'OFF tool and prefill exact')
  const pub=make(set(rep,'public')),h=view(pub,props)
  assert.equal((h.match(/<textarea\b/g)||[]).length,1,'ONE script input')
  if(props.fromPublicVideo||props.fromWebShareTarget){assert.equal(h,renderToStaticMarkup(React.createElement(pub(PROVIDER).default,null,React.createElement(base(CLIENT).default,props))),'SHARE approved tool exact');continue}
  assert.ok(h.includes('Generate my script →'),'FREE writer remains available')
  for(const mode of ['idea','finished_script']){
   const r=set(rep,'public');r[FORM]=(r[FORM]??source(FORM)).replace("useState<TextToVideoInputMode>('idea')","useState<TextToVideoInputMode>('"+mode+"')")
   const loader=make(r),html=view(loader,props)
   const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(m=>decode(m[1]))
   const target=hrefs.map(v=>new URL(v,'https://www.usekineo.com')).find(u=>u.searchParams.get('intent_campaign')==='push22_script_generator'&&u.searchParams.has('redirect'))
   assert.ok(target,'FILM native link exists')
   assert.equal(target.searchParams.get('prompt'),sample,'FILM exact input')
   assert.equal(target.searchParams.get('script_mode'),mode==='idea'?'ai':'verbatim','FILM mode')
   for(const key of ['utm_source','utm_medium','utm_campaign','duration'])assert.equal(target.searchParams.has(key),false,'FILM no invented origin or duration')
   assert.equal(target.pathname,'/api/citations/film-entry','ENTRY script uses actual server route')
   const after=loader('lib/growth/ideiaPousaNoStudio.ts').destinoDaIdeia(target.searchParams.get('redirect'))
   const studio=new URL(after,'https://www.usekineo.com')
   assert.equal(studio.pathname,'/studio','AUTH actual landing rule to Studio')
   assert.equal(studio.searchParams.get('prompt'),sample,'AUTH exact text to editable Studio')
   assert.equal(studio.searchParams.get('script_mode'),target.searchParams.get('script_mode'),'AUTH mode to Studio')
   assert.equal(studio.searchParams.has('create_intent'),false,'AUTH no autostart')
  }
  checks++
 }
 const evidence=render(l,PROOF,{comparison:true,children:React.createElement('span',null,'form fixture')})
 const example=l('lib/publicExamples.ts').PUBLIC_EXAMPLES.find(x=>x.slug==='turkmenistan-door-to-hell')
 assert.ok(evidence.includes('src="'+example.videoPath+'"'),'PROOF existing owned video')
 assert.ok(evidence.includes('dateTime="2026-11-24"')||evidence.includes('datetime="2026-11-24"'),'PROOF dated review')
 assert.ok(evidence.includes('Comparison method:'),'PROOF explicit comparison method')
}
verify()
const sub=(f,a,b)=>{const s=source(f).replace(/\r\n/g,'\n');assert.equal(s.split(a).length,2,'unique mutant');return{[f]:s.replace(a,b)}}
for(const[name,mutate,message]of[
 ['writer altered',()=>sub(CLIENT,"fetch('/api/demo-script'","fetch('/api/fixture-wrong'"),'FREE writer request and handling unchanged'],
 ['writer hidden',()=>sub(CLIENT,"'Generate my script →'","'Removed writer'"),'OFF script page exact'],
 ['share paths diverted',()=>sub(CLIENT,'&& !fromPublicVideo && !fromWebShareTarget && !affiliateContext','&& !affiliateContext'),'SHARE approved tool exact'],
 ['mode lost',()=>sub(CLIENT,"script_mode: scriptMode, redirect","script_mode: 'ai', redirect"),'FILM mode'],
 ['example removed',()=>sub(PROOF,'src={example.videoPath}','src=""'),'PROOF existing owned video'],
]){
 assert.throws(()=>verify(mutate()),e=>e?.code==='ERR_ASSERTION'&&e.message.startsWith(message),name+' exact assertion');console.log('PASS mutant '+name+' -> '+message)
}
console.log('PASS actual free script tool preserved, one input, two film modes, share paths exact, real auth destination rule and dated own example/method; 5 exact mutants; no network/account/render')
