// KINEO-AMOSTRA-ANUNCIO-2410 — execute real entry/upload boundaries without SDKs, network or credentials.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { createOfflineLoader } from './offline-ts-loader.mjs'

const F = { page: 'app/(dashboard)/ads/v2/page.tsx', route: 'app/api/footage/route.ts', upload: 'lib/ads/uploadFootage.ts', account: 'lib/ads/cena/escolhaSampleServer.ts', personal: 'lib/ads/cena/escolhaPersonalAccess.ts', access: 'lib/ads/serverAccess.ts', policy: 'lib/ads/cena/escolhaSamplePolicy.ts' }
const ACTOR = '00000000-0000-4000-8000-000000000011', OWNER = '00000000-0000-4000-8000-000000000022', ORDER = '00000000-0000-4000-8000-000000000033'
const plain = x => JSON.parse(JSON.stringify(x))
const raw = (file, over) => over[file] ?? fs.readFileSync(path.resolve(process.cwd(), file), 'utf8').replace(/\r\n/g, '\n')
const compiled = new Map()

/** AST extraction retains the actual function bodies, including dynamic imports. Dependencies are explicit boundaries. */
function actual(file, names, bindings, over = {}) {
  const source = raw(file, over), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  assert.equal(ast.parseDiagnostics.length, 0, 'entry boundary source parses: ' + file)
  const selected = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text) || ts.isVariableStatement(n) && n.declarationList.declarations.some(d => names.includes(d.name.getText(ast))))
  for (const name of names) assert.ok(selected.some(n => ts.isFunctionDeclaration(n) ? n.name?.text === name : n.declarationList.declarations.some(d => d.name.getText(ast) === name)), `actual source declaration ${file}:${name}`)
  const text = selected.map(n => n.getText(ast)).join('\n') + '\n' + names.map(n => `exports.${n} = ${n};`).join('\n')
  const key = file + '\0' + text
  if (!compiled.has(key)) compiled.set(key, ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)
  const module = { exports: {} }
  new Function('module', 'exports', ...Object.keys(bindings), compiled.get(key))(module, module.exports, ...Object.values(bindings))
  return module.exports
}

