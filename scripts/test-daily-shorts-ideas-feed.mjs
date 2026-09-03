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

const feed = loadTs('lib/growth/dailyShortIdeas.ts')
const remix = loadTs('lib/publicVideoRemix.ts')
const widget = read('app/widget/embed/page.tsx')
const route = read('app/shorts-ideas.xml/route.ts')
const layout = read('app/layout.tsx')
const sourceCapture = read('components/SourceCapture.tsx')
const freeScriptPage = read('app/free-script-generator/page.tsx')
const freeScriptClient = read('app/free-script-generator/FreeScriptClient.tsx')

equal(feed.DAILY_SHORT_IDEAS.length, 30, 'existing thirty-idea inventory is preserved')
equal(new Set(feed.DAILY_SHORT_IDEAS).size, 30, 'idea inventory has no duplicates')
equal(feed.DAILY_SHORT_IDEAS_FEED_ITEM_COUNT, 7, 'feed exposes one rolling week')
equal(feed.DAILY_SHORT_IDEAS_GATE.minimumLandingSessions, 20, 'gate requires twenty landing sessions')
equal(feed.DAILY_SHORT_IDEAS_GATE.minimumExternalPeople, 20, 'gate requires twenty resolved external people')
equal(feed.DAILY_SHORT_IDEAS_GATE.minimumTerminalCheckoutPeople, 5, 'gate requires five people with a terminal Checkout Session')
ok(feed.DAILY_SHORT_IDEAS_MEASUREMENT_NOTE.includes('sessions, not people'), 'measurement contract separates sessions from people')
ok(feed.DAILY_SHORT_IDEAS_MEASUREMENT_NOTE.includes('same canonical Stripe Session'), 'measurement contract requires one payment Session')
equal(feed.DAILY_SHORT_IDEAS_FEED_PATH, '/shorts-ideas.xml', 'feed path is stable')
equal(feed.DAILY_SHORT_IDEAS_LANDING_PATH, '/free-script-generator', 'every item lands on a useful free tool')

const jan1 = feed.dailyShortIdeaForDate(new Date('2026-01-01T23:59:59-11:00'))
equal(jan1.date, '2026-01-02', 'selector uses the UTC calendar day')
equal(jan1.index, 2, 'selector preserves day-of-year modulo behavior')
equal(jan1.idea, feed.DAILY_SHORT_IDEAS[2], 'selector returns the canonical inventory entry')
assert.throws(() => feed.dailyShortIdeaForDate(new Date('invalid')), /valid date/); checks += 1

const history = feed.recentDailyShortIdeas(new Date('2026-09-03T22:00:00Z'))
equal(history.length, 7, 'history contains seven daily entries')
equal(history[0].date, '2026-09-03', 'newest item is today UTC')
equal(history[6].date, '2026-08-28', 'oldest item is six days earlier')
equal(new Set(history.map((item) => item.date)).size, 7, 'item dates are unique')
equal(new Set(history.map((item) => item.index)).size, 7, 'rolling week does not duplicate an idea')
const yearBoundary = feed.recentDailyShortIdeas(new Date('2027-01-01T12:00:00Z'))
equal(new Set(yearBoundary.map((item) => item.index)).size, 7, 'rotation stays unique across the year boundary')
equal(feed.dailyShortIdeaForDate(new Date('2026-09-03T12:00:00Z')).index, 6, 'continuous selector preserves the 2026 widget schedule')
assert.throws(() => feed.recentDailyShortIdeas(new Date(), 0), /count must/); checks += 1
assert.throws(() => feed.recentDailyShortIdeas(new Date(), 31), /count must/); checks += 1

for (const item of history) {
  const url = new URL(feed.buildDailyShortIdeaLandingUrl(item))
  equal(url.origin, 'https://www.usekineo.com', `${item.date}: canonical production host`)
  equal(url.pathname, '/free-script-generator', `${item.date}: useful destination`)
  equal(url.searchParams.get('topic'), item.idea, `${item.date}: exact idea is prefilled`)
  equal(url.searchParams.get('utm_source'), 'kineo_daily_feed', `${item.date}: source is closed`)
  equal(url.searchParams.get('utm_medium'), 'rss', `${item.date}: medium is closed`)
  equal(url.searchParams.get('utm_campaign'), feed.DAILY_SHORT_IDEAS_FEED_VERSION, `${item.date}: campaign is versioned`)
  equal(url.searchParams.get('utm_content'), item.date, `${item.date}: content is bounded to the UTC date`)
  equal([...url.searchParams.keys()].length, 5, `${item.date}: URL has no unbounded fields`)
  ok(item.idea.length <= 160, `${item.date}: idea fits the destination sanitizer bound`)
  equal(remix.sanitizePublicVideoRemixTopic(url.searchParams.get('topic')), item.idea, `${item.date}: page sanitizer preserves the prefill exactly`)
}

