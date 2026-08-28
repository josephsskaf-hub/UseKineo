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

equal(distribution.AGENCY_DISTRIBUTION_ENTRIES.length, 4, 'four evidence-backed bridges are enabled')
for (const entry of ['state_report', 'cost_page', 'pricing', 'comment_tool']) {
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
  state_report: read('app/state-of-ai-shorts-2026/page.tsx'),
  cost_page: read('app/cheapest-ai-shorts-maker/page.tsx'),
  pricing: read('app/pricing/PricingClient.tsx'),
}
for (const [entry, source] of Object.entries(sources)) {
  check(source.includes(`AgencyVolumeBridge entry="${entry}"`), `${entry} renders its measured bridge`)
}

const commentTool = read('app/comment-to-video/CommentToVideoClient.tsx')
check(commentTool.includes("agencyPacksHref('comment_tool')"), 'comment tool routes qualified client volume through the allowlist')

const destination = read('app/ai-shorts-for-agencies/AgencyPacksClient.tsx')
check(destination.includes('readAgencyDistributionEntry(window.location.search)'), 'destination reads the allowlisted entry')
check(destination.includes("entry: entry ?? 'direct'"), 'destination records entry or explicit direct traffic')
check(destination.includes("viewed:v2"), 'session marker is versioned')
check(destination.includes("`${VIEW_MARKER}:${entry ?? 'direct'}`"), 'dedupe is scoped to the measured entry')

const preview = read('docs/previews/B2B-DISTRIBUTION-BRIDGES-2026-08-27.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(preview.includes('Supabase production aggregate SELECT · 27 Aug 2026'), 'preview includes dated production evidence')
check(preview.includes('0 pessoas'), 'preview names the observed B2B traffic baseline')

console.log(`PASS — ${checks}/${checks} B2B distribution checks`)
