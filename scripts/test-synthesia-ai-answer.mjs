import assert from 'node:assert/strict'
import fs from 'node:fs'

const page = fs.readFileSync('app/alternatives/[competitor]/page.tsx', 'utf8')
const preview = fs.readFileSync('docs/previews/synthesia-ai-answer-2026-08-28.html', 'utf8')

let checks = 0
function check(value, message) {
  assert.ok(value, message)
  checks += 1
}

// EVIDÊNCIA DE PRODUÇÃO (Google Search Console, 28/08/2026; janela
// 01/07–26/08): /alternatives/synthesia recebeu 4 das 35 impressões do domínio
// em recursos de IA generativa — a maior superfície editorial do relatório.
check(page.includes('4 impressões nos recursos de IA'), 'production evidence is recorded beside the answer')
check(page.includes("? 'Synthesia Alternative for Faceless Shorts — Honest 2026 Comparison'"), 'metadata gives the honest comparison intent')
check(page.includes("h1: 'A Synthesia Alternative for Faceless Shorts — Not a Drop-In Replacement'"), 'visible H1 rejects false equivalence')
check(page.includes('Kineo is an alternative for the Short — not for the enterprise avatar workspace'), 'short answer is visible above the table')

const synthesiaStart = page.indexOf('  synthesia: {')
const synthesiaEnd = page.indexOf('\n  canva:', synthesiaStart)
const synthesiaBlock = page.slice(synthesiaStart, synthesiaEnd)
check(synthesiaStart > -1 && synthesiaEnd > synthesiaStart, 'Synthesia record is isolated')

// Claims are restrained and match the current product contract. The old copy
// claimed perfect lip-sync and that Synthesia stopped at an avatar clip; both
// are prohibited because neither is true enough to earn a buyer's trust.
for (const forbidden of ['perfect lip-sync', 'and stops there', 'delivers the whole ready-to-post Short']) {
  check(!synthesiaBlock.toLowerCase().includes(forbidden.toLowerCase()), `Synthesia block excludes: ${forbidden}`)
}
check(synthesiaBlock.includes('optional 720p lip-synced presenter'), 'Kineo presenter claim is bounded to the implemented output')
check(synthesiaBlock.includes('not a stock-avatar library or an enterprise avatar workspace'), 'Kineo limitation is explicit')
check(synthesiaBlock.includes('Pick Synthesia when'), 'competitor win condition is visible')
check(synthesiaBlock.includes('Pick Kineo when'), 'Kineo win condition is visible')

// The competitor's current breadth is acknowledged from first-party sources.
check(page.includes("const SYNTHESIA_FACTS_CHECKED = 'August 28, 2026'"), 'fact-check date is explicit')
check(page.includes("const SYNTHESIA_PRICING_SOURCE = 'https://www.synthesia.io/pricing'"), 'official pricing page is linked')
check(page.includes("const SYNTHESIA_VIDEO_SOURCE = 'https://www.synthesia.io/features/ai-video-generator'"), 'official AI video overview is linked')
for (const fact of ['160+ languages and voices', 'AI-generated assets', 'Brand Kit', 'SCORM']) {
  check(synthesiaBlock.includes(fact) || page.includes(fact), `verified capability is represented: ${fact}`)
}
check(synthesiaBlock.includes("{ feature: 'Creates a complete video from a prompt', sfa: true, them: true }"), 'table acknowledges complete-video overlap')
check(synthesiaBlock.includes("{ feature: 'Free access without a card', sfa: true, them: true }"), 'table acknowledges both free paths')
check(!/Synthesia[^\n]{0,80}\$\d/i.test(synthesiaBlock), 'no competitor dollar price is frozen in the record')

// Kineo's commercial terms stay on canonical sources; no new campaign or event
// was introduced while Supabase is at its storage limit.
check(page.includes("import { STARTER_MO, STARTER_MONTH } from '@/lib/marketingPrice'"), 'Kineo price remains canonical')
check(synthesiaBlock.includes('${STARTER_MO}'), 'visible price derives from marketingPrice')
check(synthesiaBlock.includes('${OFFER.copy.sentence}'), 'free access derives from the deployed offer')
check(!page.includes('growth_synthesia_ai_answer_20260828'), 'no new analytics campaign is added during the capacity incident')
check(page.includes('`push22_alternative_${params.competitor}`'), 'existing alternative campaign remains the only attribution path')

// Design gate: the exact touched region is present in before/after pairs at
// desktop and 390px mobile. Product CSS uses auto-fit, so the cards collapse
// without adding a client component or viewport branch.
for (const label of ['Before · desktop', 'After · desktop', 'Before · mobile 390px', 'After · mobile 390px']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(page.includes("gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))'"), 'decision cards stack responsively')
check(preview.includes('not for the enterprise avatar workspace'), 'preview contains the exact new answer')

console.log(`synthesia-ai-answer: ${checks}/${checks} checks passed`)
