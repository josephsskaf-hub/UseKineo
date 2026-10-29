// Offline provider contracts and rollback guards. No SDK, credentials, environment files or paid render.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
function modules(live, extraEnv = {}) {
  const cache = new Map()
  const forbidden = () => { throw new Error('Network/provider access forbidden in offline guard') }
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const exports = {}; cache.set(file, exports)
    const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText
    vm.runInNewContext(code, { exports, console, URL, process: { env: { KLING4_PAID_LIVE: live ? 'true' : 'false', ...extraEnv } },
      fetch: forbidden, setTimeout: forbidden,
      require(specifier) {
        if (specifier === '@fal-ai/client') return { fal: { config() {} } }
        if (specifier.startsWith('@/')) return load(specifier.slice(2) + '.ts')
        if (specifier.startsWith('.')) return load(path.join(path.dirname(file), specifier) + '.ts')
        throw new Error('Unmocked external module: ' + specifier)
      }
    }, { filename: file, timeout: 5000 })
    return exports
  }
  return load
}
const json = value => JSON.parse(JSON.stringify(value))
test('new paid ads and samples use Kling4 with the switch on and Kling3 on rollback', () => {
  for (const live of [false, true]) {
    const load = modules(live), paid = load('lib/ads/kling4Paid.ts'), tiers = load('lib/ads/v2Tiers.ts')
    assert.equal(paid.newPaidCenaRoute('kling3', false), live ? 'kling4' : 'kling3')
    assert.equal(paid.newPaidCenaRoute('kling4', false), live ? 'kling4' : 'kling3')
    assert.equal(paid.newPaidCenaRoute('kling3', true), live ? 'kling4' : 'kling3')
    assert.equal(tiers.routeShot('product', 'commercial', 1), live ? 'kling4' : 'kling_o3')
    assert.equal(tiers.routeShot('text', 'commercial', 1), null)
    assert.equal(tiers.routeShot('user_video', 'commercial', 1), null)
    assert.equal(tiers.routeShot('product_hero', 'cinema', 1), 'seedance_20_fast')
    assert.equal(paid.kling4AdMaySpend({ phase: 'failed', plan: { voice_mode: 'narrated' }, jobs: [] }), false)
  }
})
test('voice tariff allowance bounds both complete syntheses without trimming Unicode text', () => {
  const voice = modules(true)('lib/ads/kling4Voice.ts')
  assert.equal(voice.KLING4_AD_VOICE_MAX_ATTEMPTS, 2)
  assert.equal(voice.KLING4_AD_VOICE_MAX_MILLIUSD, 200)
  assert.doesNotThrow(() => voice.assertKling4AdVoiceText('a'.repeat(1000)))
  assert.throws(() => voice.assertKling4AdVoiceText('a'.repeat(1001)))
  assert.throws(() => voice.assertKling4AdVoiceText('😀'.repeat(501)))
})
test('a voice budget refusal occurs before the queue POST and is explicitly safe to retry', async () => {
  const voice = modules(true, { FAL_KEY: 'offline-placeholder' })('lib/ads/kling4Voice.ts')
  await assert.rejects(voice.synthesizeKling4AdVoice('fal-ai/minimax/speech-2.8-hd', { prompt: 'Short original narration.' }, async () => false),
    error => error.name === 'Kling4PromoBudgetWait' && error.effect === 'voice')
})
test('a second status winner reloads the first winners saved state under its own lease before dispatch', async () => {
  const source = fs.readFileSync(path.join(root, 'lib/ads/cena/runtime.ts'), 'utf8')
  const parsed = ts.createSourceFile('runtime.ts', source, ts.ScriptTarget.ES2022, true)
  const fn = parsed.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'advanceCenaOrder')
  assert.ok(fn)
  const code = ts.transpileModule(fn.getText(parsed) + '\nexports.run = advanceCenaOrder;', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const plan = { input: {} }
  const stale = { route: 'kling4', phase: 'video', plan, jobs: [], imageRound: 1, videoAttempt: 1 }
  const fresh = { ...stale, phase: 'failed', reason: 'already_finalized' }
  let reads = 0, dispatchedPhase
  const query = { update() { return this }, eq() { return this }, is() { return this }, select() { return this },
    async maybeSingle() { reads++; return { data: reads === 1 ? { id: 'order' } : { plan: { cena: fresh } }, error: null } } }
  const admin = { from: () => query, auth: { admin: { getUserById: async () => ({ data: { user: { email: 'offline@example.com' } } }) } } }
  const exports = {}
  vm.runInNewContext(code, { exports, console, Date, isKling4AdPromoRef: () => false, cenaOf: p => p.cena,
    recordKling4PaidUse: async () => true, isEscolhaSamplePlan: () => false, cenaEnabled: () => true,
    isAdsInternalEmail: () => true, cenaJson() {}, failCenaOrder: async () => {},
    stepCena: async s => { dispatchedPhase = s.phase },
  })
  await exports.run(admin, { id: 'order', user_id: 'user', status: 'generating', plan: { cena: stale }, assembly_lease_at: null })
  assert.equal(reads, 2)
  assert.equal(dispatchedPhase, 'failed', 'dispatching the stale video state could buy the same job twice')
})
test('Kling4 choices contain three sequential five-second shots and only supported schema fields', () => {
  const load = modules(true), builders = load('lib/ads/cena/escolhaVideo.ts')
  const plan = { input: { foto: 'https://example.com/product.png', voice_mode: 'narrated' }, voice_mode: 'narrated',
    videoPrompt: 'Show the actual product.', escolha: { marker: 'KINEO-ADS-ESCOLHA-2310', shotPrompts: ['Opening.', 'Use.', 'Close.'] } }
  const jobs = json(builders.escolhaVideoRequests(plan, 'kling4', 'https://example.com/chosen.png'))
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].endpoint, 'kling/v4/image-to-video')
  assert.equal(jobs[0].input.duration, 15)
  assert.equal(jobs[0].input.resolution, '720p')
  assert.deepEqual(jobs[0].input.multi_prompt.map(p => p.duration), [5, 5, 5])
  for (const obsolete of ['generate_audio', 'shot_type', 'image_url', 'prompt']) assert.equal(obsolete in jobs[0].input, false)
})
test('legacy shots have exact integer duration and explicit720p; old Kling3 inputs are retained', () => {
  const load = modules(true), { buildShotInput } = load('lib/ads/v2Engines.ts')
  const shot = { imageUrl: 'https://example.com/chosen.png', prompt: 'Move the camera around the product.' }
  assert.deepEqual(json(buildShotInput('kling4', shot)), { prompt: shot.prompt, start_image_url: shot.imageUrl, duration: 3, resolution: '720p' })
  assert.deepEqual(json(buildShotInput('kling_o3', shot)), { prompt: shot.prompt, image_url: shot.imageUrl, duration: '3', generate_audio: false })
})
test('declared tariff budgets satisfy40percentCreator margin and rollback preserves old prices', () => {
  const load = modules(true), tiers = load('lib/ads/v2Tiers.ts'), paid = load('lib/ads/kling4Paid.ts')
  assert.equal(paid.KLING4_AD_CREDITS, 51)
  const budget = 15 * 157 + paid.KLING4_AD_FAL_EXTRAS_MILLIUSD + paid.KLING4_AD_OTHER_EXTRAS_MILLIUSD
  assert.ok(budget <= paid.KLING4_AD_CREDITS * 133 * .6)
  for (const [tier, old] of [['photo_motion', 34], ['commercial', 41], ['cinema', 51]]) {
    assert.equal(tiers.adsV2Credits(tier, 15, false), old)
    const spec = tiers.ADS_V2_TIERS[tier]
    const budget = (spec.shots - spec.heroCloseups) * .157 * 3 + spec.heroCloseups * .2419 * 4 + spec.generatedScenes * .15 + tiers.ADS_V2_FIXED_USD
    assert.ok(budget <= tiers.adsV2Credits(tier, 15, true) * .133 * .6)
  }
})

