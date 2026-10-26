// Offline preview: canonical plan prices and the unchanged real PlanValueCard renderer.
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { root, offlineModules, React, renderToStaticMarkup, escapeHtml as esc } from '../../scripts/gpt24h-offline-support.mjs'

const load = offlineModules()
const price = load('lib/checkoutPricing.ts')
const { PlanValueCard, PLAN_VALUE_STAGE_CSS } = load('components/pricing/PlanValueStage.tsx')
const { affiliateOfferCopy, affiliateOfferScopeCopy } = load('lib/affiliateOfferCopy.ts')
const { buildAffiliateFirstClickOffer } = load('lib/affiliateFirstClick.ts')
const { mobileStickyPlanLabel } = load('lib/growth/mobileStickyBillingTruth.ts')
const base = (file) => execFileSync('git', ['show', `46fa10e58fced6430e0a2ba7bb445bb8905bd2e7:${file}`], { cwd: root, encoding: 'utf8' })
const oldLoad = offlineModules({ replacements: { 'lib/affiliateFirstClick.ts': base('lib/affiliateFirstClick.ts') } })
const payload = { isAffiliate: true, affiliate: { status: 'active', coupon_code: 'KINEOABCDEFGH' }, stats: { clicks: 0 }, link: 'https://www.usekineo.com/a/ABCDEFGH' }
const noOp = () => {}
const money = (amount) => price.formatCheckoutMoney('usd', amount)
const first = (tier, percent) => Math.round(price.getTierPrice(tier, 'usd') * (100 - percent) / 100)

function cards(percent, mobile) {
  const tiers = mobile ? ['basic'] : ['starter', 'basic', 'pro']
  return `<div class="pv-stage" data-palette="porcelana"><div class="pv-grid">${tiers.map((tier) => {
    const named = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }[tier]
    const discounted = tier !== 'starter'
    return renderToStaticMarkup(React.createElement(PlanValueCard, {
      tier, name: named, credits: price.TIER_CREDITS[tier], popular: tier === 'basic', selected: tier === 'basic', requested: false,
      amount: money(discounted ? first(tier, percent) : price.getTierPrice(tier, 'usd')),
      was: discounted ? money(price.getTierPrice(tier, 'usd')) : undefined,
      per: discounted ? `first month, then ${money(price.getTierPrice(tier, 'usd'))}/month` : '/month',
      monthlyPriceMinor: price.getTierPrice(tier, 'usd'), ctaLabel: `Get ${named}`, ctaDisabled: false, onBuy: noOp, onSelect: noOp,
      save: discounted ? percent === 50 ? affiliateOfferCopy('en', 'Partner demo') : `Save ${money(price.getTierPrice(tier, 'usd') - first(tier, percent))} on your first month · cancel anytime` : 'Cancel anytime',
      included: ['No watermark', 'Commercial use', 'Voice, captions and music on films'],
    }))
  }).join('')}</div></div>`
}
function banner(after) {
  return after
    ? `<aside class="partner-banner"><b>${esc(affiliateOfferCopy('en', 'Partner demo'))}</b><p>${esc(affiliateOfferScopeCopy('en'))}</p></aside>`
    : '<aside class="welcome-banner"><b>Special offer</b><span>20% off your first month on Creator and Studio monthly plans</span><button>Get 20% off</button></aside>'
}
function sticky(percent) {
  return `<div class="sticky">${['starter', 'basic', 'pro'].map((tier) => `<button>${esc(mobileStickyPlanLabel({ tier, billing: 'monthly', monthlyLabel: money(tier === 'starter' ? price.getTierPrice(tier, 'usd') : first(tier, percent)), annualTotalLabel: money(price.getAnnualPrice(tier, 'usd')) }))}</button>`).join('')}</div>`
}
function faq(file) {
  return file.split('\n').find((line) => line.includes("q: 'What if I promote on TikTok"))?.match(/a: '(.*)' },/)?.[1] ?? ''
}
const partnersBefore = base('app/partners/page.tsx')
const partnersAfter = readFileSync(resolve(root, 'app/partners/page.tsx'), 'utf8')
const disclosure = (text) => text.match(/Example only, not a promise\.[^\n]*?(?=<\/p>)/)?.[0]
  ?.replace('{AFFILIATE_COMMISSION_PCT}', load('lib/affiliateCommission.ts').AFFILIATE_COMMISSION_PCT)
  ?.replace('{PRICE_RANGE}', `$${price.TIER_PRICES.starter.usd / 100}–$${price.TIER_PRICES.pro.usd / 100}/month`) ?? ''
