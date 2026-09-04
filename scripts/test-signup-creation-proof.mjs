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
const freeScriptHandoff = executeTs('lib/growth/freeScriptSignupHandoff.ts')
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
const loginPreview = (values) => proof.buildLoginCreationPreviewFromAuthParams(new URLSearchParams(values))
check(authPreview({ redirect: remixRedirect })?.excerpt.join(' ').includes('ice caves & volcanoes'), 'outer signup query recovers the nested remix proof')
equal(authPreview({ reason: 'checkout', redirect: remixRedirect }), null, 'checkout wins even when a valid remix redirect is present')
equal(authPreview({ redirect: '/pricing', prompt: 'do not promise this' }), null, 'unrelated internal redirect suppresses top-level saved-work copy')
check(
  JSON.stringify(authPreview({ redirect: '//evil.example', prompt: 'safe direct idea' })) ===
    JSON.stringify(preview({ prompt: 'safe direct idea' })),
  'invalid redirect cannot suppress the direct creation handoff',
)

const generatedScriptPrompt = [
  'HOOK: The lighthouse flashed after its keeper vanished.',
  'MICRO REWARD 1: The logbook ended mid-sentence.',
  'ESCALATION: Ships still saw the light for three nights.',
  'PAYOFF: The mechanism had no fuel left.',
].join('\n')
const generatedScriptSignupHref = freeScriptHandoff.buildFreeScriptSignupHref([
  { label: 'HOOK', text: 'The lighthouse flashed after its keeper vanished.' },
  { label: 'FACT 1', text: 'The logbook ended mid-sentence.' },
  { label: 'FACT 3', text: 'Ships still saw the light for three nights.' },
  { label: 'PAYOFF', text: 'The mechanism had no fuel left.' },
], { source: 'seo', medium: 'organic', campaign: 'push22_script_generator' })
const generatedScriptSignup = new URL(generatedScriptSignupHref, 'https://www.usekineo.com')
const generatedScriptRedirect = generatedScriptSignup.searchParams.get('redirect')
check(generatedScriptSignup.pathname === '/signup', 'real free-script builder targets signup')
equal(generatedScriptSignup.searchParams.get('handoff_kind'), null, 'visual marker cannot leak into the outer auth query')
check(generatedScriptRedirect?.includes('handoff_kind=free_script'), 'real CTA builder nests the proof marker inside its Studio destination')
check(generatedScriptRedirect?.includes('autoanalyze=1'), 'real CTA builder preserves the existing Studio analysis handoff')
equal(
  new URL(generatedScriptRedirect ?? '/', 'https://kineo.local').searchParams.get('prompt'),
  generatedScriptPrompt,
  'real CTA builder preserves the generated script exactly',
)
const generatedScriptPreview = authPreview({ redirect: generatedScriptRedirect })
equal(generatedScriptPreview?.kind, 'script', 'free script generator receives the saved-script proof')
check(generatedScriptPreview?.excerpt[0].startsWith('HOOK:'), 'generated script proof visibly keeps the visitor hook')
equal(authPreview({ redirect: generatedScriptRedirect.replace('&handoff_kind=free_script', '') }), null, 'missing handoff marker fails closed')
equal(authPreview({ redirect: generatedScriptRedirect.replace('handoff_kind=free_script', 'handoff_kind=unknown') }), null, 'unknown handoff marker fails closed')
equal(authPreview({ redirect: generatedScriptRedirect.replace('autoanalyze=1', 'autoanalyze=0') }), null, 'non-analyzing destination cannot claim generated-script proof')
equal(authPreview({ redirect: generatedScriptRedirect.replace('/studio/create?', '/studio/create-evil?') }), null, 'generated-script proof requires the exact creation path')
equal(authPreview({ redirect: `${generatedScriptRedirect}&create_intent=fast` }), null, 'visual proof cannot authorize automatic creation')
equal(authPreview({ reason: 'checkout', redirect: generatedScriptRedirect }), null, 'checkout stays sovereign over generated-script proof')
equal(
  authPreview({ redirect: '/studio/create?prompt=HOOK%3A+one+label&autoanalyze=1&handoff_kind=free_script' }),
  null,
  'one marker cannot overclaim an idea as a generated script',
)
equal(proof.buildFreeScriptSignupPreview('//evil.example/studio/create?prompt=x'), null, 'external redirect cannot become generated-script proof')
equal(proof.buildFreeScriptSignupPreview('/\\evil.example/studio/create?prompt=x'), null, 'backslash redirect cannot become generated-script proof')
equal(handoff.readCreationHandoff(new URL(generatedScriptRedirect, 'https://kineo.local').searchParams).createIntent, null, 'free-script marker never authorizes automatic creation')

check(loginPreview({ redirect: remixRedirect })?.excerpt.join(' ').includes('ice caves & volcanoes'), 'login recovers the allow-listed example remix proof')
equal(loginPreview({ redirect: remixRedirect })?.eyebrow, 'Saved before sign-in', 'login proof names the correct auth boundary')
equal(loginPreview({ redirect: generatedScriptRedirect })?.kind, 'script', 'login recovers the allow-listed generated script proof')
equal(loginPreview({ reason: 'checkout', redirect: generatedScriptRedirect }), null, 'checkout remains sovereign on login')
equal(loginPreview({ redirect: '/studio/create?prompt=private' }), null, 'generic creation redirect cannot claim login proof')
equal(loginPreview({ redirect: '/pricing', prompt: 'do not promise this' }), null, 'unrelated login redirect cannot claim saved work')
equal(loginPreview({ redirect: '//evil.example', prompt: 'do not promise this' }), null, 'invalid login redirect cannot fall through to top-level prompt')
equal(loginPreview({ prompt: 'not transported by login' }), null, 'top-level login prompt cannot claim a handoff the login does not transport')

