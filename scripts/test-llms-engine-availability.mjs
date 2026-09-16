// Real serialized GET, canonical modules; no network, database or paid generation.
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const baseline = process.argv[2] || 'fc1bd4e922db96033daa9d7a98038e47742a4e33'
assert.match(baseline, /^[a-f0-9]{40}$/)
const oldSource = execFileSync('git', ['show', `${baseline}:app/llms.txt/route.ts`], { encoding: 'utf8' })
const now = Date.parse('2026-09-16T05:09:38Z')
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])) }
  static now() { return now }
}
function compile(text, load) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => load(name), Response, Date: FixedDate }, { timeout: 5000 })
  return exports
}
function section(body, heading) {
  const start = body.indexOf(heading)
  assert.ok(start >= 0, `Missing ${heading}`)
  const end = body.indexOf('\n## ', start + heading.length)
  return body.slice(start, end === -1 ? undefined : end)
}
function verifyAvailability(body, facts, launch, enabled) {
  const free = section(body, enabled ? '## What a new account gets for free' : '## Free tier')
  const catalogue = section(body, '## Engines and what a video costs')
  const pauses = launch.PAUSED_ENGINE_KEYS.map(key => launch.ENGINE_PAUSE[key])
  const activeLine = free.split('\n').find(line => line.startsWith('- Engines not paused in the catalogue:'))
  assert.ok(activeLine, 'Availability must be explicit even when trial is disabled')
  assert.match(activeLine, /not a live provider-health check or a guarantee of generation/)
  assert.doesNotMatch(free, /every engine listed below is unlocked/)
  assert.match(free, /No credit card required/)
  assert.match(free, /watermark/)
  for (const pause of pauses) {
    assert.ok(free.includes(`${pause.label}: temporarily paused for new films since ${pause.since}.`))
    assert.ok(!activeLine.includes(pause.label), `${pause.label} must not be in active catalogue list`)
    const pauseLine = free.split('\n').find(line => line.startsWith(`- ${pause.label}:`))
    assert.match(pauseLine, /A paid plan or additional credits does not remove this maintenance pause/)
    assert.ok(pauseLine.includes(pause.alternative.label))
    const fact = facts.ENGINE_FACTS.find(engine => engine.name === pause.label)
    if (fact) {
      const row = catalogue.split('\n').find(line => line.startsWith(`- [**${fact.name}**]`))
      assert.ok(row.includes(`](${fact.url})`))
      assert.ok(row.includes(`Temporarily paused for new films since ${pause.since}`))
      assert.ok(row.includes(`Reference cost: ${fact.credits} credits`))
      assert.match(row, /regardless of plan or credit balance/)
      assert.doesNotMatch(row, /#1-ranked|covers the same job|Renders talking-character/)
    }
  }
  for (const fact of facts.ENGINE_FACTS.filter(engine => !pauses.some(p => p.label === engine.name))) {
    assert.ok(activeLine.includes(fact.name), `${fact.name} remains in the catalogue`)
    assert.ok(catalogue.includes(`- [**${fact.name}**](${fact.url}) — ${fact.credits} credit${fact.credits === 1 ? '' : 's'} per video. ${fact.what}`))
  }
  if (facts.TRIAL_ACCESS) {
    const balance = free.split('\n').find(line => line.startsWith('- For engines not currently paused,'))
    assert.ok(balance.includes(`${facts.TRIAL_ACCESS.credits}-credit trial balance`))
    for (const pause of pauses) assert.ok(!balance.includes(pause.label), 'Maintenance must not be described as insufficient balance')
    for (const engine of facts.TRIAL_ACCESS.engineCoverage.filter(e => !pauses.some(p => p.label === e.engine))) {
      assert.ok(balance.includes(engine.engine))
      if (engine.wholeReferenceVideosCovered > 0) assert.ok(balance.includes(`${engine.engine} (${engine.wholeReferenceVideosCovered} full reference video`))
    }
    assert.match(free, /maintenance pauses below still apply/)
    assert.match(free, /Access does not mean the balance covers a full video/)
  }
}

for (const enabled of [true, false]) {
  const load = createOfflineLoader({
    env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: String(enabled) },
    globals: { Response, Date: FixedDate },
  })
  const facts = load('lib/kineoFacts.ts'), launch = load('lib/engineLaunch.ts')
  const route = load('app/llms.txt/route.ts')
  const response = route.GET(), body = await response.text()
  assert.equal(response.status, 200)
  verifyAvailability(body, facts, launch, enabled)
  const previous = compile(oldSource, load).GET(), oldBody = await previous.text()
  assert.throws(() => verifyAvailability(oldBody, facts, launch, enabled), assert.AssertionError, 'Baseline must reproduce the missing availability distinction')
  assert.deepEqual([...response.headers], [...previous.headers], 'No cache/header change')
  assert.equal(route.dynamic, 'force-static')
  assert.equal(route.fetchCache, 'force-no-store')
  const links = text => [...text.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map(m => m[1])
  assert.deepEqual(links(body), links(oldBody), 'Every existing URL and campaign stays unchanged')
  const removeChangedSections = text => text
    .replace(section(text, enabled ? '## What a new account gets for free' : '## Free tier'), '<trial>')
    .replace(section(text, '## Engines and what a video costs'), '<engines>')
  assert.equal(removeChangedSections(body), removeChangedSections(oldBody), 'All other content, including prices, remains byte-identical')
  if (enabled) {
    // Exercise the dormant eligibility branch and a balance that covers paused engines.
    // Only trial facts are varied; the actual maintenance source and GET remain in use.
    const fixtureFacts = { ...facts, TRIAL_ACCESS: { ...facts.TRIAL_ACCESS,
      everyEngineUnlocked: false,
      engineCoverage: facts.TRIAL_ACCESS.engineCoverage.map(e => ({ ...e, wholeReferenceVideosCovered: 1 })),
    } }
    const fixtureLoad = createOfflineLoader({
      env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' },
      mocks: { '@/lib/kineoFacts': fixtureFacts }, globals: { Response, Date: FixedDate },
    })
    const fixtureBody = await fixtureLoad('app/llms.txt/route.ts').GET().text()
    verifyAvailability(fixtureBody, fixtureFacts, launch, true)
    assert.match(fixtureBody, /Kineo 1 and Seedance 1.5 are unlocked by plan/)
  }
  console.log(`PASS reverse-trial=${enabled}: real GET, maintenance/access/balance, active engines, baseline RED, unchanged links/prices/headers`)
}
