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
    URLSearchParams,
    RegExp,
  }, { filename: file })
  return moduleBox.exports
}

const handoff = executeTs('lib/creationHandoff.ts')
const proof = executeTs('lib/growth/signupCreationPreview.ts', {
  '@/lib/creationHandoff': handoff,
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

const signup = read('app/(auth)/signup/page.tsx')
check(signup.includes("import { buildSignupCreationPreview } from '@/lib/growth/signupCreationPreview'"), 'real signup imports executable preview contract')
check(signup.includes('return buildSignupCreationPreview(params)'), 'real signup executes preview contract')
check(signup.includes("if (isCheckoutResume || normalizeInternalRedirect(params.get('redirect'))) return null"), 'checkout and explicit redirect suppress false saved-work promises')
check(signup.includes('savedCreation.kind} is ready to continue'), 'auth heading names the preserved work')
check(signup.includes('Create a free account and continue without starting over.'), 'auth copy explains continuity')
check(signup.includes('aria-labelledby="saved-creation-heading"'), 'saved-work card has an accessible label')
check(signup.includes('Saved ${savedCreation.kind} preview'), 'excerpt exposes an accessible description')
check(signup.includes('Your {savedCreation.kind} is still saved.'), 'email-confirmation state preserves reassurance')
check(signup.indexOf('{savedCreation && (') < signup.indexOf('<GoogleSignInButton'), 'proof appears before the first auth action')
check(signup.includes('carryCreationHandoff(params, activationParams)'), 'existing transport remains authoritative')
check(signup.includes('if (prompt) return `/generate?${activationParams.toString()}`'), 'saved work still lands on creation surface')
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
