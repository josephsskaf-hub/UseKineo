#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

const compiled = ts.transpileModule(read('lib/growth/clientShortBrief.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(compiled, {
  module: moduleBox,
  exports: moduleBox.exports,
  require: (id) => {
    if (id === './agencyProposal') return { AGENCY_MARGIN_PROPOSAL_VARIANT: 'agency_margin_proposal_v1' }
    throw new Error(`unexpected import ${id}`)
  },
  URLSearchParams,
  Set,
}, { filename: 'lib/growth/clientShortBrief.ts' })
const briefTool = moduleBox.exports

const raw = {
  offer: '  monthly   bookkeeping for consultants ',
  audience: ' consultants losing evenings to admin ',
  goal: 'leads',
  proof: 'monthly reconciliations and a plain-language report',
  cta: 'Book a fit call',
}
const normalized = briefTool.normalizeClientShortBriefInput(raw)
equal(normalized.offer, 'monthly bookkeeping for consultants', 'offer whitespace is normalized')
equal(normalized.audience, 'consultants losing evenings to admin', 'audience whitespace is normalized')
equal(briefTool.normalizeClientShortBriefInput({ ...raw, offer: 'x'.repeat(300) }).offer.length, 140, 'offer length is bounded')
equal(briefTool.normalizeClientShortBriefInput({ ...raw, goal: 'invalid' }).goal, 'leads', 'unknown goal fails to a known value')
equal(briefTool.buildClientShortBrief({ ...raw, offer: 'short' }), null, 'thin offer cannot produce a brief')
equal(briefTool.buildClientShortBrief({ ...raw, audience: 'x' }), null, 'thin audience cannot produce a brief')

for (const goal of ['leads', 'explain', 'trust', 'launch']) {
  const brief = briefTool.buildClientShortBrief({ ...raw, goal })
  check(brief, `${goal} produces a brief`)
  equal(brief.storyBeats.length, 5, `${goal} has five story beats`)
  equal(brief.approvalChecklist.length, 4, `${goal} has four approval checks`)
  check(brief.proofBoundary.includes(raw.proof), `${goal} preserves supplied proof`)
  check(brief.callToAction === raw.cta, `${goal} preserves the exact CTA`)
  check(!/guaranteed|double your|limited time|best in the world/i.test(briefTool.clientShortBriefAsText(brief)), `${goal} adds no unsupported promise`)
}

const placeholderBrief = briefTool.buildClientShortBrief({ ...raw, proof: '', cta: '' })
check(placeholderBrief.proofBoundary.includes('[add one verified'), 'missing proof stays visible as a placeholder')
equal(placeholderBrief.callToAction, '[add the real next step]', 'missing CTA stays visible as a placeholder')

const brief = briefTool.buildClientShortBrief(raw)
const signup = new URL(briefTool.buildClientShortActivationHref(brief), 'https://www.usekineo.com')
equal(signup.pathname, '/signup', 'activation starts at signup')
equal(signup.searchParams.get('utm_source'), 'client_brief_generator', 'source identifies the free tool')
equal(signup.searchParams.get('utm_medium'), 'organic', 'medium remains organic')
equal(signup.searchParams.get('utm_campaign'), 'client_short_brief_v1', 'campaign is versioned')
const redirect = new URL(signup.searchParams.get('redirect'), 'https://www.usekineo.com')
equal(redirect.pathname, '/generate', 'brief carries into the existing generator')
equal(redirect.searchParams.get('duration'), '35', 'brief uses a supported duration')
equal(redirect.searchParams.get('autoanalyze'), '1', 'handoff analyzes without auto-rendering')
equal(redirect.searchParams.has('create_intent'), false, 'brief never auto-starts a render')
check(redirect.searchParams.get('prompt').includes(raw.proof), 'proof survives the handoff')
check(redirect.searchParams.get('prompt').includes(raw.cta), 'CTA survives the handoff')
check(redirect.searchParams.get('prompt').length <= 1000, 'handoff fits the signup prompt ceiling')
const maxInput = {
  offer: 'o'.repeat(140), audience: 'a'.repeat(100), goal: 'trust', proof: 'p'.repeat(180), cta: 'c'.repeat(100),
}
const maxPrompt = new URL(new URL(briefTool.buildClientShortActivationHref(briefTool.buildClientShortBrief(maxInput)), 'https://www.usekineo.com').searchParams.get('redirect'), 'https://www.usekineo.com').searchParams.get('prompt')
check(maxPrompt.length <= 1000, 'maximum accepted input still fits the signup ceiling')
check(maxPrompt.length < 950, 'maximum prompt keeps safety headroom below the ceiling')
check(maxPrompt.includes('p'.repeat(180)), 'maximum proof survives before the ceiling')
check(maxPrompt.includes('c'.repeat(100)), 'maximum CTA survives before the ceiling')

