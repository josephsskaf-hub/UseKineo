import assert from 'node:assert/strict'
import {renderBuyerProof2011} from './test-support/citacoes2011-render.mjs'
import {offlineModules} from './gpt24h-offline-support.mjs'
const load=offlineModules(),data=load('lib/seo/buyerAnswers2011.ts'),cost=load('lib/credits/engineCost.ts'),bill=load('lib/checkoutPricing.ts')
// KINEO-CITACOES-PUBLIC-2411: a prova de 20/11 mede o layout do comprador com a caixa de filme em 'off'; a caixa (agora 'public')
// sobe para o topo e empurra a resposta para logo depois dela — conferido abaixo que a resposta continua inteira, uma vez.
const html=await renderBuyerProof2011({filmRelease:'off'}) // current modules, no artifact writes
const live=await renderBuyerProof2011()
for(const id of ['pt','urdu','h3','cost','script','text']){
 const answer=html['after-'+id].match(/<p\b[^>]*data-buyer-answer[^>]*>[\s\S]*?<\/p>/)?.[0]
 if(answer)assert.equal(live['after-'+id].split(answer).length,2,'PUBLIC film box keeps the buyer answer exactly once ('+id+')')
 else assert.equal(live['after-'+id],html['after-'+id],'PUBLIC film box leaves pages without buyer answer unchanged ('+id+')')
}
for(const [id,kind] of [['pt','portuguese'],['urdu','urdu'],['h3','h3'],['cost','cost'],['script','script'],['text','text']]){
 const before=html['before-'+id],after=html['after-'+id],p=data.BUYER_2011[kind]
 assert.ok(after.indexOf('data-buyer-answer')>after.indexOf('<h1'))
 assert.match(after.slice(after.indexOf('</h1>')).match(/<p\b[^>]*>/)?.[0] ?? '', ['pt','text'].includes(id) ? /data-bq-lead/ : /data-buyer-answer/, 'the FIRST paragraph is the answer')
 const old=before.slice(before.indexOf('</h1>')).match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1]
 assert.ok(old && (after.includes(old) || after.includes(data.currentFilmLabel2011(old))),'previous cited paragraph remains')
 for(const table of before.matchAll(/<table\b[\s\S]*?<\/table>/g)) assert.ok(after.includes(table[0]) || after.includes(data.currentFilmLabel2011(table[0])),'every previous table remains intact')
 assert.ok(after.includes('data-buyer-decision')&&after.includes('<caption>')&&after.includes('scope="col"'))
 const schemas=[...after.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]))
 const faq=schemas.find(s=>s['@type']==='FAQPage')
 assert.equal(schemas.filter(s=>s['@type']==='FAQPage').length,1,'one FAQPage')
 assert.ok(faq.mainEntity.some(q=>q.name===p.q&&q.acceptedAnswer.text===p.answer),'literal FAQ is structured and visible')
 assert.ok(after.replace(/<script[\s\S]*?<\/script>/g,'').includes(p.q),'literal question is visible outside JSON-LD')
 assert.ok(schemas.some(s=>s['@type']==='WebPage'&&s.dateModified===(p.reviewed ?? '2026-11-20')))
 assert.ok((after.match(/<table/g)||[]).length>(before.match(/<table/g)||[]).length,'existing tables retained plus comparator')
}
assert.ok(data.BUYER_2011.h3.answer.includes(String(cost.creditCostForDuration('cinematic_ai',true,60))))
assert.ok(data.BUYER_2011.h3.answer.includes(bill.formatCheckoutMoney('usd',bill.TIER_PRICES.starter.usd)))
const stamp=load('lib/seo/paginasCitadas0511.ts').carimbaPaginasCitadas0511
const paths=['/gerador-de-shorts-gratis','/ai-video-generator/for/urdu','/ai-video-generator/seedance','/best-ai-shorts-generators','/chatgpt','/text-to-video-shorts','/free-ai-shorts/horror','/pricing','/']
const output=stamp(paths.map(p=>({url:'https://www.usekineo.com'+p,lastModified:'2026-11-18T12:00:00.000Z'})))
assert.ok(output.slice(0,3).every((x,i)=>x.lastModified.startsWith(i===0?'2026-11-21':'2026-11-20')))
assert.ok(output.slice(3,6).every(x=>x.lastModified.startsWith('2026-11-21')))
assert.ok(output.slice(6).every((x,i)=>x.lastModified.startsWith(i===0?'2026-11-21':'2026-11-18')),'no fake freshness for other pages')
console.log('PASS 6 pages: direct answer, preserved copy/tables, literal FAQ/schema, billing source, selective dates')
