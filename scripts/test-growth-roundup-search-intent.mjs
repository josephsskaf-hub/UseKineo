import assert from 'node:assert/strict'
import fs from 'node:fs'

const roundup = fs.readFileSync('app/best-ai-shorts-generators/page.tsx', 'utf8')
const alternatives = fs.readFileSync('app/alternatives/[competitor]/page.tsx', 'utf8')
const sitemap = fs.readFileSync('app/sitemap.ts', 'utf8')
const preview = fs.readFileSync('docs/previews/roundup-search-intent-2026-08-28.html', 'utf8')

let checks = 0
function check(value, message) {
  assert.ok(value, message)
  checks += 1
}

// Search Console opportunity is served by an answer-first roundup, not by a
// title-only rewrite. The exact count and update date must agree everywhere.
check(roundup.includes("const UPDATED = 'August 28, 2026'"), 'roundup freshness date is current')
check(roundup.includes('13 Best AI YouTube Shorts Generators (2026)'), '13-tool title is present')
check(roundup.includes('The ranking: 13 best AI Shorts generators'), 'visible ranking count is 13')
check(!roundup.includes('The ranking: 10 best AI Shorts generators'), 'stale 10-tool count is absent')
check(roundup.includes('The quick answer: choose by what you already have'), 'answer-first decision map is present')
check(roundup.includes('Only an idea'), 'idea-first intent is mapped')
check(roundup.includes('A faceless channel to automate'), 'autopilot intent is mapped')
check(roundup.includes('A long video or podcast'), 're-clipping intent is mapped')
check(roundup.includes('A presenter on screen'), 'avatar intent is mapped')
check(roundup.includes('A finished clip that needs polish'), 'editing intent is mapped')
check(!roundup.includes('the only tool on this list'), 'roundup does not claim false exclusivity')
check(!/All \d+ tool comparisons/.test(roundup), 'comparison hub link cannot freeze a stale count')

// The three tool names came from production query rows, so each must be in the
// actual TOOLS data rather than only mentioned in metadata or prose.
for (const [name, slug] of [
  ['StoryShort', 'storyshort'],
  ['ShortsPilot', 'shortspilot'],
  ['SendShort', 'sendshort'],
]) {
  check(
    new RegExp(`name: '${name}'[\\s\\S]{0,100}slug: '${slug}'`).test(roundup),
    `${name} is a ranked tool with its comparison slug`,
  )
}

const toolsBlock = roundup.slice(roundup.indexOf('const TOOLS: Tool[] = ['), roundup.indexOf('\nconst FAQ:'))
const rankedNames = [...toolsBlock.matchAll(/^\s{4}name: '([^']+)',$/gm)].map((match) => match[1])
check(rankedNames.length === 13, `TOOLS contains exactly 13 entries (found ${rankedNames.length})`)
check(new Set(rankedNames).size === 13, 'all ranked tool names are unique')

// Exact alternative intent gets its own static route. Because the sitemap
// imports COMPETITOR_SLUGS, adding the two records must make both discoverable
// without a separate hardcoded sitemap entry.
for (const slug of ['storyshort', 'shortspilot']) {
  check(new RegExp(`^  ${slug}: \\{$`, 'm').test(alternatives), `${slug} comparison record exists`)
}
check(alternatives.includes('export const COMPETITOR_SLUGS = Object.keys(COMPETITORS)'), 'comparison slugs derive from records')
check(alternatives.includes('publicly described (August 2026)'), 'visible comparison freshness matches the audit date')
check(!alternatives.includes('publicly described (July 2026)'), 'stale visible comparison date is absent')
check(sitemap.includes("import { COMPETITOR_SLUGS } from './alternatives/[competitor]/page'"), 'sitemap imports comparison slugs')
check(sitemap.includes('const altEntries = COMPETITOR_SLUGS.map'), 'sitemap emits every comparison slug')
check(sitemap.includes("new Date('2026-08-28T18:30:00.000Z')"), 'sitemap freshness advances with the new URLs')

// Money truth: Kineo prices remain sourced from marketingPrice; no competitor
// price is frozen into the new StoryShort or ShortsPilot records.
check(alternatives.includes("import { STARTER_MO, STARTER_MONTH } from '@/lib/marketingPrice'"), 'Kineo price is canonical')
for (const slug of ['storyshort', 'shortspilot']) {
  const start = alternatives.indexOf(`  ${slug}: {`)
  const next = alternatives.indexOf('\n  },', start) + 5
  const block = alternatives.slice(start, next)
  check(!/\$\d/.test(block), `${slug} block freezes no competitor dollar price`)
}

// Mobile rendering is a product contract, not a preview-only claim.
check(roundup.includes('@media (max-width: 680px)'), 'mobile breakpoint exists in product')
check(roundup.includes('grid-template-columns: 1fr;'), 'decision rows stack on mobile')
check(preview.includes('Before · desktop'), 'preview includes desktop before')
check(preview.includes('After · desktop'), 'preview includes desktop after')
check(preview.includes('Before · mobile 390px'), 'preview includes mobile before')
check(preview.includes('After · mobile 390px'), 'preview includes mobile after')

console.log(`growth-roundup-search-intent: ${checks}/${checks} checks passed`)
