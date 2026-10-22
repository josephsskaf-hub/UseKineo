// KINEO-ADS-CENA-95-PACING-2110 — POST/start/runtime reais, fornecedores/ledger/DB offline; mutantes precisam quebrar uma asserção.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { PACING_FIXTURES, PACING_PHOTO, PACING_HOUSE, PACING_ORDER, pacingShort, pacingVerdict } from './test-support/ads-cena-95-pacing-fixtures-2110.mjs'
import { CENA95_PACING_BASE, CENA95_PACING_FILES, CENA95_PACING_NEW, CENA95_PACING_MARK, semAdsCena95Pacing2110 } from './test-support/desfaz-ads-cena-95-pacing-2110.mjs'

const MARK = 'KINEO-ADS-CENA-95-PACING-2110', TRAVA = '[TRAVA 8.2 — vai do fundador 21/10 "quero chegar a 9.5 de mínimo"]'
const F = { route: 'app/api/admin/ads-cena/route.ts', internal: 'lib/ads/cena/internal.ts', runtime: 'lib/ads/cena/runtime.ts', start: 'lib/ads/v2StartCore.ts', plan: 'lib/ads/cena/plan95.ts', repair: 'lib/ads/cena/script95Repair.ts', script: 'lib/ads/cena/script95.ts', policy: 'lib/ads/cena/speech95Policy.ts', preflight: 'lib/ads/cena/preflight95.ts', moderation: 'lib/ads/cena/moderation95.ts', composition: 'lib/ads/cena/composition95.ts', pipeline: 'lib/ads/cena/pipeline95.ts', adapters: 'lib/ads/cena/adapters95.ts', captions: 'lib/ads/cena/captions95.ts', montage: 'lib/ads/cena/montage95.ts', finish: 'lib/ads/cena/finish95.ts', advance: 'lib/ads/cena/runtime95.ts' }
const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const plain = x => JSON.parse(JSON.stringify(x)), same = (a, b, why) => assert.deepEqual(plain(a), plain(b), why)
const NOW = Date.parse('2026-10-22T12:00:00Z')
class FixedDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])) } static now() { return NOW } }
class OfflineResponse extends Response { static json(body, init = {}) { return new OfflineResponse(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } }) } }
const sourceLoader = (over = {}, mocks = {}, globals = {}) => createOfflineLoader({ mocks, source: (p, s) => over[p] ?? s, globals: { Request, Response, Headers, Error, Date: FixedDate, ...globals } })

function database(tables, effects) {
  return { tables, from(table) {
    assert.ok(table in tables, 'unexpected offline table ' + table)
    let change, insert, applied = false, result, limit = Infinity; const filters = []
    const q = { select() { return q }, order() { return q }, limit(n) { limit = n; return q }, eq(k, v) { filters.push(r => r[k] === v); return q }, in(k, values) { filters.push(r => values.includes(r[k])); return q }, is(k, v) { filters.push(r => v === null ? r[k] == null : r[k] === v); return q }, update(p) { change = p; return q }, insert(p) { insert = p; return q }, upsert(p) { insert = p; return q },
      exec(single = false) {
        if (!applied) { applied = true
          if (insert !== undefined) { const rows = (Array.isArray(insert) ? insert : [insert]).map(r => ({ id: PACING_ORDER, created_at: new Date(NOW).toISOString(), ...plain(r) })); tables[table].push(...rows); result = { data: rows, error: null }; effects.push(['db-insert', table, plain(rows)]) }
          else { const rows = tables[table].filter(r => filters.every(f => f(r))).slice(0, limit); if (change) { for (const r of rows) Object.assign(r, plain(change)); effects.push(['db-update', table, plain(change)]) } result = { data: rows.map(plain), error: null } }
        }
        return { data: single ? result.data[0] ?? null : result.data, error: result.error }
      }, maybeSingle() { return Promise.resolve(q.exec(true)) }, single() { return q.maybeSingle() }, then(resolve, reject) { return Promise.resolve(q.exec()).then(resolve, reject) },
    }; return q
  } }
}