const shareHref = briefTool.buildClientShortBriefShareHref()
const shareUrl = new URL(shareHref, 'https://www.usekineo.com')
equal(shareUrl.pathname, '/client-video-brief-generator', 'shared intake returns to the canonical free tool')
equal(shareUrl.searchParams.get('utm_source'), 'client_brief_share', 'shared intake has a dedicated referral source')
equal(shareUrl.searchParams.get('utm_medium'), 'referral', 'shared intake is classified as referral traffic')
equal(shareUrl.searchParams.get('utm_campaign'), 'client_short_brief_share_v1', 'shared intake campaign is versioned independently')
equal([...shareUrl.searchParams.keys()].length, 3, 'shared intake URL contains no client input')
check(!shareHref.includes(raw.offer) && !shareHref.includes(raw.audience) && !shareHref.includes(raw.proof) && !shareHref.includes(raw.cta), 'shared intake leaks no client data')

equal(briefTool.readClientShortBriefEntry(''), 'organic', 'empty query is organic')
equal(briefTool.readClientShortBriefEntry('?utm_source=client_brief_share&utm_campaign=client_short_brief_share_v1'), 'client_intake_share', 'exact intake pair is classified')
equal(briefTool.readClientShortBriefEntry('?utm_source=affiliate&utm_medium=partner&utm_campaign=affiliate_client_brief'), 'affiliate_client_intake', 'exact affiliate relay triple is classified')
equal(briefTool.readClientShortBriefEntry('?utm_source=affiliate&utm_campaign=affiliate_client_brief'), 'organic', 'affiliate relay without partner medium fails closed')
equal(briefTool.readClientShortBriefEntry('?utm_source=affiliate&utm_medium=partner&utm_campaign=forged'), 'organic', 'forged affiliate relay campaign fails closed')
equal(briefTool.readClientShortBriefEntry('?utm_source=agency_margin_proposal&utm_campaign=agency_margin_proposal_v1'), 'agency_margin_proposal', 'exact proposal pair is classified')
equal(briefTool.readClientShortBriefEntry('?entry=agency_page'), 'agency_page', 'owned agency-page entry is classified')
equal(briefTool.readClientShortBriefEntry('?utm_source=client_brief_share&utm_campaign=forged'), 'organic', 'forged intake campaign fails closed')
equal(briefTool.readClientShortBriefEntry('?utm_source=forged&utm_campaign=agency_margin_proposal_v1'), 'organic', 'forged proposal source fails closed')
equal(briefTool.readClientShortBriefEntry('?entry=agency_margin_proposal'), 'organic', 'arbitrary entry cannot impersonate a proposal')
equal(briefTool.readClientShortBriefEntry('?utm_source=client_brief_share&utm_campaign=client_short_brief_share_v1&entry=agency_page'), 'client_intake_share', 'exact intake pair wins over a weaker entry hint')
equal(briefTool.readClientShortBriefEntry('?utm_source=agency_margin_proposal&utm_campaign=agency_margin_proposal_v1&entry=agency_page'), 'agency_margin_proposal', 'exact proposal pair wins over a weaker entry hint')

