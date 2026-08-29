import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pagePath = path.join(root, 'app', 'how-much-do-youtube-shorts-pay', 'page.tsx')
const source = fs.readFileSync(pagePath, 'utf8')
let checks = 0

function includes(label, text) {
  assert.ok(source.includes(text), label)
  checks += 1
}

function excludes(label, text) {
  assert.ok(!source.includes(text), label)
  checks += 1
}

includes('fresh visible date', "const UPDATED = 'August 29, 2026'")
includes('machine-readable publish date', "const DATE_PUBLISHED = '2026-07-24'")
includes('machine-readable modified date', "const DATE_MODIFIED = '2026-08-29'")
includes('canonical is centralized', 'const CANONICAL_URL =')
includes('metadata reuses canonical', 'alternates: { canonical: CANONICAL_URL }')
includes('official Shorts policy source', 'support.google.com/youtube/answer/12504220?hl=en')
includes('official current YPP source', 'support.google.com/youtube/answer/72851?hl=en')
includes('official 2027 YPP source', 'support.google.com/youtube/answer/12843009?hl=en')
includes('visible verified stamp', 'Verified against YouTube Help · August 29, 2026')
includes('official versus estimate heading', 'What YouTube confirms — and what remains an estimate')
includes('official 45 percent statement', 'Eligible creators receive 45%')
includes('RPM explicitly not official', 'YouTube publishes no universal RPM')
includes('current threshold expiry is visible', 'Through January 31, 2027')
includes('current Shorts threshold', '10 million qualified public Shorts views')
includes('current long-form threshold', '4,000 qualified public watch hours')
includes('review is not acceptance', 'not guarantee acceptance')
includes('2027 effective date', 'Effective February 1, 2027')
includes('2027 Shorts entry threshold', '20 million qualified Shorts views')
includes('2027 long-form entry threshold', '8,000 qualified long-form watch hours')
includes('existing members are distinguished', 'Existing YPP members are not removed')
includes('ongoing Creator Pool threshold', 'monthly Shorts Creator Pool earnings will require maintaining')
includes('primary sources section', 'Primary sources checked')
includes('source check date visible', 'Official YouTube Help pages checked on August 29, 2026')
includes('article schema exists', "'@type': 'Article'")
includes('article datePublished is wired', 'datePublished: DATE_PUBLISHED')
includes('article dateModified is wired', 'dateModified: DATE_MODIFIED')
includes('article canonical is wired', 'mainEntityOfPage: CANONICAL_URL')
includes('article schema is rendered', 'JSON.stringify(articleJsonLd)')
includes('FAQ adds 2027 answer', 'How do YouTube monetization requirements change in 2027?')
includes('FAQ still derives schema from visible data', 'mainEntity: FAQ.map')
includes('calculator remains embedded', '<CalculatorClient />')
includes('starter remains embedded', '<TopicGeneratorForm')
includes('starter source remains stable', "const STARTER_SOURCE = 'starter_shorts_pay'")
includes('mid-page CTA remains', 'Generate a free Short →')
includes('estimated payout band remains stable', 'const RPM_LOW = 0.03')
includes('estimated midpoint remains stable', 'const RPM_MID = 0.05')
includes('estimated high remains stable', 'const RPM_HIGH = 0.1')
excludes('stale July freshness label removed', "const UPDATED = 'July 2026'")
excludes('stale valid-view wording removed', '10 million valid public Shorts views')
excludes('live content is not misrepresented as current threshold', 'long-form and live content')

console.log(`shorts-pay-authority: ${checks}/${checks} checks passed`)