/** Only boundaries are doubled. POST, internal planner, cenaJson and adsV2StartFor are always real modules. */
function world(fixture = pacingShort(), over = {}, options = {}) {
  const f = plain(fixture), effects = [], events = [], modelCalls = [], moderationCalls = [], tables = { ads_v2_orders: [], profiles: [{ id: PACING_HOUSE.id, video_credits: 1000 }], ads_v2_shots: [] }, admin = database(tables, effects)
  const access = { reason: 'internal', ownerId: PACING_HOUSE.id, admin }
  const blockMedia = (...args) => { effects.push(['unexpected-media', ...args]); throw new Error('paid transport must remain offline') }
  const shots = { submitShotOnce: async (endpoint, input) => { effects.push(['queue', endpoint, plain(input)]); return { kind: 'accepted', requestId: 'offline-job' } }, pollFalJob: async () => ({ state: 'pending', url: null }), persistShotClip: blockMedia }
  const billing = { adsV2BillingRef: () => 'offline-billing-ref', chargeAdsV2: async (_db, request) => { effects.push(['debit', plain(request)]); tables.profiles[0].video_credits -= request.cost; return { ok: true, balance: tables.profiles[0].video_credits } }, failAdsV2Order: async () => { effects.push(['refund']); return { won: true, refund: 'confirmed', amount: 41 } } }
  const compose = { CreatomateSubmitError: class extends Error {}, submitCreatomateRender: blockMedia, uploadVoiceoverToSupabase: blockMedia, estimateMp3DurationSeconds: () => 15 }
  const advance = { loadAdsV2Order: async (_db, id, uid) => ({ order: plain(tables.ads_v2_orders.find(r => r.id === id && r.user_id === uid) ?? null), error: null }), buildInitialShotRows: () => [], dispatchAdsV2Shots: async () => { effects.push(['legacy-dispatch']); return 0 }, loadAdsV2Shots: async () => [], adsV2View: o => ({ order_id: o.id, status: o.status }) }
  const moderateContent = async args => { moderationCalls.push(plain(args)); return options.moderate ? options.moderate(args, f) : { ok: true } }
  const mocks = {
    'next/server': { NextResponse: OfflineResponse, NextRequest: Request },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: options.user === undefined ? PACING_HOUSE : options.user } }) } }) },
    '../_shared/db': { isAdminEmail: email => email === PACING_HOUSE.email },
    '@/lib/ads/serverAccess': { loadAdsAccess: async () => access, adsGate: reason => reason === 'internal' ? 'ok' : 'no_access', adsSampleOpen: async () => false, isMissingAdsTable: () => false },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2Tiers': { adsV2Credits: () => 41, estimateAdUsd: () => ({ totalUsd: 1.23 }) },
    '@/lib/serverEvents': { writeServerEvent: async e => events.push(plain(e)) },
    '@/lib/safety/contentModeration': { moderateContent },
    '@/lib/ads/v2Billing': billing, '../v2Billing': billing,
    '@/lib/ads/v2Advance': advance,
    '@/lib/compose': compose, '@/lib/ttsFallback': { synthesizeTtsFallback: blockMedia },
    '../v2Shots': shots, '@/lib/ads/v2Shots': shots,
    '../v2Images': { persistSceneImage: blockMedia },
    '@/lib/userFootage': { FOOTAGE_PUBLIC_PREFIX: 'https://offline.example/footage/' },
    '@/lib/lyriaMusic': { submeterLyria: blockMedia, esperarLyria: blockMedia, lyriaPromptFor: x => x },
    './audio95Runtime': { synthesizeCena95NarratedVoice: async request => { effects.push(['voice', plain(request)]); return { url: 'https://offline.example/voice.mp3', durationMs: options.voiceMs ?? 14_000 } } },
    './frames95': { extractCena95Frames: blockMedia },
    '@/lib/openai': { openai: { chat: { completions: { create: async (request, transport) => {
      assert.equal(transport.maxRetries, 0); assert.equal(transport.timeout, 20_000); assert.equal(request.response_format.type, 'json_object')
      modelCalls.push(plain(request)); const vision = request.messages[1].content.some(p => p.type === 'image_url')
      const content = vision ? { category: f.category, confidence: .99, product: f.product, offer: '', benefits: [], photo_is_isolated_product: true } : f.raw
      return { choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 111, completion_tokens: 77 } }
    } } } } },
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000003' },
  }
  const load = sourceLoader(over, mocks)
  return { fixture: f, load, tables, admin, effects, events, modelCalls, moderationCalls,
    async post(dry_run = true, body = {}) { const response = await load(F.route).POST(new Request('https://offline.example/api/admin/ads-cena', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f.input, dry_run, ...body }) })); return { status: response.status, body: await response.json(), headers: response.headers } },
    async advance() { const o = plain(tables.ads_v2_orders[0]); await load(F.advance).advanceCena95Order(admin, o, { json: load(F.runtime).cenaJson, deadlineMs: NOW + 60_000, fail: async reason => { effects.push(['fail', reason]); tables.ads_v2_orders[0].status = 'failed' } }) },
  }
}

