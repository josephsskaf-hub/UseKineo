#!/usr/bin/env node
// KINEO-BROLL-ORPHANS-2026-08-08 — move orphaned `broll` objects to a `trash/` prefix.
//
// WHY THIS EXISTS
// The clip vault uploads the clip to Storage BEFORE inserting the index row in
// `clip_vault`. For 15 days every stock insert was rejected (`score` FLOAT into
// an INTEGER column, see docs/BUGHUNT-2026-08-08.md #1), so every upload left a
// file nobody can find and nobody deletes. That is the liability this cleans up.
//
// FOUNDER'S DECISION, LITERAL: **DO NOT DELETE. MOVE TO `trash/` FIRST.**
// There is no delete call in this file, on any path, by design. Reversal is a
// move back, and the manifest gives you every old->new pair to do it.
//
// SCOPE — deliberately narrower than "object without an index row":
//   * ONLY the `vault/` prefix. `ai-hook/` objects are NEVER indexed in
//     clip_vault (persistHookClip returns the public URL straight into a live
//     render) so "no index row" does NOT mean orphan for them. `rickrefs/` is a
//     manual upload of unknown purpose. Both are left untouched.
//   * ONLY objects older than SAFETY_WINDOW_HOURS, so an upload whose insert is
//     still in flight is never mistaken for an orphan.
//
// USAGE (service role key is read from .env.local, never printed):
//   node scripts/broll-orphans-to-trash.mjs plan
//   node scripts/broll-orphans-to-trash.mjs verify-one
//   node scripts/broll-orphans-to-trash.mjs move 50

import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BUCKET = 'broll'
const PREFIX = 'vault/'
const TRASH = 'trash/'
const SAFETY_WINDOW_HOURS = 2
const CONCURRENCY = 6
const MANIFEST = resolve(ROOT, 'docs/BROLL-ORPHANS-TRASH-MANIFEST-2026-08-08.csv')

// ---- credentials: read from .env.local, never logged -----------------------
function loadEnv() {
  const p = resolve(ROOT, '.env.local')
  if (!existsSync(p)) {
    console.error('FATAL: .env.local not found at repo root. Cannot continue.')
    process.exit(1)
  }
  const env = {}
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local.')
    process.exit(1)
  }
  return { url: url.replace(/\/$/, ''), key }
}

const { url: SUPABASE_URL, key: SERVICE_KEY } = loadEnv()
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

// ---- the index: every path clip_vault points at ----------------------------
async function indexedPaths() {
  const out = new Set()
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/clip_vault?select=storage_url&limit=1000&offset=${offset}`,
      { headers: H },
    )
    if (!r.ok) throw new Error(`clip_vault read failed: ${r.status}`)
    const rows = await r.json()
    for (const row of rows) {
      const m = (row.storage_url || '').match(/\/public\/broll\/(.*)$/)
      if (m) out.add(m[1])
    }
    if (rows.length < 1000) break
  }
  return out
}

// ---- every object actually sitting under vault/ ----------------------------
async function listObjects() {
  const out = []
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: PREFIX, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!r.ok) throw new Error(`storage list failed: ${r.status} ${await r.text()}`)
    const rows = await r.json()
    for (const o of rows) {
      if (!o.name || o.id === null) continue // folder placeholder
      out.push({ path: PREFIX + o.name, size: o.metadata?.size ?? 0, created_at: o.created_at })
    }
    if (rows.length < 1000) break
  }
  return out
}

async function computeOrphans() {
  const [idx, objs] = await Promise.all([indexedPaths(), listObjects()])
  const cutoff = Date.now() - SAFETY_WINDOW_HOURS * 3600 * 1000
  const orphans = objs.filter(
    (o) => !idx.has(o.path) && new Date(o.created_at).getTime() < cutoff,
  )
  orphans.sort((a, b) => a.created_at.localeCompare(b.created_at)) // oldest first
  return { idx, objs, orphans }
}

const gb = (b) => (b / 1e9).toFixed(2)

// ---- move (NO DELETE ANYWHERE) ---------------------------------------------
async function moveOne(o) {
  const dest = TRASH + o.path
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/move`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: BUCKET, sourceKey: o.path, destinationKey: dest }),
  })
  if (!r.ok) throw new Error(`move ${o.path}: ${r.status} ${(await r.text()).slice(0, 160)}`)
  return dest
}

async function runPool(items, fn) {
  const results = []
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (i < items.length) {
        const item = items[i++]
        try {
          results.push({ ok: true, item, dest: await fn(item) })
        } catch (e) {
          results.push({ ok: false, item, err: e.message })
        }
      }
    }),
  )
  return results
}

// ---- commands ---------------------------------------------------------------
const [cmd, arg] = process.argv.slice(2)

if (cmd === 'plan') {
  const { idx, objs, orphans } = await computeOrphans()
  const total = objs.reduce((s, o) => s + o.size, 0)
  const orph = orphans.reduce((s, o) => s + o.size, 0)
  console.log(`indexed rows pointing into broll : ${idx.size}`)
  console.log(`objects under ${PREFIX}            : ${objs.length} (${gb(total)} GB)`)
  console.log(`ORPHANS in scope (> ${SAFETY_WINDOW_HOURS}h old)  : ${orphans.length} (${gb(orph)} GB)`)
  console.log(`oldest: ${orphans[0]?.created_at}  newest: ${orphans[orphans.length - 1]?.created_at}`)
} else if (cmd === 'verify-one') {
  // Prove the backend serves the file at the NEW path before moving 2.6k of them.
  const { orphans } = await computeOrphans()
  const o = orphans[0]
  const pub = (p) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p}`
  const before = await fetch(pub(o.path), { method: 'HEAD' })
  console.log(`BEFORE  old=${before.status} len=${before.headers.get('content-length')}  ${o.path}`)
  const dest = await moveOne(o)
  const afterNew = await fetch(pub(dest), { method: 'HEAD' })
  const afterOld = await fetch(pub(o.path), { method: 'HEAD' })
  console.log(`AFTER   new=${afterNew.status} len=${afterNew.headers.get('content-length')}  ${dest}`)
  console.log(`AFTER   old=${afterOld.status} (404 expected — the point of the move)`)
  writeManifest([{ ok: true, item: o, dest }])
} else if (cmd === 'move') {
  const n = parseInt(arg || '0', 10)
  if (!Number.isFinite(n) || n <= 0 || n > 500) {
    console.error('refusing: batch size must be 1..500'); process.exit(1)
  }
  const { orphans } = await computeOrphans()
  const batch = orphans.slice(0, n)
  console.log(`moving ${batch.length} of ${orphans.length} orphans (${gb(batch.reduce((s, o) => s + o.size, 0))} GB)`)
  const res = await runPool(batch, moveOne)
  const ok = res.filter((r) => r.ok)
  writeManifest(ok)
  console.log(`moved ok=${ok.length} failed=${res.length - ok.length}`)
  for (const f of res.filter((r) => !r.ok).slice(0, 5)) console.log(`  FAIL ${f.err}`)
} else {
  console.log('usage: plan | verify-one | move <n>')
}

function writeManifest(rows) {
  if (!existsSync(MANIFEST)) {
    appendFileSync(MANIFEST, 'old_path,new_path,size_bytes,created_at,moved_at\n')
  }
  const now = new Date().toISOString()
  for (const r of rows) {
    appendFileSync(MANIFEST, `${r.item.path},${r.dest},${r.item.size},${r.item.created_at},${now}\n`)
  }
}
