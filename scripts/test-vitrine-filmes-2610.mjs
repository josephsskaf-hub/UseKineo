// KINEO-VITRINE-FILMES-2610 — execute current production sources with fake data.
// No env files, real credentials, network, provider calls or rendering.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import vm from 'node:vm'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'

const SELF = fileURLToPath(import.meta.url)
const ROOT = path.resolve(process.argv.find(a => a.startsWith('--root='))?.slice(7) || path.join(path.dirname(SELF), '..'))
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')
let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
const eq = (actual, expected, label) => { assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, label); checks++ }
const ID = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const NOW = '2026-10-26T12:00:00.000Z'
const ORIGIN = 'https://www.usekineo.com'
const ENV = { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'offline-fixture-only' }
const quiet = { log() {}, warn() {}, error() {} }
const forbid = () => { throw Error('LIVE ACCESS FORBIDDEN') }
function load(file, imports = {}, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { exports, require(name) {
    if (name in imports) return imports[name]
    if (name === 'server-only') return {}
    if (name === '@/lib/internalAccounts') return load('lib/internalAccounts.ts')
    if (name === '@/lib/engineLabel') return load('lib/engineLabel.ts')
    if (name === '@/lib/madeWithKineo') return pure
    throw Error('Unmocked dependency ' + name)
  }, console: quiet, process: { env: { ...ENV } }, URL, URLSearchParams, Headers, Request, Response, Date, AbortSignal, AbortController, setTimeout, clearTimeout, fetch: forbid, ...globals }, { filename: file, timeout: 5000 })
  return exports
}

const pure = load('lib/madeWithKineo.ts')
check(pure.SHOWCASE_CONSENT_SOURCE === 'vitrine_filmes_2610', 'showcase has a distinct explicit consent source')
const fixture = (overrides = {}) => ({
  id: ID, user_id: 'owner', title: 'A tiny explorer discovers the ocean', topic: 'A tiny explorer discovers the ocean',
  status: 'completed', video_url: 'https://fixture.supabase.co/storage/v1/object/public/videos/film.mp4',
  final_video_url: null, thumbnail_url: 'https://fixture.supabase.co/storage/v1/object/public/videos/poster.jpg',
  quality_mode: 'fast', duration: 15, created_at: '2026-10-26T11:57:00.000Z',
  published_at: NOW, published_via: pure.SHOWCASE_CONSENT_SOURCE,
  email: 'private-person@example.invalid', name: 'PRIVATE CUSTOMER NAME', script: 'PRIVATE PROVIDER TASK',
  prompt: 'PRIVATE PROMPT', ...overrides,
})
const film = pure.toShowcaseFilm(fixture(), 'outside@example.invalid', { language: 'pt', generationSeconds: 180 })
check(film && film.slug && film.playbackUrl, 'explicitly consented complete durable film is public')
check(film.isInternal === false, 'external film does not get internal badge')
for (const bad of [
  { published_at: null }, { published_at: '' }, { published_at: 'invalid-date' },
  { published_via: null }, { published_via: 'done_screen' }, { published_via: 'email_delivery' },
  { status: 'processing' }, { status: 'failed' }, { id: 'not-a-uuid' },
  { video_url: null }, { video_url: 'javascript:alert(1)' }, { video_url: 'http://fixture.supabase.co/film.mp4' },
  { video_url: 'https://fixture.supabase.co/film.mp4?token=expires' },
  { video_url: 'https://unknown.invalid/film.mp4' },
]) check(pure.toShowcaseFilm(fixture(bad), 'outside@example.invalid') === null, 'fail closed: ' + JSON.stringify(bad))
for (const email of [null, undefined, '', '   ']) check(pure.toShowcaseFilm(fixture(), email) === null, 'unknown owner cannot be mistaken for an external customer')
const internal = pure.toShowcaseFilm(fixture(), 'josephsskaf@gmail.com')
check(internal === null || internal.isInternal === true, 'internal film is excluded or explicitly marked')
for (const forbidden of ['user_id', 'email', 'name', 'prompt', 'script', 'published_via']) check(!(forbidden in film), 'DTO excludes ' + forbidden)
check(!JSON.stringify(film).includes('PRIVATE'), 'private source fields never leak through projection')
check(pure.showcaseIdFromSlug(film.slug) === ID, 'canonical slug resolves exact film id')
for (const bad of ['', 'other', '../' + film.slug, film.slug + '/extra']) check(pure.showcaseIdFromSlug(bad) === null, 'malformed slug rejected')
for (const locale of ['en', 'pt', 'es']) {
  const prefix = locale === 'en' ? '' : '/' + locale
  eq(pure.showcasePath(locale), prefix + '/made-with-kineo', 'localized hub path ' + locale)
  eq(pure.showcasePath(locale, film.slug), prefix + '/made-with-kineo/' + film.slug, 'localized film path ' + locale)
  const schema = pure.buildShowcaseSchema(film, locale)
  eq(schema['@type'], 'VideoObject', 'video schema type')
  check(schema.name === film.title && schema.uploadDate === film.publishedAt, 'schema is grounded in consented film')
  check(schema.contentUrl === film.playbackUrl && !!schema.thumbnailUrl, 'schema has crawlable media and thumbnail')
  check(!JSON.stringify(schema).includes('PRIVATE'), 'schema carries no private owner/source data')
}

