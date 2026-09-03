#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }
const deepEqual = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(() => {
    throw new Error(`${path}: unexpected import`)
  }, module, module.exports)
  return module.exports
}

const journey = loadTs('lib/growth/agencyHeaderJourney.ts')
const authRedirect = loadTs('lib/authRedirect.ts')

equal(journey.AGENCY_HEADER_STUDIO_VERSION, 'agency_header_studio_v1', 'campaign is stable')
equal(journey.AGENCY_HEADER_STUDIO_EVENT, 'agency_header_studio_clicked', 'Studio event is stable')
equal(journey.AGENCY_HEADER_SIGNIN_EVENT, 'agency_header_signin_clicked', 'sign-in diagnostic event is separate')

const studio = new URL(journey.AGENCY_HEADER_STUDIO_HREF, 'https://www.usekineo.com')
equal(studio.pathname, '/studio', 'signed-in CTA keeps its product destination')
equal(studio.searchParams.get('intent_campaign'), journey.AGENCY_HEADER_STUDIO_VERSION, 'Studio receives the exact campaign')
equal([...studio.searchParams.keys()].length, 1, 'Studio URL carries only the campaign')

const login = new URL(journey.AGENCY_HEADER_LOGIN_HREF, 'https://www.usekineo.com')
equal(login.pathname, '/login', 'signed-out CTA keeps the auth boundary')
equal(login.searchParams.get('redirect'), journey.AGENCY_HEADER_RETURN_HREF, 'login returns to the agency page as before')
equal(
  authRedirect.normalizeInternalRedirect(login.searchParams.get('redirect')),
  journey.AGENCY_HEADER_RETURN_HREF,
  'auth allowlist accepts the encoded internal return',
)

deepEqual(journey.agencyHeaderStudioMetadata(), {
  version: journey.AGENCY_HEADER_STUDIO_VERSION,
  intent_campaign: journey.AGENCY_HEADER_STUDIO_VERSION,
  surface: 'ai_shorts_for_agencies',
  placement: 'header',
  destination: 'studio',
  auth_state: 'signed_in',
}, 'Studio metadata is closed and categorical')
deepEqual(journey.agencyHeaderSignInMetadata(), {
  version: journey.AGENCY_HEADER_STUDIO_VERSION,
  intent_campaign: journey.AGENCY_HEADER_STUDIO_VERSION,
  surface: 'ai_shorts_for_agencies',
  placement: 'header',
  destination: 'login',
  auth_state: 'signed_out',
}, 'sign-in metadata is separate and categorical')

const caller = read('app/ai-shorts-for-agencies/AgencyHeaderCta.tsx')
ok(caller.includes('trackClosedEvent('), 'caller uses the privacy-bounded event writer')
ok(!caller.includes('trackEvent('), 'caller never uses the free-form event writer')
ok(caller.includes('AGENCY_HEADER_STUDIO_HREF'), 'signed-in caller uses canonical href')
ok(caller.includes('AGENCY_HEADER_LOGIN_HREF'), 'signed-out caller preserves its existing return behavior')
ok(caller.includes('agencyHeaderStudioMetadata()'), 'signed-in click uses the Studio-only contract')
ok(caller.includes('agencyHeaderSignInMetadata()'), 'signed-out click uses a distinct diagnostic contract')
ok(caller.includes("useState<'checking' | 'signed_in' | 'signed_out'>('checking')"), 'authentication starts unknown')
ok(caller.includes("r.status === 401 || r.status === 403"), 'only explicit auth rejection becomes signed out')
ok(caller.includes("authState === 'signed_out'"), 'unknown auth state never emits a sign-in event')

const serialized = JSON.stringify({
  signedIn: journey.agencyHeaderStudioMetadata(),
  signedOut: journey.agencyHeaderSignInMetadata(),
})
for (const forbidden of ['email', 'prompt', 'topic', 'url', 'user_id', 'session_id']) {
  ok(!serialized.includes(forbidden), `metadata excludes ${forbidden}`)
}

console.log(`agency header journey: ${checks}/${checks}`)
