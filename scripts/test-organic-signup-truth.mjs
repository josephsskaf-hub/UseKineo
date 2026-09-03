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

function executeTs(file) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(output, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => { throw new Error(`unmocked import: ${id}`) },
    URLSearchParams,
    Set,
  }, { filename: file })
  return moduleBox.exports
}

const truth = executeTs('lib/growth/organicSignupTruth.ts')
const funnel = executeTs('lib/organicFunnel.ts')

for (const campaign of [
  'push22_legacy', 'push32_legacy', 'push39_viral', 'push48_proof',
  'push60_free_ai_shorts_generator', 'push63_niche_history',
  'push66_faceless_video_generator', 'push69_topic', 'push70_youtube_topic_one_click',
  'push77_short_cost_calculator', 'push96_youtube_automation_hub',
  'seo_gerador_pt', 'starter_shorts_pay',
]) {
  check(truth.isOrganicSignupAttribution({ campaign }), `${campaign} is a known public-search campaign`)
}
check(truth.isOrganicSignupAttribution({ source: 'SEO', medium: 'ORGANIC' }), 'canonical UTM attribution is case-insensitive')
check(truth.isOrganicSignupAttribution({
  source: 'answer_engine', medium: 'organic', campaign: 'aeo_hook_workbench_v1',
}), 'exact answer-engine hook workbench handoff is recognized')
check(!truth.isOrganicSignupAttribution({
  source: 'answer_engine', medium: 'organic', campaign: 'aeo_hook_workbench_v2',
}), 'answer-engine handoff is fail-closed to the exact campaign')
check(!truth.isOrganicSignupAttribution({ source: 'chatgpt.com', medium: 'referral', campaign: 'chatgpt_to_shorts' }), 'ChatGPT referral is not relabelled as organic')
check(!truth.isOrganicSignupAttribution({ source: 'theresanaiforthat', medium: 'referral', campaign: 'taaft' }), 'directory referral is not relabelled as organic')
check(!truth.isOrganicSignupAttribution({}), 'unknown attribution remains unknown')

const params = new URLSearchParams({
  prompt: 'private customer idea',
  email: 'private@example.com',
  utm_source: 'seo',
  utm_medium: 'organic',
  utm_campaign: 'push60_free_ai_shorts_generator',
  create_intent: 'trial_best',
})
const context = truth.organicSignupHandoffContext(params)
equal(context.campaign, 'push60_free_ai_shorts_generator', 'campaign survives handoff')
equal(context.createIntent, 'trial_best', 'allowlisted creation intent survives handoff')
check(!JSON.stringify(context).includes('private customer idea'), 'prompt never enters analytics context')
check(!JSON.stringify(context).includes('private@example.com'), 'email never enters analytics context')
equal(truth.organicSignupHandoffContext(new URLSearchParams({ utm_source: 'direct' })), null, 'non-organic handoff is ignored')

const event = (name, user_id, session_id = null, metadata = null) => ({
  name, user_id, session_id, metadata, created_at: '2026-08-29T12:00:00Z',
})
const summary = funnel.summarizeOrganicActions([
  event('organic_topic_submitted', 'intent-a'),
  event('organic_topic_submitted', 'intent-a'),
  event('organic_cta_clicked', null, 'intent-b'),
  event('organic_cta_clicked', null, 'mirror', { mirrors: 'organic_topic_submitted' }),
  event('organic_signup_handoff_viewed', null, 'signup-a'),
  event('organic_signup_handoff_viewed', null, 'signup-a'),
  event('organic_signup_handoff_viewed', 'signup-b'),
  event('organic_signup_method_selected', null, 'signup-a'),
])
equal(summary.intentActors, 2, 'intent counts people, not repeated events or mirrors')
equal(summary.signupHandoffActors, 2, 'signup arrivals count unique people')
equal(summary.signupMethodActors, 1, 'method selections count unique people')

const topicForm = read('app/youtube-shorts-from-topic/TopicGeneratorForm.tsx')
check(/placement = 'hero_form',[\s\S]*?utmSource,\s*utmMedium,/.test(topicForm), 'shared form does not overwrite the real acquisition source by default')
check(topicForm.includes('name="intent_campaign" value={campaign}'), 'public form always carries the page handoff campaign')
const signup = read('app/(auth)/signup/page.tsx')
check(signup.includes("trackEvent('organic_signup_handoff_viewed'"), 'signup arrival is instrumented')
check(signup.includes("trackEvent('organic_signup_method_selected'"), 'auth-method choice is instrumented')
check(!signup.includes('prompt: params.get'), 'signup telemetry does not copy prompt text')
const google = read('components/GoogleSignInButton.tsx')
check(google.includes('try { onSelect?.() } catch'), 'analytics cannot block Google authentication')
const route = read('app/api/admin/funnel/route.ts')
check(route.includes('isOrganicSignupAttribution'), 'admin cohort uses shared attribution truth')
check(route.includes('intentToHandoffRate'), 'admin exposes intent-to-signup-page conversion')
const client = read('app/(dashboard)/admin/funnel/FunnelClient.tsx')
check(client.includes('Signup page arrivals'), 'admin renders signup arrivals')
check(client.includes('Auth method selected'), 'admin renders auth-method selection')
check(fs.existsSync(path.join(root, 'docs/previews/ORGANIC-SIGNUP-TRUTH-2026-08-29.html')), 'visual before/after preview exists')

console.log(`organic-signup-truth: ${checks}/${checks} checks passed`)
