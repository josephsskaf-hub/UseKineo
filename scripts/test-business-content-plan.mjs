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

function executeTs(file) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => { throw new Error(`unexpected import ${id}`) },
    URLSearchParams,
    Map,
    Set,
  }, { filename: file })
  return moduleBox.exports
}

const planner = executeTs('lib/growth/businessContentPlan.ts')

equal(planner.normalizeBusinessOffer('  an   invoicing app  '), 'an invoicing app', 'offer normalizes whitespace')
equal(planner.normalizeBusinessOffer('x'.repeat(200)).length, 140, 'offer has a hard length ceiling')
equal(planner.normalizeBusinessAudience('  remote   workers  '), 'remote workers', 'audience normalizes whitespace')
equal(planner.normalizeBusinessAudience('x'.repeat(150)).length, 100, 'audience has a hard length ceiling')

const base = { offer: 'an invoicing app for freelancers', audience: 'freelancers with late-paying clients', goal: 'leads' }
const three = planner.buildBusinessContentPlan({ ...base, cadence: 'three' })
const five = planner.buildBusinessContentPlan({ ...base, cadence: 'five' })
const seven = planner.buildBusinessContentPlan({ ...base, cadence: 'seven' })
equal(three.length, 3, 'three-video cadence yields exactly three ideas')
equal(five.length, 5, 'five-video cadence yields exactly five ideas')
equal(seven.length, 7, 'daily cadence yields exactly seven ideas')
equal(three.map((item) => item.day).join(','), 'Monday,Wednesday,Friday', 'three-video cadence uses an honest weekday schedule')
equal(five.map((item) => item.day).join(','), 'Monday,Tuesday,Wednesday,Thursday,Friday', 'five-video cadence stays on weekdays')
equal(seven[6].day, 'Sunday', 'daily cadence reaches Sunday')
equal(planner.buildBusinessContentPlan({ ...base, offer: 'short', cadence: 'five' }).length, 0, 'thin offer cannot create a plan')
check(!five.some((item) => /biggest an |one an /i.test(item.hook)), 'article-led offers do not create broken English hooks')

for (const goal of ['leads', 'explain', 'trust', 'launch']) {
  const plan = planner.buildBusinessContentPlan({ ...base, goal, cadence: 'seven' })
  equal(plan.length, 7, `${goal} has a complete weekly plan`)
  for (const item of plan) {
    check(item.hook.includes(base.offer), `${goal} keeps the supplied offer in each hook`)
    check(item.evidence.length > 18, `${goal} gives every idea an evidence boundary`)
    check(!/guaranteed|best in the world|double your|limited time/i.test(item.brief), `${goal} does not add an unsupported commercial promise`)
  }
}

equal(planner.businessCadenceDetails('three').fourWeekVideos, 12, 'three per week is labeled as a four-week target of 12')
equal(planner.businessCadenceDetails('five').fourWeekVideos, 20, 'five per week is labeled as a four-week target of 20')
equal(planner.businessCadenceDetails('seven').fourWeekVideos, 28, 'seven per week is labeled as a four-week target of 28')
equal(planner.recommendedBusinessPack('three'), 'bulk20', '12-video target maps to the smallest covering pack')
equal(planner.recommendedBusinessPack('five'), 'bulk20', '20-video target maps exactly to bulk20')
equal(planner.recommendedBusinessPack('seven'), 'bulk30', '28-video target maps to the smallest covering pack')

const activation = new URL(planner.buildBusinessPlanActivationHref({ ...base, firstItem: five[0] }), 'https://www.usekineo.com')
equal(activation.pathname, '/signup', 'first idea begins at signup')
equal(activation.searchParams.get('utm_source'), 'business_planner', 'signup source is exact')
equal(activation.searchParams.get('utm_medium'), 'organic', 'signup medium is organic')
equal(activation.searchParams.get('utm_campaign'), 'weekly_business_video_plan', 'campaign is exact')
const redirect = new URL(activation.searchParams.get('redirect'), 'https://www.usekineo.com')
equal(redirect.pathname, '/generate', 'first idea carries to the existing generator')
equal(redirect.searchParams.get('duration'), '35', 'first idea uses a supported duration')
equal(redirect.searchParams.get('autoanalyze'), '1', 'handoff analyzes without auto-rendering')
equal(redirect.searchParams.get('intent_campaign'), 'weekly_business_video_plan', 'creator keeps business-plan intent')
equal(redirect.searchParams.has('create_intent'), false, 'planner never auto-starts a render')
const prompt = redirect.searchParams.get('prompt')
check(prompt.includes('Business offer: an invoicing app for freelancers'), 'offer survives the handoff')
check(prompt.includes('Audience: freelancers with late-paying clients'), 'audience survives the handoff')
check(prompt.includes('Use only verified facts'), 'evidence boundary survives the handoff')

