// Offline embedded PostgreSQL proof. No credentials, provider calls or production connection.
// node tests/kling4TrialFallbackSql.cjs [installed-PGlite-module-path]
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite')
const root = path.resolve(__dirname, '..')
const user = '00000000-0000-4000-8000-000000000001'
const token = i => `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
async function main() {
  const db = new PGlite()
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      grant usage on schema public to service_role;
      create table public.events(id uuid primary key,name text,user_id uuid,path text,metadata jsonb);
      grant select,insert,update on public.events to service_role;`)
    for (const suffix of ['_kling4_trial_daily_budget.sql', '_kling4_trial_async_fallback.sql']) {
      const file = fs.readdirSync(path.join(root, 'supabase/migrations')).find(name => name.endsWith(suffix))
      assert.ok(file)
      await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations', file), 'utf8'))
    }
    const query = async (sql, values) => (await db.query(sql, values)).rows[0].r
    const claim = (job, index, t = token(index), original = 'kling-original') => query(
      'select public.claim_kling4_trial_fallback_scene($1,$2,$3,$4,$5) r', [job,user,original,index,t])
    const finish = (job,index,state,id=null,t=token(index)) => query(
      'select public.finish_kling4_trial_fallback_scene($1,$2,$3,$4,$5,$6,$7) r', [job,user,'kling-original',index,t,state,id])
    const finalize = job => query('select public.finalize_kling4_trial_fallback($1,$2,$3) r',[job,user,'kling-original'])
    await db.exec('set role service_role')
    const concurrent = await Promise.all(Array.from({length:12},(_,i)=>claim('one-film',i%3,token(i))))
    assert.equal(concurrent.filter(r=>r.code==='claimed').length,3,'only one paid permission per scene despite concurrent polls')
    assert.equal((await finalize('one-film')).code,'pending','live workers retain their receipt window')
    assert.equal((await claim('one-film',0,token(90),'forged-kling')).code,'unavailable')
    assert.equal((await finish('one-film',0,'accepted','seedance-0',token(90))).code,'unavailable','another token cannot replace a receipt')
    assert.equal((await finish('one-film',0,'accepted','seedance-0')).code,'ok')
    assert.equal((await finish('one-film',0,'accepted','seedance-0')).code,'unchanged')
    assert.equal((await finish('one-film',1,'rejected')).code,'ok')
    assert.equal((await finish('one-film',2,'ambiguous')).code,'ok')
    const final = await finalize('one-film')
    assert.deepEqual(final,{code:'finalized',request_ids:['seedance-0',null,null],ambiguous:true,no_accepted:false})
    assert.equal((await claim('one-film',2,token(99))).code,'finalized','no repost after ambiguity')
    assert.equal((await finish('one-film',2,'accepted','late-id')).code,'unavailable','frozen vector cannot change after composition begins')
    assert.deepEqual(await finalize('one-film'),final)
    for(let i=0;i<3;i++) await claim('dead-worker',i)
    await db.exec('reset role')
    await db.exec("update public.kling4_trial_fallback_scenes set claimed_at=now()-interval '61 seconds' where job_id='dead-worker'")
    await db.exec('set role service_role')
    assert.deepEqual(await finalize('dead-worker'),{code:'finalized',request_ids:[null,null,null],ambiguous:true,no_accepted:true})
    assert.equal((await claim('dead-worker',0,token(92))).code,'finalized','dead worker never authorizes another paid POST')
    for(let i=0;i<3;i++){await claim('all-rejected',i);await finish('all-rejected',i,'rejected')}
    assert.deepEqual(await finalize('all-rejected'),{code:'finalized',request_ids:[null,null,null],ambiguous:false,no_accepted:true})
    await query('select public.reserve_kling4_trial($1,$2,$3) r',['one-film',user,'BR'])
    await query('select public.record_kling4_trial_film($1,$2,$3,$4,$5) r',['one-film',user,'BR','kling4',2355])
    const transition = () => query('select public.transition_kling4_trial_fallback($1,$2) r',['one-film',user])
    assert.equal((await transition()).code,'ok')
    assert.equal((await transition()).code,'ok')
    await query('select public.record_kling4_trial_film($1,$2,$3,$4,$5) r',['one-film',user,'BR','kling4',2355])
    const events=(await db.query('select metadata from public.events')).rows
    assert.equal(events.length,1,'one event survives the engine transition and replay')
    assert.equal(events[0].metadata.engine_used,'seedance15_fallback')
    assert.equal(events[0].metadata.cost_usd,2.355)
    assert.equal(events[0].metadata.country,'BR')
    assert.equal((await db.query('select reserved_milliusd from public.kling4_trial_days')).rows[0].reserved_milliusd,2355,'never releases Kling budget')
    await assert.rejects(db.query('delete from public.kling4_trial_fallback_runs'),/permission denied/)
    await db.exec('reset role')
    for(const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(claim('unauthorized',0),/permission denied/)
      await assert.rejects(finalize('one-film'),/permission denied/)
      await assert.rejects(transition(),/permission denied/)
      await assert.rejects(db.query('select * from public.kling4_trial_fallback_runs'),/permission denied/)
      await db.exec('reset role')
    }
    console.log('PASS offline SQL: 3 once-only permissions, owner/original/token binding, fresh/dead workers, partial/zero acceptance, immutable fallback vector, one terminal engine event, retained cap and service-only access. PGlite serializes requests; independent PostgreSQL connections not exercised.')
  } finally {await db.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
