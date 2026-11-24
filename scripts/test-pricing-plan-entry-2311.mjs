import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { loader, read, React, renderToStaticMarkup } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const component = 'components/pricing/PricingPlanEntry.tsx'
const release = 'lib/growth/pricingPlanEntryRelease.ts'
const layout = 'app/pricing/layout.tsx'
const pricingClient = 'app/pricing/PricingClient.tsx'
const house = loader()('lib/internalAccounts').INTERNAL_EXACT_EMAILS[0]
const props = { billing: 'monthly', currency: 'usd', region: 'standard', settlement: 'usd', creatorFirst: false, onChoose() {} }

async function verify(overrides = {}) {
  const start = (email, mode) => {
    const reads = []
    const sources = { ...overrides }
    if (mode) sources[release] = (sources[release] ?? read(release)).replace("'off' as InternalRelease", "'" + mode + "' as InternalRelease")
    const load = loader({ '@/lib/supabase/server': { createClient: () => ({ auth: {
      getUser: async () => {
        reads.push(true)
        return { data: { user: email ? { email } : null } }
      },
    } }) } }, sources)
    async function show(extra) {
      const PricingLayout = load(layout).default
      const Entry = load(component).default
      const children = React.createElement(Entry, { ...props, ...extra })
      return renderToStaticMarkup(await PricingLayout({ children }))
    }
    return { load, reads, show }
  }

  const off = start(house)
  assert.equal(await off.show(), '', 'off stays hidden on the pricing layout')
  assert.equal(off.reads.length, 0, 'off does not read auth')
  const publicPage = start(null, 'public')
  const monthly = await publicPage.show()
  assert.equal(publicPage.reads.length, 0, 'public does not read auth')
  assert.match(monthly, /Compare starting prices/, 'public shows the entry from pricing')
  const staff = start(house, 'internal')
  assert.match(await staff.show(), /Compare starting prices/, 'house account sees internal')
  assert.equal(staff.reads.length, 1, 'internal reads one authenticated user')
  assert.equal(await start(house + '.invalid', 'internal').show(), '', 'internal checks the exact email')

  const { formatCheckoutMoney, getTierPrice, getAnnualPrice, TIER_CREDITS } = publicPage.load('lib/checkoutPricing')
  const { settlementNote, planSettlementAmountMinor } = publicPage.load('lib/settlementCurrency')
  const { pricingTierCardId } = publicPage.load('lib/growth/pricingTierHandoff')
  const amountText = markup => Array.from(markup.matchAll(/<strong>([^<]+)<\/strong>/g), m => m[1])
  const tiers = ['starter', 'basic', 'pro']
  const format = (currency, amount) => renderToStaticMarkup(formatCheckoutMoney(currency, amount))
  assert.deepEqual(amountText(monthly), tiers.map(tier => format('usd', getTierPrice(tier, 'usd', props.region))), 'monthly display uses checkout amounts')
  const annual = await publicPage.show({ billing: 'annual', currency: 'usd', settlement: 'brl', creatorFirst: true })
  const creatorFirst = ['basic', 'starter', 'pro']
  assert.deepEqual(amountText(annual), creatorFirst.map(tier => format('usd', getAnnualPrice(tier, 'usd', props.region))), 'annual total follows selected display currency and plan order')

  assert.match(annual, />per year</, 'annual period is marked as yearly')
  for (const tier of tiers) {
    const brl = planSettlementAmountMinor(tier, 'annual', 'brl', getAnnualPrice(tier, 'usd', props.region))
    assert.ok(annual.includes(renderToStaticMarkup(settlementNote(brl, 'brl', 'yr'))), 'Brazil sees the existing settlement amount')
    assert.ok(monthly.includes(TIER_CREDITS[tier] + ' credits per month'), 'credits come from the checkout table')
    assert.ok(monthly.includes('href="#' + pricingTierCardId(tier) + '"'), 'entry links to its pricing card')
  }
  const selected = []
  const exercise = loader({ react: { ...React, useContext: () => true } }, overrides)
  const htmlTree = exercise(component).default({ ...props, onChoose: tier => selected.push(tier) })
  const list = htmlTree.props.children[1].props.children
  list[1].props.children[2].props.onClick()
  assert.deepEqual(selected, ['basic'], 'Creator click tracks the selected plan only')
}

function findElement(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => findElement(child, predicate))
  if (!React.isValidElement(node)) return []
  return [...(predicate(node) ? [node] : []), ...findElement(node.props.children, predicate)]
}

