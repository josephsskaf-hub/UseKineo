#!/usr/bin/env node
// Offline caller test: execute the actual TSX page with controlled hook state.
// Effects/network are not run; pure pricing, selection and policy modules are real.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const pagePath = 'app/checkout/cancelled/page.tsx'
const pureFiles = new Set([
  'lib/checkoutPricing.ts', 'lib/credits/engineCost.ts', 'lib/autopilot/config.ts',
  'lib/freeTierOffer.ts', 'lib/growth/autopilotCheckoutReturn.ts',
  'lib/growth/planFitCheckout.ts', 'lib/growth/planFit.ts',
  'lib/growth/trialBalanceBridge.ts', 'lib/growth/checkoutCancelledRecovery.ts',
  'lib/growth/checkoutCancelObjectionVisibility.ts',
])

export function renderCancelled({ reason = 'trial_first_delivery_pending', resolved = true,
  query = 'tier=basic', pending = null, error = null, baseline = false, realLauncher = false } = {}) {
  const calls = [], events = [], clicks = [], navigations = []
  let hook = 0, inFlight = pending !== null
  const cache = new Map()
  let checkout = { pending, error, launch(selection, href, metadata) {
    if (inFlight) return false
    inFlight = true
    calls.push({ selection, href, metadata })
    return true
  } }
  // A separate integration case runs the shared hook itself. Only browser IO,
  // timers, and React scheduling are mocked, not the real lockedRef behavior.
  if (realLauncher) {
    const output = ts.transpileModule(readFileSync(join(root, 'lib/checkoutTelemetry.ts'), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const hookModule = { exports: {} }
    let nextTimer = 0
    new Function('require', 'module', 'exports', 'window', 'setTimeout', 'clearTimeout', 'fetch', output)(
      id => {
        if (id === 'react') return {
          useState: value => [value, () => {}], useRef: value => ({ current: value }),
          useCallback: fn => fn, useEffect: () => {},
        }
        if (id === '@/lib/analytics') return { trackEvent: (...args) => events.push(args) }
        throw new Error(`Unexpected launcher import: ${id}`)
      }, hookModule, hookModule.exports,
      { location: { set href(value) { navigations.push(value) } } },
      () => ++nextTimer, () => {}, () => { throw new Error('No network allowed') },
    )
    checkout = hookModule.exports.useCheckoutLaunch('checkout_cancelled')
  }
  const mocked = {
    react: { ...React, useEffect: () => {}, useState: () => [
      hook++ === 0 ? null : { resolved, reason }, () => {},
    ] },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    'next/navigation': { useSearchParams: () => new URLSearchParams(query) },
    '@/lib/trackClick': { trackCheckoutClick: (...args) => clicks.push(args) },
    '@/lib/analytics': { trackEvent: (...args) => events.push(args) },
    '@/lib/checkoutTelemetry': { useCheckoutLaunch: () => checkout },
    '@/components/FreeTierOfferProvider': {
      useFreeTierOffer: () => load('lib/freeTierOffer.ts').buildFreeTierOffer(true),
    },
    './CheckoutCancelObjectionTelemetry': { default: () => null },
  }
  function load(path) {
    if (cache.has(path)) return cache.get(path)
    assert.ok(path === pagePath || pureFiles.has(path), `Unexpected module ${path}`)
    const source = baseline && path === pagePath
      ? execFileSync('git', ['show', `c5c91f0c:${pagePath}`], { cwd: root, encoding: 'utf8' })
      : readFileSync(join(root, path), 'utf8')
    const output = ts.transpileModule(source, { fileName: path, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText
    const module = { exports: {} }
    cache.set(path, module.exports)
    new Function('require', 'module', 'exports', output)((id) => {
      if (Object.hasOwn(mocked, id)) return mocked[id]
      const target = id.startsWith('@/') ? id.slice(2)
        : relative(root, resolve(root, dirname(path), id)).replaceAll('\\', '/')
      return load(`${target}.ts`)
    }, module, module.exports)
    return module.exports
  }
  const wrapper = load(pagePath).default()
  const content = wrapper.props.children
  const tree = content.type(content.props)
  const nodes = []
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!React.isValidElement(node)) return
    nodes.push(node)
    walk(node.props.children)
  }
  walk(tree)
  return { tree, nodes, calls, events, clicks, navigations, html: renderToStaticMarkup(tree) }
}

const isEntry = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isEntry && process.argv.includes('--markup')) {
  console.log(renderCancelled({ baseline: process.argv.includes('--baseline') }).html)
} else if (isEntry) {
  let checks = 0
  const ok = (value, label) => { assert.ok(value, label); checks++ }
  const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++ }
  const cta = (page) => page.nodes.find(n => n.props['data-trial-saved-checkout'] === 'true')
  // Frozen from c5c91f0c locally. CI uses a shallow checkout: never require an
  // ancestor object at test time. --markup --baseline is only a preview helper.
  const baseline = JSON.parse(readFileSync(join(root, 'scripts/fixtures/checkout-cancel-explicit-intent-c5c91f0c.json'), 'utf8'))
  const hash = html => createHash('sha256').update(html).digest('hex')
  eq(baseline.firstDeliveryPricingExits, 0,
    'red baseline: no visible saved-plan/pricing exit in actual first-delivery branch')
  const first = renderCancelled()
  ok(cta(first), 'first-delivery branch must expose an explicit saved-plan checkout')
  eq(first.calls.length, 0, 'render alone launches no checkout')
  eq(first.events.length, 0, 'mocked effects do not invent an impression or click')
  eq(cta(first).props.href, '/pricing', 'safe fallback, never a prefetched checkout API')
  ok(first.html.includes('Build my 35s Seedance episode'), 'trial remains available')
  ok(first.html.indexOf('Build my') < first.html.indexOf('data-trial-saved-checkout'), 'trial stays primary')
  for (const tier of ['starter', 'basic', 'pro']) {
    for (const billing of ['monthly', 'annual']) {
      const page = renderCancelled({ query: `tier=${tier}&billing=${billing}&intro=1&promo=VALID_offer&return=wm&intent_campaign=existing_test&checkout_origin=plan_fit_first_delivery&pf_engine=cinematic&pf_monthly_videos=4&pf_seconds=35&pf_tier=${tier}&pf_video_id=film-ref` })
      const link = cta(page)
      ok(link, `${tier}/${billing} explicit exit without a film/input`)
      let prevented = 0
      link.props.onClick({ preventDefault: () => prevented++ })
      link.props.onClick({ preventDefault: () => prevented++ })
      eq(prevented, 2, 'both clicks prevent native navigation')
      eq(page.calls.length, 1, 'existing launch latch prevents duplicate checkout')
      eq(page.calls[0].selection, tier, 'selected tier preserved')
      const url = new URL(page.calls[0].href, 'https://example.invalid')
      eq(url.pathname, '/api/stripe/checkout', 'existing checkout route reused')
      eq(url.searchParams.get('billing'), billing, 'billing preserved')
      eq(url.searchParams.get('intro'), billing === 'monthly' && tier !== 'pro' ? '1' : null, 'existing intro validation preserved')
      for (const [key, value] of Object.entries({ promo: 'VALID_offer', return: 'wm', intent_campaign: 'existing_test', checkout_origin: 'plan_fit_first_delivery', pf_engine: 'cinematic', pf_monthly_videos: '4', pf_seconds: '35', pf_tier: tier, pf_video_id: 'film-ref' })) {
        eq(url.searchParams.get(key), value, `${key} preserved`)
      }
      eq(page.events.length, 1, 'retry event only for accepted launch')
      eq(page.events[0][0], `${tier}_checkout_retry_clicked`, 'existing retry event reused')
      eq(page.events[0][1].recovery_primary, 'first_delivery', 'categorical placement distinguishes this path')
      eq(page.clicks.length, 1, 'existing checkout-click tracker reused once')
    }
  }
  const busy = renderCancelled({ pending: 'basic' })
  eq(cta(busy).props['aria-disabled'], true, 'pending is accessible')
  ok(busy.html.includes('Opening secure checkout'), 'pending feedback rendered')
  cta(busy).props.onClick({ preventDefault() {} })
  eq(busy.calls.length, 0, 'pending launch remains latched')
  const failed = renderCancelled({ error: 'Unable to open checkout. Please try again.' })
  ok(failed.nodes.some(n => n.props.role === 'alert' && n.props.children === 'Unable to open checkout. Please try again.'), 'existing launch error visible in first-delivery branch')
  const integrated = renderCancelled({ realLauncher: true, query: 'tier=starter&billing=annual' })
  eq(integrated.navigations.length, 0, 'real shared launcher does not navigate on render')
  cta(integrated).props.onClick({ preventDefault() {} })
  cta(integrated).props.onClick({ preventDefault() {} })
  eq(integrated.navigations, ['/api/stripe/checkout?tier=starter&billing=annual'], 'actual page + actual hook navigate once for a double click')
  eq(integrated.events.filter(([name]) => name === 'checkout_cta_suppressed').length, 1, 'real lockedRef suppresses second click')
  eq(integrated.events.filter(([name]) => name === 'starter_checkout_retry_clicked').length, 1, 'real guard allows one retry event')
  eq(integrated.clicks.length, 1, 'real guard allows one checkout tracker call')
  for (const options of [{ resolved: false }, { reason: null }, { query: 'tier=autopilot' }, { query: 'pack=autopilot_pilot' }]) {
    const current = renderCancelled(options)
    eq(hash(current.html), baseline.unchangedMarkup[JSON.stringify(options)], 'unrelated/checking/Autopilot branches unchanged')
    eq(current.calls.length, 0, 'no automatic checkout in other states')
  }
  for (const query of ['tier=autopilot', 'pack=autopilot_pilot']) {
    const current = renderCancelled({ query, reason: null })
    const retry = current.nodes.find(n => n.type === 'a' && typeof n.props.onClick === 'function')
    retry.props.onClick({ preventDefault() {} })
    eq(current.calls, baseline.autopilot[query].calls, 'Autopilot launch contract unchanged')
    eq(current.events, baseline.autopilot[query].events, 'Autopilot telemetry unchanged')
  }
  console.log(`checkout-cancel-explicit-intent: ${checks}/${checks} passed (offline actual TSX caller)`)
}
