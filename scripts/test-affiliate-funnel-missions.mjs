#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

function executeTs(file) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => { throw new Error(`unexpected runtime import ${id}`) },
    Number,
    Object,
  }, { filename: file })
  return moduleBox.exports
}

const policy = executeTs('lib/growth/affiliateNextMission.ts')
const resolve = policy.resolveAffiliateNextMission

for (const malformed of [null, undefined, {}, { clicks: 0 }, { clicks: -1, signups: 0, paid: 0 }, { clicks: 1.5, signups: 0, paid: 0 }, { clicks: 1, signups: '0', paid: 0 }]) {
  equal(resolve(malformed), null, `malformed stats fail closed: ${JSON.stringify(malformed)}`)
}

const firstClick = resolve({ clicks: 0, signups: 0, paid: 0 })
equal(firstClick.stage, 'first_click', 'zero visits get the first-click mission')
equal(firstClick.destination, 'script', 'first click leads with free value')
equal(firstClick.action, 'caption', 'first click has one copyable post')
ok(firstClick.description.includes('before Kineo asks for an account'), 'first-click rationale names value before signup')

for (const clicks of [1, 2, 17, 100]) {
  const mission = resolve({ clicks, signups: 0, paid: 0 })
  equal(mission.stage, 'first_signup', `${clicks} visits and no signup target the first signup`)
  equal(mission.destination, 'script', 'no-signup stage keeps the no-signup script destination')
  equal(mission.action, 'caption', 'no-signup stage offers a ready post')
  ok(mission.eyebrow.includes(String(clicks)), 'mission repeats the exact observed visit count')
}

for (const signups of [1, 2, 9]) {
  const mission = resolve({ clicks: Math.max(signups, 4), signups, paid: 0 })
  equal(mission.stage, 'first_paid_customer', `${signups} signups and no buyer target the first customer`)
  equal(mission.destination, 'video', 'signup-without-payment switches proof to the complete video test')
  equal(mission.action, 'caption', 'first-customer stage remains one-tap publishable')
  ok(mission.description.includes('before deciding whether a paid plan fits'), 'conversion copy avoids guaranteed-sale language')
}

for (const paid of [1, 2, 20]) {
  const mission = resolve({ clicks: paid * 4, signups: paid * 2, paid })
  equal(mission.stage, 'scale', `${paid} paid customers move to durable scale`)
  equal(mission.action, 'widget', 'converted affiliates receive the durable widget action')
  equal(mission.destination, 'script', 'widget keeps the proven no-signup destination')
  ok(mission.description.includes('first-touch attribution'), 'scale copy explains what persists')
}

equal(resolve({ clicks: 0, signups: 1, paid: 0 }).stage, 'first_paid_customer', 'deeper signup evidence wins over a missing legacy click row')
equal(resolve({ clicks: 0, signups: 0, paid: 1 }).stage, 'scale', 'paid evidence wins over missing legacy click and signup rows')

const page = read('app/(dashboard)/affiliate/page.tsx')
ok(page.includes("resolveAffiliateNextMission(data?.stats)"), 'real affiliate page uses the executable policy')
ok(page.includes("affiliate_next_mission_viewed"), 'mission impression is measurable')
ok(page.includes("affiliate_next_mission_copied"), 'mission action is measurable')
ok(page.includes("nextMission.action === 'widget' ? widgetSnippet : missionCaption"), 'action copies the stage-specific existing asset')
ok(page.includes('setSelectedDestinationKey(nextMission.destination)'), 'campaign kit follows the mission destination after copy')
ok(page.includes('data?.stats?.clicks ?? null'), 'telemetry carries observed visits, not an estimate')
ok(page.includes('data?.stats?.signups ?? null'), 'telemetry carries observed signups, not an estimate')
ok(page.includes('data?.stats?.paid ?? null'), 'telemetry carries observed paid customers, not an estimate')
ok(!read('lib/growth/affiliateNextMission.ts').includes('fetch('), 'policy adds no database or network read')
ok(!read('lib/growth/affiliateNextMission.ts').includes('supabase'), 'policy is independent of Supabase')

console.log(`affiliate funnel missions: ${checks}/${checks}`)
