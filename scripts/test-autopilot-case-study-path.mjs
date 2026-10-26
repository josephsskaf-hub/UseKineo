import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pagePath = path.join(root, 'app', 'youtube-automation-case-study', 'page.tsx')
const page = fs.readFileSync(pagePath, 'utf8')

let checks = 0
const expect = (condition, message) => {
  checks += 1
  if (!condition) throw new Error(message)
}

const campaignHref = '/pricing?intent_campaign=autopilot_case_study_v1#autopilot'
const primaryIndex = page.indexOf(campaignHref)
const freeIndex = page.indexOf('/signup?utm_source=case_study&utm_medium=proof&utm_campaign=live_channel', primaryIndex)

expect(page.includes("import OrganicCtaLink from '@/components/OrganicCtaLink'"), 'caller must use the canonical measured CTA')
expect(primaryIndex >= 0, 'case study must preserve Autopilot intent through pricing')
expect(page.includes('source="youtube_automation_case_study"'), 'source must identify the proof page')
expect(page.includes('placement="autopilot_offer"'), 'placement must identify the Autopilot offer')
// KINEO-LEVA-2410: retirada aprovada da vitrine em 09/10; a oferta só existe no ramo da flag.
expect(page.includes('Review the pilot and monthly terms'), 'primary action must name the existing terms')
const gate = page.indexOf('{AUTOPILOT_PUBLIC ? (<>')
const paused = page.indexOf('Autopilot is not open to new customers right now', primaryIndex)
expect(gate >= 0 && gate < primaryIndex && paused > primaryIndex && paused < freeIndex, 'offer stays behind public flag and paused branch precedes free path')
expect(/export const AUTOPILOT_PUBLIC\s*=\s*false/.test(fs.readFileSync(path.join(root, 'lib/autopilotPublic.ts'), 'utf8')), 'Autopilot remains paused as approved')
expect(freeIndex > primaryIndex, 'free generator path must remain available after the Autopilot offer')
expect(page.includes('TRIAL_GRANT_CREDITS_COPY'), 'free-tier copy must remain canonical')
expect(!page.includes('/api/stripe/checkout?'), 'case study must never launch checkout directly')
expect(!/\$\s*\d/.test(page.slice(primaryIndex, freeIndex)), 'Autopilot CTA must not hardcode a price')
expect(!page.includes('utm_source=autopilot_case_study'), 'the new bridge must not overwrite first-touch attribution')

console.log(`autopilot case-study path: ${checks}/${checks} checks passed`)
