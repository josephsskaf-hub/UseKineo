#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(() => {
    throw new Error(`${path}: unexpected import`)
  }, module, module.exports)
  return module.exports
}

const comparison = loadTs('lib/growth/affiliateProgramComparison.ts')
equal(comparison.AFFILIATE_COMPARISON_VERIFIED_ISO, '2026-08-28', 'comparison is dated')
equal(comparison.AFFILIATE_PROGRAM_COMPARISON.length, 4, 'four settled official programs are compared')
equal(comparison.affiliateComparisonPrograms().join(','), 'Kineo,OpusClip,InVideo,VEED', 'program order is intentional')

const kineo = comparison.kineoAffiliateComparisonRow()
equal(kineo.commission, '40% recurring', 'Kineo rate is explicit')
ok(kineo.recurrence.includes('stays subscribed'), 'Kineo duration is explicit')
ok(kineo.activation.includes('Instant'), 'Kineo instant activation is explicit')
ok(kineo.distribution.includes('coupon'), 'Kineo linkless-video advantage is explicit')
equal(comparison.AFFILIATE_PROGRAM_COMPARISON.filter((row) => row.kineo).length, 1, 'exactly one row is Kineo')

for (const row of comparison.AFFILIATE_PROGRAM_COMPARISON) {
  ok(row.commission.length > 2, `${row.program}: commission is present`)
  ok(row.recurrence.length > 10, `${row.program}: duration is present`)
  ok(row.activation.length > 5, `${row.program}: activation is present`)
  ok(row.distribution.length > 5, `${row.program}: distribution is present`)
  const url = new URL(row.sourceUrl)
  equal(url.protocol, 'https:', `${row.program}: official source is HTTPS`)
}

const sourceDomains = Object.fromEntries(
  comparison.AFFILIATE_PROGRAM_COMPARISON.map((row) => [row.program, new URL(row.sourceUrl).hostname]),
)
equal(sourceDomains.Kineo, 'www.usekineo.com', 'Kineo source is canonical')
equal(sourceDomains.OpusClip, 'help.opus.pro', 'OpusClip source is first-party')
equal(sourceDomains.InVideo, 'invideo.io', 'InVideo source is first-party')
equal(sourceDomains.VEED, 'www.veed.io', 'VEED source is first-party')
ok(!comparison.affiliateComparisonPrograms().includes('Pictory'), 'contradictory Pictory terms are not published as settled')

const page = read('app/partners/page.tsx')
ok(!page.includes('40% recurring is the highest rate we know'), 'false highest-rate claim is removed')
ok(!page.includes('Most AI video tools pay affiliates 20–30%'), 'unsourced market range is removed')
ok(page.includes('AFFILIATE_PROGRAM_COMPARISON.map'), 'public page renders the executed comparison')
ok(page.includes('placement="comparison"'), 'comparison CTA is separately measurable')
ok(page.includes('id="ai-video-affiliate-program-comparison"'), 'comparison has an indexable anchor')
ok(/id="affiliate-program-faq"[^]*Questions, answered/.test(page), 'FAQ anchor is attached to the FAQ section')
ok(!/id="affiliate-program-faq"[^]{0,180}How it works/.test(page), 'FAQ anchor does not point to the process section')
ok(!/id="affiliate-program-faq"[^]{0,180}A campaign kit/.test(page), 'FAQ anchor does not point to the campaign-kit section')
ok(page.includes('How does Kineo compare with other AI video affiliate programs?'), 'FAQ names the search intent')
ok(page.includes('Every competitor claim links to its official source'), 'comparison discloses its sourcing boundary')
ok(page.includes('competitor programs can change'), 'comparison discloses staleness risk')

const preview = read('docs/previews/AFFILIATE-PROGRAM-COMPARISON-2026-08-28.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label}`)
}
for (const section of ['Hero claim', 'Official comparison', 'FAQ answer']) {
  ok(preview.includes(section), `preview includes touched section: ${section}`)
}

console.log(`Affiliate program comparison: ${checks}/${checks} checks passed`)
