import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { React, root, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

// Actual page and existing click handler; only unrelated client/network boundaries are mocked.
const path = 'app/ai-shorts-for-agencies/page.tsx'
const base = execFileSync('git', ['show', 'f834c583:' + path], { cwd: root, encoding: 'utf8' })
const events = []
const mocks = Object.fromEntries(['components/Footer.tsx', 'app/ai-shorts-for-agencies/AgencyHeaderCta.tsx', 'app/ai-shorts-for-agencies/AgencyMarginCalculator.tsx', 'app/ai-shorts-for-agencies/AgencyPacksClient.tsx', 'app/ai-shorts-for-agencies/AgencyBriefClient.tsx'].map(file => [file, { __esModule: true, default: props => React.createElement('div', { 'data-boundary': file, 'data-props': JSON.stringify(props) }) }]))
mocks['lib/analytics.ts'] = { trackEvent: (...args) => events.push(args) }
// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — reancorado com motivo: com os pacotes avulsos fora da vitrine (lib/bulkPacksPublic.ts,
// BULK_PACKS_PUBLIC=false) esta página redireciona para /business. A trava abaixo continua provando a página COMO ELA VOLTA
// quando o interruptor for religado (mock só do interruptor); e o fim deste arquivo prova o redirecionamento com o valor real.
const realAfter = offlineModules({ mocks: { ...mocks } })
mocks['lib/bulkPacksPublic.ts'] = { BULK_PACKS_PUBLIC: true, BULK_PACK_REPLACEMENT_PATH: '/business' }
const before = offlineModules({ mocks, replacements: { [path]: base } })
const after = offlineModules({ mocks })
const tree = after(path).default()
const oldHtml = renderToStaticMarkup(before(path).default())
// KINEO-COPY-EQUIPE-1610 — reancorado com motivo: a página negava equipe para a Kineo inteira, mas o Business inclui
// BUSINESS_SEATS colegas no Studio Ads (lib/ads/team.ts). Só estas 4 frases podem mudar, exatamente para o texto abaixo; cada
// uma precisa APARECER na página nova (prova de que a troca aconteceu) e é desfeita antes da comparação com o f834c583, que
// continua congelando todo o resto byte a byte. O número de vagas é lido de lib/ads/team.ts, nunca digitado aqui.
const seats = Number(fs.readFileSync(root + '/lib/ads/team.ts', 'utf8').match(/^export const BUSINESS_SEATS = ([0-9]+)(?![0-9])/m)?.[1])
assert.ok(Number.isInteger(seats) && seats > 0, 'seat count read from lib/ads/team.ts')
const TEAM_COPY_1610 = [
  ['Do agency packs include team seats, client approval portals or white-label software?', 'Does Kineo include team seats, client approval portals or white-label software?'],
  [`No. These are self-service production packs for one Kineo account. You receive clean MP4 files that you can deliver under your own service, but Kineo is not a white-label client portal. Team seats exist only on the Kineo Business plan: ${seats} teammates included for Studio Ads product ads, each signing in with their own Kineo account and using the owner's credits.`, 'No. These are self-service production packs for one Kineo account. You receive clean MP4 files that you can deliver under your own service, but Kineo is not a multi-seat or white-label client portal.'],
  [`You can sell and deliver the finished videos. Agency packs do not include team seats, separate client workspaces, approval routing or a white-label portal. One account owns the balance and the library. If teammates need their own logins, the Kineo Business plan includes ${seats} for Studio Ads product ads.`, 'You can sell and deliver the finished videos. Kineo does not currently include team seats, separate client workspaces, approval routing or a white-label portal. One account owns the balance and the library.'],
  ['several teammates need separate logins to make Shorts (Business team seats cover Studio Ads only);', 'several teammates need separate logins;'],
]
const escHtml = (t) => t.split("'").join('&#x27;')
const htmlNew = renderToStaticMarkup(tree)
let html = htmlNew
for (const [now, was] of TEAM_COPY_1610) {
  assert.ok(htmlNew.includes(now) || htmlNew.includes(escHtml(now)), 'team copy 1610 present: ' + now.slice(0, 60))
  html = html.split(escHtml(now)).join(escHtml(was)).split(now).join(was)
  assert.ok(!html.includes(now) && !html.includes(escHtml(now)), 'team copy 1610 fully reverted for the freeze: ' + now.slice(0, 60))
}
assert.ok(!htmlNew.includes('Kineo does not currently include team seats') && !htmlNew.includes('multi-seat'), 'the old whole-Kineo denial is gone from the live page')
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
// 29/09: Joseph requested the canonical Light/Dark palette for this page.
// Compare all content/attributes, excluding only presentation approved for this
// correction. The separate appearance guard freezes all five component ASTs.
const content = value => value.replace(/ style="[^"]*"/g, '').replace(/ class="agency-page"/g, '').replace(/<style>[\s\S]*?<\/style>/g, '')
assert.equal(content(html.replace(row, '').replace(details[0][0], '').replace(jsonPattern, '')), content(oldHtml.replace(jsonPattern, '')), 'entire page content unchanged outside monthly path and its FAQ')
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

// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — com o interruptor REAL (desligado), a página leva ao plano Business.
assert.throws(() => realAfter(path).default(), /NEXT_REDIRECT:\/business\?from=agencies#plan/, 'pacotes fechados: a página redireciona para o Business')