function world(options = {}, over = {}) {
  const writes = [], accessCalls = [], signed = [], quotaActors = [], safety = []
  const user = options.loggedOut ? null : { id: ACTOR, email: 'person@example.org', ...(options.unconfirmed ? {} : { email_confirmed_at: '2026-10-24T12:00:00Z' }) }
  const tables = {
    profiles: [{ id: ACTOR, plan: options.paid ? 'pro' : 'free', has_paid: options.paid === true, video_credits: 0, trial_status: options.blocked ? 'blocked' : 'expired' }, { id: OWNER, plan: 'business', has_paid: true, video_credits: 500 }],
    ads_escolha_samples: options.used ? [{ actor_id: ACTOR, order_id: ORDER }] : [],
    ads_v2_orders: [{ id: 'old-close', user_id: ACTOR, status: 'delivered', billing_ref: 'adssample-old-close', plan: {} }, { id: ORDER, user_id: options.foreign ? OWNER : ACTOR, plan: { cena: { plan: { escolha: { marker: 'KINEO-ADS-ESCOLHA-2310', sample: 'KINEO-AMOSTRA-ANUNCIO-2410' } } } } }],
    user_footage: [],
  }
  const query = table => {
    const filters = []; let insert
    const result = single => {
      if (insert) { const row = { id: '00000000-0000-4000-8000-000000000044', ...insert }; tables[table].push(row); writes.push({ table, row: plain(row) }); insert = null }
      const rows = (tables[table] ?? []).filter(r => filters.every(f => f(r)))
      return { data: single ? rows[0] ?? null : rows, error: null }
    }
    const q = { select() { return q }, eq(k, v) { filters.push(r => r[k] === v); return q }, like(k, v) { filters.push(r => String(r[k] ?? '').startsWith(v.replace(/%$/, ''))); return q }, in(k, values) { filters.push(r => values.includes(r[k])); return q }, limit() { return q }, insert(v) { insert = v; return q }, single: async () => result(true), maybeSingle: async () => result(true), then(a, b) { return Promise.resolve(result(false)).then(a, b) } }
    return q
  }
  const admin = { auth: { admin: { getUserById: async id => { assert.equal(id, ACTOR); return { data: { user }, error: null } } } }, from: query, storage: { from: () => ({ createSignedUploadUrl: async p => { signed.push(p); return { data: { signedUrl: 'https://offline.invalid/signed', token: 'offline-token' }, error: null } } }) } }
  const createClient = () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: query })
  const pure = createOfflineLoader({ source: (file, text) => over[file] ?? text })
  const sample = pure('@/lib/ads/sample'), validation = pure('@/lib/emailValidation'), contract = pure('@/lib/ads/v2Contract')
  const policyText = raw(F.policy, over)
  const liveNode = ts.createSourceFile(F.policy, policyText, ts.ScriptTarget.Latest, true).statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText() === 'ADS_ESCOLHA_SAMPLE_LIVE'))
  const live = liveNode.declarationList.declarations[0].initializer.kind === ts.SyntaxKind.TrueKeyword
  const adsGate = reason => reason === 'none' ? 'no_access' : 'ok'
  const accountOld = actual(F.access, ['adsSampleAccountOk'], { adsSampleTrialStatusBlocked: sample.adsSampleTrialStatusBlocked, isDisposableEmail: validation.isDisposableEmail }, over).adsSampleAccountOk
  const oldOpen = actual(F.access, ['adsSampleOpen'], { ADS_SAMPLE_LIVE: true, adsGate, adsPassLive: () => true, adsSampleAccountOk: accountOld, ADS_SAMPLE_PREFIX: sample.ADS_SAMPLE_PREFIX }, over).adsSampleOpen
  const account = actual(F.account, ['TABLE', 'UUID', 'verifiedAccount', 'escolhaSampleAccountOk', 'escolhaSampleUsed'], { ADS_ESCOLHA_SAMPLE_LIVE: live, require: name => { assert.equal(name, '../serverAccess'); return { adsSampleAccountOk: accountOld } } }, over)
  const personal = actual(F.personal, ['isEscolhaPersonalOrder'], { isUuid: contract.isUuid, isEscolhaSamplePlan: p => p?.escolha?.marker === 'KINEO-ADS-ESCOLHA-2310' && p.escolha.sample === 'KINEO-AMOSTRA-ANUNCIO-2410' }, over).isEscolhaPersonalOrder
  const loadAdsAccess = async (id, email, opts) => { accessCalls.push({ id, opts }); return { admin, reason: options.paid ? 'plan' : 'none', role: options.team ? 'member' : 'owner', ownerId: options.team && opts?.workspace ? OWNER : ACTOR, ownerPlan: options.team ? 'business' : 'free' } }
  const next = { json: (body, init = {}) => ({ status: init.status ?? 200, body: plain(body) }) }
  const noop = async () => {}
  const post = actual(F.route, ['POST'], {
    createClient, NextResponse: next, TRIAL_ENTITLEMENT_COLUMNS: 'trial_status', PAID_PLANS: new Set(['starter', 'basic', 'pro', 'business']), getEffectiveEntitlement: (_p, o) => ({ treatAsPaid: o.isPaidAccount }), footageTier: () => options.paid ? 'studio' : 'free', retryOwnReadOnSkew: async () => null,
    loadAdsAccess, adsGate, adsSampleOpen: oldOpen, logFootageRefusal: noop, ADS_SAMPLE_FOOTAGE_MAX_BYTES: sample.ADS_SAMPLE_FOOTAGE_MAX_BYTES, FOOTAGE_QUOTA_PAID: 500 * 1024 * 1024,
    EXT_BY_MIME: { 'image/jpeg': 'jpg', 'video/mp4': 'mp4' }, totalFootageBytes: async id => { quotaActors.push(id); return options.usedBytes ?? 0 }, footageAdminClient: () => admin, ensureFootageBucket: noop, USER_FOOTAGE_BUCKET: 'user-footage', FOOTAGE_PUBLIC_PREFIX: () => 'https://offline.invalid/storage/',
    require: name => { assert.equal(name, '@/lib/ads/cena/escolhaSampleServer'); return account },
    fetch: async () => ({ ok: true, arrayBuffer: async () => new Uint8Array(options.videoBytes ? [0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109] : [255, 216, 255, 224]).buffer }), sniffMediaKind: pure('@/lib/safety/mediaKind').sniffMediaKind,
    moderateContent: async v => { safety.push(v); return { ok: true } }, quarantineObject: async () => { throw Error('offline quarantine forbidden') }, moderationRefusalMessage: () => 'refused', moderationRefusalStatus: () => 503,
    console: { log() {}, error() {} },
  }, over).POST
  const page = actual(F.page, ['AdsV2Page'], {
    adsSampleEntryOf: v => ['ugc', 'product'].includes(v) ? v : null, isUuid: contract.isUuid, URLSearchParams, createClient, redirect: destination => { throw Object.assign(new Error('redirect'), { destination }) }, loadAdsAccess, ADS_SAMPLE_PROBE_PARAM: 'sample_probe', adsSampleProbeOn: () => false, adsGate, isEscolhaPersonalOrder: personal, ADS_ESCOLHA_SAMPLE_LIVE: live, adsSampleOpen: oldOpen, writeServerEvent: noop, adsV2Visible: () => true,
    loadAdsWorkspaceLabel: async () => 'team', isTeamOwnerPlan: () => false, isAdsInternalEmail: () => false, KINEO1_35S_CREDITS: 25, adsVariationsVisible: () => false, producaoVisibleFor: () => false, PRODUCAO_PUBLIC: false, businessAdsOffer: () => null, cenaEnabled: () => true, AdsPresenterAllProvider: 'provider', AdsV2Client: 'AdsV2Client',
    require: name => { assert.equal(name, 'react/jsx-runtime'); return { jsx: (type, props) => ({ type, props }) } },
  }, over).AdsV2Page
  return { post: body => post({ json: async () => body }), page, personal, admin, tables, writes, signed, quotaActors, accessCalls, safety }
}

