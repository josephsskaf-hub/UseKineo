import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repo = process.cwd()
const read = (path) => readFileSync(join(repo, path), 'utf8')
let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks += 1 }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1 }

const facts = read('lib/kineoFacts.ts')
const tools = read('app/tools/page.tsx')
const nichePage = read('app/free-ai-shorts/[niche]/page.tsx')
const builder = read('app/free-ai-shorts/[niche]/LocalBusinessAdBrief.tsx')
const llms = read('app/llms.txt/route.ts')
const factsPage = read('app/facts/page.tsx')
const preview = read('docs/previews/LOCAL-BUSINESS-TOOLS-DISCOVERY-2026-08-29.html')

const factBlock = facts.match(/\{\s*name: 'Free local business video ad script builder',[\s\S]*?\n  \},/u)?.[0] ?? ''
check(Boolean(factBlock), 'canonical free-tool facts include the local-business builder')
check(factBlock.includes("url: `${BASE}/free-ai-shorts/localbusiness`"), 'canonical entry points to the live builder route')
check(factBlock.includes("output: 'text'"), 'canonical entry describes the output as text')
equal((factBlock.match(/requiresAccount: false/g) ?? []).length, 1, 'canonical entry says no account exactly once')
equal((factBlock.match(/requiresCard: false/g) ?? []).length, 1, 'canonical entry says no card exactly once')
equal((factBlock.match(/requiresEmail: false/g) ?? []).length, 1, 'canonical entry says no email exactly once')
check(factBlock.includes('rateLimit: null'), 'browser-only builder does not invent a rate limit')
check(factBlock.includes('one verified differentiator'), 'canonical copy preserves the evidence boundary')
check(factBlock.includes('does not invent claims, call AI or render a video'), 'canonical copy names all three boundaries')

check(tools.includes("'/free-ai-shorts/localbusiness':"), 'tools hub has presentation metadata for the live route')
check(tools.includes("prompt: 'I need a local business ad script'"), 'hub names the exact B2B job')
check(tools.includes("cta: 'Build my business ad'"), 'hub exposes a concrete action')
check(tools.includes("'/product-to-video-script',\n  '/free-ai-shorts/localbusiness',\n  '/business-video-content-plan'"), 'B2B ad sits between product script and weekly planning')
check(tools.includes('ad briefs, scripts, hooks'), 'metadata now describes the newly discoverable output')
check(tools.includes('product, business offer, content goal or revenue target'), 'hero inventory includes a real business offer')
check(tools.includes('FREE_TOOL_FACTS.map'), 'hub still derives its cards from the canonical facts array')
check(tools.includes('<span>{tools.length} free tools</span>'), 'visible count remains derived rather than hard-coded')
check(tools.includes('numberOfItems: tools.length'), 'structured ItemList count remains derived')

check(nichePage.includes("params.niche === 'localbusiness'"), 'linked route scopes the B2B builder to local business')
check(nichePage.includes('<LocalBusinessAdBrief />'), 'linked route renders the actual builder')
check(builder.includes('nothing is generated or charged'), 'linked tool states the no-side-effect boundary')
check(!/fetch\(|trackEvent|supabase|create_intent/.test(builder), 'linked builder has no API, analytics, Supabase or auto-render call')

check(llms.includes('FREE_TOOL_FACTS.map'), 'llms.txt discovers the new entry from the same source')
check(factsPage.includes('FREE_TOOL_FACTS.map'), 'human facts page discovers the new entry from the same source')
equal((facts.match(/url: `\$\{BASE\}\/free-ai-shorts\/localbusiness`/g) ?? []).length, 1, 'canonical free-tool inventory contains one B2B route entry')
equal((tools.match(/'\/free-ai-shorts\/localbusiness'/g) ?? []).length, 2, 'hub mentions the route once in metadata and once in ordering')

check(preview.includes('BEFORE · 9 tools'), 'visual proof labels the previous inventory')
check(preview.includes('AFTER · 10 tools'), 'visual proof labels the new inventory')
check(preview.includes('I need a local business ad script'), 'visual proof shows the new card')
check(preview.includes('data-mobile'), 'visual proof includes a mobile state')

console.log(`local-business-tool-discovery: ${checks}/${checks} checks passed`)
