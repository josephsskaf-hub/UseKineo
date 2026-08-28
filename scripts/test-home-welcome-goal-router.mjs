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
  equal(parsed.pathname, '/studio/create', `${goal.id}: opens canonical Studio create route`)
  equal(parsed.searchParams.get('prompt'), goal.topic, `${goal.id}: starter idea survives URL encoding`)
  equal(parsed.searchParams.get('autoanalyze'), '1', `${goal.id}: existing analysis handoff is explicit`)
  equal(parsed.searchParams.get('onboarding_goal'), goal.id, `${goal.id}: goal remains attributable`)
  equal(parsed.searchParams.get('intent_campaign'), goals.HOME_WELCOME_GOAL_CAMPAIGN, `${goal.id}: campaign remains attributable`)
  ok(!parsed.searchParams.has('create_intent'), `${goal.id}: choosing never auto-starts a render`)
  ok(!parsed.searchParams.has('welcome'), `${goal.id}: Studio does not reopen the onboarding modal`)
}

const page = source('app/page.tsx')
const landing = source('app/KineoLanding.tsx')
const component = source('components/HomeWelcomeGoalRouter.tsx')
const css = source('components/HomeWelcomeGoalRouter.module.css')
const preview = source('docs/previews/home-welcome-goal-router-2026-08-28.html')

ok(page.includes("Boolean(user && firstSearchParam(searchParams, 'welcome') === '1')"), 'router requires auth plus the explicit welcome handoff')
ok(page.includes('showWelcomeGoalRouter={showWelcomeGoalRouter}'), 'server passes only a serializable boolean')
ok(landing.indexOf('const order = [\'cinematic_veo\', \'cinematic_hollywood\', \'cinematic_h3\', \'cinematic_omni\']') >= 0, 'founder-approved four-engine order is unchanged')
ok(landing.indexOf('</header>') < landing.indexOf('<HomeWelcomeGoalRouter />'), 'router renders after the four-video hero')
ok(landing.includes('{showWelcomeGoalRouter ? <HomeWelcomeGoalRouter /> : null}'), 'React conditional is explicit')
ok(!component.includes("'use client'"), 'router stays a zero-JavaScript Server Component')
ok(!component.includes('trackEvent') && !component.includes('fetch('), 'capacity incident gets no new event or API write')
ok(component.includes('ONBOARDING_GOALS.map'), 'home does not fork goal copy')
ok(component.includes('No video render starts from this choice.'), 'safety boundary is visible')
ok(component.includes('role="list"') && component.includes('role="listitem"'), 'choices expose accessible list semantics')
ok(css.includes('@media (max-width: 700px)') && css.includes('grid-template-columns: 1fr'), 'mobile stacks choices')
ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'motion preference is respected')
ok(preview.includes('Before · welcome has no next-step router'), 'preview contains the original state')
ok(preview.includes('After · showroom first, goal router second'), 'preview contains the new state')
ok(preview.includes('Desktop') && preview.includes('Mobile 390px'), 'preview includes both required viewports')

console.log(`home welcome goal router: ${checks}/${checks} checks passed`)
