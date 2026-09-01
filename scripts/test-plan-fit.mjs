// A2 Plan Fit — deterministic contract tests.
// No network, database, credentials or production writes.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function findTsc(base) {
  let dir = base
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('TypeScript compiler not found')
}

const temp = mkdtempSync(join(tmpdir(), 'kineo-plan-fit-'))
const sourceDir = join(temp, 'src')
const outDir = join(temp, 'out')
mkdirSync(sourceDir, { recursive: true })

const files = [
  ['lib/growth/planFit.ts', 'planFit.ts'],
  ['lib/growth/planFitCheckout.ts', 'planFitCheckout.ts'],
  ['lib/growth/planFitCtaExposure.ts', 'planFitCtaExposure.ts'],
  ['lib/growth/publicPlanFitHandoff.ts', 'publicPlanFitHandoff.ts'],
  ['lib/checkoutPricing.ts', 'checkoutPricing.ts'],
  ['lib/credits/engineCost.ts', 'engineCost.ts'],
  ['lib/autopilot/config.ts', 'autopilotConfig.ts'],
]

for (const [source, destination] of files) {
  const content = readFileSync(join(root, source), 'utf8')
    .replace(/from '@\/lib\/checkoutPricing'/g, "from './checkoutPricing'")
    .replace(/from '@\/lib\/credits\/engineCost'/g, "from './engineCost'")
    .replace(/from '@\/lib\/autopilot\/config'/g, "from './autopilotConfig'")
    .replace(/from '@\/lib\/growth\/planFit'/g, "from './planFit'")
    .replace(/from '@\/lib\/growth\/planFitCtaExposure'/g, "from './planFitCtaExposure'")
  writeFileSync(join(sourceDir, destination), content)
}

execFileSync(process.execPath, [
  findTsc(root),
  ...files.map(([, file]) => join(sourceDir, file)),
  '--outDir', outDir,
  '--rootDir', sourceDir,
  '--module', 'commonjs',
  '--target', 'es2022',
  '--moduleResolution', 'node',
  '--skipLibCheck',
], { stdio: 'pipe' })
writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))

const requireFromTemp = createRequire(join(outDir, 'runner.cjs'))
const planFit = requireFromTemp(join(outDir, 'planFit.js'))
const pricing = requireFromTemp(join(outDir, 'checkoutPricing.js'))
const costs = requireFromTemp(join(outDir, 'engineCost.js'))
const checkout = requireFromTemp(join(outDir, 'planFitCheckout.js'))
const ctaExposure = requireFromTemp(join(outDir, 'planFitCtaExposure.js'))
const publicHandoff = requireFromTemp(join(outDir, 'publicPlanFitHandoff.js'))

