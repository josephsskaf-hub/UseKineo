// KINEO-ADMIN-LEVE-2310 — exact historical source proof; all mutations stay in memory.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { semAdsCenaTexto2310 } from './test-support/desfaz-ads-cena-texto-2310.mjs' // KINEO-ADS-CENA-TEXTO-2310
import { semAdminLeve2310, ADMIN_LEVE_2310_BASE, ADMIN_LEVE_2310_HUNKS, ADMIN_LEVE_2310_NEW_PRODUCT_FILES } from './test-support/desfaz-admin-leve-2310.mjs'

const ROOT = path.resolve(process.argv.find((a) => a.startsWith('--root='))?.slice(7) || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const MARK = 'KINEO-ADMIN-LEVE-2310'
const read = (file) => semAdsCenaTexto2310(fs.readFileSync(path.join(ROOT, file), 'utf8'), file) // KINEO-ADS-CENA-TEXTO-2310 — historical mutantes still receive every original Admin hunk.
const lf = (s) => s.replace(/\r\n/g, '\n')
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
let passed = 0
const assert = (condition, message) => { if (!condition) throw new Error(message); passed++ }
const rejects = (run, message) => { let threw = false; try { run() } catch (e) { threw = /expected exactly 1 candidate match/.test(e.message) } assert(threw, message) }

try {
  assert(Object.keys(ADMIN_LEVE_2310_HUNKS).length === 15, 'Exactly fifteen existing task sources are covered, including workflow and all historical guardian reanchors')
  for (const [file, hunks] of Object.entries(ADMIN_LEVE_2310_HUNKS)) {
    const actual = read(file), source = lf(actual), base = lf(git('show', ADMIN_LEVE_2310_BASE + ':' + file))
    assert(semAdminLeve2310(source, file) === base, file + ': candidate reverses exactly to immutable base')
    assert(lf(semAdminLeve2310(actual, file)) === base, file + ': actual filesystem EOL reverses to base')
    assert(semAdminLeve2310(base, file) === base, file + ': idempotent base is untouched')
    assert(semAdminLeve2310(source.replace(/\n/g, '\r\n'), file) === base.replace(/\n/g, '\r\n'), file + ': CRLF roundtrip is exact')
    assert(semAdminLeve2310(actual, file.replace(/\//g, '\\')) === semAdminLeve2310(actual, file), file + ': Windows paths preserve the same source')
    const outside = '\n// external fixture survives byte for byte\r\n'
    assert(semAdminLeve2310(source + outside, file) === base + outside, file + ': external addition outside the hunks survives exactly')
    for (const [index, hunk] of hunks.entries()) {
      const at = source.indexOf(hunk.after)
      assert(at >= 0 && source.indexOf(hunk.after, at + 1) < 0, file + ': hunk ' + index + ' exists exactly once')
      const offset = Math.floor(hunk.after.length / 2), old = hunk.after[offset], character = old === 'X' ? 'Y' : 'X'
      const changed = source.slice(0, at + offset) + character + source.slice(at + offset + 1)
      const marked = (s) => s.includes(MARK) ? s : s + '\n// ' + MARK + '\n'
      rejects(() => semAdminLeve2310(marked(changed), file), file + ': mutation inside hunk ' + index + ' is rejected')
      rejects(() => semAdminLeve2310(marked(source.slice(0, at) + source.slice(at + hunk.after.length)), file), file + ': missing hunk ' + index + ' is rejected')
      rejects(() => semAdminLeve2310(source + '\n' + hunk.after, file), file + ': duplicate hunk ' + index + ' is rejected')
    }
    if (/\b(?:createLiveCache|startVisiblePolling|semAdminLeve2310)\b|test-admin-leve-(?:undo-)?2310/.test(source)) {
      const unmarkedTamper = hunks.reduce((s, h) => s.replace(h.after, (match) => (match[0] === 'X' ? 'Y' : 'X') + match.slice(1)), source).replaceAll(MARK, 'REMOVED_TASK_MARK')
      rejects(() => semAdminLeve2310(unmarkedTamper, file), file + ': tampering every hunk while removing the marker still rejects unmistakable task evidence')
    }
    console.log('PASS ' + file + ': exact base/LF/CRLF/Windows, idempotence, external bytes, malformed hunks rejected')
  }
  assert(semAdminLeve2310('untouched ' + MARK, 'elsewhere.ts') === 'untouched ' + MARK, 'Unrelated source is never transformed')
  assert(JSON.stringify(ADMIN_LEVE_2310_NEW_PRODUCT_FILES) === JSON.stringify(['lib/admin/liveCache.ts', 'lib/admin/visiblePolling.ts', 'supabase/migrations/20261023121649_admin_leve_live_counters.sql']), 'Rollback inventory includes exactly the two new productive helpers and the new, unapplied migration')
  for (const file of ADMIN_LEVE_2310_NEW_PRODUCT_FILES) assert(fs.existsSync(path.join(ROOT, file)), 'New productive file exists: ' + file)
  const oldMigration = 'supabase/migrations/20260827200000_admin_live_counters_exact.sql'
  assert(lf(read(oldMigration)) === lf(git('show', ADMIN_LEVE_2310_BASE + ':' + oldMigration)), 'Previously registered migration remains byte-identical to base after Git EOL normalization')
  const sql = lf(read(ADMIN_LEVE_2310_NEW_PRODUCT_FILES[2]))
  assert(/create index events_admin_live_sessions_idx\s+on public\.events \(created_at desc\) include \(session_id, user_id\)\s+where session_id is not null;/i.test(sql), 'New partial covering index targets the measured event session scans')
  assert(/set local lock_timeout = '1s';/.test(sql) && /set local statement_timeout = '5s';/.test(sql), 'Migration cannot hold an unbounded ingestion lock')
  assert(/revoke all on function public\.admin_live_counters\(text\[\], text\[\]\) from public, anon, authenticated;/.test(sql) && /grant execute on function public\.admin_live_counters\(text\[\], text\[\]\) to service_role;/.test(sql), 'RPC retains service-role-only grants')
  const body = (text) => text.match(/\bwith\s+internos as \([\s\S]+?\);/i)?.[0].replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim()
  const originalBody = body(lf(read(oldMigration))), optimizedBody = body(sql)
  const expectedBody = originalBody?.replace('= any (select lower(x) from unnest(p_exact_emails) x)', '= any (array(select lower(x) from unnest(p_exact_emails) x))').replace('or exists (select 1 from unnest(p_like_patterns) pat where lower(p.email) like lower(pat))', 'or lower(p.email) like any (array(select lower(pat) from unnest(p_like_patterns) pat))').replaceAll('and e.user_id in (select id from internos)', 'and e.session_id is not null and e.user_id in (select id from internos)')
  assert(originalBody && optimizedBody === expectedBody, 'SQL changes are exactly materialized exclusion parameters and redundant not-null internal-session filters; six aggregate expressions stay unchanged')
  const { semRoteiroCurto2210 } = await import('./test-support/desfaz-roteiro-curto-2210.mjs')
  const oldLive = semRoteiroCurto2210(read('app/api/admin/live/route.ts'), 'app/api/admin/live/route.ts')
  assert(semAdminLeve2310(oldLive, 'app/api/admin/live/route.ts') === oldLive, 'Admin undo is idempotent even after historical route layers have also been removed')
  assert(semRoteiroCurto2210(oldLive, 'app/api/admin/live/route.ts') === oldLive, 'The composed historical adapter accepts repeated entry without requiring absent newer hunks')
  console.log(MARK + '-UNDO: ' + passed + ' passed, 0 failed.')
} catch (e) { console.log('FAIL ' + e.message); console.log(MARK + '-UNDO: ' + passed + ' passed before failure.'); process.exitCode = 1 }
