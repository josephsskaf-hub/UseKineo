import { source, moduleAt, checks } from './gpt-5h-test-support.mjs'
const { check, finish } = checks()
const { DFY_SERVICE_FACT } = await moduleAt('lib/growth/dfyServiceFacts.ts')
const { DFY_TIERS, dfyPaymentLink } = await moduleAt('lib/growth/dfyOffer.ts')
const { businessAdsStamp } = await moduleAt('lib/growth/businessAdsAttribution.ts')
let buttons = source('app/business-video-ads/BusinessAdsOffers.tsx')
if (process.argv.includes('--mutant')) buttons = buttons.replace("source: 'page_business_ads'", "source: 'wrong_campaign'")
const page = source('app/business-video-ads/page.tsx')
check('all live tiers derive price, deadline and revisions from the offer', DFY_SERVICE_FACT.tiers.every(t => t.priceUsdMinor === DFY_TIERS[t.tier].priceMinor && t.hours === DFY_TIERS[t.tier].hours && t.revisions === DFY_TIERS[t.tier].revisions))
for (const tier of DFY_SERVICE_FACT.tiers) {
  const url = new URL(dfyPaymentLink({ tier: tier.tier, userId:null, source:'page_business_ads' }))
  check(`${tier.tier}: valid nominal source, no price in checkout URL`, url.searchParams.get('utm_source') === 'page_business_ads' && ![...url.searchParams.keys()].some(k => /price|amount/.test(k)))
}
check('rendered buttons use canonical builder and page attribution', buttons.includes('dfyPaymentLink({ tier: tier.tier') && buttons.includes("source: 'page_business_ads'"))
check('no literal tier prices in page or buttons', !/US\$\s*(35|75)|priceMinor\s*[:=]\s*(3500|7500)/.test(page + buttons))
check('real brief summaries separated from fictional clinic', page.includes('Anonymized real brief') && page.includes('Fictional demonstration · Clínica Exemplo') && page.includes('not finished-video samples or testimonials'))
check('human scope, materials and refund disclosed', page.includes('What you receive') && page.includes('AFTER PAYMENT') && page.includes('DFY_SERVICE_FACT.refund') && page.includes('operated by a human'))
check('both events wired, tier on click', buttons.includes("trackEvent('business_ads_page_viewed'") && buttons.includes("trackEvent('business_ads_cta_clicked', { tier: tier.tier"))
const sha = 'a'.repeat(40)
const stamp = {business_ads_deploy_sha:'forged', ...businessAdsStamp('business_ads_page_viewed',sha)}
check('server deployment overwrites client data and stamps exposure', stamp.business_ads_deploy_sha === sha && stamp.business_ads_page_viewed === true)
check('missing deploy is unknown, not clock-based', businessAdsStamp('business_ads_page_viewed',undefined).business_ads_deploy_sha === null && businessAdsStamp('business_ads_page_viewed','not-sha').business_ads_deploy_sha === null)
check('unrelated events untouched', Object.keys(businessAdsStamp('another_event',sha)).length === 0)
const sink = source('app/api/events/route.ts')
check('server sink owns the deployment stamp after client metadata', sink.indexOf('...businessAdsStamp(name, process.env.VERCEL_GIT_COMMIT_SHA)') > sink.indexOf('...metadata,'))
check('page discoverable through sitemap and facts URL', source('app/sitemap.ts').includes("path: '/business-video-ads'") && source('app/llms.txt/route.ts').includes('DFY_SERVICE_FACT.url'))
// Approved design 13fa216f formats CSS with spaces; preserve the same focus/column guard.
check('visible keyboard focus and mobile single column', source('app/business-video-ads/businessAds.module.css').includes(':focus-visible') && /grid-template-columns:\s*1fr\s*[;}]/.test(source('app/business-video-ads/businessAds.module.css')))
finish()
