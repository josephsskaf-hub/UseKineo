#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks += 1 }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1 }

function executeTs(file) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(output, { module: moduleBox, exports: moduleBox.exports, require() { throw new Error('unexpected import') }, URL })
  return moduleBox.exports
}

const helper = executeTs('lib/growth/viralScoreShare.ts')
const asset = helper.buildViralScoreShareAsset({
  overall: 82,
  hook: 9,
  trend: 7,
  retention: 8,
  share: 8,
  idea: 'TOP SECRET CUSTOMER IDEA',
  verdict: 'private model text',
  tips: ['private tip'],
})

equal(asset.title, 'My Kineo Viral Score', 'share title is fixed')
equal(
  asset.text,
  'My Shorts idea scored 82/100 on Kineo. Hook 9/10 · Trend 7/10 · Retention 8/10 · Shareability 8/10. Can yours beat it?',
  'scorecard is deterministic',
)
for (const secret of ['TOP SECRET CUSTOMER IDEA', 'private model text', 'private tip']) {
  check(!JSON.stringify(asset).includes(secret), `share asset excludes ${secret}`)
}
const url = new URL(asset.url)
equal(url.origin, 'https://www.usekineo.com', 'share uses canonical production host')
equal(url.pathname, '/viral-score', 'share returns to the same free tool')
equal(url.searchParams.get('utm_source'), 'viral_score_result', 'source is closed')
equal(url.searchParams.get('utm_medium'), 'referral', 'medium is closed')
equal(url.searchParams.get('utm_campaign'), 'viral_score_scorecard_share_v1', 'campaign is closed')
equal([...url.searchParams.keys()].sort().join(','), 'utm_campaign,utm_medium,utm_source', 'share URL has no free-form query')
check(asset.clipboardText.endsWith(asset.url), 'clipboard payload ends with the attributed URL')

for (const [raw, expected] of [[-4, 0], [0, 0], [19, 10], [82, 80], [100, 100], [120, 100], [Number.NaN, 0]]) {
  equal(helper.viralScoreShareScoreBand(raw), expected, `score band closes ${raw}`)
}

const bounded = helper.buildViralScoreShareAsset({
  overall: 140.4,
  hook: -2,
  trend: 7.6,
  retention: Number.NaN,
  share: 99,
})
check(bounded.text.includes('100/100'), 'overall is bounded')
check(bounded.text.includes('Hook 0/10'), 'hook is bounded')
check(bounded.text.includes('Trend 8/10'), 'trend is rounded')
check(bounded.text.includes('Retention 0/10'), 'non-finite score fails closed')
check(bounded.text.includes('Shareability 10/10'), 'shareability is bounded')

for (const method of ['native', 'clipboard']) {
  const metadata = helper.viralScoreShareEventMetadata(method, 82)
  equal(metadata.variant, 'viral_score_scorecard_share_v1', `${method} metadata is versioned`)
  equal(metadata.method, method, `${method} metadata has closed method`)
  equal(metadata.score_band, 80, `${method} metadata has a closed band`)
  equal(Object.keys(metadata).sort().join(','), 'method,score_band,variant', `${method} metadata contains no free text`)
}

{
  const calls = []
  const outcome = await helper.requestViralScoreShare(asset, {
    share: async (payload) => { calls.push(payload) },
    clipboard: { writeText: async () => { throw new Error('must not run') } },
  })
  equal(outcome, 'native', 'native share is preferred')
  equal(calls.length, 1, 'native share is called once')
  equal(calls[0].text, asset.text, 'native share receives only the closed scorecard')
  equal(calls[0].url, asset.url, 'native share receives the attributed URL separately')
}

{
  let clipboardValue = null
  const outcome = await helper.requestViralScoreShare(asset, {
    share: async () => { const error = new Error('cancel'); error.name = 'AbortError'; throw error },
    clipboard: { writeText: async (value) => { clipboardValue = value } },
  })
  equal(outcome, 'cancelled', 'cancelled native share never falls through to clipboard')
  equal(clipboardValue, null, 'cancel never creates an unexpected clipboard side effect')
}

