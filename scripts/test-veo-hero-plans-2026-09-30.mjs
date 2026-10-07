import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {existsSync} from 'node:fs' // KINEO-S25-ABRE-2026-10-06
import {engineFixture} from './gpt24h-engine-fixture.mjs'
import {offlineModules,renderToStaticMarkup,source} from './gpt24h-offline-support.mjs'
// KINEO-MOTORES-GEO-2026-10-06 — reancorado com motivo: a camada citável da TAREFA 12 (2 blocos novos + 6 textos) é
// descontada dos DOIS lados pela normalização única; o caminho de compra do Veo e o resto seguem travados.
import {semMotoresGeoHtml} from './test-support/motores-geo-2026-10-06.mjs'
import {edicoesIndiceHtml,semIndiceHtml} from './test-support/indice-video-ia-2026-10-06.mjs' // KINEO-INDICE-VIDEO-IA-2026-10-06
const file='app/ai-video-generator/[engine]/page.tsx',base=execFileSync('git',['show','7dbd47c1:'+file],{encoding:'utf8'})
const mutant=process.argv.includes('--mutant')
const before=engineFixture({[file]:base}),after=engineFixture(mutant?{'components/SeedanceHeroActions.tsx':source('components/SeedanceHeroActions.tsx').replace('href="/pricing"','href="/signup"')}:{})
const hero=html=>html.match(/<section\b[\s\S]*?<\/section>/)?.[0]
const actions=/<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:22px">[\s\S]*?<\/div>/
let count=0
// KINEO-S25-ABRE-2026-10-06 — reancorado com motivo: o Seedance 2.5 volta ao catálogo com ROTA PRÓPRIA
// (app/ai-video-generator/seedance-2-5/page.tsx) e o [engine] deixou de gerá-lo no generateStaticParams. A trava vale para
// os slugs que ESTA página serve; só o slug do 2.5 pode sair dela, e só com a rota própria no lugar. Na base, servidos = todos.
const allSlugs=after('lib/growth/enginePageCatalog.ts').ENGINE_SLUGS,served=(await after(file).generateStaticParams()).map(p=>p.engine),leftEngine=allSlugs.filter(s=>!served.includes(s))
assert.ok(leftEngine.every(s=>s==='seedance-2-5')&&(leftEngine.length===0||existsSync(new URL('../app/ai-video-generator/seedance-2-5/page.tsx',import.meta.url))),'only the Seedance 2.5 slug left [engine], to its own route: '+leftEngine);count++
for(const engine of served){
 // KINEO-INDICE-VIDEO-IA-2026-10-06 — reancorado com motivo: o HTML atual desconta SÓ o link discreto "Real cost and render
 // time" (/ai-video-index; scripts/test-support/indice-video-ia-2026-10-06.mjs), exigido uma vez por página.
 const renderAtual=renderToStaticMarkup(await after(file).default({params:{engine}}))
 assert.equal(edicoesIndiceHtml(renderAtual),1,engine+': index link exactly once (the normalization has a subject)');count++
 const old=semMotoresGeoHtml(renderToStaticMarkup(await before(file).default({params:{engine}}))),html=semMotoresGeoHtml(semIndiceHtml(renderAtual))
 if(engine!=='veo'){
  // A mutated shared component affects Seedance as well; the mutant below
  // is evaluated against the Veo purchase path, not an incidental sibling.
  if(!mutant)assert.equal(html,old,engine+': entire page preserved');count++
 }else{
  assert.ok(hero(old)&&hero(html));count++
  assert.equal(html.replace(hero(html),''),old.replace(hero(old),''),'Veo content outside hero preserved');count++
  assert.equal(hero(html).replace(actions,''),hero(old).replace(actions,''),'Veo title, proof budget, intro and trial note preserved');count++
  const links=[...hero(html).matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  assert.equal(links[0][1],'/pricing','Veo purchase path points to plans');count++
  assert.equal(links[0][2],'See plans &amp; credits →');count++
  const expected='/signup?intent_campaign=seo_engine_veo&amp;redirect=%2Fstudio%3Fengine%3Dveo%26intent_campaign%3Dseo_engine_veo'
  assert.equal(links[1][1],expected,'signup preserves engine and intent');count++
  assert.equal(links[1][2],'Create your account');count++
  assert.ok(hero(old).includes(`href="${expected}"`));count++
 }
 assert.equal(JSON.stringify(after(file).generateMetadata({params:{engine}})),JSON.stringify(before(file).generateMetadata({params:{engine}})),'all canonical metadata preserved');count++
}
const events=[],load=offlineModules({mocks:{'lib/analytics.ts':{trackEvent:(...args)=>events.push(args)}}})
const signupHref=load('lib/growth/engineLandingIntent.ts').buildEngineLandingSignupHref({engine:'veo',campaign:'seo_engine_veo'})
const row=load('components/SeedanceHeroActions.tsx').default({signupHref,campaign:'seo_engine_veo'})
for(const action of row.props.children){const link=action.type(action.props);let prevented=false;link.props.onClick({preventDefault(){prevented=true}});assert.equal(prevented,false);assert.ok(!link.props.href.includes('utm_'));count+=2}
assert.deepEqual(JSON.parse(JSON.stringify(events)),[
 ['organic_cta_clicked',{source:'seo_engine_veo',placement:'hero',destination:'/pricing'}],
 ['organic_cta_clicked',{source:'seo_engine_veo',placement:'hero_account',destination:'/signup'}]
]);count++
console.log(`PASS ${count} Veo purchase-path checks; actual full pages, preserved sibling engines/metadata, native clicks and existing attribution; no network/payment`)
