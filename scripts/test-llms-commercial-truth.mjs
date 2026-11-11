// Offline regression: execute the real GET and canonical modules, with no network or DB.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const now = Date.parse('2026-09-13T19:25:00Z')
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])) }
  static now() { return now }
}
async function verify(reverseTrialEnabled, refillRelease) {
  const load = createOfflineLoader({
    mocks: refillRelease ? { '@/lib/billing/recargaAssinante': { RECARGA_ASSINANTE_1111_RELEASE: refillRelease } } : {},
    env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: String(reverseTrialEnabled) },
    globals: { Response, Date: FixedDate },
  })
  const route = load('app/llms.txt/route.ts')
  const policy = load('lib/entryPolicy.ts')
  const facts = load('lib/kineoFacts.ts')
  const launch = load('lib/engineLaunch.ts')
  const checkout = load('lib/checkoutPricing.ts')
  const settlement = load('lib/settlementCurrency.ts')
  const { CITATION_ANSWER_LINKS, CITATION_BASE } = load('lib/growth/citationAnswers.ts')
  const response = route.GET()
  const body = await response.text()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8')
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
  assert.equal(response.headers.get('x-robots-tag'), 'all')
  assert.equal(route.dynamic, 'force-static')
  assert.equal(route.fetchCache, 'force-no-store')
  const publicRefill = (refillRelease ?? load('lib/billing/recargaAssinante.ts').RECARGA_ASSINANTE_1111_RELEASE) === 'public'
  assert.doesNotMatch(body, /there are no one-time credit packs/)
  if (publicRefill) {
    assert.match(body, /Eligible paid subscribers can purchase additional credits through the subscriber refill flow/)
    assert.match(body, /2026-11-11: Eligible paid subscribers/)
  } else {
    assert.doesNotMatch(body, /subscriber refill flow/)
  }

  function section(text, heading) {
    const start = text.indexOf(heading)
    assert.ok(start >= 0, `Missing section: ${heading}`)
    const end = text.indexOf('\n## ', start + heading.length)
    return text.slice(start, end === -1 ? undefined : end)
  }
  const free = section(body, reverseTrialEnabled ? '## What a new account gets for free' : '## Free tier')
  assert.equal(policy.CARD_ENTRY_ONLY, false, 'This regression covers the approved free-entry policy')
  if (reverseTrialEnabled) {
  assert.ok(free.includes(`${policy.FREE_ENTRY_CREDITS} free credits`), 'Trial follows canonical credits')
  // REANCORADO KINEO-GEO-RODADA3-2026-10-08 (com motivo): "every engine is unlocked" era a promessa do trial de 09/09, morta
  // em 05/10 (o saldo do trial paga o filme grátis de 15 s, não um filme nos outros motores). A seção diz o que o saldo paga;
  // a frase velha não volta (prova com mutante: scripts/test-geo-rodada3-2026-10-08.mjs, R10 / M27).
  assert.doesNotMatch(free, /every engine.*unlocked/i)
  assert.ok(free.includes(`a full film on any other engine needs a paid plan${checkout.TOPUPS_LIVE ? ' or a credit pack' : ''};`))
  if (!checkout.TOPUPS_LIVE) assert.doesNotMatch(free, /or a credit pack/)
  assert.match(free, /Access does not mean the balance covers a full video\./)
  } else {
  assert.ok(free.includes(`Up to ${facts.FREE_TIER.videosPer24h} ${facts.FREE_TIER.engine} videos every 24 hours`), 'Legacy flag state remains unchanged')
  }
  assert.match(free, /No credit card required\./)
  assert.match(free, /watermark/i)

  const pricing = section(body, '## Pricing')
  for (const plan of facts.PLAN_FACTS) {
    const line = pricing.split('\n').find(value => value.startsWith(`- **${plan.name}**`))
    assert.ok(line?.includes(plan.monthlyUsd), `${plan.name}: canonical monthly amount`)
    assert.ok(line?.includes(`${plan.creditsPerMonth} credits per billing month`), `${plan.name}: canonical credits`)
  }
  assert.equal(settlement.resolveSettlementCurrency({ ipCountry: 'BR' }).currency, 'brl')
  assert.equal(settlement.resolveSettlementCurrency({ ipCountry: 'BR', forced: 'usd' }).currency, 'usd')
  assert.match(pricing, /reference prices in USD/)
  assert.match(pricing, /Customers in Brazil normally pay in BRL/)
  assert.match(pricing, /check the checkout for the currency and amount/)
  assert.doesNotMatch(pricing, /Checkout currency: USD\./)

  const shipped = section(body, '## Recently shipped')
  assert.doesNotMatch(shipped, /2026-09-09 \(morning|2026-09-08 \(|2026-08-19\/20/)
  assert.doesNotMatch(shipped, /\$1 trial|no free tier any more|single USD price worldwide|supersedes the two entries below/)
  assert.match(shipped, /2026-09-09 \(evening\): the free trial is back/)
  assert.match(shipped, /Studio uses its regular annual price/)
  if (launch.H3_TURBO_PUBLIC) {
    assert.doesNotMatch(body, /Where to use Seedance 1\.5 online/)
    assert.match(body, /The standard narrated film uses MiniMax H3 Turbo/)
  }
  for (const { path } of CITATION_ANSWER_LINKS) {
    assert.ok(body.includes(`](${CITATION_BASE}${path})`), `Existing guide remains linked: ${path}`)
  }

  // Optional delivery check: compare old/new route responses using the SAME canonical
  // dependencies and fixed clock. Normalize only the approved currency/history/refill copy.
  const baseline = process.argv[2]
  if (baseline) {
    assert.match(baseline, /^[a-f0-9]{40}$/, 'Baseline must be a full reviewed commit SHA')
    const source = execFileSync('git', ['show', `${baseline}:app/llms.txt/route.ts`], { encoding: 'utf8' })
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, { exports, require: name => load(name), Response, Date: FixedDate }, { timeout: 5000 })
    const previous = exports.GET()
    const oldBody = await previous.text()
    assert.deepEqual([...response.headers], [...previous.headers], 'Response headers stay unchanged')
    const links = text => [...text.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map(match => match[1])
    assert.deepEqual(links(body), links(oldBody), 'All destinations, CTAs and campaign parameters stay unchanged')
    let expected = oldBody.replace('- Checkout currency: USD.', '- Published plan amounts are reference prices in USD. Customers in Brazil normally pay in BRL; check the checkout for the currency and amount.')
    expected = expected.replace(/^- 2026-09-09 \(morning, superseded the same day\):[\s\S]*?(?=^- 2026-08-23:)/m, '')
    expected = expected.replace(/^- 2026-08-19\/20 \(superseded on 2026-09-08, see above\):[\s\S]*?(?=^- 2026-08-18:)/m, '')
    expected = expected.replace('- 2026-09-09 (evening — supersedes the two entries below):', '- 2026-09-09 (evening):')
    expected = expected.replace('film of 60 s), every engine unlocked, no card required. The $1 trial is retired.', 'film of 60 s), every engine unlocked, no card required.')
    const refillCopy = 'Eligible paid subscribers can purchase additional credits through the subscriber refill flow.'
    expected = expected.replace('Credits come with the plan:\n  there are no one-time credit packs.', `Credits come with the plan.\n  Standard plan credits are shared across creations.${publicRefill ? ` ${refillCopy}` : ''}`)
    expected = expected.replace(/^(- 2026-11-04: Kineo updated its plans and stopped selling one-time passes and credit top-ups\. Existing subscribers keep the price and credits they signed up with\.)$/m, `$1${publicRefill ? `\n- 2026-11-11: ${refillCopy} Eligibility is checked in the app.` : ''}`)
    assert.ok(body === expected, 'No response change outside the approved currency/history/refill lines')
  }
  console.log(`PASS: reverse trial ${reverseTrialEnabled ? 'ON' : 'OFF'}, subscriber refill ${refillRelease ?? 'actual release'}; real GET, headers, canonical offer, BRL exception, history and guide links; no network or DB`)
  if (baseline) console.log('PASS: fixed-clock baseline comparison; all other response content and destinations unchanged')
}

await verify(true)
await verify(false)
await verify(true, 'off')
await verify(true, 'internal')