const client = read('app/client-video-brief-generator/ClientVideoBriefGenerator.tsx')
check(client.includes('buildClientShortBrief'), 'real UI executes the brief builder')
check(client.includes('buildClientShortActivationHref'), 'real CTA carries the approved brief')
check(client.includes("agencyPacksHref('client_brief')"), 'real B2B CTA uses the allowlisted bridge')
check(client.includes('client_short_brief_generated'), 'brief generation is measurable')
check(client.includes('client_short_brief_activation_clicked'), 'activation handoff is measurable')
check(client.includes('client_short_brief_intake_link_copied'), 'client intake referral loop is measurable')
check(client.includes('buildClientShortBriefShareHref'), 'real UI copies the privacy-safe intake URL')
check(client.includes('Their answers stay in their browser and are never added to the URL.'), 'share UI states the privacy boundary')
check(client.includes('kineo:client-short-brief:viewed:v2'), 'entry-scoped view dedupe uses a new marker contract')
check(client.includes('createReliableViewRecorder'), 'view waits for a server acknowledgement')
check(client.includes('clientShortBriefViewRecorder.record({'), 'real caller executes the reliable recorder')
check(client.includes('signal: controller.signal'), 'unmount cancels an orphaned view lifecycle')
check(client.includes('const marker = `${VIEW_MARKER}:${entry}`'), 'one session may record one view per current entry')
check(client.includes('useRef<ClientShortBriefEntry>(currentEntry()).current'), 'entry is frozen for the whole mounted visit')
check(client.includes('entry,'), 'view metadata carries the current entry')
for (const eventName of [
  'client_short_brief_viewed',
  'client_short_brief_generated',
  'client_short_brief_copied',
  'client_short_brief_intake_link_copied',
  'client_short_brief_activation_clicked',
  'client_short_brief_packs_clicked',
]) {
  check(new RegExp(`trackEvent\\('${eventName}'[\\s\\S]{0,360}entry\\b`).test(client), `${eventName} carries the frozen current entry`)
}
check(!client.toLowerCase().includes('supabase'), 'free tool has no Supabase client')
// The affiliate relay adds one read-only owner lookup. Keep the stronger
// product boundary explicit: no generation/provider request is introduced.
equal((client.match(/fetch\(/g) ?? []).length, 1, 'free tool makes only the read-only affiliate eligibility lookup')
check(client.includes("fetch('/api/affiliate/client-brief-link'"), 'the sole request is the owner-only affiliate relay lookup')

const page = read('app/client-video-brief-generator/page.tsx')
check(page.includes('canonical: CANONICAL'), 'page publishes its canonical URL')
check(page.includes("'SoftwareApplication'"), 'page identifies the free software tool')
check(page.includes("'FAQPage'"), 'page publishes answer-engine boundaries')
const sitemap = read('app/sitemap.ts')
check(sitemap.includes("{ path: '/client-video-brief-generator', priority: 0.9, freq: 'weekly' }"), 'tool is in the sitemap')
const footer = read('components/Footer.tsx')
check(footer.includes("{ href: '/client-video-brief-generator', label: 'Client video brief generator' }"), 'tool is linked globally')
const facts = read('lib/kineoFacts.ts')
check(facts.includes("url: `${BASE}/client-video-brief-generator`"), 'answer-engine facts expose the tool')
const llms = read('app/llms.txt/route.ts')
check(llms.includes('[Free client Short video brief generator]'), 'llms text exposes the B2B acquisition door')
const tools = read('app/tools/page.tsx')
check(tools.includes("'/client-video-brief-generator'"), 'public tools hub includes the new tool')

const preview = read('docs/previews/CLIENT-SHORT-BRIEF-2026-08-30.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}

const sharePreview = read('docs/previews/CLIENT-BRIEF-SHARE-LOOP-2026-08-30.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(sharePreview.includes(label), `share-loop preview includes ${label}`)
}
check(sharePreview.includes('Copy client intake link'), 'share-loop preview shows the referral CTA')
check(sharePreview.includes('never the client’s offer, audience, proof or CTA'), 'share-loop preview states its privacy boundary')

console.log(`PASS — ${checks}/${checks} client Short brief checks`)
