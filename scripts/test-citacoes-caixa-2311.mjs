const RELEASE='lib/growth/citationIdeaRelease.ts'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {offlineModules,React,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
const BEST='app/best-ai-shorts-generators/page.tsx',PAY='app/how-much-do-youtube-shorts-pay/page.tsx'
const FORM='app/text-to-video-shorts/TextToVideoIntentForm.tsx',TOPIC='app/youtube-shorts-from-topic/TopicGeneratorForm.tsx'
const BOX='components/seo/CitationIdeaForm.tsx',ACCESS='lib/growth/citationIdeaAccess.ts'
const plain=({children})=>React.createElement('div',null,children)
const mocks=Object.fromEntries(['Footer','AgencyVolumeBridge','ExitIntentOffer','LocalizedScriptHandoff','StickyFreeShortCTA','Kineo1RetiredNotice','PaidSeedanceBridge','ScriptToSeedanceBridge','BuyCreatorCta','NicheHouseFilm'].map(n=>[`components/${n}.tsx`,{__esModule:true,default:plain}]))
mocks['lib/analytics.ts']={trackEvent:()=>{},trackClosedEvent:()=>{},rememberSignupCampaign:()=>{}}
mocks['lib/supabase/client.ts']={createClient:()=>{throw Error('SSR must not request auth')}}
mocks['lib/scriptLibrary.ts']={SCRIPT_VERTICAL_SLUGS:[]}
mocks['components/OrganicCtaLink.tsx']={__esModule:true,default:({children,source,placement,...p})=>React.createElement('a',p,children)}
mocks['components/seo/PaginaClara.tsx']={PaginaClaraTopo:plain,PaginaClaraCards:plain,PaginaClaraVitrine:plain}
const crypto="import { createHash } from 'node:crypto'",gh=source('lib/gptHandoff.ts');assert.ok(gh.includes(crypto))
const deps={'lib/gptHandoff.ts':gh.replace(crypto,"const createHash=()=>{throw Error('Hash outside SSR boundary')}")}
// KINEO-CITACOES-PUBLIC-2411: esta prova é da caixa de ideia (CITATION_IDEA_RELEASE). A caixa de filme virou 'public' e tem a
// própria prova de HTML exato (test-citacoes-filme-2411); aqui ela fica fixada em 'off' para isolar a variável medida.
const FILM_RELEASE='lib/growth/citationFilmRelease.ts',filmOff=(()=>{const t=source(FILM_RELEASE).replace(/(CITATION_FILM_RELEASE: CitationFilmRelease = )'(?:off|internal|public)'/,"$1'off'");assert.ok(t.includes("CITATION_FILM_RELEASE: CitationFilmRelease = 'off'"),'FILM pin anchor');return t})()
const EDITOR='lib/create/publicEditorRelease.ts'
const make=rep=>offlineModules({mocks,replacements:{...deps,[FILM_RELEASE]:filmOff,[EDITOR]:'export const PUBLIC_CREATE_EDITORS = false',...rep}})
const originals=Object.fromEntries([BEST,PAY,FORM].map(f=>[f,execFileSync('git',['show',`91bc3083a:${f}`],{encoding:'utf8'})]))
const old=make(originals),render=(l,f,p={})=>renderToStaticMarkup(React.createElement(l(f).default,p))
const oldPages=new Map([BEST,PAY].map(f=>[f,render(old,f)]))
const schemas=h=>[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]))
const tags=(h,t)=>[...h.matchAll(new RegExp(`<${t}\\b[\\s\\S]*?<\\/${t}>`,'g'))].map(x=>x[0])
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'")
const hidden=h=>new URLSearchParams([...h.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"/g)].map(x=>[decode(x[1]),decode(x[2])]))
const form=(h,key)=>{const start=h.indexOf(`id="citation-idea-${key}-2311"`);assert.ok(start>=0,'BOX form id');return h.slice(start).match(/<form\b[\s\S]*?<\/form>/)?.[0]??''}
const setRelease=(rep,release)=>({...rep,[RELEASE]:(rep[RELEASE]??source(RELEASE)).replace("CITATION_IDEA_RELEASE: CitationIdeaRelease = 'off'",`CITATION_IDEA_RELEASE: CitationIdeaRelease = '${release}'`)})
const withUser=(rep,user)=>({...rep,[BOX]:(rep[BOX]??source(BOX)).replace('useState<VerifiedUser | null>(null)',`useState<VerifiedUser | null>(${JSON.stringify(user)})`)})
const sample='The brass owl counted three lanterns. At dawn, only the smallest one was glowing.'
function verify(rep={}){
 const l=make(rep),gate=l(ACCESS),house=l('lib/internalAccounts.ts').INTERNAL_EXACT_EMAILS
 assert.equal(gate.CITATION_IDEA_RELEASE,'off','DEFAULT switch off')
 for(const email of [null,'buyer@example.com',...house]){
  const u=email?{email,email_confirmed_at:'2026-11-23'}:null
  assert.equal(gate.citationIdeaVisible(u,'off'),false,'GATE off denies everyone')
  assert.equal(gate.citationIdeaVisible(u,'public'),true,'GATE public allows everyone')
 }
 for(const email of house){assert.equal(gate.citationIdeaVisible({email:' '+email.toUpperCase()+' ',email_confirmed_at:'yes'},'internal'),true,'GATE exact house allowed')}
 for(const email of [null,'buyer@example.com','joseph+unknown@gmail.com','test-customer@example.com','josephsskaf@gmail.com.evil.example','josephsskaf+new@gmail.com']){
  assert.equal(gate.citationIdeaVisible({email,email_confirmed_at:'yes'},'internal'),false,'GATE internal rejects lookalikes')
 }
 assert.equal(gate.citationIdeaVisible({email:house[0]},'internal'),false,'GATE unconfirmed rejected')
 for(const [f,key]of[[BEST,'best'],[PAY,'pay']]){
  const b=oldPages.get(f),off=render(l,f)
  assert.equal(off,b,'OFF original HTML exact')
  assert.equal(render(make(setRelease(rep,'internal')),f),b,'INTERNAL visitor original HTML exact')
  const pub=make(setRelease(rep,'public')),h=render(pub,f)
  assert.equal((h.match(/data-kineo="citation-idea-2311"/g)||[]).length,1,'BOX exactly one new form')
  for(const t of ['p','table'])for(const block of tags(b,t))assert.ok(h.includes(block),'CONTENT previous '+t+' intact')
  assert.deepEqual(schemas(h),schemas(b),'SCHEMA unchanged')
  assert.deepEqual(JSON.parse(JSON.stringify(pub(f).metadata)),JSON.parse(JSON.stringify(old(f).metadata)),'META unchanged')
  assert.ok(h.indexOf('data-kineo="citation-idea-2311"')>h.indexOf('</p>',h.indexOf('</h1>')),'POSITION first answer before form')
  if(key==='pay')assert.ok(h.indexOf('data-kineo="citation-idea-2311"')<h.indexOf('No figure on this page'),'POSITION immediately after answer')
  assert.equal(hidden(form(h,key)).get('intent_campaign'),`citation_idea_${key}_2311`,'CAMPAIGN page-specific')
  assert.ok(h.includes(key==='best'?'roundup-start-a-short':'payout-start-a-short'),'LOWER original form kept')
  // SSR with a supplied verified user exercises real component conditional, not a mock of it.
  const internal=setRelease(rep,'internal')
  assert.equal(render(make(withUser(internal,{email:house[0],email_confirmed_at:'yes'})),f),b,'INTERNAL identity alone waits for server')
  assert.equal(render(make(withUser(internal,{email:'test-buyer@example.com',email_confirmed_at:'yes'})),f),b,'INTERNAL metrics pattern never grants access')
 }
 assert.equal(render(l,FORM,{formId:'reference'}),render(old,FORM,{formId:'reference'}),'REFERENCE defaults exact')
 for(const key of ['best','pay'])for(const mode of ['idea','finished_script']){
  const r=setRelease(rep,'public');r[FORM]=(rep[FORM]??source(FORM)).replace("useState<TextToVideoInputMode>('idea')",`useState<TextToVideoInputMode>('${mode}')`)
  r[TOPIC]=(rep[TOPIC]??source(TOPIC)).replace("useState('')",`useState(${JSON.stringify(sample)})`)
  const input=make(r),params=hidden(form(render(input,key==='best'?BEST:PAY),key)),target=new URL(params.get('redirect'),'https://www.usekineo.com')
  assert.equal(target.pathname,'/studio/create','HANDOFF signed-in destination')
  assert.equal(target.searchParams.get('prompt'),sample,'HANDOFF exact prompt')
  assert.equal(target.searchParams.get('intent_campaign'),`citation_idea_${key}_2311`,'HANDOFF campaign')
  assert.equal(params.get('script_mode'),mode==='idea'?'ai':'verbatim','MODE selected mode')
  assert.equal(params.get('duration'),mode==='idea'?'45':'35','DURATION mode duration')
  for(const k of ['utm_source','utm_medium','utm_campaign'])assert.equal(params.has(k),false,'ORIGIN no fake UTM')
  const dest=new URLSearchParams();input('lib/creationHandoff.ts').carryCreationHandoff(new URLSearchParams({...Object.fromEntries(params),prompt:sample}),dest)
  const contract=input('lib/creationHandoff.ts').resolveActivationCreationContract(dest)
  assert.equal(contract.prompt,sample,'CONTRACT exact prompt');assert.equal(contract.scriptMode,params.get('script_mode'),'CONTRACT mode')
 }
}
verify()
function verifyPublicEditor(rep={}){
 for(const key of ['best','pay']) for(const mode of ['idea','finished_script']){
  const r=setRelease({...rep,[EDITOR]:'export const PUBLIC_CREATE_EDITORS = true'},'public')
  r[FORM]=(rep[FORM]??source(FORM)).replace("useState<TextToVideoInputMode>('idea')",`useState<TextToVideoInputMode>('${mode}')`)
  r[TOPIC]=(rep[TOPIC]??source(TOPIC)).replace("useState('')",`useState(${JSON.stringify(sample)})`)
  const body=form(render(make(r),key==='best'?BEST:PAY),key),params=hidden(body)
  assert.match(body,/action="\/create\/film"/,'PUBLIC direct Film editor')
  assert.match(body,new RegExp('<textarea[^>]*name="prompt"[^>]*>'+sample.replaceAll('.','\\.')+'</textarea>'),'PUBLIC prompt editable and exact')
  assert.equal(params.has('redirect'),false,'PUBLIC no second signup')
  assert.equal(params.get('intent_campaign'),`citation_idea_${key}_2311`,'PUBLIC campaign')
  assert.equal(params.get('script_mode'),mode==='idea'?'ai':'verbatim','PUBLIC chosen mode')
  assert.equal(params.get('duration'),mode==='idea'?'45':'35','PUBLIC selected duration')
  for(const k of ['utm_source','utm_medium','utm_campaign'])assert.equal(params.has(k),false,'PUBLIC no fake referral')
 }
}
verifyPublicEditor()
const sub=(f,a,b)=>{const s=source(f);assert.equal(s.split(a).length,2,'mutation anchor '+a);return{[f]:s.replace(a,b)}}
const lostDoor=sub(TOPIC,"publicEditor ? '/create/film' : '/signup'","publicEditor ? '/signup' : '/signup'")
assert.throws(()=>verifyPublicEditor(lostDoor),e=>e?.code==='ERR_ASSERTION'&&e.message.startsWith('PUBLIC direct Film editor'),'public form actually catches lost editor')
const mutants=[
 ['default public',()=>sub(RELEASE,"CITATION_IDEA_RELEASE: CitationIdeaRelease = 'off'","CITATION_IDEA_RELEASE: CitationIdeaRelease = 'public'"),'DEFAULT switch off'],
 ['off bypass',()=>sub(ACCESS,"release === 'public'","release === 'off' || release === 'public'"),'GATE off denies everyone'],
 ['public denied',()=>sub(ACCESS,"release === 'public'","false"),'GATE public allows everyone'],
 ['pattern-based internal',()=>({[ACCESS]:source(ACCESS).replaceAll('contaDaCasaExata','isInternalEmail')}),'GATE internal rejects lookalikes'],
 ['confirmation removed',()=>sub(ACCESS,'!!user?.email_confirmed_at && contaDaCasaExata(user.email)','contaDaCasaExata(user?.email)'),'GATE unconfirmed rejected'],
 ['box removed',()=>sub(BOX,'data-kineo="citation-idea-2311"','data-kineo="removed"'),'BOX exactly one new form'],
 ['wrong campaign',()=>sub(BOX,'campaign={`citation_idea_${article}_2311`}','campaign="wrong"'),'CAMPAIGN page-specific'],
 ['signed-in prompt dropped',()=>sub(BOX,' preserveHandoffForSignedIn />',' />'),'HANDOFF signed-in destination'],
 ['fake organic',()=>sub(FORM,'placement={placement}','placement={placement} utmSource="organic"'),'REFERENCE defaults exact'],
 ['script mode lost',()=>sub(FORM,'scriptMode={selected.scriptMode}','scriptMode="ai"'),'MODE selected mode'],
 ['schema question removed',()=>sub(PAY,'mainEntity: FAQ.map','mainEntity: FAQ.slice(1).map'),'OFF original HTML exact'],
 ['old lower form removed',()=>sub(BEST,'formId="roundup-start-a-short"','formId="removed-old-form"'),'OFF original HTML exact'],
]
for(const [name,mutate,message]of mutants){
 const rep=mutate();assert.throws(()=>verify(rep),e=>e?.code==='ERR_ASSERTION' && e.name==='AssertionError' && e.message.startsWith(message+'\n'),name+' must fail at exact assertion '+message)
 console.log('PASS mutant '+name+' -> '+message)
}
console.log('PASS actual SSR off/internal/public, exact house list, old HTML/schema/table receipts, both modes, nested editable handoff; '+mutants.length+' exact-assertion mutants. No network/account/movie.')
