import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const output = mkdtempSync(path.join(tmpdir(), 'kineo-platform-decision-'))
const localTsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
const sharedTsc = path.resolve(root, '..', '..', '..', 'node_modules', 'typescript', 'bin', 'tsc')
const tsc = existsSync(localTsc) ? localTsc : sharedTsc
let checks = 0

function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

try {
  execFileSync(
    process.execPath,
    [tsc, 'lib/platformDecision.ts', '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--outDir', output, '--skipLibCheck'],
    { cwd: root, stdio: 'pipe' },
  )

  const policy = await import(pathToFileURL(path.join(output, 'platformDecision.js')).href)
  const page = readFileSync(path.join(root, 'app/tiktok-vs-youtube-shorts-monetization/page.tsx'), 'utf8')
  const client = readFileSync(path.join(root, 'app/tiktok-vs-youtube-shorts-monetization/PlatformDecisionClient.tsx'), 'utf8')

  const goals = ['reach', 'revenue', 'customers']
  const contentTypes = ['stories', 'expertise', 'business']
  for (const goal of goals) {
    for (const contentType of contentTypes) {
      const result = policy.decidePlatformRoute(goal, contentType)
      check(['TikTok first', 'YouTube Shorts first', 'Publish to both'].includes(result.primary), `${goal}/${contentType} has a valid route`)
      check([35, 60].includes(result.duration), `${goal}/${contentType} has a supported duration`)
      check(result.prompt.length >= 100, `${goal}/${contentType} carries a substantial starter concept`)
      check(result.reason.length >= 80, `${goal}/${contentType} explains the decision`)
      check(result.secondMove.length >= 60, `${goal}/${contentType} includes a second move`)
    }
  }

  check(policy.decidePlatformRoute('reach', 'stories').primary === 'TikTok first', 'reach starts with TikTok')
  check(policy.decidePlatformRoute('revenue', 'expertise').primary === 'YouTube Shorts first', 'revenue starts with YouTube')
  check(policy.decidePlatformRoute('customers', 'stories').primary === 'Publish to both', 'customer stories use both lanes')
  check(policy.decidePlatformRoute('customers', 'business').primary === 'YouTube Shorts first', 'business trust starts with YouTube')
  check(page.includes('<PlatformDecisionClient />'), 'the production route renders the decision client')
  check(page.indexOf('<PlatformDecisionClient />') > page.indexOf('The honest verdict'), 'the decision tool follows the editorial verdict')
  check(client.includes("trackEvent('platform_route_completed'"), 'completion is measured')
  check(client.includes("trackEvent('platform_route_cta_clicked'"), 'result CTA is measured')
  check(client.includes("trackEvent('organic_cta_clicked'"), 'result joins the canonical organic funnel')
  check(client.includes('rememberSignupCampaign(CAMPAIGN)'), 'campaign survives signup')
  check(client.includes("create_intent: 'fast'"), 'CTA enters the first-video flow')
  check(client.includes('prompt: decision.prompt'), 'starter concept travels to signup')
  check(client.includes('duration: String(decision.duration)'), 'recommended duration travels to signup')
  check(!client.includes('fetch('), 'the decision is deterministic and supplier-free')
  check(!client.includes('/api/'), 'the decision does not call an API')

  console.log(`platform-decision: ${checks}/${checks} checks passed`)
} finally {
  rmSync(output, { recursive: true, force: true })
}
