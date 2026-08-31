import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const repo = process.cwd()
const out = mkdtempSync(join(tmpdir(), 'kineo-local-business-observability-'))
const require = createRequire(import.meta.url)
let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks += 1 }
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }

try {
  const tsc = require.resolve('typescript/bin/tsc')
  execFileSync(process.execPath, [tsc,
    'lib/growth/localBusinessBriefObservability.ts',
    '--outDir', out,
    '--rootDir', 'lib',
    '--module', 'commonjs',
    '--target', 'ES2020',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
  ], { cwd: repo, stdio: 'pipe' })

  const policy = require(join(out, 'growth', 'localBusinessBriefObservability.js'))
  equal(policy.LOCAL_BUSINESS_BRIEF_OBSERVABILITY_VERSION, 'local_business_brief_observability_v1', 'version is stable')
  equal(policy.LOCAL_BUSINESS_BRIEF_CAMPAIGN, 'growth_local_business_brief_20260828', 'existing signup campaign stays canonical')
  equal(policy.LOCAL_BUSINESS_BRIEF_VISIBLE_RATIO, 0.5, 'view requires half the builder to be visible')
  equal(policy.LOCAL_BUSINESS_BRIEF_GATE_SESSIONS, 10, 'gate is ten sessions, never ten people')
  equal(policy.LOCAL_BUSINESS_BRIEF_METADATA, {
    version: 'local_business_brief_observability_v1',
    campaign: 'growth_local_business_brief_20260828',
    surface: 'free_ai_shorts_localbusiness',
    placement: 'business_ad_builder',
  }, 'base metadata is fully allow-listed')
  equal(policy.localBusinessBriefDraftMetadata('manual').draft_source, 'manual', 'manual generation stays categorical')
  equal(policy.localBusinessBriefDraftMetadata('sample').draft_source, 'sample', 'sample generation stays categorical')

  const component = readFileSync(join(repo, 'app/free-ai-shorts/[niche]/LocalBusinessAdBrief.tsx'), 'utf8')
  const eventNames = [
    'local_business_brief_viewed',
    'local_business_brief_sample_loaded',
    'local_business_brief_generated',
    'local_business_brief_activation_clicked',
  ]
  for (const eventName of eventNames) {
    check(component.includes(`'${eventName}'`), `${eventName} is emitted by the real caller`)
  }
  check(component.includes('entry.intersectionRatio >= LOCAL_BUSINESS_BRIEF_VISIBLE_RATIO'), 'impression uses the declared viewport threshold')
  check(component.includes("sessionStorage.setItem(LOCAL_BUSINESS_BRIEF_VIEW_MARKER, '1')"), 'stored impressions are session-deduped')
  check(component.indexOf('.then((stored)') < component.indexOf('sessionStorage.setItem(LOCAL_BUSINESS_BRIEF_VIEW_MARKER'), 'dedupe marker is written only after analytics confirms storage')
  check(component.includes('pendingViews.add(LOCAL_BUSINESS_BRIEF_VIEW_MARKER)'), 'in-memory guard closes the remount race')
  check(component.includes('localBusinessBriefDraftMetadata(draftSource)'), 'activation records only the categorical draft source')
  check(component.includes('data-observability-version={LOCAL_BUSINESS_BRIEF_METADATA.version}'), 'real surface declares the version')
  check(!/trackEvent\([^)]*(businessName|service|audience|proof|callToAction|script)/s.test(component), 'no customer field or script is passed to analytics')

  const metadataSource = readFileSync(join(repo, 'lib/growth/localBusinessBriefObservability.ts'), 'utf8')
  for (const forbidden of ['businessName', 'service:', 'audience:', 'proof:', 'callToAction', 'prompt:', 'script:']) {
    check(!metadataSource.includes(forbidden), `metadata contract excludes ${forbidden}`)
  }
  check(!/fetch\(|supabase|stripe|render/i.test(metadataSource), 'policy has no network, database, payment or render side effect')

  const beforeVisual = component
    .replace(/\s*ref=\{sectionRef\}/, '')
    .replace(/\s*data-observability-version=\{LOCAL_BUSINESS_BRIEF_METADATA\.version\}/, '')
  check(beforeVisual.includes('Turn your real offer into the first script'), 'existing heading remains unchanged')
  check(beforeVisual.includes('Build my editable script →'), 'existing generation CTA remains unchanged')
  check(beforeVisual.includes('Continue with this exact script →'), 'existing activation CTA remains unchanged')

  console.log(`local-business-brief-observability: ${checks}/${checks} checks passed`)
} finally {
  rmSync(out, { recursive: true, force: true })
}
