// Offline fixture for retry-budget-3010: real route, HMAC claim, CAS and compose mutex.
// Actual retry POST, Fal single-submit helper, HMAC claim/retarget helpers and
// active GET. Synthetic in-memory database with unique PK + real CAS filters.
// No SDK/network/database credentials, providers or refunds are available.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './offline-ts-loader.mjs'

let checks = 0
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const eq = (actual, expected, label) => { assert.deepEqual(clone(actual), expected, label); checks++ }
const ok = (actual, label) => { assert.ok(actual, label); checks++ }
const blocked = () => { throw Error('Forbidden real service/refund') }
const modelH3 = 'minimax/h3/text-to-video', modelI2V = 'minimax/h3/image-to-video'
const modelKling = 'fal-ai/kling-video/v3/pro/text-to-video', modelOmni = 'google/gemini-omni-flash/image-to-video'

export function fixture(options = {}) {
  const secret = 'offline-signing-fixture', userId = '11111111-1111-4111-8111-111111111111', generationId = 'scene-generation-111'
  const events = [], operations = [], posts = [], openaiPosts = [], logs = []
  let clockNow = Date.now()
  let birth, claims, compose, route, updateBirth, birthReads = 0, hookInsert = options.afterInsert
  const field = (row, key) => key.split(/->>?/).reduce((value, part) => value?.[part], row)
  const db = { from(table) {
    if (!['events', 'videos', 'credit_debits'].includes(table)) throw Error('Unexpected table ' + table)
    let action = 'select', value, single = false, limit, order
    const filters = [], predicates = []
    const query = {
      select() { return query },
      eq(key, expected) { filters.push([key, expected]); predicates.push(row => field(row, key) === expected); return query },
      is(key, expected) { filters.push([key, expected]); predicates.push(row => (field(row, key) ?? null) === expected); return query },
      gte(key, expected) { predicates.push(row => field(row, key) >= expected); return query },
      in(key, expected) { predicates.push(row => expected.includes(field(row, key))); return query },
      limit(count) { limit = count; return query },
      order(key, { ascending }) { order = { key, ascending }; return query },
      maybeSingle() { single = true; return query },
      or(expr) { const terms = String(expr).match(/(?:[^,"]|"[^"]*")+/g).map(t => { const [k, op, ...rest] = t.split('.'); const raw = rest.join('.'); const v = raw.replace(/^"|"$/g, ''); return row => { const x = row[k] ?? null; if (op === 'is') return v === 'null' ? x === null : String(x) === v; if (op === 'eq') return x !== null && String(x) === v; if (op === 'neq') return x !== null && String(x) !== v; throw Error('or op ' + op) } }); predicates.push(row => terms.some(t => t(row))); return query }, // reancorado KINEO-ADS-CONSERTOS-1410 — compose/active passou a filtrar platform com .or (Studio Ads fora, nulo dentro)
      insert(row) { action = 'insert'; value = row; return query },
      update(row) { action = 'update'; value = row; return query },
      delete() { action = 'delete'; return query },
      then(resolve, reject) { return Promise.resolve().then(async () => {
        operations.push({ action, table, filters: clone(filters) })
        if (table !== 'events' && action !== 'select') blocked()
        let rows = (table === 'events' ? events : table === 'credit_debits' ? options.debits ?? [] : []).filter(row => predicates.every(test => test(row)))
        if (action === 'insert') {
          if (value.id && events.some(row => row.id === value.id)) return { data: null, error: { code: '23505' } }
          if (value.name === 'cinematic_scene_retry_budget' && options.budgetInsertError) return { data: null, error: { code: 'transient' } }
          if (options.insertError) return { data: null, error: { code: 'transient' } }
          const row = clone({ ...value, created_at: new Date(clockNow).toISOString() })
          events.push(row)
          if (hookInsert) { const run = hookInsert; hookInsert = null; await run(api, row) }
          if (options.insertUncertain) return { data: null, error: { code: 'transient' } }
          return { data: null, error: null }
        }
        if (action === 'select' && rows.includes(birth) && filters.some(([key]) => key === 'id')) {
          birthReads++
          if (options.birthReadErrorAt === birthReads) return { data: null, error: { message: 'SENTINEL_SECRET' } }
        }
        if (action === 'update') {
          if (rows.includes(birth) && options.retargetThrows) throw Error('SENTINEL_SECRET')
          if (rows.includes(birth) && options.retargetFails) return { data: null, error: { message: 'SENTINEL_SECRET' } }
          if (options.markerFails && !rows.includes(birth)) return { data: null, error: { message: 'SENTINEL_SECRET' } }
          for (const row of rows) Object.assign(row, clone(value))
          if (rows.includes(birth) && options.retargetUncertain) return { data: null, error: { message: 'SENTINEL_SECRET' } }
        }
        if (action === 'delete') {
          if (options.deleteFails) return { data: null, error: { message: 'SENTINEL_SECRET' } }
          for (const row of rows) events.splice(events.indexOf(row), 1)
        }
        if (order) rows = [...rows].sort((a, b) => String(a[order.key]).localeCompare(String(b[order.key])) * (order.ascending ? 1 : -1))
        if (limit) rows = rows.slice(0, limit)
        return { data: clone(single ? rows[0] ?? null : rows), error: null }
      }).then(resolve, reject) },
    }
    return query
  } }
  const load = createOfflineLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: secret, FAL_KEY: options.noKey ? '' : 'synthetic-key', CRON_SECRET: 'offline-cron-secret' },
    mocks: {
      'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: userId } } }) } }) },
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/credits/refund': { refundRenderCredits: blocked },
      '@/lib/hollywood/router': {
        HOLLYWOOD_MODELS: { dialogue: modelKling, cinematic: modelKling, support: modelKling }, KLING3_I2V_MODEL: 'fal-ai/kling-video/o3/pro/image-to-video',
        H3_MODELS: { dialogue: modelH3, cinematic: modelH3, support: modelH3 }, H3_I2V_MODEL: modelI2V, H3_RESOLUTION: '768P', OMNI_I2V_MODEL: modelOmni,
        // KINEO-H3MAX-2026-10-13 — reancorado com motivo: a retomada passou a importar os endpoints do MiniMax H3 Max (motor novo, fundador 13/10)
        // e o interruptor de reescrita do H3; o dublê do router os fornece. O que este guardião prova (mutex antes do gasto) não mudou.
        H3MAX_MODELS: { dialogue: 'minimax/h3-max/text-to-video', cinematic: 'minimax/h3-max/text-to-video', support: 'minimax/h3-max/text-to-video' }, H3MAX_I2V_MODEL: 'minimax/h3-max/image-to-video', H3MAX_RESOLUTION: '768P', H3_PROMPT_EXPANSION: 'disabled',
      },
      '@/lib/openai': { openai: { chat: { completions: { create: async input => {
        ok(api.mutex(), 'Mutex exists before paid OpenAI caller')
        openaiPosts.push(clone(input))
        if (options.onOpenAI) await options.onOpenAI(api)
        return { choices: [{ message: { content: 'A safe rewrite of the original signed scene prompt.' } }] }
      } } } } },
      ...(options.mocks ?? {}),
    },
    globals: {
      Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clockNow])) } static now() { return clockNow } },
      console: { log: (...x) => logs.push(x), warn: (...x) => logs.push(x), error: (...x) => logs.push(x) },
      setTimeout: () => 1, clearTimeout() {},
      fetch: async (url, init) => {
        ok(api.mutex(), 'Mutex exists before every actual Fal POST')
        ok(url.startsWith('https://queue.fal.run/'), 'Only mocked Fal queue request is reached')
        eq(init.method, 'POST', 'Count real single-submit POST calls')
        posts.push({ url, body: JSON.parse(init.body) })
        if (options.onFetch) await options.onFetch(api)
        const outcome = (options.outcomes ?? [200])[posts.length - 1] ?? 200
        if (outcome === 'transport') throw Error('SENTINEL_SECRET')
        return { ok: outcome >= 200 && outcome < 300, status: outcome, headers: { get: () => '0' },
          text: async () => options.noRequestId ? '{}' : JSON.stringify(outcome === 200 ? { request_id: 'new-request-id-' + posts.length } : { detail: 'SENTINEL_SECRET' }) }
      },
    },
  })
  claims = load('@/lib/cinematic/claim'); compose = load('@/lib/composeClaim')
  const quality = 'cinematic_h3', cost = 45, model = options.model ?? modelH3
  const body = { generationId, sceneIndex: 0, oldRequestId: options.nullId ? null : 'old-request-id', model, sanitize: true, ...(options.body ?? {}) }
  for (const key of options.omit ?? []) delete body[key]
  const birthId = claims.cinematicClaimId(userId, generationId)
  const response = {
    generationId, quality, fal_request_ids: [options.nullId ? null : 'old-request-id', 'ready-request-id'], fal_models: [model, model],
    scene_prompts: ['The exact signed scene prompt with sufficient description.', 'Already completed signed scene prompt.'],
    scene_seconds: [8, 10], scene_anchor_urls: [options.noAnchor ? null : 'https://fixture.invalid/anchor.png', null],
    // A null slot cannot carry terminal proof for a provider ID it never had.
    // Integrated HMAC binding correctly rejects such an orphan proof.
    terminal_failed_jobs: options.notTerminal || options.nullId ? [] : [{ requestId: 'old-request-id', model }],
    ...(options.unknownNull ? {} : { submission_uncertain: options.uncertainNull ?? false }),
  }
  birth = { id: birthId, name: claims.CINEMATIC_CLAIM_EVENT, path: claims.CINEMATIC_CLAIM_PATH, user_id: userId,
    session_id: generationId, created_at: new Date(Date.now() - 10000).toISOString(),
    metadata: { generation_id: generationId, status: options.status ?? 'settled', fingerprint: 'a'.repeat(64), credit_cost: cost, quality, engine: model,
      fal_request_ids: response.fal_request_ids, fal_models: response.fal_models, authorized_completed_urls: [options.readyTarget ? 'https://fixture.invalid/target.mp4' : null, options.noReadyClip ? null : 'https://fixture.invalid/ready.mp4'],
      response, response_hash: '', resolution_reason: 'provider_submitted', resolution_reference: `cinematic-${birthId}` } }
  updateBirth = mutate => {
    mutate?.(birth.metadata)
    const m = birth.metadata
    m.response_hash = claims.cinematicValueHash(m.response)
    m.authority = claims.signCinematicClaim(secret, { claimId: birthId, userId, generationId, status: m.status, fingerprint: m.fingerprint,
      creditCost: m.credit_cost, quality: m.quality, engine: m.engine, falRequestIds: m.fal_request_ids, falModels: m.fal_models,
      authorizedCompletedUrls: m.authorized_completed_urls, responseHash: m.response_hash, resolutionReason: m.resolution_reason, resolutionReference: m.resolution_reference })
  }
  updateBirth()
  if (options.forged) birth.metadata.authority = '0'.repeat(64)
  events.push(birth)
  route = load('app/api/retry-hollywood-scene/route.ts')
  const args = { db, secret, userId, generationId }
  const api = { ...args, claims, compose, load, route, events, operations, posts, openaiPosts, logs, body, birth, updateBirth,
    advance: ms => { clockNow += ms },
    mutex: () => events.find(row => row.id === compose.composeClaimId(userId, generationId)),
    post: async override => clone(await route.POST({ json: async () => ({ ...body, ...override }) })),
    hold: () => load('@/lib/cinematic/sceneRetry').readVerifiedSceneRetryHold(args),
    active: () => load('app/api/compose/active/route.ts').GET(),
  }
  return api
}