const freeScriptClient = read('app/free-script-generator/FreeScriptClient.tsx')
check(freeScriptClient.includes("from '@/lib/growth/freeScriptSignupHandoff'"), 'real free-script client imports the tested handoff builder')
check(/const createShortHref = buildFreeScriptSignupHref\(\s*lines,/.test(freeScriptClient), 'real free-script CTA uses the tested handoff builder result')
check(!freeScriptClient.includes('handoff_kind'), 'proof marker has no duplicate or dead-code copy in the client')
check(!/free_script_to_signup_clicked[\s\S]{0,500}(?:prompt|script):\s*(?:script|lines)/.test(freeScriptClient), 'free-script analytics never emits visitor content')

const signup = read('app/(auth)/signup/page.tsx')
const login = read('app/(auth)/login/page.tsx')
const savedCreationCard = read('components/AuthSavedCreationCard.tsx')
check(signup.includes('buildSignupCreationPreviewFromAuthParams,'), 'real signup imports the auth-query preview contract')
check(signup.includes('return buildSignupCreationPreviewFromAuthParams(params)'), 'real signup executes the auth-query preview contract')
check(signup.includes('savedCreation.kind} is ready to continue'), 'auth heading names the preserved work')
check(signup.includes('Create a free account and continue without starting over.'), 'auth copy explains continuity')
check(signup.includes('<AuthSavedCreationCard preview={savedCreation} />'), 'signup uses the shared saved-work card')
check(signup.includes('Your {savedCreation.kind} is still saved.'), 'email-confirmation state preserves reassurance')
check(signup.indexOf('{savedCreation && (') < signup.indexOf('<GoogleSignInButton'), 'proof appears before the first auth action')
check(signup.includes('carryCreationHandoff(params, activationParams)'), 'existing transport remains authoritative')
check(signup.includes('if (prompt) return `/studio/create?${activationParams.toString()}`'), 'saved work still lands on direct creation surface')
check(!signup.includes('signup_creation_handoff_viewed'), 'incident-safe delivery adds no new analytics write')
check(login.includes('buildLoginCreationPreviewFromAuthParams,'), 'real login imports its fail-closed auth-query preview contract')
check(login.includes('return buildLoginCreationPreviewFromAuthParams(params)'), 'real login executes its redirect-only preview contract')
check(/<AuthSavedCreationCard\s+preview=\{savedCreation\}/.test(login), 'login renders the shared saved-work card')
check(login.indexOf('{savedCreation && (') < login.indexOf('<GoogleSignInButton'), 'login proof appears before the first auth action')
check(!login.includes('login_creation_handoff_viewed'), 'login proof adds no new analytics write')
check(savedCreationCard.includes('aria-labelledby={headingId}'), 'shared saved-work card has an accessible label')
check(savedCreationCard.includes('Saved ${preview.kind} preview'), 'shared excerpt exposes an accessible description')
check(!savedCreationCard.includes('dangerouslySetInnerHTML'), 'shared card keeps React text escaping')

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

const freeScriptVisualPath = 'docs/previews/FLUXO-FREE-SCRIPT-SIGNUP-PROOF-2026-09-04.html'
const freeScriptVisualPngPath = 'docs/previews/FLUXO-FREE-SCRIPT-SIGNUP-PROOF-2026-09-04.png'
check(fs.existsSync(path.join(root, freeScriptVisualPath)), 'free-script before/after HTML exists')
check(fs.existsSync(path.join(root, freeScriptVisualPngPath)), 'free-script before/after PNG exists')
const freeScriptVisual = read(freeScriptVisualPath)
const freeScriptVisualUpper = freeScriptVisual.toUpperCase()
for (const label of ['BEFORE', 'AFTER', 'DESKTOP', 'MOBILE']) {
  check(freeScriptVisualUpper.includes(label), `free-script visual includes ${label.toLowerCase()}`)
}
check(freeScriptVisual.includes('Your script is ready to continue'), 'free-script visual includes the real after heading')
check(!/https?:\/\//i.test(freeScriptVisual), 'free-script visual has no external dependency')
check(fs.statSync(path.join(root, freeScriptVisualPngPath)).size > 1000, 'free-script visual PNG is non-empty')

const loginVisualPath = 'docs/previews/FLUXO-LOGIN-SAVED-CREATION-2026-09-04.html'
const loginVisualPngPath = 'docs/previews/FLUXO-LOGIN-SAVED-CREATION-2026-09-04.png'
check(fs.existsSync(path.join(root, loginVisualPath)), 'login before/after HTML exists')
check(fs.existsSync(path.join(root, loginVisualPngPath)), 'login before/after PNG exists')
const loginVisual = read(loginVisualPath)
const loginVisualUpper = loginVisual.toUpperCase()
for (const label of ['BEFORE', 'AFTER', 'DESKTOP', 'MOBILE']) {
  check(loginVisualUpper.includes(label), `login visual includes ${label.toLowerCase()}`)
}
check(loginVisual.includes('Saved before sign-in'), 'login visual includes the real proof eyebrow')
check(!/https?:\/\//i.test(loginVisual), 'login visual has no external dependency')
check(fs.statSync(path.join(root, loginVisualPngPath)).size > 1000, 'login visual PNG is non-empty')

console.log(`PASS — ${checks}/${checks} signup saved-creation checks`)