function copyPanels(after) {
  const file = after ? partnersAfter : partnersBefore
  const caption = (after ? buildAffiliateFirstClickOffer : oldLoad('lib/affiliateFirstClick.ts').buildAffiliateFirstClickOffer)(payload).caption
  return `<section class="copy-panel"><h3>Affiliate dashboard · coupon and share caption</h3><div class="coupon">KINEOABCDEFGH <button>Copy coupon</button></div><p>“use code KINEOABCDEFGH for ${after ? '50% off your first month' : '20% off'}”</p><p>${after ? 'An eligible new customer gets 50% off their first month of Creator or Studio monthly. The link applies it automatically too. Full monthly price from month two; discounts do not stack.' : 'An eligible new customer types it at checkout and gets 20% off their first month.'}</p><h4>First-click share caption · same app template</h4><p class="caption">${esc(caption)}</p><h3>Partners · coupon FAQ</h3><p>${esc(faq(file))}</p><h3>Partners · earnings disclosure</h3><p>${esc(disclosure(file))}</p></section>`
}
const css = `:root{--bg:#f7f8fb;--card:#fff;--card2:#f1f3f8;--text:#161c27;--text2:#374151;--muted:#657081;--muted2:#7d8798;--border:#dde2eb;--accent:#0a5cff;--indigo:#0a5cff;--accent-soft:#edf3ff;--on-accent:#fff;--font-sans:Arial,sans-serif;--dur-fast:.15s;--ease-swift:ease}*{box-sizing:border-box}body{margin:0;background:#e8ecf3;color:var(--text);font-family:Arial,sans-serif}main{padding:28px}h1{font-size:25px}h2{font-size:20px}h3{font-size:17px;margin:22px 0 10px}h4{margin:22px 0 10px}p{line-height:1.55}.meta{font-size:13px;max-width:960px}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}.pair>article{min-width:0}.label{padding:10px 16px;background:#17233a;color:#fff;font-weight:700}.screen{background:var(--bg);padding-bottom:20px;overflow:hidden;border:1px solid #d6dce7;border-radius:0 0 14px 14px}.nav{padding:20px 24px;border-bottom:1px solid var(--border);font-size:20px;font-weight:bold}.title{text-align:center;margin:26px 0 20px;font-size:26px}.toggle{margin:auto auto 24px;display:flex;justify-content:center;gap:8px;font-size:13px}.toggle b{background:var(--text);color:#fff;border-radius:20px;padding:9px 17px}.toggle span{padding:9px}.pv-stage{margin:0 22px}.pv-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.partner-banner{padding:13px 16px;text-align:center;background:var(--accent-soft);border-bottom:1px solid var(--accent);font-size:14px}.partner-banner p{margin:4px 0 0;font-size:12px;line-height:1.5}.welcome-banner{display:flex;gap:14px;align-items:center;background:#ffe135;color:#111;padding:10px 16px;font-size:14px}.welcome-banner b{background:var(--accent);color:#fff;padding:4px 8px;border-radius:6px;font-size:12px}.welcome-banner span{flex:1}.welcome-banner button{background:#111;color:#fff;border:0;border-radius:24px;padding:8px 14px}.copy-panel{background:#fff;padding:0 22px 22px;border:1px solid var(--border);border-radius:12px}.copy-panel p{font-size:13px;color:var(--muted)}.coupon{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:15px;font-weight:bold;display:flex;align-items:center;justify-content:space-between}.coupon button{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:8px}.caption{border:1px solid var(--border);border-radius:9px;padding:15px;background:var(--card2);overflow-wrap:anywhere}.mobile-pair{grid-template-columns:390px 390px;justify-content:center}.mobile-pair .pv-grid{grid-template-columns:1fr}.mobile-pair .welcome-banner{flex-wrap:wrap}.mobile-pair .welcome-banner span{flex-basis:100%}.mobile-pair .pv-stage{margin:0 16px}.mobile-pair .title{font-size:24px}.sticky{display:flex;gap:8px;padding:12px;background:#fff;border-top:1px solid var(--border);margin-top:20px}.sticky button{flex:1;min-width:0;border:0;border-radius:9px;background:#17233a;color:#fff;font-weight:700;font-size:12px;padding:12px 5px}.sticky button:nth-child(2){background:var(--accent)}${PLAN_VALUE_STAGE_CSS}`
const page = (mobile) => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo affiliate 50% · before / after</title><style>${css}</style><main><h1>KINEO-AFILIADO-50-2610 · ${mobile ? 'Mobile' : 'Desktop'} · before / after</h1><p class="meta"><b>TESTADO LOCALMENTE · static preview, 26/10/2026.</b> Before: main 46fa10e5. After: approved partner offer. Partner demo / KINEOABCDEFGH are example display data. Prices come from the unchanged canonical table; cards use the real PlanValueCard renderer. Checkout is hosted by Stripe; its submit copy is shown separately below.</p><div class="pair ${mobile ? 'mobile-pair' : ''}">${[false,true].map((after) => `<article><div class="label">${after ? 'AFTER · partner 50%' : 'BEFORE · welcome20 on affiliate visit'}</div><div class="screen">${banner(after)}<div class="nav">ϟ Kineo</div><h2 class="title">Choose your plan</h2><div class="toggle"><b>Monthly</b><span>Yearly</span></div>${cards(after ? 50 : 20,mobile)}${mobile ? sticky(after ? 50 : 20) : ''}</div><h2>Partner-facing text</h2>${copyPanels(after)}<h2>Stripe checkout · submit copy</h2><section class="copy-panel"><h3>${after ? esc(affiliateOfferCopy('en','Partner demo')) : 'No partner-specific offer text'}</h3>${after ? `<p>${esc(affiliateOfferScopeCopy('en'))}</p>` : ''}</section></article>`).join('')}</div>${!mobile ? `<h2>No registered partner name</h2><div class="partner-banner">${esc(affiliateOfferCopy('en',null))}<p>${esc(affiliateOfferScopeCopy('en'))}</p></div><h2>Translations · Portuguese / Arabic samples</h2><div class="partner-banner">${esc(affiliateOfferCopy('pt','Partner demo'))}<p>${esc(affiliateOfferScopeCopy('pt'))}</p></div><div class="partner-banner" lang="ar" dir="rtl">${esc(affiliateOfferCopy('ar','Partner demo'))}<p>${esc(affiliateOfferScopeCopy('ar'))}</p></div>` : ''}</main></html>`
for (const mobile of [false,true]) writeFileSync(resolve(root,`docs/previews/affiliate-50-2610${mobile ? '-mobile' : ''}.html`),page(mobile),'utf8')
console.log('Generated desktop and mobile before/after HTML with canonical plan prices.')