let total = 0
let failed = 0
function check(name, condition, detail = '') {
  total += 1
  if (condition) return
  failed += 1
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log('\nKINEO A2 — Plan Fit\n')

// 1. Monthly, canonical arithmetic. No weekly conversion exists.
check('monthly presets are explicit', JSON.stringify(planFit.MONTHLY_CADENCES) === JSON.stringify([1, 4, 8, 12]))
const seedanceFour = planFit.calculatePlanFit({ quality: 'cinematic_ai', seconds: 60, monthlyFilms: 4, currency: 'usd' })
check('first-delivery default is the smallest honest cadence', planFit.DEFAULT_PLAN_FIT_MONTHLY_FILMS === 1)
check('direct-win cohort has an explicit version', planFit.PLAN_FIT_OFFER_VERSION === 'plan_fit_direct_win_v3')
check('CTA denominator has a distinct event', ctaExposure.PLAN_FIT_CTA_VIEW_EVENT === 'plan_fit_checkout_cta_viewed')
check('CTA requires sixty percent visibility', ctaExposure.PLAN_FIT_CTA_VISIBLE_RATIO === 0.6)
check('CTA rejects a sliver in view', ctaExposure.isPlanFitCtaVisible({ isIntersecting: true, intersectionRatio: 0.59 }) === false)
check('CTA rejects a detached target', ctaExposure.isPlanFitCtaVisible({ isIntersecting: false, intersectionRatio: 1 }) === false)
check('CTA accepts the exact visibility boundary', ctaExposure.isPlanFitCtaVisible({ isIntersecting: true, intersectionRatio: 0.6 }) === true)
const sharedVerification = ctaExposure.createBooleanSingleFlight()
let verificationCalls = 0
let releaseVerification
const deferredVerification = new Promise((resolve) => { releaseVerification = resolve })
const firstVerification = sharedVerification.run(() => {
  verificationCalls += 1
  return deferredVerification
})
const simultaneousVerification = sharedVerification.run(() => {
  verificationCalls += 1
  return Promise.resolve(false)
})
await Promise.resolve()
check('simultaneous observers share one verification', verificationCalls === 1 && firstVerification === simultaneousVerification)
releaseVerification(true)
check('shared verification resolves identically for both observers', await firstVerification === true && await simultaneousVerification === true)
check('single-flight releases after completion', await sharedVerification.run(async () => {
  verificationCalls += 1
  return true
}) === true && verificationCalls === 2)
const failedVerification = ctaExposure.createBooleanSingleFlight()
let failedVerificationCalls = 0
check('verification rejection fails closed', await failedVerification.run(async () => {
  failedVerificationCalls += 1
  throw new Error('expected test rejection')
}) === false)
check('failed verification remains retryable', await failedVerification.run(async () => {
  failedVerificationCalls += 1
  return true
}) === true && failedVerificationCalls === 2)
const ctaMetadata = ctaExposure.buildPlanFitCtaExposureMetadata({
  accountCohort: 'trial',
  sourceEngine: 'cinematic_ai',
  plannedEngine: 'cinematic_ai',
  monthlyVideos: 1,
  monthlyCredits: 25,
  recommendedTier: 'starter',
  displayCurrency: 'usd',
  videoId: 'video-1',
  offerVersion: planFit.PLAN_FIT_OFFER_VERSION,
})
check('CTA metadata states its real measurement unit', ctaMetadata.measurement_unit === 'authenticated_user_first_video_cta')
check('CTA metadata carries no customer content', JSON.stringify(Object.keys(ctaMetadata).sort()) === JSON.stringify([
  'account_cohort', 'actor_unit', 'currency_resolved', 'display_currency', 'event_unit',
  'measurement_unit', 'monthly_credits', 'monthly_videos', 'offer_version', 'planned_engine',
  'presentation', 'recommended_tier', 'source_engine', 'video_id', 'visible_ratio',
].sort()))

check('Seedance cost comes from canonical duration cost', seedanceFour.filmCredits === costs.creditCostForDuration('cinematic_ai', true, 60))
check('monthly credits are exact multiplication', seedanceFour.monthlyCredits === seedanceFour.filmCredits * 4)
check('current recommendation covers its target', seedanceFour.plan !== null && seedanceFour.plan.credits >= seedanceFour.monthlyCredits)
check('recommended grant is canonical', seedanceFour.plan?.credits === pricing.TIER_CREDITS[seedanceFour.plan?.tier])
const tiersBeforeRecommendation = planFit.tiersByPrice('usd').slice(
  0,
  planFit.tiersByPrice('usd').indexOf(seedanceFour.plan?.tier),
)
check('no less expensive plan covers the target', tiersBeforeRecommendation.every((tier) => pricing.TIER_CREDITS[tier] < seedanceFour.monthlyCredits))
check('Studio recommendation exposes adjacent lower-cost Creator', seedanceFour.lowerCostAlternative?.plan.tier === 'basic')
check('lower-cost path keeps the exact same engine cost', seedanceFour.lowerCostAlternative?.monthlyCredits === seedanceFour.filmCredits * seedanceFour.lowerCostAlternative?.monthlyFilms)
check('lower-cost path uses the maximum honest cheaper cadence', seedanceFour.lowerCostAlternative?.monthlyFilms === Math.floor(pricing.TIER_CREDITS.basic / seedanceFour.filmCredits))
check('lower-cost plan covers its reduced cadence', (seedanceFour.lowerCostAlternative?.plan.credits ?? 0) >= (seedanceFour.lowerCostAlternative?.monthlyCredits ?? Infinity))
check('lower-cost path actually reduces cadence', (seedanceFour.lowerCostAlternative?.monthlyFilms ?? Infinity) < seedanceFour.monthlyFilms)

// 2. Free projection uses the paid cost without claiming the free film spent it.
const freeProjection = planFit.calculatePlanFit({ quality: 'fast', seconds: 60, monthlyFilms: 4, currency: 'usd' })
check('free Kineo 1 is zero today', costs.creditCostForDuration('fast', false, 60) === 0)
check('Plan Fit projects paid Kineo 1 cost', freeProjection.filmCredits === costs.creditCostForDuration('fast', true, 60))
check('paid projection is nonzero', freeProjection.filmCredits > 0)
check('free projection can recommend a plan', freeProjection.plan !== null)
check('Starter recommendation has no fictional cheaper subscription', freeProjection.lowerCostAlternative === null)

const fastTwelve = planFit.calculatePlanFit({ quality: 'fast', seconds: 60, monthlyFilms: 12, currency: 'usd' })
check('Creator recommendation can expose Starter capacity', fastTwelve.lowerCostAlternative?.plan.tier === 'starter' && fastTwelve.lowerCostAlternative.monthlyFilms === 8)

// 3. No-plan result always carries honest, actionable exits.
const selfServeTiers = ['starter', 'basic', 'pro']
const maximumGrant = Math.max(...selfServeTiers.map((tier) => pricing.TIER_CREDITS[tier]))
const seedancePaidCost = costs.creditCostForDuration('cinematic_ai', true, 60)
const noPlanCadence = Math.min(60, Math.floor(maximumGrant / seedancePaidCost) + 1)
const seedanceNoPlan = planFit.calculatePlanFit({ quality: 'cinematic_ai', seconds: 60, monthlyFilms: noPlanCadence, currency: 'usd' })
check('fixture is dynamically above every current self-serve grant', noPlanCadence * seedancePaidCost > maximumGrant)
check('no self-serve plan is signaled', seedanceNoPlan.noSelfServePlan && seedanceNoPlan.plan === null)
check('no-plan branch does not mislabel a lower subscription as covering', seedanceNoPlan.lowerCostAlternative === null)
check('maximum same-engine capacity is derived', seedanceNoPlan.maximumSameEngineFilms === Math.floor(maximumGrant / seedanceNoPlan.filmCredits))
const fastAlternativeShouldFit = costs.creditCostForDuration('fast', true, 60) * noPlanCadence <= maximumGrant
check('faster alternative exists exactly when it fits', Boolean(seedanceNoPlan.fastAlternative) === fastAlternativeShouldFit)
if (seedanceNoPlan.fastAlternative) {
  check('fast alternative keeps exact monthly cadence', seedanceNoPlan.fastAlternative.monthlyCredits === costs.creditCostForDuration('fast', true, 60) * noPlanCadence)
  check('alternative grant covers exact combination', seedanceNoPlan.fastAlternative.plan.credits >= seedanceNoPlan.fastAlternative.monthlyCredits)
}

// This is a relationship test, not a frozen commercial mismatch: changing a
// grant legitimately is allowed as long as the result and exits remain true.
for (const cadence of planFit.MONTHLY_CADENCES) {
  const result = planFit.calculatePlanFit({ quality: 'cinematic_h3', seconds: 60, monthlyFilms: cadence, currency: 'usd' })
  if (result.plan) {
    check(`H3 ${cadence}/month recommended plan covers`, result.plan.credits >= result.monthlyCredits)
  } else {
    check(`H3 ${cadence}/month no-plan has an exit`, result.maximumSameEngineFilms > 0 || result.fastAlternative !== null)
  }
}

const sellablePlanFitQualities = [
  'fast',
  'basic',
  'basic_ai',
  'pro',
  'cinematic_ai',
  'cinematic_kling',
  'cinematic_veo',
  'cinematic_hollywood',
  'cinematic_h3',
  'cinematic_omni',
]
for (const quality of sellablePlanFitQualities) {
  for (const seconds of [35, 60, 90]) {
    for (const cadence of planFit.MONTHLY_CADENCES) {
      const result = planFit.calculatePlanFit({ quality, seconds, monthlyFilms: cadence, currency: 'usd' })
      check(
        `actionable result ${quality}/${seconds}s/${cadence}mo`,
        result.plan !== null || result.maximumSameEngineFilms > 0 || result.fastAlternative !== null,
      )
    }
  }
}

// 4. Account cohorts are mutually exclusive, and subscriber always wins.
const account = (overrides) => planFit.classifyPlanFitAccount({
  entitlementsResolved: true,
  commercialPlan: 'free',
  hasPaid: false,
  trialParticipant: false,
  ...overrides,
})
check('free cohort', account({}) === 'free')
check('active/ending trial cohort', account({ trialParticipant: true }) === 'trial')
check('pack cohort', account({ hasPaid: true }) === 'pack')
check('paid-balance cohort wins over simultaneous trial state', account({ hasPaid: true, trialParticipant: true }) === 'pack')
check('Starter subscriber hidden even when hasPaid', account({ commercialPlan: 'starter', hasPaid: true }) === 'subscriber')
check('Autopilot subscriber hidden', account({ commercialPlan: 'autopilot', hasPaid: true }) === 'subscriber')
check('subscriber wins over trial state', account({ commercialPlan: 'basic', trialParticipant: true }) === 'subscriber')
check('unresolved entitlement fails closed', account({ entitlementsResolved: false }) === 'unknown')
check('missing plan fails closed', account({ commercialPlan: null }) === 'unknown')

// 5. First delivery is proved by exact owner history, never event volume.
const evidence = (overrides) => planFit.isConfirmedFirstDelivery({
  historyReliable: true,
  evidenceForVideoId: 'current',
  completedCount: 1,
  recentVideos: [{ id: 'current', status: 'completed' }],
  currentVideoId: 'current',
  ...overrides,
})
check('refreshed sole current delivery accepted', evidence({}) === true)
check('initial zero-video state before persistence is not a delivery', evidence({
  evidenceForVideoId: null,
  completedCount: 0,
  recentVideos: [],
  currentVideoId: null,
}) === false)
check('stale zero-video snapshot never mounts for delivery one', evidence({
  evidenceForVideoId: null,
  completedCount: 0,
  recentVideos: [],
}) === false)
check('contradictory count zero after a persisted id fails closed', evidence({
  completedCount: 0,
  recentVideos: [],
}) === false)
check('video one evidence cannot qualify video two before refresh', evidence({
  currentVideoId: 'second',
}) === false)
check('video two refresh proves it is no longer first delivery', evidence({
  evidenceForVideoId: 'second',
  completedCount: 2,
  recentVideos: [
    { id: 'second', status: 'completed' },
    { id: 'current', status: 'completed' },
  ],
  currentVideoId: 'second',
}) === false)
check('one previous video is not first delivery', evidence({ completedCount: 1, recentVideos: [{ id: 'previous', status: 'completed' }] }) === false)
check('second completed delivery is rejected', evidence({ completedCount: 2, recentVideos: [{ id: 'current', status: 'completed' }, { id: 'previous', status: 'completed' }] }) === false)
check('mixed snapshot count one plus two completed rows is rejected', evidence({
  completedCount: 1,
  recentVideos: [
    { id: 'current', status: 'completed' },
    { id: 'raced-in', status: 'completed' },
  ],
}) === false)
check('degraded history fails closed', evidence({ historyReliable: false }) === false)
check('missing current video id fails closed', evidence({ currentVideoId: null }) === false)
const reserveSlot = (overrides) => planFit.shouldReservePlanFitRecurringSlot({
  candidate: true,
  eligible: false,
  historyCheckedForVideoId: null,
  currentVideoId: 'first',
  ...overrides,
})
check('new video reserves recurring slot while exact history is pending', reserveSlot({}) === true)
check('confirmed first delivery keeps the recurring slot', reserveSlot({
  eligible: true,
  historyCheckedForVideoId: 'first',
}) === true)
check('failed lookup releases legacy offers after a definitive answer', reserveSlot({
  historyCheckedForVideoId: 'first',
}) === false)
check('video two cannot reuse the decision for video one', reserveSlot({
  historyCheckedForVideoId: 'first',
  currentVideoId: 'second',
}) === true)
check('confirmed non-first video releases legacy offers', reserveSlot({
  historyCheckedForVideoId: 'second',
  currentVideoId: 'second',
}) === false)
check('non-candidate never reserves the recurring slot', reserveSlot({ candidate: false }) === false)

// 6. The current commercial contract is one global USD price. Geography is
// tested through the canonical resolver, never by recreating BRL/INR tables.
check('Brazil resolves to canonical global USD', pricing.resolveCheckoutCurrency('BR') === 'usd')
check('India resolves to canonical global USD', pricing.resolveCheckoutCurrency('IN') === 'usd')
check('unknown country resolves to canonical global USD', pricing.resolveCheckoutCurrency(null) === 'usd')
const expectedUsdOrder = [...selfServeTiers].sort(
  (left, right) => pricing.TIER_PRICES[left].usd - pricing.TIER_PRICES[right].usd,
)
check('known currency recommendation is price ordered', JSON.stringify(planFit.tiersByPrice('usd')) === JSON.stringify(expectedUsdOrder))
const unresolvedCurrency = planFit.calculatePlanFit({ quality: 'cinematic_ai', seconds: 60, monthlyFilms: 4, currency: null })
check('unresolved currency still has an honest capacity answer', unresolvedCurrency.plan !== null && unresolvedCurrency.plan.credits >= unresolvedCurrency.monthlyCredits)
check('unresolved currency does not change paid credit math', unresolvedCurrency.monthlyCredits === seedanceFour.monthlyCredits)

// 7. Fixed-billing/blocked Avatar family is outside Plan Fit.
check('Avatar excluded', planFit.supportsPlanFitQuality('avatar') === false)
check('Presenter excluded', planFit.supportsPlanFitQuality('presenter') === false)
check('blocked Sora excluded', planFit.supportsPlanFitQuality('cinematic_sora') === false)
check('Kineo 1 supported', planFit.supportsPlanFitQuality('fast') === true)

// 8. Checkout context is transported by the client but recomputed by server.
const validContextUrl = checkout.withPlanFitCheckoutContext(`/api/stripe/checkout?tier=${seedanceFour.plan.tier}`, {
  planned_engine: 'cinematic_ai',
  monthly_videos: 4,
  seconds: 60,
  recommended_tier: seedanceFour.plan.tier,
  video_id: '11111111-1111-4111-8111-111111111111',
})
const validContext = checkout.verifyPlanFitCheckoutContext(
  new URL(validContextUrl, 'https://www.usekineo.com').searchParams,
  seedanceFour.plan.tier,
  'usd',
)
check('valid context reaches authoritative checkout', validContext?.checkout_origin === 'plan_fit_first_delivery')
check('monthly credits are recomputed canonically', Number(validContext?.plan_fit_monthly_credits) === seedanceFour.monthlyCredits)
const cheaperContext = checkout.verifyPlanFitCheckoutContext(
  new URL(validContextUrl, 'https://www.usekineo.com').searchParams,
  'starter',
  'usd',
)
check('honest downsell preserves origin', cheaperContext?.checkout_origin === 'plan_fit_first_delivery')
check('honest downsell cannot claim recommended fit', cheaperContext?.plan_fit_selected_tier_matches === '0')
const forgedTier = new URL(validContextUrl, 'https://www.usekineo.com')
forgedTier.searchParams.set('pf_tier', 'starter')
check('hand-edited recommendation fails closed', checkout.verifyPlanFitCheckoutContext(forgedTier.searchParams, seedanceFour.plan.tier, 'usd') === null)
const tampered = new URL(validContextUrl, 'https://www.usekineo.com')
tampered.searchParams.set('pf_monthly_videos', '999')
check('hand-edited cadence fails closed', checkout.verifyPlanFitCheckoutContext(tampered.searchParams, seedanceFour.plan.tier, 'usd') === null)
tampered.searchParams.set('pf_monthly_videos', '4')
tampered.searchParams.set('pf_engine', 'invented_engine')
check('unknown engine fails closed', checkout.verifyPlanFitCheckoutContext(tampered.searchParams, seedanceFour.plan.tier, 'usd') === null)
tampered.searchParams.set('pf_engine', 'cinematic_ai')
tampered.searchParams.set('pf_seconds', '30')
check('non-Plan-Fit duration fails closed', checkout.verifyPlanFitCheckoutContext(tampered.searchParams, seedanceFour.plan.tier, 'usd') === null)
const forgedCredits = new URL(validContextUrl, 'https://www.usekineo.com')
forgedCredits.searchParams.set('plan_fit_monthly_credits', '1')
check('client cannot forge monthly credits', Number(checkout.verifyPlanFitCheckoutContext(
  forgedCredits.searchParams,
  seedanceFour.plan.tier,
  'usd',
)?.plan_fit_monthly_credits) === seedanceFour.monthlyCredits)
check('Stripe retry metadata rehydrates closed context', checkout.planFitRetrySearchParamsFromMetadata(validContext) === checkout.planFitRetrySearchParams(validContext))
check('Stripe retry rejects arbitrary origin', checkout.planFitRetrySearchParamsFromMetadata({ ...validContext, checkout_origin: 'forged' }) === null)
const metadataReturnSummary = checkout.readPlanFitCheckoutReturnFromMetadata(validContext, seedanceFour.plan.tier, 'usd')
check('saved-session metadata rebuilds the verified engine', metadataReturnSummary?.engineLabel === 'Seedance 1.5')
check('saved-session metadata rebuilds the verified goal', metadataReturnSummary?.monthlyVideos === 4 && metadataReturnSummary?.seconds === 60)
check('saved-session metadata rejects a forged origin', checkout.readPlanFitCheckoutReturnFromMetadata({ ...validContext, checkout_origin: 'forged' }, seedanceFour.plan.tier, 'usd') === null)
const originOnly = new URL('/api/stripe/checkout?checkout_origin=plan_fit_first_delivery', 'https://www.usekineo.com')
check('origin without complete contract fails closed', checkout.verifyPlanFitCheckoutContext(originOnly.searchParams, 'basic', 'usd') === null)

// 9. Product wiring: viewport impression, protected checkout, intent and order.
const preview = readFileSync(join(root, 'docs/previews/PLAN-FIT-READY-DECISION-2026-08-30.html'), 'utf8')
const component = readFileSync(join(root, 'components/growth/PlanFitCard.tsx'), 'utf8')
const generate = readFileSync(join(root, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
const videosRoute = readFileSync(join(root, 'app/api/videos/route.ts'), 'utf8')
const composeStatus = readFileSync(join(root, 'app/api/compose/status/[renderId]/route.ts'), 'utf8')
const analytics = readFileSync(join(root, 'lib/analytics.ts'), 'utf8')
const checkoutRoute = readFileSync(join(root, 'app/api/stripe/checkout/route.ts'), 'utf8')
const checkoutWebhook = readFileSync(join(root, 'app/api/stripe/webhook/route.ts'), 'utf8')
const checkoutResume = readFileSync(join(root, 'app/api/stripe/checkout/resume/route.ts'), 'utf8')
const funnelRoute = readFileSync(join(root, 'app/api/admin/funnel/route.ts'), 'utf8')
const funnelClient = readFileSync(join(root, 'app/(dashboard)/admin/funnel/FunnelClient.tsx'), 'utf8')

check('viewport uses IntersectionObserver', component.includes('new IntersectionObserver'))
check('impression threshold is enforced', component.includes('entry.intersectionRatio < IMPRESSION_THRESHOLD'))
check('checkout CTA has its own observer target', /ref=\{checkoutCtaRef\}[\s\S]{0,180}onClick=\{\(\) => startCheckout\(result\.plan!\.tier\)\}/.test(component))
check('checkout CTA observer uses the executable visibility rule', component.includes('isPlanFitCtaVisible(entries[0])'))
check('card and CTA share a single-flight eligibility verifier', (component.match(/await verifyEligibilityShared\(\)/g) ?? []).length === 3 && component.includes('createBooleanSingleFlight()'))
check('CTA view cannot be recorded after checkout click begins', component.includes('checkoutCtaClickStartedRef.current') && component.indexOf('checkoutCtaClickStartedRef.current = true') < component.indexOf("emit('plan_fit_checkout_clicked'"))
check('disabled checkout CTA is not counted as an actionable view', component.includes('|| cta.disabled'))
const ctaObserverStart = component.indexOf('const storageKey = `kineo_plan_fit_checkout_cta_viewed:')
const ctaEligibilityIndex = component.indexOf('await verifyEligibilityShared()', ctaObserverStart)
const ctaEventIndex = component.indexOf('PLAN_FIT_CTA_VIEW_EVENT,', ctaEligibilityIndex)
check('checkout CTA view revalidates first-delivery evidence', ctaObserverStart >= 0 && ctaEligibilityIndex > ctaObserverStart && ctaEventIndex > ctaEligibilityIndex)
check('checkout CTA rechecks click state after async verification', component.indexOf('checkoutCtaClickStartedRef.current || cta.disabled', ctaEligibilityIndex) > ctaEligibilityIndex && component.indexOf('checkoutCtaClickStartedRef.current || cta.disabled', ctaEligibilityIndex) < ctaEventIndex)
check('checkout CTA dedupe closes only after accepted analytics', ctaEventIndex >= 0 && component.indexOf("sessionStorage.setItem(storageKey, '1')", ctaEventIndex) > ctaEventIndex)
check('impression is keyed by current video', component.includes('kineo_plan_fit_impression:${exposureKey}'))
check('impression revalidates server evidence first', component.indexOf('await verifyEligibilityShared()', ctaEventIndex) < component.indexOf("eventRef.current?.('plan_fit_impression'"))
const cardImpressionEventIndex = component.indexOf("eventRef.current?.('plan_fit_impression'")
check('impression dedupe closes only after accepted event', cardImpressionEventIndex >= 0 && component.indexOf("sessionStorage.setItem(storageKey, '1')", cardImpressionEventIndex) > cardImpressionEventIndex)
check('failed impression remains retryable', component.includes('if (recorded !== true)'))
check('event actor is authenticated user', component.includes("actor_unit: 'authenticated_user'"))
check('event unit is first completed video', component.includes("event_unit: 'first_completed_video'"))
check('card never says this film used credits', !/film used|used \{.*credits/i.test(component))
check('card has no top-up promise', !/top-?up|TOPUP_/i.test(component))
check('card has no literal dollar price', (component.match(/\$\d+(?:\.\d+)?/g) ?? []).length === 0)
check('card has no hardcoded USD calculation', !component.includes("formatCheckoutMoney('usd'"))
check('card receives canonical nullable currency', component.includes('currency: CheckoutCurrency | null'))
check('unresolved currency gets neutral checkout copy', component.includes('See secure checkout'))
check('money is conditional on resolved currency', component.includes('? `Start ${planName(result.plan.tier)}'))
check('visual preview is self-contained HTML', preview.includes('<!doctype html>') && preview.includes('<style>') && !preview.includes('<script'))
check('visual preview contains desktop comparison', preview.includes('Desktop comparison'))
check('visual preview contains mobile 390px comparison', preview.includes('Mobile comparison · 390px') && preview.includes('phone-grid'))
check('visual preview labels before and after states', preview.includes('>Before<') && preview.includes('>After<'))
check('visual preview preserves the previous calculator-first state', preview.includes('Your next film already has a plan') && preview.includes('calculator first'))
check('visual preview shows the direct publishing decision', preview.includes('Ready to publish every month?'))
check('visual preview keeps the calculator secondary', preview.includes('class=\"advanced\"') && preview.indexOf('Ready to publish every month?') < preview.indexOf('class=\"advanced\"'))
check('visual preview shows a primary checkout CTA', preview.includes('Start Starter'))
check('checkout CTA starts the matched plan', component.includes('Start ${planName(result.plan.tier)}'))
check('checkout reassurance is attached to the Plan Fit decision', component.includes('data-plan-fit-checkout-reassurance'))
check('first view starts with a ready monthly decision', component.includes('useState<number>(DEFAULT_PLAN_FIT_MONTHLY_FILMS)'))
check('first view does not wait for a cadence click', !component.includes('useState<number | null>(null)') && !component.includes('monthlyFilms === null'))
check('ready decision calculates immediately', component.includes('calculatePlanFit({ quality: plannedQuality, seconds, monthlyFilms, currency })'))
check('ready decision explains its default', component.includes('one film like this every month'))
check('ready decision exposes checkout without a selection gate', !component.includes('if (!result || checkoutBusy'))
check('impression declares the new offer version', component.includes('offer_version: PLAN_FIT_OFFER_VERSION'))
check('impression declares that the decision is ready', component.includes('decision_ready: true'))
check('impression records the default cadence', component.includes('default_monthly_videos: DEFAULT_PLAN_FIT_MONTHLY_FILMS'))
check('impression records canonical default credits', component.includes('default_monthly_credits: defaultResult.monthlyCredits'))
check('impression records the canonical matching tier', component.includes('default_recommended_tier: defaultResult.plan?.tier ?? null'))
check('all downstream Plan Fit events inherit the version', component.indexOf('...metadata,') < component.indexOf('offer_version: PLAN_FIT_OFFER_VERSION', component.indexOf('function emit')))

check('checkout reassurance names Stripe', component.includes('Secure Stripe checkout'))
check('checkout reassurance carries the approved cancellation promise', component.includes('cancel anytime in one click'))
check('checkout reassurance carries the approved guarantee', component.includes('7-day money-back'))
check('checkout reassurance carries the shared payment guidance', component.includes('CHECKOUT_PAYMENT_GUIDANCE_COMPACT'))
check('advanced cadence choice is secondary on first view', component.includes('data-plan-fit-advanced') && component.includes('Compare 1, 4, 8 or 12 videos/month'))
check('direct checkout appears before advanced cadence choices', component.indexOf('Start ${planName(result.plan.tier)}') < component.indexOf('data-plan-fit-advanced') && component.indexOf('data-plan-fit-advanced') < component.indexOf('MONTHLY_CADENCES.map'))
check('checkout click is measured before eligibility preflight', component.indexOf("emit('plan_fit_checkout_clicked'") < component.indexOf('eligibilityPendingRef.current = true'))
check('advanced planning has its own event', component.includes("emit('plan_fit_advanced_opened'"))
check('advanced-open event is deduped per mounted card', component.includes('advancedOpenedRef.current'))
check('valid recommendation exposes a lower-cost comparison path', component.includes('data-plan-fit-lower-cost-path'))
check('lower-cost path preserves engine and duration explicitly', component.includes('Keep {plannedMotor} and {seconds}s'))
check('lower-cost path changes frequency before checkout', component.includes("'lower_plan_capacity'"))
check('lower-cost path derives price from canonical formatter', component.includes('priceLabel(result.lowerCostAlternative.plan.tier, currency)'))
check('pending disables checkout', component.includes('disabled={checkoutBusy}'))
check('checkout error is visible', component.includes('role="alert"'))
check('checkout revalidates before protected launch', component.indexOf('await verifyEligibilityShared()', component.indexOf('async function startCheckout')) < component.indexOf('onCheckout(tier, metadata)'))
check('analytics reports whether the event was actually stored', analytics.includes('): Promise<boolean>') && analytics.includes('return result?.stored === true'))

check('caller uses dedicated protected launcher', generate.includes("useCheckoutLaunch('generate_plan_fit')"))
check('caller launches through protected hook', generate.includes('planFitCheckout.launch('))
check('caller preserves intent campaign', generate.includes('withIntentCampaign(withPlanFitCheckoutContext('))
check('caller transports Plan Fit context to checkout', generate.includes('withPlanFitCheckoutContext('))
check('checkout verifies context server-side', checkoutRoute.includes('verifyPlanFitCheckoutContext(req.nextUrl.searchParams, tier, currency)'))
check('checkout verifies exact first delivery for owner', checkoutRoute.includes(".eq('user_id', user.id)") && checkoutRoute.includes(".eq('status', 'completed')") && checkoutRoute.includes('completedRows?.length !== 1'))
check('checkout binds context to the exact completed video', checkoutRoute.includes('completedRows[0]?.id !== requestedPlanFitContext.plan_fit_video_id'))
check('history failure stops before Stripe without a raw GET error', checkoutRoute.includes("const message = 'We could not verify your Plan Fit yet. Please try again.'") && checkoutRoute.includes('return isGet ? redirectError(message) : jsonError(message, 503)'))
check('stale first-delivery context stops before Stripe', checkoutRoute.includes("const message = 'This Plan Fit offer is no longer available. Refresh your videos and try again.'") && checkoutRoute.includes('return isGet ? redirectError(message) : jsonError(message, 409)'))
check('verified context reaches Stripe session and subscription', (checkoutRoute.match(/\.\.\.\(planFitContext \?\? \{\}\)/g) ?? []).length >= 2)
check('verified context replaces provisional checkout metadata', checkoutRoute.includes('checkoutMetadata = {') && checkoutRoute.includes('...planFitContext,'))
check('idempotency includes Plan Fit only when verified', checkoutRoute.includes('...(planFitContext ? { plan_fit: planFitContext } : {})'))
check('Stripe line item explains the selected fit', checkoutRoute.includes('Covers your ${planFitContext.plan_fit_monthly_videos}'))
check('payment webhook preserves verified origin', checkoutWebhook.includes('plan_fit_recommended_tier: session.metadata?.plan_fit_recommended_tier'))
check('expired checkout preserves Plan Fit recovery context', checkoutWebhook.includes('plan_fit_recommended_tier: expiredSession.metadata?.plan_fit_recommended_tier'))
const cancelledPage = readFileSync(join(root, 'app/checkout/cancelled/page.tsx'), 'utf8')
check('cancelled checkout preserves Plan Fit retry contract', cancelledPage.includes("'pf_video_id'") && checkoutRoute.includes('planFitRetrySearchParams(planFitContext)'))
check('cancelled checkout preserves origin through honest downsell', cancelledPage.includes('if (value) cheaperParams.set(key, value)'))
const returnSummary = checkout.readPlanFitCheckoutReturn(
  new URL(validContextUrl, 'https://www.usekineo.com').searchParams,
  seedanceFour.plan.tier,
  'usd',
)
check('cancel return rebuilds the verified engine label', returnSummary?.engineLabel === 'Seedance 1.5')
check('cancel return rebuilds the verified monthly cadence', returnSummary?.monthlyVideos === 4)
check('cancel return rebuilds the verified duration', returnSummary?.seconds === 60)
check('cancel return marks the recommended tier as matching', returnSummary?.selectedTierMatches === true)
const downgradedReturnSummary = checkout.readPlanFitCheckoutReturn(
  new URL(validContextUrl, 'https://www.usekineo.com').searchParams,
  'starter',
  'usd',
)
check('cancel return labels an honest downsell without claiming full fit', downgradedReturnSummary?.selectedTierMatches === false)
const tamperedReturn = new URL(validContextUrl, 'https://www.usekineo.com')
tamperedReturn.searchParams.set('pf_monthly_videos', '60')
check('cancel return fails closed for a forged cadence', checkout.readPlanFitCheckoutReturn(tamperedReturn.searchParams, seedanceFour.plan.tier, 'usd') === null)
check('cancelled checkout visibly restores the first-video rationale', cancelledPage.includes('Matched to the video you just made') && cancelledPage.includes('video{planFitReturn.monthlyVideos === 1'))
check('cancelled checkout CTA resumes the saved goal', cancelledPage.includes('Continue with ${planName} for this goal'))
check('cancelled checkout records the restored Plan Fit context', cancelledPage.includes('plan_fit_selected_tier_matches: planFitSelectedTierMatches'))
check('internal checkout recovery preserves Plan Fit context', checkoutResume.includes('planFitRetrySearchParamsFromMetadata(session.metadata)'))
check('admin cadence selection is also proof of exposure', funnelRoute.includes('new Set([...planFitImpressed, ...planFitSelected])'))
check('verified Stripe checkout repairs a dropped selection beacon', funnelRoute.includes('planFitSelected.add(userId)') && funnelRoute.includes('planFitCheckout.add(userId)'))
check('admin checkout stage uses verified Stripe origin', funnelRoute.includes("session.metadata?.checkout_origin === 'plan_fit_first_delivery'"))
check('admin paid stage uses completed Stripe sessions', funnelRoute.includes("session.status === 'complete'") && funnelRoute.includes("session.payment_status === 'paid'"))
check('admin identity query failure stays unknown, not zero', funnelRoute.includes('let planFitEventsAvailable = false') && funnelRoute.includes('planFitEventsAvailable = true') && funnelRoute.includes('eventsAvailable: planFitEventsAvailable'))
check('admin never renders unavailable Stripe data as zero', funnelRoute.includes('stripeAvailable: stripeSessionsAvailable') && funnelClient.includes("Events data unavailable — not zero") && funnelClient.includes("Stripe data unavailable — not zero"))
check('admin renders Plan Fit control panel', funnelClient.includes('Plan Fit · first delivery → subscription') && funnelClient.includes('planFitOffer.checkoutPeople'))
check('caller passes checkout pending state', generate.includes('checkoutPending={planFitCheckout.pending}'))
check('caller passes checkout error state', generate.includes('checkoutError={planFitCheckout.error}'))
check('caller passes fresh eligibility verifier', generate.includes('verifyEligibility={verifyPlanFitEligibility}'))
check('caller passes resolved canonical currency', generate.includes('currency={postVideoCurrency}'))
check('caller requires confirmed first delivery', generate.includes('planFitFirstDelivery &&'))
check('caller requires a sellable non-subscriber cohort', generate.includes('planFitSellableCohort &&'))
// The old literal embedded LF and failed on the repository's CRLF checkout
// even though the real guard was intact. Match the executable expression,
// not the platform line ending.
check('already-funded trial bridge precedes Plan Fit', /planFitSellableCohort\s*!==\s*null\s*&&\s*!trialBalanceBridge\.eligible/.test(generate))
// 29/08 production evidence invalidated the original order assertion: the
// first premium-first user reached `video_ready_viewed` but never exposed
// `plan_fit_impression`. Plan Fit already suppresses the trial recurring card,
// so leaving it after secondary actions created a first-delivery screen with
// no visible subscription ask. Deliver first, then sell, then retain/share.
const planFitRenderIndex = generate.indexOf('<PlanFitCard')
const deliveredFirstMarkerIndex = generate.indexOf('⚠ POSIÇÃO: DEPOIS DO DOWNLOAD, NUNCA ANTES.')
const referralRewardRenderIndex = generate.indexOf("{phase === 'done' && planTier === 'free' && !hasPaid && !showTrialPostVideoOffer && (")
check('Plan Fit follows the delivered download', deliveredFirstMarkerIndex >= 0 && deliveredFirstMarkerIndex < planFitRenderIndex)
check('Plan Fit precedes the referral reward', referralRewardRenderIndex >= 0 && planFitRenderIndex < referralRewardRenderIndex)
check('Plan Fit precedes NextShorts retention', planFitRenderIndex < generate.indexOf('<NextShortsSection'))
check('Plan Fit precedes the generic recurring upsell', generate.indexOf('<PlanFitCard') < generate.indexOf('<UpsellSection'))
check('non-bridge trial recurring render is replaced by Plan Fit', generate.includes('const showTrialPostVideoOffer = trialPostVideoPhase !== null && !planFitOwnsRecurringSlot'))
check('trial recurring impression is replaced too', generate.includes('const eligible = trialOfferPhaseForImpression !== null && !planFitOwnsRecurringSlot'))
check('generic recurring upsell is replaced by Plan Fit', generate.includes("!planFitOwnsRecurringSlot && planTier === 'free' && (hasPaid || !lastFastRenderRef.current)"))
check('Plan Fit prevents a false no-offer event', generate.includes('if (planFitOwnsRecurringSlot) return'))
check('clean-export job remains available independently', generate.includes('{showPostVideoExportChoice && ('))

check('history count is exact and head-only', videosRoute.includes("select('id', { count: 'exact', head: true })"))
check('history count is owner-filtered', videosRoute.includes(".eq('user_id', userId)"))
check('history count is completed-only', videosRoute.includes(".eq('status', 'completed')"))
check('history degradation is explicit', videosRoute.includes('historyReliable: false'))
check('history refreshes on every persisted video id', generate.includes('}, [publicVideoId, refreshVideoHistory])'))
check('history revalidates when the tab regains focus', generate.includes("window.addEventListener('focus', refresh)"))
check('history revalidates when the tab becomes visible', generate.includes("document.addEventListener('visibilitychange', refreshWhenVisible)"))
check('new completion notifies other tabs', generate.includes('localStorage.setItem(PLAN_FIT_HISTORY_SYNC_KEY'))
check('other-tab completion forces a refresh', generate.includes("window.addEventListener('storage', refreshFromAnotherTab)"))
check('history requests abort stale responses', generate.includes('videoHistoryAbortRef.current?.abort()'))
check('history evidence is bound to fetched video id', generate.includes('setHistoryEvidenceForVideoId(reliable ? evidenceVideoId : null)'))
check('history records definitive failures for legacy fallback', generate.includes('setHistoryCheckedForVideoId(evidenceVideoId)'))
check('first-delivery gate receives the evidence id', generate.includes('evidenceForVideoId: historyEvidenceForVideoId'))
check('compose persists success rows as completed', composeStatus.includes("status: 'completed'"))
check('client video id comes from persisted/completed lookup', composeStatus.includes('const videoId = persistedVideoId ?? await findCompletedVideoId(user.id, renderId)'))
check('done response returns that persisted video id', composeStatus.includes('video_id: videoId'))

// 10. The public cost calculator is the same contract, not a second pricing model.
const publicCalculator = readFileSync(join(root, 'app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx'), 'utf8')
check('public calculator imports canonical Plan Fit', publicCalculator.includes("from '@/lib/growth/planFit'") && publicCalculator.includes('calculatePlanFit({'))
check('public calculator has no private plan table', !publicCalculator.includes('const PLANS:') && !publicCalculator.includes('TIER_PRICES'))
check('public calculator has no duplicated engine credit costs', !publicCalculator.includes('creditsPerReferenceVideo'))
check('public calculator exposes the three supported durations', publicCalculator.includes('const PUBLIC_DURATIONS = [35, 60, 90] as const'))
for (const quality of ['fast', 'cinematic_ai', 'cinematic_h3', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood', 'cinematic_omni']) {
  check(`public calculator exposes ${quality}`, publicCalculator.includes(`quality: '${quality}'`))
}
check('public calculator recalculates cost by duration', publicCalculator.includes('quality, seconds, monthlyFilms: videos, currency'))
check('public calculator renders the lower-cost plan path', publicCalculator.includes('result.lowerCostAlternative') && publicCalculator.includes("'lower_plan_capacity'"))
check('public calculator renders same-engine no-plan capacity', publicCalculator.includes('result.maximumSameEngineFilms') && publicCalculator.includes("'same_engine_capacity'"))
check('public calculator renders Kineo 1 fallback', publicCalculator.includes('result.fastAlternative') && publicCalculator.includes("'fast_alternative'"))
check('public volume guard matches Plan Fit ceiling', publicCalculator.includes('Math.min(60, Math.round(value))') && (publicCalculator.match(/max=\{60\}/g) ?? []).length === 2)
check('public CTA telemetry carries duration', (publicCalculator.match(/seconds,/g) ?? []).length >= 3)

// 11. Organic earnings intent carries its exact cadence into the public cost tool.
const earningsCalculator = readFileSync(join(root, 'app/shorts-money-calculator/CalculatorClient.tsx'), 'utf8')
const dailySchedule = publicHandoff.buildPublicPlanFitLink({ shortsPerWeek: 7 })
check('weekly cadence converts conservatively to a monthly integer', dailySchedule.monthlyVideos === 31)
check('earnings and production handoff share one month constant', publicHandoff.WEEKS_PER_MONTH === 4.345 && !earningsCalculator.includes('const WEEKS_PER_MONTH'))
check('public handoff defaults to the lowest-cost engine', dailySchedule.quality === 'fast' && dailySchedule.seconds === 60)
check('public handoff targets the existing calculator anchor', dailySchedule.href.startsWith('/cheapest-ai-shorts-maker?') && dailySchedule.href.endsWith('#short-cost-calculator-title'))
check('public handoff declares the earnings source', dailySchedule.href.includes('plan_source=shorts_money_calculator') && dailySchedule.href.includes('internal_source=%2Fshorts-money-calculator'))
check('ordinary schedule is not capped', dailySchedule.capped === false && dailySchedule.requestedMonthlyVideos === 31)
const oversizedSchedule = publicHandoff.buildPublicPlanFitLink({ shortsPerWeek: 20 })
check('oversized schedule is capped honestly at the public ceiling', oversizedSchedule.capped === true && oversizedSchedule.monthlyVideos === 60 && oversizedSchedule.requestedMonthlyVideos > 60)
const roundTrip = publicHandoff.readPublicPlanFitHandoff(new URL(dailySchedule.href, 'https://www.usekineo.com').searchParams)
check('valid public handoff round-trips engine duration and cadence', roundTrip?.quality === 'fast' && roundTrip?.seconds === 60 && roundTrip?.monthlyVideos === 31)
check('forged source fails closed', publicHandoff.readPublicPlanFitHandoff('plan_source=forged&engine=fast&seconds=60&monthly_videos=31') === null)
check('unsupported duration fails closed', publicHandoff.readPublicPlanFitHandoff('plan_source=shorts_money_calculator&engine=fast&seconds=45&monthly_videos=31') === null)
check('out-of-range cadence fails closed', publicHandoff.readPublicPlanFitHandoff('plan_source=shorts_money_calculator&engine=fast&seconds=60&monthly_videos=61') === null)
check('unknown engine fails closed', publicHandoff.readPublicPlanFitHandoff('plan_source=shorts_money_calculator&engine=unknown&seconds=60&monthly_videos=31') === null)
check('earnings calculator uses the executable handoff builder', earningsCalculator.includes('buildPublicPlanFitLink({ shortsPerWeek: Number(shortsPerWeek) || 0 })'))
check('earnings calculator exposes a secondary cost-planning path', earningsCalculator.includes('result_cost_plan') && earningsCalculator.includes('Price this ${intFmt(productionPlan.monthlyVideos)}-video monthly schedule'))
check('public calculator reads the bounded handoff', publicCalculator.includes('readPublicPlanFitHandoff(window.location.search)'))
check('public calculator renders the continuity cue', publicCalculator.includes('data-public-plan-fit-handoff') && publicCalculator.includes('Publishing target carried over:'))
check('view telemetry reports the real carried defaults', publicCalculator.includes('default_engine: initialQuality') && publicCalculator.includes('default_seconds: initialSeconds') && publicCalculator.includes('default_videos: initialVideos'))

console.log(failed === 0
  ? `\n${total}/${total} checks passed.\n`
  : `\n${failed} failed of ${total}.\n`)
process.exit(failed === 0 ? 0 : 1)