// A small PostgREST emulator executes every real filter before returning rows.
// It records updates and supports compare-and-set failure without touching DB.
function database(options = {}) {
  const rows = options.rows || [fixture()]
  const profiles = options.profiles || [{ id: 'owner', email: 'outside@example.invalid' }]
  const calls = [], mutations = []
  let clients = 0
  const admin = { from(table) {
    const call = { table, filters: [], columns: null, range: null, limit: null, payload: null }; calls.push(call)
    const q = {
      select(columns) { call.columns = columns; return q },
      eq(k, v) { call.filters.push([k, 'eq', v]); return q },
      is(k, v) { call.filters.push([k, 'is', v]); return q },
      not(k, op, v) { call.filters.push([k, 'not:' + op, v]); return q },
      in(k, v) { call.filters.push([k, 'in', v]); return q },
      order(k, opts) { call.order = [k, opts]; return q },
      range(a, b) { call.range = [a, b]; return q },
      limit(v) { call.limit = v; return q },
      abortSignal() { return q },
      update(payload) { call.payload = payload; return q },
      single() { call.single = true; return q },
      maybeSingle() { call.single = true; return q },
      then(resolve, reject) {
        if (options.throwRead) return Promise.reject(Error('fixture database failure')).then(resolve, reject)
        let data = (table === 'profiles' ? profiles : rows).filter(r => call.filters.every(([k, op, v]) => {
          if (op === 'eq' || op === 'is') return r[k] === v
          if (op === 'not:is') return r[k] !== v && r[k] !== undefined
          if (op === 'in') return v.includes(r[k])
          throw Error('Unexpected filter ' + op)
        }))
        if (call.order) { const [key, spec] = call.order; data = [...data].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (spec?.ascending === false ? -1 : 1)) }
        if (call.range) data = data.slice(call.range[0], call.range[1] + 1)
        if (call.limit !== null) data = data.slice(0, call.limit)
        if (call.payload) {
          mutations.push(call)
          if (options.zeroRows) data = []
          else data = data.map(r => { Object.assign(r, call.payload); return r })
        }
        const error = call.payload ? options.updateError : options.readError
        return Promise.resolve({ data: call.single ? data[0] || null : data, error: error || null }).then(resolve, reject)
      },
    }
    return q
  } }
  return { admin, calls, mutations, client() { clients++; return admin }, get clients() { return clients } }
}

function server(options = {}) {
  const db = database(options)
  const mod = load('lib/madeWithKineoServer.ts', {
    '@supabase/supabase-js': { createClient: () => db.client() },
    '@/lib/lifecycle/freshFetch': { freshFetch: forbid },
  }, options.noEnv ? { process: { env: {} } } : {})
  return { ...db, mod }
}
let s = server({ rows: [fixture(), fixture({ id: OTHER, published_via: 'done_screen' }), fixture({ id: '33333333-3333-4333-8333-333333333333', published_at: null })] })
let listing = await s.mod.getShowcaseFilms(1)
check(listing.films.length === 1 && listing.films[0].id === ID, 'listing cannot enumerate unconsented or legacy public films')
check(s.calls.filter(c => c.table === 'videos').every(c => c.filters.some(([k, op, v]) => k === 'published_via' && op === 'eq' && v === pure.SHOWCASE_CONSENT_SOURCE)), 'anonymous video reads filter explicit showcase consent in database')
check(s.calls.filter(c => c.table === 'videos').every(c => c.filters.some(([k, op]) => k === 'published_at' && op === 'not:is')), 'anonymous video reads filter timestamp in database')
check(s.calls.filter(c => c.table === 'videos').every(c => c.filters.some(([k, op, v]) => k === 'status' && op === 'eq' && v === 'completed')), 'anonymous video reads filter completion in database')
check(s.calls.filter(c => c.table === 'videos').every(c => c.columns !== '*'), 'anonymous selects use a column allowlist')
s = server()
check((await s.mod.getShowcaseFilm(film.slug))?.id === ID, 'canonical detail loads consented film')
check(await s.mod.getShowcaseFilm('wrong-title--' + ID) === null, 'detail rejects a noncanonical alias')
s = server()
check(await s.mod.getShowcaseFilm('invalid') === null && s.calls.length === 0, 'invalid slug never queries database')
for (const options of [{ readError: { code: '503' } }, { throwRead: true }, { profiles: [] }, { profiles: [{ id: 'owner', email: null }] }, { noEnv: true }]) {
  s = server(options)
  check((await s.mod.getShowcaseFilms(1)).films.length === 0, 'listing fails closed on unavailable DB/owner classification')
  check(await s.mod.getShowcaseFilm(film.slug) === null, 'detail fails closed on unavailable DB/owner classification')
}
s = server({ rows: [fixture(), fixture({ id: OTHER, published_via: 'done_screen' })] })
const sitemapFilms = await s.mod.listShowcaseSitemapFilms()
check(sitemapFilms.length === 1 && sitemapFilms[0].id === ID, 'sitemap uses same explicit consent qualification as detail and grid')

