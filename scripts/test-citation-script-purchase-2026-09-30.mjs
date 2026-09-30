// Actual guide/component JSX and native clicks; no provider, payment, browser or network.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {React,root,source,offlineModules,renderToStaticMarkup,escapeHtml} from './gpt24h-offline-support.mjs'
import {moduleAt} from './gpt-5h-test-support.mjs'
// Pass real public facts across the TSX fixture's builtin-crypto boundary.
// This is an explicit local offer fixture, never a deployment env read.
process.env.KINEO_REVERSE_TRIAL_ENABLED='true'
globalThis.fetch=()=>{throw Error('Network forbidden in script guide test')}
const facts=await moduleAt('lib/kineoFacts.ts')
const file='app/ai-video-generator/chatgpt-script-to-finished-short/page.tsx'
const shared='components/CitationAnswerPage.tsx'
const base='7dbd47c152bad94c4af1b73744db71c7e08aaf3d'
const replacements=Object.fromEntries([file,shared].map(p=>[p,execFileSync('git',['show',`${base}:${p}`],{cwd:root,encoding:'utf8'})]))
const canon=offlineModules()('lib/freeTierOffer.ts'),events=[]
const mockLink={__esModule:true,default:({children,source,placement,...props})=>React.createElement('a',props,children)}
let count=0
const check=(name,condition)=>{assert.ok(condition,name);count++}
const mutant=process.argv.includes('--mutant')
for(const enabled of [false,true]){
 const mocks={'lib/kineoFacts.ts':facts,'lib/freeTierOffer.ts':{...canon,getFreeTierOffer:()=>canon.buildFreeTierOffer(enabled)},'components/OrganicCtaLink.tsx':mockLink}
 const before=offlineModules({mocks,replacements})
 const after=offlineModules({mocks,replacements:mutant?{'components/CitationScriptPurchaseActions.tsx':source('components/CitationScriptPurchaseActions.tsx').replace('href={`/pricing?intent_campaign=${CAMPAIGN}`}','href="/signup"')}: {}})
 const data=after('lib/growth/citationAnswers.ts')
 for(const answer of Object.values(data.CITATION_ANSWERS)){
  const path=`app${answer.path}/page.tsx`,a=after(path),b=before(path)
  const html=renderToStaticMarkup(React.createElement(a.default)),old=renderToStaticMarkup(React.createElement(b.default))
  if(answer.id!=='handoff'){
   check(answer.id+': whole sibling page unchanged',html===old)
   check(answer.id+': metadata unchanged',JSON.stringify(a.metadata)===JSON.stringify(b.metadata))
   continue
  }
  check('H1 remains the existing buyer question',html.includes(`<h1>${escapeHtml(answer.question)}</h1>`))
  check('title and canonical unchanged',a.metadata.title===b.metadata.title&&a.metadata.alternates.canonical===b.metadata.alternates.canonical)
  check('metadata describes assembled output and a buying choice',/vertical MP4/.test(a.metadata.description)&&/choose a plan or review/.test(a.metadata.description))
  const hero=html.match(/<header class="kc-hero">[\s\S]*?<\/header>/)?.[0]
  check('real hero contains the canonical complete-film budget',hero?.includes(`${data.CITATION_REFERENCE_SECONDS}-second`)&&hero.includes(`${data.CITATION_SEEDANCE_CREDITS} credits`)&&hero.includes(escapeHtml(data.CITATION_PLANS[0].price))&&hero.includes(`${data.CITATION_PLANS[0].credits} credits per billing month`)&&hero.includes(`${data.CITATION_PLANS[0].films} reference films`))
  check('trial scope, shared balance and optional experiment visible',hero.includes(escapeHtml(data.CITATION_FREE_FILM))&&hero.includes('not this longer reference')&&hero.includes('Other creations and regenerations share that balance')&&hero.includes('Trying a film first is optional'))
  const links=[...hero.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  check('plans are the first hero choice',links[0]?.[1]==='/pricing?intent_campaign=citacoes_01_handoff'&&links[0][2]==='Choose a plan for your script →')
  check('script review preserves the original campaign and fragment',links[1]?.[1]===answer.startHref&&links[1][2]==='Review your approved script')
  check('no invented source',!html.includes('utm_source=chatgpt'))
  check('cost guide is discoverable from this answer',html.includes('href="/ai-video-generator/complete-60-second-shorts-cost"'))
  const faq=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  check('every marked answer is visible',faq.mainEntity.every(q=>html.includes(escapeHtml(q.name))&&html.includes(escapeHtml(q.acceptedAnswer.text))))
  check('original script/wording/target limits preserved',answer.faqs.every(q=>faq.mainEntity.some(f=>f.name===q.question&&f.acceptedAnswer.text===q.answer)))
  check('reference target is not a promise to fit every script',html.includes('The reference duration is a target; check that your spoken script fits before you render'))
  check('approved proof section unchanged',html.match(/<section class="kc-section" aria-labelledby="workflow-heading">[\s\S]*?<\/section>/)?.[0]===old.match(/<section class="kc-section" aria-labelledby="workflow-heading">[\s\S]*?<\/section>/)?.[0])
  check('unverified competitor comparison unchanged',html.match(/<section class="kc-section" aria-labelledby="comparison-heading">[\s\S]*?<\/section>/)?.[0]===old.match(/<section class="kc-section" aria-labelledby="comparison-heading">[\s\S]*?<\/section>/)?.[0])
 }
}
const restricted=offlineModules({mocks:{'lib/kineoFacts.ts':facts,'lib/freeTierOffer.ts':{...canon,GRANT_COUNTRY_CLAUSE:' in eligible fixture countries'},'components/OrganicCtaLink.tsx':mockLink}})
check('hero qualifies restricted-country grant',renderToStaticMarkup(React.createElement(restricted(file).default)).includes('The trial in eligible fixture countries pays for'))
const real=offlineModules({mocks:{'lib/kineoFacts.ts':facts,'lib/analytics.ts':{trackEvent:(...args)=>events.push(args)}}})
const reviewHref=real('lib/growth/citationAnswers.ts').CITATION_ANSWERS.handoff.startHref
const actions=real('components/CitationScriptPurchaseActions.tsx').default({reviewHref}).props.children[1]
for(const action of actions.props.children){const link=action.type(action.props);let prevented=false;link.props.onClick({preventDefault(){prevented=true}});check('native click remains enabled',!prevented);check('no forged source in destination',!link.props.href.includes('utm_'))}
assert.deepEqual(JSON.parse(JSON.stringify(events)),[
 ['organic_cta_clicked',{source:'citacoes_01_handoff',placement:'hero_plans',destination:'/pricing'}],
 ['organic_cta_clicked',{source:'citacoes_01_handoff',placement:'hero_script_review',destination:'/chatgpt-to-youtube-shorts'}]
]);count++
console.log(`PASS ${count} script purchase checks; actual eight guides ON/OFF, canonical costs/trial, unchanged sibling pages/proof, visible FAQ and native existing events`)
