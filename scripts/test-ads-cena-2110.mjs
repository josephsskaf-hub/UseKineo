// KINEO-ADS-CENA-2110 — principal guardião, executado com o loader VM offline da casa.
// Nenhuma credencial, env, banco, rede, fal ou OpenAI real. Dublês medem efeitos; mutantes alteram fontes executadas.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semAdsCena2110, ADS_CENA_2110_BASE, ADS_CENA_2110_ARQUIVOS, ADS_CENA_2110_NOVOS, MARCA_ADS_CENA_2110 } from './test-support/desfaz-ads-cena-2110.mjs'
const F = { cat: 'lib/ads/cena/catalog.ts', plan: 'lib/ads/cena/plan.ts', pipe: 'lib/ads/cena/pipeline.ts', adapt: 'lib/ads/cena/adapters.ts', montage: 'lib/ads/cena/montage.ts', runtime: 'lib/ads/cena/runtime.ts', internal: 'lib/ads/cena/internal.ts', route: 'app/api/admin/ads-cena/route.ts', start: 'lib/ads/v2StartCore.ts', captions: 'lib/ads/v2CenaQuality.ts' }
const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const plain = v => JSON.parse(JSON.stringify(v))
const same = (actual, expected, label) => assert.deepEqual(plain(actual), plain(expected), label)
const photo = 'https://offline.example/product.png', actor = 'https://offline.example/actor.png'
const customer = { foto: photo, frase: 'Pulse smartwatch for running. 7-day battery. Free shipping.', oferta: 'Free shipping', beneficios: ['7-day battery'], language: 'en', formato: 'ugc', actorUrl: actor }
const classification = { category: 'wearable', confidence: 0.9, product: 'Pulse smartwatch', offer: 'Free shipping', benefits: ['7-day battery'] }
const goodScript = { hooks: ['Need a watch for your run?', 'Take Pulse on your next run.', 'A smartwatch for your daily run.'], use: 'Wear Pulse while you run.', benefit: '7-day battery. Free shipping.', cta: 'Shop Pulse now.' }
const goodJudge = { own_hands_attached: true, extra_hands: false, extra_people: false, product_whole: true, product_faithful: true, real_scale: true, touching_face: false, actor_identity_match: true, score: 91 }
const jsonCalls = calls => async c => { calls.push(plain(c)); return c.images.length ? classification : goodScript }
function loader(over = {}, mocks = {}, globals = {}) { return createOfflineLoader({ mocks, globals: { Response, Request, ...globals }, source: (p, text) => over[p] ?? text }) }
async function makePlan(over = {}, route = 'kling3', values = {}) {
  const load = loader(over), P = load(F.plan), calls = []
  const plan = await P.planCena(P.cenaInput({ ...customer, ...values }), route, jsonCalls(calls))
  return { load, plan, calls, P }
}
async function classifierProof(over = {}) {
  const { plan, calls, P, load } = await makePlan(over)
  assert.equal(plan.category, 'wearable')
  const C = load(F.cat), expected = ['wearable', 'skincare', 'perfume', 'footwear', 'bag', 'bottle', 'supplement', 'other']
  same(Object.keys(C.CENA_CATALOG), expected)
  assert.equal(calls[0].model, 'gpt-4o-mini'); same(calls[0].images, [photo]); assert.equal(calls[0].text, customer.frase)
  assert.match(calls[0].system, /image AND the customer text/)
  for (const category of expected) {
    const c = await P.classifyCena(P.cenaInput(customer), async () => ({ ...classification, category }))
    assert.equal(c.category, category)
    const row = C.CENA_CATALOG[c.category]
    assert.ok(row.format && row.setting && row.actor && row.interaction && row.scale)
  }
  assert.match(plan.setting, /running track.*dawn/); assert.match(plan.interaction, /own wrist.*runs.*looks at the watch/)
  assert.match(C.CENA_CATALOG.skincare.setting, /bathroom/); assert.match(C.CENA_CATALOG.perfume.interaction, /sprays once.*away from the face/)
  assert.match(C.CENA_CATALOG.footwear.interaction, /puts on.*starts running/); assert.match(C.CENA_CATALOG.bag.interaction, /own shoulder/)
  assert.match(C.CENA_CATALOG.supplement.interaction, /prepares a serving/); assert.match(C.CENA_CATALOG.bottle.interaction, /pours the drink/)
  assert.equal((await P.classifyCena(P.cenaInput(customer), async () => ({ ...classification, confidence: 0.4 }))).category, 'other')
  await assert.rejects(P.classifyCena(P.cenaInput(customer), async () => ({ ...classification, category: 'imaginary' })), /cena_invalid_category/)
  await assert.rejects(P.classifyCena(P.cenaInput(customer), async () => ({ ...classification, benefits: ['waterproof'] })), /cena_extracted_fact_not_typed/)
  const auto = await P.planCena(P.cenaInput({ ...customer, actorUrl: undefined }), 'kling3', jsonCalls([]))
  assert.match(auto.input.actorUrl, /^https:\/\/www\.usekineo\.com\/ads\/presenters\//)
  assert.ok(C.CENA_ACTORS.wearable && C.CENA_ACTORS.skincare)
  return true
}
async function scriptProof(over = {}) {
  const { plan, calls, P } = await makePlan(over, 'veo31')
  assert.equal(calls[1].model, 'gpt-4o-mini'); assert.equal(plan.script.hooks.length, 3); assert.equal(new Set(plan.script.hooks).size, 3)
  assert.match(plan.script.narration, /7-day battery/); assert.match(plan.script.narration, /Free shipping/)
  assert.match(calls[1].text, /7-day battery/); assert.match(calls[1].text, /Free shipping/)
  assert.throws(() => P.cenaScript({ ...goodScript, benefit: 'Lovely design.' }, P.cenaInput(customer)), /cena_unsubstantiated_script/)
  assert.throws(() => P.cenaScript({ ...goodScript, cta: 'Last chance today. Sale ends soon.' }, P.cenaInput(customer)), /cena_unsubstantiated_script/)
  assert.throws(() => P.cenaScript({ ...goodScript, use: 'Experience the difference.' }, P.cenaInput(customer)), /cena_unsubstantiated_script/)
  for (const use of ['Experience the convenience and style.', 'Enjoy it.', 'Embrace the essence.']) assert.throws(() => P.cenaScript({ ...goodScript, use }, P.cenaInput(customer)), /cena_empty_copy/)
  assert.throws(() => P.cenaScript({ ...goodScript, use: 'I use Pulse every day.' }, P.cenaInput(customer)), /cena_unsubstantiated_script/)
  assert.throws(() => P.cenaScript({ ...goodScript, use: Array(41).fill('Pulse').join(' ') }, P.cenaInput(customer)), /cena_unsubstantiated_script/)
  assert.throws(() => P.cenaScript({ ...goodScript, hooks: [goodScript.hooks[0], goodScript.hooks[0], goodScript.hooks[0]] }, P.cenaInput(customer)), /cena_invalid_script/)
  let shots = 0
  await assert.rejects(P.planCena(P.cenaInput(customer), 'veo31', async c => { if (c.images.length) return classification; shots++; return { ...goodScript, benefit: 'Lovely design.' } }), /cena_unsubstantiated_script/)
  assert.equal(shots, 2, 'roteiro tem teto de correção')
  assert.match(plan.videoPrompt, /0–3s.*3–10s.*10–13s.*13–15s/)
  assert.match(plan.videoPrompt, /only a head-and-shoulders shot may show a talking face/)
  assert.match(plan.videoPrompt, /real uploaded packshot/); assert.match(plan.keyframePrompts[0], /OPENING KEYFRAME/); assert.match(plan.keyframePrompts[1], /USE KEYFRAME/)
  const s1 = plan.segmentPrompts[0], s2 = plan.segmentPrompts[1]
  assert.ok(s1.includes(plan.script.hook)); assert.ok(!s2.includes(plan.script.hook)); assert.match(s2, /No opening hook/)
  const spoken1 = s1.split('say ONLY: ')[1].split('. End mid-action.')[0]
  const spoken2 = s2.split('say ONLY: ')[1].split('. No opening hook.')[0]
  const words = t => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()
  assert.equal(words(spoken1 + ' ' + spoken2), words(plan.script.narration), 'Veo duas falas cobrem roteiro uma vez')
  return true
}
async function judgeProof(over = {}) {
  const P = loader(over)(F.plan)
  assert.equal(P.judgeCena(goodJudge).approved, true)
  for (const key of ['own_hands_attached', 'product_whole', 'product_faithful', 'real_scale', 'actor_identity_match']) {
    assert.equal(P.judgeCena({ ...goodJudge, [key]: false }).approved, false, key)
    const unknown = { ...goodJudge }; delete unknown[key]; assert.equal(P.judgeCena(unknown).approved, false, 'unknown ' + key)
  }
  for (const key of ['extra_hands', 'extra_people', 'touching_face']) {
    assert.equal(P.judgeCena({ ...goodJudge, [key]: true }).approved, false, key)
    assert.equal(P.judgeCena({ ...goodJudge, [key]: null }).approved, false, 'uncertain ' + key)
  }
  assert.equal(P.judgeCena({ ...goodJudge, score: 79 }).approved, false)
  assert.equal(P.judgeCena('not JSON').approved, false)
  assert.match(P.CENA_JUDGE_QUESTION, /continuous wrist\/forearm ownership/)
  return true
}
function pipelineDouble(s, options = {}) {
  const saves = [], submits = [], events = [], judged = [], polls = []
  let tick = 1_000_000
  const d = { now: () => tick, save: async state => saves.push(plain(state)), event: async (name, metadata) => events.push({ name, ...plain(metadata) }),
    json: async call => { judged.push(plain(call)); return options.verdict?.(call, judged.length) ?? { ...goodJudge, score: judged.length % 2 === 1 ? 85 : 97 } },
    submit: async job => {
      const saved = saves.at(-1)?.jobs.find(j => j.kind === job.kind && j.index === job.index)
      assert.equal(saved?.status, 'submitting', 'intenção durável antes do POST')
      if (job.kind === 'video') assert.ok(s.keyframes?.length === 2 && [0, 1].every(slot => s.jobs.some(j => j.kind === 'image' && Math.floor(j.index / 2) === slot && j.verdict?.approved)), 'nenhum vídeo antes do juiz dos dois grupos')
      submits.push(plain(job)); return options.submit?.(job, submits.length) ?? { kind: 'accepted', requestId: 'request-' + submits.length }
    },
    poll: async job => { polls.push(plain(job)); return options.poll?.(job) ?? { state: 'done', url: 'https://offline.example/provider-' + job.kind + job.index } },
    persist: async (job, attempt) => options.persist?.(job, attempt) ?? 'https://offline.example/stored-' + job.kind + '-' + attempt + '-' + job.index,
  }
  return { d, saves, submits, events, judged, polls, setTime: t => { tick = t } }
}
async function drive(pipe, s, d, limit = 50) { for (let n = 0; n < limit && !['ready', 'failed'].includes(s.phase); n++) await pipe.stepCena(s, d); return s }
async function pipelineProof(over = {}) {
  const { load, plan } = await makePlan(over), pipe = load(F.pipe)
  const s = pipe.newCenaState(plan, 'kling3'), w = pipelineDouble(s)
  await drive(pipe, s, w.d)
  assert.equal(s.phase, 'ready'); assert.equal(w.submits.filter(j => j.kind === 'image').length, 4)
  assert.equal(w.submits.filter(j => j.kind === 'video').length, 1)
  assert.equal(s.keyframe, 'https://offline.example/stored-image-1-1', 'best of two escolhe maior nota')
  same(s.keyframes, ['https://offline.example/stored-image-1-1', 'https://offline.example/stored-image-1-3']); assert.equal(w.judged.length, 4); same(w.judged[0].images, [photo, 'https://offline.example/stored-image-1-0', actor])
  const bad = pipe.newCenaState(plan, 'kling3'), bw = pipelineDouble(bad, { verdict: () => ({ ...goodJudge, own_hands_attached: false }) })
  await drive(pipe, bad, bw.d)
  assert.equal(bad.phase, 'failed'); assert.equal(bad.imageRound, 2)
  assert.equal(bw.submits.filter(j => j.kind === 'image').length, 8); assert.equal(bw.submits.filter(j => j.kind === 'video').length, 0)
  assert.equal(bw.events.filter(e => e.name === 'ads_cena_keyframe_retry').length, 1)
  const missing = pipe.newCenaState(plan, 'kling3'), mw = pipelineDouble(missing, { verdict: (_call, n) => ({ ...goodJudge, actor_identity_match: n % 4 < 3 && n % 4 !== 0 }) })
  await drive(pipe, missing, mw.d); assert.equal(missing.phase, 'failed'); assert.equal(mw.submits.filter(j => j.kind === 'video').length, 0, 'dois candidatos bons da abertura não substituem keyframe de uso')
  const fail = pipe.newCenaState(plan, 'kling3'), fw = pipelineDouble(fail, { poll: j => j.kind === 'video' ? { state: 'failed', url: null } : { state: 'done', url: 'https://offline.example/image' } })
  await drive(pipe, fail, fw.d)
  assert.equal(fail.phase, 'failed'); assert.equal(fail.videoAttempt, 2)
  assert.equal(fw.submits.filter(j => j.kind === 'video').length, 2); assert.equal(fw.events.filter(e => e.name === 'ads_cena_video_retry').length, 1)
  const ambiguous = pipe.newCenaState(plan, 'kling3'), aw = pipelineDouble(ambiguous, { submit: () => ({ kind: 'ambiguous' }) })
  await pipe.stepCena(ambiguous, aw.d); await pipe.stepCena(ambiguous, aw.d)
  assert.equal(aw.submits.length, 1)
  aw.setTime(1_000_000 + pipe.CENA_AMBIGUOUS_MS + 1); await pipe.stepCena(ambiguous, aw.d)
  assert.equal(ambiguous.phase, 'failed'); assert.equal(ambiguous.reason, 'cena_submit_unconfirmed'); assert.equal(aw.submits.length, 1)
  return true
}
async function adapterProof(over = {}) {
  const A = loader(over)(F.adapt), input = { keyframeUrl: 'https://offline.example/keyframe', endKeyframeUrl: 'https://offline.example/keyframe-use', productUrl: photo, prompt: 'A continuous product demonstration.', language: 'en', segmentPrompts: ['ONLY OPENING WORDS', 'ONLY CONTINUATION WORDS'] }
  const keys = Object.keys
  const keyframe = A.cenaKeyframeRequest({ productUrl: photo, actorUrl: actor, prompt: 'Own attached hands.', attempt: 2 })
  assert.equal(keyframe.endpoint, 'fal-ai/nano-banana-pro/edit'); same(keyframe.input.image_urls, [photo, actor]); assert.equal(keyframe.input.num_images, 1)
  assert.equal(keyframe.input.aspect_ratio, '9:16'); assert.equal(keyframe.input.resolution, '2K'); assert.equal(keyframe.input.enable_web_search, false)
  const k = A.cenaVideoRequests('kling3', input)
  assert.equal(k.length, 1); assert.equal(k[0].endpoint, 'fal-ai/kling-video/v3/pro/image-to-video'); assert.equal(k[0].input.duration, '15'); assert.equal(k[0].input.start_image_url, input.keyframeUrl); assert.equal(k[0].input.end_image_url, input.endKeyframeUrl)
  assert.equal(k[0].input.generate_audio, true); assert.ok(!keys(k[0].input).includes('image_urls')); assert.ok(!keys(k[0].input).includes('elements'))
  const pt = A.cenaVideoRequests('kling3', { ...input, language: 'pt' })[0]; assert.equal(pt.nativeSpeechSupported, false); assert.match(pt.input.prompt, /No spoken dialogue.*Do not translate/)
  const sd = A.cenaVideoRequests('seedance2', input)
  assert.equal(sd.length, 1); assert.equal(sd[0].endpoint, 'bytedance/seedance-2.0/reference-to-video'); same(sd[0].input.image_urls, [input.keyframeUrl, input.endKeyframeUrl, photo]); assert.equal(sd[0].input.duration, '15'); assert.match(sd[0].input.prompt, /@Image1.*@Image2/s)
  const v = A.cenaVideoRequests('veo31', input)
  assert.equal(v.length, 2); same(v.map(j => j.input.duration), ['8s', '8s']); same(v.map(j => j.keepSeconds), [8, 7]); same(v.map(j => j.offsetSeconds), [0, 8])
  assert.ok(v.every(j => JSON.stringify(j.input.image_urls) === JSON.stringify([input.keyframeUrl, input.endKeyframeUrl, photo])))
  assert.ok(v.every(j => j.endpoint === 'fal-ai/veo3.1/reference-to-video' && j.input.generate_audio === true && j.input.resolution === '720p'))
  assert.ok(v[0].input.prompt.includes(input.segmentPrompts[0]) && !v[1].input.prompt.includes(input.segmentPrompts[0])); assert.ok(v[1].input.prompt.includes(input.segmentPrompts[1]))
  const fakeTransport = async (endpoint, body) => ({ endpoint, body: plain(body), request_id: 'offline-id' })
  for (const route of ['kling3', 'seedance2', 'veo31']) for (const job of A.cenaVideoRequests(route, input)) {
    const receipt = await fakeTransport(job.endpoint, job.input); assert.equal(receipt.endpoint, A.CENA_ROUTES[route].endpoint); same(receipt.body, job.input)
  }
  const costs = A.cenaCosts(); assert.equal(costs.kling3.videoUsd, 2.52); assert.equal(costs.seedance2.videoUsd, 4.536); assert.equal(costs.veo31.videoUsd, 6.4)
  assert.equal(costs.veo31.generatedSeconds, 16); same(Object.values(costs).map(c => c.keyframesBestOf2Usd), [0.6, 0.6, 0.6]); same(Object.values(costs).map(c => c.knownSubtotalUsd), [3.12, 5.136, 7]); assert.ok(Object.values(costs).every(c => c.estimated && c.totalUsd === null && c.sources.every(u => u.startsWith('https://fal.ai/'))))
  return true
}
async function montageProof(over = {}) {
  for (const route of ['kling3', 'seedance2', 'veo31']) {
    const { load, plan } = await makePlan(over, route), pipe = load(F.pipe), s = pipe.newCenaState(plan, route), w = pipelineDouble(s)
    await drive(pipe, s, w.d)
    const source = load(F.montage).buildCenaMontage(s), els = source.elements
    assert.equal(source.duration, 15); assert.equal(source.width, 1080); assert.equal(source.height, 1920)
    const videos = els.filter(e => e.type === 'video')
    same(videos.map(e => [e.time, e.duration]), route === 'veo31' ? [[0, 8], [8, 7]] : [[0, 15]])
    assert.ok(videos.every(e => e.volume === '100%'))
    const card = els.filter(e => Number(e.time) === 13 && e.type !== 'audio')
    assert.ok(card.some(e => e.type === 'image' && e.source === photo && e.fit === 'contain'))
    assert.ok(card.some(e => e.type === 'text' && e.text === customer.oferta)); assert.ok(card.some(e => e.type === 'text' && e.text === plan.script.cta)); assert.ok(card.every(e => e.duration === 2))
    const captions = els.filter(e => e.type === 'text' && e.track === 40)
    assert.ok(captions.length >= 3); assert.ok(captions.every(e => Math.abs(e.font_size / 1920 - 0.033) < 0.001 && e.fill_color === '#ffffff' && e.stroke_color === '#000000' && e.stroke_width >= 6 && e.stroke_width <= 8 && !('background_color' in e)))
    assert.ok(captions.every(e => parseFloat(e.y) >= 62 && parseFloat(e.y) <= 72 && parseFloat(e.y) * 19.2 < 1480))
    assert.equal(captions.map(e => e.text).join(' '), [plan.script.hook, plan.script.use, plan.script.benefit].join(' '))
    assert.ok(els.some(e => e.type === 'image' && e.source === photo && e.time === 9.5 && e.fit === 'contain'))
    const visual = els.filter(e => ['image', 'video', 'shape', 'text'].includes(e.type))
    for (let a = 0; a < visual.length; a++) for (let b = a + 1; b < visual.length; b++) {
      const x = visual[a], y = visual[b]
      const overlap = Number(x.time) < Number(y.time) + Number(y.duration) - 0.001 && Number(y.time) < Number(x.time) + Number(x.duration) - 0.001
      assert.ok(!(x.track === y.track && overlap), 'visuais simultâneos em trilhas separadas')
    }
  }
  const { load, plan } = await makePlan(over, 'kling3', { language: 'pt' }), s = load(F.pipe).newCenaState(plan, 'kling3'), w = pipelineDouble(s)
  await drive(load(F.pipe), s, w.d); assert.equal(plan.audioMode, 'voiceover')
  assert.throws(() => load(F.montage).buildCenaMontage(s), /cena_voiceover_required/)
  s.voiceUrl = 'https://offline.example/tts'; const src = load(F.montage).buildCenaMontage(s)
  assert.ok(src.elements.some(e => e.type === 'audio' && e.source === s.voiceUrl && e.track === 50)); assert.ok(src.elements.filter(e => e.type === 'video').every(e => e.volume === '12%'))
  return true
}
const cases = [['classificador foto + frase, oito categorias e fallback de confiança', classifierProof], ['três ganchos, fatos digitados, sem urgência ou enchimento; Veo sem repetição', scriptProof], ['juiz anatômico de mãos e produto falha fechado', judgeProof], ['best-of-2, teto de duas rodadas, vídeo só após juiz, uma refação', pipelineProof], ['contratos fal executados com dublês nas três rotas e custos aritméticos', adapterProof], ['montagem 8+7, packshot, end card 2s, trilhas e legenda sem caixa', montageProof]]
for (const [label, run] of cases) { await run(); console.log('ok ' + label) }
// SQL-like in-memory double. Mutations happen only when a query is awaited, and respect filters/CAS.
function database(tables, onUpdate = () => {}) {
  const queryLog = []
  const db = { tables, queryLog, auth: { admin: { getUserById: async () => ({ error: null, data: { user: { email: 'josephsskaf@gmail.com' } } }) } }, from(table) {
    if (!(table in tables)) throw new Error('Unexpected offline table: ' + table)
    queryLog.push(table)
    let patch = null, insert = null, once = false, result, filters = []
    const q = { select() { return q }, eq(k, v) { filters.push(r => r[k] === v); return q }, in(k, values) { filters.push(r => values.includes(r[k])); return q }, is(k, v) { filters.push(r => v === null ? r[k] == null : r[k] === v); return q }, update(v) { patch = v; return q }, insert(v) { insert = v; return q }, upsert(v) { insert = v; return q },
      exec(single = false) {
        if (!once) {
          once = true
          if (insert) { const rows = (Array.isArray(insert) ? insert : [insert]).map(plain); tables[table].push(...rows); result = { error: null, data: rows } }
          else { const rows = tables[table].filter(r => filters.every(f => f(r))); if (patch) for (const r of rows) { Object.assign(r, plain(patch)); onUpdate(table, plain(patch), plain(r)) } result = { error: null, data: rows.map(plain) } }
        }
        return { error: result.error, data: single ? result.data[0] ?? null : result.data }
      }, maybeSingle() { return Promise.resolve(q.exec(true)) }, single() { return q.maybeSingle() }, then(resolve, reject) { return Promise.resolve(q.exec()).then(resolve, reject) },
    }
    return q
  } }
  return db
}
const NOW = Date.parse('2026-10-21T15:00:00Z')
const fixedDate = clock => class extends Date { constructor(...a) { super(...(a.length ? a : [clock.now])) } static now() { return clock.now } }
function runtimeWorld(order, over = {}, options = {}) {
  const trace = [], events = [], submissions = [], clock = { now: NOW }
  const tables = { ads_v2_orders: [plain(order)], videos: [], credit_debits: [{ user_id: order.user_id, render_id: order.billing_ref, amount: 41, refunded_at: null }], ads_v2_shots: [], profiles: [] }
  const db = database(tables, (table, patch) => trace.push({ type: 'save', table, patch }))
  let refunds = 0, tts = 0, montage = 0
  class FakeCreatomateError extends Error { constructor(ambiguous = false) { super('offline'); this.ambiguous = ambiguous } }
  const mocks = {
    '@/lib/openai': { openai: { chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(goodJudge) } }] }) } } } },
    '../v2Shots': { submitShotOnce: async (endpoint, input) => {
      const state = tables.ads_v2_orders[0].plan.cena
      assert.ok(state.jobs.some(j => j.endpoint === endpoint && j.status === 'submitting'), 'runtime salva intenção antes de fal')
      submissions.push({ endpoint, input: plain(input) }); trace.push({ type: 'submit' })
      return options.submit?.(endpoint, input) ?? { kind: 'accepted', requestId: 'offline-job-' + submissions.length }
    }, pollFalJob: async () => ({ state: 'done', url: 'https://offline.example/provider' }), persistShotClip: async () => ({ measuredSeconds: 15, storedUrl: 'https://offline.example/video' }) },
    '../v2Images': { persistSceneImage: async ({ idx }) => 'https://offline.example/frame-' + idx },
    '@/lib/serverEvents': { writeServerEvent: async e => { events.push(plain(e)); return true } },
    '@/lib/credits/renderIntent': { recordRenderIntent: async () => { throw new Error('No new charge allowed') } },
    '@/lib/credits/debit': { debitVideoCredits: async () => { throw new Error('No new debit allowed') } },
    '@/lib/credits/refund': { refundRenderCredits: async ref => { refunds++; assert.equal(ref, order.billing_ref); tables.credit_debits[0].refunded_at = new Date(NOW).toISOString(); return 41 } },
    '@/lib/compose': { CreatomateSubmitError: FakeCreatomateError, estimateMp3DurationSeconds: () => options.voiceSeconds ?? 12, uploadVoiceoverToSupabase: async () => 'https://offline.example/voice', submitCreatomateRender: async source => { montage++; assert.equal(tables.ads_v2_orders[0].status, 'assembling'); assert.ok(tables.ads_v2_orders[0].assembly_submit_at); trace.push({ type: 'montage' }); return 'offline-render' } },
    '@/lib/ttsFallback': { synthesizeTtsFallback: async () => { tts++; assert.ok(tables.ads_v2_orders[0].plan.cena.voiceClaimedAt, 'intenção TTS já persistida'); trace.push({ type: 'tts' }); if (options.ttsError) throw new Error('offline-tts-failed'); return Buffer.from('offline') } },
  }
  const load = loader(over, mocks, { Date: fixedDate(clock), setTimeout: () => 9, clearTimeout() {} })
  return { load, db, tables, trace, events, submissions, clock, get refunds() { return refunds }, get tts() { return tts }, get montage() { return montage } }
}
const baseOrder = state => ({ id: 'order-id', user_id: 'owner-id', status: 'generating', plan: { cena: state }, billing_ref: 'adsv2-offline-ref', credits_charged: 41, video_id: null, assembly_lease_at: null, assembly_submit_at: null, started_at: new Date(NOW).toISOString() })
async function refundProof(over = {}) {
  const { load, plan } = await makePlan(over), pipe = load(F.pipe), state = pipe.newCenaState(plan, 'kling3')
  const doomed = pipelineDouble(state, { poll: j => j.kind === 'video' ? { state: 'failed', url: null } : { state: 'done', url: photo } })
  await drive(pipe, state, doomed.d); assert.equal(state.phase, 'failed'); assert.equal(state.videoAttempt, 2); assert.equal(doomed.submits.filter(j => j.kind === 'video').length, 2)
  const order = baseOrder(state), w = runtimeWorld(order, over), runtime = w.load(F.runtime)
  await runtime.advanceCenaOrder(w.db, plain(order))
  await Promise.all([runtime.failCenaOrder(w.db, order, state.reason), runtime.failCenaOrder(w.db, order, state.reason)])
  assert.equal(w.refunds, 1, 'apenas vencedor estorna uma vez pelo billing real')
  assert.equal(w.tables.ads_v2_orders[0].status, 'failed'); assert.ok(w.tables.credit_debits[0].refunded_at)
  assert.equal(w.events.filter(e => e.name === 'ads_v2_failed').length, 1)
  assert.equal(w.events.filter(e => e.name === 'ads_cena_failed').length, 1)
  assert.equal(w.events.find(e => e.name === 'ads_cena_failed').metadata.refund, 'refunded')
  assert.equal(w.events.find(e => e.name === 'ads_cena_failed').metadata.credits_returned, 41)
  const delivered = runtimeWorld(order, over); delivered.tables.videos.push({ id: 'delivered-video', render_id: order.billing_ref })
  await delivered.load(F.runtime).failCenaOrder(delivered.db, order, 'late_failure')
  assert.equal(delivered.refunds, 0); assert.equal(delivered.events.length, 0, 'vídeo já entregue nunca estorna')
  return true
}
async function receiptsProof(over = {}) {
  const { load, plan } = await makePlan(over), state = load(F.pipe).newCenaState(plan, 'kling3'), order = baseOrder(state)
  const w = runtimeWorld(order, over, { submit: () => ({ kind: 'ambiguous', late: Promise.resolve('late-receipt-id') }) }), R = w.load(F.runtime)
  await R.advanceCenaOrder(w.db, plain(w.tables.ads_v2_orders[0]))
  assert.equal(w.submissions.length, 1)
  const stored = w.tables.ads_v2_orders[0].plan.cena.jobs[0]
  assert.equal(stored.status, 'pending'); assert.equal(stored.requestId, 'late-receipt-id')
  await R.advanceCenaOrder(w.db, plain(w.tables.ads_v2_orders[0]))
  assert.equal(w.submissions.length, 1, 'recibo tardio é usado, sem reenvio do mesmo job')
  assert.equal(w.tables.ads_v2_orders[0].plan.cena.jobs[0].status, 'done')
  const { load: ptLoad, plan: ptPlan } = await makePlan(over, 'kling3', { language: 'pt' })
  const ready = ptLoad(F.pipe).newCenaState(ptPlan, 'kling3'); ready.phase = 'ready'; ready.keyframe = 'https://offline.example/frame'
  ready.jobs = ptLoad(F.adapt).cenaVideoRequests('kling3', { keyframeUrl: ready.keyframe, productUrl: photo, prompt: ptPlan.videoPrompt, language: 'pt' }).map((j, index) => ({ ...j, kind: 'video', status: 'done', index, url: 'https://offline.example/video' }))
  const voiceOrder = baseOrder(ready), voice = runtimeWorld(voiceOrder, over), V = voice.load(F.runtime)
  await V.advanceCenaOrder(voice.db, plain(voice.tables.ads_v2_orders[0]))
  assert.equal(voice.tts, 1); assert.equal(voice.montage, 1); assert.equal(voice.tables.ads_v2_orders[0].creatomate_render_id, 'offline-render')
  const ti = voice.trace.findIndex(e => e.type === 'tts'), save = voice.trace.findIndex(e => e.type === 'save' && e.patch.plan?.cena?.voiceClaimedAt)
  assert.ok(save >= 0 && save < ti, 'intenção TTS persistida antes de sintetizar')
  await V.advanceCenaOrder(voice.db, plain(voice.tables.ads_v2_orders[0])); assert.equal(voice.tts, 1); assert.equal(voice.montage, 1)
  const uncertain = plain(voiceOrder); uncertain.plan.cena.voiceClaimedAt = NOW - 1
  const failed = runtimeWorld(uncertain, over), U = failed.load(F.runtime)
  await U.advanceCenaOrder(failed.db, plain(failed.tables.ads_v2_orders[0]))
  assert.equal(failed.tts, 0); assert.equal(failed.montage, 0); assert.equal(failed.refunds, 1)
  assert.equal(failed.tables.ads_v2_orders[0].error, 'cena_voice_submit_unconfirmed')
  return true
}
const serverDouble = { v2Json: (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Cache-Control': 'no-store' } }), v2Fail: (error, status, extra = {}) => new Response(JSON.stringify({ error, ...extra }), { status, headers: { 'Cache-Control': 'no-store' } }) }
async function internalProof(over = {}) {
  const calls = [], counters = { db: 0, start: 0, moderate: 0 }
  const load = loader(over, { '../v2Server': serverDouble })
  const I = load(F.internal), C = load(F.cat), A = load('lib/ads/access.ts')
  assert.equal(C.cenaEnabled(true, 'off'), false); assert.equal(C.cenaEnabled(false, 'internal'), false); assert.equal(C.cenaEnabled(true, 'internal'), true)
  for (const email of ['test@example.com', 'test+internal@example.com', 'josephsskaf+new@gmail.com', 'customer@mailinator.com', 'attacker@josephsskaf.gmail.com']) assert.equal(A.isAdsInternalEmail(email), false)
  assert.equal(A.isAdsInternalEmail('josephsskaf@gmail.com'), true)
  const deps = { json: jsonCalls(calls), moderate: async () => { counters.moderate++; return true }, admin: { from: () => { counters.db++; throw new Error('dry_run cannot query/create order') } }, start: async () => { counters.start++; throw new Error('dry_run cannot start/debit') } }
  const res = await I.internalCenaFor({ id: 'owner', email: 'josephsskaf@gmail.com' }, { ...customer, rota: 'kling3', dry_run: true }, deps)
  assert.equal(res.status, 200); const payload = await res.json(); assert.equal(payload.dry_run, true); assert.equal(payload.charged, false); assert.equal(payload.plan.category, 'wearable')
  assert.ok(payload.plan.keyframePrompts && payload.plan.script && payload.plan.videoPrompt && payload.costs.kling3)
  assert.equal(counters.db, 0); assert.equal(counters.start, 0); assert.equal(calls.length, 2, 'dry_run só permite planejamento JSON dublê')
  const denied = await I.internalCenaFor({ id: 'external', email: 'customer@example.com' }, { ...customer, rota: 'kling3', dry_run: true }, deps)
  assert.equal(denied.status, 403); assert.equal(calls.length, 2)
  const flagOff = { ...over, [F.cat]: (over[F.cat] ?? read(F.cat)).replace("ADS_CENA_LIVE: 'off' | 'internal' = 'internal'", "ADS_CENA_LIVE: 'off' | 'internal' = 'off'") }
  const disabled = await loader(flagOff, { '../v2Server': serverDouble })(F.internal).internalCenaFor({ id: 'owner', email: 'josephsskaf@gmail.com' }, { ...customer, rota: 'kling3', dry_run: true }, deps)
  assert.equal(disabled.status, 403); assert.equal(calls.length, 2); assert.equal(counters.db, 0)
  return true
}
async function routeProof(over = {}) {
  for (const scenario of [{ user: null, status: 401 }, { user: { id: 'external', email: 'admin@external.example' }, status: 403 }, { user: { id: 'owner', email: 'josephsskaf@gmail.com' }, isAdmin: false, status: 403 }, { user: { id: 'owner', email: 'josephsskaf@gmail.com' }, off: true, status: 403 }, { user: { id: 'owner', email: 'josephsskaf@gmail.com' }, status: 200 }]) {
    let reads = 0, access = 0, mini = 0
    const source = scenario.off ? { ...over, [F.cat]: (over[F.cat] ?? read(F.cat)).replace("ADS_CENA_LIVE: 'off' | 'internal' = 'internal'", "ADS_CENA_LIVE: 'off' | 'internal' = 'off'") } : over
    const mocks = {
      'next/server': {}, '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: scenario.user } }) } }) },
      '../_shared/db': { isAdminEmail: () => scenario.isAdmin !== false }, '@/lib/ads/cena/runtime': { cenaJson: async c => { mini++; return c.images.length ? classification : goodScript } },
      '@/lib/ads/serverAccess': { loadAdsAccess: async () => { access++; return { admin: { from: () => { throw new Error('no dry_run DB') } } } } },
      '@/lib/ads/v2StartCore': { adsV2StartFor: async () => { throw new Error('no dry_run start') } }, '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
      '@/lib/ads/v2Server': serverDouble, '../v2Server': serverDouble,
    }
    const POST = loader(source, mocks)(F.route).POST
    const res = await POST({ json: async () => { reads++; return { ...customer, rota: 'kling3', dry_run: true } } })
    assert.equal(res.status, scenario.status)
    if (scenario.status !== 200) { assert.equal(reads, 0); assert.equal(access, 0); assert.equal(mini, 0) } else { assert.equal(reads, 1); assert.equal(mini, 2) }
  }
  return true
}
async function legacyResponse(over = {}, baseline = false, scenario = {}) {
  const plan = { totalSeconds: 12.5, narration: 'Your product, made clear.', overlays: [{ text: 'Your real product', start: 0, end: 4 }], shots: [{ idx: 0, kind: 'text', role: 'hook', source: 'user_photo', cutSeconds: 12.5, prompt: '' }] }
  const order = { id: '00000000-0000-4000-8000-000000000001', user_id: 'owner', status: 'planned', tier: 'commercial', seconds: 15, card_url: photo, narration: true, plan, parent_order_id: null }
  const tables = { ads_v2_orders: [plain(order)], profiles: [{ id: 'owner', video_credits: scenario.balance ?? 100 }], ads_v2_shots: [] }, db = database(tables), events = [], effects = []
  const mocks = {
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000009' },
    '@/lib/serverEvents': { writeServerEvent: async e => events.push(plain(e)) }, '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
    '@/lib/ads/serverAccess': { adsGate: reason => reason === 'internal' ? 'ok' : 'no_access', adsSampleOpen: async () => false, isMissingAdsTable: () => false },
    '@/lib/ads/v2Access': { adsV2Visible: () => true }, '@/lib/ads/v2Contract': { sanitizeStartBody: b => b.bad ? { ok: false, error: 'bad_body' } : { ok: true, value: { order_id: order.id, dry_run: scenario.dry === true } } },
    '@/lib/ads/v2Tiers': { adsV2Credits: () => 41, estimateAdUsd: () => ({ totalUsd: 1.23 }) },
    '@/lib/ads/v2Billing': { adsV2BillingRef: () => 'adsv2-deterministic', chargeAdsV2: async () => { effects.push('debit'); return { ok: true, balance: 59 } }, failAdsV2Order: async () => { throw new Error('unexpected legacy failure') } },
    '@/lib/ads/v2Advance': { loadAdsV2Order: async () => ({ order: plain(tables.ads_v2_orders[0]), error: null }), buildInitialShotRows: () => [{ idx: 0, kind: 'text', status: 'skipped_text' }], dispatchAdsV2Shots: async () => { effects.push('dispatch'); return 1 }, loadAdsV2Shots: async () => [{ idx: 0, status: 'skipped_text' }], adsV2View: (o, shots) => ({ order_id: o.id, status: o.status, generation_id: o.generation_id, shots }) },
    '@/lib/ads/v2Server': serverDouble,
    '@/lib/ads/v2CloseReal': { adsV2CloseRealOf: () => null }, '@/lib/ads/sampleEntry': { adsSamplePresenterPlanOk: () => false },
  }
  const flagOff = (over[F.cat] ?? read(F.cat)).replace("ADS_CENA_LIVE: 'off' | 'internal' = 'internal'", "ADS_CENA_LIVE: 'off' | 'internal' = 'off'")
  const src = { ...over, [F.cat]: flagOff }
  if (baseline) src[F.start] = execFileSync('git', ['show', '4cbd06b1:lib/ads/v2StartCore.ts'], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
  const S = loader(src, mocks, { Date: fixedDate({ now: NOW }) })(F.start)
  const response = await S.adsV2StartFor({ id: 'owner', email: 'josephsskaf@gmail.com' }, { reason: scenario.denied ? 'none' : 'internal', ownerId: 'owner', admin: db }, async () => ({ bad: scenario.bad }), NOW)
  return { status: response.status, body: await response.text(), events, effects, tables }
}
async function offProof(over = {}) {
  for (const scenario of [{}, { dry: true }, { balance: 0 }, { denied: true }, { bad: true }]) {
    const current = await legacyResponse(over, false, scenario), before = await legacyResponse(over, true, scenario)
    assert.equal(current.status, before.status); assert.equal(current.body, before.body, 'flag off: resposta JSON byte a byte vs origin/main4cbd06b1')
    same(current.events, before.events); same(current.effects, before.effects); same(current.tables, before.tables)
  }
  await internalProof(over)
  return true
}
for (const [label, run] of [['estorno terminal real do v2, vencedor único e evento; entregue nunca estorna', refundProof], ['recibo fal tardio sem repetição e intenção TTS durável antes de gastar', receiptsProof], ['dry_run não grava/debita/invoca fal; allowlist exata e interruptor', internalProof], ['rota admin exige login + admin + conta da casa antes de ler corpo', routeProof], ['interruptor off: cinco respostas start JSON byte a byte contra 4cbd06b1', offProof]]) { await run(); console.log('ok ' + label) }
for (const path of ADS_CENA_2110_ARQUIVOS) {
  const original = read(path), baseline = execFileSync('git', ['show', ADS_CENA_2110_BASE + ':' + path], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
  const restored = semAdsCena2110(original, path)
  assert.equal(restored, baseline, 'desfaz exato: ' + path)
  assert.equal(semAdsCena2110(restored, path), baseline, 'desfaz idempotente: ' + path)
  assert.equal(semAdsCena2110(original.replace(/\n/g, '\r\n'), path), baseline.replace(/\n/g, '\r\n'), 'desfaz preserva CRLF: ' + path)
  const delta = execFileSync('git', ['diff', '--unified=0', ADS_CENA_2110_BASE, '--', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  const unmarked = delta.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++') && l.trim() !== '+' && !l.includes(MARCA_ADS_CENA_2110))
  assert.equal(unmarked.length, 0, 'toda linha tocada carrega marca: ' + path)
}
for (const path of [...Object.values(F).filter(p => p.includes('/cena/') || p === F.captions), F.route, 'scripts/test-ads-cena-2110.mjs']) assert.ok(ADS_CENA_2110_NOVOS.includes(path), 'novo arquivo coberto no desfaz: ' + path)
assert.equal(semAdsCena2110('untouched\n', 'lib/elsewhere.ts'), 'untouched\n')
assert.throws(() => semAdsCena2110(read(F.start) + '\n// KINEO-ADS-CENA-2110 inesperado\n', F.start), /desfaz-ads-cena-2110/)
console.log('ok desfaz mais novo exato em nove arquivos, idempotente, CRLF, marcas e lista de novos')
function changed(path, from, to) {
  const original = read(path), occurrences = original.split(from).length - 1
  assert.equal(occurrences, 1, 'mutante aplica uma vez: ' + path + ' ' + from)
  const mutant = original.replace(from, to); assert.notEqual(mutant, original)
  return { [path]: mutant }
}
const mutants = [
  ['categoria forçada para other', classifierProof, F.plan, "category: r.confidence >= 0.6 ? r.category : 'other'", "category: 'other'"],
  ['mãos desconectadas aprovadas', judgeProof, F.plan, "['own_hands_attached', 'product_whole'", "['product_whole'"],
  ['identidade de ator deixa de ser exigida', judgeProof, F.plan, "'real_scale', 'actor_identity_match'", "'real_scale'"],
  ['terceira tentativa de vídeo', pipelineProof, F.pipe, 'CENA_VIDEO_ATTEMPTS = 2', 'CENA_VIDEO_ATTEMPTS = 3'],
  ['terceira rodada de keyframe', pipelineProof, F.pipe, 'CENA_KEYFRAME_ROUNDS = 2', 'CENA_KEYFRAME_ROUNDS = 3'],
  ['best-of-1 no lugar de best-of-2', pipelineProof, F.pipe, 'slot) => [0, 1].map(candidate', 'slot) => [0].map(candidate'],
  ['adaptador Kling inventa duração', adapterProof, F.adapt, "duration: '15', generate_audio: true", "duration: '20', generate_audio: true"],
  ['legenda cresce para 8%', montageProof, F.captions, 'CENA_CAPTION_HEIGHT_RATIO = 0.033', 'CENA_CAPTION_HEIGHT_RATIO = 0.08'],
  ['legenda volta à caixa', montageProof, F.captions, "fill_color: '#ffffff'", "background_color: '#000000', fill_color: '#ffffff'"],
  ['interruptor não fecha', internalProof, F.cat, "return flag === 'internal' && internal === true", 'return true'],
  ['resposta legado alterada com interruptor off', offProof, F.start, "return v2Json(fresh ? { ...adsV2View(fresh, shots), usd_estimate: usd } : { order_id: orderId, status: 'generating' }, 202)", "return v2Json({ changed: true }, 202)"],
  ['evento de falha emitido pelos perdedores', refundProof, F.runtime, "if (r.won) await writeServerEvent", 'await writeServerEvent'],
  ['TTS antes de salvar intenção', receiptsProof, F.runtime, 'state.voiceClaimedAt = Date.now(); await save(state)', 'state.voiceClaimedAt = Date.now()'],
]
for (const [label, run, path, from, to] of mutants) {
  const overrides = changed(path, from, to)
  let failure = null
  try { await run(overrides) } catch (e) { failure = e }
  assert.ok(failure, 'mutante executado precisa ficar vermelho: ' + label)
  console.log('ok mutante vermelho: ' + label)
}
console.log('KINEO-ADS-CENA-2110: provas offline completas; nenhum render real ou resultado comercial alegado.')