class Reply extends Response {
  static json(body, init = {}) { return new Reply(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json', ...init.headers } }) }
}
function route(options = {}) {
  const db = database(options), events = []
  const serverModule = load('lib/madeWithKineoServer.ts', {
    '@supabase/supabase-js': { createClient: () => db.client() },
  }, options.noEnv ? { process: { env: {} } } : {})
  const user = options.noUser ? null : { id: options.userId || 'owner', email: 'outside@example.invalid' }
  const mod = load('app/api/video/showcase/route.ts', {
    'next/server': { NextResponse: Reply },
    '@supabase/supabase-js': { createClient: () => db.client() },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/lib/serverEvents': { writeServerEvent: async event => events.push(event) },
    '@/lib/madeWithKineoServer': serverModule,
    '@/lib/lifecycle/freshFetch': { freshFetch: forbid },
  }, options.noEnv ? { process: { env: {} } } : {})
  return { ...db, mod, events }
}
const request = (action = 'publish', options = {}) => new Request(ORIGIN + '/api/video/showcase', {
  method: 'POST', headers: { origin: options.origin || ORIGIN, 'content-type': 'application/json' },
  body: JSON.stringify({ videoId: options.id || ID, action }),
})
for (const [options, req, status] of [
  [{}, request('publish', { origin: 'https://evil.invalid' }), 403],
  [{ noUser: true }, request(), 401], [{ userId: 'intruder' }, request(), 404],
  [{}, request('invalid'), 400], [{}, request('publish', { id: 'bad-id' }), 400],
  [{ noEnv: true }, request(), 503],
]) {
  const r = route(options), response = await r.mod.POST(req)
  check(response.status === status, 'real API rejects unauthorized/invalid request with ' + status)
  check(r.mutations.length === 0 && r.events.length === 0, 'rejected request cannot write consent or emit success')
}
for (const row of [{ published_at: null, published_via: null }, { published_at: NOW, published_via: 'done_screen' }]) {
  const r = route({ rows: [fixture(row)] })
  const before = await r.mod.GET(new Request(ORIGIN + '/api/video/showcase?videoId=' + ID))
  check(before.status === 200 && (await before.json()).published === false, 'GET defaults private/legacy share to showcase OFF')
  check(r.mutations.length === 0, 'GET never creates consent')
  const result = await r.mod.POST(request())
  check(result.status === 200 && (await result.json()).published === true, 'owner can explicitly opt in private or already-shared film')
  check(r.mutations.length === 1, 'one confirmed opt in creates one mutation')
  const change = r.mutations[0]
  check(change.payload.published_via === pure.SHOWCASE_CONSENT_SOURCE && !!change.payload.published_at, 'consent marker and timestamp persisted together')
  check(change.filters.some(([k, op, v]) => k === 'user_id' && op === 'eq' && v === 'owner'), 'write filters exact owner')
  check(change.filters.some(([k]) => k === 'published_at'), 'write compares prior consent timestamp')
  check(change.filters.some(([k]) => k === 'published_via') && change.filters.some(([k]) => k === 'status'), 'write compares old consent source and completion status')
  check(result.headers.get('cache-control')?.includes('no-store'), 'owner mutation response cannot be cached')
}
for (const options of [{ zeroRows: true }, { updateError: { code: '503' } }]) {
  const r = route({ ...options, rows: [fixture({ published_at: null, published_via: null })] })
  const response = await r.mod.POST(request())
  check(response.status >= 400, 'lost CAS/write error is never reported as published')
  check(r.events.length === 0, 'unconfirmed mutation emits no consent success')
}
for (const bad of [{ status: 'processing' }, { status: 'failed' }, { video_url: null }, { video_url: 'https://unknown.invalid/temporary.mp4' }]) {
  const r = route({ rows: [fixture({ published_at: null, published_via: null, ...bad })] })
  check((await r.mod.POST(request())).status >= 400 && r.mutations.length === 0, 'incomplete/unplayable film cannot be opted in')
}
let r = route()
let response = await r.mod.POST(request('unpublish'))
check(response.status === 200 && (await response.json()).published === false, 'owner can revoke showcase publication')
check(r.mutations.length === 1 && r.mutations[0].payload.published_at === null && r.mutations[0].payload.published_via === null, 'revocation removes showcase and public /v consent')
r = route()
response = await r.mod.POST(request())
check(response.status === 200 && r.mutations.length === 0, 'repeat opt in is idempotent')

// A legacy signed link consents to a watch page, not the showcase. Its src is
// caller-controlled and must never impersonate the reserved showcase marker.
for (const source of [pure.SHOWCASE_CONSENT_SOURCE, 'email_delivery', 'done_screen']) {
  const db = database({ rows: [fixture({ published_at: null, published_via: null })] })
  class LegacyReply extends Reply {
    static redirect(url, options) { return new Response(null, { status: options.status, headers: { ...options.headers, Location: url } }) }
  }
  const legacy = load('app/api/video/publish/route.ts', {
    'next/server': { NextResponse: LegacyReply },
    '@supabase/supabase-js': { createClient: () => db.client() },
    '@/lib/serverEvents': { writeServerEvent: async () => {} },
    '@/lib/videoShareLink': { mintShareConfirmation: () => 'fixture-confirmation', verifyShareConfirmation: () => true, verifyShareToken: () => true },
  })
  const legacyResponse = await legacy.POST(new Request(ORIGIN + '/api/video/publish', {
    method: 'POST', headers: { origin: ORIGIN },
    body: new URLSearchParams({ v: ID, action: 'publish', confirmation: 'fixture-confirmation', src: source }),
  }))
  check(legacyResponse.status === 303 && db.mutations.length === 1, 'legacy explicit page sharing continues to work')
  check(db.mutations[0].payload.published_via === (source === pure.SHOWCASE_CONSENT_SOURCE ? 'email_delivery' : source), 'signed link cannot forge reserved showcase provenance through src')
  check(pure.toShowcaseFilm(fixture(db.mutations[0].payload), 'outside@example.invalid') === null, 'legacy page consent never enters the showcase')
}

// Exercise the existing /v privacy lookup as well as the new projection.
// A private film must stay missing even if the caller knows its UUID.
for (const publishedAt of [null, '']) {
  const db = database({ rows: [fixture({ published_at: publishedAt, published_via: null })] })
  let clientOptions, playbackFetch
  const legacy = load('lib/publicVideos.ts', {
    '@supabase/supabase-js': { createClient: (_url, _key, options) => { clientOptions = options; return db.client() } },
    '@/lib/scriptParser': { stripScriptMarkers: value => value },
    '@/lib/publicSurfacePolicy': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
    '@/lib/seriesContinuation': { normalizeSeriesSeed: value => value },
  }, { fetch(_url, init) { playbackFetch = init; return Promise.resolve({ ok: true }) } })
  check((await legacy.getPublicVideoResult(ID)).status === 'missing', 'existing /v private lookup remains missing')
  check(typeof clientOptions.global?.fetch === 'function', 'existing /v lookup has an explicit fresh-fetch boundary')
  await clientOptions.global.fetch(ORIGIN, { cache: 'force-cache' })
  check(playbackFetch.cache === 'no-store', 'existing /v consent read cannot retain a revoked consent in Data Cache')
}
const ogSource = read('app/v/[id]/opengraph-image.tsx')
check(ogSource.includes("dynamic = 'force-dynamic'") && ogSource.includes("fetchCache = 'force-no-store'"), 'public preview cannot outlive revoked consent in route cache')
check(ogSource.includes("cache: 'no-store'"), 'public preview also bypasses underlying Data Cache')

// The real OG route is a public bitmap boundary: a cleaned card title is not
// enough if the generated thumbnail still paints raw contact details.
const legacyTitles = load('lib/publicVideos.ts', {
  '@supabase/supabase-js': { createClient: forbid },
  '@/lib/scriptParser': { stripScriptMarkers: value => value },
  '@/lib/publicSurfacePolicy': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
  '@/lib/seriesContinuation': { normalizeSeriesSeed: value => value },
})
for (const raw of [
  { title: 'Film contact@example.invalid', topic: 'Ocean' },
  { title: '', topic: 'Ocean contact@example.invalid' },
]) {
  const db = database({ rows: [fixture(raw)] })
  const og = load('app/v/[id]/opengraph-image.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'next/og': { ImageResponse: class { constructor(element) { this.html = renderToStaticMarkup(element) } } },
    'next/navigation': { notFound() { throw Error('FIXTURE_NOT_FOUND') } },
    '@supabase/supabase-js': { createClient: () => db.client() },
    '@/lib/publicSurfacePolicy': { publicSurfaceAllowsRow: value => !!value },
    '@/lib/publicVideos': legacyTitles,
  })
  const bitmap = await og.default({ params: { id: ID } })
  check(!bitmap.html.includes('contact@example.invalid') && bitmap.html.includes('[redacted]'), 'generated OG never paints an email from title or topic fallback')
}
{
  const db = database({ rows: [fixture({ published_at: null })] })
  const og = load('app/v/[id]/opengraph-image.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'next/og': { ImageResponse: class { constructor() { throw Error('PRIVATE_BITMAP_CREATED') } } },
    'next/navigation': { notFound() { throw Error('FIXTURE_NOT_FOUND') } },
    '@supabase/supabase-js': { createClient: () => db.client() },
    '@/lib/publicSurfacePolicy': { publicSurfaceAllowsRow: value => !!value },
    '@/lib/publicVideos': legacyTitles,
  })
  await assert.rejects(() => og.default({ params: { id: ID } }), /FIXTURE_NOT_FOUND/); checks++
}

