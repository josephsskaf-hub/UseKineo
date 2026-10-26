#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = (file) => fs.readFileSync(file, 'utf8')
let checks = 0
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }
const check = (value, message) => { assert.ok(value, message); checks++ }

const compiled = ts.transpileModule(read('lib/growth/historyMilestone.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(compiled, {
  module: moduleBox,
  exports: moduleBox.exports,
  require(id) { throw new Error(`unexpected import ${id}`) },
  Number,
})

const { resolveHistoryMilestoneMode } = moduleBox.exports
const mode = (completedVideoCount, subscriptionOfferEligible) => resolveHistoryMilestoneMode({
  completedVideoCount,
  subscriptionOfferEligible,
})

equal(mode(0, false), null, 'no completed video has no milestone')
equal(mode(0, true), null, 'eligibility cannot monetize before delivered value')
equal(mode(-1, true), null, 'negative count fails closed')
equal(mode(1.5, true), null, 'fractional count fails closed')
equal(mode(Number.NaN, true), null, 'NaN count fails closed')
equal(mode(1, true), 'episode_primary', 'one-video free creator gets episode two first')
equal(mode(2, true), 'subscription_primary', 'two-video free creator gets Starter first')
equal(mode(9, true), 'subscription_primary', 'repeat free creator keeps Starter first')
equal(mode(1, false), 'episode_only', 'one-video subscriber gets only episode continuation')
equal(mode(2, false), 'episode_only', 'repeat subscriber gets only episode continuation')

const source = read('app/(dashboard)/history/HistoryClient.tsx')
check(source.includes("import { resolveHistoryMilestoneMode } from '@/lib/growth/historyMilestone'"), 'real history imports executable policy')
check(source.includes('const milestoneMode = resolveHistoryMilestoneMode({'), 'real history executes policy')
check(source.includes("const subscriptionIsPrimary = milestoneMode === 'subscription_primary'"), 'subscription hierarchy derives from policy')
check(source.includes("milestoneMode === 'episode_primary' || milestoneMode === 'episode_only'"), 'episode hierarchy derives from policy')

// Library embedding added a visibility guard and moved sharing tools. Isolate
// the actual milestone section rather than spanning unrelated later sections.
const ast = ts.createSourceFile('HistoryClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const cards = []
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'section' &&
      node.openingElement.attributes.properties.some(property => ts.isJsxAttribute(property) && property.name.getText(ast) === 'aria-label' &&
        property.initializer?.getText(ast).includes("'Create your second Short'"))) cards.push(node)
  ts.forEachChild(node, visit)
}
visit(ast)
equal(cards.length, 1, 'exactly one real milestone section exists')
const card = cards[0].getText(ast)
check(card.length > 0, 'real milestone card is found')
check(source.includes('{!embedded && completedVideos.length >= 1 && ('), 'milestone remains gated on delivered value outside the embedded Library')
check(card.includes("'First Short complete · build momentum'"), 'first-video copy names momentum')
check(card.includes("'Turn your first Short into episode 2'"), 'first-video heading names episode two')
check(card.includes('Build Episode 2 →'), 'episode-two primary CTA is explicit')
check(card.includes("completedVideos.length === 1 ? 'Build Episode 2 →' : 'Build Next Episode →'"), 'subscriber with a back catalogue is not mislabeled as episode two')
check(card.includes("'Create your next episode'"), 'repeat subscriber receives an accurate accessible label')
check(card.includes('Prefer clean exports now? Starter includes'), 'Starter remains visible after one video')
check(card.includes('`See Starter · ${STARTER_PRICE_USD}/month`'), 'secondary Starter CTA remains actionable')
check(card.includes('`Continue with Starter · ${STARTER_PRICE_USD} →`'), 'repeat creator retains primary Starter CTA')
check(card.includes('Build Next Episode First'), 'repeat creator retains secondary continuation')

const episodePrimary = card.indexOf('{episodeIsPrimary && (')
const starterButton = card.indexOf('{showSubscriptionOffer && (', episodePrimary)
const repeatEpisode = card.indexOf('{subscriptionIsPrimary && (', starterButton)
check(episodePrimary >= 0 && starterButton > episodePrimary, 'episode CTA renders before Starter in one-video mode')
check(repeatEpisode > starterButton, 'episode CTA renders after Starter in repeat mode')
check(card.includes("trackEvent('series_continue_clicked'"), 'existing continuation event is preserved')
check(source.includes("'history_first_video_offer_clicked'"), 'existing first-video checkout event is preserved')
check(source.includes("'history_repeat_offer_clicked'"), 'existing repeat checkout event is preserved')
check(card.includes('role="alert"'), 'checkout failure remains visible in both hierarchies')
check(card.includes('TIER_CREDITS.starter'), 'credit copy stays canonical')
check(card.includes('STARTER_PRICE_USD'), 'price copy stays canonical')
check(!/\$\s*\d/.test(card), 'card adds no literal dollar price')
check(!card.includes('/api/generate-video'), 'card adds no render endpoint')
check(!read('lib/growth/historyMilestone.ts').toLowerCase().includes('supabase'), 'policy has no Supabase dependency')
check(!read('lib/growth/historyMilestone.ts').includes('/api/'), 'policy has no API dependency')

const visualPath = 'docs/previews/HISTORY-SECOND-VIDEO-MILESTONE-2026-08-28.html'
check(fs.existsSync(visualPath), 'self-contained comparison exists')
const visual = read(visualPath)
for (const label of ['BEFORE', 'AFTER', 'DESKTOP', 'MOBILE', 'FIRST SHORT', 'EPISODE 2']) {
  check(visual.includes(label), `visual includes ${label.toLowerCase()}`)
}
check(!/https?:\/\//i.test(visual), 'visual comparison has no external dependency')

console.log(`PASS — ${checks}/${checks} history second-video milestone checks`)
