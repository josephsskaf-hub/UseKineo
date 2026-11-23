import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {offlineModules,React,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
const PAGE='app/free-ai-shorts/[niche]/page.tsx',MAP='app/sitemap.ts',DATA='lib/seo/paginasLote1.ts',PATHS='lib/seo/paginasLote1Paths.ts'
const plain=({children})=>React.createElement('div',null,children)
const mocks=Object.fromEntries(['Footer','AgencyVolumeBridge','ExitIntentOffer','StickyFreeShortCTA','Kineo1RetiredNotice','PaidSeedanceBridge','ScriptToSeedanceBridge','BuyCreatorCta','NicheHouseFilm','GeoRodada3Sections'].map(n=>[`components/${n}.tsx`,{__esModule:true,default:plain}]))
mocks['lib/scriptLibrary.ts']={SCRIPT_VERTICAL_SLUGS:[]}
mocks['components/OrganicCtaLink.tsx']={__esModule:true,default:({children,source,placement,...props})=>React.createElement('a',props,children)}
mocks['components/seo/PaginaClara.tsx']={PaginaClaraTopo:plain,PaginaClaraCards:plain,PaginaClaraVitrine:plain}
mocks['app/youtube-shorts-from-topic/TopicGeneratorForm.tsx']={__esModule:true,default:plain}
const cryptoImport="import { createHash } from 'node:crypto'",handoff=source('lib/gptHandoff.ts')
assert.ok(handoff.includes(cryptoImport))
const dependencies={'lib/gptHandoff.ts':handoff.replace(cryptoImport,"const createHash = () => { throw new Error('Unexpected hashing during SSR proof') }")}
const baseline=Object.fromEntries([PAGE,MAP,DATA,PATHS].map(f=>[f,execFileSync('git',['show',`b2c24e671:${f}`],{encoding:'utf8'})]))
const make=rep=>offlineModules({mocks,replacements:{...dependencies,...rep}})
const old=make(baseline),oldHtml=renderToStaticMarkup(old(PAGE).default({params:{niche:'cartoon'}}))
const clean=s=>s.replace(/<[^>]+>/g,'').replace(/&#(?:x([a-f\d]+)|(\d+));/ig,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()
const paragraphs=h=>[...h.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(x=>clean(x[1]))
const tables=h=>[...h.matchAll(/<table\b[\s\S]*?<\/table>/g)].map(x=>clean(x[0]))
function sitemap(rep={}){const l=make(rep),mapMocks={...mocks,'app/free-ai-shorts/[niche]/page.tsx':{NICHE_SLUGS:l(PAGE).NICHE_SLUGS},'app/alternatives/[competitor]/page.tsx':{COMPETITOR_SLUGS:[]},'lib/publicSurfacePolicy.ts':{CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED:false}};return JSON.parse(JSON.stringify(offlineModules({mocks:mapMocks,replacements:{...dependencies,...rep}})(MAP).default()))}
const oldMap=sitemap(baseline)
function verify(rep={}){
 const l=make(rep),d=l(DATA).LOTE1_NICHES.cartoon.answer,html=renderToStaticMarkup(l(PAGE).default({params:{niche:'cartoon'}})),visible=html.replace(/<script[\s\S]*?<\/script>/g,'')
 assert.equal(d.reviewedIso,'2026-11-22','real answer review day')
 assert.equal(d.reviewed,'November 22, 2026','human date agrees with ISO')
 assert.match(visible,/<time datetime="2026-11-22">November 22, 2026<\/time>/i,'machine date visible in reviewed label')
 assert.ok(clean(visible).includes(d.q)&&clean(visible).includes(d.a),'answer is visible without client JavaScript')
 assert.deepEqual(paragraphs(html),paragraphs(oldHtml),'every previous paragraph retained')
 assert.deepEqual(tables(html),tables(oldHtml),'every previous table retained')
 const map=sitemap(rep),url='https://www.usekineo.com/free-ai-shorts/cartoon'
 assert.equal(map.filter(x=>x.url===url).length,1,'one canonical cartoon entry')
 assert.equal(map.find(x=>x.url===url).lastModified,'2026-11-22T12:00:00.000Z','cartoon carries its review date')
 assert.deepEqual(map.filter(x=>x.url!==url),oldMap.filter(x=>x.url!==url),'no other URL or timestamp changed')
}
verify()
const sub=(file,from,to)=>{const s=source(file).replace(/\r\n/g,'\n');assert.equal(s.split(from).length,2,'exact mutation anchor');return{[file]:s.replace(from,to)}}
const mutants=[
 ['old answer review day',()=>sub(PATHS,"CARTOON_ANSWER_REVIEWED_ISO = '2026-11-22'","CARTOON_ANSWER_REVIEWED_ISO = '2026-10-12'")],
 ['stale cartoon sitemap',()=>sub(MAP,'e.url === `${BASE}/free-ai-shorts/cartoon` ? new Date(`${CARTOON_ANSWER_REVIEWED_ISO}T12:00:00.000Z`) : LOTE1_LAST_MODIFIED','LOTE1_LAST_MODIFIED')],
 ['all niche dates refreshed',()=>sub(MAP,'T12:00:00.000Z`) : LOTE1_LAST_MODIFIED','T12:00:00.000Z`) : new Date(`${CARTOON_ANSWER_REVIEWED_ISO}T12:00:00.000Z`)')],
 ['machine date removed',()=>sub(PAGE,'<time dateTime={lote1.answer.reviewedIso}>{lote1.answer.reviewed}</time>','<span>{lote1.answer.reviewed}</span>')],
 ['answer removed',()=>sub(PAGE,'{lote1.answer.a}</p>','</p>')],
]
for(const [name,makeMutant]of mutants){const rep=makeMutant();assert.throws(()=>verify(rep),undefined,name+' must fail')}
console.log('PASS cartoon: visible ISO/text date, content/table retention, selective sitemap; '+mutants.length+' mutations rejected. Real contrast is checked in the browser proof.')
