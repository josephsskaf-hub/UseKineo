import assert from 'node:assert/strict'
import { React, offlineModules, renderToStaticMarkup, source } from './gpt24h-offline-support.mjs'
import { moduleAt } from './gpt-5h-test-support.mjs'

// Exercise the public cost page and FAQ with real pricing modules. No network or credentials.
globalThis.fetch = () => { throw new Error('Network forbidden in cost regression test') }
const mocks = {
  'lib/kineoFacts.ts': await moduleAt('lib/kineoFacts.ts'),
  'components/OrganicCtaLink.tsx': {
    __esModule: true,
    default: ({ children, source, placement, ...props }) => React.createElement('a', props, children),
  },
}
const load = offlineModules({ mocks })
const page = load('app/ai-video-generator/complete-60-second-shorts-cost/page.tsx')
const html = renderToStaticMarkup(React.createElement(page.default))
const marketing = load('lib/marketingPrice.ts')
const credits = marketing.creditsPerReferenceVideo('cinematic_ai')
const fastCredits = marketing.creditsPerReferenceVideo('fast')
const filmName = load('lib/growth/citationAnswers.ts').CITATION_COST_ENGINE_NAME
const faq = JSON.parse([...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)][0][1])

assert.equal(page.metadata.alternates.canonical, 'https://www.usekineo.com/ai-video-generator/complete-60-second-shorts-cost')
assert.match(html, new RegExp(`<h3[^>]*>${filmName}</h3>`))
assert.ok(html.includes(`Reserve ${credits} credits`))
assert.ok(!html.includes(`Reserve ${fastCredits} credits`))
assert.ok(html.includes(marketing.STARTER_MONTH))
assert.ok(html.includes(marketing.formatUsd(marketing.costPerFilmUsd('starter', 'cinematic_ai'))))
assert.ok(faq.mainEntity.some(item => item.acceptedAnswer.text.includes(`${credits} credits`) && item.acceptedAnswer.text.includes(filmName)))
assert.ok(faq.mainEntity.every(item => html.includes(item.name)))
assert.doesNotMatch(html, /two examples|Choose either example|two film counts|measured a|minute median|5–7 minutes|\[CONFIRMAR\]/)
assert.match(html, /Seedance 1\.5 Pro can supply text-to-video fallback scenes/)
assert.match(html, /id="standard-film-limits"/)
assert.match(html, /Review current engines and credit costs/)
assert.match(html, /citacoes_01_cost/)
assert.match(html, /citacoes_cost_decision_v1/)
const modelsHtml = renderToStaticMarkup(React.createElement(load('app/models-pricing/page.tsx').default))
assert.match(modelsHtml, /<a href="\/ai-video-generator\/seedance"[^>]*>MiniMax H3 Turbo<\/a>/)

// A caller without cost-specific notes keeps its existing shared-template output.
const answers = load('lib/growth/citationAnswers.ts')
const shared = load('components/CitationAnswerPage.tsx').default
const otherHtml = renderToStaticMarkup(React.createElement(shared, { answer: answers.CITATION_ANSWERS.script }))
assert.ok(otherHtml.includes(answers.CITATION_TIME))
assert.match(otherHtml, /Seedance 1\.5 reference videos/)
assert.match(otherHtml, /\[CONFIRMAR\]/)

const launchPath = 'lib/engineLaunch.ts'
const rollbackLoad = offlineModules({ mocks, replacements: {
  [launchPath]: source(launchPath).replace('H3_TURBO_PUBLIC = true', 'H3_TURBO_PUBLIC = false'),
} })
const rollbackPage = rollbackLoad('app/ai-video-generator/complete-60-second-shorts-cost/page.tsx')
const rollbackHtml = renderToStaticMarkup(React.createElement(rollbackPage.default))
assert.match(rollbackHtml, /<h3[^>]*>Seedance 1\.5<\/h3>/)
assert.doesNotMatch(rollbackHtml, /MiniMax H3 Turbo|text-to-video fallback scenes|\[CONFIRMAR\]|minute median/)
assert.ok(rollbackHtml.includes(`Reserve ${credits} credits`))
const rollbackFaq = JSON.parse([...rollbackHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)][0][1])
assert.ok(rollbackFaq.mainEntity.some(item => item.name.includes('Seedance 1.5') && item.acceptedAnswer.text.includes(`${credits} credits`)))
console.log('PASS current film cost, rollback, fallback limits, canonical attribution, FAQ and other guide defaults; offline only.')
