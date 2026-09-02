#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)((id) => {
    throw new Error(`${path}: unexpected import ${id}`)
  }, module, module.exports)
  return module.exports
}

const contract = loadTs('lib/growth/businessAnswerEngineRouter.ts')
const router = contract.buildBusinessAnswerEngineRouter(
  'https://www.usekineo.com',
  {
    url: 'https://www.usekineo.com/ai-shorts-for-agencies',
    packs: [{ videos: 10 }, { videos: 20 }, { videos: 30 }, { videos: 50 }],
  },
)

equal(router.version, 'business_answer_engine_router_v1', 'router has a stable version')
equal(router.audience, 'businesses_freelancers_and_agencies', 'audience stays inside the supported market')
equal(router.choices.length, 4, 'router exposes exactly four existing paths')
equal(new Set(router.choices.map((choice) => choice.id)).size, 4, 'choice ids are unique')
equal(
  router.choices.map((choice) => choice.id).join(','),
  'recurring_operator,content_plan,client_brief,fixed_batch',
  'work-state choices stay explicit and ordered',
)

const expected = {
  recurring_operator: ['/pricing', 'b2b_answer_router_recurring_v1', '#plans'],
  content_plan: ['/business-video-content-plan', 'business_answer_router_content_plan_v1', ''],
  client_brief: ['/client-video-brief-generator', 'business_answer_router_client_brief_v1', ''],
  fixed_batch: ['/ai-shorts-for-agencies', 'business_answer_router_fixed_batch_v1', '#agency-pack-heading'],
}

for (const choice of router.choices) {
  const url = new URL(choice.url)
  const [pathname, campaign, hash] = expected[choice.id]
  equal(url.protocol, 'https:', `${choice.id}: public HTTPS destination`)
  equal(url.hostname, 'www.usekineo.com', `${choice.id}: canonical production host`)
  equal(url.pathname, pathname, `${choice.id}: existing public path`)
  equal(url.searchParams.get('intent_campaign'), campaign, `${choice.id}: exact internal campaign`)
  equal(url.hash, hash, `${choice.id}: intended section only`)
  ok(!choice.url.includes('/api/'), `${choice.id}: crawler cannot call an API action`)
  ok(!choice.url.includes('utm_source='), `${choice.id}: router cannot overwrite ChatGPT first touch`)
  ok(choice.useWhen.length > 40, `${choice.id}: decision condition is meaningful`)
  ok(choice.outcome.length > 20, `${choice.id}: destination outcome is explicit`)
}

ok(router.selectionRule.includes('work state'), 'selection is based on current work state')
ok(router.boundaries.some((line) => line.includes('one Kineo account')), 'single-account boundary is explicit')
ok(router.boundaries.some((line) => line.includes('team seats')), 'team-seat limitation is explicit')
ok(router.boundaries.some((line) => line.includes('white-label portal')), 'white-label limitation is explicit')
ok(router.choices.find((choice) => choice.id === 'recurring_operator')?.outcome.includes('Autopilot is a separate done-for-you publishing option'), 'recurring self-service path distinguishes Autopilot')
ok(!read('lib/growth/businessAnswerEngineRouter.ts').includes('10–50'), 'pack range is derived instead of duplicated')

const canonical = read('lib/kineoFacts.ts')
ok(canonical.includes("from './growth/businessAnswerEngineRouter'"), 'canonical facts import the router')
ok(canonical.includes('businessCreationRouter: BUSINESS_ANSWER_ENGINE_ROUTER'), 'public JSON exposes the router')

const llms = read('app/llms.txt/route.ts')
ok(llms.includes('Choose the business path from the work you already have'), 'llms text names the decision problem')
ok(llms.includes('BUSINESS_ANSWER_ENGINE_ROUTER.choices.map'), 'llms text executes every canonical choice')
ok(llms.includes('BUSINESS_ANSWER_ENGINE_ROUTER.boundaries.map'), 'llms text derives boundaries from the router')

const factsPage = read('app/facts/page.tsx')
ok(factsPage.includes('Which Kineo path should a business, freelancer or agency choose?'), 'human fact sheet asks the routing question')
ok(factsPage.includes('BUSINESS_ANSWER_ENGINE_ROUTER.choices'), 'human answer derives from the canonical choices')
ok(factsPage.includes('links: BUSINESS_ANSWER_ENGINE_ROUTER.choices'), 'human fact sheet exposes the same four destinations')
ok(factsPage.includes('href={link.url}'), 'human fact sheet renders each destination as a real link')

const truthReport = read('scripts/b2b-subscription-truth-report.mjs')
ok(truthReport.includes("intentCampaign: 'b2b_answer_router_recurring_v1'"), 'subscription report owns the exact recurring campaign')
ok(truthReport.includes("stageAttribution: 'exact_pricing_source'"), 'pricing exposure requires exact source')

const preview = read('docs/previews/B2B-ANSWER-ENGINE-ROUTER-2026-09-02.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label}`)
}
for (const choice of router.choices) {
  ok(preview.includes(choice.label), `preview includes ${choice.id}`)
}

console.log(`business answer engine router: ${checks}/${checks}`)
