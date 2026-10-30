// KINEO-JUIZ-ESTADOS-3010 — offline calibration of decision semantics, not a new visual accuracy claim.
// Reuses the real Genesis prompt and narration from the 28/10 fixture. No provider or credentials.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { JUIZ_ESTADOS_3010, deltaJuizEstados3010Exato, semJuizEstados3010 } from './test-support/desfaz-juiz-estados-3010.mjs'

const root = new URL('../', import.meta.url)
const read = p => readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n')
const source = read('lib/cinematic/criticoStill.ts')
function load(src = source) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { target: 9, module: 1 } }).outputText,
    { exports, require: id => { assert.equal(id, '@/lib/hollywood/juizStill'); return { JUIZ_STILL_MODELO: 'fixture-model' } },
      Date, setTimeout, clearTimeout, AbortController, process: { env: {} }, console })
  return exports
}
const C = load()
const old = read('scripts/test-juiz-refaz-2810.mjs')
const fala = vm.runInNewContext(old.match(/const GENESIS_FALAS = (\[[^\n]+\])/)[1])[0]
const mostra = vm.runInNewContext(old.match(/const GENESIS_PROMPTS = (\[[\s\S]+?\n\])/)[1])[0]
const input = { indice: 0, url: 'https://fixture.invalid/original.jpg', prompt: mostra, mostra, fala, seed: 119 }
const pass = score => ({ verdict: 'PASS', issues: [], reason: '', score })
const fail = (score, issues = ['subject']) => ({ verdict: 'FAIL', issues, reason: 'Main subject is not a cosmic galaxy.', score })
let checks = 0
const test = async (name, fn) => { await fn(); checks++; console.log('ok ' + name) }
async function judge(responses, options = {}) {
  let calls = 0, regens = 0
  const filme = C.novoFilmeDoCritico(options.mode ?? 'enforce', { prazo: options.prazo ?? Infinity })
  const result = await C.criticarStill(input, { filme, apiKey: 'offline-fixture', agora: () => 1000,
    gerarStill: async () => { regens++; return options.noImage ? null : `https://fixture.invalid/new-${regens}.jpg` },
    fetchImpl: async () => {
      const response = responses[calls++]; if (response === 'timeout') throw new Error('timeout fixture')
      return { ok: true, json: async () => ({ choices: [{ message: { content: typeof response === 'string' ? response : JSON.stringify(response) } }] }) }
    },
  })
  return { ...result, calls, regens }
}
const response = url => ({ scenes: ['Genesis'], scene_fal_inputs: [{ image_url: url }] })
const summary = (r, url = r.url, extras = []) => C.relatoStillNoClaim(response(url), [r.relato], extras).cenas[0]

