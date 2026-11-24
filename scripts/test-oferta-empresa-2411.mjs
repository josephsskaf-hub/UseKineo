import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { offlineCompanyOffer, renderToStaticMarkup, React, source } from './test-support/company-offer-2411.mjs'

const PAGE = 'app/company-video-service/page.tsx'
const VIEW = 'app/company-video-service/CompanyOfferPage.tsx'
const FORM = 'app/company-video-service/CompanyOfferForm.tsx'
const API = 'app/api/lead-capture/company-offer/route.ts'
const OLD_API = 'app/api/lead-capture/route.ts'
const ADMIN = 'app/api/admin/funnel/route.ts'
const EVENT_API = 'app/api/events/route.ts'
const REQUEST_EVENT = 'lib/growth/companyOfferRequests.ts'
const CONTACT = 'lib/growth/companyOfferContact.ts'
const RELEASE = 'lib/growth/companyOfferRelease.ts'
const ACCESS = 'lib/growth/companyOfferAccess.ts'
const INBOX = 'lib/growth/companyOfferInbox.ts'
const render = element => renderToStaticMarkup(element)
const fixture = 'team@example.invalid'
const start = '2026-11-24T21:00:00.000Z'
const publicUrl = 'https://www.usekineo.com'
const startTime = Date.parse(start)
class FixtureClock extends Date {
  constructor(...args) { super(...(args.length ? args : [startTime])) }
  static now() { return startTime }
}

function database(initial = [], failure = null) {
  const rows = new Map(initial.map(row => [row.email.toLowerCase(), { ...row }]))
  const events = new Map()
  const written = []
  const db = { from(table) {
    assert.ok(table === 'leads' || table === 'events')
    const records = table === 'leads' ? rows : events
    const filters = []
    let insert, update, sort
    const selected = () => [...records.values()].filter(row => filters.every(keep => keep(row)))
    const unavailable = () => ({ data: null, error: { code: 'fixture_error' } })
    const query = {
      insert(row) {
        const key = table === 'leads' ? row.email.toLowerCase() : row.id
        if (failure === table) insert = unavailable()
        else if (records.has(key)) insert = { data: null, error: { code: '23505' } }
        else {
          const record = {
            id: '00000000-0000-4000-a000-' + String(records.size + 2).padStart(12, '0'),
            ...row, created_at: start,
          }
          records.set(key, record)
          written.push([table, 'insert'])
          insert = { data: record, error: null }
        }
        return query
      },
      select() { return query },
      update(patch) { update = patch; return query },
      eq(column, value) { filters.push(row => row[column] === value); return query },
      ilike(column, pattern) {
        const exact = pattern.replace(/\\([\\%_*])/g, '$1')
        filters.push(row => row[column]?.toLowerCase() === exact.toLowerCase())
        return query
      },
      in(column, values) { filters.push(row => values.includes(row[column])); return query },
      gte(column, value) { filters.push(row => row[column] >= value); return query },
      order(column, { ascending }) {
        if (!sort) sort = (a, b) => String(a[column]).localeCompare(String(b[column])) * (ascending ? 1 : -1)
        return query
      },
      range(from, to) { return { data: selected().sort(sort).slice(from, to + 1), error: null } },
      limit(size) { return failure === 'lookup' ? unavailable() : { data: selected().slice(0, size), error: null } },
      single() { return insert ?? query.maybeSingle() },
      maybeSingle() { return { data: selected()[0] ?? null, error: null } },
      then(resolve, reject) {
        const data = selected()
        if (update) {
          for (const row of data) Object.assign(row, update)
          written.push([table, 'update'])
        }
        return Promise.resolve(insert ?? { data, error: null }).then(resolve, reject)
      },
    }
    return query
  } }
  return { db, rows, events, written, recover() { failure = null } }
}