{
  let clipboardValue = null
  const outcome = await helper.requestViralScoreShare(asset, {
    share: async () => { throw new Error('share unavailable') },
    clipboard: { writeText: async (value) => { clipboardValue = value } },
  })
  equal(outcome, 'clipboard', 'native failure falls back to clipboard')
  equal(clipboardValue, asset.clipboardText, 'clipboard receives the closed payload')
}

equal(
  await helper.requestViralScoreShare(asset, {
    clipboard: { writeText: async () => { throw new Error('denied') } },
  }),
  'manual',
  'clipboard denial exposes manual selection',
)
equal(await helper.requestViralScoreShare(asset, {}), 'manual', 'missing browser transports expose manual selection')

const page = read('app/viral-score/ViralScoreClient.tsx')
const preview = read('docs/previews/VIRAL-SCORE-SHARE-V1-2026-09-03.html')
check(page.includes("'viral_score_scorecard_share_requested'"), 'result emits a dedicated share-request event')
check(page.includes('trackClosedEvent('), 'share event cannot inherit free-form UTM metadata')
check(page.includes('const outcome = await requestViralScoreShare(asset, navigator)'), 'component waits for the tested transport result')
check(page.includes("if (outcome === 'native' || outcome === 'clipboard')"), 'only confirmed transports emit success')
check(page.indexOf('await requestViralScoreShare') < page.indexOf("'viral_score_scorecard_share_requested'"), 'event happens after transport completion')
check(page.includes('shareInFlight.current'), 'same-tick duplicate shares are blocked')
check(page.includes('shareVersion.current += 1'), 'a new score invalidates an older pending share outcome')
check(page.includes('manualShareRef.current?.focus()'), 'manual fallback receives focus')
check(page.includes('role="status"'), 'share outcome has an explicit live status')
check(page.includes("Sharing isn't available here. Copy the scorecard below."), 'manual fallback is announced honestly')
check(page.includes('Your score only — your idea and tips stay private.'), 'privacy boundary is visible')
check(page.includes('Select and copy your scorecard'), 'clipboard denial has a manual fallback')
check(page.includes('✓ Share opened'), 'native success copy is factual')
check(page.includes('✓ Scorecard copied'), 'clipboard success copy is factual')
const shareEventBlock = page.match(/trackClosedEvent\(\s*'viral_score_scorecard_share_requested'[\s\S]{0,180}?\)/)?.[0] ?? ''
check(Boolean(shareEventBlock), 'dedicated event call is present')
check(!/(idea|verdict|tips)\s*:/i.test(shareEventBlock), 'share telemetry contains no customer or model text')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}
for (const label of ['MANUAL FALLBACK · DESKTOP', 'MANUAL FALLBACK · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(preview.includes('<button>Share my score</button>'), 'preview uses the exact new button copy')
check(preview.includes('Your score only — your idea and tips stay private.'), 'preview uses the exact privacy copy')
check(preview.includes('<textarea readonly rows="4">'), 'preview renders the manual copy field')
check(preview.includes('document.querySelectorAll(\'.before-slot,.after-slot\')'), 'before and after share the same result fixture')
check(!/<link\b|<script[^>]+src\s*=|<(?:img|iframe)[^>]+src\s*=|href\s*=/i.test(preview), 'preview is self-contained and performs no network request')
check(!preview.includes('@media(max-width:420px)'), 'mobile preview does not invent a product breakpoint')
for (const exactGeometry of ['.top{display:flex;align-items:center;gap:18px}', '.dial{width:104px;height:104px', '.verdict{color:#57b0ff;font-size:22px']) {
  check(preview.includes(exactGeometry), `mobile fixture preserves product geometry: ${exactGeometry}`)
}

console.log(`PASS — ${checks}/${checks} Viral Score share checks`)