export async function runAdsSampleEntry2410(over = {}) {
  const photo = { action: 'upload-url', purpose: 'ads', contentType: 'image/jpeg', sizeBytes: 1024, ads_sample_escolha: true }
  const w = world({ team: true }, over)
  const allowed = await w.post(photo)
  assert.equal(allowed.status, 200, 'free account with the old Close sample used can upload for its unused choice sample')
  assert.ok(allowed.body.path.startsWith(ACTOR + '/'), 'sample upload lives in the actor folder, never in the team owner folder')
  assert.ok(w.quotaActors.every(id => id === ACTOR), 'personal sample uses only the actor storage quota')
  assert.ok(w.accessCalls.every(c => !c.opts?.workspace), 'personal sample never requests workspace access')
  const confirm = await w.post({ action: 'confirm', purpose: 'ads', path: allowed.body.path, sizeBytes: 1024, kind: 'video', ads_sample_escolha: true })
  assert.equal(confirm.status, 200)
  assert.equal(w.writes[0].row.user_id, ACTOR)
  assert.equal(w.writes[0].row.kind, 'image', 'server bytes override an untrusted client kind')
  assert.ok(!('created_by' in w.writes[0].row), 'personal sample never writes the team attribution')
  assert.equal(w.safety.length, 1, 'sample image retains content moderation')
  for (const opts of [{ unconfirmed: true }, { used: true }, { blocked: true }]) {
    const denied = world(opts, over)
    for (const body of [photo, { action: 'confirm', purpose: 'ads', path: `${ACTOR}/clip.jpg`, ads_sample_escolha: true }]) assert.equal((await denied.post(body)).status, 403, 'unconfirmed, used or antifarm-blocked account cannot upload/confirm')
    assert.equal(denied.signed.length, 0); assert.equal(denied.writes.length, 0)
  }
  const flagOff = { ...over, [F.policy]: raw(F.policy, over).replace('ADS_ESCOLHA_SAMPLE_LIVE = true', 'ADS_ESCOLHA_SAMPLE_LIVE = false') }
  assert.equal((await world({}, flagOff).post(photo)).status, 403, 'off switch closes new uploads')
  const video = world({}, over)
  assert.equal((await video.post({ ...photo, contentType: 'video/mp4' })).status, 402, 'sample upload-url rejects video')
  const videoConfirm = world({ videoBytes: true }, over)
  assert.equal((await videoConfirm.post({ action: 'confirm', purpose: 'ads', path: `${ACTOR}/clip.jpg`, kind: 'image', ads_sample_escolha: true })).status, 402, 'sample confirm rejects video bytes disguised as image')
  assert.equal(videoConfirm.writes.length, 0)
  assert.equal((await world({ usedBytes: 60 * 1024 * 1024 }, over).post(photo)).status, 409, 'sample storage quota is enforced at 60 MiB')
  const legacy = world({ paid: true, team: true }, over)
  const paid = await legacy.post({ ...photo, ads_sample_escolha: false })
  assert.equal(paid.status, 200); assert.ok(paid.body.path.startsWith(OWNER + '/'), 'paid upload without sample flag retains the Business owner path')
  assert.equal((await world({}, over).post({ ...photo, ads_sample_escolha: false })).status, 402, 'old used Close sample alone does not reopen paid footage')

  for (const params of [{ entry: 'ugc', order: ORDER.toUpperCase(), upgrade: '1' }, { order: 'https://outside.invalid/capture', upgrade: '1', redirect: 'https://outside.invalid', return_to: '//outside.invalid' }]) {
    let redirect
    try { await world({ loggedOut: true }, over).page({ searchParams: params }) } catch (e) { redirect = e.destination }
    assert.ok(redirect?.startsWith('/login?redirect='))
    const target = new URL(redirect, 'https://offline.invalid').searchParams.get('redirect')
    const url = new URL(target, 'https://offline.invalid')
    assert.equal(url.origin, 'https://offline.invalid'); assert.equal(url.pathname, '/ads/v2')
    if (params.entry) { assert.equal(url.searchParams.get('order'), ORDER); assert.equal(url.searchParams.get('upgrade'), '1'); assert.equal(url.searchParams.get('entry'), 'ugc') }
    else { assert.equal(url.search, '', 'login target refuses arbitrary destinations and invalid order IDs') }
  }
  const resume = world({}, flagOff), tree = await resume.page({ searchParams: { order: ORDER, upgrade: '1' } })
  assert.equal(tree.props.children.props.escolhaSample, true, 'off switch still allows a personal existing order to mount its result component')
  assert.equal(tree.props.children.props.sample, true)
  assert.equal(await world({ foreign: true }, over).personal(world({ foreign: true }, over).admin, ACTOR, ORDER), false, 'personal resume cannot borrow another owner order')
  await assert.rejects(() => world({}, flagOff).page({ searchParams: {} }), e => e.destination === '/ads?from=v2', 'flag off does not open a new free draft after Close was used')

  for (const sampleEscolha of [true, false]) {
    const requests = [], bindings = {
      prepareFootageFile: async input => ({ file: input, type: 'image/jpeg', kind: 'image' }), probeFootage: async () => ({ width: 800, height: 800, seconds: null }),
      readJson: async res => res.body, AdsUploadError: class extends Error {}, refusalFromStatus: () => new Error('upload refused'), URL: { createObjectURL: () => 'blob:offline' },
      fetch: async (url, req) => { const body = req.method === 'POST' ? JSON.parse(req.body) : null; requests.push({ url, method: req.method, body }); return { ok: true, body: body?.action === 'upload-url' ? { path: `${ACTOR}/clip.jpg`, signedUrl: 'https://offline.invalid/put', kind: 'image' } : body?.action === 'confirm' ? { item: { id: ORDER, url: 'https://offline.invalid/photo.jpg', kind: 'image' } } : {} } },
    }
    await actual(F.upload, ['uploadFootage'], bindings, over).uploadFootage({ size: 100, name: 'photo.jpg' }, sampleEscolha ? { sampleEscolha: true } : {})
    assert.deepEqual(requests.map(r => r.method), ['POST', 'PUT', 'POST'])
    const posts = requests.filter(r => r.method === 'POST')
    assert.ok(posts.every(r => r.body.purpose === 'ads'))
    for (const post of posts) assert.equal(post.body.ads_sample_escolha, sampleEscolha ? true : undefined, 'sample intent is present on both POSTs and absent from the unchanged paid upload')
  }
  return true
}

