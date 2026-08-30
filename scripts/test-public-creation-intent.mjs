#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')

let checks = 0
function ok(value, label) {
  assert.ok(value, label)
  checks += 1
}
function equal(actual, expected, label) {
  assert.equal(actual, expected, label)
  checks += 1
}

const output = ts.transpileModule(read('lib/growth/publicCreationIntent.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: 'publicCreationIntent.ts',
}).outputText
const moduleBox = { exports: {} }
new Function('module', 'exports', 'URLSearchParams', output)(moduleBox, moduleBox.exports, URLSearchParams)
const intent = moduleBox.exports

const blank = new URL(intent.buildBlankStudioSignupHref({ campaign: 'seo_blank_test' }), 'https://www.usekineo.com')
equal(blank.pathname, '/signup', 'blank start begins at signup')
equal(blank.searchParams.get('utm_source'), 'seo', 'blank start keeps SEO source')
equal(blank.searchParams.get('utm_medium'), 'organic', 'blank start keeps organic medium')
equal(blank.searchParams.get('utm_campaign'), 'seo_blank_test', 'blank start keeps campaign')
equal(blank.searchParams.get('intent_campaign'), 'seo_blank_test', 'blank start exposes bounded signup intent')
equal(blank.searchParams.has('prompt'), false, 'blank start does not invent work')
equal(blank.searchParams.has('create_intent'), false, 'blank start never claims automatic creation')

const blankDestination = new URL(blank.searchParams.get('redirect'), 'https://www.usekineo.com')
equal(blankDestination.pathname, '/studio', 'blank start crosses auth into Studio')
equal(blankDestination.searchParams.get('engine'), 'fast', 'blank start selects the free engine')
equal(blankDestination.searchParams.get('intent_campaign'), 'seo_blank_test', 'blank start preserves campaign in Studio')
equal(blankDestination.searchParams.has('create_intent'), false, 'Studio waits for the visitor')

const prompted = new URL(intent.buildPromptedFastSignupHref({
  prompt: '  Explain why the Moon has phases  ',
  campaign: 'seo_prompted_test',
  utmSource: 'chatgpt.com',
}), 'https://www.usekineo.com')
equal(prompted.pathname, '/signup', 'prompted start begins at signup')
equal(prompted.searchParams.get('prompt'), 'Explain why the Moon has phases', 'prompted start preserves authored work')
equal(prompted.searchParams.get('create_intent'), 'fast', 'prompted start may request Fast creation')
equal(prompted.searchParams.get('intent_campaign'), 'seo_prompted_test', 'prompted start preserves campaign')
equal(prompted.searchParams.get('utm_source'), 'chatgpt.com', 'prompted start preserves bounded source')
equal(prompted.searchParams.get('utm_medium'), 'organic', 'prompted start defaults organic medium')
equal(prompted.searchParams.has('redirect'), false, 'prompted start uses the established creation handoff')

const trialBest = new URL(intent.buildPromptedSignupHref({
  prompt: 'The mystery beneath the ice',
  campaign: 'seo_trial_best_test',
  creationIntent: 'trial_best',
}), 'https://www.usekineo.com')
equal(trialBest.searchParams.get('prompt'), 'The mystery beneath the ice', 'trial-best start preserves authored work')
equal(trialBest.searchParams.get('create_intent'), 'trial_best', 'trial-best start requests the eligible premium rail')
equal(trialBest.searchParams.get('intent_campaign'), 'seo_trial_best_test', 'trial-best start preserves campaign')

assert.throws(
  () => intent.buildPromptedFastSignupHref({ prompt: '   ', campaign: 'bad' }),
  /prompt_required_for_fast_creation/,
  'empty automatic creation fails closed',
)
checks += 1

const bounded = new URL(intent.buildBlankStudioSignupHref({
  campaign: 'bad campaign&redirect=https://evil.example',
  utmSource: 'bad source',
  utmMedium: '../bad',
}), 'https://www.usekineo.com')
equal(bounded.searchParams.get('utm_campaign'), 'organic_creation', 'unsafe campaign falls back')
equal(bounded.searchParams.get('utm_source'), 'seo', 'unsafe source falls back')
equal(bounded.searchParams.get('utm_medium'), 'organic', 'unsafe medium falls back')
ok(bounded.searchParams.get('redirect').startsWith('/studio?'), 'redirect remains internal')

