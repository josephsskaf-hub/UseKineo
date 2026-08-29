import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const repo = process.cwd()
const out = mkdtempSync(join(tmpdir(), 'kineo-local-business-'))
const require = createRequire(import.meta.url)
let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks += 1 }
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }

try {
  const tsc = require.resolve('typescript/bin/tsc')
  execFileSync(process.execPath, [tsc,
    'lib/growth/localBusinessAdBrief.ts',
    'lib/toolActivationHref.ts',
    'lib/creationHandoff.ts',
    'lib/authRedirect.ts',
    '--outDir', out,
    '--rootDir', 'lib',
    '--module', 'commonjs',
    '--target', 'ES2020',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
  ], { cwd: repo, stdio: 'pipe' })

  const brief = require(join(out, 'growth', 'localBusinessAdBrief.js'))
  const { toolActivationHref } = require(join(out, 'toolActivationHref.js'))
  const { readCreationHandoff } = require(join(out, 'creationHandoff.js'))
  const { normalizeInternalRedirect } = require(join(out, 'authRedirect.js'))

  const empty = { businessName: '', service: '', audience: '', proof: '', callToAction: '' }
  equal(brief.localBusinessBriefIsComplete(empty), false, 'empty brief is not complete')
  equal(brief.buildLocalBusinessAdBrief(empty).script, '', 'empty brief cannot manufacture a script')

  const minimum = {
    businessName: 'Ace',
    service: 'roofing',
    audience: 'homeowners',
    proof: 'licensed',
    callToAction: 'Call',
  }
  const minResult = brief.buildLocalBusinessAdBrief(minimum)
  check(minResult.spokenWords >= 77, 'short inputs still clear the canonical 35-second narration floor')
  check(minResult.spokenWords <= 84, 'short inputs do not become a padded long ad')
  check(minResult.estimatedSeconds >= 33.4 && minResult.estimatedSeconds <= 36.6, 'short input duration stays near 35 seconds')

  const maximum = {
    businessName: 'North Star Roofing Company Extra Words',
    service: 'same day roof leak inspections for every building',
    audience: 'homeowners in Austin with urgent storm damage',
    proof: 'licensed team written quote before work starts with no surprises',
    callToAction: 'Book your free inspection at northstarroofing dot com today',
  }
  const maxResult = brief.buildLocalBusinessAdBrief(maximum)
  check(maxResult.spokenWords >= 77, 'maximum input stays above the 35-second floor')
  check(maxResult.spokenWords <= 84, 'word caps keep maximum input near 35 seconds')
  check(maxResult.script.length <= 600, 'script fits the canonical activation URL payload')
  check(maxResult.script.includes('North Star Roofing Company'), 'business name survives verbatim within its visible word cap')
  check(!maxResult.script.includes('Extra Words'), 'business field enforces its visible four-word cap')
  check(maxResult.script.includes('licensed team written quote before work starts'), 'proof supplied by the visitor survives')
  check(!/guaranteed|\$|percent|testimonial/i.test(maxResult.script), 'builder introduces no guarantee, money claim, percentage or testimonial')

  for (const marker of ['HOOK:', 'MICRO REWARD 1:', 'MICRO REWARD 2:', 'ESCALATION:', 'PAYOFF:']) {
    check(maxResult.script.includes(marker), `${marker} remains explicit for the verbatim parser`)
  }

  const measured = brief.measureLocalBusinessAdScript(maxResult.script)
  equal(measured.spokenWords, maxResult.spokenWords, 'editable-script measurement uses the same word ruler')
  equal(measured.estimatedSeconds, maxResult.estimatedSeconds, 'editable-script duration uses the same ruler')
  equal(brief.localBusinessBriefIsComplete(maximum), true, 'complete long inputs remain complete after caps')
  equal(brief.limitLocalBusinessField('service', maximum.service).split(/\s+/).length, 6, 'service input is visibly limited to six words')

  const href = toolActivationHref({
    prompt: maxResult.script,
    campaign: 'growth_local_business_brief_20260828',
    autoanalyze: true,
    scriptMode: 'verbatim',
    duration: 35,
  })
  const signup = new URL(href, 'https://www.usekineo.com')
  equal(signup.pathname, '/signup', 'draft continues through signup')
  equal(signup.searchParams.get('utm_campaign'), 'growth_local_business_brief_20260828', 'B2B cohort has its own campaign')
  const destination = new URL(signup.searchParams.get('redirect'), 'https://www.usekineo.com')
  equal(destination.pathname, '/generate', 'approved draft reaches the editor, not checkout or render')
  equal(destination.searchParams.get('prompt'), maxResult.script, 'exact draft survives the signup redirect')
  equal(destination.searchParams.get('script_mode'), 'verbatim', 'editor receives the draft in verbatim mode')
  equal(destination.searchParams.get('duration'), '35', 'editor opens the matching 35-second preset')
  equal(destination.searchParams.get('autoanalyze'), '1', 'editor may analyze but does not auto-render')
  equal(destination.searchParams.has('create_intent'), false, 'business brief never auto-starts a charged generation')
  equal(normalizeInternalRedirect(signup.searchParams.get('redirect')), `${destination.pathname}${destination.search}`, 'signup accepts the destination as same-origin')
  equal(readCreationHandoff(destination.searchParams), {
    prompt: maxResult.script,
    createIntent: null,
    scriptMode: 'verbatim',
    duration: 35,
  }, 'the real authenticated editor parser restores the exact safe contract')

  const page = readFileSync(join(repo, 'app/free-ai-shorts/[niche]/page.tsx'), 'utf8')
  const component = readFileSync(join(repo, 'app/free-ai-shorts/[niche]/LocalBusinessAdBrief.tsx'), 'utf8')
  const generateClient = readFileSync(join(repo, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
  const signupPage = readFileSync(join(repo, 'app/(auth)/signup/page.tsx'), 'utf8')
  check(page.includes("params.niche === 'localbusiness'"), 'page scopes the business builder to the proven local-business niche')
  check(page.includes('<LocalBusinessAdBrief />'), 'real landing page calls the builder')
  check(page.includes('<TopicGeneratorForm') && page.includes('isLocalBusiness ?'), 'other 29 niches keep their existing starter')
  check(component.includes("scriptMode: 'verbatim'"), 'client sends the approved draft verbatim')
  check(component.includes('duration: 35'), 'client requests the measured 35-second preset')
  check(component.includes('Review every claim'), 'client tells the business owner to verify claims')
  check(component.includes('nothing is generated or charged'), 'client states the no-side-effect boundary before signup')
  check(!/fetch\(|trackEvent|supabase|create_intent/.test(component), 'builder has no API, analytics, Supabase or auto-render call')
  check(!/fetch\(|trackEvent|supabase|render/.test(readFileSync(join(repo, 'lib/growth/localBusinessAdBrief.ts'), 'utf8')), 'brief algorithm is browser-only')
  check(signupPage.includes("const explicitRedirect = normalizeInternalRedirect(params.get('redirect'))"), 'the real signup caller validates and prioritizes the saved destination')
  check(generateClient.includes("const initialPrompt = searchParams.get('prompt')"), 'the real editor initializes from the carried draft')
  check(generateClient.includes('if (handoff.scriptMode) setScriptMode(handoff.scriptMode)'), 'the real editor applies verbatim mode')
  check(generateClient.includes('if (handoff.duration) setDuration(handoff.duration)'), 'the real editor applies the 35-second preset')
  check(generateClient.includes("const auto = searchParams?.get('autoanalyze') === '1'"), 'the real editor recognizes the bounded analysis trigger')
  check(generateClient.includes("if (activationContract.createIntent !== 'fast') return"), 'the real charged-autostart caller rejects this no-intent handoff')

  console.log(`local-business-ad-brief: ${checks}/${checks} checks passed`)
} finally {
  rmSync(out, { recursive: true, force: true })
}
