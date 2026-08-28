#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = (file) => fs.readFileSync(file, 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

const compiled = ts.transpileModule(read('lib/agencyDistribution.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(compiled, {
  module: moduleBox,
  exports: moduleBox.exports,
  require(id) { throw new Error(`unexpected import ${id}`) },
  Set,
  URLSearchParams,
})
const distribution = moduleBox.exports

check(distribution.AGENCY_DISTRIBUTION_ENTRIES.includes('home'), 'home is an explicit measured entry')
equal(distribution.agencyPacksHref('home'), '/ai-shorts-for-agencies?entry=home#agency-pack-heading', 'home builds the exact B2B destination')
equal(distribution.readAgencyDistributionEntry('?entry=home'), 'home', 'home round-trips through the destination reader')
equal(distribution.readAgencyDistributionEntry('?entry=homepage'), null, 'nearby unapproved alias fails closed')
check(!distribution.agencyPacksHref('home').includes('utm_'), 'bridge preserves original acquisition attribution')

const landing = read('app/KineoLanding.tsx')
check(landing.includes("import AgencyVolumeBridge from '@/components/AgencyVolumeBridge'"), 'home imports the existing canonical bridge')
check(landing.includes('<AgencyVolumeBridge entry="home" />'), 'home renders its allow-listed entry')
check(landing.includes('data-growth-surface="home_b2b_bridge"'), 'home bridge has an inspectable surface marker')

const howEnd = landing.indexOf('</section>', landing.indexOf('<section id="how">'))
const bridgeIndex = landing.indexOf('<AgencyVolumeBridge entry="home" />')
const compareIndex = landing.indexOf('<section id="compare">')
check(howEnd >= 0 && bridgeIndex > howEnd, 'bridge appears only after the workflow is explained')
check(compareIndex > bridgeIndex, 'bridge appears before the generic competitor comparison')

const bridge = read('components/AgencyVolumeBridge.tsx')
check(bridge.includes("home: 'Making Shorts for your company or for paying clients?'"), 'home copy names both B2B audiences')
check(bridge.includes('BULK_PACKS, formatCheckoutMoney'), 'price derives from canonical packs')
check(bridge.includes('agencyPacksHref(entry)'), 'CTA uses the allow-listed route builder')
check(bridge.includes('commercial-use MP4s'), 'outcome remains within approved commercial-use promise')
check(bridge.includes('Self-service · one account · no recurring contract'), 'offer boundaries remain visible')

const destination = read('app/ai-shorts-for-agencies/AgencyPacksClient.tsx')
check(destination.includes('readAgencyDistributionEntry(window.location.search)'), 'destination reads the home entry')
check(destination.includes("entry: entry ?? 'direct'"), 'destination measures actual arrival instead of the static link')

const engineWallStart = landing.indexOf('{engineWall.length >= 4 && (')
const howStart = landing.indexOf('<section id="how">')
check(engineWallStart >= 0 && engineWallStart < howStart, 'approved engine wall remains before the new bridge')
check(landing.includes('<TrendingRow videos={trending} />'), 'approved multi-engine row remains mounted')

const visualPath = 'docs/previews/HOME-B2B-BRIDGE-2026-08-28.html'
check(fs.existsSync(visualPath), 'self-contained comparison exists')
const visual = read(visualPath)
for (const label of ['BEFORE', 'AFTER', 'DESKTOP', 'MOBILE', 'HOW IT WORKS', 'FOR AGENCIES']) {
  check(visual.includes(label), `visual includes ${label.toLowerCase()}`)
}
check(!/https?:\/\//i.test(visual), 'visual comparison has no external dependency')

console.log(`PASS — ${checks}/${checks} home B2B bridge checks`)
