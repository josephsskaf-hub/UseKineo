import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { React, root, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

// Actual page and existing click handler; only unrelated client/network boundaries are mocked.
const path = 'app/ai-shorts-for-agencies/page.tsx'
const base = execFileSync('git', ['show', 'f834c583:' + path], { cwd: root, encoding: 'utf8' })
const events = []
const mocks = Object.fromEntries(['components/Footer.tsx', 'app/ai-shorts-for-agencies/AgencyHeaderCta.tsx', 'app/ai-shorts-for-agencies/AgencyMarginCalculator.tsx', 'app/ai-shorts-for-agencies/AgencyPacksClient.tsx', 'app/ai-shorts-for-agencies/AgencyBriefClient.tsx'].map(file => [file, { __esModule: true, default: props => React.createElement('div', { 'data-boundary': file, 'data-props': JSON.stringify(props) }) }]))
mocks['lib/analytics.ts'] = { trackEvent: (...args) => events.push(args) }
const before = offlineModules({ mocks, replacements: { [path]: base } })
const after = offlineModules({ mocks })
const tree = after(path).default()
const oldHtml = renderToStaticMarkup(before(path).default())
const html = renderToStaticMarkup(tree)
const row = /<p data-agency-monthly-plans="true"[^>]*>[\s\S]*?<\/p>/g
const rows = [...html.matchAll(row)]
assert.equal(rows.length, 1, 'exactly one monthly path')
assert.match(rows[0][0], /href="\/pricing"/)
assert.ok(html.indexOf('See one-time packs') < rows[0].index, 'existing pack CTA stays first')
assert.match(html, /href="#agency-pack-heading"/)
const question = 'Can I choose a monthly plan instead?'
const answer = 'Yes. Monthly subscriptions are available separately on the pricing page. Choose a plan for recurring production or a one-time pack for a fixed batch. Agency packs do not start a subscription.'
const jsonPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
const oldJson = JSON.parse(oldHtml.match(jsonPattern)[1])
const newJson = JSON.parse(html.match(jsonPattern)[1])
const faq = newJson.find(item => item['@type'] === 'FAQPage')
const added = faq.mainEntity.filter(item => item.name === question)
assert.equal(added.length, 1)
assert.equal(added[0].acceptedAnswer.text, answer)
faq.mainEntity = faq.mainEntity.filter(item => item.name !== question)
assert.deepEqual(newJson, oldJson, 'all offers and prior FAQ data unchanged')
const details = [...html.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/g)].filter(m => m[0].includes(question))
assert.equal(details.length, 1)
assert.ok(details[0][0].includes(answer), 'visible answer and JSON-LD agree')
assert.equal(html.replace(row, '').replace(details[0][0], '').replace(jsonPattern, ''), oldHtml.replace(jsonPattern, ''), 'entire page unchanged outside monthly path and its FAQ')
assert.deepEqual(JSON.parse(JSON.stringify(after(path).metadata)), JSON.parse(JSON.stringify(before(path).metadata)), 'canonical and pack metadata preserved')
const Organic = after('components/OrganicCtaLink.tsx').default
const links = []
function visit(value) { if (!value || typeof value !== 'object') return; if (Array.isArray(value)) return value.forEach(visit); if (value.type === Organic) links.push(value); visit(value.props?.children) }
visit(tree)
assert.equal(links.length, 1)
const link = Organic(links[0].props)
let prevented = false
link.props.onClick({ preventDefault() { prevented = true } })
assert.equal(link.props.href, '/pricing')
assert.equal(prevented, false, 'native direct navigation remains available')
assert.deepEqual(JSON.parse(JSON.stringify(events)), [['organic_cta_clicked', { source: 'ai_shorts_for_agencies', placement: 'hero_monthly_plans', destination: '/pricing' }]])
console.log('PASS: exact page scope, original pack order/data, canonical, visible/JSON-LD FAQ and existing direct-plan click event')
