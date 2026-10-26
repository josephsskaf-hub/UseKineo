// KINEO-AMOSTRA-ANUNCIO-2410 — executes the NEW migration in embedded PostgreSQL; no env, credential or network.
// node scripts/test-support/ads-amostra-data-sql-2410.cjs <installed-PGlite-module-path> [migration-file] [--mutants]
const fs = require('node:fs'), assert = require('node:assert/strict');
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
const migration = process.argv[3] || 'supabase/migrations/20261024175246_ads_escolha_sample.sql';
const uuid = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const plan = { cena:{plan:{escolha:{sample:'KINEO-AMOSTRA-ANUNCIO-2410'}}} }, lease='2026-10-24T03:00:00Z';
(async()=>{
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create table public.ads_v2_orders(id uuid primary key,user_id uuid,status text,assembly_lease_at timestamptz,plan jsonb,video_id uuid,credits_charged integer,billing_ref text);
create table public.events(id uuid primary key default gen_random_uuid(),name text,user_id uuid,path text,metadata jsonb,created_at timestamptz default now());
grant usage on schema public to service_role;grant select,insert,update on public.ads_v2_orders,public.events to service_role;
alter default privileges in schema public grant all on tables to service_role;`);
await db.exec(fs.readFileSync(migration,'utf8'));
const q = async(sql,args=[]) => (await db.query(sql,args)).rows;
const scalar = async(sql,args=[]) => Object.values((await q(sql,args))[0])[0];
const add = async(n,actor=uuid(n+100),p=plan) => { await q('insert into ads_v2_orders(id,user_id,status,assembly_lease_at,plan) values($1,$2,$3,$4,$5)',[uuid(n),actor,'planned',lease,p]);return actor; };
const asService = () => db.exec('set role service_role'), reset = () => db.exec('reset role');
const reserve = async(n,actor=uuid(n+100),owner=actor,l=lease,internal=false) => scalar('select public.reserve_ads_escolha_sample($1,$2,$3,$4,$5)',[uuid(n),actor,owner,l,internal]);
for(const table of ['ads_escolha_sample_days','ads_escolha_samples','ads_escolha_sample_alerts']) {
 for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) assert.equal(await scalar('select has_table_privilege($1,$2,$3)',['service_role','public.'+table,privilege]),['SELECT','INSERT','UPDATE'].includes(privilege),'inherited default ACL reset: '+table+' '+privilege);
 await asService();await assert.rejects(q('delete from public.'+table+' where false'),/permission denied/);await reset();
}
for(let n=1;n<=12;n++) await add(n);
await asService();
// Promise pressure hits the actual atomic SQL function; PGlite serializes engine access, not independent live connections.
const claims = await Promise.all(Array.from({length:7},(_,i)=>reserve(i+1).catch(()=>({code:'database_exception'}))));
assert.equal(claims.filter(r=>r.code==='ok').length,6,'150c reservation admits exactly six under1000c');
assert.equal(claims[6].code,'ads_sample_cap');
assert.equal((await reserve(1)).replay,true);
assert.equal(await scalar('select reserved_cents from ads_escolha_sample_days'),900);
await reset();await add(20,uuid(101));await asService();
assert.equal((await reserve(20,uuid(101))).code,'ads_sample_used','another order cannot reuse a person');
assert.equal((await reserve(8,uuid(108),uuid(109))).code,'ads_sample_unavailable','personal owner required');
assert.equal((await reserve(8,uuid(108),uuid(108),'2026-10-24T03:00:01Z')).code,'ads_sample_unavailable','lease required');
await reset();await add(21,uuid(121),{});await asService();
assert.equal((await reserve(21,uuid(121))).code,'ads_sample_unavailable','server plan sample marker required');
await reset();await q('delete from ads_v2_orders where id=$1',[uuid(6)]);await add(22,uuid(106));await asService();
assert.equal((await reserve(22,uuid(106))).code,'ads_sample_used','deleting order never refunds lifetime claim');
assert.equal(await scalar('select reserved_cents from ads_escolha_sample_days'),900,'deleting order never refunds our cost');
await reset();await db.exec("update ads_escolha_sample_days set request_day=request_day-1");await asService();
assert.equal((await reserve(7)).code,'ok','UTC new day has a distinct counter');
assert.equal((await reserve(8,uuid(108),uuid(108),lease,true)).code,'ok','internal can test but does consume allowance');
assert.equal(await scalar("select count(*)::int from events where name='ads_sample_started'"),7,'internal sample absent from people events');
const deliver = async(n, credits=0) => q("update ads_v2_orders set status='delivered',video_id=$2,credits_charged=$3,billing_ref='adssample-escolha-fixture' where id=$1",[uuid(n),uuid(n+1000),credits]);
await deliver(1);await deliver(1);await deliver(2);await deliver(3,41);await deliver(8);
assert.equal(await scalar("select count(*)::int from events where name='ads_sample_delivered'"),2,'real delivered transition once; paid or internal excluded');
assert.equal(await scalar('select delivered_at is null from ads_escolha_samples where actor_id=$1',[uuid(103)]),true);
const mark = async(n,kind) => scalar(`select public.mark_ads_escolha_sample_${kind}($1,$2,$2)`,[uuid(n),uuid(n+100)]);
assert.equal((await mark(1,'delivered')).code,'unchanged');
assert.equal((await mark(4,'upsell')).code,'unchanged','cannot upsell an undelivered sample');
await mark(1,'upsell');await mark(1,'upsell');
assert.equal(await scalar("select count(*)::int from events where name='ads_sample_upsell_clicked'"),1);
// Make a genuine observation window in fixture time; signed Stripe event time governs even when delivery/webhook race.
await reset();await db.exec("update ads_escolha_samples set delivered_at=now()-interval '2 days' where delivered_at is not null");await asService();
const paidAt = new Date().toISOString();let eventNo=2000;
const pay = async(actor,changes={}) => {const id=uuid(++eventNo);await q('insert into events(id,name,user_id,path,metadata) values($1,$2,$3,$4,$5)',[id,'payment_success',actor,'/api/stripe/webhook',{source:'stripe_webhook',stripe_livemode:true,stripe_payment_status:'paid',stripe_paid_at:paidAt,stripe_session_id:'cs_fixture_'+eventNo,amount_total:990,currency:'usd',...changes}]);return id;};
for(const changes of [ {source:'client'}, {stripe_livemode:false}, {stripe_livemode:null}, {stripe_payment_status:'unpaid'}, {amount_total:0}, {amount_total:'bad'}, {stripe_paid_at:'bad'}, {stripe_paid_at:new Date(Date.now()-3*864e5).toISOString()}, {stripe_paid_at:new Date(Date.now()+6*864e5).toISOString()}, {stripe_session_id:''}]) await pay(uuid(102),changes);
assert.equal(await scalar('select purchased_at is null from ads_escolha_samples where actor_id=$1',[uuid(102)]),true,'test,zero,unpaid,bad,outside-window payments never convert');
const eid=await pay(uuid(101));await pay(uuid(101));await pay(uuid(108));
assert.equal(await scalar("select count(*)::int from events where name='ads_sample_purchased_7d'"),1,'one real external person,not sessions or internal');
assert.equal(await scalar('select public.record_ads_escolha_sample_purchase($1)',[eid]),false,'purchase replay idempotent');
// Payment observed before delivery can be reconciled safely from the canonical webhook row.
await reset();await q('update ads_escolha_samples set delivered_at=null where actor_id=$1',[uuid(102)]);await asService();
await pay(uuid(102));await reset();await q("update ads_escolha_samples set delivered_at=now()-interval '2 days' where actor_id=$1",[uuid(102)]);await asService();
assert.equal(await scalar('select public.reconcile_ads_escolha_sample_purchases()'),1);
assert.equal(await scalar('select public.reconcile_ads_escolha_sample_purchases()'),0);
assert.equal(await scalar("select count(*)::int from events where name='ads_sample_purchased_7d'"),2);
assert.equal((await scalar('select public.claim_ads_escolha_sample_alert($1)',[uuid(3000)])).code,'not_ready');
// Isolated cohort fixture: 49 mature external people + young +internal do not reach the gate.
await reset();await db.exec('truncate ads_escolha_samples,ads_escolha_sample_alerts');
for(let n=0;n<51;n++) await q(`insert into ads_escolha_samples(actor_id,owner_id,order_id,request_day,estimate_cents,is_internal,delivered_at)
 values($1,$1,$2,(now() at time zone 'UTC')::date,150,$3,now()-($4::text||' days')::interval)`,[uuid(4000+n),uuid(5000+n),n===50,n===49?6:8]);
await asService();assert.equal((await scalar('select public.claim_ads_escolha_sample_alert($1)',[uuid(3000)])).code,'not_ready');
await reset();await q("update ads_escolha_samples set delivered_at=now()-interval '8 days' where actor_id=$1",[uuid(4049)]);await asService();
const alert=await scalar('select public.claim_ads_escolha_sample_alert($1)',[uuid(3000)]);
assert.equal(alert.code,'ok');assert.equal(alert.people,50);
assert.equal((await scalar('select public.claim_ads_escolha_sample_alert($1)',[uuid(3001)])).code,'busy','parallel cron cannot claim second e-mail');
assert.equal(await scalar('select public.finish_ads_escolha_sample_alert($1,true)',[uuid(3001)]),false,'wrong lease cannot finish');
assert.equal(await scalar('select public.finish_ads_escolha_sample_alert($1,false)',[uuid(3000)]),true,'failed send releases same idempotent alert');
assert.equal((await scalar('select public.claim_ads_escolha_sample_alert($1)',[uuid(3002)])).code,'ok');
assert.equal(await scalar('select public.finish_ads_escolha_sample_alert($1,true)',[uuid(3002)]),true);
assert.equal((await scalar('select public.claim_ads_escolha_sample_alert($1)',[uuid(3003)])).code,'sent','sent e-mail never repeats');
await reset();await db.exec('truncate ads_escolha_sample_alerts');await q('update ads_escolha_samples set purchased_at=delivered_at+interval \'1 day\' where actor_id=$1',[uuid(4000)]);await asService();
assert.equal((await scalar('select public.claim_ads_escolha_sample_alert($1)',[uuid(3004)])).code,'converted','one buyer prevents stopping alert');
await reset();
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);
 for(const table of ['ads_escolha_samples','ads_escolha_sample_days','ads_escolha_sample_alerts']) await assert.rejects(q('select * from '+table),/permission denied/);
 await assert.rejects(reserve(12),/permission denied/);
 await assert.rejects(scalar('select public.claim_ads_escolha_sample_alert($1)',[uuid(3005)]),/permission denied/);
 await assert.rejects(scalar('select public.reconcile_ads_escolha_sample_purchases()'),/permission denied/);
 await reset();
}
await asService();await assert.rejects(q('delete from ads_escolha_samples'),/permission denied/);await reset();
await assert.rejects(db.exec("update ads_escolha_sample_days set reserved_cents=1001"),/check constraint/);
await db.close();console.log('SQL green: new migration executes;150c/1000c UTC counter,six allowed,lifetime/replay/ownership/lease,deletion-safe,delivery/upsell/person events,live signed purchase7d+repair,50 mature external alert/lease/retry/dedupe,and private grants. PGlite queues SQL;independent live-connection concurrency is not claimed.');
if(process.argv.includes('--mutants')) {
 const path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
 const source=fs.readFileSync(migration,'utf8').replace(/\r\n/g,'\n');
 const mutations=[
  ['inherited default DELETE grant survives','from public, anon, authenticated, service_role;','from public, anon, authenticated;'],
  ['daily budget admits seventh','if v_cents + 150 > 1000 then','if v_cents + 150 > 1500 then'],
  ['second order reuses lifetime sample',"return jsonb_build_object('code', 'ads_sample_used');","return jsonb_build_object('code', 'ok', 'estimate_cents', 150);"],
  ['replay crosses orders','if v_claim.order_id = p_order_id and v_claim.owner_id = p_owner_id then','if v_claim.owner_id = p_owner_id then'],
  ['internal people counted','if not p_is_internal then','if true then'],
  ['paid delivery pretends free',"and video_id is not null and credits_charged = 0 and billing_ref like 'adssample-escolha-%'","and video_id is not null and credits_charged >= 0 and billing_ref like 'adssample-escolha-%'"],
  ['Stripe test mode converts',"or v_event.metadata->>'stripe_livemode' is distinct from 'true'","or false"],
  ['purchase after seven days converts',"v_paid_at <= delivered_at + interval '7 days'","v_paid_at <= delivered_at + interval '70 days'"],
  ['49 people alert early',"coalesce(cardinality(v_ids), 0) < 50","coalesce(cardinality(v_ids), 0) < 49"],
  ['internal samples trigger stopping alert',"from public.ads_escolha_samples where is_internal = false\n        and delivered_at <=","from public.ads_escolha_samples where true\n        and delivered_at <="],
  ['sent alert repeats','sent_at = case when p_sent then now() else null end','sent_at = case when false then now() else null end'],
 ];
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kineo-amostra-data-sql-mutants-'));
 try {
  for(let i=0;i<mutations.length;i++) {
   const [name,from,to]=mutations[i];assert.equal(source.split(from).length-1,1,'unique SQL mutant anchor: '+name);
   const file=path.join(dir,String(i)+'.sql');fs.writeFileSync(file,source.replace(from,to));
   const child=spawnSync(process.execPath,[__filename,process.argv[2]||'@electric-sql/pglite',file],{encoding:'utf8',timeout:30000,maxBuffer:2**20});
   assert.equal(child.error,undefined,'SQL mutant completes: '+name);
   assert.notEqual(child.status,0,'SQL mutant cannot survive: '+name);
   assert.match((child.stderr||'')+(child.stdout||''),/AssertionError \[ERR_ASSERTION\]/,'SQL mutant must die at a behavioral assertion,not parser/import/database setup: '+name);
   fs.unlinkSync(file);console.log('ok SQL assertion-killed mutant: '+name);
  }
 } finally {for(const file of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,file));fs.rmdirSync(dir)}
 console.log('SQL mutants green: '+mutations.length+' assertion-killed behavioral mutants; migration source untouched.');
}
})().catch(e=>{console.error(e);process.exitCode=1});
