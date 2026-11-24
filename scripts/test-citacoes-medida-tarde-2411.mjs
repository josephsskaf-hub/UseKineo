import assert from 'node:assert/strict'
import fs from 'node:fs'
import {prepareCitationQuery,internalMeasurementCte} from './citacoes-medida-tarde-2411.mjs'
const exact=['synthetic-owner@example.invalid'],patterns=['synthetic+%@example.invalid','test%']
for(const [kind,file]of Object.entries({thirty:'ORIGEM-PAGINA-30D.sql',weekly:'SEMANAL.sql',experiment:'ANTES-DEPOIS.sql'})){
 const template=fs.readFileSync('docs/citacoes-tarde-2411/'+file,'utf8')
 const sql=prepareCitationQuery({kind,template,cut:'2026-11-24T16:01:33Z',liveFrom:kind==='experiment'?'2026-11-21T00:00:00Z':undefined,exact,patterns})
 assert.ok(sql.startsWith('WITH '));assert.ok(!sql.includes('synthetic-owner@example.invalid')&&!sql.includes('synthetic+%@example.invalid'),'No raw canonical addresses')
 assert.ok(!/:internal_profile_ids|:observed_cut|:live_from/.test(sql),'No unbound parameters')
 assert.ok(sql.includes("v.quality_mode IN ('cinematic_ai'"),'Film classes exclude clip and ads')
 assert.ok(sql.includes("e.metadata->>'dodo_mode'='live'"),'Real Dodo alongside verified Stripe')
 assert.ok(sql.includes("'/:id'"),'Dynamic private paths aggregated')
 if(kind==='experiment')for(const clause of ['e.created_at<r.phase_cut','p.created_at<l.phase_cut','v.created_at<a.phase_cut','e.created_at<a.phase_cut'])assert.ok(sql.includes(clause),'Independent phase boundary '+clause)
}
assert.throws(()=>internalMeasurementCte([],[]),/required/)
assert.throws(()=>prepareCitationQuery({kind:'experiment',template:'WITH a AS(SELECT 1)',cut:"2026-11-24'; DROP TABLE x;",exact,patterns}),/valid ISO/)
assert.throws(()=>prepareCitationQuery({kind:'unknown',template:'',cut:'2026-11-24T00:00:00Z',exact,patterns}),/Unknown/)
assert.throws(()=>prepareCitationQuery({kind:'weekly',template:'WITH a AS(SELECT 1) DELETE FROM x',cut:'2026-11-24T00:00:00Z',exact,patterns}),/SELECT-only/)
const proof=JSON.parse(fs.readFileSync('docs/citacoes-tarde-2411/PROVA-FRONTEIRA.json','utf8'))
assert.equal(proof.beforeStable,true);assert.equal(proof.mutants.length,5);assert.ok(proof.mutants.every(x=>x.rejected))
console.log('PASS offline query preparation: canonical exclusion without raw addresses, three windows, strict ISO, no writes, private path normalization, clipped phase clocks; executed PostgreSQL receipt retained separately')