const generateSource = read('app/(dashboard)/generate/GenerateClient.tsx')
const downloadGuard = generateSource.match(/\{(downloadDelivered[^?\n]+)\? <ShowcaseConsent/)?.[1]
check(!!downloadGuard, 'post-download showcase entry has an explicit delivered-file gate')
const canOffer = new Function('downloadDelivered', 'publicVideoId', 'downloadedShowcaseVideoId', `return !!(${downloadGuard})`)
check(!canOffer(false, ID, null) && !canOffer(true, OTHER, ID) && !canOffer(true, ID, null), 'a download from another film cannot activate showcase consent for this film')
check(canOffer(true, ID, ID), 'confirmed download of this film exposes the opt-in')
check(generateSource.includes('if (delivered) {\n      setDownloadDelivered(true)\n      setDownloadedShowcaseVideoId(publicVideoId)'), 'per-film download receipt is set only after confirmed delivered outcome')

const copyModule = load('lib/madeWithKineoCopy.ts')
let visibleFilm = film
const page = load('components/MadeWithKineo.tsx', {
  'react/jsx-runtime': jsxRuntime,
  'next/link': { __esModule: true, default: props => React.createElement('a', props) },
  'next/navigation': { notFound() { throw Error('FIXTURE_NOT_FOUND') } },
  '@/lib/madeWithKineoCopy': copyModule,
  '@/lib/madeWithKineoServer': {
    async getShowcaseFilms() { return { films: visibleFilm ? [visibleFilm] : [], hasNext: false } },
    async getShowcaseFilm() { return visibleFilm },
  },
  '@/app/made-with-kineo/showcase.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
})
for (const locale of ['en', 'pt', 'es']) {
  const metadata = page.showcaseMetadata(locale)
  check(metadata.robots.index === true && metadata.alternates.canonical === ORIGIN + pure.showcasePath(locale), 'gallery indexable with locale canonical')
  for (const lang of ['en', 'pt', 'es']) check(metadata.alternates.languages[lang] === ORIGIN + pure.showcasePath(lang), 'localized gallery hreflang ' + lang)
  const detailMetadata = await page.showcaseFilmMetadata(film.slug, locale)
  check(detailMetadata.robots.index === true && detailMetadata.alternates.canonical === ORIGIN + pure.showcasePath(locale, film.slug), 'film indexable with unique locale canonical')
  const galleryHtml = renderToStaticMarkup(await page.MadeWithKineoGallery({ locale }))
  check(galleryHtml.includes(film.title) && galleryHtml.includes(film.engine) && galleryHtml.includes(film.language), 'real gallery SSR includes title, engine and language')
  check(galleryHtml.includes(pure.showcasePath(locale, film.slug)), 'gallery has crawlable individual watch link')
  check(galleryHtml.includes(copyModule.SHOWCASE_COPY[locale].cta) && galleryHtml.includes('/signup?'), 'localized free creation CTA rendered')
  const detailHtml = renderToStaticMarkup(await page.MadeWithKineoFilm({ locale, slug: film.slug }))
  check(detailHtml.includes('application/ld+json') && detailHtml.includes('VideoObject'), 'real film SSR emits VideoObject')
  check(detailHtml.includes('<video') && detailHtml.includes(film.playbackUrl), 'real film SSR exposes playable film')
}
visibleFilm = { ...film, isInternal: true }
check(renderToStaticMarkup(await page.MadeWithKineoGallery({ locale: 'pt' })).includes(copyModule.SHOWCASE_COPY.pt.internal), 'internal badge visibly rendered, not just present in DTO')
visibleFilm = { ...film, title: '</script><script>alert(1)</script>' }
const malicious = renderToStaticMarkup(await page.MadeWithKineoFilm({ locale: 'en', slug: film.slug }))
check(!malicious.includes('</script><script>') && malicious.includes('\\u003c'), 'untrusted title cannot terminate schema script')
visibleFilm = null
check((await page.showcaseFilmMetadata(film.slug, 'en')).robots.index === false, 'revoked/missing detail metadata is noindex')
await assert.rejects(() => page.MadeWithKineoFilm({ locale: 'en', slug: film.slug }), /FIXTURE_NOT_FOUND/); checks++
check(renderToStaticMarkup(await page.MadeWithKineoGallery({ locale: 'pt' })).includes(copyModule.SHOWCASE_COPY.pt.empty), 'empty gallery uses honest empty state without customer fixtures')
for (const locale of ['en', 'pt', 'es']) {
  const unknown = copyModule.showcaseProductionLine({ ...film, generationSeconds: null, inputWordCount: null }, locale)
  check(!/\d/.test(unknown), 'unknown creation time and word count are not invented')
  const known = copyModule.showcaseProductionLine({ ...film, generationSeconds: 180, inputWordCount: 7 }, locale)
  check(known.includes('3') && known.includes('7'), 'measured render interval and stored word count rendered')
}

// Execute the consent component's effects and click handler with a tiny hook
// driver: mounting performs only GET, then one explicit click performs POST.
const hookValues = [], effects = [], consentCalls = []
let hookIndex = 0, effectIndex = 0
const effectDeps = []
let savedReply = { published: false, path: null }
const consent = load('components/ShowcaseConsent.tsx', {
  'react/jsx-runtime': jsxRuntime,
  react: {
    useState(initial) {
      const index = hookIndex++
      if (!(index in hookValues)) hookValues[index] = initial
      return [hookValues[index], value => { hookValues[index] = typeof value === 'function' ? value(hookValues[index]) : value }]
    },
    useRef(initial) {
      const index = hookIndex++
      if (!(index in hookValues)) hookValues[index] = { current: initial }
      return hookValues[index]
    },
    useEffect(callback, deps) {
      const index = effectIndex++
      if (!effectDeps[index] || deps.some((value, at) => effectDeps[index][at] !== value)) { effects.push(callback); effectDeps[index] = deps }
    },
  },
  '@/components/InterfaceLanguage': { useInterfaceLanguage: () => 'pt' },
  '@/lib/madeWithKineoCopy': copyModule,
}, { async fetch(url, init = {}) {
  consentCalls.push({ url, init })
  if (init.method === 'POST') savedReply = { published: JSON.parse(init.body).action === 'publish', path: '/made-with-kineo/' + film.slug }
  return { ok: true, async json() { return savedReply } }
} })
const drawConsent = (videoId = ID) => { hookIndex = 0; effectIndex = 0; return consent.default({ videoId }) }
const elements = root => {
  const out = []
  function visit(node) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(visit); return }
    out.push(node); visit(node.props?.children)
  }
  visit(root); return out
}
let consentTree = drawConsent()
let toggle = elements(consentTree).find(node => node.type === 'button' && 'aria-pressed' in node.props)
check(toggle.props['aria-pressed'] === false && toggle.props.disabled === true, 'consent starts OFF and disabled while saved state unknown')
effects.splice(0).forEach(effect => effect())
await new Promise(resolve => setTimeout(resolve, 0))
check(consentCalls.length === 1 && !consentCalls[0].init.method, 'mount only reads owner privacy; it never publishes')
consentTree = drawConsent()
toggle = elements(consentTree).find(node => node.type === 'button' && 'aria-pressed' in node.props)
check(toggle.props['aria-pressed'] === false && toggle.props.disabled === false, 'saved OFF stays OFF before user action')
check(renderToStaticMarkup(consentTree).includes(copyModule.SHOWCASE_COPY.pt.explain), 'consent visibly explains search indexing and public title/theme')
await toggle.props.onClick()
check(consentCalls.length === 2 && consentCalls[1].init.method === 'POST' && JSON.parse(consentCalls[1].init.body).action === 'publish', 'only explicit owner click sends opt in')
consentTree = drawConsent()
toggle = elements(consentTree).find(node => node.type === 'button' && 'aria-pressed' in node.props)
check(toggle.props['aria-pressed'] === true, 'confirmed server success changes toggle to public')
await toggle.props.onClick()
check(JSON.parse(consentCalls.at(-1).init.body).action === 'unpublish', 'same control provides explicit revocation')

