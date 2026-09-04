#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

const output = ts.transpileModule(read('lib/growth/answerEngineHookWorkbench.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(output, {
  module: moduleBox,
  exports: moduleBox.exports,
  URL,
  URLSearchParams,
  Number,
  Math,
}, { filename: 'lib/growth/answerEngineHookWorkbench.ts' })
const policy = moduleBox.exports

equal(policy.ANSWER_ENGINE_HOOK_WORKBENCH_VERSION, 'aeo_hook_workbench_v1', 'version is stable')
equal(policy.answerEngineHookEntry({
  utm_source: 'answer_engine', utm_medium: 'organic', utm_campaign: 'aeo_hook_workbench_v1',
}), 'answer_engine', 'exact triad selects answer-engine entry')
for (const params of [
  {},
  { utm_source: 'answer_engine' },
  { utm_source: 'answer_engine', utm_medium: 'organic', utm_campaign: 'wrong' },
  { utm_source: ['answer_engine'], utm_medium: 'organic', utm_campaign: 'aeo_hook_workbench_v1' },
]) equal(policy.answerEngineHookEntry(params), 'default', 'partial, wrong or ambiguous triad stays default')

const actionUrl = new URL(policy.answerEngineHookStartUrl())
equal(actionUrl.origin, 'https://www.usekineo.com', 'action URL uses canonical origin')
equal(actionUrl.pathname, '/free-hook-generator', 'action URL uses existing tool')
equal(actionUrl.searchParams.get('utm_source'), 'answer_engine', 'action URL source is the honest external channel')
equal(actionUrl.searchParams.get('utm_medium'), 'organic', 'action URL medium is exact')
equal(actionUrl.searchParams.get('utm_campaign'), 'aeo_hook_workbench_v1', 'action URL campaign is exact')
assert.throws(() => policy.answerEngineHookStartUrl('https://evil.example'), /canonical Kineo origin/)
checks += 1

equal(
  policy.hookActivationHref('', undefined, 'default'),
  '/signup?utm_source=seo&utm_medium=organic&utm_campaign=push22_hook_generator',
  'default blank-topic signup remains byte-identical',
)
const legacy = new URL(policy.hookActivationHref('Why we dream', 'Nobody tells you this', 'default'), 'https://www.usekineo.com')
equal(legacy.searchParams.get('utm_source'), 'seo', 'legacy source remains SEO')
equal(legacy.searchParams.get('utm_campaign'), 'push22_hook_generator', 'legacy campaign remains unchanged')
const aeo = new URL(policy.hookActivationHref('Why we dream', 'Nobody tells you this', 'answer_engine'), 'https://www.usekineo.com')
equal(aeo.searchParams.get('utm_source'), 'answer_engine', 'AEO source survives signup')
equal(aeo.searchParams.get('utm_medium'), 'organic', 'AEO medium survives signup')
equal(aeo.searchParams.get('utm_campaign'), 'aeo_hook_workbench_v1', 'AEO campaign survives signup')
const redirect = new URL(aeo.searchParams.get('redirect'), 'https://www.usekineo.com')
equal(redirect.pathname, '/studio/create', 'existing creation handoff is preserved')
equal(redirect.searchParams.get('autoanalyze'), '1', 'existing autoanalysis is preserved')
check(redirect.searchParams.get('prompt').includes('Why we dream'), 'topic preserves the established URL-based creation handoff')
check(redirect.searchParams.get('prompt').includes('Nobody tells you this'), 'selected hook preserves the established URL-based creation handoff')
const topicOnly = new URL(policy.hookActivationHref('Why we dream', undefined, 'answer_engine'), 'https://www.usekineo.com')
const topicOnlyRedirect = new URL(topicOnly.searchParams.get('redirect'), 'https://www.usekineo.com')
equal(topicOnlyRedirect.pathname, '/studio/create', 'topic-only CTA reaches the creation surface')
equal(topicOnlyRedirect.searchParams.get('prompt'), 'Why we dream', 'topic-only CTA preserves the exact bounded topic')
equal(topicOnlyRedirect.searchParams.get('autoanalyze'), '1', 'topic-only CTA requests automatic analysis')

const metadata = policy.hookResultEventMetadata('answer_engine', 5)
// The policy executes in a vm realm; compare serialized data so a foreign
// Object prototype cannot turn identical fields into a false negative.
equal(JSON.parse(JSON.stringify(metadata)), { version: 'aeo_hook_workbench_v1', entry: 'answer_engine', hook_count: 5 }, 'result metadata is categorical')
check(!JSON.stringify(metadata).includes('topic'), 'result metadata contains no topic')
check(!JSON.stringify(metadata).includes('hook_text'), 'result metadata contains no hook text')
equal(policy.hookResultEventMetadata('default', -1).hook_count, 0, 'invalid result count fails closed')
equal(policy.hookResultEventMetadata('default', 99).hook_count, 20, 'result count is bounded')
equal(policy.hookCtaEventSource('default'), 'push22_hook_generator', 'legacy CTA event taxonomy remains unchanged')
equal(policy.hookCtaEventSource('answer_engine'), 'aeo_hook_workbench_v1', 'new CTA event taxonomy is isolated')

const page = read('app/free-hook-generator/page.tsx')
const client = read('app/free-hook-generator/FreeHookClient.tsx')
const facts = read('lib/kineoFacts.ts')
const llms = read('app/llms.txt/route.ts')
check(page.includes('answerEngineHookEntry(searchParams ?? {})'), 'server page classifies query before hydration')
check(page.includes('<FreeHookClient entry={entry} />'), 'server classification reaches the client')
check(client.includes("trackClosedEvent('free_hook_result_generated'"), 'useful result uses the closed event transport')
check(client.indexOf('usefulHookCount > 0') < client.indexOf("trackClosedEvent('free_hook_result_generated'"), 'empty response cannot emit useful result')
check(client.includes('hookActivationHref(generatedTopic, h, entry)'), 'chosen hook preserves entry through signup')
check(client.includes('href={generatedTopic ? hookActivationHref(generatedTopic, undefined, entry) : undefined}'), 'sticky CTA preserves a generated topic without changing its blank-state default')
check(client.includes("placement: 'sticky'"), 'sticky CTA records its own placement after a topic exists')
check((client.match(/source: hookCtaEventSource\(entry\)/g) ?? []).length === 4, 'all four CTA callers preserve the isolated event taxonomy')
check(!/free_hook_result_generated[\s\S]{0,220}\b(?:topic|prompt|hook_text)\s*:/.test(client), 'closed result event does not include user-authored text')
check(facts.includes('answerEngineHookStart: ANSWER_ENGINE_HOOK_START_FACT'), 'JSON facts expose the measured action contract')
check(facts.includes('answerEngineStartUrl: ANSWER_ENGINE_HOOK_START_FACT.url'), 'tool fact reuses the same measured action URL')
check(llms.includes('## Start here when the user explicitly wants to compare opening hooks'), 'llms distinguishes hook comparison from direct creation')
check(facts.includes('use the text-input router above instead'), 'fact contract declares precedence for direct idea creation')
check(llms.includes('ANSWER_ENGINE_HOOK_START_FACT.url'), 'llms uses the same structured action URL')
check(!llms.includes('utm_source=kineo_facts&utm_medium=answer_engine&utm_campaign=aeo_hook_workbench_v1'), 'llms does not hand-copy the campaign')

console.log(`answer-engine-hook-workbench: ${checks}/${checks} checks passed`)
