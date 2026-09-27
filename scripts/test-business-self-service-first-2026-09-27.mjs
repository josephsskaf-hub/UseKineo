import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, React, renderToStaticMarkup, checks } from './gpt24h-offline-support.mjs'
import { businessFixture } from './gpt24h-business-fixture.mjs'
const { check, finish } = checks()
const file = 'app/business-video-ads/page.tsx'
const src = readFileSync(resolve(root,file),'utf8')
const load = businessFixture(process.argv.includes('--mutant') ? { [file]:src.replace('<nav className', '<BusinessAdsOffers /><nav className') } : {})
const html = renderToStaticMarkup(React.createElement(load(file).default))
const offer = load('lib/growth/adsSegmentPresentation.ts').adsSegmentOffer()
const { DFY_TIERS } = load('lib/growth/dfyOffer.ts')
const { DFY_SERVICE_FACT } = load('lib/growth/dfyServiceFacts.ts')
check('self-service first, before Express', html.indexOf('business-self-service-first') > 0 && html.indexOf('business-self-service-first') < html.indexOf('<h3>Express'))
check('one DFY offer section only', (html.match(/id="packages"/g)||[]).length === 1)
check('self-service monthly price and credits derived', html.includes(`${offer.starterPrice} USD/month`) && html.includes(`${offer.credits} credits per ${offer.seconds} s ad`))
check('paid-plan inclusion stated without human review promise', html.includes('Included in any paid plan') && !/human editor.{0,15}reviews|24 hours/.test(src))
check('no typed commercial amounts', !/\$\d|\b\d+\s*(credits|hours|films|USD|s ad)/.test(src))
check('primary CTA goes to ads, with sprint attribution', html.includes('/ads?from=business_ads&amp;utm_source=business_video_ads&amp;utm_campaign=gpt24h&amp;utm_content=self_service'))
check('no new features promised', !/never expire|priority queue|no human|instant ad|publish directly/.test(html))
check('concept still remains labelled, not a client result', html.includes('AI-generated concept · not a client result'))
for (const tier of DFY_SERVICE_FACT.tiers) {
  check(`${tier.name}: canonical price, deadline and revision`, html.includes(tier.priceLabel) && html.includes(`${DFY_TIERS[tier.tier].hours} hours`) && html.includes(`${tier.revisions} ${tier.revisions === 1 ? 'revision' : 'revisions'}`))
  check(`${tier.name}: existing payment URL`, html.includes(tier.paymentUrl.replace(/&/g,'&amp;')))
}
check('existing refund preserved (not a delivery promise)', html.includes(DFY_SERVICE_FACT.refund))
check('human-operated service is explicitly separate', html.includes('separate service operated by a human'))
finish()