async function httpProof(over = {}) {
  for (const fixture of PACING_FIXTURES) {
    const dry = world(fixture, over), live = world(fixture, over), dr = await dry.post(true), lr = await live.post(false)
    assert.equal(dr.status, 200, JSON.stringify(dr.body)); assert.equal(lr.status, 202, JSON.stringify(lr.body))
    const saved = live.tables.ads_v2_orders[0].plan.cena.plan
    same(dr.body.plan, saved, 'HTTP dry/live planejam exatamente o mesmo texto, composição, voz e custos')
    same(dr.body.costs, lr.body.costs); same(lr.body.costs, saved.quality95.costs)
    assert.equal(dr.headers.get('cache-control'), 'no-store'); assert.equal(dr.body.charged, false)
    assert.equal(dry.effects.length, 0, 'dry não grava/debita/gera mídia'); assert.equal(dry.tables.ads_v2_orders.length, 0)
    assert.equal(live.effects.filter(e => e[0] === 'debit').length, 1); assert.equal(live.tables.profiles[0].video_credits, 959)
    assert.equal(live.effects.filter(e => ['queue', 'voice', 'unexpected-media', 'legacy-dispatch'].includes(e[0])).length, 0, 'POST real só inicia o estado durável')
    for (const w of [dry, live]) {
      const plan = w === dry ? dr.body.plan : saved, script = plan.script
      assert.equal(w.modelCalls.length, 2, 'classificador e roteiro passam pelo cenaJson real')
      assert.ok(w.modelCalls[0].messages[1].content.some(x => x.type === 'image_url' && x.image_url.url === fixture.input.foto))
      assert.equal(plan.quality95.planningUsage.calls, 2); assert.equal(plan.quality95.planningUsage.measuredCalls, 2)
      assert.equal(script.offer, fixture.input.oferta); assert.equal(script.cta, fixture.input.cta)
      assert.ok(script.narration.includes(fixture.input.oferta)); assert.ok(script.narration.endsWith(fixture.input.cta))
      assert.ok(script.words <= (fixture.input.language === 'pt' ? 32 : 38)); assert.ok(script.estimatedSeconds <= 15)
      assert.equal(script.wordsPerSecond, fixture.input.language === 'pt' ? 2.25 : 2.6, 'orçamento editorial conservador por idioma, sem afirmar velocidade medida')
      assert.equal(script.estimatedSeconds, script.words / script.wordsPerSecond + .35)
      assert.ok(script.normalization.sourceWords > script.words); assert.ok(script.normalization.removedSentences.length > 0)
      assert.ok(!/watch\s+(?:as|the)|\bthey\b|\btheir\b|veja|c[aâ]mera|Get buy|Aproveite compre|offers a does|oferece não/iu.test(script.narration))
      const R = w.load(F.repair), original = [...R.cena95Sentences(fixture.raw.pain), ...R.cena95Sentences(fixture.raw.demonstration)]
      for (const part of [script.pain, script.demonstration].filter(Boolean)) for (const sentence of R.cena95Sentences(part)) assert.ok(original.includes(sentence), 'nenhuma frase opcional cortada pela metade')
      assert.equal(w.moderationCalls.filter(c => c.text === script.narration).length, 1, 'a narração gerada é moderada também no dry; start reutiliza o veredicto da requisição')
      const counts = new Map(); for (const c of w.moderationCalls) counts.set(c.text, (counts.get(c.text) ?? 0) + 1)
      assert.ok([...counts.values()].every(n => n === 1), 'cada texto é moderado uma única vez por requisição')
      const prepared = w.load(F.preflight).cena95Preflight(script, plan.input, 'kling3', plan.quality95.presenter), voice = prepared.voiceRequest
      assert.equal(prepared.captions.words.length, script.words); assert.ok(prepared.captions.elements.length > 0)
      assert.equal(plan.quality95.costs.kling3.breakdown.find(x => x.component === 'narrated_voice').quantity, voice.billingCharacters)
      assert.equal(plan.quality95.costs.kling3.actualTotalUsd, null)
    }
    same(live.events.find(e => e.name === 'ads_cena_started').metadata.costs, dr.body.costs)
  }
}

async function moderationProof(over = {}) {
  for (const dry of [true, false]) for (const reason of ['blocked', 'unavailable']) {
    const w = world(pacingShort(), over, { moderate: args => args.text.includes('Which cream today?') ? { ok: false, reason } : { ok: true } }), r = await w.post(dry)
    assert.equal(r.status, reason === 'blocked' ? 422 : 503, JSON.stringify(r.body)); assert.equal(r.body.error, reason === 'blocked' ? 'moderation' : 'moderation_unavailable')
    assert.equal(w.effects.length, 0); assert.equal(w.tables.ads_v2_orders.length, 0)
  }
  const M = sourceLoader(over)(F.moderation), calls = [], verdict = { ok: false, reason: 'unavailable', trace: 'offline-full-verdict' }
  const memo = M.memoCena95Moderation(async a => { calls.push(plain(a)); return verdict }), request = { surface: 'ads_render', stage: 'input', userId: PACING_HOUSE.id, text: 'same text', imageUrls: [PACING_PHOTO] }
  const [a, b] = await Promise.all([memo(request), memo({ ...request, meta: { later: true } })]); same(a, verdict); same(b, verdict); assert.equal(calls.length, 1)
  await memo({ ...request, imageUrls: ['https://offline.example/other.png'] }); await memo({ ...request, userId: 'other-user' }); await memo({ ...request, stage: 'output' }); assert.equal(calls.length, 4, 'imagem/dono/etapa diferentes não compartilham autorização')
  await M.memoCena95Moderation(async a => { calls.push(plain(a)); return verdict })(request); assert.equal(calls.length, 5, 'cache não atravessa requisições')
}