// The sitemap endpoint uses the very same projection; each localized watch
// URL is announced with its consent timestamp and proper XML escaping.
let feedFilms = [film]
const feed = load('app/made-with-kineo/sitemap.xml/route.ts', {
  '@/lib/madeWithKineoServer': { async listShowcaseSitemapFilms() { return feedFilms } },
})
let feedResponse = await feed.GET(), feedXml = await feedResponse.text()
check(feedResponse.headers.get('cache-control')?.includes('no-store'), 'sitemap is uncached so withdrawal affects next request')
for (const locale of ['en', 'pt', 'es']) check(feedXml.includes(ORIGIN + pure.showcasePath(locale, film.slug)), 'sitemap announces real localized film ' + locale)
check(feedXml.includes('<video:video>') && feedXml.includes('<lastmod>' + NOW + '</lastmod>'), 'sitemap has video extension and actual publication date')
feedFilms = []
feedXml = await (await feed.GET()).text()
check(!feedXml.includes(film.slug), 'withdrawn film immediately disappears from feed')
for (const prefix of ['', 'pt/', 'es/']) for (const suffix of ['page.tsx', '[slug]/page.tsx']) {
  const source = read('app/' + prefix + 'made-with-kineo/' + suffix)
  check(source.includes("dynamic = 'force-dynamic'") && source.includes("fetchCache = 'force-no-store'"), 'public route forces current privacy reads: ' + prefix + suffix)
}
check(read('app/robots.ts').includes('/made-with-kineo/sitemap.xml'), 'robots advertises showcase sitemap')
const cronSource = read('app/api/cron/submit-indexnow/route.ts')
check(cronSource.includes("fetchPublishedSitemap('/made-with-kineo/sitemap.xml')") && cronSource.includes('...showcaseSitemap.entries'), 'scheduled IndexNow consumes showcase feed through existing snapshot/budget flow')
check(read('scripts/submit-indexnow.mjs').includes("'/made-with-kineo/sitemap.xml'"), 'manual IndexNow backfill also consumes showcase feed')

