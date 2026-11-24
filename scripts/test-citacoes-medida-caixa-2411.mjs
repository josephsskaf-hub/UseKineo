// Offline verification of SELECT preparation and immutable receipts, not a database rerun.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {prepareCaixaQuery,internalMeasurementCte} from './prepare-citacoes-caixa-2411.mjs'
import {caixaFixtureQuery,caixaMutants} from './test-support/citacoes-caixa-fixture-2411.mjs'
const root='docs/citacoes-medida-caixa-2411/',hash=x=>createHash('sha256').update(x).digest('hex')
const fingerprints=JSON.parse(fs.readFileSync(root+'FINGERPRINTS.json','utf8'))
for(const [file,sha] of Object.entries(fingerprints))assert.equal(hash(fs.readFileSync(file)),sha,'Exact inputs and receipts used by real SELECT validation: '+file)
const template=fs.readFileSync('docs/queries/CITACOES-CAIXAS-ANTES-DEPOIS-2411.sql','utf8').replace(/^\uFEFF/,''),cut='2026-11-24T22:17:05.820285Z'
const args={template,cut,exact:['house@fixture.invalid'],patterns:['%+house@fixture.invalid']}
const query=prepareCaixaQuery(args)
assert.ok(query.includes(cut),'microseconds preserved')
assert.ok(!query.includes('house@fixture.invalid')&&!query.includes('fixture.invalid'),'no synthetic address/domain exposed by filter')
assert.ok(!query.includes(':internal_profile_ids')&&!query.includes(':observed_cut'))
assert.throws(()=>prepareCaixaQuery({...args,cut:"2026-11-24';DROP TABLE events;--"}),/ISO/)
assert.throws(()=>prepareCaixaQuery({...args,template:template+'\nDELETE FROM events;'}),/SELECT-only/)
assert.throws(()=>internalMeasurementCte([],[]),/filters required/)
assert.throws(()=>internalMeasurementCte([],['user@%.invalid']),/domain pattern/)
const targets=[...template.matchAll(/\('([^']+)','(caixa|nova)'\)/g)]
assert.equal(targets.length,11);assert.equal(new Set(targets.map(x=>x[1])).size,11);assert.equal(targets.filter(x=>x[2]==='caixa').length,7)
const proof=JSON.parse(fs.readFileSync(root+'PROVA-SINTETICA.json','utf8')),p=proof.outcome
assert.equal(p.beforeStable,true);assert.deepEqual(p.beforeTotals,{sessions:10,accounts:5,film:1});assert.equal(p.afterEarlyFilm,0);assert.equal(p.afterLaterFilm,1)
assert.equal(p.exact4.afterComplete,true)
for(const key of ['page','origin']){assert.equal(p.exact4[key].accounts,1);assert.equal(p.exact4[key].sessions,25);assert.equal(p.exact4[key].conversion_pct,4);assert.equal(p.exact4[key].gate,'nao_supera_4pct_CEO_rever_caixa')}
assert.equal(p.mutants.length,14);assert.ok(p.mutants.every(x=>x.rejected));assert.deepEqual(p.mutants.map(x=>x.name).sort(),caixaMutants(template).map(x=>x.name).sort())
const gateSql=caixaFixtureQuery(template,'2026-11-24T20:28:00Z')
assert.ok(gateSql.includes("'2026-11-24T20:28:00Z'::timestamptz observed_cut"));assert.ok(gateSql.includes("'2026-11-10T20:28:00Z'::timestamptz live_from"),'fixture only changes release anchor, not observed time')
const m=JSON.parse(fs.readFileSync(root+'MEDIDA.json','utf8')),v1=JSON.parse(fs.readFileSync(root+'BASELINE-14D.json','utf8')),v2=JSON.parse(fs.readFileSync(root+'BASELINE-14D-V2.json','utf8'))
assert.equal(m.after_complete,false);assert.equal(m.live_from,'2026-11-24T20:28:00+00:00')
for(const field of ['sessions','accounts','first_film'])assert.equal(v1.page_totals.reduce((s,x)=>s+x[field],0),v2.page_totals.reduce((s,x)=>s+x[field],0),'source reconciliation preserves totals')
assert.deepEqual({sessions:v2.page_totals.reduce((s,x)=>s+x.sessions,0),accounts:v2.page_totals.reduce((s,x)=>s+x.accounts,0),film:v2.page_totals.reduce((s,x)=>s+x.first_film,0)},{sessions:1409,accounts:13,film:3})
assert.ok(m.page_totals.filter(x=>x.phase==='depois'&&x.kind==='caixa').every(x=>x.gate==='aguardar_14_dias'))
assert.ok(m.page_totals.filter(x=>x.kind==='nova').every(x=>x.sessions===0&&x.conversion_pct===null))
assert.equal(m.rows.find(x=>x.phase==='antes'&&x.path==='/free-ai-shorts-generator'&&x.origin==='youtube').affiliate_tagged_sessions,467)
console.log('PASS offline: canonical SELECT preparation, immutable production receipts,14 rejected PostgreSQL mutants, before cut stable, exact1/25 fails gate by page and origin. No DB call.')
