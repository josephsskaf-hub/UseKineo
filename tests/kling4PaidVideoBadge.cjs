// Offline SQL guard: no project connection, credentials, or provider requests.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite')

async function main() {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.videos(id integer primary key, title text);
      grant usage on schema public to authenticated, service_role;
      grant select,insert,update on public.videos to authenticated, service_role;`)
    const migration = fs.readdirSync(path.join(__dirname, '../supabase/migrations')).find(name => name.endsWith('_kling4_paid_video_engine_used.sql'))
    assert.ok(migration)
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations', migration), 'utf8'))
    await db.exec(`set role authenticated; insert into public.videos(id,title) values(1,'A customer film');`)
    await assert.rejects(db.exec(`insert into public.videos(id,title,engine_used) values(2,'Forged','kling4')`), /engine_used is assigned/)
    await assert.rejects(db.exec(`update public.videos set engine_used='kling4' where id=1`), /engine_used is assigned/)
    await db.exec(`update public.videos set title='Renamed film' where id=1; reset role; set role service_role;
      update public.videos set engine_used='kling4' where id=1;`)
    assert.equal((await db.query(`select engine_used from public.videos where id=1`)).rows[0].engine_used, 'kling4')
    await db.exec(`update public.videos set engine_used='seedance15_fallback' where id=1; reset role;`)
    assert.equal((await db.query(`select engine_used from public.videos where id=1`)).rows[0].engine_used, 'seedance15_fallback')
    assert.equal((await db.query(`select title from public.videos where id=1`)).rows[0].title, 'Renamed film')
    console.log('Paid video badge SQL passed: customer cannot forge engine; verified service writes succeed.')
  } finally { await db.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
