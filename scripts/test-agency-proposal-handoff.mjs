import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const helperPath = path.join(root, 'lib', 'growth', 'agencyProposal.ts')
const helper = await import(pathToFileURL(helperPath).href)
const briefHelper = await import(pathToFileURL(path.join(root, 'lib', 'growth', 'clientShortBrief.ts')).href)
const calculator = fs.readFileSync(path.join(root, 'app', 'ai-shorts-for-agencies', 'AgencyMarginCalculator.tsx'), 'utf8')

let checks = 0
function ok(value, message) {
  checks += 1
  assert.ok(value, message)
}
function equal(actual, expected, message) {
  checks += 1
  assert.equal(actual, expected, message)
}

equal(helper.AGENCY_MARGIN_PROPOSAL_VARIANT, 'agency_margin_proposal_v1', 'variant is stable')

const href = helper.buildAgencyProposalApprovalHref()
const parsedHref = new URL(href, 'https://www.usekineo.com')
equal(parsedHref.pathname, '/client-video-brief-generator', 'proposal leads to the existing approval brief')
equal(parsedHref.searchParams.get('utm_source'), 'agency_margin_proposal', 'proposal source is attributable')
equal(parsedHref.searchParams.get('utm_medium'), 'referral', 'proposal is a referral loop')
equal(parsedHref.searchParams.get('utm_campaign'), 'agency_margin_proposal_v1', 'proposal campaign is versioned')
equal(briefHelper.readClientShortBriefEntry(parsedHref.search), 'agency_margin_proposal', 'proposal destination classifies the current entry')
equal(briefHelper.readClientShortBriefEntry('?utm_source=agency_margin_proposal&utm_campaign=forged'), 'organic', 'proposal classification fails closed when the campaign drifts')

equal(helper.agencyProposalPriceBand(0), 'under_15', 'zero fails into the lowest non-sensitive band')
equal(helper.agencyProposalPriceBand(1499), 'under_15', 'under 15 bucket')
equal(helper.agencyProposalPriceBand(1500), '15_29', '15 boundary')
equal(helper.agencyProposalPriceBand(2999), '15_29', 'under 30 bucket')
equal(helper.agencyProposalPriceBand(3000), '30_59', '30 boundary')
equal(helper.agencyProposalPriceBand(5999), '30_59', 'under 60 bucket')
equal(helper.agencyProposalPriceBand(6000), '60_plus', '60 boundary')

const approvalUrl = new URL(href, 'https://www.usekineo.com').toString()
const proposal = helper.buildAgencyClientProposal({
  videos: 30,
  clientPriceMinor: 2500,
  approvalHref: approvalUrl,
})
ok(typeof proposal === 'string', 'valid inputs produce a proposal')
ok(proposal.includes('30 vertical 9:16 Fast Shorts'), 'scope carries selected volume')
ok(proposal.includes('$25.00 per finished Short'), 'proposal carries client unit price')
ok(proposal.includes('Project total: $750.00'), 'proposal calculates client total')
ok(proposal.includes('Script, AI voice, matched visuals and burned-in captions'), 'proposal states bounded scope')
ok(proposal.includes('One approval brief before production starts'), 'proposal makes approval explicit')
ok(proposal.includes(approvalUrl), 'proposal contains attributable next step')
ok(proposal.includes('Draft only.'), 'proposal cannot masquerade as a contract')
ok(proposal.includes('Timeline, revision rounds'), 'unknown commercial terms remain explicit')

for (const internal of ['Kineo production', 'marketplace fee', 'cash after', 'gross margin', '$249']) {
  ok(!proposal.toLowerCase().includes(internal.toLowerCase()), `client proposal hides internal field: ${internal}`)
}

equal(helper.buildAgencyClientProposal({ videos: 12, clientPriceMinor: 2500, approvalHref: approvalUrl }), null, 'unsupported volume fails closed')
equal(helper.buildAgencyClientProposal({ videos: 30, clientPriceMinor: 0, approvalHref: approvalUrl }), null, 'zero client price fails closed')
equal(helper.buildAgencyClientProposal({ videos: 30, clientPriceMinor: 25.5, approvalHref: approvalUrl }), null, 'fractional minor units fail closed')
equal(helper.buildAgencyClientProposal({ videos: 30, clientPriceMinor: 2500, approvalHref: '' }), null, 'missing approval destination fails closed')

ok(calculator.includes("from '@/lib/growth/agencyProposal'"), 'real calculator imports proposal policy')
ok(calculator.includes('buildAgencyClientProposal({'), 'real calculator executes proposal builder')
ok(calculator.includes('navigator.clipboard.writeText(proposal)'), 'copy requires an explicit browser action')
ok(calculator.includes("trackEvent('agency_margin_proposal_copied'"), 'copy has a named event')
ok(calculator.includes('price_band: agencyProposalPriceBand(clientPriceMinor)'), 'telemetry uses a bucket instead of exact price')
ok(!/agency_margin_proposal_copied[\s\S]{0,500}client_price_minor/.test(calculator), 'proposal event excludes exact client price')
ok(!/agency_margin_proposal_copied[\s\S]{0,500}cashAfterKineoMinor/.test(calculator), 'proposal event excludes margin')
ok(calculator.includes("'Copy client proposal'"), 'new action is visible')
ok(calculator.includes('Nothing is sent automatically.'), 'UI states the external-action boundary')
ok(calculator.includes('href={`#pack-${selectedPack.id}`}'), 'direct pack path remains available')
ok(!calculator.includes('mailto:'), 'product never drafts or sends email')
ok(!calculator.includes('window.open('), 'copy does not open an external destination')

console.log(`agency proposal handoff: ${checks}/${checks} checks passed`)
