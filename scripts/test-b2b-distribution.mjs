#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

const compiled = ts.transpileModule(read('lib/agencyDistribution.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(compiled, {
  module: moduleBox,
  exports: moduleBox.exports,
  require: (id) => { throw new Error(`unexpected import: ${id}`) },
  URLSearchParams,
  Set,
}, { filename: 'lib/agencyDistribution.ts' })
const distribution = moduleBox.exports

// Kineo 1 is the tenth bridge because production evidence now shows real
// business-volume traffic on that engine landing; the previous nine remain.
equal(distribution.AGENCY_DISTRIBUTION_ENTRIES.length, 10, 'ten evidence-backed bridges are enabled')
for (const entry of ['home', 'state_report', 'cost_page', 'pricing', 'comment_tool', 'product_tool', 'content_plan', 'real_estate', 'client_brief', 'kineo1_engine']) {
  const href = distribution.agencyPacksHref(entry)
  equal(href, `/ai-shorts-for-agencies?entry=${entry}#agency-pack-heading`, `${entry} has an exact first-party path`)
  check(!href.includes('utm_'), `${entry} cannot overwrite original acquisition attribution`)
  equal(distribution.readAgencyDistributionEntry(`?entry=${entry}`), entry, `${entry} round-trips through the reader`)
}

for (const unsafe of ['', '?entry=unknown', '?entry=https://evil.example', '?entry=pricing%26next%3Devil']) {
  equal(distribution.readAgencyDistributionEntry(unsafe), null, `unsafe entry fails closed: ${unsafe || '(empty)'}`)
}

const bridge = read('components/AgencyVolumeBridge.tsx')
check(bridge.includes("BULK_PACKS, formatCheckoutMoney"), 'bridge derives prices from the checkout source of truth')
check(bridge.includes('agencyPacksHref(entry)'), 'bridge destination is built by the allowlist')
check(bridge.includes('commercial-use MP4s'), 'bridge states the approved commercial-use outcome')
check(bridge.includes('Self-service · one account · no recurring contract'), 'bridge states the offer boundaries')

const sources = {
  home: read('app/KineoLanding.tsx'),
  state_report: read('app/state-of-ai-shorts-2026/page.tsx'),
  cost_page: read('app/cheapest-ai-shorts-maker/page.tsx'),
  pricing: read('app/pricing/PricingClient.tsx'),
}
for (const [entry, source] of Object.entries(sources)) {
  check(source.includes(`AgencyVolumeBridge entry="${entry}"`), `${entry} renders its measured bridge`)
}

const commentTool = read('app/comment-to-video/CommentToVideoClient.tsx')
check(commentTool.includes("agencyPacksHref('comment_tool')"), 'comment tool routes qualified client volume through the allowlist')
const productTool = read('app/product-to-video-script/ProductToVideoClient.tsx')
check(productTool.includes("agencyPacksHref('product_tool')"), 'product tool routes qualified client volume through the allowlist')
const contentPlan = read('app/business-video-content-plan/BusinessContentPlanClient.tsx')
check(contentPlan.includes("agencyPacksHref('content_plan')"), 'business content plan routes qualified volume through the allowlist')
const realEstate = read('app/real-estate-video-maker/page.tsx')
check(realEstate.includes("agencyPacksHref('real_estate')"), 'real estate page routes qualified volume through the allowlist')
const clientBrief = read('app/client-video-brief-generator/ClientVideoBriefGenerator.tsx')
check(clientBrief.includes("agencyPacksHref('client_brief')"), 'client brief tool routes approved demand through the allowlist')
const engineLanding = read('app/ai-video-generator/[engine]/page.tsx')
check(engineLanding.includes('<AgencyVolumeBridge entry="kineo1_engine" />'), 'Kineo 1 routes commercial Fast volume through the allowlist')
check(engineLanding.includes("params.engine === 'kineo-1'"), 'other engine landings cannot mount the Fast volume bridge')

const destination = read('app/ai-shorts-for-agencies/AgencyPacksClient.tsx')
check(destination.includes('readAgencyDistributionEntry(window.location.search)'), 'destination reads the allowlisted entry')
check(destination.includes("entry: entry ?? 'direct'"), 'destination records entry or explicit direct traffic')
check(destination.includes("viewed:v2"), 'session marker is versioned')
check(destination.includes("`${VIEW_MARKER}:${entry ?? 'direct'}`"), 'dedupe is scoped to the measured entry')
check(destination.includes("FREE_BRIEF_BRIDGE_VARIANT = 'agency_free_brief_bridge_v1'"), 'agency free-brief bridge has a stable experiment version')
check(destination.includes('href="/client-video-brief-generator?entry=agency_page"'), 'agency page routes not-ready buyers to the existing free brief')
check(destination.includes("trackEvent('agency_free_brief_clicked'"), 'agency bridge records the click before navigation')
check(destination.includes("placement: 'after_pack_comparison'"), 'agency bridge declares its secondary placement')
check(destination.indexOf('Buy {pack.videos}-video pack') < destination.indexOf('Need client approval before buying a batch?'), 'free brief remains secondary to the paid pack CTAs')

const preview = read('docs/previews/B2B-DISTRIBUTION-BRIDGES-2026-08-27.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(preview.includes('Supabase production aggregate SELECT · 27 Aug 2026'), 'preview includes dated production evidence')
check(preview.includes('0 pessoas'), 'preview names the observed B2B traffic baseline')

const bridgePreview = read('docs/previews/AGENCY-FREE-BRIEF-BRIDGE-2026-08-30.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(bridgePreview.includes(label), `agency bridge preview includes ${label}`)
}

console.log(`PASS — ${checks}/${checks} B2B distribution checks`)
