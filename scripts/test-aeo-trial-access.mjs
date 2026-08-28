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
function ok(value, label) { assert.ok(value, label); checks += 1 }
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${path}: unexpected import ${id}`)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

const engineCost = loadTs('lib/credits/engineCost.ts')
const offer = loadTs('lib/freeTierOffer.ts', { './credits/engineCost': engineCost })
const facts = loadTs('lib/growth/trialAccessFacts.ts')

equal(offer.TRIAL_GRANT_CREDITS_COPY, 25, 'test reads the canonical current grant')
equal(offer.buildFreeTierOffer(true).reverseTrial, true, 'reverse trial branch is executable')
equal(offer.buildFreeTierOffer(true).limit, 1, 'recurring post-trial limit comes from the offer')

const engines = [
  ['Kineo 1', 'fast'],
  ['Seedance 1.5', 'cinematic_ai'],
  ['Kling 2.5', 'cinematic_kling'],
  ['Veo 3.1', 'cinematic_veo'],
  ['Avatar', 'avatar'],
  ['MiniMax H3', 'cinematic_h3'],
  ['Omni Flash', 'cinematic_omni'],
  ['Kling 3', 'cinematic_hollywood'],
].map(([name, quality]) => ({
  name,
  credits: engineCost.creditCostForDuration(quality, true, 60),
}))

const trial = facts.buildTrialAccessFact({
  enabled: true,
  credits: offer.TRIAL_GRANT_CREDITS_COPY,
  engines,
})
ok(trial, 'enabled trial produces a record')
equal(trial.credits, 25, 'trial publishes the real balance')
equal(trial.everyEngineUnlocked, true, 'access is explicit')
equal(trial.noCardRequired, true, 'card boundary is explicit')
equal(trial.watermark, true, 'trial watermark is explicit')
equal(trial.cleanDownloadRequiresPaidPlan, true, 'clean-download boundary is explicit')
equal(trial.engineCoverage.length, engines.length, 'coverage includes every named engine')

for (const row of trial.engineCoverage) {
  const source = engines.find((engine) => engine.name === row.engine)
  equal(row.creditsPerReferenceVideo, source.credits, `${row.engine}: cost comes from the real 60s ruler`)
  equal(row.wholeReferenceVideosCovered, Math.floor(25 / source.credits), `${row.engine}: balance coverage is calculated`)
}

const covered = trial.engineCoverage.filter((row) => row.wholeReferenceVideosCovered > 0).map((row) => row.engine)
equal(covered.join(','), 'Kineo 1,Seedance 1.5', '25 credits cover only the two truthful reference choices')
const balanceShort = trial.engineCoverage.filter((row) => row.wholeReferenceVideosCovered === 0).map((row) => row.engine)
equal(balanceShort.join(','), 'Kling 2.5,Veo 3.1,Avatar,MiniMax H3,Omni Flash,Kling 3', 'unlocked-but-not-covered engines stay named')
equal(facts.buildTrialAccessFact({ enabled: false, credits: 25, engines }), null, 'disabled trial publishes no trial record')
assert.throws(() => facts.buildTrialAccessFact({ enabled: true, credits: -1, engines }), /invalid_trial_credit_balance/)
checks += 1

const recurring = facts.buildRecurringFreeAccessFact({ engine: 'Kineo 1', videosPerWindow: 1, rollingWindowHours: 720 })
equal(recurring.engine, 'Kineo 1', 'recurring access names the public engine')
equal(recurring.videosPerWindow, 1, 'recurring access names the allowance')
equal(recurring.rollingWindowHours, 720, 'recurring access names the real window')
equal(recurring.creditsGranted, 0, 'recurring access does not pretend to grant credits')

const canonical = read('lib/kineoFacts.ts')
ok(canonical.includes('export const TRIAL_ACCESS = buildTrialAccessFact({'), 'canonical facts build the trial record')
ok(canonical.includes('engines: ENGINE_FACTS'), 'trial coverage uses the canonical engine catalog')
ok(canonical.includes('export const RECURRING_FREE_ACCESS = buildRecurringFreeAccessFact({'), 'canonical facts build recurring access')
ok(canonical.includes('videosPerWindow: FREE_OFFER.limit'), 'recurring limit uses the offer')
ok(canonical.includes('trialAccess: TRIAL_ACCESS'), 'JSON payload exposes trialAccess')
ok(canonical.includes('recurringFreeAccess: RECURRING_FREE_ACCESS'), 'JSON payload exposes recurringFreeAccess')
ok(canonical.includes("engineScope: 'recurring_free_access' as const"), 'legacy free-tier engine declares its recurring scope')
ok(canonical.includes('engineCanonicalName: ENGINE_FACTS[0].name'), 'legacy engine key is paired with the public name')
ok(!canonical.includes('80 créditos na inscrição'), 'stale trial-credit comment is removed')
ok(!canonical.includes('the only one available on the free tier'), 'engine prose no longer contradicts trial access')

const llms = read('app/llms.txt/route.ts')
ok(llms.includes('TRIAL_ACCESS.engineCoverage'), 'llms text derives engine coverage')
ok(llms.includes('Access does not mean the balance covers a full video.'), 'llms text explains access versus balance')
ok(llms.includes('After the trial, recurring free access is'), 'llms text distinguishes the recurring allowance')
ok(!llms.includes('The generative engines below require a paid plan.'), 'live contradictory sentence is removed')
ok(llms.includes('wholeReferenceVideosCovered === 0'), 'insufficient balance is calculated rather than guessed')

const page = read('app/facts/page.tsx')
ok(page.includes("q: 'Can I try every Kineo video engine for free?'"), 'human fact sheet answers the buyer question')
ok(page.includes('TRIAL_COVERED_ENGINES'), 'human answer derives covered engines')
ok(page.includes('TRIAL_BALANCE_SHORT_ENGINES'), 'human answer derives balance-short engines')
ok(page.includes('recurring free access is'), 'human page distinguishes post-trial access')

const preview = read('docs/previews/AEO-TRIAL-ACCESS-TRUTH-2026-08-28.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label}`)
}
ok(preview.includes('Unlocked ≠ covered by the balance'), 'preview shows the corrected mental model')
ok(preview.includes('Recurring free access'), 'preview names the second state')

console.log(`AEO trial access: ${checks}/${checks} checks passed`)