await test('good fixture: PASS at a low score stays approved, no extra generation or score gate', async () => {
  const r = await judge([pass(5)]); assert.equal(r.relato.estado_final, 'PASS'); assert.equal(r.regens, 0)
  assert.equal(summary(r).regra_seguimento, 'animate_approved'); assert.equal(summary(r).aprovado_final, true)
})
await test('good fixture: rejection for taste remains ignored, preserving the existing rubric', async () => {
  const r = await judge([fail(20, ['ugly'])]); assert.equal(r.relato.estado_final, 'PASS'); assert.equal(r.regens, 0)
})
await test('good fixture: identity without a reference is not a new blocking criterion', async () => {
  const r = await judge([fail(20, ['identity'])]); assert.equal(r.relato.estado_final, 'PASS'); assert.equal(r.regens, 0)
})
let rejected
await test('bad Genesis fixture: best of three FAILs remains BEST_FAIL in report and claim', async () => {
  rejected = await judge([fail(20), fail(55), fail(40)]); const r = rejected
  assert.equal(r.regens, 2); assert.equal(r.calls, 3); assert.equal(r.url, 'https://fixture.invalid/new-1.jpg')
  assert.equal(r.relato.veredito_final, 'FAIL'); assert.equal(r.relato.nota_final, 55)
  assert.equal(r.relato.estado_final, 'BEST_FAIL'); assert.equal(r.relato.aprovado_final, false)
  assert.equal(summary(r).estado_final, 'BEST_FAIL'); assert.equal(summary(r).regra_seguimento, 'animate_degraded')
})
await test('score cannot override a PASS, even if the rejected original scored higher', async () => {
  const r = await judge([fail(100), pass(1)]); assert.equal(r.relato.estado_final, 'PASS'); assert.equal(r.relato.nota_final, 1)
})
await test('unverified fixtures: timeout, malformed answer, off and exhausted deadline stay UNVERIFIED', async () => {
  for (const [responses, options] of [[['timeout'], {}], [['broken json'], {}], [[], { mode: 'off' }], [[], { prazo: 1000 }]]) {
    const r = await judge(responses, options); assert.equal(r.relato.estado_final, 'UNVERIFIED'); assert.equal(r.relato.aprovado_final, false)
    assert.equal(summary(r).estado_final, 'UNVERIFIED')
  }
})
await test('failed regeneration and log_only do not erase a known FAIL or add retries', async () => {
  for (const options of [{ noImage: true }, { mode: 'log_only' }]) {
    const r = await judge([fail(20)], options); assert.equal(r.relato.estado_final, 'BEST_FAIL'); assert(r.regens <= 1)
  }
})
await test('a late PASS of a replacement cannot approve the rejected original actually dispatched', async () => {
  const r = await judge([fail(20), pass(90)]); assert.equal(summary(r, input.url).estado_final, 'BEST_FAIL')
})
await test('sheet fallback uses the actual final URL and its own verdict, never a previous PASS', async () => {
  const r = await judge([pass(80)]), url = 'https://fixture.invalid/no-sheet.jpg'
  for (const [veredito, state] of [['PASS', 'PASS'], ['FAIL', 'BEST_FAIL'], ['ERRO', 'UNVERIFIED'], [null, 'UNVERIFIED']]) {
    const s = summary(r, url, [{ cena: 1, url, veredito, nota: 90 }]); assert.equal(s.estado_final, state)
  }
  assert.equal(summary(r, null).estado_final, 'UNVERIFIED')
})
await test('trial multi-shot claim follows its approved scene_plan, not unused single-shot fallbacks', async () => {
  const r = await judge([fail(20), pass(90)])
  const claim = C.relatoStillNoClaim({ ...response(input.url), kling4_trial: { scene_plan: [{ still_url: r.url }, { still_url: null }] } }, [r.relato])
  assert.equal(claim.cenas[0].estado_final, 'PASS'); assert.equal(claim.cenas[1].estado_final, 'UNVERIFIED')
})
await test('exact t2v payload cannot inherit approval from an unused planned anchor', async () => {
  const r = await judge([pass(90)])
  const base = response(r.url)
  base.scene_fal_inputs = [{ prompt: 'An actual text-to-video payload without an image.' }]
  const claim = C.relatoStillNoClaim(base, [r.relato])
  assert.equal(claim.cenas[0].url_final, null); assert.equal(claim.cenas[0].estado_final, 'UNVERIFIED')
  base.scene_fal_inputs = [{ prompt: 'Actual Kling start image payload.', start_image_url: r.url }]
  assert.equal(C.relatoStillNoClaim(base, [r.relato]).cenas[0].estado_final, 'PASS')
})
await test('the real publication block signs all three states and removes rejudged FAIL references', async () => {
  const route = read('app/api/generate-video-cinematic/route.ts')
  const start = route.indexOf('    const publishCinematicResponse = async (')
  const end = route.indexOf('      return settleDebitAndRespond(completed.claim, response)', start)
  assert(start > 0 && end > start)
  const block = route.slice(start, route.indexOf('\n    }', end) + 6)
  const snapshot = { approvedStills: [{ url: rejected.url }] }; let signed
  const globals = { response: response(rejected.url), qualitySnapshot: snapshot, readFilmQualitySnapshot: v => v ?? null,
    stillDecisionReports: [rejected.relato], stillDecisionExtras: [], relatoStillNoClaim: C.relatoStillNoClaim,
    cinematicSubmissionUncertain: false, personagemRelatoFinal: null, estrelaAtiva: false, cinematicSubmissionCache: new Map(),
    cacheKey: 'cache', claimFingerprint: 'fingerprint', cost: 1, claimQuality: 'cinematic', claimEngine: 'fixture', cinematicAdmin: {},
    serviceRoleKey: 'offline-fixture', user: { id: 'user' }, generationId: 'fixture-generation', Date,
    completeCinematicClaim: async o => { signed = structuredClone(o.response); return { ok: true, claim: {} } },
    settleDebitAndRespond: async (_, r) => r,
  }
  const js = ts.transpileModule(block + '\nglobalThis.publish = publishCinematicResponse', { compilerOptions: { target: 9, module: 1 } }).outputText
  vm.runInNewContext(js, globals); await globals.publish(globals.response, ['job-1'], ['fixture'])
  assert.equal(signed.still_critic.cenas[0].estado_final, 'BEST_FAIL'); assert.equal(signed.quality_snapshot.approvedStills.length, 0)
  const other = C.relatoStillNoClaim(response(input.url), [], [])
  assert.equal(other.cenas[0].estado_final, 'UNVERIFIED')
})
await test('mutant promoting a high-score FAIL is caught', async () => {
  const mutant = load(source.replace("veredito === 'PASS' ? 'PASS' : veredito === 'FAIL' ? 'BEST_FAIL'", "veredito === 'PASS' || (nota ?? 0) > 50 ? 'PASS' : veredito === 'FAIL' ? 'BEST_FAIL'"))
  assert.notEqual(mutant.decisaoFinalStill('FAIL', 55).estado_final, C.decisaoFinalStill('FAIL', 55).estado_final)
})
await test('exact TRAVA receipt restores the fixed baseline and rejects unknown edits', async () => {
  for (const path of Object.keys(JUIZ_ESTADOS_3010.scope)) {
    const before = execFileSync('git', ['show', `${JUIZ_ESTADOS_3010.base}:${path}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n')
    assert.equal(semJuizEstados3010(read(path), path), before)
    assert.equal(deltaJuizEstados3010Exato(read(path), before, path), true)
    assert.equal(deltaJuizEstados3010Exato(read(path) + '\n// unknown edit\n', before, path), false)
  }
})
console.log(`${checks} checks passed; providers=0, paid renders=0. Visual model accuracy was not remeasured.`)
