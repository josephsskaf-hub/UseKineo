// sprint-assinaturas #11 — "0 linhas em videos" nao e "0 entregas".
// node scripts/test-other-deliveries.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg) } else { fail++; console.log('  ✗', msg) } }

const src = fs.readFileSync(path.join(root, 'lib/lifecycle/otherDeliveries.ts'), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 } }).outputText
const tmp = path.join(root, 'scripts', '.other-deliveries.test.mjs')
fs.writeFileSync(tmp, js)
const m = await import(`file://${tmp}?t=${Date.now()}`)
fs.unlinkSync(tmp)

console.log('describe / total')
ok(m.describeOtherDeliveries({ clips: 5, images: 0, audios: 0 }) === '5 animated clips', '5 clips')
ok(m.describeOtherDeliveries({ clips: 1, images: 0, audios: 0 }) === '1 animated clip', 'singular clip')
ok(m.describeOtherDeliveries({ clips: 0, images: 2, audios: 1 }) === '2 images and 1 voiceover', 'images + voiceover')
ok(m.describeOtherDeliveries({ clips: 3, images: 2, audios: 1 }) === '3 animated clips, 2 images and 1 voiceover', 'three parts')
ok(m.describeOtherDeliveries({ clips: 0, images: 0, audios: 0 }) === '', 'zero = empty string (never prints "0 clips")')
ok(m.describeOtherDeliveries(null) === '', 'null = empty')
ok(m.otherDeliveriesTotal({ clips: 2, images: 1, audios: 0 }) === 3, 'total sums')
ok(m.otherDeliveriesTotal(undefined) === 0, 'total(undefined)=0')
ok(m.otherDeliveriesTotal(m.EMPTY_OTHER_DELIVERIES) === 0 && Object.isFrozen(m.EMPTY_OTHER_DELIVERIES), 'EMPTY frozen and zero')

console.log('countOtherDeliveries (mock admin)')
function mockAdmin(tables) {
  return { from(table) {
    const q = { _t: table, _f: [], _range: [0, 499] }
    const chain = {
      select() { return chain }, in(_c, ids) { q._ids = ids; return chain },
      eq(c, v) { q._f.push([c, v]); return chain }, order() { return chain },
      range(a, b) { q._range = [a, b]; return chain },
      then(res) {
        const t = tables[q._t]
        if (t instanceof Error) return res({ data: null, error: t })
        let rows = (t ?? []).filter((r) => q._ids.includes(r.user_id))
        for (const [c, v] of q._f) rows = rows.filter((r) => (c === 'name' ? r.name : c === 'metadata->>outcome' ? r.outcome : r[c]) === v)
        rows = rows.map((r) => ({ user_id: r.user_id, br: r.br }))
        return res({ data: rows.slice(q._range[0], q._range[1] + 1), error: null })
      },
    }
    return chain
  } }
}
const U = 'u-xzavior', V = 'u-other'
const events = []
for (let i = 0; i < 5; i++) for (let dup = 0; dup < 9; dup++) events.push({ user_id: U, name: 'animate_job_settled', outcome: 'delivered', br: `animate-${i}` })
events.push({ user_id: U, name: 'animate_job_settled', outcome: 'refunded', br: 'animate-r' })
events.push({ user_id: V, name: 'animate_job_settled', outcome: 'delivered', br: null })
const r1 = await m.countOtherDeliveries(mockAdmin({ events, images: [{ user_id: V }, { user_id: V }], audios: [{ user_id: U }] }), [U, V])
ok(r1.degraded === false, 'happy path not degraded')
ok(r1.counts.get(U)?.clips === 5, 'xzavior: 45 duplicated settle rows (9 per job) -> 5 clips (distinct billing_reference)')
ok(r1.counts.get(U)?.audios === 1 && r1.counts.get(U)?.images === 0, 'xzavior: 1 audio, 0 images')
ok(!r1.counts.get(V) || r1.counts.get(V).clips === 0, 'other: delivered row without billing_reference does not count as a clip')
ok(r1.counts.get(V)?.images === 2, 'other: 2 images')
ok(m.otherDeliveriesTotal(r1.counts.get(U)) === 6, 'xzavior total = 6')
ok(events.filter((e) => e.outcome === 'refunded').length === 1 && r1.counts.get(U).clips === 5, 'refunded job never counts as delivered')

const r2 = await m.countOtherDeliveries(mockAdmin({ events: new Error('boom'), images: [{ user_id: U }], audios: [] }), [U])
ok(r2.degraded === true, 'animate read error -> degraded flag')
ok(r2.counts.get(U)?.clips === 0 && r2.counts.get(U)?.images === 1, 'fail-open per source: clips 0, images still counted')

const r3 = await m.countOtherDeliveries(mockAdmin({}), [])
ok(r3.degraded === false && r3.counts.size === 0, 'empty cohort = no query, no degrade')

console.log('route wiring')
const route = fs.readFileSync(path.join(root, 'app/api/cron/trial-lifecycle-emails/route.ts'), 'utf8')
ok(route.includes("from '@/lib/lifecycle/otherDeliveries'"), 'route imports the module')
ok(/const neverRan = c\.videosMade === 0 && otherTotal === 0/.test(route), 'neverRan requires 0 videos AND 0 other deliveries')
ok(/otherMade: otherCounts\?\.get\(id\) \?\? EMPTY_OTHER_DELIVERIES/.test(route), 'candidate carries otherMade (fail-open zeros)')
ok(/dueKind\(row, now, videoCounts, ourFailureIds, lastTopics, other\.counts\)/.test(route), 'dueKind receives the counts')
ok((route.match(/other_deliveries_degraded: other\.degraded/g) || []).length === 3, 'degrade flag in all 3 JSON responses')
ok(route.includes('they stay in your Library.`') && route.includes('The ${otherKept} you already made are yours'), 'loss e-mail names what stays (clips/images/voiceovers)')
ok(!/otherMade|otherTotal|otherKept/.test(route.slice(route.indexOf("if (c.kind === 'ending_soon')"), route.indexOf("if (c.kind === 'downgraded_loss')"))), 'ending_soon untouched (byte-for-byte copy of today)')
ok(!/otherMade/.test(route.slice(route.indexOf("if (c.kind === 'expired_offer_d5')"))), 'D5/D10 untouched')
const lossBlock = route.slice(route.indexOf("if (c.kind === 'downgraded_loss')"), route.indexOf("if (c.kind === 'expired_offer_d5')"))
ok(!/\$\{c\.otherMade\.(clips|images|audios)\}/.test(lossBlock), 'no raw counter printed — only describe() (never "0 clips")')
ok(!/restore|video_credits|creditsLeft \+|COMEBACK/.test(lossBlock.replace(/\/\/.*$/gm, '').replace(/creditsLost/g, '')), 'loss branch grants nothing: no credit, no coupon')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
