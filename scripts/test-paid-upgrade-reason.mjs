// Offline regression: execute the actual modal opener, including its telemetry.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'

const file = 'app/(dashboard)/generate/GenerateClient.tsx'
const source = fs.readFileSync(file, 'utf8')
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let opener
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'openOutOfCreditsModal') opener = node.getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)
assert.ok(opener, 'test executes the production opener')
assert.match(fs.readFileSync('lib/checkoutPricing.ts', 'utf8'), /CARD_TRIAL_LIVE\s*=\s*false/, 'current offer has no paid trial door')

function run(input = {}, requested = 'credits', implementation = opener) {
  const observed = { reasons: [], modal: [], door: [], events: [] }
  const context = {
    hasPaid: false, isStarter: false, isCreator: false, isStudio: false,
    trialUi: { creditsGranted: 30, phase: 'downgraded' }, trialActive: false,
    credits: 20, CARD_TRIAL_LIVE: false, freeFilmAvailable: true, limitPurchaseFit: null,
    ...input,
    setUpgradeReason: value => observed.reasons.push(value),
    setShowUpgradeModal: value => observed.modal.push(value),
    setShowCardEntryDoor: value => observed.door.push(value),
    planFilmLanguageMetadata: () => ({}),
    limitPurchaseFitTelemetry: value => value,
    trackEvent: (name, metadata) => { observed.events.push({ name, metadata }) },
  }
  const js = ts.transpileModule(implementation, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.createContext(context)
  vm.runInContext(js, context)
  context.openOutOfCreditsModal(requested)
  return observed
}

let checks = 0
function expect(input, requested, expected, label) {
  const result = run(input, requested)
  assert.deepEqual(result.reasons, [expected], label)
  assert.deepEqual(result.modal, [true], `${label}: existing modal opens`)
  assert.deepEqual(result.door, [], `${label}: retired door stays closed`)
  assert.equal(result.events.length, 1, `${label}: one impression event`)
  assert.equal(result.events[0].name, 'upgrade_modal_opened')
  assert.equal(result.events[0].metadata.reason, expected, `${label}: telemetry agrees with UI`)
  assert.equal(result.events[0].metadata.requested_reason, requested, `${label}: original reason preserved`)
  checks += 7
}

// Reproduce the measured failure by removing only the new paid guard.
const previous = opener.replace(' || paidAccount', '')
assert.notEqual(previous, opener, 'mutation must remove the guard')
assert.deepEqual(run({ hasPaid: true, isStudio: true }, 'credits', previous).reasons,
  ['trial_ended'], 'old code misclassifies a paid account with a historical trial')
checks += 2

expect({ hasPaid: true, isStudio: true }, 'credits', 'credits', 'observed paid Pro case')
expect({ hasPaid: true }, 'credits', 'credits', 'one-time buyer')
for (const tier of ['isStarter', 'isCreator', 'isStudio']) {
  expect({ [tier]: true }, 'credits', 'credits', `${tier} before hasPaid refresh`)
}
expect({ hasPaid: true, trialActive: true, trialUi: { creditsGranted: 30, phase: 'active' } },
  'credits', 'credits', 'paid account with stale active trial')
expect({}, 'credits', 'trial_ended', 'unpaid downgraded trial')
expect({ trialUi: { creditsGranted: 30, phase: 'ending' }, credits: 0 },
  'credits', 'trial_ended', 'unpaid exhausted trial')
expect({ trialActive: true, trialUi: { creditsGranted: 30, phase: 'active' } },
  'credits', 'trial_spent', 'unpaid active trial')
expect({ trialUi: { creditsGranted: 0, phase: 'downgraded' } },
  'credits', 'credits', 'never granted a trial')
expect({ trialUi: null }, 'credits', 'credits', 'trial unknown')
for (const reason of ['studio', 'creator', 'footage', 'trial_ended', 'trial_stalled', 'trial_spent']) {
  expect({ hasPaid: true }, reason, reason, `explicit ${reason} stays authoritative`)
}
const fit = run({ hasPaid: true, limitPurchaseFit: { recommendation_id: 'fixture' } })
assert.equal(fit.events.length, 2, 'existing fit impression remains')
assert.equal(fit.events[1].name, 'limit_purchase_fit_viewed')
assert.equal(fit.events[1].metadata.reason, 'credits', 'fit telemetry uses corrected reason')
assert.equal(fit.events[1].metadata.recommendation_id, 'fixture', 'recommendation is preserved')
checks += 4
console.log(`paid-upgrade-reason: ${checks} checks passed (offline)`)
