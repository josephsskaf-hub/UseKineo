
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { aba, loader, React, read } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const path = 'components/checkout/SavedPlanActions.tsx'
const gate = 'lib/growth/checkoutSavedPlanRelease.ts'
const house = loader()('lib/internalAccounts').INTERNAL_EXACT_EMAILS[0]

async function check(overrides = {}) {
  const visible = loader({}, overrides)(gate).checkoutSavedPlanVisible
  const authFail = () => { throw new Error('unexpected auth read') }
  assert.equal(await visible(authFail), false, 'off by default')
  assert.equal(await visible(authFail, 'public'), true, 'public needs no account')
  assert.equal(await visible(async () => house, 'internal'), true, 'house opens')
  assert.equal(await visible(async () => house + '.invalid', 'internal'), false, 'exact allowlist')
  assert.equal(await visible(authFail, 'internal'), false, 'failure leaves old screen')
  const tab = aba(overrides)
  const { default: Actions, shouldPrioritizeSavedPlan } = tab.m(path)
  assert.equal(shouldPrioritizeSavedPlan(false, 'pro', true), false, 'disabled')
  assert.equal(shouldPrioritizeSavedPlan(true, null, true), false, 'no saved plan without explicit tier')
  assert.equal(shouldPrioritizeSavedPlan(true, 'pro', false), false, 'no change without alternative')
  assert.equal(shouldPrioritizeSavedPlan(true, 'basic', true), true)
  assert.equal(shouldPrioritizeSavedPlan(true, 'pro', true), true)

  const log = []
  const saved = () => log.push('saved')
  const smaller = () => log.push('smaller')
  const fixture = { plan: 'Studio', billing: 'annual', smallerPlan: 'Creator', pending: false, error: null, onContinue: saved, onSmallerPlan: smaller }
  const buttons = () => tab.all((_p, tag) => tag === 'button')
  tab.mount(React.createElement(Actions, fixture))
  assert.match(tab.html(), /Studio · Annual billing/, 'saved cadence')
  assert.equal(buttons()[0].props.children, 'Continue with Studio', 'continue is first in keyboard order')
  tab.click(p => p.children === 'Continue with Studio', 'saved')
  assert.deepEqual(log, ['saved'], 'continue calls the saved action only')
  tab.click(p => Array.isArray(p.children) && p.children.join('') === 'Creator monthly instead', 'alternative')
  assert.deepEqual(log, ['saved', 'smaller'], 'the second action is for the other plan')
  tab.render(React.createElement(Actions, { ...fixture, pending: true, error: 'Could not open checkout' }))
  assert.equal(buttons().every(button => button.props.disabled === true), true, 'both actions lock during handoff')
  assert.match(tab.html(), /role="alert">Could not open checkout/, 'error remains visible')
}

await check()
for (const [file, from, to, expected] of [
  [gate, "InternalRelease = 'off'", "InternalRelease = 'public'", /off by default/],
  [path, "(tier === 'basic' || tier === 'pro')", 'true', /without explicit tier/],
  [path, "billing === 'annual' ?", "billing === 'monthly' ?", /saved cadence/],
  [path, 'onClick={onContinue}', 'onClick={onSmallerPlan}', /saved action only/],
  [path, 'onClick={onSmallerPlan}', 'onClick={onContinue}', /second action/],
  [path, 'disabled={pending}', 'disabled={false}', /both actions lock/],
  [path, '{error && <p', '{false && <p', /error remains visible/],
]) {
  const source = read(file).replaceAll('\r\n', '\n')
  assert.ok(source.includes(from), 'mutation target ' + from)
  await assert.rejects(check({ [file]: source.replace(from, to) }), expected)
}
console.log('PASS · Retomar o plano escolhido · 7 mutantes mortos')