const blankPages = [
  'app/faceless-video-generator/page.tsx',
  'app/free-ai-shorts-generator/page.tsx',
  'app/text-to-video-shorts/page.tsx',
]
for (const path of blankPages) {
  const source = read(path)
  ok(source.includes("from '@/lib/growth/publicCreationIntent'"), `${path}: imports the shared contract`)
  ok(source.includes('buildBlankStudioSignupHref({ campaign: CAMPAIGN })'), `${path}: blank CTA uses the Studio handoff`)
  equal((source.match(/href=\{signupUrl\}/g) ?? []).length, 1, `${path}: exactly one secondary blank-start CTA uses it`)
  ok(!source.includes('create_intent=fast'), `${path}: no promptless automatic intent remains`)
}

const pair = read('app/vs/[pair]/page.tsx')
ok(pair.includes('const START_FREE_URL = buildBlankStudioSignupHref({ campaign: CAMPAIGN })'), 'comparison pairs build one safe destination')
ok(pair.includes('href={START_FREE_URL}'), 'comparison CTA uses that destination')
ok(!pair.includes('/signup?create_intent=fast'), 'comparison CTA no longer loses automatic intent')

const niches = read('app/free-ai-shorts/[niche]/page.tsx')
ok(niches.includes('buildPromptedSignupHref({'), 'thirty niche pages use the prompted contract')
ok(niches.includes('prompt: idea'), 'the selected niche idea is mandatory input')
ok(niches.includes("creationIntent: OFFER.reverseTrial ? 'trial_best' : 'fast'"), 'niche ideas follow the active offer atomically')
// The declaration is `signupUrlForIdea =`, so this count deliberately covers
// only the three real callers: hero, repeated idea card and final CTA.
equal((niches.match(/signupUrlForIdea\(/g) ?? []).length, 3, 'hero, idea list and final stay attached to a real idea')
ok(!niches.includes('const signupUrl ='), 'no promptless base URL can escape by itself')

const alternatives = read('app/alternatives/[competitor]/page.tsx')
ok(alternatives.includes("? '#try-quso-alternative-topic'"), 'Quso keeps visitors on its existing form')
ok(alternatives.includes(': buildBlankStudioSignupHref({ campaign })'), 'other alternatives cross auth into Studio')
// The baseline gained a third legitimate reuse in the free-answer block
// (commit 772df74). This test previously counted only final + sticky and was
// already red before this change; assert every current caller instead.
equal((alternatives.match(/href=\{signupUrl\}/g) ?? []).length, 3, 'free-answer, final and sticky CTAs share the safe destination')
ok(alternatives.includes('const heroCtaUrl = isQuso ?'), 'hero preserves the Quso form split')
ok(!alternatives.includes('create_intent=fast'), 'alternative pages never auto-create without work')

const signupPage = read('app/(auth)/signup/page.tsx')
ok(signupPage.includes("const explicitRedirect = normalizeInternalRedirect(params.get('redirect'))"), 'signup validates the Studio redirect')
ok(signupPage.includes('if (explicitRedirect) return explicitRedirect'), 'signup gives the explicit destination priority')
const studio = read('app/(dashboard)/studio/StudioClient.tsx')
ok(studio.includes("const e = sp.get('engine')"), 'Studio reads the selected free engine')
ok(studio.includes("const ic = sp.get('intent_campaign')"), 'Studio reads the campaign')

function sourceFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry)
    if (statSync(absolute).isDirectory()) files.push(...sourceFiles(absolute))
    else if (/\.(?:ts|tsx)$/.test(entry)) files.push(absolute)
  }
  return files
}

for (const absolute of sourceFiles(join(root, 'app'))) {
  const relative = absolute.slice(root.length + 1).replaceAll('\\', '/')
  for (const [index, line] of readFileSync(absolute, 'utf8').split(/\r?\n/).entries()) {
    if (!line.includes('/signup?') || !line.includes('create_intent=fast')) continue
    ok(line.includes('prompt'), `${relative}:${index + 1}: direct automatic signup URL carries prompt on the same line`)
  }
}

const preview = read('docs/previews/PUBLIC-CREATION-INTENT-2026-08-28.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label}`)
}
ok(preview.includes('Idea exists'), 'preview explains the prompted branch')
ok(preview.includes('No idea yet'), 'preview explains the blank branch')
ok(preview.includes('No automatic render'), 'preview states the spend boundary')

console.log(`public creation intent: ${checks}/${checks} checks passed`)
