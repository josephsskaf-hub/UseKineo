import assert from 'node:assert/strict'
import fs from 'node:fs'

const page = fs.readFileSync('app/real-estate-video-maker/page.tsx', 'utf8')
const policy = fs.readFileSync('lib/growth/realEstateShorts.ts', 'utf8')
const agency = fs.readFileSync('lib/agencyDistribution.ts', 'utf8')
const sitemap = fs.readFileSync('app/sitemap.ts', 'utf8')
const footer = fs.readFileSync('components/Footer.tsx', 'utf8')
const llms = fs.readFileSync('app/llms.txt/route.ts', 'utf8')
const preview = fs.readFileSync('docs/previews/real-estate-video-maker-2026-08-28.html', 'utf8')

let checks = 0
function check(value, message) {
  assert.ok(value, message)
  checks += 1
}

// The route answers one commercial search job directly and stays narrower
// than avatar/photo-tour competitors. This protects against a landing page
// silently growing into a product promise the pipeline does not fulfill.
check(page.includes("title: 'AI Real Estate Video Maker for Market Updates & Reels | Kineo'"), 'metadata answers the real-estate maker intent')
check(page.includes('Make real estate Shorts from facts you verify'), 'visible H1 is specific and evidence-bounded')
check(page.includes('What is Kineo useful for in real estate?'), 'direct-answer section exists above the formats')
for (const phrase of ['does not ingest an MLS listing', 'geometrically faithful walkthrough', 'digital twin of the agent']) {
  check(page.includes(phrase), `page refuses unsupported promise: ${phrase}`)
}
check(page.includes('Generated and stock visuals can set context, but they are not proof'), 'specific-property visual boundary is visible')
check(!/guarantee(?:s|d)?\s+(?:leads|sales|listings)/i.test(page), 'page guarantees no commercial result')

// Every format declares the evidence the agent must supply and who owns the
// review. The page consumes the canonical array instead of duplicating cards.
for (const id of ['market_update', 'neighborhood_guide', 'buyer_seller_tip']) {
  check(policy.includes(`id: '${id}'`), `format ${id} is defined once`)
}
check(policy.includes('source for every number'), 'market update requires sourced numbers')
check(policy.includes('agent owns factual, legal and regulatory review'), 'publisher responsibility is explicit')
check(page.includes('REAL_ESTATE_SHORT_FORMATS.map'), 'page renders the canonical formats')

// The primary CTA opens the blank Studio handoff. Merely viewing or clicking
// this page cannot create a render intent or spend a credit automatically.
check(policy.includes('buildBlankStudioSignupHref({'), 'CTA uses the shared blank-studio handoff')
check(policy.includes("REAL_ESTATE_VIDEO_CAMPAIGN = 'growth_real_estate_video_maker_20260828'"), 'campaign is uniquely attributable')
check(!policy.includes('buildPromptedFastSignupHref'), 'policy cannot auto-create from a template')
check(!policy.includes('create_intent'), 'policy contains no automatic render intent')
check(page.includes('const STUDIO_HREF = buildRealEstateStudioHref()'), 'both CTA placements share one safe href')

// Commercial copy stays on canonical sources and the existing B2B offer.
check(page.includes("import { getFreeTierOffer } from '@/lib/freeTierOffer'"), 'free access copy is canonical')
check(page.includes('{OFFER.copy.sentence}'), 'deployed offer sentence is rendered')
check(page.includes("agencyPacksHref('real_estate')"), 'B2B route uses a narrow first-party entry')
check(agency.includes("'real_estate',"), 'real-estate entry is allow-listed')
check(page.includes('self-service, use one Kineo account'), 'pack limits stay visible')
check(!/\$\d/.test(page), 'page freezes no commercial price literal')

// The new acquisition surface must not be an orphan and must be legible to
// both search crawlers and answer engines.
check(sitemap.includes("{ path: '/real-estate-video-maker', priority: 0.8, freq: 'weekly' }"), 'sitemap discovers the route')
check(footer.includes("{ href: '/real-estate-video-maker', label: 'Real estate video maker' }"), 'public footer links the route')
check(llms.includes('[AI real estate video maker](${BASE}/real-estate-video-maker)'), 'llms text exposes the route')
check(llms.includes('It is not an MLS-photo tour'), 'answer-engine boundary matches the page')

// Design gate for a new route: before means no route; after shows the actual
// hero, direct answer and cards at desktop and 390px.
for (const label of ['Before · desktop', 'After · desktop', 'Before · mobile 390px', 'After · mobile 390px']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(preview.includes('Make real estate Shorts from facts you verify'), 'preview contains the shipped hero')
check(preview.includes('What is Kineo useful for in real estate?'), 'preview contains the shipped answer card')
check(page.includes("gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))'"), 'format cards collapse responsively')

console.log(`real-estate-video-maker: ${checks}/${checks} checks passed`)
