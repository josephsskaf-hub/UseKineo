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
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`unexpected import ${id}`) }, module, module.exports,
  )
  return module.exports
}

let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

const goals = loadTs('lib/growth/onboardingGoals.ts')
equal(goals.HOME_WELCOME_GOAL_CAMPAIGN, 'growth_home_welcome_goal_router_20260828', 'campaign is isolated')
equal(goals.ONBOARDING_GOALS.length, 3, 'home reuses the same bounded goal set')

for (const goal of goals.ONBOARDING_GOALS) {
  const href = goals.buildHomeWelcomeGoalHref(goal)
  const parsed = new URL(href, 'https://www.usekineo.com')
  equal(parsed.pathname, '/studio', `${goal.id}: opens the visible Studio cockpit first`)
  equal(parsed.searchParams.get('engine'), 'seedance', `${goal.id}: first trial proof opens on Seedance`)
  equal(parsed.searchParams.get('prompt'), goal.topic, `${goal.id}: starter idea survives URL encoding`)
  equal(parsed.searchParams.get('onboarding_goal'), goal.id, `${goal.id}: goal remains attributable`)
  equal(parsed.searchParams.get('intent_campaign'), goals.HOME_WELCOME_GOAL_CAMPAIGN, `${goal.id}: campaign remains attributable`)
  ok(!parsed.searchParams.has('create_intent'), `${goal.id}: choosing never auto-starts a render`)
  ok(!parsed.searchParams.has('autoanalyze'), `${goal.id}: choosing never starts analysis behind the cockpit`)
  ok(!parsed.searchParams.has('welcome'), `${goal.id}: Studio does not reopen the onboarding modal`)
}

const page = source('app/page.tsx')
const landing = source('app/KineoLanding.tsx')
const component = source('components/HomeWelcomeGoalRouter.tsx')
const css = source('components/HomeWelcomeGoalRouter.module.css')
const studio = source('app/(dashboard)/studio/StudioClient.tsx')
const machine = source('app/(dashboard)/generate/GenerateClient.tsx')
const preview = source('docs/previews/home-welcome-goal-router-2026-08-28.html')

ok(page.includes("firstSearchParam(searchParams, 'welcome') === '1'"), 'email signup handoff shows the router')
ok(page.includes("firstSearchParam(searchParams, 'signup') === '1'"), 'OAuth/modal signup handoff also shows the router')
ok(page.includes('showWelcomeGoalRouter={showWelcomeGoalRouter}'), 'server passes only a serializable boolean')
ok(landing.indexOf('const order = [\'cinematic_veo\', \'cinematic_hollywood\', \'cinematic_h3\', \'cinematic_omni\']') >= 0, 'founder-approved four-engine order is unchanged')
ok(landing.indexOf('</header>') < landing.indexOf('<HomeWelcomeGoalRouter />'), 'router renders after the four-video hero')
ok(landing.includes('{showWelcomeGoalRouter ? <HomeWelcomeGoalRouter /> : null}'), 'React conditional is explicit')
ok(component.includes("'use client'"), 'router can measure the real human handoff')
ok(component.includes("trackEvent('viral_onboarding_viewed'"), 'view is measured with the established event')
ok(component.includes("trackEvent('viral_onboarding_primary_clicked'"), 'primary click is measured with the established event')
ok(component.includes('HOME_FIRST_WIN_VIEW_MARKER'), 'view event is latched once per tab')
ok(component.includes('DEFAULT_ONBOARDING_GOAL'), 'one recommended first win owns visual priority')
ok(component.includes('alternatives.map'), 'business and client jobs remain available as secondary routes')
ok(component.includes('no credits are spent'), 'safety boundary is visible')
ok(component.includes('role="list"') && component.includes('role="listitem"'), 'choices expose accessible list semantics')
ok(css.includes('.primary') && css.includes('.alternatives'), 'recommended action and alternatives have distinct hierarchy')
ok(css.includes('@media (max-width: 700px)') && css.includes('.routeGrid'), 'mobile stacks the activation route')
ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'motion preference is respected')
ok(studio.includes("const p = sp.get('prompt')") && studio.includes('if (p) setPrompt(p)'), 'real Studio caller reads the carried idea')
ok(studio.includes("const e = sp.get('engine')") && studio.includes('setEngine(e as EngineKey)'), 'real Studio caller selects the requested engine')
ok(studio.includes("const onboardingGoal = sp.get('onboarding_goal')"), 'Studio reads the bounded goal attribution')
ok(studio.includes("q.set('onboarding_goal', onboardingGoalRef.current)"), 'Studio preserves the goal into the machine handoff')
ok(machine.includes("const goal = searchParams?.get('onboarding_goal')"), 'generation machine receives goal attribution')
ok(machine.includes('sessionStorage.setItem(PUSH27_ONBOARDING_GOAL_SESSION_KEY, goal)'), 'goal survives asynchronous terminal events')
ok(preview.includes('Before · three equal decisions'), 'preview contains the original choice hierarchy')
ok(preview.includes('After · one recommended first win'), 'preview contains the focused hierarchy')
ok(preview.includes('Desktop') && preview.includes('Mobile 390px'), 'preview includes both required viewports')

console.log(`home welcome goal router: ${checks}/${checks} checks passed`)
