import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {offlineModules,React,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
const plain=({children})=>React.createElement('div',null,children)
const mocks=Object.fromEntries(['Footer','AgencyVolumeBridge','ExitIntentOffer','LocalizedScriptHandoff','StickyFreeShortCTA','Kineo1RetiredNotice','PaidSeedanceBridge','ScriptToSeedanceBridge','BuyCreatorCta','NicheHouseFilm','GeoRodada3Sections'].map(n=>[`components/${n}.tsx`,{__esModule:true,default:plain}]))
mocks['components/OrganicCtaLink.tsx']={__esModule:true,default:({children,source,placement,...props})=>React.createElement('a',props,children)}
mocks['components/seo/PaginaClara.tsx']={PaginaClaraTopo:plain,PaginaClaraCards:plain,PaginaClaraVitrine:plain}
for(const f of ['app/youtube-shorts-from-topic/TopicGeneratorForm.tsx','app/text-to-video-shorts/TextToVideoIntentForm.tsx'])mocks[f]={__esModule:true,default:plain}
// Catalog links only; database/cache layer is outside this offline render. Real Next photos include it.
mocks['lib/scriptLibrary.ts']={SCRIPT_VERTICAL_SLUGS:[]}
const cryptoImport="import { createHash } from 'node:crypto'",handoff=source('lib/gptHandoff.ts')
assert.ok(handoff.includes(cryptoImport),'offline boundary must stay explicit')
const dependencies={'lib/gptHandoff.ts':handoff.replace(cryptoImport,"const createHash = () => { throw new Error('Unexpected hashing during render') }")}
const files=['app/gerador-de-shorts-gratis/page.tsx','app/text-to-video-shorts/page.tsx','app/ai-video-generator/for/[slug]/page.tsx','app/generador-de-shorts-gratis/page.tsx','components/CitableHubShell.tsx','app/faceless-youtube-shorts-generator/page.tsx','components/Lote1Landing.tsx','app/free-ai-shorts/[niche]/page.tsx','app/vs/invideo-alternatives-faceless-shorts/page.tsx','lib/seo/paginasCitadas0511.ts']
const base=Object.fromEntries(files.map(f=>[f,execFileSync('git',['show',`f9e8e26bc:${f}`],{encoding:'utf8'})]))
const oldLoad=offlineModules({mocks,replacements:{...dependencies,...base}}),load=offlineModules({mocks,replacements:dependencies}),d=load('lib/seo/buyerQuestions2111.ts')
const pages=[['pt',files[0],{}],['script',files[1],{}],['doc',files[2],{slug:'documentary-shorts'}],['faceless',files[2],{slug:'faceless-videos'}],['story',files[2],{slug:'story-videos'}],['es',files[3],{}],['cost',files[5],{}],['terrorEs','app/generador-de-videos-de-terror/page.tsx',{}],['horror',files[7],{niche:'horror'}],['invideo',files[8],{}]]
const normalize=(s,key)=>['doc','faceless'].includes(key)?s.replaceAll('Seedance 1.5',load('lib/seo/citacoesRotina1711.ts').STANDARD_FILM_NAME):s
const text=s=>s.replace(/<[^>]+>/g,'').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()
for(const [key,file,params]of pages){
 const before=renderToStaticMarkup(await oldLoad(file).default({params})),after=renderToStaticMarkup(await load(file).default({params})),p=d.buyerBatch2(key)
 const first=after.slice(after.indexOf('</h1>')).match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1]
 assert.equal(text(first),p.answer,key+' first paragraph answers the buyer')
 for(const paragraph of before.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g))assert.ok((after.includes(paragraph[0]) || after.includes(normalize(paragraph[0],key))),key+' previous paragraph retained: '+text(paragraph[1]).slice(0,100))
 for(const table of before.matchAll(/<table\b[\s\S]*?<\/table>/g))assert.ok(after.includes(table[0]),key+' every previous table retained')
 const schemas=[...after.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])),faqs=schemas.filter(s=>s['@type']==='FAQPage')
 assert.equal(faqs.length,1,key+' one FAQPage')
 const visible=after.replace(/<script[\s\S]*?<\/script>/g,'')
 for(const f of p.faqs){assert.ok(text(visible).includes(f.q),key+' literal visible FAQ');assert.ok(faqs[0].mainEntity.some(q=>q.name===f.q&&q.acceptedAnswer.text===f.a),key+' FAQ schema matches visible answer')}
 assert.ok(schemas.some(s=>s['@type']==='WebPage'&&s.dateModified===d.BUYER_BATCH2_DATE&&s.url.endsWith(p.path)),key+' dated page node')
 assert.ok(after.includes('data-bq-details')&&after.includes('<caption>')&&after.includes('scope="col"'),key+' accessible comparison')
 for(const link of p.links)assert.ok(after.includes(`href="${link.href}"`),key+' internal link')
}
for(const [file,params]of[[files[2],{slug:'urdu'}],[files[7],{niche:'animals'}],['app/ai-shorts-generator-no-watermark/page.tsx',{}]])assert.equal(renderToStaticMarkup(await load(file).default({params})),renderToStaticMarkup(await oldLoad(file).default({params})),'non-target unchanged '+file)
const bill=load('lib/checkoutPricing.ts'),credits=load('lib/credits/engineCost.ts'),cost=d.buyerBatch2('cost')
assert.ok(cost.answer.includes(String(credits.creditCostForDuration('cinematic_ai',true,60))))
assert.ok(cost.answer.includes(bill.formatCheckoutMoney('usd',bill.TIER_PRICES.starter.usd)))
const stamp=load('lib/seo/paginasCitadas0511.ts').carimbaPaginasCitadas0511
for(const path of d.BUYER_BATCH2_PATHS){assert.equal(stamp([{url:'https://www.usekineo.com'+path,lastModified:'2026-11-01'}])[0].lastModified,'2026-11-21T12:00:00.000Z');assert.equal(stamp([{url:'https://www.usekineo.com'+path,lastModified:'2026-12-01'}])[0].lastModified,'2026-12-01')}
assert.equal(stamp([{url:'https://www.usekineo.com/pricing',lastModified:'2026-11-01'}])[0].lastModified,'2026-11-01')
console.log('PASS ten live SSR pages; 20 buyer questions; all previous paragraphs/tables; one visible FAQPage; three unchanged controls; billing source and selective dates')
