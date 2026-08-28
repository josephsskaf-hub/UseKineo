#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const filename = join(root, rel)
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(() => {
    throw new Error(`${rel} imported an unexpected module`)
  }, module, module.exports)
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const policy = loadTs('lib/growth/originalityRecipe.ts')
const page = source('app/can-you-monetize-ai-videos/page.tsx')
const client = source('app/can-you-monetize-ai-videos/OriginalityRecipeBuilder.tsx')

equal(policy.ORIGINALITY_RECIPE_OPTIONS.length, 4, 'four distinct viewer-value recipes are offered')
equal(policy.cleanOriginalityTopic('  dream   memory  '), 'dream memory', 'topic whitespace is normalized')
equal(policy.cleanOriginalityTopic('x'.repeat(250)).length, 180, 'topic is bounded to the form contract')
equal(policy.buildOriginalityPrompt('', 'myth_vs_fact'), '', 'empty topic cannot invent a prompt')

for (const option of policy.ORIGINALITY_RECIPE_OPTIONS) {
  const prompt = policy.buildOriginalityPrompt('why memory changes', option.id)
  ok(prompt.includes('why memory changes'), `${option.id} preserves the author topic`)
  ok(prompt.includes(option.direction), `${option.id} carries the selected creative direction`)
  ok(prompt.includes('Do not claim that monetization is guaranteed.'), `${option.id} preserves the commercial truth boundary`)
}

ok(page.includes("import OriginalityRecipeBuilder from './OriginalityRecipeBuilder'"), 'server page imports the builder')
equal((page.match(/<OriginalityRecipeBuilder \/>/g) ?? []).length, 1, 'builder renders exactly once')
ok(page.indexOf('<OriginalityRecipeBuilder />') < page.indexOf('The disclosure rule you should know about'), 'builder appears after the policy checklist and before the long article body')
ok(page.includes('href="#monetization-originality-builder"'), 'lower CTA returns to the in-page tool')
ok(page.includes('analyticsEvent="organic_handoff_opened"'), 'in-page handoff is measured separately from conversion intent')
ok(!page.includes('href="/free-ai-shorts-generator?utm_source=monetize-policy'), 'legacy circuit to another SEO page is removed')

ok(client.includes('action="/signup"'), 'tool hands directly to signup')
ok(client.includes('name="create_intent" value="fast"'), 'tool carries a first-video creation intent')
ok(client.includes('name="duration" value="45"'), 'tool carries the promised 45-second contract')
ok(client.includes("rememberSignupCampaign(CAMPAIGN)"), 'campaign survives OAuth handoff')
ok(client.includes("trackEvent('organic_topic_submitted'"), 'typed intent enters the organic funnel')
ok(client.includes("mirrors: 'organic_topic_submitted'"), 'legacy CTA mirror remains deduplicable')
ok(client.includes("trackEvent('monetization_originality_recipe_submitted'"), 'experiment has its own outcome event')
ok(client.includes('no tool can guarantee YouTube monetization'), 'interface states the non-guarantee')

console.log(`\n${checks}/${checks} monetization originality builder checks passed`)