async function verifyPricingPage(overrides = {}) {
  // Render the actual page inside its layout, with the live card components.
  // Only the unrelated widgets and I/O use offline doubles.
  const effects = [], state = []
  let nextState = 0
  const react = {
    ...React,
    useEffect: effect => effects.push(effect),
    useRef: current => ({ current }),
    useState(initial) {
      const slot = nextState++
      if (!Object.hasOwn(state, slot)) state[slot] = typeof initial === 'function' ? initial() : initial
      return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value }]
    },
  }
  const empty = () => null
  const forbidden = () => assert.fail('no database read or checkout in the pricing-entry test')
  const widget = new Proxy({ __esModule: true }, { get: (_, key) => key === '__esModule' ? true : empty })
  const realWidgets = new Set([
    '@/components/pricing/PricingPlanEntry', '@/components/pricing/PlanValueStage', '@/components/pricing/TwoProductsPricing',
  ])
  const widgetModules = Object.fromEntries(
    [...read(pricingClient).matchAll(/from '(@\/components\/[^']+)'/g)]
      .filter(([, name]) => !realWidgets.has(name))
      .map(([, name]) => [name, widget]),
  )
  const load = loader({
    ...widgetModules,
    react,
    'next/link': ({ prefetch, ...props }) => React.createElement('a', props),
    './AutopilotBreakEvenCalculator': empty,
    '@/components/pricing/AnnualOfferCountdown': {
      AnnualOfferCountdown: empty,
      useWelcomeOffers: () => ({ annual: null, monthly: { deadlineMs: null } }),
    },
    '@/components/InterfaceLanguage': { UiLabel: ({ children }) => children, useInterfaceLanguage: () => 'en' },
    '@/components/FreeTierOfferProvider': { useFreeTierOffer: () => load('lib/freeTierOffer').buildFreeTierOffer(false) },
    '@/lib/growth/useWelcome20Deadline': { useWelcome20Deadline: () => ({ ready: false }) },
    '@/lib/analytics': { trackEvent: () => {}, rememberSignupCampaign: () => {} },
    '@/lib/trackClick': { trackCheckoutClick: forbidden },
    '@/lib/checkoutTelemetry': { useCheckoutLaunch: () => ({ launch: forbidden }) },
    '@/lib/supabase/server': { createClient: forbidden },
    '@/lib/supabase/client': { createClient: forbidden },
    '@supabase/supabase-js': { createClient: forbidden },
  }, {
    ...overrides,
    [release]: read(release).replace("'off' as InternalRelease", "'public' as InternalRelease"),
  })
  const { formatCheckoutMoney, getTierPrice, getAnnualPrice } = load('lib/checkoutPricing')
  const { planSettlementAmountMinor, settlementNote } = load('lib/settlementCurrency')
  const { pricingTierCardId } = load('lib/growth/pricingTierHandoff')
  const page = load('app/pricing/page.tsx').default({ searchParams: { billing: 'monthly' } })
  const PricingLayout = load(layout).default
  const tiers = ['starter', 'basic', 'pro']
  const render = async () => {
    nextState = 0
    effects.length = 0
    const tree = page.type(page.props)
    const html = renderToStaticMarkup(await PricingLayout({ children: tree }))
    const section = html.match(/<section class="pricing-plan-entry"[\s\S]*?<\/section>/)?.[0]
    assert.ok(section, 'the real /pricing page mounts its plan entry')
    for (const tier of tiers) {
      const id = pricingTierCardId(tier)
      assert.ok(section.includes('href="#' + id + '"'), 'plan entry points to ' + id)
      const card = new RegExp('<div(?=[^>]*data-tier="' + tier + '")(?=[^>]*id="' + id + '")[^>]*>')
      assert.match(html, card, 'the pricing link reaches real card ' + tier)
    }
    return { tree, section }
  }
  const amounts = html => [...html.matchAll(/<strong>([^<]+)<\/strong>/g)].map(match => match[1])
  let resolveGeo
  const geo = new Promise(resolve => { resolveGeo = resolve })
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = path => {
    requests.push(path)
    assert.equal(path, '/api/geo', 'only the geography request may run')
    return geo
  }
  let stopGeo
  try {
    const initial = await render()
    const geoEffects = effects.filter(effect => effect.toString().includes("'/api/geo'"))
    assert.equal(geoEffects.length, 1, 'actual geography effect is mounted once')
    stopGeo = geoEffects[0]()
    assert.deepEqual(requests, ['/api/geo'])
    assert.deepEqual(amounts(initial.section), [], 'pending geography shows no reference amounts')
    assert.equal([...initial.section.matchAll(/>Loading price<\/span>/g)].length, 3, 'each pending plan shows a price placeholder')
    assert.doesNotMatch(initial.section, /Charged in BRL/, 'the pending entry has no settlement amounts')

    const region = 'standard'
    resolveGeo(Response.json({ country: 'BR', currency: 'usd', region, settlement_currency: 'brl' }))
    await new Promise(resolve => setImmediate(resolve))
    const monthly = await render()
    assert.deepEqual(amounts(monthly.section), tiers.map(tier => formatCheckoutMoney('usd', getTierPrice(tier, 'usd', region))), 'monthly reference amounts follow geography')

    const annualButton = findElement(monthly.tree, node => node.type === 'button' &&
      React.Children.toArray(node.props.children).some(child => typeof child === 'string' && child.trim() === 'Annual'))
    assert.equal(annualButton.length, 1, 'the real annual selector is reachable')
    annualButton[0].props.onClick()
    const annual = await render()
    assert.deepEqual(amounts(annual.section), tiers.map(tier => formatCheckoutMoney('usd', getAnnualPrice(tier, 'usd', region))), 'the actual selector updates the entry to annual amounts')

    for (const [view, billing, price, period] of [
      [monthly, 'monthly', getTierPrice, 'mo'],
      [annual, 'annual', getAnnualPrice, 'yr'],
    ]) {
      for (const tier of tiers) {
        const brl = planSettlementAmountMinor(tier, billing, 'brl', price(tier, 'usd', region))
        assert.ok(view.section.includes(renderToStaticMarkup(settlementNote(brl, 'brl', period))), 'resolved geography shows BRL for ' + tier + '/' + billing)
      }
    }
  } finally {
    stopGeo?.()
    globalThis.fetch = originalFetch
  }
}

