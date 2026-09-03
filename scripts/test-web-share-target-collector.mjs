#!/usr/bin/env node
import assert from 'node:assert/strict'
import { collectWebShareTargetSubscription } from './measure-web-share-target-subscription.mjs'

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const closed = (name) => name === 'web_share_target_arrived'
  ? { handoff_status: 'received', input_kind: 'title', surface: 'free_script_generator', topic_prefilled: true, version: 'web_share_target_v1' }
  : { input_kind: 'title', surface: 'free_script_generator', version: 'web_share_target_v1' }
const arrivalRows = Array.from({ length: 1001 }, (_, index) => ({
  id: `a${String(index).padStart(4, '0')}`, name: 'web_share_target_arrived', user_id: null,
  session_id: 's1', path: '/free-script-generator', created_at: '2026-09-02T10:00:00.000Z', metadata: closed('web_share_target_arrived'),
}))
const tables = {
  events: [...arrivalRows,
    { id: 'script', name: 'web_share_target_script_generated', user_id: null, session_id: 's1', path: '/free-script-generator', created_at: '2026-09-02T10:01:00.000Z', metadata: closed('web_share_target_script_generated') },
    { id: 'owner', name: 'page_view', user_id: 'u1', session_id: 's1', path: '/generate', created_at: '2026-09-02T10:03:00.000Z', metadata: {} },
  ],
  profiles: [{ id: 'u1', email: 'external@example.com', created_at: '2026-09-02T10:02:00.000Z', is_pro: false, plan: 'trial' }],
  videos: [],
}

function valueAt(row, column) {
  if (column === 'metadata->>stripe_session_id') return row?.metadata?.stripe_session_id
  return row?.[column]
}

function fakeDb(data, calls, fail = false) {
  return { from(table) {
    const filters = []
    let from = 0
    let to = Infinity
    const query = {
      select() { return query },
      in(column, values) { filters.push((row) => values.includes(valueAt(row, column))); return query },
      gte(column, value) { filters.push((row) => row[column] != null && row[column] >= value); return query },
      lte(column, value) { filters.push((row) => row[column] != null && row[column] <= value); return query },
      is(column, value) { filters.push((row) => row[column] === value); return query },
      eq(column, value) { filters.push((row) => valueAt(row, column) === value); return query },
      order() { return query },
      range(start, end) { from = start; to = end; calls.push({ table, from, to }); return query },
      then(resolve, reject) {
        if (fail) return Promise.resolve({ data: null, error: { code: 'TEST_FAILURE' } }).then(resolve, reject)
        const rows = (data[table] ?? []).filter((row) => filters.every((predicate) => predicate(row))).slice(from, to + 1)
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return query
  } }
}

const calls = []
const report = await collectWebShareTargetSubscription({
  db: fakeDb(tables, calls), generatedAt: new Date('2026-09-03T12:00:00.000Z'),
})
equal(report.funnel.arrivalSessions, 1, '1001 arrival rows remain one browser session')
equal(report.funnel.externalAttributedPeople, 1, 'collector carries same-session identity into report')
equal(report.funnel.newAcquisitionPeople, 1, 'collector preserves profile chronology')
equal(calls.some((row) => row.table === 'events' && row.from === 1000), true, 'collector executes a second page after 1000 rows')

await assert.rejects(() => collectWebShareTargetSubscription({
  db: fakeDb(tables, [], true), generatedAt: new Date('2026-09-03T12:00:00.000Z'),
}), /custom events\[0:999\]: TEST_FAILURE/)
checks += 1

console.log(`web-share-target-collector: ${checks}/${checks} checks passed`)
