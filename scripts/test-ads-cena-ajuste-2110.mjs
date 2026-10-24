import { KIDS_VENDA_2010_ARQUIVOS, KIDS_VENDA_2010_NOVOS, MARCA_KIDS_VENDA_2010 } from './test-support/desfaz-kids-venda-2010.mjs' // KINEO-KIDS-VENDA-2010 — a venda do Cartoon sai da conta alheia, com desfaz exato próprio
// KINEO-ADS-CENA-AJUSTE-2110 — prova integrada da decisão A/B/C, sem SDK/rede/banco/render pago.
import { semPaginasIaClaras2110, PAGINAS_IA_CLARAS_2110_ARQUIVOS, PAGINAS_IA_CLARAS_2110_NOVOS, ehCommitPaginasIaClaras2110 } from './test-support/desfaz-paginas-ia-claras-2110.mjs' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
import assert from 'node:assert/strict'
import { semRoteiroCurto2210 } from './test-support/desfaz-roteiro-curto-2210.mjs' // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — restore this task before hashes of older guardian sources
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semAdsCena952110 } from './test-support/desfaz-ads-cena-95-2110.mjs' // KINEO-ADS-CENA-95-2110 — histórico do ajuste preservado; motor novo tem guardião próprio.
import { semAdsCenaAjuste2110, ADS_CENA_AJUSTE_2110_ARQUIVOS, ADS_CENA_AJUSTE_2110_NOVOS, ADS_CENA_AJUSTE_2110_BASE, MARCA_ADS_CENA_AJUSTE_2110 } from './test-support/desfaz-ads-cena-ajuste-2110.mjs'
const source = p => semAdsCena952110(semRoteiroCurto2210(semPaginasIaClaras2110(readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), p), p), p) // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — desfazer roteiro antes da camada Cena95; manter ambas as provas.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r\n/g, '\n')
const load = createOfflineLoader({ source: (p, s) => semAdsCena952110(s, p), globals: { Response, Request, Error }, mocks: { '../v2Server': { // KINEO-ADS-CENA-95-2110
  v2Json: (body, status = 200) => new Response(JSON.stringify(body), { status }),
  v2Fail: (error, status, extra = {}) => new Response(JSON.stringify({ error, ...extra }), { status }),
} } })
const H = 'https://offline.example/'
const input = { foto: H + 'customer.png', frase: 'Pulse smartwatch for running. 7-day battery. Free shipping.', oferta: 'Free shipping', beneficios: ['7-day battery'], actorUrl: H + 'actor.png', language: 'en', formato: 'ugc', dry_run: true }
const classification = { category: 'wearable', confidence: 0.98, product: 'Pulse smartwatch', offer: 'Free shipping', benefits: ['7-day battery'] }
const script = { hooks: ['Need a watch for your run?', 'Take Pulse on your next run.', 'A smartwatch for your daily run.'], use: 'Wear Pulse while you run.', benefit: '7-day battery. Free shipping.', cta: 'Shop Pulse now.' }
const verdict = { own_hands_attached: true, extra_hands: false, extra_people: false, product_whole: true, product_faithful: true, real_scale: true, touching_face: false, actor_identity_match: true, wardrobe_match: true, product_wrist_match: true, score: 95 }
const I = load('lib/ads/cena/internal.ts'), P = load('lib/ads/cena/pipeline.ts'), M = load('lib/ads/cena/montage.ts')
for (const [mode, route] of [['narrated', 'kling3'], ['talking', 'veo31']]) {
  const jsonCalls = [], jobs = [], snapshots = []
  const body = { ...input, ...(mode === 'talking' ? { voice_mode: mode } : {}) }
  const response = await I.internalCenaFor({ id: 'house', email: 'josephsskaf@gmail.com' }, body, {
    json: async c => { jsonCalls.push(c); return c.images.length ? classification : script },
    moderate: async () => true,
    admin: { from() { throw new Error('dry_run tentou banco') } },
    start() { throw new Error('dry_run tentou cobrar/iniciar') },
  })
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(result.rota, route); assert.equal(result.voice_mode, mode)
  assert.equal(result.plan.voice_mode, mode); assert.equal(result.plan.input.voice_mode, mode)
  assert.equal(jsonCalls.length, 2)
  assert.equal(result.charged, false)
  const state = P.newCenaState(result.plan, route)
  const deps = {
    now: () => 1_000_000,
    save: async s => snapshots.push(JSON.parse(JSON.stringify(s))),
    json: async () => verdict,
    event: async () => {},
    submit: async job => {
      const saved = snapshots.at(-1).jobs.find(j => j.kind === job.kind && j.index === job.index)
      assert.equal(saved.status, 'submitting', 'intenção salva antes do efeito')
      jobs.push(JSON.parse(JSON.stringify(job)))
      return { kind: 'accepted', requestId: 'r-' + jobs.length }
    },
    poll: async job => ({ state: 'done', url: H + job.kind + job.index }),
    persist: async job => job.url,
  }
  for (let step = 0; step < 70 && !['ready', 'failed'].includes(state.phase); step++) await P.stepCena(state, deps)
  assert.equal(state.phase, 'ready')
  assert.equal(jobs.filter(j => j.kind === 'image').length, 4)
  const videos = jobs.filter(j => j.kind === 'video')
  assert.equal(videos.length, mode === 'talking' ? 2 : 1)
  assert.ok(videos.every(j => j.input.generate_audio === (mode === 'talking')))
  if (mode === 'narrated') state.voiceUrl = H + 'narrator.mp3'
  const out = M.buildCenaMontage(state), els = out.elements
  assert.equal(out.duration, 15)
  assert.ok(els.every(e => !['image', 'shape'].includes(e.type)), 'nenhum packshot/cartão/painel separado no filme')
  assert.ok(!els.some(e => e.source === input.foto))
  assert.ok(els.filter(e => e.type === 'video').every(e => e.volume === (mode === 'narrated' ? '0%' : '100%')))
  const audio = els.filter(e => e.type === 'audio')
  assert.equal(audio.length, mode === 'narrated' ? 1 : 0)
  if (audio.length) { assert.equal(audio[0].source, state.voiceUrl); assert.equal(audio[0].volume, '100%') }
  const final = els.filter(e => e.type === 'text' && e.time === 13)
  for (const text of [result.plan.product, result.plan.input.oferta, result.plan.script.cta]) assert.ok(final.some(e => e.text === text), 'texto digitado inteiro sobre a cena: ' + text)
  assert.ok(final.every(e => e.stroke_width >= 6 && e.stroke_width <= 8 && !e.background_color))
  assert.equal(new Set(final.map(e => e.track)).size, final.length)
  console.log('ok fluxo completo interno → plano → juiz → vídeo → cena final: ' + route + '/' + mode)
}
async function startCostsProof(override) {
  for (const mode of ['narrated', 'talking', undefined]) for (const dry of [false, true]) {
    let charges = 0; const events = [], id = '00000000-0000-4000-8000-000000000001'
    const plan = { totalSeconds: 15, narration: 'Use Pulse on your run.', overlays: [], shots: [{ idx: 0, kind: 'text', source: 'user_photo' }], cena: { route: 'kling3', plan: { marker: 'KINEO-ADS-CENA-2110', ...(mode ? { voice_mode: mode } : {}) } } }
    const order = { id, user_id: 'house', status: 'planned', tier: 'commercial', seconds: 15, card_url: input.foto, plan }
    const admin = { from(table) {
      assert.ok(['profiles', 'ads_v2_orders'].includes(table)); const q = { select() { return q }, eq() { return q }, in() { return q }, update() { assert.equal(table, 'ads_v2_orders'); return q }, maybeSingle: async () => ({ error: null, data: table === 'profiles' ? { video_credits: 100 } : { id } }) }; return q
    } }
    const mocks = {
      crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000009' },
      '@/lib/serverEvents': { writeServerEvent: async e => events.push(e) }, '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
      '@/lib/ads/serverAccess': { adsGate: () => 'ok', adsSampleOpen: async () => false, isMissingAdsTable: () => false },
      '@/lib/ads/v2Access': { adsV2Visible: () => true }, '@/lib/ads/v2Contract': { sanitizeStartBody: () => ({ ok: true, value: { order_id: id, dry_run: dry } }) },
      '@/lib/ads/v2Tiers': { adsV2Credits: () => 41, estimateAdUsd: () => ({ totalUsd: 0 }) },
      '@/lib/ads/v2Billing': { adsV2BillingRef: () => 'offline-ref', chargeAdsV2: async () => { charges++; return { ok: true, balance: 59 } }, failAdsV2Order: async () => { throw new Error('falha inesperada no start') } },
      '@/lib/ads/v2Advance': { loadAdsV2Order: async () => ({ order, error: null }), buildInitialShotRows: () => { throw new Error('Cena tentou iniciar motor legado') } },
      '@/lib/ads/v2Server': { v2Json: (body, status = 200) => new Response(JSON.stringify(body), { status }), v2Fail: (error, status) => new Response(JSON.stringify({ error }), { status }) },
      '@/lib/ads/sample': {}, '@/lib/ads/sampleEntry': {}, '@/lib/ads/v2CloseReal': {},
    }
    const current = createOfflineLoader({ globals: { Response, Request, Error }, mocks, source: (p, s) => p === 'lib/ads/v2StartCore.ts' && override ? override : semAdsCena952110(s, p) }) // KINEO-ADS-CENA-95-2110
    const response = await current('lib/ads/v2StartCore.ts').adsV2StartFor({ id: 'house', email: 'josephsskaf@gmail.com' }, { reason: 'internal', admin }, async () => ({}))
    assert.equal(response.status, dry ? 200 : 202)
    const result = await response.json(), costs = current('lib/ads/cena/adapters.ts').cenaCosts(undefined, mode)
    assert.deepEqual(result.costs, JSON.parse(JSON.stringify(costs)), 'resposta direta usa modo salvo, inclusive legado')
    assert.equal(result.costs.kling3.knownSubtotalUsd, mode === 'narrated' ? 2.28 : 3.12)
    assert.equal(result.costs.veo31.knownSubtotalUsd, mode === 'narrated' ? 3.8 : 7)
    assert.equal(charges, dry ? 0 : 1)
    const started = events.filter(e => e.name === 'ads_cena_started'); assert.equal(started.length, dry ? 0 : 1)
    if (!dry) assert.deepEqual(JSON.parse(JSON.stringify(started[0].metadata.costs)), result.costs, 'evento e resposta informam o mesmo custo por modo')
  }
}
await startCostsProof()
console.log('ok start direto: custo por modo no dry/live/evento; legado preservado, sem efeito real')
const startSource = source('lib/ads/v2StartCore.ts')
for (const [label, from, to] of [
  ['resposta live volta à tarifa com áudio', "credits: cost, costs, status_url:", "credits: cost, costs: cenaCosts(), status_url:"],
  ['evento live volta à tarifa com áudio', 'route: cena.route, credits: cost, costs }', 'route: cena.route, credits: cost, costs: cenaCosts() }'],
]) {
  assert.equal(startSource.split(from).length - 1, 1, 'mutante deve ter ponto único')
  await assert.rejects(() => startCostsProof(startSource.replace(from, to)), undefined, 'mutante deve ficar vermelho: ' + label)
  console.log('ok mutante vermelho: ' + label)
}
for (const p of ADS_CENA_AJUSTE_2110_ARQUIVOS) {
  const actual = source(p), before = git('show', ADS_CENA_AJUSTE_2110_BASE + ':' + p)
  assert.ok(actual.includes(MARCA_ADS_CENA_AJUSTE_2110), 'marca da camada: ' + p)
  const restored = semAdsCenaAjuste2110(actual, p)
  assert.equal(restored, before, 'desfaz exato contra origin/main b77: ' + p)
  assert.equal(semAdsCenaAjuste2110(restored, p), before, 'idempotência: ' + p)
  assert.equal(semAdsCenaAjuste2110(actual.replace(/\n/g, '\r\n'), p), before.replace(/\n/g, '\r\n'), 'CRLF: ' + p)
  assert.throws(() => semAdsCenaAjuste2110(actual + '\n// fonte adulterada\n', p), /fonte divergente/, 'mutante fonte parcial rejeitado: ' + p)
  assert.notEqual(semAdsCenaAjuste2110(actual.replaceAll(MARCA_ADS_CENA_AJUSTE_2110, 'MARCA_REMOVIDA'), p), before, 'mutante sem marca não finge restauração: ' + p)
}
assert.equal(semAdsCenaAjuste2110('fora\n', 'lib/fora.ts'), 'fora\n')
const declared = new Set([...ADS_CENA_AJUSTE_2110_ARQUIVOS, ...ADS_CENA_AJUSTE_2110_NOVOS])
// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — freeze this older delivery's scope at its own last marked commit; runtime/integrity checks above still read current files.
const deliveryHead = git('log', '--format=%H', '--grep=' + MARCA_ADS_CENA_AJUSTE_2110, '-1', 'HEAD').trim()
assert.ok(deliveryHead, 'commit final do complemento antigo existe')
const changed = git('diff', '--ignore-cr-at-eol', '--name-only', ADS_CENA_AJUSTE_2110_BASE, deliveryHead).trim().split('\n').filter(Boolean)
assert.ok(changed.length > 0 && changed.every(p => declared.has(p)), 'escopo completo do complemento, sem arquivo estranho')
for (const p of ADS_CENA_AJUSTE_2110_NOVOS) assert.ok(readFileSync(p).length > 0, 'artefato novo existe: ' + p)
const oldUndo = source('scripts/test-support/desfaz-ads-cena-2110.mjs')
assert.ok(oldUndo.indexOf('texto = semAdsCenaAjuste2110(texto, p)') < oldUndo.indexOf("const rel = String(p ?? '')"), 'desfaz da camada mais nova vem primeiro')
const subjects = git('log', '--format=%s', ADS_CENA_AJUSTE_2110_BASE + '..' + deliveryHead).trim().split('\n').filter(Boolean)
assert.ok(subjects.every(s => s.startsWith('KINEO-ADS-CENA-2110 ') && s.includes('[TRAVA 8.2 — vai do fundador 21/10 "A e B, vamo time"]')), 'marca e trava em todos os commits do complemento')
console.log('ok desfaz encadeado, fontes exatas, CRLF, idempotência, mutantes de integridade e escopo do complemento')
