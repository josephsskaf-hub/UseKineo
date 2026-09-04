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

function executeTs(file, mocks = {}) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import ${id}`)
    },
    URL,
    URLSearchParams,
    RegExp,
  }, { filename: file })
  return moduleBox.exports
}

const handoff = executeTs('lib/creationHandoff.ts')
const authRedirect = executeTs('lib/authRedirect.ts')
const exampleRemix = executeTs('lib/growth/exampleRemix.ts')
const proof = executeTs('lib/growth/signupCreationPreview.ts', {
  '@/lib/creationHandoff': handoff,
  '@/lib/authRedirect': authRedirect,
})
const preview = (values) => proof.buildSignupCreationPreview(new URLSearchParams(values))

equal(preview({}), null, 'no prompt produces no saved-work promise')
equal(preview({ prompt: '   ' }), null, 'whitespace prompt produces no saved-work promise')

const idea = preview({ prompt: 'Explain why the Moon has phases' })
equal(idea?.kind, 'idea', 'plain topic is classified as an idea')
equal(idea?.heading, 'Your idea is waiting', 'idea receives honest heading')
check(idea?.description.includes('pick up where you left off'), 'idea describes continuity')
equal(idea?.excerpt.join(''), 'Explain why the Moon has phases', 'idea excerpt preserves authored text')

const verbatim = preview({ prompt: 'A complete paragraph without markers.', script_mode: 'verbatim' })
equal(verbatim?.kind, 'script', 'explicit verbatim handoff is a script')

const generated = preview({
  prompt: [
    'HOOK: The lighthouse flashed after its keeper vanished.',
    'MICRO REWARD 1: The logbook ended mid-sentence.',
    'ESCALATION: Ships still saw the light for three nights.',
    'PAYOFF: The mechanism had no fuel left.',
  ].join('\n'),
})
equal(generated?.kind, 'script', 'marker-rich home preview is recognized without script_mode')
equal(generated?.excerpt.length, 3, 'preview shows at most three authored lines')
check(generated?.excerpt[0].startsWith('HOOK:'), 'preview keeps the hook label')
check(generated?.excerpt[2].startsWith('ESCALATION:'), 'preview keeps order while clipping line count')

const oneMarker = preview({ prompt: 'HOOK: A raw topic with only one accidental label' })
equal(oneMarker?.kind, 'idea', 'one marker alone does not overclaim a full script')

const long = preview({ prompt: 'x'.repeat(1000) })
check(long?.excerpt.length === 1, 'single long prompt remains one preview line')
check((long?.excerpt[0].length ?? 0) <= 120, 'each preview line is bounded')
check(long?.excerpt[0].endsWith('…'), 'clipped preview declares truncation')

const many = preview({ prompt: Array.from({ length: 8 }, (_, i) => `Line ${i + 1}: ${'word '.repeat(24)}`).join('\n') })
check((many?.excerpt.join('').length ?? 0) <= 280, 'total preview text is bounded')
check((many?.excerpt.length ?? 0) <= 3, 'total preview line count is bounded')

const hostile = '<img src=x onerror=alert(1)>'
equal(preview({ prompt: hostile })?.excerpt[0], hostile, 'helper returns plain text without interpreting markup')
check(!read('lib/growth/signupCreationPreview.ts').includes('dangerouslySetInnerHTML'), 'render contract never requests raw HTML')
check(!read('lib/growth/signupCreationPreview.ts').toLowerCase().includes('supabase'), 'preview helper has no Supabase dependency')
check(!read('lib/growth/signupCreationPreview.ts').includes('/api/'), 'preview helper has no API dependency')

const remixRedirect = exampleRemix.exampleRemixHref({
  slug: 'north-sentinel-island',
  referencePrompt: 'Create a fast-paced faceless Short about North Sentinel Island, with a strong curiosity hook.',
  topic: 'ice caves & volcanoes',
})
const remixPreview = proof.buildExampleRemixSignupPreview(remixRedirect)
equal(remixPreview?.kind, 'idea', 'example remix remains an editable AI idea')
check(remixPreview?.excerpt.join(' ').includes('ice caves & volcanoes'), 'nested auth redirect visibly confirms the visitor topic')
const encodedSignup = new URL(`/signup?${new URLSearchParams({ redirect: remixRedirect })}`, 'https://www.usekineo.com')
check(proof.buildExampleRemixSignupPreview(encodedSignup.searchParams.get('redirect'))?.excerpt.join(' ').includes('ice caves & volcanoes'), 'real nested signup encoding preserves punctuation')
const unicodeRedirect = exampleRemix.exampleRemixHref({
  slug: 'north-sentinel-island',
  referencePrompt: 'Create a fast-paced faceless Short about North Sentinel Island, with a strong curiosity hook.',
  topic: 'vulcões "Azuis" #7 at 50%',
})
const unicodeSignup = new URL(`/signup?${new URLSearchParams({ redirect: unicodeRedirect })}`, 'https://www.usekineo.com')
check(proof.buildExampleRemixSignupPreview(unicodeSignup.searchParams.get('redirect'))?.excerpt.join(' ').includes('vulcões "Azuis" #7 at 50%'), 'double encoding preserves Unicode, quotes, hash and percent')
equal(proof.buildExampleRemixSignupPreview('/studio/create?prompt=private'), null, 'generic creation redirect cannot claim example-remix proof')
equal(proof.buildExampleRemixSignupPreview('//evil.example/studio/create?prompt=x'), null, 'external redirect cannot become a saved-work preview')
equal(proof.buildExampleRemixSignupPreview('/\\evil.example/studio/create?prompt=x'), null, 'backslash redirect cannot become a saved-work preview')
for (const [label, changed] of [
  ['path', remixRedirect.replace('/studio/create?', '/studio/create-evil?')],
  ['intent', remixRedirect.replace('create_intent=example_remix', 'create_intent=fast')],
]) {
  equal(proof.buildExampleRemixSignupPreview(changed), null, `${label} mismatch fails closed`)
}
check(
  JSON.stringify(proof.buildExampleRemixSignupPreview('/studio/create?prompt=ice+caves&create_intent=example_remix')) ===
    JSON.stringify(preview({ prompt: 'ice caves' })),
  'analytics parameters are not an authority for whether saved work is visible',
)
const blankRemix = new URL(remixRedirect, 'https://kineo.local')
blankRemix.searchParams.set('prompt', '   ')
equal(proof.buildExampleRemixSignupPreview(`${blankRemix.pathname}${blankRemix.search}`), null, 'blank nested prompt cannot claim saved work')
equal(handoff.readCreationHandoff(new URL(remixRedirect, 'https://kineo.local').searchParams).createIntent, null, 'example-remix marker never authorizes automatic creation')
const authPreview = (values) => proof.buildSignupCreationPreviewFromAuthParams(new URLSearchParams(values))
check(authPreview({ redirect: remixRedirect })?.excerpt.join(' ').includes('ice caves & volcanoes'), 'outer signup query recovers the nested remix proof')
equal(authPreview({ reason: 'checkout', redirect: remixRedirect }), null, 'checkout wins even when a valid remix redirect is present')
equal(authPreview({ redirect: '/pricing', prompt: 'do not promise this' }), null, 'unrelated internal redirect suppresses top-level saved-work copy')
check(
  JSON.stringify(authPreview({ redirect: '//evil.example', prompt: 'safe direct idea' })) ===
    JSON.stringify(preview({ prompt: 'safe direct idea' })),
  'invalid redirect cannot suppress the direct creation handoff',
)

const signup = read('app/(auth)/signup/page.tsx')
check(signup.includes('buildSignupCreationPreviewFromAuthParams,'), 'real signup imports the auth-query preview contract')
check(signup.includes('return buildSignupCreationPreviewFromAuthParams(params)'), 'real signup executes the auth-query preview contract')
check(signup.includes('savedCreation.kind} is ready to continue'), 'auth heading names the preserved work')
check(signup.includes('Create a free account and continue without starting over.'), 'auth copy explains continuity')
check(signup.includes('aria-labelledby="saved-creation-heading"'), 'saved-work card has an accessible label')
check(signup.includes('Saved ${savedCreation.kind} preview'), 'excerpt exposes an accessible description')
check(signup.includes('Your {savedCreation.kind} is still saved.'), 'email-confirmation state preserves reassurance')
check(signup.indexOf('{savedCreation && (') < signup.indexOf('<GoogleSignInButton'), 'proof appears before the first auth action')
check(signup.includes('carryCreationHandoff(params, activationParams)'), 'existing transport remains authoritative')
check(signup.includes('if (prompt) return `/studio/create?${activationParams.toString()}`'), 'saved work still lands on direct creation surface')
check(!signup.includes('signup_creation_handoff_viewed'), 'incident-safe delivery adds no new analytics write')

const home = read('app/HomeTopicForm.tsx')
check(home.includes('buildActivationPrompt(lines)'), 'home still hands off the generated script')
check(home.includes("prompt,"), 'home signup URL still carries the generated script')
check(home.includes("fetch('/api/demo-script'"), 'home still delivers value before auth')

const visualPath = 'docs/previews/SIGNUP-SAVED-CREATION-2026-08-28.html'
check(fs.existsSync(path.join(root, visualPath)), 'self-contained visual comparison exists')
const visual = read(visualPath)
for (const label of ['BEFORE', 'AFTER', 'DESKTOP', 'MOBILE', 'SCRIPT', 'IDEA']) {
  check(visual.includes(label), `visual comparison includes ${label.toLowerCase()}`)
}
check(!/https?:\/\//i.test(visual), 'visual comparison has no external dependency')

console.log(`PASS — ${checks}/${checks} signup saved-creation checks`)
