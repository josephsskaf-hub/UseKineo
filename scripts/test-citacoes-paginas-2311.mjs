import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {offlineModules,React,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
const RELEASE='lib/growth/citationPagesRelease.ts',ACCESS='lib/growth/citationPagesAccess.ts',INTENT='app/ai-video-generator/for/[slug]/page.tsx',CAT='lib/seo/intentPages.ts',AD='app/ai-ugc-ads/product-photo-ads/page.tsx',MAP='app/sitemap.ts',AUTH='components/seo/InternalCitationPreview.tsx'
const PREVIEW = 'app/internal/citation-formats/[slug]/page.tsx'
const plain=({children})=>React.createElement('div',null,children)
const mocks=Object.fromEntries(['Footer','AgencyVolumeBridge','ExitIntentOffer','LocalizedScriptHandoff','StickyFreeShortCTA','Kineo1RetiredNotice','PaidSeedanceBridge','ScriptToSeedanceBridge','BuyCreatorCta','NicheHouseFilm','GeoRodada3Sections'].map(n=>[`components/${n}.tsx`,{__esModule:true,default:plain}]))
mocks['lib/analytics.ts']={trackEvent:()=>{},trackClosedEvent:()=>{},rememberSignupCampaign:()=>{}}
mocks['lib/scriptLibrary.ts']={SCRIPT_VERTICAL_SLUGS:[]}
mocks['components/OrganicCtaLink.tsx']={__esModule:true,default:({children,source,placement,...p})=>React.createElement('a',p,children)}
mocks['components/seo/PaginaClara.tsx']={PaginaClaraTopo:plain,PaginaClaraCards:plain,PaginaClaraVitrine:plain}
mocks['components/ugc/UgcCtaLink.tsx']={__esModule:true,default:({children,href})=>React.createElement('a',{href},children)}
mocks['app/claude-connector/ShowcaseGrid.tsx']={ShowcaseStrip:plain}
mocks['app/free-ai-shorts/[niche]/page.tsx']={NICHE_SLUGS:['horror','cartoon','facts','history','psychology','geography','motivation','reddit-stories']}
mocks['app/alternatives/[competitor]/page.tsx']={COMPETITOR_SLUGS:[]}
mocks['lib/publicSurfacePolicy.ts']={CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED:false}
const gh=source('lib/gptHandoff.ts'),deps={'lib/gptHandoff.ts':gh.replace("import { createHash } from 'node:crypto'","const createHash=()=>{throw Error('No hash in offline SSR')}")}
const make=(rep={},auth={data:{user:null},error:null})=>offlineModules({mocks:{...mocks,'lib/supabase/server.ts':{createClient:()=>({auth:{getUser:async()=>auth}})}},replacements:{...deps,...rep}})
const previous=Object.fromEntries([INTENT,CAT,MAP,'components/ugc/UgcPages.tsx'].map(f=>[f,execFileSync('git',['show',`4ba8c750c:${f}`],{encoding:'utf8'})]))
const old=make(previous),json=x=>JSON.parse(JSON.stringify(x)),oldMap=json(old(MAP).default()),oldSlugs=json(old(CAT).INTENT_SLUGS),oldParams=json(old(INTENT).generateStaticParams())
const render=(l,f,p={})=>renderToStaticMarkup(React.createElement(l(f).default,p)),schemas=h=>[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]))
const controls=['urdu','story-videos','faceless-videos','documentary-shorts','instagram-reels'],oldHtml=new Map(controls.map(slug=>[slug,render(old,INTENT,{params:{slug}})]))
// KINEO-CITACOES-PUBLIC-2411: o padrão agora é 'public'; a troca de estado casa qualquer valor para nunca virar no-op calado.
const release=(rep,state)=>{const t=(rep[RELEASE]??source(RELEASE)).replace(/(CITATION_PAGES_RELEASE: CitationPagesRelease = )'(?:off|internal|public)'/,`$1'${state}'`);assert.ok(t.includes(`CITATION_PAGES_RELEASE: CitationPagesRelease = '${state}'`),'RELEASE override anchor');return{...rep,[RELEASE]:t}}
// Hub UGC antes da virada (origin/main 55e4855f6): base exata para provar que public só acrescenta a âncora do anúncio pela foto.
const PILLAR='components/ugc/UgcPages.tsx',hubBefore=execFileSync('git',['show','55e4855f6:'+PILLAR],{encoding:'utf8'})
const hubAnchor=/<a href="\/ai-ugc-ads\/product-photo-ads">([\s\S]*?)<\/a>/g
const denied=async fn=>{try{await fn();return false}catch(e){if(e.message==='NEXT_NOT_FOUND')return true;throw e}}
async function verify(rep={}){
 const l=make(rep),a=l(ACCESS),house=l('lib/internalAccounts.ts').INTERNAL_EXACT_EMAILS,slugs=json(a.CITATION_DRAFT_SLUGS)
 assert.equal(a.CITATION_PAGES_RELEASE,'public','DEFAULT pages public')
 for(const email of [null,'buyer@example.com',...house]){
  const user=email?{email,email_confirmed_at:'yes'}:null
  assert.equal(a.citationPageVisible(user,'off'),false,'GATE off everyone')
  assert.equal(a.citationPageVisible(user,'public'),true,'GATE public everyone')
 }
 for(const email of house)assert.equal(a.citationPageVisible({email:' '+email.toUpperCase()+' ',email_confirmed_at:'yes'},'internal'),true,'GATE exact house')
 for(const email of ['test-customer@example.com','joseph+unknown@gmail.com','josephsskaf@gmail.com.evil.example'])assert.equal(a.citationPageVisible({email,email_confirmed_at:'yes'},'internal'),false,'GATE lookalikes denied')
 assert.equal(a.citationPageVisible({email:house[0]},'internal'),false,'GATE unconfirmed denied')
 for(const state of ['off','internal']){const closed=make(release(rep,state))
 assert.deepEqual(json(closed(CAT).INTENT_SLUGS),oldSlugs,'INDEX off exactly old slugs')
 assert.deepEqual(json(closed(INTENT).generateStaticParams()),oldParams,'STATIC off exactly old params')
 assert.deepEqual(json(closed(MAP).default()),oldMap,'SITEMAP off exactly old entries')}
 const sorted=a=>[...a].sort()
 assert.deepEqual(sorted(json(l(CAT).INTENT_SLUGS)),sorted([...oldSlugs,...slugs]),'INDEX public old slugs plus three drafts')
 assert.deepEqual(sorted(json(l(INTENT).generateStaticParams()).map(x=>x.slug)),sorted([...oldParams.map(x=>x.slug),...slugs]),'STATIC public old params plus three drafts')
 const hubBase=new Map(['en','pt'].map(lang=>[lang,renderToStaticMarkup(React.createElement(make({...rep,[PILLAR]:hubBefore})(PILLAR).UgcPillarPage,{lang}))]))
 const child=React.createElement('p',null,'Private preview')
 const user={email:house[0],email_confirmed_at:'yes'}
 assert.strictEqual(await make(rep,{data:{user},error:null})(AUTH).default({children:child}),child,'AUTH verified house allowed')
 for(const response of [{data:{user:null},error:null},{data:{user:{email:'test-customer@example.com',email_confirmed_at:'yes'}},error:null},{data:{user},error:new Error('Invalid session')},{data:{user:{email:house[0]}},error:null}])assert.equal(await denied(()=>make(rep,response)(AUTH).default({children:child})),true,'AUTH denied external invalid or unconfirmed')
 const adPath='/ai-ugc-ads/product-photo-ads',paths=[...slugs.map(s=>'/ai-video-generator/for/'+s),adPath],expectedUrls=paths.map(p=>'https://www.usekineo.com'+p)
 for(const state of ['off','internal','public']){
  const current=make(release(rep,state)),catalog=current(CAT),map=json(current(MAP).default())
  const getPreviewPath = current(RELEASE).citationFormatPreviewPath
  for (const control of [...controls, 'not-a-format', 'cartoon-videos/extra']) {
   assert.equal(getPreviewPath('/ai-video-generator/for/'+control), null, 'PREVIEW rewrites only draft slugs')
   assert.equal(await denied(()=>current(PREVIEW).default({params:{slug:control}})),true,'PREVIEW direct route denies non-drafts')
  }
  for(const slug of slugs){
   const routeProps={params:{slug}},meta=current(INTENT).generateMetadata(routeProps)
   assert.equal(getPreviewPath('/ai-video-generator/for/'+slug), state==='internal' ? '/internal/citation-formats/'+slug : null, 'PREVIEW rewrite only in internal mode')
   if(state==='internal'){
    const page=current(PREVIEW).default(routeProps)
    assert.equal(page.type,current(INTENT).default,'PREVIEW renders actual page with server boundary')
    assert.equal(page.type(page.props).type,current(AUTH).default,'PREVIEW preserves server auth')
    assert.equal(current(PREVIEW).metadata.robots.index,false,'PREVIEW noindex')
   } else assert.equal(await denied(()=>current(PREVIEW).default(routeProps)),true,'PREVIEW direct route closed outside internal')
   if(state==='off')assert.equal(await denied(()=>current(INTENT).default(routeProps)),true,'ROUTE off draft denied')
   else if(state==='internal')assert.equal(current(INTENT).default(routeProps).type,current(AUTH).default,'ROUTE internal server boundary')
   else {
    const h=render(current,INTENT,routeProps),name=current('lib/seo/citacoesRotina1711.ts').STANDARD_FILM_NAME
    assert.ok(meta.description.includes(name),'MODEL current metadata')
    assert.ok(h.includes(`${name} ·`),'MODEL current badge')
    assert.ok(schemas(h).some(x=>x['@type']==='FAQPage'),'SCHEMA new page FAQ')
    assert.ok(h.includes('animal')||h.includes('cartoon')||h.includes('animated'),'BODY direct format answer')
   }
   if(state!=='public')assert.equal(meta.robots?.index,false,'META draft noindex')
   assert.equal(catalog.INTENT_SLUGS.includes(slug),state==='public','INDEX state visibility')
  }
  if(state==='off')assert.equal(await denied(()=>current(AD).default()),true,'AD off denied')
  else if(state==='internal')assert.equal(current(AD).default().type,current(AUTH).default,'AD internal server boundary')
  else assert.ok(render(current,AD).includes('Product'),'AD public rendered')
  if(state!=='public')assert.equal(current(AD).generateMetadata().robots?.index,false,'META ad draft noindex')
  const toolUrls=json(l(RELEASE).CITATION_TOOL_DRAFT_SLUGS??[]).map(s=>'https://www.usekineo.com/ai-video-generator/for/'+s)
  assert.deepEqual(map.filter(x=>toolUrls.includes(x.url)).map(x=>x.url).sort(),[],'SITEMAP ten tool state visibility')
  if(state==='public')for(const entry of map.filter(x=>toolUrls.includes(x.url)))assert.equal(entry.lastModified,'2026-11-24T12:00:00.000Z','SITEMAP ten tool substantive date')
  const fresh=map.filter(x=>expectedUrls.includes(x.url))
  assert.deepEqual(fresh.map(x=>x.url).sort(),state==='public'?[...expectedUrls].sort():[],'SITEMAP state visibility')
  assert.deepEqual(map.filter(x=>!expectedUrls.includes(x.url)&&!toolUrls.includes(x.url)),oldMap,'SITEMAP unrelated dates intact')
  if(state==='public')for(const entry of fresh.filter(x=>!x.url.endsWith(adPath)))assert.equal(entry.lastModified,'2026-11-23T12:00:00.000Z','SITEMAP new format review date')
  if(state==='public')assert.equal(fresh.find(x=>x.url.endsWith(adPath)).lastModified,'2026-11-23','SITEMAP ad substantive date')
  for(const slug of controls)assert.equal(render(current,INTENT,{params:{slug}}),oldHtml.get(slug),'CONTROL old intent unchanged')
  for(const lang of ['en','pt']){
   const h=renderToStaticMarkup(React.createElement(current(PILLAR).UgcPillarPage,{lang})),found=[...h.matchAll(hubAnchor)]
   if(state!=='public'){assert.equal(h,hubBase.get(lang),'HUB link only in public');continue}
   assert.equal(found.length,1,'HUB link present in public')
   assert.equal(found[0][1].replace(/<!-- -->/g,''),(lang==='pt'?'Anúncio pela foto do produto':'Product photo ads')+' →','HUB label in hub language')
   assert.equal(h.replace(found[0][0],''),hubBase.get(lang),'HUB only the anchor added')
  }
 }
 const publicLoader=make(release(rep,'public')),facts=publicLoader('lib/growth/paginaFotoProduto2311.ts').fotoProdutoFacts(),billing=publicLoader('lib/ads/v2Tiers.ts'),html=render(publicLoader,AD),tiers=['starter','basic','pro'],pricing=publicLoader('lib/marketingPrice.ts')
 for(const level of facts.levels){assert.equal(level.credits15,billing.adsV2Credits(level.id,15),'COST ad agrees with billing');for(const row of level.credits)assert.equal(row.credits,billing.adsV2Credits(level.id,row.seconds),'COST duration agrees with billing')}
 facts.plans.forEach((plan,i)=>{assert.equal(plan.credits,publicLoader('lib/checkoutPricing.ts').TIER_CREDITS[tiers[i]],'COST plan source');plan.perLevel.forEach((item,j)=>{assert.equal(item.ads,Math.floor(plan.credits/facts.levels[j].credits15),'COST count from canonical credits');assert.equal(item.usd,pricing.formatUsd(pricing.planCreditSpendUsd(tiers[i],facts.levels[j].credits15)),'COST per-ad canonical');if(item.ads>0)assert.ok(html.includes(item.usd),'COST visible canonical price')})})
}
await verify()
const sub=(f,a,b)=>{const s=source(f);assert.equal(s.split(a).length,2,'mutation anchor '+a);return{[f]:s.replace(a,b)}}
const mutants=[
 ['default back to internal',()=>sub(RELEASE,"CITATION_PAGES_RELEASE: CitationPagesRelease = 'public'","CITATION_PAGES_RELEASE: CitationPagesRelease = 'internal'"),'DEFAULT pages public'],
 ['default back to off',()=>sub(RELEASE,"CITATION_PAGES_RELEASE: CitationPagesRelease = 'public'","CITATION_PAGES_RELEASE: CitationPagesRelease = 'off'"),'DEFAULT pages public'],
 ['catalog drops drafts in public',()=>sub(CAT,"!isCitationDraftSlug(p.slug) || citationReleaseForSlug(p.slug) === 'public'","!isCitationDraftSlug(p.slug)"),'INDEX public old slugs plus three drafts'],
 ['hub link leaks in internal',()=>sub(PILLAR,"CITATION_PAGES_RELEASE === 'public' ? [...related,","CITATION_PAGES_RELEASE !== 'off' ? [...related,"),'HUB link only in public'],
 ['hub link leaks in off',()=>sub(PILLAR,"CITATION_PAGES_RELEASE === 'public' ? [...related,","true ? [...related,"),'HUB link only in public'],
 ['hub link missing in public',()=>sub(PILLAR,"CITATION_PAGES_RELEASE === 'public' ? [...related,","false ? [...related,"),'HUB link present in public'],
 ['hub label wrong language',()=>sub(PILLAR,"label: pt ? 'Anúncio pela foto do produto' : 'Product photo ads'","label: 'Product photo ads'"),'HUB label in hub language'],
 ['hub changes other text',()=>sub(PILLAR,"<Related heading={c.relatedHeading} links={CITATION_PAGES_RELEASE","<Related heading={c.relatedHeading + (CITATION_PAGES_RELEASE === 'public' ? ' ' : '')} links={CITATION_PAGES_RELEASE"),'HUB only the anchor added'],
 ['rewrite in off',()=>sub(RELEASE,"if (citationReleaseForSlug(slug) !== 'internal') return null",'if (false) return null'),'PREVIEW rewrite only in internal mode'],
 ['preview bypass state',()=>sub(PREVIEW,"citationReleaseForSlug(params.slug) !== 'internal' || !isCitationDraftSlug(params.slug)",'!isCitationDraftSlug(params.slug)'),'PREVIEW direct route closed outside internal'],
 ['off bypass',()=>sub(ACCESS,"release === 'public'","release === 'off' || release === 'public'"),'GATE off everyone'],
 ['internal broad patterns',()=>({[ACCESS]:source(ACCESS).replaceAll('contaDaCasaExata','isInternalEmail')}),'GATE lookalikes denied'],
 ['unconfirmed allowed',()=>sub(ACCESS,'!!user?.email_confirmed_at && contaDaCasaExata(user.email)','contaDaCasaExata(user?.email)'),'GATE unconfirmed denied'],
 ['catalog leaks drafts',()=>sub(CAT,"!isCitationDraftSlug(p.slug) || citationReleaseForSlug(p.slug) === 'public'",'true'),'INDEX off exactly old slugs'],
 ['static params leak draft',()=>sub(INTENT,'return INTENT_SLUGS.map','return [...INTENT_SLUGS, "cartoon-videos"].map'),'STATIC off exactly old params'],
 ['sitemap exposes ad while off',()=>sub(MAP,"CITATION_PAGES_RELEASE === 'public' ? [{ url: `${BASE}${FOTO_PRODUTO_PATH}`","true ? [{ url: `${BASE}${FOTO_PRODUTO_PATH}`"),'SITEMAP off exactly old entries'],
 ['auth error ignored',()=>sub(AUTH,'if (!error) user = data.user','user = data.user'),'AUTH denied external invalid or unconfirmed'],
 ['draft metadata indexable',()=>sub(INTENT,'{ robots: { index: false, follow: false } }','{ robots: { index: true, follow: false } }'),'META draft noindex'],
 ['ad route opens off',()=>sub(AD,"if (CITATION_PAGES_RELEASE === 'off') notFound()",'if (false) notFound()'),'AD off denied'],
 ['ad cost drift',()=>sub('lib/growth/paginaFotoProduto2311.ts','credits15: adsV2Credits(id, 15),','credits15: adsV2Credits(id, 15) + 1,'),'COST ad agrees with billing'],
 ['badge old engine',()=>sub(INTENT,"const offerName = story ? STORY_VIDEO_ENGINE : p.slug === 'urdu' || batchPage || DRAWING_INTENTS_2311.has(p.slug) ? STANDARD_FILM_NAME : ENGINE_NAME[p.engine]","const offerName = story ? STORY_VIDEO_ENGINE : p.slug === 'urdu' || batchPage ? STANDARD_FILM_NAME : ENGINE_NAME[p.engine]"),'MODEL current badge'],
]
for(const [name,mutate,message]of mutants){await assert.rejects(()=>verify(mutate()),e=>e?.code==='ERR_ASSERTION'&&e.name==='AssertionError'&&(e.message===message||e.message.startsWith(message+'\n')),name+' fails at exact assertion '+message);console.log('PASS mutant '+name+' -> '+message)}
console.log('PASS real route/metadata/catalog/sitemap/SSR + server getUser boundary; four new pages, three states, five old controls and canonical billing; '+mutants.length+' exact-assertion mutants. Offline, no account/movie/spend.')
