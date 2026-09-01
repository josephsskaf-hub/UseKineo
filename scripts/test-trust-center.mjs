import fs from 'node:fs'

let passed = 0
let failed = 0

function source(path) {
  return fs.readFileSync(path, 'utf8')
}

function ok(value, label) {
  if (value) {
    passed += 1
    console.log(`✓ ${label}`)
  } else {
    failed += 1
    console.error(`✗ ${label}`)
  }
}

const page = source('app/trust/page.tsx')
const actions = source('app/trust/TrustActions.tsx')
const footer = source('components/Footer.tsx')
const sitemap = source('app/sitemap.ts')
const llms = source('app/llms.txt/route.ts')
const funnel = source('app/api/admin/funnel/route.ts')

ok(page.includes("alternates: { canonical: CANONICAL }"), 'canonical metadata exists')
ok(page.includes("'@type': 'AboutPage'"), 'AboutPage structured data exists')
ok(page.includes("'@type': 'FAQPage'"), 'FAQ structured data exists')
ok(page.includes("founder: { '@type': 'Person', name: 'Joseph Skaf' }"), 'operator identity is machine-readable')
ok(page.includes('support@usekineo.com'), 'support contact is public')
ok(page.includes('Card details stay with Stripe'), 'payment boundary is explicit')
ok(page.includes('Your library is private by default'), 'customer-video privacy is explicit')
ok(page.includes('You keep the videos you generate'), 'commercial ownership is explicit')
ok(page.includes('Processors are named, not hidden'), 'processor disclosure is explicit')
ok(page.includes('Seven days to request the first-month refund'), 'refund boundary is explicit')
ok(page.includes('No SOC 2, ISO 27001 or enterprise SLA claim.'), 'unearned certifications are explicitly refused')
ok(page.includes('No invented customer count'), 'invented social proof is explicitly refused')
ok(page.includes('review remains your responsibility'), 'AI output review duty is explicit')
ok(page.includes('www.usekineo.com'), 'canonical domain is visible to humans')
ok(!page.match(/trusted by|#1 AI|industry-leading|best-in-class/i), 'page contains no unsupported superlative')

ok(actions.includes("trackEvent('trust_page_viewed'"), 'page view is measured')
ok(actions.includes("trackEvent('trust_cta_clicked'"), 'CTA choices are measured')
ok(actions.includes('sessionStorage.getItem(VIEW_MARKER)'), 'view event is session-deduped')
ok(actions.includes("const EXPERIMENT_VERSION = 'trust_business_handoff_v1'"), 'B2B handoff exposure has a stable experiment version')
ok(actions.includes("VIEW_MARKER = 'kineo:trust-page:viewed:business-handoff-v1'"), 'B2B exposure gets a fresh session marker')
ok(actions.includes("destination: 'examples' | 'signup' | 'support' | 'business_packs'"), 'CTA destinations are discriminated')
ok(actions.includes('href="/ai-shorts-for-agencies#agency-pack-heading"'), 'client-work CTA reaches the existing self-service pack shelf')
ok(actions.includes("record('business_packs')"), 'client-work CTA is measured separately')
ok(actions.includes('Client work? Compare one-time self-service packs'), 'B2B copy names the exact self-service offer without enterprise promises')
ok(!actions.includes('utm_source=trust&utm_medium=organic&utm_campaign=trust_business'), 'B2B handoff does not overwrite first-touch attribution')

ok(footer.includes("href: '/trust'"), 'trust center has a global internal link')
ok(sitemap.includes("path: '/trust'"), 'trust center is in sitemap')
ok(llms.includes('[Trust Center]'), 'trust center is exposed to answer engines')
ok(funnel.includes("'trust_page_viewed', 'trust_cta_clicked'"), 'admin identity query includes trust events')
ok(funnel.includes("trust_page_viewed: uniqueCheckoutActors('trust_page_viewed')"), 'admin counts trust viewers as actors')
ok(funnel.includes("trust_cta_clicked: uniqueCheckoutActors('trust_cta_clicked')"), 'admin counts trust CTA actors')

console.log(`\n${passed}/${passed + failed} checks passed`)
if (failed) process.exit(1)