await verifyPricingPage()
await verify()
for (const [file, before, after, reason] of [
  [release, "'off' as InternalRelease", "'public' as InternalRelease", /off stays hidden/],
  [component, 'if (!useContext(PricingPlanEntryVisibility)) return null', '', /off stays hidden/],
  [release, 'return releaseVisible(email, release)', "return release === 'public' || (release === 'internal' && !!email)", /internal checks the exact email/],
  [component, 'annual ? getAnnualPrice : getTierPrice', 'getTierPrice', /annual total follows/],
  [component, "annual ? 'per year' : 'per month'", "'per month'", /annual period is marked as yearly/],
  [component, "settlement === 'brl' ? settlementNote(", "settlement === 'usd' ? settlementNote(", /Brazil sees the existing settlement amount/],
  [component, "'#' + pricingTierCardId(tier)", "'/api/stripe/checkout'", /entry links to its pricing card/],
  [component, 'onChoose(tier)', "onChoose('starter')", /Creator click tracks/],
]) {
  const src = read(file).replaceAll('\r\n', '\n')
  assert.equal(src.split(before).length, 2, 'mutation must target a single statement')
  await assert.rejects(verify({ [file]: src.replace(before, after) }), { name: 'AssertionError', message: reason })
}
for (const [file, before, after, reason] of [
  [pricingClient, "{!planSwitch.subscribed && (watchPricing || audience === 'individual') && (", '{false && (', /real \/pricing page mounts its plan entry/],
  [pricingClient, 'PricingPlanEntry billing={billing} currency={displayCurrency}', 'PricingPlanEntry billing={billing} currency={resolvedCurrency}', /pending geography shows no reference amounts/],
  [pricingClient, "settlement_currency === 'brl' ? 'brl' : 'usd'", "'usd'", /resolved geography shows BRL/],
  [pricingClient, 'cardId={pricingTierCardId(p.tier as PricingTierHandoffTier)}', 'cardId={"broken-plan-card"}', /pricing link reaches real card/],
  [pricingClient, "onClick={() => setBilling('annual')}", "onClick={() => setBilling('monthly')}", /actual selector updates the entry/],
]) {
  const src = read(file).replaceAll('\r\n', '\n')
  assert.equal(src.split(before).length, 2, 'mutation must target a single statement')
  await assert.rejects(verifyPricingPage({ [file]: src.replace(before, after) }), { name: 'AssertionError', message: reason })
}
console.log('PASS · página /pricing, três cartões, seletor real, geo pendente e BRL · 13 mutantes mortos')
