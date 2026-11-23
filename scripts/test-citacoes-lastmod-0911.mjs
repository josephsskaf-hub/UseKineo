import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { offlineModules } from './gpt24h-offline-support.mjs';
// Keep testing the actual sitemap expression; load its new pure dependencies rather than copying values.
const load = offlineModules();
const draftDates = load('lib/growth/citationPagesAccess.ts');
const { intentPagePath } = load('lib/seo/intentPages.ts');
const source=fs.readFileSync('app/sitemap.ts','utf8').replace(/\r\n/g,'\n');
const match=source.match(/lastModified: r\.path === '\/pricing' \? new Date\('([^']+)'\)[\s\S]*?r\.path === '\/ai-video-generator\/kling-4' \? new Date\('([^']+)'\)/);
assert.ok(match,'os dois carimbos publicados estão no mapeamento real');
const start=source.indexOf('lastModified: r.path ===');
const end=source.indexOf(',\n    changeFrequency:',start);
const expression=source.slice(start+'lastModified: '.length,end);
const run=(path,expr=expression)=>vm.runInNewContext(expr,{...draftDates,intentPagePath,r:{path},Date,ADS_DOOR_LAST_MODIFIED:'ads-unchanged',geoRodada2Revised:new Set(),geoRodada3Revised:new Set(),engineGeoRevised:new Set(),STATE_STUDY_PATH:'/state-of-ai-shorts-2026',STATE_STUDY_LAST_MODIFIED:'state-unchanged',LAST_MODIFIED:'fallback-unchanged'});
assert.equal(new Date(run('/pricing')).toISOString(),'2026-11-06T18:40:25.000Z');
assert.equal(new Date(run('/ai-video-generator/kling-4')).toISOString(),'2026-11-02T15:25:13.000Z');
assert.equal(run('/ads'),'ads-unchanged');
assert.equal(run('/state-of-ai-shorts-2026'),'state-unchanged');
for(const p of ['/','/ai-video-generator/seedance','/text-to-video-shorts','/free-ai-shorts/horror','/ai-video-generator/for/urdu','/gerador-de-shorts-gratis']) assert.equal(run(p),'fallback-unchanged',p+' preserva o ramo anterior e carimbo externo');
for(const mutation of [expression.replace(match[1],'2026-10-23T12:00:00.000Z'),expression.replace(match[2],'2026-10-23T12:00:00.000Z')]) {let failed=false;try {assert.equal(new Date(run('/pricing',mutation)).toISOString(),match[1]);assert.equal(new Date(run('/ai-video-generator/kling-4',mutation)).toISOString(),match[2]);}catch{failed=true} assert.ok(failed,'mutante com data velha rejeitado')}
for (const slug of draftDates.CITATION_DRAFT_SLUGS) assert.equal(new Date(run(intentPagePath(slug))).toISOString(), '2026-11-23T12:00:00.000Z', 'only unpublished formats receive their review date');
console.log('PASS: datas publicadas, destinos intactos e dois mutantes de data velha rejeitados');