async function coreProof(over = {}) {
  const load = sourceLoader(over), S = load(F.script), R = load(F.repair), f = pacingShort('pt')
  const parse = (...args) => { let value; assert.doesNotThrow(() => { value = S.parseCena95Script(...args) }, 'texto legítimo deve passar pelo contrato e pela honestidade'); return value }
  const baseline = sourceLoader({ [F.script]: git('show', CENA95_PACING_BASE + ':' + F.script) })(F.script)
  for (const c of PACING_FIXTURES) assert.throws(() => baseline.parseCena95Script(c.raw, c.input, c.product), /cena95_speech_pacing/, 'base falha por comprimento com os três ganchos já válidos')
  const coupon = { ...f.input, cta: 'Use o cupom GLOW10.' }, script = parse(f.raw, coupon, f.product)
  assert.equal(script.cta, coupon.cta); assert.ok(script.narration.endsWith(coupon.cta))
  const clauses = [
    ['pt', 'Não contém fragrância.', 'O produto não contém fragrância.'], ['pt', 'Pode ser usado diariamente.', 'O produto pode ser usado diariamente.'],
    ['en', 'Easy to clean.', 'It is easy to clean.'], ['en', 'Does not leave residue.', 'It does not leave residue.'], ['en', 'Up to 12 hours of battery life.', 'It offers up to 12 hours of battery life.'],
    ['en', 'Lightweight and comfortable.', 'It is lightweight and comfortable.'], ['pt', 'Leve e flexível.', 'O produto é leve e flexível.'], ['pt', 'É ajustável.', 'O produto é ajustável.'],
  ]
  for (const [language, benefit, expected] of clauses) { const c = pacingShort(language); const r = parse(c.raw, { ...c.input, beneficios: [benefit] }, c.product); assert.ok(r.rawBenefit.includes(expected), r.rawBenefit) }
  for (const c of PACING_FIXTURES) { const r = parse(c.raw, c.input, c.product); assert.equal(r.spokenOffer, c.input.oferta) }
  for (const raw of [{ ...f.raw, hooks: ['[smiles]', '[nods]', '[pauses]'] }, { ...f.raw, hooks: ['!!!', '...', '???'] }]) { const r = parse(raw, f.input, f.product); assert.match(r.hook, /[\p{L}\p{N}]/u); assert.ok(!/[\[\]]/u.test(r.hook)) }
  const modelDirectionCta = parse({ ...f.raw, cta: '[smiles]' }, { ...f.input, cta: undefined }, f.product)
  assert.equal(modelDirectionCta.cta, 'Escolha Creme GLOW.')
  for (const cta of ['Veja o Pulse.', 'Escolha KINEO [Pro].']) assert.equal(parse(f.raw, { ...f.input, cta }, f.product).cta, cta, 'CTA digitado não é confundido com instrução opcional')
  const vocalDirection = parse({ ...f.raw, pain: 'Speak slowly and smile.' }, f.input, f.product)
  assert.ok(!/speak slowly|smile/iu.test(vocalDirection.narration))
  const dirty = parse({ ...f.raw, pain: 'Watch the actor apply it while they follow their camera. Cures eczema. Save 50%.', cta: 'Use code GLOW50.' }, { ...f.input, cta: undefined }, f.product)
  assert.ok(!/watch the|they|their|eczema|50/iu.test(dirty.narration)); assert.ok(dirty.narration.endsWith('Escolha Creme GLOW.'))
  const retained = parse(f.raw, f.input, f.product); assert.equal(retained.pain, f.raw.pain, 'frase curta permanece completa')
  assert.ok(R.cena95Sentences('Dr. Smith pays 19.90 today. Next sentence.').length === 2, 'abreviação e decimal não são cortados')
  for (const dry of [true, false]) { const w = world(f, over), r = await w.post(dry, { oferta: Array(40).fill('oferta').join(' '), cta: 'Peça seu Creme GLOW.' }); assert.equal(r.status, 422, JSON.stringify(r.body)); assert.equal(r.body.error, 'cena95_required_speech_does_not_fit'); assert.equal(w.effects.length, 0) }
}

function compositionProof(over = {}) {
  const load = sourceLoader(over), C = load(F.composition), P = load(F.pipeline), catalog = load('lib/ads/cena/catalog.ts').CENA_CATALOG
  for (const category of Object.keys(catalog)) for (const mode of ['narrated', 'talking']) {
    const c = C.cena95Composition(category, 'product', mode), v = pacingVerdict()
    assert.ok(c.productDominant); assert.notEqual(c.format, 'athlete_demo'); assert.match(c.framing, /No full-body/); assert.equal(c.faceRequired, mode === 'talking')
    if (mode === 'narrated') Object.assign(v, { face_visible: false, natural_face: false, mouth_closed: false })
    for (const kind of ['base', 'person']) {
      assert.equal(P.judgeCena95(v, kind, mode === 'narrated', c).approved, true, 'mãos sem rosto são válidas no Produto narrado')
      for (const key of ['product_dominant', 'no_full_body', 'same_actor', 'same_wardrobe', 'own_hands_attached', 'five_fingers', 'product_faithful', 'real_scale']) assert.equal(P.judgeCena95({ ...v, [key]: false }, kind, mode === 'narrated', c).approved, false, key)
      assert.equal(P.judgeCena95({ ...v, face_visible: null }, kind, mode === 'narrated', c).approved, false)
      assert.equal(P.judgeCena95({ ...v, face_visible: true, natural_face: false }, kind, mode === 'narrated', c).approved, false)
      if (mode === 'narrated') assert.equal(P.judgeCena95({ ...v, face_visible: true, mouth_closed: false }, kind, true, c).approved, false)
      else assert.equal(P.judgeCena95({ ...v, face_visible: false }, kind, false, c).approved, false)
    }
    const ugc = C.cena95Composition(category, 'ugc', mode)
    assert.equal(ugc.format, catalog[category].format); assert.equal(ugc.interaction, catalog[category].interaction); assert.equal(ugc.productDominant, false)
  }
  assert.equal(P.judgeCena95({ ...pacingVerdict(), natural_face: false }, 'person', true).approved, false, 'juiz antigo mantém rosto obrigatório')
}

