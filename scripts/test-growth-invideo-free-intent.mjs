import assert from 'node:assert/strict'
import fs from 'node:fs'

const page = fs.readFileSync('app/alternatives/[competitor]/page.tsx', 'utf8')
const preview = fs.readFileSync('docs/previews/invideo-free-intent-2026-08-28.html', 'utf8')

let checks = 0
function check(value, message) {
  assert.ok(value, message)
  checks += 1
}

// Search Console, read on 2026-08-28: /alternatives/invideo grew from 6 to
// 61 weekly impressions, with exact rows for “invideo ai alternative free”
// and “invideo alternative free”, but still had zero clicks. The product must
// answer that intent in the title, H1, body and FAQ — not only in metadata.
check(page.includes("? 'Free InVideo AI Alternative for Faceless Shorts — Kineo'"), 'metadata answers free InVideo intent')
check(page.includes("h1: 'A Free InVideo AI Alternative for Faceless Shorts'"), 'visible H1 answers free InVideo intent')
check(page.includes('Is there a free InVideo AI alternative?'), 'exact question is answered in visible body and FAQ')
check(page.includes('Free InVideo AI alternative'), 'hero badge carries the free intent')

// Competitor facts must remain dated and traceable to current first-party
// sources. No competitor dollar amount is frozen into Kineo code.
check(page.includes("const INVIDEO_FACTS_CHECKED = 'August 28, 2026'"), 'fact-check date is explicit')
check(page.includes('https://help.invideo.io/en/articles/9380226-can-i-use-invideo-ai-for-free'), 'official free-plan source is linked')
check(page.includes("const INVIDEO_PRICING_SOURCE = 'https://invideo.io/pricing/'"), 'official pricing source is linked')
check(page.includes('limited credits that reset weekly'), 'current official free-plan contract is stated')
const invideoStart = page.indexOf('  invideo: {')
const invideoEnd = page.indexOf('\n  submagic:', invideoStart)
const invideoBlock = page.slice(invideoStart, invideoEnd)
check(!/InVideo[^\n]{0,80}\$\d/i.test(invideoBlock), 'no competitor dollar price is hardcoded')

// Kineo price and free allowance stay on canonical sources. The new section
// must work whether the reverse-trial flag is on or off.
check(page.includes("import { getFreeTierOffer, swapFreeTierCopy as ft, TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'"), 'free offer is canonical')
check(page.includes("import { STARTER_MO, STARTER_MONTH } from '@/lib/marketingPrice'"), 'paid price is canonical')
check(invideoBlock.includes('ft(OFFER,'), 'InVideo record swaps with the deployed free-tier flag')
check(page.includes('{OFFER.copy.sentence}'), 'visible answer reads the deployed offer')
check(!invideoBlock.includes('$7'), 'InVideo record freezes no Kineo price literal')

// Conversion is attributable and safe: the CTA opens the blank studio signup
// handoff. It does not create a render intent or spend a credit from the page.
check(page.includes("const INVIDEO_INTENT_CAMPAIGN = 'growth_invideo_free_intent_20260828'"), 'campaign is uniquely attributable')
check(page.includes('placement="free_answer"'), 'answer-layer CTA has its own placement')
check(page.includes('href={signupUrl}'), 'answer-layer CTA uses the shared signup handoff')
check(page.includes('buildBlankStudioSignupHref({ campaign })'), 'signup handoff is blank-studio, not auto-render')
check(!invideoBlock.includes('create_intent'), 'InVideo record cannot request automatic creation')

// Honest positioning is part of the conversion contract: both products are
// acknowledged as free, and the decision is based on workflow.
check(page.includes('Both products let you start without a card.'), 'answer does not claim false free exclusivity')
check(page.includes('Pick InVideo to explore a broad creation suite.'), 'competitor win condition remains visible')
check(page.includes('Pick Kineo when your job is one faceless Short from one idea.'), 'Kineo job-to-be-done is explicit')
check(page.includes("{ feature: 'Free access without a card', sfa: true, them: true }"), 'comparison table acknowledges both free paths')

// Design gate: founder-facing preview contains the exact touched section in
// before/after pairs for desktop and 390px mobile. The product grid itself is
// responsive through auto-fit, so the cards collapse without a JS branch.
for (const label of ['Before · desktop', 'After · desktop', 'Before · mobile 390px', 'After · mobile 390px']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(page.includes("gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'"), 'product answer cards stack responsively')
check(preview.includes('Is there a free InVideo AI alternative?'), 'preview shows the exact new answer section')

console.log(`growth-invideo-free-intent: ${checks}/${checks} checks passed`)
