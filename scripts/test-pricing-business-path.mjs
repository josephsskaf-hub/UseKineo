import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repo = process.cwd()
const read = (path) => readFileSync(join(repo, path), 'utf8')
let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks += 1 }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1 }

const pricing = read('app/pricing/PricingClient.tsx')
const tracker = read('components/PricingBusinessPathTelemetry.tsx')
const policy = read('lib/growth/pricingBusinessPath.ts')
const bridge = read('components/AgencyVolumeBridge.tsx')

check(pricing.includes("import PricingBusinessPathTelemetry from '@/components/PricingBusinessPathTelemetry'"), 'pricing imports the isolated tracker')
check(pricing.includes('id={PRICING_BUSINESS_PATH_TARGET_ID}'), 'pricing gives the existing bridge a stable observation target')
check(pricing.indexOf('<PricingBusinessPathTelemetry />') < pricing.indexOf('<AgencyVolumeBridge entry="pricing" />'), 'tracker mounts beside the real pricing bridge')
equal((pricing.match(/<AgencyVolumeBridge entry="pricing" \/>/g) ?? []).length, 1, 'pricing still renders exactly one agency bridge')

check(policy.includes("'pricing_business_path_visibility_v1'"), 'policy has a stable experiment version')
check(policy.includes("'/ai-shorts-for-agencies?entry=pricing#agency-pack-heading'"), 'destination preserves the existing first-touch entry')
check(policy.includes("surface: 'pricing'"), 'metadata identifies the surface')
check(policy.includes("entry: 'pricing'"), 'metadata identifies the bridge entry')
check(policy.includes("actor_unit: 'authenticated_user'"), 'metadata declares the primary actor unit')
check(!/(email|business_name|script|prompt|topic|url:)/.test(policy), 'metadata policy contains no customer content or PII fields')

check(tracker.includes('const VIEW_THRESHOLD = 0.5'), 'view requires at least 50 percent visibility')
check(tracker.includes("'pricing_business_path_viewed'"), 'tracker records a bridge view')
check(tracker.includes("'pricing_business_path_clicked'"), 'tracker records a qualified bridge click')
check(tracker.includes("closest('a[href]')"), 'click tracking delegates through the real link')
check(tracker.includes("anchor.getAttribute('href')"), 'click tracking verifies the exact destination')
check(tracker.includes('const stored = await trackEvent'), 'tracker waits for the analytics result')
check(tracker.indexOf('const stored = await trackEvent') < tracker.indexOf("window.sessionStorage.setItem(marker, '1')"), 'session marker is written only after the server result')
check(tracker.includes('if (!stored) return false'), 'failed analytics remains retryable')
check(tracker.includes('const inFlight = new Set<string>()'), 'in-flight latch blocks observer races')
check(tracker.includes('const recorded = new Set<string>()'), 'in-memory latch blocks React remount inflation')
check(tracker.includes("typeof IntersectionObserver === 'undefined'"), 'unsupported browsers preserve the sales page')
check(tracker.includes('return null'), 'tracker adds no visual UI')

check(bridge.includes('See one-time volume packs →'), 'existing CTA copy is unchanged')
check(bridge.includes('Self-service · one account · no recurring contract'), 'existing subscription clarification is unchanged')
check(bridge.includes('agencyPacksHref(entry)'), 'existing destination still comes from the canonical helper')

console.log(`pricing-business-path: ${checks}/${checks} checks passed`)