function world({ release, viewer = 'external', failure, initial, edits = {}, formHooks, send, serviceKey = 'fixture-original', state = database(initial, failure) } = {}) {
  let authReads = 0
  let adminReads = 0
  let bodyReads = 0
  let clientEffects = 0
  const load = offlineCompanyOffer({
    replacements: {
      ...(release ? { [RELEASE]: source(RELEASE).replace("COMPANY_OFFER_RELEASE: CompanyOfferRelease = 'off'", "COMPANY_OFFER_RELEASE: CompanyOfferRelease = '" + release + "'") } : {}),
      ...edits,
    },
    mocks: {
      'lib/supabase/server.ts': { createClient: () => ({ auth: { getUser: async () => {
        authReads++
        if (viewer === 'error') return { data: {}, error: Error('fixture error') }
        if (viewer === 'guest') return { data: { user: null }, error: null }
        return { data: { user: { email: viewer === 'external' ? fixture : house, email_confirmed_at: viewer === 'unconfirmed' ? null : start } }, error: null }
      } } }) },
      '@supabase/supabase-js': { createClient: (_url, key) => { assert.equal(key, serviceKey); adminReads++; return state.db } },
      'lib/serverEvents.ts': { writeServerEvent() { throw Error('Unexpected notification channel') } },
      ...(formHooks ? { react: formHooks } : {}),
    },
    globals: {
      Date: FixtureClock,
      process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: serviceKey } },
      FormData: class { constructor(values) { this.values = values } get(key) { return this.values[key] ?? '' } },
    },
    fetch: async (...args) => {
      clientEffects++
      if (!send) throw Error('Unexpected outgoing fetch')
      return send(...args)
    },
  })
  const house = load('lib/internalAccounts.ts').INTERNAL_EXACT_EMAILS[0]
  async function request({ legacy = false, payload, headers = {}, raw } = {}) {
    const path = legacy ? '/api/lead-capture' : load(CONTACT).COMPANY_OFFER_CONTACT_ENDPOINT
    const body = raw ?? JSON.stringify(payload ?? { intent: load(CONTACT).COMPANY_OFFER_INTENT, email: fixture, website: '' })
    const req = new Request(publicUrl + path, {
      method: 'POST', body,
      headers: { Origin: publicUrl, 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.10', ...headers },
    })
    const original = req.body
    Object.defineProperty(req, 'body', { get() { bodyReads++; return original } })
    return (await load(legacy ? OLD_API : API).POST(req))
  }
  return { ...state, load, request, counts: () => [authReads, adminReads, bodyReads, clientEffects] }
}

async function pageHtml(fixtureWorld) {
  return render(await fixtureWorld.load(PAGE).default())
}
function change(file, before, after) {
  const text = source(file)
  assert.equal(text.split(before).length, 2, 'unique mutation anchor ' + before)
  return { [file]: text.replace(before, after) }
}

