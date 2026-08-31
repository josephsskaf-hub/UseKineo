import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const repo = process.cwd()
const read = (path) => readFileSync(join(repo, path), 'utf8')
let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks += 1 }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1 }

const output = mkdtempSync(join(tmpdir(), 'kineo-home-one-video-'))
const tscCandidates = [
  join(repo, 'node_modules', 'typescript', 'bin', 'tsc'),
  join(repo, '..', '..', '..', 'node_modules', 'typescript', 'bin', 'tsc'),
]
const tsc = tscCandidates.find(existsSync)
check(Boolean(tsc), 'TypeScript compiler is available in the checkout or canonical root')
execFileSync(process.execPath, [
  tsc,
  join(repo, 'lib', 'growth', 'homeOneVideoReturn.ts'),
  '--outDir', output,
  '--module', 'commonjs',
  '--target', 'es2022',
  '--moduleResolution', 'node',
  '--skipLibCheck',
], { stdio: 'pipe' })
writeFileSync(join(output, 'package.json'), JSON.stringify({ type: 'commonjs' }))
const requireCompiled = createRequire(join(output, 'test.cjs'))
const { decideHomeOneVideoReturn } = requireCompiled(join(output, 'homeOneVideoReturn.js'))

const base = { signedIn: true, historyReliable: true, completedCount: 1, isPro: false, plan: 'free' }
equal(decideHomeOneVideoReturn({ ...base, signedIn: false }).reason, 'anonymous', 'runtime: anonymous is hidden')
equal(decideHomeOneVideoReturn({ ...base, isPro: true }).reason, 'subscriber', 'runtime: isPro is hidden')
equal(decideHomeOneVideoReturn({ ...base, plan: 'creator' }).reason, 'subscriber', 'runtime: paid plan name is hidden')
equal(decideHomeOneVideoReturn({ ...base, historyReliable: false }).reason, 'history_unavailable', 'runtime: unreliable history fails closed')
equal(decideHomeOneVideoReturn({ ...base, completedCount: null }).reason, 'history_unavailable', 'runtime: missing count fails closed')
equal(decideHomeOneVideoReturn({ ...base, completedCount: 0 }).reason, 'not_one_video', 'runtime: zero completed is hidden')
equal(decideHomeOneVideoReturn({ ...base, completedCount: 2 }).reason, 'not_one_video', 'runtime: two completed is hidden')
const eligible = decideHomeOneVideoReturn(base)
check(eligible.eligible === true, 'runtime: exactly one completed video is eligible')
equal(eligible.href, '/history', 'runtime: eligible user goes to the existing history rail')
equal(eligible.destination, 'history_milestone', 'runtime: destination is explicitly classified')
rmSync(output, { recursive: true, force: true })

const policy = read('lib/growth/homeOneVideoReturn.ts')
const component = read('components/HomeOneVideoReturnBridge.tsx')
const home = read('app/KineoLanding.tsx')

check(policy.includes("HOME_ONE_VIDEO_RETURN_VERSION = 'home_one_video_return_v1'"), 'policy has a stable version')
check(policy.includes("HOME_ONE_VIDEO_RETURN_HREF = '/history'"), 'bridge uses the existing history milestone')
check(policy.includes("if (!input.signedIn)"), 'anonymous visitors are ineligible')
check(policy.includes("if (input.isPro ||"), 'active subscribers are ineligible')
check(policy.includes("normalizedPlan !== 'free'"), 'non-free plan names are ineligible')
check(policy.includes('!input.historyReliable'), 'unreliable history fails closed')
check(policy.includes('input.completedCount !== 1'), 'only exactly one completed video is eligible')
check(policy.includes("destination: 'history_milestone'"), 'decision names the existing downstream rail')

check(component.includes("fetch('/api/videos'"), 'component reads owner-scoped completed count')
check(component.includes("fetch('/api/me/plan'"), 'component excludes active plans with server evidence')
check(component.includes('Promise.all(['), 'independent reads run in parallel')
check(component.includes('controller.abort()'), 'client reads abort on unmount')
check(component.includes('const VIEW_THRESHOLD = 0.5'), 'impression requires 50 percent visibility')
check(component.includes("'home_one_video_return_viewed'"), 'component emits the impression')
check(component.includes("'home_one_video_return_clicked'"), 'component emits the click')
check(component.includes('const stored = await trackEvent'), 'impression waits for storage result')
check(component.indexOf('const stored = await trackEvent') < component.indexOf("window.sessionStorage.setItem(marker, '1')"), 'session marker is written only after stored true')
check(component.includes('const viewedInMemory = new Set<string>()'), 'remounts are guarded in memory')
check(component.includes('const viewInFlight = new Set<string>()'), 'observer races are guarded')
check(component.includes('viewed:${version}:${actorKey}'), 'dedupe key is scoped to the signed-in actor without sending it')
check(component.includes('You review the next idea before anything generates.'), 'copy preserves the explicit review boundary')
check(component.includes('new hook, new facts and a fresh payoff'), 'copy matches the existing continuation contract')
check(component.includes('href={decision.href}'), 'CTA uses the policy destination')

check(home.includes("import HomeOneVideoReturnBridge from '@/components/HomeOneVideoReturnBridge'"), 'live home imports the bridge')
equal((home.match(/<HomeOneVideoReturnBridge actorKey=\{initialUser\?\.id \?\? null\} \/>/g) ?? []).length, 1, 'live home mounts one actor-scoped bridge')
check(home.indexOf('<HomeOneVideoReturnBridge actorKey={initialUser?.id ?? null} />') > home.indexOf('<HomeWelcomeGoalRouter />'), 'return bridge stays after the post-signup router')
check(home.indexOf('<HomeOneVideoReturnBridge actorKey={initialUser?.id ?? null} />') < home.indexOf('{referralBridge ? ('), 'return bridge stays before the signed-out referral bridge')

for (const forbidden of ['email:', 'title:', 'prompt:', 'script:', 'video_id:', 'video_url:']) {
  check(!component.includes(forbidden), `telemetry does not contain ${forbidden}`)
}

console.log(`home-one-video-return: ${checks}/${checks} checks passed`)
