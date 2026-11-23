import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { loader, read, React, renderToStaticMarkup } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const stagePath = 'components/pricing/PlanValueStage.tsx'
const benefitsPath = 'lib/pricingStudioBenefits.ts'
const valuePath = 'lib/pricingPlanValue.ts'

function check(overrides = {}) {
  const load = loader({}, overrides)
  const valueCard = load(stagePath)
  const perks = load(benefitsPath)
  const { characterLimitFor } = load('lib/characters')
  const { TIER_CREDITS } = load('lib/checkoutPricing')
  const { twoProductsModelForPage } = load('components/pricing/TwoProductsPricing')
  const confirmedLimit = characterLimitFor('pro', true)
  const apiAllowance = Number(read('app/api/enhance/route.ts').match(/if \(\(count \?\? 0\) < (\d+)\) freeGrant = true/)?.[1])
  assert.equal(perks.STUDIO_HD_ENHANCES_PER_MONTH, apiAllowance, 'the HD benefit matches the route')
  const included = perks.studioIncludedPerks(confirmedLimit)
  assert.deepEqual(included, [
    'Save up to ' + confirmedLimit + ' reusable characters',
    apiAllowance + ' free HD enhances a month',
  ], 'Studio benefits state the real saved-character and HD limits')

  const base = { name: 'Studio', tier: 'pro', popular: false, requested: false, selected: true,
    onSelect() {}, credits: TIER_CREDITS.pro, amount: 'TEST_PRICE', per: '/month', ctaLabel: 'Get Studio',
    ctaDisabled: false, onBuy() {}, included }
  for (const compact of [false,true]) {
    const card = renderToStaticMarkup(React.createElement(valueCard.PlanValueCard,{ ...base, compact }))
    assert.match(card, /Get Studio/, 'the purchase button stays available')
    assert.match(card, /Save up to 10 reusable characters/, 'saved characters visible in Studio benefits')
    assert.match(card, /2 free HD enhances a month/, 'HD enhances visible in Studio benefits')
    assert.match(card, /Each count assumes you use all monthly credits on that engine/, 'engine counts are alternatives')
    assert.doesNotMatch(card, /Unlimited projects/, 'Studio does not promise unlimited projects')
  }
  const legacy = renderToStaticMarkup(React.createElement(valueCard.StudioFilmCounts))
  const rows = twoProductsModelForPage().films
  const { TWO_PRODUCTS_FILM_SECONDS } = load('lib/pricingTwoProducts')
  const oneMinute = TWO_PRODUCTS_FILM_SECONDS.indexOf(60)
  for (const row of rows) {
    const cell = row.cells[oneMinute]
    if (!cell) continue
    const correct = Math.floor(TIER_CREDITS.pro / cell.credits)
    assert.ok(legacy.includes(row.label + ' · up to ' + correct), 'legacy lists Studio units by actual engine cost')
  }
  assert.match(legacy, />See 60-second films by engine</, 'the duration is visible on the legacy card')
}

check()
for (const [file, from, to, expected] of [
  [benefitsPath, 'MONTH = 2', 'MONTH = 3', /the HD benefit matches the route/],
  [benefitsPath, 'up to ${savedCharacters}', 'up to 12', /the real saved-character/],
  [stagePath, 'planValueForPage(TIER_CREDITS.pro).films', 'planValueForPage(TIER_CREDITS.basic).films', /legacy lists Studio units/],
  [valuePath, 'Math.floor(safeCredits / each)', 'Math.ceil(safeCredits / each)', /legacy lists Studio units/],
  [stagePath, "const studio = props.tier === 'pro'", 'const studio = false', /engine counts are alternatives/],
  [stagePath, '<summary>See 60-second films by engine</summary>', '<summary>See films by engine</summary>', /duration is visible/],
]) {
  const source = read(file).replaceAll('\r\n','\n')
  assert.equal(source.split(from).length,2,'unique mutation target')
  assert.throws(() => check({ [file]: source.replace(from,to) }), { name:'AssertionError', message:expected })
}
console.log('PASS · Studio card and legacy capacity · 6 mutantes mortos')
