#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} imported unexpected module: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

const lead = loadTs('lib/growth/b2bLead.ts')
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(lead.B2B_LEAD_INTENT, 'agency_brief', 'business intent has a stable allow-listed value')
equal(lead.B2B_LEAD_SOURCE, 'b2b_agency_intake', 'database source is server-owned and stable')
equal(lead.B2B_FIT_REVIEW_CAMPAIGN, 'b2b_volume_fit_review_v1', 'answer-engine campaign is stable')
equal(lead.B2B_VOLUME_OPTIONS.length, 4, 'volume form exposes exactly four useful bands')
equal(lead.B2B_VOLUME_OPTIONS.map((option) => option.id), ['10_19', '20_49', '50_99', '100_plus'], 'volume ids are allow-listed')
equal(lead.normalizeLeadEmail('  Buyer@Company.COM '), 'buyer@company.com', 'email is trimmed and normalized')
equal(lead.normalizeLeadEmail('missing-domain'), null, 'email without domain is rejected')
equal(lead.normalizeLeadEmail('missing@tld'), null, 'email without a dotted domain is rejected')
equal(lead.normalizeLeadEmail('a'.repeat(201) + '@x.com'), null, 'oversized email is rejected')
equal(lead.parseB2BLeadInput({ email: 'ops@agency.com', volume: '50_99' }), { email: 'ops@agency.com', volume: '50_99' }, 'valid business brief executes')
equal(lead.parseB2BLeadInput({ email: 'ops@agency.com', volume: 'arbitrary' }), null, 'unknown volume fails closed')
equal(lead.parseB2BLeadInput({ email: 'bad', volume: '20_49' }), null, 'bad email fails closed')
equal(lead.parseB2BLeadInput(null), null, 'null body fails closed')
for (const option of lead.B2B_VOLUME_OPTIONS) {
  const storage = lead.b2bVolumeStorageKey(option.id)
  equal(storage, `monthly_${option.id}`, `${option.id}: storage key is deterministic`)
  equal(lead.readB2BVolumeStorageKey(storage), option.id, `${option.id}: storage key round-trips`)
}
equal(lead.readB2BVolumeStorageKey('monthly_other'), null, 'unknown stored volume is not displayed as fact')
equal(lead.readB2BVolumeStorageKey('other_20_49'), null, 'wrong storage namespace is rejected')
equal(
  lead.readB2BFitReviewAttribution('?utm_source=kineo_facts&utm_medium=answer_engine&utm_campaign=b2b_volume_fit_review_v1'),
  { entry_campaign: 'b2b_volume_fit_review_v1', entry_medium: 'answer_engine', entry_source: 'kineo_facts' },
  'exact first-party answer-engine link is attributed',
)
equal(lead.readB2BFitReviewAttribution('?utm_source=chatgpt.com&utm_medium=answer_engine&utm_campaign=b2b_volume_fit_review_v1'), null, 'arbitrary source is not copied into telemetry')
equal(lead.readB2BFitReviewAttribution('?utm_source=kineo_facts&utm_medium=answer_engine&utm_campaign=other'), null, 'unknown campaign fails closed')

const route = source('app/api/lead-capture/route.ts')
const component = source('app/ai-shorts-for-agencies/AgencyBriefClient.tsx')
const page = source('app/ai-shorts-for-agencies/page.tsx')
const adminRoute = source('app/api/admin/funnel/route.ts')
const adminClient = source('app/(dashboard)/admin/funnel/FunnelClient.tsx')
const preview = source('docs/previews/B2B-LEAD-INTAKE-2026-08-28.html')

ok(route.indexOf("content-length") < route.indexOf('await req.text()'), 'declared payload size is checked before reading the body')
ok(route.includes('rawBody.length > 4096'), 'actual payload size is bounded')
ok(route.indexOf('body.website') < route.indexOf('const admin = createAdminClient'), 'honeypot exits before database access')
ok(route.includes('body.intent === B2B_LEAD_INTENT'), 'route distinguishes business intent from legacy B2C capture')
ok(route.includes('parseB2BLeadInput(body)'), 'route executes the pure business validation policy')
ok(route.includes('? B2B_LEAD_SOURCE'), 'business source is fixed by the server')
ok(route.includes('b2bVolumeStorageKey(b2bInput.volume)'), 'only the allow-listed volume band is stored')
ok(route.includes("error?.code === '23505'"), 'duplicate handling uses the Postgres code')
ok(route.includes(".update({ source, magnet })"), 'existing B2C lead can become an explicit business request')
ok(route.includes('if (isNewLead && !isB2BBrief)'), 'business request never triggers the viral-ideas email')
ok(route.includes("{ error: 'temporarily unavailable' }, { status: 503 }"), 'business storage failure is honest instead of fake success')
ok(!route.includes('console.error(\'[lead-capture] error:\', email'), 'route never logs the submitted email')