const indexnow = load('lib/indexnow.ts')
const cronFetches = [], submissions = []
const cronDb = database({ rows: [] })
const cron = load('app/api/cron/submit-indexnow/route.ts', {
  'next/server': { NextResponse: Reply },
  '@supabase/supabase-js': { createClient: () => cronDb.client() },
  '@/lib/publicVideos': { listIndexablePublicVideos: async () => [], PUBLIC_BASE_URL: ORIGIN },
  '@/lib/indexnow': { ...indexnow,
    changedSinceSnapshot(current) { return current.map(entry => entry.loc) },
    async submitToIndexNow(urls, options) { submissions.push({ urls, options }); return { ok: true, submitted: urls.length, httpStatus: 0, skipped: [] } },
  },
}, {
  process: { env: { ...ENV, CRON_SECRET: 'offline-cron-only' } },
  async fetch(url) {
    cronFetches.push(url)
    return { ok: true, async text() { return url.endsWith('/made-with-kineo/sitemap.xml')
      ? `<urlset><url><loc>${ORIGIN}${pure.showcasePath('en', film.slug)}</loc><lastmod>${NOW}</lastmod></url></urlset>`
      : `<urlset><url><loc>${ORIGIN}/examples</loc><lastmod>${NOW}</lastmod></url></urlset>` } }
  },
})
let cronResponse = await cron.GET({ headers: new Headers({ authorization: 'Bearer wrong' }), nextUrl: new URL(ORIGIN + '/api/cron/submit-indexnow?dry=1') })
check(cronResponse.status === 401 && cronFetches.length === 0, 'IndexNow remains fail-closed before any crawl or submit')
cronResponse = await cron.GET({ headers: new Headers({ authorization: 'Bearer offline-cron-only' }), nextUrl: new URL(ORIGIN + '/api/cron/submit-indexnow?dry=1') })
check(cronResponse.status === 200 && submissions.length === 1, 'real scheduled IndexNow completes in offline dry run')
check(submissions[0].urls.includes(ORIGIN + pure.showcasePath('en', film.slug)), 'real cron carries consented film from showcase feed into submission')
check(submissions[0].options.dryRun === true && cronDb.mutations.length === 0, 'dry-run respects existing no-send/no-write contract')