async function verifyOff(edits) {
  const w = world({ edits, viewer: 'house' })
  await assert.rejects(() => pageHtml(w), /OFF_404/, 'OFF page fails closed')
  assert.equal((await w.request()).status, 404, 'OFF POST fails closed')
  assert.deepEqual(w.counts(), [0, 0, 0, 0], 'OFF does not read auth, body, database or network')
}
async function verifyInternal(edits) {
  for (const viewer of ['guest', 'external', 'unconfirmed', 'error']) {
    const w = world({ release: 'internal', viewer, edits })
    await assert.rejects(() => pageHtml(w), /OFF_404/, 'INTERNAL denies outside confirmed house')
    assert.equal((await w.request()).status, 404, 'INTERNAL denies direct POST outside house')
    assert.deepEqual(w.counts().slice(1), [0, 0, 0])
  }
  const w = world({ release: 'internal', viewer: 'house', edits })
  assert.match(await pageHtml(w), /Product ads made for your next campaign/)
  assert.equal(w.load(PAGE).metadata.robots.index, false, 'INTERNAL noindex')
  assert.equal(w.load(PAGE).metadata.robots.follow, false)
  assert.equal((await w.request()).status, 200)
}
async function verifyPublic(edits) {
  const w = world({ release: 'public', viewer: 'guest', edits })
  const h = await pageHtml(w)
  assert.match(h, /by the Kineo AI team/, 'human service explicit')
  assert.match(h, /purchased separately from a software subscription/)
  assert.match(h, /4 finished ads/)
  assert.match(h, /3 business days/)
  assert.match(h, /2 business days/)
  assert.doesNotMatch(h, /\$\s*\d|\/api\/stripe|\/checkout/, 'no unapproved price or purchase')
  assert.deepEqual([...h.matchAll(/poster="(\/ads-exemplos\/[^"]+)"/g)].map(m => m[1]), ['/ads-exemplos/relogio.webp', '/ads-exemplos/caneca.webp'], 'only the house examples approved for this package')
  assert.match(h, /fictional products/)
  assert.match(h, /action="\/api\/lead-capture\/company-offer"/)
  assert.match(h, /data-clarity-mask="true"/)
  assert.equal(w.counts()[0], 0, 'public page does not contact auth')
  const meta = w.load(PAGE).metadata
  assert.notEqual(meta.title, '')
  assert.ok(!source('app/sitemap.ts').includes(w.load(CONTACT).COMPANY_OFFER_PATH), 'absent from the sitemap')
}
const priorBrief = {
  id: '00000000-0000-4000-a000-000000000001',
  email: fixture.toUpperCase(),
  source: 'b2b_agency_intake',
  magnet: 'monthly_20_49',
  created_at: '2026-10-01T00:00:00.000Z',
}

async function verifyStorage(edits) {
  const state = database([priorBrief])
  const w = world({ release: 'public', edits, state })
  const rotated = world({ release: 'public', edits, state, serviceKey: 'fixture-rotated' })
  const contact = w.load(CONTACT)
  const payload = { intent: contact.COMPANY_OFFER_INTENT, email: '  TEAM@example.invalid ', website: '', source: 'spoofed', name: 'ignored', price: 1 }
  const queue = w.load(INBOX).readCompanyOfferInbox
  const cutoff = '2026-11-20T00:00:00.000Z'
  const first = await w.request({ payload })
  assert.equal(first.status, 200)
  assert.equal((await first.json()).saved, true)
  assert.equal(first.headers.get('cache-control'), 'private, no-store')
  const beforeRotation = await queue(state.db, cutoff)
  const replay = await rotated.request({ payload })
  assert.equal(replay.status, 200)
  assert.equal((await replay.json()).saved, true)

  const survivingBrief = state.rows.get(fixture)
  assert.deepEqual(survivingBrief, priorBrief, 'previous attribution and brief remain byte-for-byte intact')
  assert.equal(w.load('lib/growth/b2bLead.ts').readB2BVolumeStorageKey(survivingBrief.magnet), '20_49')
  assert.deepEqual(state.written, [['events', 'insert']], 'one independent request after replay with the rotated credential')
  const [[requestId, request]] = [...state.events]
  assert.equal(request.path, contact.COMPANY_OFFER_PATH)
  assert.deepEqual(JSON.parse(JSON.stringify(request.metadata)), { lead_id: priorBrief.id }, 'event has only the internal lead identifier')
  const inbox = await rotated.load(INBOX).readCompanyOfferInbox(state.db, cutoff)
  assert.equal(inbox.length, 1, 'dispatcher places the proposal in the CEO inbox')
  assert.equal(inbox[0].email, priorBrief.email)
  assert.equal(inbox[0].createdAt, start, 'visible in current window for an old address')
  assert.equal(inbox[0].monthlyVolume, 'Company video service · proposal request')
  assert.equal(JSON.stringify(inbox), JSON.stringify(beforeRotation), 'credential rotation neither hides nor duplicates a request')
  assert.equal((await queue(state.db, '2026-11-25T00:00:00.000Z')).length, 0)
  const falseId = '99999999-9999-4999-a999-999999999999'
  state.events.set(falseId, { ...request, id: falseId })
  assert.equal((await queue(state.db, cutoff)).length, 1, 'mismatched event identity stays out of the inbox')
  assert.ok(state.events.has(requestId))
  assert.match(source(ADMIN), /readCompanyOfferInbox\(admin, periodIsoForReads\)/)
  assert.match(source(ADMIN), /leads: \[\.\.\.companyRequests,/)

  const forged = await w.request({ legacy: true, payload: { email: 'other@example.invalid', source: contact.COMPANY_OFFER_LEAD_SOURCE } })
  assert.equal(forged.status, 200)
  assert.equal(state.rows.get('other@example.invalid').source, 'unknown', 'legacy source is not allowed to masquerade as a service request')
  assert.equal(w.counts()[3] + rotated.counts()[3], 0, 'no notification or e-mail outside the admin inbox')
}

async function verifyErrors(edits) {
  for (const failure of ['leads', 'lookup', 'events']) {
    const w = world({ release: 'public', edits, failure, initial: failure === 'lookup' ? [priorBrief] : [] })
    const r = await w.request()
    assert.equal(r.status, 503, 'storage error stays an error: ' + failure)
    assert.equal((await r.json()).saved, false)
    assert.equal(w.events.size, 0)
    assert.equal(w.counts()[3], 0)
    if (failure === 'events') {
      assert.equal(w.rows.size, 1, 'the contact remains available for retry')
      w.recover()
      assert.equal((await w.request()).status, 200, 'partial failure leaves a reusable contact')
      assert.equal(w.rows.size, 1)
      assert.equal(w.events.size, 1)
    }
  }
}

async function verifySink(edits) {
  const w = world({ edits, viewer: 'guest' })
  const url = publicUrl + '/api/events'
  const name = w.load(REQUEST_EVENT).COMPANY_OFFER_REQUEST_EVENT
  const req = new Request(url, {
    method: 'POST', body: JSON.stringify({ name, path: w.load(CONTACT).COMPANY_OFFER_PATH, metadata: { lead_id: priorBrief.id } }),
    headers: { 'Content-Type': 'application/json' },
  })
  Object.defineProperty(req, 'nextUrl', { value: new URL(url) })
  const response = await w.load(EVENT_API).POST(req)
  const receipt = await response.json()
  assert.deepEqual([receipt.ignored, receipt.stored, response.status], [true, false, 200], 'browser cannot mint the inbox event')
  assert.deepEqual(w.counts(), [0, 0, 0, 0], 'public reservation runs before the generic sink accesses auth or storage')
  assert.equal(w.events.size, 0)
}
async function verifyProtocol(edits) {
  const w = world({ release: 'public', edits })
  const contact = w.load(CONTACT)
  assert.equal((await w.request({ headers: { Origin: 'https://other.invalid' } })).status, 403, 'foreign Origin denied')
  assert.equal((await w.request({ headers: { 'Content-Type': 'text/plain' } })).status, 415)
  assert.equal((await w.request({ payload: { email: fixture } })).status, 400, 'missing intent denied')
  assert.equal((await w.request({ payload: { intent: contact.COMPANY_OFFER_INTENT, email: 'invalid' } })).status, 400)
  assert.equal((await w.request({ raw: 'x'.repeat(1100) })).status, 413)
  assert.equal((await w.request({ payload: { intent: contact.COMPANY_OFFER_INTENT, email: fixture, website: 'robot' } })).status, 200)
  assert.equal((await w.request({ legacy: true })).status, 404, 'company intent rejected by legacy mailer route')
  assert.equal((await w.request({ payload: { intent: contact.COMPANY_OFFER_INTENT, email: 'invalid' } })).status, 400)
  assert.equal((await w.request({ payload: { intent: contact.COMPANY_OFFER_INTENT, email: 'invalid' } })).status, 400)
  assert.equal((await w.request()).status, 429, 'first-party public requests are throttled before storage')
  assert.deepEqual(w.counts().slice(1).filter((_, index) => index !== 1), [0,0], 'no storage or external side effect for rejected requests')
}
async function verifyForm(edits, success) {
  let status = 'idle'
  let request
  const formHooks = { useRef: value => ({ current: value }), useState: () => [status, value => { status = value }] }
  const w = world({ edits, formHooks, send: async (...args) => {
    request = args
    return Response.json({ saved: success })
  } })
  const Form = w.load(FORM).default
  await Form().props.onSubmit({ currentTarget: { email: fixture, website: '' }, preventDefault() {} })
  assert.equal(request[0], '/api/lead-capture/company-offer', 'form never hits the legacy mailer')
  assert.equal(JSON.parse(request[1].body).intent, w.load(CONTACT).COMPANY_OFFER_INTENT)
  const html = render(Form())
  if (success) assert.match(html, /role="status"[^>]*>Request received/)
  else assert.match(html, /role="alert"[^>]*>We couldn&#x27;t save your request/, 'soft failure is visible and retryable')
}

if (process.argv[2] === '--preview') {
  const dir = process.argv[3]
  const price = Number(process.argv[4])
  assert.ok(Number.isInteger(price) && price > 0)
  const publicWorld = world({ release: 'public' })
  await verifyOff()
  mkdirSync(dir, { recursive: true })
  const variant = render(React.createElement(publicWorld.load(VIEW).default, { monthlyPriceMinor: price }))
  writeFileSync(join(dir, 'proposta.html.fragment'), variant)
  const notFound = render(React.createElement(publicWorld.load('app/not-found.tsx').default))
  writeFileSync(join(dir, 'desligada.html.fragment'), notFound)
  console.log('OFF verificado; montagem de prévia local registrada como cenário, sem requisições.')
} else {
  await verifyOff()
  await verifyInternal()
  await verifyPublic()
  await verifyStorage()
  await verifyErrors()
  await verifyProtocol()
  await verifySink()
  await verifyForm({}, true)
  await verifyForm({}, false)
  const mutants = [
    ['page opens while OFF', change(PAGE, 'if (!await canViewCompanyOffer()) notFound()', 'if (false) notFound()'), verifyOff, /OFF page fails closed/],
    ['POST opens while OFF', change(API, 'if (!await canViewCompanyOffer())', 'if (false)'), verifyOff, /OFF POST fails closed/],
    ['INTERNAL accepts outsiders', change(ACCESS, 'return !error && !!data.user?.email_confirmed_at && contaDaCasaExata(data.user.email)', 'return true'), verifyInternal, /INTERNAL denies outside confirmed house/],
    ['internal page becomes indexable', change(PAGE, 'index: false', 'index: true'), verifyInternal, /INTERNAL noindex/],
    ['storage reports fake success', change(API, "if (leadError && leadError.code !== '23505') return reply(503, { saved: false })", "if (leadError && leadError.code !== '23505') return reply(200, { saved: true })"), verifyErrors, /storage error stays an error/],
    ['form posts to the legacy endpoint', change(FORM, 'fetch(COMPANY_OFFER_CONTACT_ENDPOINT,', "fetch('/api/lead-capture',"), edits => verifyForm(edits, true), /form never hits the legacy mailer/],
    ['form celebrates a soft failure', change(FORM, ' || receipt?.saved !== true', ''), edits => verifyForm(edits, false), /soft failure is visible and retryable/],
    ['origin guard disappears', change(API, "request.headers.get('origin') !== new URL(request.url).origin", 'false'), verifyProtocol, /foreign Origin denied/],
    ['an unrelated UGC example enters', change('lib/growth/companyOffer.ts', "'relogio', 'caneca'", "'relogio', 'halo-car-selfie'"), verifyPublic, /only the house examples approved/],
    ['inbox loses the service request', change(INBOX, ".eq('name', COMPANY_OFFER_REQUEST_EVENT)", ".eq('name', 'wrong_event')"), verifyStorage, /dispatcher places the proposal in the CEO inbox/],
    ['brief is replaced', change(API, 'const id = companyOfferRequestId(leadId)', "await db.from('leads').update({ source: 'overwritten', magnet: 'lost' }).eq('id', leadId)\n    const id = companyOfferRequestId(leadId)"), verifyStorage, /previous attribution and brief remain byte-for-byte intact/],
    ['browser accepts reserved inbox event', change(EVENT_API, "'company_offer_proposal_requested',", ''), verifySink, /browser cannot mint the inbox event/],
    ['event insert reports fake success', change(API, "if (requestError.code !== '23505') return reply(503, { saved: false })", "if (requestError.code !== '23505') return reply(200, { saved: true })"), verifyErrors, /storage error stays an error: events/],
  ]
  for (const [label, edits, verify, failure] of mutants) {
    await assert.rejects(() => verify(edits), error => error.code === 'ERR_ASSERTION' && failure.test(error.message), label)
    console.log('PASS mutant ' + label)
  }
  console.log('PASS real page, form, endpoint, and CEO inbox; OFF/internal/public; ' + mutants.length + ' behavior mutants')
}
