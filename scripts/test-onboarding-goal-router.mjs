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
equal(goals.ONBOARDING_GOAL_VARIANT, 'goal_router_v1', 'variant is stable and measurable')
equal(goals.ONBOARDING_GOALS.length, 3, 'router stays bounded to three outcomes')
equal(goals.DEFAULT_ONBOARDING_GOAL.id, 'creator', 'creator path remains the one-click default')
equal(new Set(goals.ONBOARDING_GOALS.map((goal) => goal.id)).size, 3, 'goal ids are unique')
equal(goals.getOnboardingGoal('business').id, 'business', 'business goal resolves')
equal(goals.getOnboardingGoal('agency').id, 'agency', 'agency goal resolves')
equal(goals.getOnboardingGoal('unknown').id, 'creator', 'unknown goal fails safely to default')
ok(goals.isOnboardingGoalId('creator'), 'creator id is accepted')
ok(!goals.isOnboardingGoalId('Creator'), 'unbounded goal id is rejected')

for (const goal of goals.ONBOARDING_GOALS) {
  ok(goal.label.length > 5, `${goal.id}: visible label exists`)
  ok(goal.description.length > 12, `${goal.id}: outcome explanation exists`)
  ok(goal.topic.length > 20, `${goal.id}: concrete starter topic exists`)
  ok(goal.hook.length > 30, `${goal.id}: concrete starter hook exists`)
  ok(goal.cta.endsWith('→'), `${goal.id}: CTA names a forward action`)
  ok(!/free|guarantee|viral|views|sales/i.test(goal.cta), `${goal.id}: CTA avoids unsupported promise`)
}

const component = source('components/NicheOnboarding.tsx')
const generate = source('app/(dashboard)/generate/GenerateClient.tsx')
const funnel = source('app/api/admin/funnel/route.ts')
const dashboard = source('app/(dashboard)/admin/funnel/FunnelClient.tsx')
const preview = source('docs/previews/ONBOARDING-GOAL-ROUTER-2026-08-27.html')

ok(component.includes("role=\"group\""), 'goal choices form one accessible group')
ok(component.includes('aria-pressed={active}'), 'selected goal is announced accessibly')
ok(component.includes('aria-label={`${goal.label}. ${goal.description}`}'), 'goal purpose is announced beyond the short visual label')
ok(component.includes('@media (max-width: 480px)') && component.includes('grid-template-columns: 1fr'), 'real mobile UI stacks the three goals')
ok(component.includes('ONBOARDING_GOALS.map'), 'UI renders from the canonical goal list')
ok(component.includes("trackEvent('viral_onboarding_goal_selected'"), 'goal changes are measured')
ok(component.includes('selected_goal: selectedGoal.id'), 'primary click carries final selected goal')
ok(component.includes('onPickRef.current(selectedGoal)'), 'executed handoff receives the chosen goal object')
ok(component.includes('DEFAULT_ONBOARDING_GOAL'), 'default is explicit instead of random')
ok(component.includes('Example Kineo output'), 'existing proof is honestly labelled as an example')
ok(component.includes('selectedGoal.topic') && component.includes('selectedGoal.hook'), 'visible brief follows selected goal')

ok(generate.includes('PUSH27_ONBOARDING_GOAL_SESSION_KEY'), 'goal survives async dispatch and reload boundary')
ok(generate.includes('isOnboardingGoalId(stored)'), 'stored goal is allow-listed before use')
ok(generate.includes('onboardingPick(goal: OnboardingGoal)'), 'caller accepts the executed goal contract')
ok(generate.includes('handleAnalyze(goal.topic'), 'chosen topic reaches the existing analysis path')
ok(generate.includes('selected_goal: onboardingGoalId()'), 'dispatch records the selected goal')
ok(generate.includes('first_video_generation_completed_from_viral_onboarding'), 'completion event remains wired')
ok(generate.includes('selected_goal: selectedGoal'), 'terminal events preserve goal attribution')
ok(generate.includes('clearOnboardingGoal()'), 'goal state is cleared at terminal paths')

ok(funnel.includes("'viral_onboarding_goal_selected'"), 'admin fetches goal-selection events')
ok(funnel.includes('new Set(rows.map(onboardingActorKey)).size'), 'onboarding metrics count actors, not rows')
ok(funnel.includes('goalBreakdown: ONBOARDING_GOALS.map'), 'admin reports all canonical goals')
ok(funnel.includes('goalRouterViewToClickRate'), 'new variant has an isolated conversion rate')
ok(dashboard.includes('Goal router exposed'), 'admin labels variant exposure')
ok(dashboard.includes('Changed default goal'), 'admin shows people who needed another path')
ok(dashboard.includes('Goal router view → click'), 'admin shows the decision edge')
ok(dashboard.includes('dispatched ·') && dashboard.includes('completed'), 'goal cards show useful downstream outcomes')

ok(preview.includes('Before · one idea for everyone'), 'preview contains original desktop/mobile state')
ok(preview.includes('After · goal before topic'), 'preview contains new desktop/mobile state')
ok(preview.includes('Desktop') && preview.includes('Mobile'), 'preview labels both required viewports')
ok(preview.includes('Grow my channel') && preview.includes('Promote my business') && preview.includes('Create for clients'), 'all three outcomes are visible')

console.log(`onboarding goal router: ${checks}/${checks} checks passed`)
