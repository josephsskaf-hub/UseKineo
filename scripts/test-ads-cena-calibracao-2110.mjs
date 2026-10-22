// KINEO-ADS-CENA-95-2110 — calibração sempre seca, planner real, fotos fornecidas e mutantes somente em memória.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const FILE = 'scripts/ads-cena-calibracao-2110.mjs', PLAN = 'lib/ads/cena/plan95.ts'
const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const plain = x => JSON.parse(JSON.stringify(x))
// Exact references supplied by Joseph in the conversation on21/10. No GET, HEAD, image decode or model sees these files.
const expected = {
  creamUGCpt: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/6973ac07-c0e1-4945-9268-0c107f2c4ff9.png',
  shoeProducten: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/da91f983-1a1f-45ff-ab51-9c19ecbc39f7.png',
  watchProducten: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/bba61b7d-3092-4a0d-ab2e-6441edd40081.png',
  perfumeUGCen: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/d3d268db-fb6f-40a7-805b-cd86b3de7a4a.png',
  bagProductpt: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/b34414ce-0f38-4422-96d2-62a224bf76c6.png',
  teaUGCpt: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/987fe4b9-0b56-436a-8088-95b14fae9aa6.png',
}
async function scriptModule(source = read(FILE)) {
  const helper = pathToFileURL(process.cwd() + '/scripts/test-support/offline-ts-loader.mjs').href
  const code = source.replace("'./test-support/offline-ts-loader.mjs'", JSON.stringify(helper))
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
}
export async function calibrationProof(source = read(FILE), overrides = {}) {
  const m = await scriptModule(source), loadReal = createOfflineLoader({ source: (p, s) => overrides[p] ?? s })
  let loads = 0, reads = 0, fetches = 0
  const deps = { load: p => { loads++; return loadReal(p) }, readFile: async () => { reads++; return JSON.stringify(expected) } }
  assert.equal(typeof m.main, 'function'); assert.equal(typeof m.runCalibration, 'function'); assert.equal(loads, 0, 'importar não executa main')
  for (const argv of [[], ['--live'], ['--render'], ['--dry-run', '--live'], ['--dry-run', '--render'], ['--photos', 'never-read.json', '--nodry'], ['--photos', 'never-read.json'], ['--dry-run', '--no-dry-run']]) {
    await assert.rejects(m.main(argv, deps), /calibration_dry_run_required/); assert.equal(loads, 0); assert.equal(reads, 0, 'rejeita modo perigoso antes de ler arquivo ou planejar')
  }
  for (const options of [{}, { dry_run: false }, { dry_run: true, live: true }, { dry_run: true, render: true }]) { await assert.rejects(m.runCalibration(options, deps), /calibration_dry_run_required/); assert.equal(loads, 0) }
  await assert.rejects(m.main(['--dry-run', '--photos', '.env.local'], deps), /manifest_must_be_json/); assert.equal(reads, 0)
  const oldFetch = globalThis.fetch
  globalThis.fetch = async () => { fetches++; throw new Error('calibration test forbids network') }
  let result
  try { result = await m.main(['--dry-run'], deps) } finally { globalThis.fetch = oldFetch }
  assert.equal(fetches, 0, 'nenhum GET/HEAD/modelo/render chama rede')
  assert.equal(loads, 1); assert.equal(reads, 0)
  assert.equal(result.dry_run, true); assert.equal(result.offline, true); assert.equal(result.rendered, false); assert.equal(result.executable, false)
  assert.equal(result.actual_spend_usd, 0); assert.equal(result.actual_provider_usage, null); assert.equal(result.requires_founder_copy_review, true)
  assert.equal(result.cases.length, 6); assert.deepEqual(result.cases.map(c => c.role), Object.keys(expected)); assert.equal(result.sample_data_only, true)
  assert.equal(result.photo_manifest, 'founder_supplied_chat_2026_10_21_structure_checked_only')
  assert.deepEqual(plain(m.DEFAULT_FOUNDER_PHOTOS), expected)
  const categories = { creamUGCpt: 'skincare', shoeProducten: 'footwear', watchProducten: 'wearable', perfumeUGCen: 'perfume', bagProductpt: 'bag', teaUGCpt: 'tea' }
  let prepared = 0, unsupported = 0
  for (const c of result.cases) {
    assert.equal(c.sourcephoto, expected[c.role]); assert.equal(c.status, 'prepared_dry_run'); assert.equal(c.executable, false)
    assert.equal(c.photo_validation.performed, false); assert.equal(c.photo_validation.classifier, 'fixture_json'); assert.match(c.photo_validation.isolated_product, /not_observed/)
    assert.equal(c.sample_data_only, true); assert.match(c.diagnostic, /NÃO verificados/); assert.equal(c.plans.length, 6)
    for (const p of c.plans) {
      assert.equal(p.rendered, false)
      if (p.status === 'unsupported_route_language') { assert.equal(c.language, 'pt'); assert.equal(p.route, 'kling3'); assert.equal(p.voice_mode, 'talking'); assert.equal(p.plan, null); unsupported++; continue }
      prepared++; assert.equal(p.status, 'prepared_dry_run'); assert.equal(p.plan_complete, true); assert.equal(p.executable, false)
      assert.equal(p.plan.input.foto, expected[c.role]); assert.equal(p.plan.quality95.closePhoto, expected[c.role]); assert.equal(p.prompts.close_photo, expected[c.role])
      assert.equal(p.plan.category, categories[c.role]); assert.equal(p.plan.input.language, c.language); assert.equal(p.plan.input.formato, c.formato); assert.equal(p.plan.voice_mode, p.voice_mode)
      assert.deepEqual(plain(p.plan.quality95.shots), [{ kind: 'hook', start: 0, seconds: 3 }, { kind: 'use', start: 3, seconds: 7 }, { kind: 'close', start: 10, seconds: 5 }])
      assert.equal(p.plan.script.hooks.length, 3); assert.ok(p.plan.script.words >= 39 && p.plan.script.words <= 42); assert.ok(p.plan.script.hookEstimatedSeconds <= 1.5); assert.equal(p.plan.script.pauseSeconds, .35)
      assert.ok(p.plan.script.narration.includes(p.plan.input.oferta)); assert.ok(p.plan.script.narration.includes(p.plan.input.beneficios[0]))
      assert.equal(p.plan.quality95.planningUsage.measuredCalls, 0, 'JSON fixture não vira medição de fornecedor')
      assert.deepEqual(plain(p.prompts.keyframes), plain(p.plan.keyframePrompts)); assert.deepEqual(plain(p.prompts.segments), plain(p.plan.segmentPrompts)); assert.equal(p.prompts.person, p.plan.videoPrompt)
      assert.deepEqual(plain(p.estimated_cost), plain(p.plan.quality95.costs[p.route])); assert.ok(p.estimated_cost.totalUsd > 0); assert.equal(p.estimated_cost.estimated, true); assert.equal(p.estimated_cost.actualTotalUsd, null)
    }
  }
  assert.equal(prepared, 33); assert.equal(unsupported, 3)
  const override = { ...expected, creamUGCpt: expected.shoeProducten, shoeProducten: expected.creamUGCpt }
  const custom = await m.main(['--dry-run', '--photos', 'founder-photos.json', '--route', 'veo31', '--mode', 'narrated'], { ...deps, readFile: async () => JSON.stringify(override) })
  assert.equal(custom.cases[0].sourcephoto, override.creamUGCpt); assert.equal(custom.cases[0].plans[0].plan.input.foto, override.creamUGCpt, 'manifest substitui referência sem fingir validar seu conteúdo')
  assert.ok(custom.cases.every(c => c.plans.length === 1 && c.plans[0].route === 'veo31' && c.plans[0].voice_mode === 'narrated'))
  const missing = await m.runCalibration({ dry_run: true, photos: null, route: 'kling3', mode: 'narrated' }, deps)
  for (const c of missing.cases) { assert.equal(c.sourcephoto, null); assert.equal(c.status, 'needs_founder_photo'); assert.equal(c.plans[0].plan_complete, false); assert.equal(c.plans[0].plan.input.foto, `offline://founder-photo-needed/${c.role}`); assert.equal(c.executable, false) }
  const before = loads
  for (const bad of [{}, { ...expected, unexpected: expected.creamUGCpt }, { ...expected, creamUGCpt: 'http://example.invalid/photo.png' }, { ...expected, creamUGCpt: expected.creamUGCpt.replace('/images/', '/') }, { ...expected, creamUGCpt: expected.creamUGCpt + '?token=never-read' }]) await assert.rejects(m.runCalibration({ dry_run: true, photos: bad }, deps), /calibration_.*(?:manifest|photo)/)
  assert.equal(loads, before, 'manifest inválido recusa antes de planejar')
}
await calibrationProof()
const notes = read('docs/ADS-CENA-95-NOTAS.md')
const noteRows = notes.split('\n').filter(line => /\| (?:Kling3|Seedance2|Veo3\.1) \|/.test(line))
assert.equal(noteRows.length, 36); assert.ok(noteRows.every(line => /Não renderizado/.test(line) && /\|\s*\|\s*\|$/.test(line)), 'notas e defeitos continuam em branco, sem resultados inventados')
for (const url of Object.values(expected)) assert.ok(notes.includes(url), 'notas preservam as referências exatas fornecidas')
console.log('ok calibração:6casos,33planos dry_run reais+3rotas incompatíveis,6URLs exatas, JSON fixture identificado, zero fetch/render/env/DB')
const original = read(FILE), originalPlan = read(PLAN)
const mutations = [
  ['API aceita semdry', FILE, 'if (options?.dry_run !== true || options.live || options.render)', 'if (false)'],
  ['CLI aceita dry implícito', FILE, 'const options = { dry_run: false }', 'const options = { dry_run: true }'],
  ['perde sexto caso', FILE, 'for (const c of CALIBRATION_CASES)', 'for (const c of CALIBRATION_CASES.slice(0, 5))'],
  ['foto default trocada', FILE, "'6973ac07-c0e1-4945-9268-0c107f2c4ff9.png'", "'da91f983-1a1f-45ff-ab51-9c19ecbc39f7.png'"],
  ['manifest é ignorado no plano', FILE, 'const foto = sourcephoto ??', 'const foto = null ??'],
  ['fixture finge visão validada', FILE, 'photo_validation: { performed: false', 'photo_validation: { performed: true'],
  ['custos reais do planner somem', FILE, 'estimated_cost: plan.quality95.costs[route]', 'estimated_cost: null'],
  ['roteiro real perde3+7+5', PLAN, "{ kind: 'close', start: 10, seconds: 5 }", "{ kind: 'close', start: 12, seconds: 3 }"],
]
for (const [label, file, before, after] of mutations) {
  const raw = file === FILE ? original : originalPlan
  assert.equal(raw.split(before).length - 1, 1, 'mutação aplicada1vez: ' + label)
  let red = false
  try { await calibrationProof(file === FILE ? original.replace(before, after) : original, file === PLAN ? { [PLAN]: raw.replace(before, after) } : {}) } catch { red = true }
  assert.ok(red, 'mutante real precisa ficar vermelho: ' + label); console.log('ok mutante vermelho: ' + label)
}
