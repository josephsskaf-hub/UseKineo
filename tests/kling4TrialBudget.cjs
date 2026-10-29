// Offline only: node tests/kling4TrialBudget.cjs [path-to-installed-@electric-sql/pglite]
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite')

async function main() {
  const filename = path.resolve(__dirname, '../lib/kling4TrialBudget.ts')
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const box = { exports: {} }
  vm.runInNewContext(output, box, { filename })
  const { reserveKling4Trial, recordKling4TrialFilm } = box.exports
  const identity = { userId: '00000000-0000-4000-8000-000000000001', jobId: 'generation-first-film', country: 'br' }
  assert.equal((await reserveKling4Trial({ rpc: async () => { throw new Error('offline') } }, identity)).reason, 'unavailable')
  assert.equal((await reserveKling4Trial({ rpc: async () => ({ error: { message: 'missing migration' } }) }, identity)).allowed, false)
  assert.equal((await reserveKling4Trial({ rpc: async () => ({ data: { code: 'ok', reserved_milliusd: 2354 } }) }, identity)).allowed, false)
  for (const code of ['cap', 'duplicate']) {
    assert.equal((await reserveKling4Trial({ rpc: async () => ({ data: { code } }) }, identity)).reason, code)
  }
  let calls = 0
  assert.equal((await reserveKling4Trial({ rpc: () => { calls++; throw new Error('must not call') } }, { ...identity, userId: 'invalid' })).allowed, false)
  assert.equal(calls, 0)
  assert.equal((await reserveKling4Trial({ rpc: async (_name, args) => {
    assert.equal(args.p_country, 'BR')
    return { data: { code: 'ok', reserved_milliusd: 2355 } }
  } }, identity)).reservedUsd, 2.355)
  assert.equal(await recordKling4TrialFilm({ rpc: async () => ({ error: true }) }, { ...identity, engineUsed: 'kling4', costUsd: 2.355 }), false)

  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      grant usage on schema public to service_role;
      create table public.events(id uuid primary key, name text not null, user_id uuid, path text, metadata jsonb, created_at timestamptz default now());
      grant select, insert on public.events to service_role;`)
    const migration = fs.readdirSync(path.resolve(__dirname, '../supabase/migrations')).find(name => name.endsWith('_kling4_trial_daily_budget.sql'))
    assert.ok(migration)
    await db.exec(fs.readFileSync(path.resolve(__dirname, '../supabase/migrations', migration), 'utf8'))
    const reserve = async (jobId, userId = identity.userId) => (await db.query(
      'select public.reserve_kling4_trial($1,$2,$3) as result', [jobId, userId, 'BR'],
    )).rows[0].result
    const record = async (jobId, engine, cost) => (await db.query(
      'select public.record_kling4_trial_film($1,$2,$3,$4,$5) as result', [jobId, identity.userId, 'BR', engine, cost],
    )).rows[0].result
    await db.exec('set role service_role')
    const results = await Promise.all(Array.from({ length: 40 }, (_, i) => reserve(`film-${i}`)))
    assert.equal(results.filter(r => r.code === 'ok').length, 25)
    assert.equal(results.filter(r => r.code === 'cap').length, 15)
    assert.equal((await reserve('film-0')).code, 'duplicate')
    assert.equal((await reserve('film-25')).code, 'duplicate')
    assert.equal((await db.query('select reserved_milliusd from public.kling4_trial_days')).rows[0].reserved_milliusd, 58875)
    assert.equal((await record('film-0', 'kling4', 2355)).code, 'ok')
    assert.equal((await record('film-0', 'seedance15_fallback', 0)).code, 'unchanged')
    assert.equal((await record('film-1', 'seedance15_fallback', 2355)).code, 'ok')
    assert.equal((await record('film-25', 'seedance15_cap', 0)).code, 'ok')
    assert.equal((await record('film-26', 'kling4', 2355)).code, 'unavailable')
    assert.equal((await record('reservation-rpc-failed', 'seedance15_fallback', 0)).code, 'ok')
    assert.equal((await reserve('reservation-rpc-failed')).code, 'duplicate')
    const events = (await db.query('select name, metadata from public.events order by metadata->>\'film_id\'')).rows
    assert.equal(events.length, 4)
    assert.equal(events.find(e => e.metadata.film_id === 'film-0').metadata.cost_usd, 2.355)
    assert.equal(events.find(e => e.metadata.film_id === 'film-25').metadata.engine_used, 'seedance15_cap')
    assert.ok(events.every(e => e.name === 'free_film_engine_used' && e.metadata.country === 'BR'))
    assert.equal((await db.query('select reserved_milliusd from public.kling4_trial_days')).rows[0].reserved_milliusd, 58875, 'failed provider call never releases its reservation')
    await assert.rejects(db.query('delete from public.kling4_trial_films'), /permission denied/)
    await db.exec('reset role')
    // Moving only the daily counter to yesterday proves the next UTC day gets its own allowance.
    await db.exec("update public.kling4_trial_days set request_day = request_day - 1")
    await db.exec('set role service_role')
    assert.equal((await reserve('next-day-film')).code, 'ok')
    assert.equal((await reserve('film-0')).code, 'duplicate', 'rollover never authorizes a second paid call for the same film')
    await db.exec('reset role')
    assert.equal((await db.query('select count(*)::int n from public.kling4_trial_days')).rows[0].n, 2)
    // A failed event insert rolls back the ledger result too, so retry can repair both atomically.
    await db.exec('alter table public.events rename to events_unavailable')
    await db.exec('set role service_role')
    await assert.rejects(record('next-day-film', 'kling4', 2355), /does not exist/)
    assert.equal((await db.query("select recorded_at from public.kling4_trial_films where job_id='next-day-film'")).rows[0].recorded_at, null)
    await db.exec('reset role')
    await db.exec('alter table public.events_unavailable rename to events')
    await db.exec('set role service_role')
    assert.equal((await record('next-day-film', 'kling4', 2355)).code, 'ok')
    await db.exec('reset role')
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(reserve('unauthorized'), /permission denied/)
      await assert.rejects(record('unauthorized', 'seedance15_cap', 0), /permission denied/)
      await assert.rejects(db.query('select * from public.kling4_trial_films'), /permission denied/)
      await db.exec('reset role')
    }
    console.log('PASS Kling4 budget: exact $60 cap, 25 reservations, duplicates, retained failure spend, UTC rollover, immutable per-film event, atomic event rollback, service-only access, RPC fail-closed. Embedded Postgres serializes requests; independent live sessions are not exercised.')
  } finally { await db.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
