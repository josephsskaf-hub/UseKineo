// Executes the actual GET route with in-memory claims and Fal. No network,
// credentials, render, database writes or provider POSTs are available here.
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'

let checks = 0
const eq = (a, b, label) => { assert.deepEqual(a, b, label); checks++ }
const ok = (value, label) => { assert.ok(value, label); checks++ }
const generationId = '00000000-0000-4000-8000-000000000011'
const model = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const ids = ['clip-a', null, null, null, 'clip-b', null, 'private-provider-id']
const code = ts.transpileModule(fs.readFileSync('app/api/cinematic-clip-status/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

async function run({ stage = 'status', status = 403, detail = 'Forbidden', recovery = false, allFailed = false } = {}) {
  const logs = [], calls = [], bound = []
  let refunds = 0, releases = 0
  const bad = new Error('SENTINEL_PROMPT https://signed.invalid/private?token=SENTINEL_KEY private-provider-id')
  bad.status = status
  bad.body = { detail, secret: 'SENTINEL_SECRET' }
  bad.name = 'SENTINEL_NAME'
  const exports = {}
  const claim = { status: 'settled', falRequestIds: allFailed ? [ids[6]] : ids,
    falModels: allFailed ? [model] : ids.map(() => model), resolutionReference: 'billing-existing' }
  const imports = {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) } }) },
    '@supabase/supabase-js': { createClient: () => ({}) },
    '@fal-ai/client': { fal: {
      config() {},
      queue: {
        async status(_model, { requestId }) {
          calls.push(['status', requestId])
          if (!recovery && requestId === ids[6] && stage === 'status') throw bad
          return { status: 'COMPLETED' }
        },
        async result(_model, { requestId }) {
          calls.push(['result', requestId])
          if (!recovery && requestId === ids[6] && stage === 'result') throw bad
          return { data: { video: { url: `https://example.invalid/${requestId}.mp4` } } }
        },
      },
    } },
    '@/lib/cinematic/claim': {
      validCinematicGenerationId: value => value === generationId,
      loadVerifiedCinematicClaim: async () => ({ ok: true, claim }),
      authorizeCinematicCompletedUrls: async ({ completed }) => { bound.push(...completed); return { ok: true } },
      releaseCinematicClaim: async () => { releases++; return { ok: true } },
    },
    '@/lib/credits/refund': { refundRenderCredits: async () => { refunds++; return 25 } },
  }
  vm.runInNewContext(code, {
    exports,
    require: name => { if (!(name in imports)) throw Error(`Unexpected import: ${name}`); return imports[name] },
    process: { env: { FAL_KEY: 'test-only', NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-only' } },
    console: { warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    Error, URL, URLSearchParams,
  }, { timeout: 5000 })
  const reply = await exports.GET({ nextUrl: new URL(`https://example.invalid/api/cinematic-clip-status?generationId=${generationId}&ids=${encodeURIComponent(JSON.stringify(claim.falRequestIds))}`) })
  return JSON.parse(JSON.stringify({ reply, logs, calls, bound, refunds, releases }))
}

for (const stage of ['status', 'result']) {
  for (const status of [403, 404, 429, 500, null]) {
    const r = await run({ stage, status })
    eq(r.reply.status, 200, 'Provider status never masquerades as app auth/claim failure')
    eq(r.reply.body.allDone, false, 'Ambiguous clip cannot unlock composition')
    eq(r.reply.body.done, 2, 'Two completed scenes preserved')
    eq(r.reply.body.failed, 4, 'Only never-submitted positions are failed')
    eq(r.bound.length, 2, 'Only real completed URLs are bound')
    eq([r.refunds, r.releases], [0, 0], 'No refund or claim release on ambiguity')
    eq(r.calls.filter(([kind]) => kind === 'status').length, 3, 'Exactly existing accepted IDs polled')
    const diag = r.logs.find(([label]) => label === '[cinematic-poll-diagnostic]')[1]
    eq(diag.stage, stage, 'Status vs result is distinguished')
    eq(diag.provider_http_status, status, 'Original numeric HTTP status preserved')
    eq(diag.scene_index, 6, 'Scene index follows slot, not completion order')
    eq(diag.generation_id, generationId, 'Correlates to owned generation')
    ok(!/SENTINEL|private-provider-id|https:\/\//.test(JSON.stringify(r.logs)), 'No body, message, ID, name, URL or secret leaked')
  }
}
for (const stage of ['status', 'result']) {
  for (const status of [400, 422]) {
    const r = await run({ stage, status })
    eq(r.reply.body.allDone, true, 'Existing terminal failure behavior preserved')
    eq(r.reply.body.done, 2, 'Existing survivors preserved')
    eq(r.refunds, 0, 'Partial completed generation is not refunded')
  }
}
const signals = [
  ['User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing', 'explicit_exhausted_balance'],
  ['Concurrency quota exhausted', 'mentions_concurrency'],
  ['Insufficient capacity', 'unclassified'],
  ['Request was not found', 'mentions_request_not_found'],
]
for (const [detail, expected] of signals) {
  const r = await run({ detail })
  eq(r.logs[0][1].message_signal, expected, 'Message evidence is allowlisted, not broad balance guess')
  eq(r.refunds, 0, 'Message signal grants no refund authority')
}
const recovered = await run({ recovery: true })
eq(recovered.reply.body.allDone, true, 'Same accepted IDs can recover without re-submit')
eq(recovered.reply.body.done, 3, 'Third scene delivered')
eq(recovered.logs.length, 0, 'Healthy polling remains quiet')
const terminal = await run({ allFailed: true, status: 422 })
eq(terminal.reply.status, 502, 'All-failed existing contract preserved')
eq([terminal.refunds, terminal.releases], [1, 1], 'Existing refund path called once')
console.log(`cinematic-poll-diagnostic: ${checks} passed; no external calls`)