const sharedText = planner.businessContentPlanAsText({ ...base, cadence: 'five', items: five })
check(sharedText.startsWith('WEEKLY BUSINESS SHORTS PLAN'), 'copied artifact has a useful title')
check(sharedText.includes('Offer: an invoicing app for freelancers'), 'copied artifact keeps the supplied offer')
check(sharedText.includes('Audience: freelancers with late-paying clients'), 'copied artifact keeps the supplied audience')
check(sharedText.includes('Monday — Problem recognition'), 'copied artifact keeps the first scheduled angle')
check(sharedText.includes('Friday — Feature to use case'), 'copied five-day artifact keeps the final scheduled angle')
check(sharedText.includes('Evidence:'), 'copied artifact keeps evidence boundaries')
check(sharedText.includes('utm_source=business_plan_copy'), 'copied artifact has an attributable return path')
check(sharedText.includes('utm_medium=referral'), 'copied artifact labels the return as referral')
check(sharedText.includes('utm_campaign=weekly_business_video_plan_share_v1'), 'copied artifact carries the stable share version')
equal(planner.businessContentPlanAsText({ ...base, offer: 'short', cadence: 'five', items: five }), '', 'invalid plan cannot be copied')

const client = read('app/business-video-content-plan/BusinessContentPlanClient.tsx')
check(client.includes('buildBusinessContentPlan'), 'real client executes the pure planner')
check(client.includes('buildBusinessPlanActivationHref'), 'real CTA carries the first idea')
check(client.includes("agencyPacksHref('content_plan')"), 'real B2B CTA uses the allowlisted bridge')
check(client.includes('Four-week production target'), 'volume math is labeled as four-week, not monthly')
check(client.includes('does not research your claims, schedule posts, publish to social platforms or guarantee leads'), 'client states the planning boundary')
for (const eventName of [
  'business_content_plan_viewed',
  'business_content_plan_generated',
  'business_content_plan_copied',
  'business_content_plan_activation_clicked',
  'business_content_plan_packs_clicked',
]) check(client.includes(eventName), `client measures ${eventName}`)
check(client.includes('Copy plan for your team'), 'result exposes the shareable team artifact')
check(client.includes('navigator.clipboard.writeText(text)'), 'copy is an explicit local clipboard action')
const eventPayloads = [...client.matchAll(/trackEvent\('business_content_plan_[\s\S]*?\}\)/g)].map((match) => match[0])
equal(eventPayloads.length, 5, 'all five business-plan event payloads are inspectable')
for (const payload of eventPayloads) {
  check(!/(offer|audience|hook|brief|evidence)\s*[:,]/.test(payload), 'telemetry never receives business or plan text')
}
check(!client.includes('fetch('), 'planner runs without network or provider cost')
check(!client.toLowerCase().includes('supabase'), 'planner imports no Supabase client')

const page = read('app/business-video-content-plan/page.tsx')
check(page.includes("canonical: CANONICAL"), 'page publishes its canonical URL')
check(page.includes("'SoftwareApplication'"), 'page declares the free tool')
check(page.includes("'FAQPage'"), 'page publishes scheduling and research boundaries')
check(page.includes('this planner does not schedule or publish posts'), 'structured data refuses a competitor capability Kineo lacks')
check(page.includes('<Footer showStats={false} />'), 'incident-safe page disables the live database-backed footer badge')

const agencyPage = read('app/ai-shorts-for-agencies/page.tsx')
check(agencyPage.includes('href="/business-video-content-plan"'), 'live B2B page links to the planner')
check(agencyPage.includes('Plan the week free'), 'B2B hero names the free action')
const sitemap = read('app/sitemap.ts')
check(sitemap.includes("{ path: '/business-video-content-plan', priority: 0.8, freq: 'weekly' }"), 'planner is in the sitemap')
const footer = read('components/Footer.tsx')
check(footer.includes("{ href: '/business-video-content-plan', label: 'Business video content planner' }"), 'planner is linked globally')
const facts = read('lib/kineoFacts.ts')
check(facts.includes("url: `${BASE}/business-video-content-plan`"), 'answer-engine facts derive the planner')
check(facts.includes('It does not research claims, schedule posts, publish content or render a video.'), 'facts state every product boundary')
const llms = read('app/llms.txt/route.ts')
check(llms.includes('[Free business video content planner]'), 'llms text exposes the new B2B entry')

const preview = read('docs/previews/BUSINESS-VIDEO-CONTENT-PLAN-2026-08-28.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(preview.includes('quso.ai official product page · read 28 Aug 2026'), 'preview records dated planner evidence')
check(preview.includes('HeyGen official marketing page · read 28 Aug 2026'), 'preview records dated business-use-case evidence')
check(preview.includes('zero Supabase reads or writes'), 'preview records the incident boundary')

console.log(`PASS — ${checks}/${checks} business content plan checks`)