ok(page.includes("import AgencyBriefClient from './AgencyBriefClient'"), 'server page imports the business brief')
ok(page.includes('<AgencyBriefClient />'), 'server page calls the business brief')
ok(page.indexOf('<AgencyPacksClient packs={PACKS} />') < page.indexOf('<AgencyBriefClient />'), 'brief is the alternative after self-service packs, not a competing hero CTA')
ok(component.includes('IntersectionObserver'), 'form impression requires real viewport visibility')
ok(component.includes('intersectionRatio >= 0.5'), 'at least half the form must be visible')
// The campaign gets its own allow-listed marker so a prior generic page view
// cannot hide the answer-engine exposure. Both paths still dedupe per session.
ok(component.includes('sessionStorage.getItem(marker)'), 'form view dedupes per session and attribution bucket')
ok(component.includes("trackEvent('b2b_brief_viewed'"), 'visible form emits a named event')
ok(component.includes("trackEvent('b2b_brief_submitted'"), 'successful storage emits a named completion event')
ok(component.includes('readB2BFitReviewAttribution(window.location.search)'), 'form executes the allow-listed attribution policy')
ok(component.includes('`${VIEW_MARKER}:${B2B_FIT_REVIEW_CAMPAIGN}`'), 'campaign view is not suppressed by an earlier generic view in the same session')
ok(component.includes('monthly_volume: volume'), 'telemetry stores only the allow-listed band')
const submittedTelemetry = component.slice(
  component.indexOf("trackEvent('b2b_brief_submitted'"),
  component.indexOf("    } catch", component.indexOf("trackEvent('b2b_brief_submitted'")),
)
ok(!submittedTelemetry.includes('email'), 'submission telemetry does not include the submitted email')
ok(component.includes('intent: B2B_LEAD_INTENT'), 'client posts the fixed business intent')
ok(component.includes('website'), 'client includes the hidden honeypot')
ok(component.includes('result?.saved !== true'), 'UI never celebrates a soft database failure')
ok(component.includes('No automatic sales sequence or mailing list'), 'public copy states the communication boundary')
ok(component.includes('may contact you about this request'), 'form includes purpose-specific contact consent')
ok(component.includes('Your email is not added to the viral-ideas mailing list'), 'B2B and B2C lifecycle are explicitly separated')

ok(adminRoute.includes(".eq('source', B2B_LEAD_SOURCE)"), 'admin inbox reads only business-intent leads')
ok(adminRoute.includes('!isInternalEmail(row.email)'), 'admin inbox excludes internal accounts')
ok(adminRoute.includes("b2b_brief_viewed: uniqueCheckoutActors('b2b_brief_viewed')"), 'admin counts form viewers as actors')
ok(adminRoute.includes("b2b_brief_submitted: uniqueCheckoutActors('b2b_brief_submitted')"), 'admin counts client success events as actors')
ok(adminRoute.includes('b2bLeadInbox,'), 'executed admin response returns the canonical inbox')
ok(adminClient.includes('Recorded business briefs'), 'admin renders the canonical lead count')
ok(adminClient.includes('Business brief inbox'), 'admin renders reviewable lead rows')
ok(adminClient.includes('founder approval before sending any message'), 'admin preserves the outreach approval gate')

ok(preview.includes('BEFORE') && preview.includes('AFTER'), 'visual preview compares before and after')
ok(preview.includes('DESKTOP') && preview.includes('MOBILE'), 'visual preview covers desktop and mobile')
ok(preview.includes('PUBLIC B2B PAGE') && preview.includes('ADMIN FUNNEL'), 'every touched visual surface is shown')

console.log(`b2b lead intake: ${checks}/${checks} checks passed`)