/** Every mutant must reach a semantic assertion; source lookup, import, parse or environment errors cannot count as kills. */
export async function runAdsSampleEntryMutants2410() {
  const mutants = [
    ['lifetime upload gate removed', F.route, '&& !await escolhaSampleUsed(acc.admin, user.id)', ''],
    ['sample inherits team owner folder', F.route, "body.ads_sample_escolha !== true && body.purpose === 'ads'", "body.purpose === 'ads'"],
    ['sample ignores byte type at confirm', F.route, "sampleUpload && kind !== 'image'", 'false'],
    ['sample quota disabled', F.route, 'sampleUpload && used + sizeBytes > ADS_SAMPLE_FOOTAGE_MAX_BYTES', 'false'],
    ['flag off opens new sample upload', F.account, 'return ADS_ESCOLHA_SAMPLE_LIVE && UUID.test(actorId)', 'return UUID.test(actorId)'],
    ['login drops saved sample order', F.page, "resumeQuery.set('order', resumeOrder.toLowerCase());", ''],
    ['personal result ignores account ownership', F.personal, ".eq('user_id', userId)", ''],
    ['browser loses confirm sample flag', F.upload, "action: 'confirm', path: start.path, kind: typeof start.kind === 'string' ? start.kind : kind, sizeBytes: file.size, purpose: 'ads', ...(opts.sampleEscolha ? { ads_sample_escolha: true } : {})", "action: 'confirm', path: start.path, kind: typeof start.kind === 'string' ? start.kind : kind, sizeBytes: file.size, purpose: 'ads'"],
  ]
  const killed = []
  for (const [label, file, from, to] of mutants) {
    const source = raw(file, {}), mutated = source.replace(from, to)
    assert.notEqual(source, mutated, 'mutant targets current source: ' + label)
    let failure
    try { await runAdsSampleEntry2410({ [file]: mutated }) } catch (e) { failure = e }
    assert.ok(failure instanceof assert.AssertionError, `mutant must die by assertion, not runtime setup: ${label}; ${failure?.stack ?? 'survived'}`)
    killed.push(label)
  }
  return killed
}
