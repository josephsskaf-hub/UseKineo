// Embedded Postgres only. Pass an existing installed PGlite path as argv2; never touches production.
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {PGlite}=require(process.argv[2]||'@electric-sql/pglite')
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
async function main(){
 const db=new PGlite()
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   grant usage on schema public to service_role;
   create table public.profiles(id uuid primary key,plan text,stripe_subscription_id text);
   create table public.events(id uuid primary key,name text not null,user_id uuid,path text,metadata jsonb,created_at timestamptz default now());
   grant select,update on public.profiles to service_role;grant select,insert on public.events to service_role;
   create table public.kling4_test_clock(t timestamptz);insert into public.kling4_test_clock values('2026-10-20T12:00:00Z');
   grant select on public.kling4_test_clock to service_role;
   create function public.kling4_test_now() returns timestamptz language sql as $$select t from public.kling4_test_clock$$;`)
  const migrations=path.resolve(__dirname,'../supabase/migrations')
  for(const suffix of ['_kling4_paid_promo_daily_budget.sql','_kling4_promo_carry_daily_budget.sql']){
   const file=fs.readdirSync(migrations).find(n=>n.endsWith(suffix));assert.ok(file)
   const sql=fs.readFileSync(path.join(migrations,file),'utf8')
   assert.doesNotMatch(sql,/security definer/)
   await db.exec(sql.replaceAll('pg_catalog.now()','public.kling4_test_now()'))
  }
  for(let n=1;n<=45;n++)await db.query("insert into public.profiles values($1,'basic',$2)",[id(n),`sub_${n}`])
  const clock=async value=>{await db.exec('reset role');await db.query('update public.kling4_test_clock set t=$1',[value]);await db.exec('set role service_role')}
  const reserve=async(n,seconds,extras,at)=>(await db.query(`select public.reserve_kling4_promo(
   $1,$2,'film',$3,$4,'basic','stripe',$5,'2026-10-01T00:00:00Z','2027-01-01T00:00:00Z',$6,'2026-10-01T00:00:00Z',true,true) r`,
   [id(n),`film-${n}`,seconds,extras,`sub_${n}`,at])).rows[0].r
  const ensure=async(n)=>(await db.query('select public.ensure_kling4_promo_budget_today($1,$2) r',[id(n),`film-${n}`])).rows[0].r
  let n=1
  for(let day=20;day<=24;day++){
   const at=`2026-10-${day}T12:00:00Z`;await clock(at)
   for(let j=0;j<8;j++,n++)assert.equal((await reserve(n,60,1972,at)).is_free,true)
   if(day===20){
    assert.equal((await ensure(1)).reason,'current_day')
    assert.equal((await db.query('select count(*)::int n from public.kling4_promo_carry_days')).rows[0].n,0)
   }
  }
  // Three small obligations still fit the last old day; a fourth belongs to its own old day.
  const at='2026-10-24T12:00:00Z'
  for(let j=0;j<3;j++,n++)assert.equal((await reserve(n,15,568,at)).is_free,true)
  await clock('2026-10-25T12:00:00Z');assert.equal((await reserve(n,15,568,'2026-10-25T12:00:00Z')).is_free,true)
  assert.equal(n,44)
  await clock('2026-10-19T12:00:00Z')
  assert.equal((await ensure(1)).allowed,false,'future source cannot claim current capacity')
  await clock('2026-10-29T12:00:00Z')
  const oldSum=(await db.query("select sum(reserved_milliusd)::int n from public.kling4_promo_days where request_day<'2026-10-29'")).rows[0].n
  const oldUses=(await db.query('select sum(uses)::int n from public.kling4_promo_user_days')).rows[0].n
  const results=await Promise.all(Array.from({length:44},(_,j)=>ensure(j+1)))
  assert.equal(results.filter(r=>r.allowed).length,11,'8 full 60s obligations plus 3 small 15s obligations fit')
  assert.equal(results.filter(r=>r.reason==='daily_cap').length,33)
  assert.equal((await db.query("select reserved_milliusd n from public.kling4_promo_days where request_day='2026-10-29'")).rows[0].n,99905)
  assert.equal((await db.query('select count(*)::int n from public.kling4_promo_carry_days')).rows[0].n,11)
  assert.equal((await ensure(1)).reason,'duplicate')
  assert.equal((await ensure(44)).allowed,false)
  assert.equal((await ensure(45)).reason,'unverified','no original reservation means no free new provider work')
  assert.equal((await db.query('select sum(uses)::int n from public.kling4_promo_user_days')).rows[0].n,oldUses)
  assert.equal((await db.query("select count(*)::int n from public.kling4_promo_user_days where request_day='2026-10-29'")).rows[0].n,0)
  assert.equal((await db.query("select sum(reserved_milliusd)::int n from public.kling4_promo_days where request_day<'2026-10-29'")).rows[0].n,oldSum)
  const events=(await db.query("select metadata from public.events where name='kling4_promo_carry_reserved'")).rows
  assert.equal(events.length,11);assert.ok(events.every(e=>e.metadata.continuation===true&&e.metadata.new_entitlement_use===false&&e.metadata.cost_basis==='reserved_upper_bound'))
  // A fresh admission competes with continuation for that exact same global row and is denied at the cap.
  assert.equal((await reserve(45,15,568,'2026-10-29T12:00:00Z')).reason,'daily_cap')
  assert.equal((await ensure(45)).reason,'unverified','credit-priced cap decisions do not authorize carry')
  await clock('2026-10-30T00:00:00Z')
  for(let j=1;j<=4;j++)assert.equal((await ensure(j)).reason,'reserved')
  assert.equal((await db.query("select reserved_milliusd n from public.kling4_promo_days where request_day='2026-10-30'")).rows[0].n,45568)
  // Event failure rolls back today's budget and continuation identity together.
  await db.exec('reset role;alter table public.events rename to events_unavailable;set role service_role')
  await assert.rejects(ensure(5),/does not exist/)
  assert.equal((await db.query("select reserved_milliusd n from public.kling4_promo_days where request_day='2026-10-30'")).rows[0].n,45568)
  assert.equal((await db.query("select count(*)::int n from public.kling4_promo_carry_days where request_day='2026-10-30'")).rows[0].n,4)
  await db.exec('reset role;alter table public.events_unavailable rename to events;set role service_role')
  assert.equal((await ensure(5)).allowed,true)
  await assert.rejects(db.query('delete from public.kling4_promo_carry_days'),/permission denied/)
  await assert.rejects(db.query('update public.kling4_promo_carry_days set reserved_milliusd=157'),/permission denied/)
  await db.exec('reset role')
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`)
   await assert.rejects(ensure(1),/permission denied/)
   await assert.rejects(db.query('select * from public.kling4_promo_carry_days'),/permission denied/)
   await db.exec('reset role')
  }
  console.log('PASS strict UTC carry: source proof only; exact shared $100 cap over 44 old jobs, duplicate/idempotent continuation, same-day free pass, fresh/carry competition, unchanged user quota and old reservations, UTC rollover, atomic event rollback, RLS/service-only immutable carry history. Embedded Postgres serializes requests; live independent sessions are not exercised.')
 }finally{await db.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
