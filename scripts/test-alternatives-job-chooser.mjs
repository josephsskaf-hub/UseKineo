#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')

function source(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function loadTs(rel, mocks = {}) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${rel} imported unexpected module: ${id}`)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const handoff = loadTs('lib/growth/publicCreationIntent.ts')
const chooser = loadTs('lib/growth/alternativeJobChooser.ts', {
  './publicCreationIntent': handoff,
})
const paths = chooser.ALTERNATIVE_JOB_PATHS

equal(paths.length, 4, 'four mutually distinct starting jobs execute')
equal(new Set(paths.map((path) => path.id)).size, paths.length, 'job ids are unique')
equal(paths.filter((path) => path.kineoFit === 'best_fit').map((path) => path.id), ['original_faceless_short'], 'Kineo claims only its real starting point')
equal(paths.filter((path) => path.kineoFit === 'not_the_job').length, 3, 'three wrong-fit jobs are disclosed')

const kineo = paths.find((path) => path.id === 'original_faceless_short')
ok(kineo, 'original faceless path exists')
const signup = new URL(kineo.primaryHref, 'https://www.usekineo.com')
equal(signup.pathname, '/signup', 'Kineo path enters signup')
equal(signup.searchParams.get('utm_source'), 'alternatives', 'Kineo path retains alternatives source')
equal(signup.searchParams.get('utm_medium'), 'organic', 'Kineo path retains organic medium')
equal(signup.searchParams.get('utm_campaign'), chooser.ALTERNATIVE_JOB_CAMPAIGN, 'Kineo path retains chooser campaign')
equal(signup.searchParams.get('intent_campaign'), chooser.ALTERNATIVE_JOB_CAMPAIGN, 'activation receives the same campaign')
equal(signup.searchParams.get('redirect'), `/studio?engine=fast&intent_campaign=${chooser.ALTERNATIVE_JOB_CAMPAIGN}`, 'signup retains the real Studio destination')
equal(signup.searchParams.get('create_intent'), null, 'blank job chooser never claims automatic creation')

equal(paths.find((path) => path.id === 'long_video_to_clips')?.primaryHref, '/alternatives/opusclip', 'long-video job routes to the clipping comparison')
equal(paths.find((path) => path.id === 'ai_presenter')?.primaryHref, '/alternatives/heygen', 'presenter job routes to the avatar comparison')
equal(paths.find((path) => path.id === 'ai_presenter')?.secondaryHref, '/alternatives/synthesia', 'presenter job exposes the training-avatar alternative')
equal(paths.find((path) => path.id === 'recording_editor')?.primaryHref, '/alternatives/descript', 'recording job routes to the transcript editor comparison')
ok(paths.every((path) => path.sourceHref.startsWith('/') || path.sourceHref.startsWith('https://')), 'every recommendation has an inspectable source')
ok(paths.filter((path) => path.kineoFit === 'not_the_job').every((path) => path.sourceHref.startsWith('https://')), 'every competitor claim links to the vendor source')

const page = source('app/alternatives/page.tsx')
ok(page.includes('ALTERNATIVE_JOB_PATHS.map'), 'the production page renders the executable map')
ok(page.includes('KINEO_ALTERNATIVES_SIGNUP_HREF'), 'hero and final CTA reuse the bounded Studio handoff')
ok(page.indexOf('ALTERNATIVE_JOB_PATHS.map') < page.indexOf('COMPETITOR_SLUGS.map'), 'job choice appears before the brand wall')
ok(page.includes('Kineo is not a re-clipper') || source('lib/growth/alternativeJobChooser.ts').includes('Kineo is not a re-clipper'), 'wrong-fit clipping claim is explicit')
ok(!page.includes("const signupUrl = '/signup?"), 'legacy signup dead end is gone')
ok(!source('lib/growth/alternativeJobChooser.ts').includes('trackEvent'), 'static chooser adds no analytics write of its own')

console.log(`alternatives job chooser: ${checks}/${checks} checks passed`)