function captionProof(over = {}) {
  const C = sourceLoader(over)(F.captions), label = 'W'.repeat(300); let result
  assert.doesNotThrow(() => { result = C.cena95Captions({ text: label, language: 'en', speechWindows: [{ start: 0, end: 3, text: label }] }) }, 'palavra longa pagina em vez de gerar 502 ou encolher fonte')
  assert.equal(result.words[0].word, label); assert.ok(result.elements.length > 1)
  const shown = result.elements.map(e => e.text.replace(/\[color #[A-Fa-f0-9]+\]|\[\/color\]/gu, '').replace(/\n/gu, '')).join('')
  assert.equal(shown, label, 'todas as letras aparecem exatamente uma vez nas páginas')
  let end = 0
  for (const e of result.elements) { assert.ok(e.time >= end - 1e-6); assert.ok(e.duration > 0); end = e.time + e.duration; assert.equal(e.font_size, 63); assert.equal(e.y, '67%'); assert.equal(e.stroke_width, 7); assert.equal(e.clip, true); assert.equal(e.text_clip, true); assert.ok(!('background_color' in e)); assert.ok(1920 * .67 + e.height / 2 + e.stroke_width <= 1480) }
  assert.ok(Math.abs(end - 3) < 1e-5)
  const bracketed = C.cena95Captions({ text: 'GLOW[color] choose now', language: 'en', speechWindows: [{ start: 0, end: 3, text: 'GLOW[color] choose now' }] })
  assert.ok(bracketed.elements.some(e => e.text.includes('GLOW［color］'))); assert.ok(bracketed.elements.every(e => !e.text.includes('GLOW[color]')))
}

async function voiceOrderProof(over = {}) {
  for (const ms of [14_000, 300, 15_001]) {
    const w = world(pacingShort(), over, { voiceMs: ms }), r = await w.post(false)
    assert.equal(r.status, 202, JSON.stringify(r.body)); const state = w.tables.ads_v2_orders[0].plan.cena.score95
    state.phase = 'videos'; state.baseUrl = 'https://offline.example/approved-base.png'
    await w.advance()
    const voice = w.effects.findIndex(e => e[0] === 'voice'), queue = w.effects.findIndex(e => e[0] === 'queue')
    assert.ok(voice >= 0, 'voz é realmente medida no transporte antes de vídeo de pessoa')
    if (ms === 14_000) { assert.ok(queue > voice, 'nenhum gasto de pessoa precede a voz medida e o preflight'); assert.equal(w.tables.ads_v2_orders[0].plan.cena.score95.voiceSeconds, 14); const req = w.effects[voice][1]; assert.match(req.input.prompt, /<#0\.35#>/); assert.equal(req.estimated.wordsPerSecond, 2.6) }
    else { assert.equal(queue, -1, 'voz longa ou menor que a pausa falha antes de enviar vídeo de pessoa'); assert.ok(w.effects.some(e => e[0] === 'fail')); assert.equal(w.tables.ads_v2_orders[0].status, 'failed') }
  }
}

async function legacyProof(over = {}) {
  for (const dry of [true, false]) {
    const results = []
    for (const before of [false, true]) {
      const flag = read('lib/ads/cena/catalog.ts').replace("ADS_CENA_LIVE: 'off' | 'internal' = 'internal'", "ADS_CENA_LIVE: 'off' | 'internal' = 'off'")
      const sources = { ...over, 'lib/ads/cena/catalog.ts': flag, ...(before ? { [F.start]: git('show', CENA95_PACING_BASE + ':' + F.start) } : {}) }, w = world(pacingShort(), sources)
      w.tables.ads_v2_orders.push({ id: PACING_ORDER, user_id: PACING_HOUSE.id, status: 'planned', tier: 'commercial', seconds: 15, card_url: PACING_PHOTO, plan: { totalSeconds: 12.5, narration: 'Your product, made clear.', overlays: [], shots: [{ idx: 0, kind: 'text', role: 'hook', source: 'user_photo', cutSeconds: 12.5, prompt: '' }] } })
      const response = await w.load(F.start).adsV2StartFor(PACING_HOUSE, { reason: 'internal', ownerId: PACING_HOUSE.id, admin: w.admin }, async () => ({ order_id: PACING_ORDER, dry_run: dry }), NOW)
      results.push({ status: response.status, text: await response.text(), events: w.events, effects: w.effects, tables: w.tables })
    }
    same(results[0], results[1], 'interruptor off: resposta/eventos/escritas/débito idênticos à base2b')
  }
}

async function silenceProof(over = {}) {
  const f = pacingShort('en'); f.category = 'wearable'; f.product = 'Pulse'
  Object.assign(f.input, { frase: 'Pulse', cta: 'Buy.', voice_mode: 'talking' })
  Object.assign(f.raw, { hooks: ['Pulse?', 'Ready?', 'Choose?'], pain: '', cta: 'Buy.' })
  const w = world(f, over), r = await w.post(true)
  assert.equal(r.status, 200, JSON.stringify(r.body)); const plan = r.body.plan
  assert.equal(plan.script.narration, 'Pulse? Buy.')
  const A = w.load(F.adapters), P = w.load(F.pipeline), segments = A.cena95NativeSegments(plan.script, [3, 7, 5])
  same(segments.map(p => p.text), ['Pulse?', '', 'Buy.'])
  assert.equal(A.cena95WindowSpeech(plan.script, 'kling3', 0, 3), true); assert.equal(A.cena95WindowSpeech(plan.script, 'kling3', 3, 10), false); assert.equal(A.cena95WindowSpeech(plan.script, 'kling3', 10, 15), true)
  const requests = A.cena95VideoRequests(plan, 'kling3', 'https://offline.example/base.png')
  for (const j of requests.filter(j => j.family === 'person0')) {
    const prompts = j.input.multi_prompt
    assert.match(prompts[0].prompt, /Say ONLY: Pulse\?/u); assert.match(prompts[1].prompt, /NO spoken words/u); assert.match(prompts[1].prompt, /mouth closed/u); assert.ok(!prompts[1].prompt.includes('Say ONLY:'))
    assert.match(prompts[2].prompt, /Say ONLY: Buy\./u)
  }
  const silent = { ...pacingVerdict(), mouth_speaking: false, mouth_closed: true }, spoken = { ...pacingVerdict(), mouth_speaking: true, mouth_closed: false }
  assert.equal(P.judgeCena95(silent, 'person', false, plan.quality95.composition, false).approved, true)
  assert.equal(P.judgeCena95(spoken, 'person', false, plan.quality95.composition, false).approved, false)
  assert.equal(P.judgeCena95(silent, 'person', false, plan.quality95.composition, true).approved, false)
  assert.equal(P.judgeCena95(silent, 'person', false, plan.quality95.composition).approved, false, 'pedidos anteriores mantêm fala obrigatória')
  const state = P.newCena95State(plan, 'kling3').score95; state.phase = 'videos'; state.baseUrl = 'https://offline.example/base.png'
  state.jobs = requests.map((j, index) => ({ ...j, index: 100 + index, round: 1, status: 'done', url: 'https://offline.example/video-' + index + '.mp4', frames: Array.from({ length: 31 }, (_, k) => ({ url: 'https://offline.example/frame-' + index + '-' + k + '.png', t: k / 2 })) }))
  const judgeCalls = [], events = [], deps = { now: () => NOW, save: async () => {}, submit: async () => { throw new Error('unexpected submit') }, poll: async () => { throw new Error('unexpected poll') }, persist: async () => { throw new Error('unexpected persist') }, frames: async () => { throw new Error('unexpected extraction') }, event: async (...args) => events.push(args), json: async c => { judgeCalls.push(c); return c.text.includes('segment=use;') ? silent : spoken } }
  await P.stepCena95(state, deps)
  assert.equal(judgeCalls.length, 2); assert.match(judgeCalls[1].text, /no supplied spoken words: require mouth_closed=true/u)
  assert.equal(state.jobs[0].verdicts.hook.approved, true); assert.equal(state.jobs[0].verdicts.use.approved, true, 'assess deriva silêncio da janela3–10 e aprova a boca fechada')
}

async function finalOverlayProof(over = {}) {
  for (const long of [true, false]) {
    const f = pacingShort('en'); f.product = long ? 'A'.repeat(160) : 'Pulse'
    Object.assign(f.input, { frase: f.product, cta: long ? 'Buy now.' : '[color #FF0000]Pulse[/color].' })
    Object.assign(f.raw, { hooks: ['Your choice?', 'Ready?', 'Choose?'], pain: '', cta: f.input.cta })
    const w = world(f, over), r = await w.post(true)
    assert.equal(r.status, 200, JSON.stringify(r.body)); const plan = r.body.plan
    assert.equal(plan.script.cta, f.input.cta, 'o literal digitado permanece na fala')
    const prepared = w.load(F.preflight).cena95Preflight(plan.script, plan.input, 'kling3', plan.quality95.presenter, { product: plan.product })
    let elements; assert.doesNotThrow(() => { elements = w.load(F.montage).cena95FinalTextElements(plan, prepared.captions.words) }, 'preflight e montagem aceitam os mesmos nomes/CTA legítimos')
    same(prepared.finalText, elements, 'o preflight executa o MESMO layout final do render')
    assert.ok(elements.length > 0); assert.ok(elements.every(e => e.type === 'text' && e.time >= 13 && e.time + e.duration <= 15.000001 && !('background_color' in e)))
    const strips = e => e.text.replace(/\[color #FFD400\]|\[\/color\]/gu, '').replace(/\n/gu, ' ')
    if (long) {
      const pages = elements.filter(e => e.track === 44)
      assert.ok(pages.length > 1); assert.equal(pages.map(strips).join(''), f.product, 'nome longo aparece inteiro e na ordem')
      for (const e of pages) { assert.equal(e.font_size, 63); assert.equal(e.stroke_width, 7); assert.equal(e.clip, true) }
    } else {
      const shown = elements.filter(e => e.track === 46).map(strips).join(' ')
      assert.ok(shown.includes('［color #FF0000］Pulse［/color］.'), shown); assert.ok(!shown.includes('[color #FF0000]'), 'markup digitado não controla a cor do render')
      assert.ok(prepared.voiceRequest.input.prompt.includes(f.input.cta), 'escape visual não reescreve o pedido de voz')
    }
  }
  const w = world(pacingShort(), over), r = await w.post(true); assert.equal(r.status, 200)
  const legacy = plain(r.body.plan); delete legacy.script.normalization
  const current = w.load(F.montage).cena95FinalTextElements(legacy, []), old = sourceLoader({ ...over, [F.montage]: git('show', CENA95_PACING_BASE + ':' + F.montage) })(F.montage).cena95FinalTextElements(legacy, [])
  same(current, old, 'layout de pedido antigo não muda')
}

async function storedPreflightProof(over = {}) {
  const w = world(pacingShort(), over), dry = await w.post(true)
  assert.equal(dry.status, 200, JSON.stringify(dry.body)); const plan = plain(dry.body.plan)
  plan.script.narration = 'Broken text that does not preserve the canonical script.'
  w.tables.ads_v2_orders.push({ id: PACING_ORDER, user_id: PACING_HOUSE.id, status: 'planned', tier: 'commercial', seconds: 15, card_url: PACING_PHOTO, plan: { totalSeconds: 15, narration: plan.script.narration, overlays: [], shots: [{ idx: 0, kind: 'text', source: 'user_photo', cutSeconds: 15 }], cena: w.load(F.pipeline).newCena95State(plan, 'kling3') } })
  const response = await w.load(F.start).adsV2StartFor(PACING_HOUSE, { reason: 'internal', ownerId: PACING_HOUSE.id, admin: w.admin }, async () => ({ order_id: PACING_ORDER }), NOW)
  assert.equal(response.status, 502, 'start repete o mesmo preflight do plano salvo antes do débito'); assert.equal(w.effects.length, 0)
}

export async function proofPacingAll95(over = {}) { await httpProof(over); await moderationProof(over); await coreProof(over); compositionProof(over); captionProof(over); await voiceOrderProof(over); await storedPreflightProof(over); await silenceProof(over); await finalOverlayProof(over); await legacyProof(over) }

function undoProof() {
  assert.equal(CENA95_PACING_MARK, MARK); assert.equal(CENA95_PACING_BASE, '2b2ea93971ca7fef45ec1bfa46d94d48281bd934')
  assert.ok(CENA95_PACING_FILES.length > 0, 'a tabela exata não pode estar vazia')
  for (const p of CENA95_PACING_FILES) {
    const actual = read(p), before = git('show', CENA95_PACING_BASE + ':' + p)
    assert.ok(actual.includes(MARK), 'marca da camada: ' + p); assert.equal(semAdsCena95Pacing2110(actual, p), before, p)
    assert.equal(semAdsCena95Pacing2110(before, p), before, 'idempotência: ' + p)
    assert.equal(semAdsCena95Pacing2110(actual.replace(/\n/g, '\r\n'), p), before.replace(/\n/g, '\r\n'), 'CRLF: ' + p)
    assert.throws(() => semAdsCena95Pacing2110(actual + '\n// adulterado\n', p), /fonte divergente/)
    assert.notEqual(semAdsCena95Pacing2110(actual.replaceAll(MARK, 'REMOVED'), p), before, 'marca ausente não restaura fonte')
  }
  for (const p of ['scripts/test-ads-cena-95-pacing-2110.mjs', 'scripts/test-support/ads-cena-95-pacing-fixtures-2110.mjs']) assert.ok(CENA95_PACING_NEW.includes(p), 'novo guardião/fixture declarados')
  for (const p of CENA95_PACING_NEW) { assert.ok(readFileSync(p).length > 0, p); assert.throws(() => git('show', CENA95_PACING_BASE + ':' + p)) }
  const declared = new Set([...CENA95_PACING_FILES, ...CENA95_PACING_NEW]), changed = git('diff', '--name-only', CENA95_PACING_BASE).trim().split('\n').filter(Boolean)
  assert.ok(changed.length > 0 && changed.every(p => declared.has(p)), 'escopo exato: ' + changed.filter(p => !declared.has(p)).join(','))
  const subjects = git('log', '--format=%s', CENA95_PACING_BASE + '..HEAD').trim().split('\n').filter(Boolean)
  assert.ok(subjects.length > 0 && subjects.every(s => s.startsWith(MARK + ' ') && s.includes(TRAVA)), 'prefixo e autorização em todos os commits próprios')
}

/** Syntax/import failures are harness errors, never successful red mutants. */
async function redMutant(label, file, before, after, proof) {
  const original = read(file); assert.equal(original.split(before).length - 1, 1, 'âncora única: ' + label)
  const mutated = original.replace(before, after); assert.notEqual(mutated, original)
  const compiled = ts.transpileModule(mutated, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } })
  assert.ok(!(compiled.diagnostics ?? []).some(d => d.category === ts.DiagnosticCategory.Error), 'mutante deve ter sintaxe válida: ' + label)
  assert.doesNotThrow(() => new vm.Script(compiled.outputText), 'mutante deve compilar em JavaScript: ' + label)
  let failure
  try { await proof({ [file]: mutated }) } catch (e) { failure = e }
  assert.equal(failure?.code, 'ERR_ASSERTION', 'mutante precisa quebrar comportamento, não SyntaxError/import/transport: ' + label + ' ' + (failure?.stack ?? 'sobreviveu'))
  console.log('ok mutante vermelho: ' + label)
}

export async function runPacingGuard95() {
  await proofPacingAll95()
  console.log('ok pacing95: POST/cenaJson/start reais, paridade, moderação, núcleo, categoria, juiz, legenda, voz medida e legado')
  const mutations = [
    ['PT volta a fala rápida', F.policy, "locale === 'pt' ? 2.25", "locale === 'pt' ? 2.9", httpProof],
    ['EN volta a fala rápida', F.policy, "locale === 'es' ? 2.4 : 2.6", "locale === 'es' ? 2.4 : 2.9", httpProof],
    ['perde oferta digitada', F.repair, "const offer = input.oferta ?? ''", "const offer = ''", httpProof],
    ['ignora CTA digitado', F.repair, "input.cta ? stop(firstUpper(clean(input.cta))) :", "false ? stop(firstUpper(clean(input.cta))) :", coreProof],
    ['prefixa oferta imperativa', F.repair, 'offerIsSentence ? firstUpper(offer) :', 'false ? firstUpper(offer) :', coreProof],
    ['benefício PT vira frase quebrada', F.repair, "return stop('O produto ' + text)", "return stop('O produto oferece ' + text)", coreProof],
    ['benefício EN vira frase quebrada', F.repair, "return stop('It ' + text)", "return stop('It offers a ' + text)", coreProof],
    ['colchetes viram gancho vazio', F.repair, "if (!/[\\p{L}\\p{N}]/u.test(s)) return ''", 'if (false) return \'\'', coreProof],
    ['direção de cena entra na fala', F.repair, "if (!s || cena95VisualDirection(s)) return ''", "if (!s) return ''", coreProof],
    ['instrução vocal entra na fala', F.repair, 'speak|say|narrate|smile|pause|deliver', 'unmatched|say|narrate|smile|pause|deliver', coreProof],
    ['corta frase retida no meio', F.repair, "pain: pain.join(' ')", "pain: pain.join(' ').slice(0, 9)", coreProof],
    ['recusa cupom digitado no CTA', F.script, "typedCta: input.cta ?? ''", "typedCta: ''", coreProof],
    ['Produto volta ao protagonismo humano', F.composition, 'productDominant: true, faceRequired: talking', 'productDominant: false, faceRequired: talking', compositionProof],
    ['juiz exige rosto em Produto mãos-only', F.pipeline, "kind !== 'close' && composition?.productDominant === true", 'false', compositionProof],
    ['juiz permite corpo inteiro em Produto', F.pipeline, "['product_dominant', 'no_full_body']", "['product_dominant']", compositionProof],
    ['juiz ignora rosto visível ruim', F.pipeline, '|| r.face_visible === true', '|| false', compositionProof],
    ['palavra longa perde paginação', F.captions, 'if (run.length === 1 && captionLines(run, font, width * .84 - stroke * 2) === null)', 'if (false && run.length === 1 && captionLines(run, font, width * .84 - stroke * 2) === null)', captionProof],
    ['legenda deixa tamanho de mercado', F.captions, 'Math.round(height * 0.033)', 'Math.round(height * 0.05)', captionProof],
    ['legenda ganha caixa', F.captions, "fill_color: '#ffffff'", "background_color: '#000000', fill_color: '#ffffff'", captionProof],
    ['cache moderação deixa de deduplicar', F.moderation, 'if (!pending)', 'if (true)', httpProof],
    ['cache mistura imagens distintas', F.moderation, 'args.imageUrls ?? []', '[]', moderationProof],
    ['start repete moderação já feita', F.start, 'dependencies.moderate ?? moderateContent', 'moderateContent', httpProof],
    ['ignora bloqueio do texto gerado', F.internal, 'if (scriptSafety)', 'if (false)', moderationProof],
    ['start perde preflight antes de debitar', F.start, 'if (p.script?.normalization)', 'if (false)', storedPreflightProof],
    ['pessoa é enviada sem medir voz', F.advance, 'await prepareCena95Voice(s, audio)', 'void 0', voiceOrderProof],
    ['voz medida perde preflight', F.finish, 'cena95Preflight(s.plan.script, s.plan.input, s.route, p, { voiceSeconds: result.durationMs / 1000, product: s.plan.product })', 'void 0', voiceOrderProof],
    ['trecho vazio ainda manda falar', F.adapters, 'cena95NativeSilence(segment) ||', "'' ||", silenceProof],
    ['juiz perde expectativa de silêncio', F.pipeline, "speakingExpected === false ? 'mouth_closed' : 'mouth_speaking'", "'mouth_speaking'", silenceProof],
    ['assess não deriva fala da janela', F.pipeline, "kind === 'person' && s.plan.voice_mode === 'talking' && s.plan.script.normalization ?", "false ?", silenceProof],
    ['preflight deixa texto final para depois do gasto', F.preflight, 'const finalText = cena95FinalTextElements({ product: measured.product ?? input.frase, input, script }, captions.words)', 'const finalText = []', finalOverlayProof],
    ['texto final volta a interpretar colchetes', F.montage, "s.replace(/\\[/gu, '［').replace(/\\]/gu, '］')", 's', finalOverlayProof],
    ['texto final perde fallback de nome longo', F.montage, "if (repaired && error instanceof Error && error.message === 'cena_final_text_does_not_fit')", 'if (false)', finalOverlayProof],
  ]
  for (const m of mutations) await redMutant(...m)
  undoProof()
  console.log(`ok pacing95: ${mutations.length} mutantes reais; desfaz integral, CRLF, inventário e TRAVA`)
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await runPacingGuard95()