for (const idea of feed.DAILY_SHORT_IDEAS) {
  ok(idea.length <= 160, 'every canonical idea fits the destination sanitizer')
  equal(remix.sanitizePublicVideoRemixTopic(idea), idea, 'every canonical idea survives the destination sanitizer byte-for-byte')
}

const xml = feed.buildDailyShortIdeasRss(new Date('2026-09-03T22:00:00Z'))
ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'document declares UTF-8 XML')
equal((xml.match(/<item>/g) ?? []).length, 7, 'RSS contains seven items')
equal((xml.match(/<guid isPermaLink="false">/g) ?? []).length, 7, 'every item has a non-URL stable guid')
equal((xml.match(/<pubDate>/g) ?? []).length, 7, 'every item has a publication date')
equal((xml.match(/utm_source=kineo_daily_feed/g) ?? []).length, 7, 'every link carries the closed source')
equal((xml.match(/utm_campaign=daily_shorts_ideas_v1/g) ?? []).length, 7, 'every link carries the experiment version')
ok(xml.includes('xmlns:atom="http://www.w3.org/2005/Atom"'), 'RSS declares the atom namespace')
ok(xml.includes('rel="self" type="application/rss+xml"'), 'RSS advertises its canonical self URL')
ok(xml.includes('research prompt every day'), 'feed never presents unsourced hooks as verified scripts')
equal((xml.match(/verify every factual claim before publishing/gi) ?? []).length, 8, 'channel and all seven items carry the fact-check boundary')
ok(!xml.match(/&(?!amp;|lt;|gt;|quot;|apos;)/), 'XML contains no unescaped ampersand')
ok(!xml.includes('<script'), 'feed contains no executable markup')
ok(!xml.includes('email') && !xml.includes('user_id') && !xml.includes('session_id'), 'feed contains no identity fields')

ok(widget.includes("import { dailyShortIdeaForDate } from '@/lib/growth/dailyShortIdeas'"), 'widget imports the shared selector')
ok(widget.includes('const { idea } = dailyShortIdeaForDate()'), 'widget uses the shared daily idea')
ok(!widget.includes('const IDEAS'), 'widget no longer owns a divergent idea list')
ok(!widget.includes('dayOfYear %'), 'widget no longer owns a divergent selector')
ok(widget.includes('research prompt every day'), 'widget metadata does not present unsourced hooks as finished research')
ok(widget.includes('Verify factual claims before publishing'), 'widget metadata carries the same factuality boundary as the feed')
ok(route.includes('buildDailyShortIdeasRss()'), 'route serves the executed RSS builder')
ok(route.includes("'Content-Type': 'application/rss+xml; charset=utf-8'"), 'route declares the RSS content type')
ok(route.includes("'X-Content-Type-Options': 'nosniff'"), 'route disables MIME sniffing')
ok(route.includes("'Cache-Control': 'public, s-maxage=3600, must-revalidate'"), 'route revalidates synchronously after the one-hour TTL')
ok(!route.includes('stale-while-revalidate'), 'daily readers cannot be served a perpetually stale edition')
ok(route.includes("export const dynamic = 'force-dynamic'"), 'Next full-route cache is disabled for the daily contract')
ok(route.includes('export const revalidate = 0'), 'Next ISR cannot serve yesterday while revalidating')
ok(!route.includes('trackEvent') && !route.includes('trackClosedEvent'), 'feed fetches never masquerade as people')
ok(layout.includes('rel="alternate"') && layout.includes('href="/shorts-ideas.xml"'), 'root head advertises feed discovery')
equal((layout.match(/href="\/shorts-ideas\.xml"/g) ?? []).length, 1, 'feed discovery link is unique')
ok(sourceCapture.includes("trackEvent('landing_session_started'"), 'landing arrivals enter the existing session diagnostic')
ok(freeScriptPage.includes('sanitizePublicVideoRemixTopic(first(searchParams?.topic))'), 'destination page sanitizes the topic parameter')
ok(freeScriptPage.includes('initialTopic={initialTopic}'), 'destination page passes the sanitized topic to the client')
ok(freeScriptClient.includes('const [topic, setTopic] = useState(initialTopic)'), 'destination textarea initializes from the feed topic')
ok(freeScriptClient.includes('value={topic}'), 'the initialized topic is the visible controlled textarea value')

console.log(`daily shorts ideas feed: ${checks}/${checks}`)