console.log(`KINEO-VITRINE-FILMES-2610: ${checks} passed, 0 failed (real sources, offline).`)

if (process.argv.includes('--mutants')) {
  const files = [
    'lib/madeWithKineo.ts', 'lib/madeWithKineoServer.ts', 'lib/madeWithKineoCopy.ts', 'lib/engineLabel.ts',
    'lib/internalAccounts.ts', 'lib/publicVideos.ts', 'lib/indexnow.ts', 'components/MadeWithKineo.tsx',
    'components/ShowcaseConsent.tsx', 'app/api/video/showcase/route.ts', 'app/api/video/publish/route.ts',
    'app/(dashboard)/generate/GenerateClient.tsx', 'app/v/[id]/opengraph-image.tsx',
    'app/made-with-kineo/sitemap.xml/route.ts', 'app/robots.ts', 'app/api/cron/submit-indexnow/route.ts',
    'scripts/submit-indexnow.mjs',
    ...['', 'pt/', 'es/'].flatMap(prefix => ['page.tsx', '[slug]/page.tsx'].map(suffix => 'app/' + prefix + 'made-with-kineo/' + suffix)),
  ]
  const mutations = [
    ['legacy-consent-is-not-showcase', 'lib/madeWithKineo.ts', 'row.published_via !== SHOWCASE_CONSENT_SOURCE', 'false'],
    ['incomplete-video', 'lib/madeWithKineo.ts', "row.status !== 'completed'", 'false'],
    ['temporary-or-untrusted-playback', 'lib/madeWithKineo.ts', 'if (!isShowcaseMediaUrl(playbackUrl)) return null', 'if (false) return null'],
    ['internal-film-without-label', 'lib/madeWithKineo.ts', 'isInternal: isInternalEmail(ownerEmail)', 'isInternal: false'],
    ['identity-leak', 'lib/madeWithKineo.ts', 'id: row.id.toLowerCase(), slug:', 'email: ownerEmail, id: row.id.toLowerCase(), slug:'],
    ['missing-db-consent-filter', 'lib/madeWithKineoServer.ts', ".eq('published_via', SHOWCASE_CONSENT_SOURCE)", ''],
    ['write-owner-bypass', 'app/api/video/showcase/route.ts', ".eq('id', videoId).eq('user_id', user.id).eq('status', row.status)", ".eq('id', videoId).eq('status', row.status)"],
    ['cross-origin-consent', 'app/api/video/showcase/route.ts', 'if (origin && origin !== new URL(req.url).origin)', 'if (false)'],
    ['revocation-retains-public-page', 'app/api/video/showcase/route.ts', "undo ? { published_at: null, published_via: null }", "undo ? { published_at: now, published_via: SHOWCASE_CONSENT_SOURCE }"],
    ['publish-on-mount-default', 'components/ShowcaseConsent.tsx', 'aria-pressed={saved?.published ?? false}', 'aria-pressed={saved?.published ?? true}'],
    ['missing-film-soft-200', 'components/MadeWithKineo.tsx', 'if (!film) notFound()', 'if (!film) return null'],
    ['missing-video-schema', 'lib/madeWithKineo.ts', "'@type': 'VideoObject'", "'@type': 'WebPage'"],
    ['sitemap-cached-after-revocation', 'app/made-with-kineo/sitemap.xml/route.ts', "'Cache-Control': 'no-store, max-age=0'", "'Cache-Control': 'public, max-age=86400'"],
    ['indexnow-forgets-film-feed', 'app/api/cron/submit-indexnow/route.ts', '...sitemap.entries, ...showcaseSitemap.entries, ...videoEntries', '...sitemap.entries, ...videoEntries'],
    ['download-from-another-film', 'app/(dashboard)/generate/GenerateClient.tsx', 'downloadDelivered && publicVideoId && downloadedShowcaseVideoId === publicVideoId ?', 'downloadDelivered && publicVideoId ?'],
    ['revoked-v-page-cached', 'lib/publicVideos.ts', "cache: 'no-store'", "cache: 'force-cache'"],
    ['revoked-preview-cached', 'app/v/[id]/opengraph-image.tsx', "fetchCache = 'force-no-store'", "fetchCache = 'force-cache'"],
    ['preview-email-leak', 'app/v/[id]/opengraph-image.tsx', "raw.replace(/\\b[^\\s<>@]+@[^\\s<>@]+\\.[^\\s<>@]+\\b/g, '[redacted]')", 'raw'],
    ['legacy-source-forges-showcase-consent', 'app/api/video/publish/route.ts', ".replace(/^vitrine_filmes_2610$/, 'email_delivery')", ''],
  ]
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'kineo-vitrine-mutants-'))
  try {
    for (const [name, file, before, after] of mutations) {
      for (const sourceFile of files) {
        const destination = path.join(temporary, sourceFile)
        fs.mkdirSync(path.dirname(destination), { recursive: true })
        fs.writeFileSync(destination, read(sourceFile))
      }
      const source = read(file)
      assert.equal(source.split(before).length - 1, 1, 'unique mutation anchor ' + name)
      fs.writeFileSync(path.join(temporary, file), source.replace(before, after))
      const child = spawnSync(process.execPath, [SELF, '--root=' + temporary], { encoding: 'utf8', windowsHide: true, timeout: 60000 })
      assert.ok(child.status !== null && child.status !== 0, 'mutant survived/timed out: ' + name)
      assert.match(child.stderr, /AssertionError/, 'mutation must fail a contract assertion, not a loader/tool error: ' + name)
      console.log('KILLED ' + name)
    }
    console.log(`KINEO-VITRINE-FILMES-2610-MUTANTS: ${mutations.length} killed, 0 survived.`)
  } finally {
    const target = path.resolve(temporary), allowed = path.resolve(os.tmpdir()) + path.sep
    if (!target.startsWith(allowed) || !path.basename(target).startsWith('kineo-vitrine-mutants-')) throw Error('Unsafe temporary cleanup target')
    fs.rmSync(target, { recursive: true, force: true })
  }
}
