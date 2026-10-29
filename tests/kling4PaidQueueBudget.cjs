// Local PostgreSQL WASM only; no credentials, network, provider generation or production database.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite')

async function main() {
  const db = new PGlite()
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role;')
    await db.exec(fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20261029030428_kling4_paid_queue_slots.sql'), 'utf8'))
    const user = '00000000-0000-4000-8000-000000000001'
    const token = '00000000-0000-4000-8000-000000000002'
    const another = '00000000-0000-4000-8000-000000000003'
    const claim = async (job, phase, index, t = token) => (await db.query('select public.claim_kling4_paid_scene($1,$2,$3,$4,$5) as r', [user,job,phase,index,t])).rows[0].r
    const finish = async (job, phase, index, state, id, model, t = token) => (await db.query('select public.finish_kling4_paid_scene($1,$2,$3,$4,$5,$6,$7,$8) as r', [user,job,phase,index,t,state,id,model])).rows[0].r
    const read = async (job, phase, count) => (await db.query('select public.read_kling4_paid_scenes($1,$2,$3,$4) as r', [user,job,phase,count])).rows[0].r
    const model = 'kling/v4/text-to-video'
    const seedance = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
    assert.equal((await claim('paid-film-test1','kling4',0)).code, 'claimed')
    assert.equal((await claim('paid-film-test1','kling4',0,another)).code, 'existing')
    assert.equal((await finish('paid-film-test1','kling4',0,'accepted','one',model,another)).code, 'not_owner')
    assert.equal((await finish('paid-film-test1','kling4',0,'accepted','one',model)).code, 'ok')
    assert.equal((await finish('paid-film-test1','kling4',0,'accepted','one',model)).code, 'unchanged')
    assert.equal((await finish('paid-film-test1','kling4',0,'accepted','other',model)).code, 'frozen')
    assert.equal((await read('paid-film-test1','kling4',1)).code, 'finalized')
    assert.equal((await read('paid-film-test1','kling4',2)).code, 'pending')
    assert.equal((await claim('paid-film-test1','fallback',0)).code, 'claimed', 'fallback owns a separate ledger phase')
    assert.equal((await finish('paid-film-test1','fallback',0,'accepted','backup',model)).code, 'invalid')
    assert.equal((await finish('paid-film-test1','fallback',0,'accepted','backup',seedance)).code, 'ok')
    for (const index of [1,2]) {
      await claim('paid-film-test1','fallback',index)
      await finish('paid-film-test1','fallback',index,'rejected',null,seedance)
    }
    assert.deepEqual((await read('paid-film-test1','fallback',3)).request_ids, ['backup',null,null])
    assert.equal((await claim('paid-film-test1','kling4',4)).code, 'invalid')
    assert.equal((await claim('paid-film-test1','fallback',12)).code, 'invalid')
    assert.equal((await read('paid-film-test1','fallback',4)).code, 'invalid')
    assert.equal((await claim('bad','kling4',0)).code, 'invalid')
    await claim('paid-film-stale','kling4',0)
    assert.equal((await read('paid-film-stale','kling4',1)).code, 'pending')
    await db.exec("update public.kling4_paid_queue_slots set claimed_at=now()-interval '61 seconds' where job_id='paid-film-stale'")
    const expired = await read('paid-film-stale','kling4',1)
    assert.deepEqual(expired.states, ['ambiguous'])
    assert.equal((await claim('paid-film-stale','kling4',0,another)).code, 'existing', 'expired uncertain POST is never reclaimable')
    assert.equal((await finish('paid-film-stale','kling4',0,'accepted','late',model)).code, 'frozen')
    const security = (await db.query("select relrowsecurity from pg_class where oid='public.kling4_paid_queue_slots'::regclass")).rows[0]
    assert.equal(security.relrowsecurity, true)
    for (const role of ['anon','authenticated']) {
      assert.equal((await db.query("select has_table_privilege($1,'public.kling4_paid_queue_slots','insert') as allowed", [role])).rows[0].allowed, false)
      assert.equal((await db.query("select has_function_privilege($1,'public.claim_kling4_paid_scene(uuid,text,text,integer,uuid)','execute') as allowed", [role])).rows[0].allowed, false)
    }
    console.log('Kling4 paid queue PostgreSQL guards passed: immutable receipts, owner tokens, ambiguous freeze, phase limits, RLS and grants.')
  } finally { await db.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
