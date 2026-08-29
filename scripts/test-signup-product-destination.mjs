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

function executeTs(rel, dependencies = {}) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => {
      if (Object.hasOwn(dependencies, id)) return dependencies[id]
      throw new Error(`${rel} imported unexpected module: ${id}`)
    },
    module,
    module.exports,
  )
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const authRedirect = executeTs('lib/authRedirect.ts')
const productIntent = executeTs('lib/growth/productSurfaceIntent.ts')
const engineIntent = executeTs('lib/growth/engineLandingIntent.ts')
const preview = executeTs('lib/growth/signupProductDestinationPreview.ts', {
  '@/lib/authRedirect': authRedirect,
  '@/lib/growth/productSurfaceIntent': productIntent,
  '@/lib/growth/engineLandingIntent': engineIntent,
})

const cases = [
  {
    surface: 'images',
    redirect: '/images?intent_campaign=seo_image_studio',
    heading: 'Your AI Image Studio is next',
    label: 'AI Image Studio',
    phrase: 'choose a model and submit',
  },
  {
    surface: 'audio',
    redirect: '/audio?intent_campaign=seo_voice_studio',
    heading: 'Your AI Voice Studio is next',
    label: 'AI Voice Studio',
    phrase: 'choose a voice and submit',
  },
  {
    surface: 'fast',
    redirect: '/studio?engine=fast&intent_campaign=seo_engine_hub',
    heading: 'Kineo 1 is selected',
    label: 'Studio · Kineo 1',
    phrase: 'Kineo 1 selected',
  },
  {
    surface: 'seedance',
    redirect: '/studio?engine=seedance&intent_campaign=seo_video_upscaler',
    heading: 'Seedance 1.5 is selected',
    label: 'Studio · Seedance 1.5',
    phrase: 'Seedance 1.5 selected',
  },
  {
    surface: 'kling',
    redirect: '/studio?engine=kling&intent_campaign=seo_engine_kling_2_5',
    heading: 'Kling 2.5 is selected',
    label: 'Studio · Kling 2.5',
    phrase: 'Kling 2.5 selected',
  },
  {
    surface: 'veo',
    redirect: '/studio?engine=veo&intent_campaign=seo_engine_veo_3_1',
    heading: 'Veo 3.1 is selected',
    label: 'Studio · Veo 3.1',
    phrase: 'Veo 3.1 selected',
  },
  {
    surface: 'hollywood',
    redirect: '/studio?engine=hollywood&intent_campaign=seo_engine_kling_3',
    heading: 'Kling 3 is selected',
    label: 'Studio · Kling 3',
    phrase: 'Kling 3 selected',
  },
  {
    surface: 'h3',
    redirect: '/studio?engine=h3&intent_campaign=seo_talking_characters',
    heading: 'MiniMax H3 is selected',
    label: 'Studio · MiniMax H3',
    phrase: 'credit cost before you submit',
  },
  {
    surface: 'omni',
    redirect: '/studio?engine=omni&intent_campaign=seo_engine_omni_flash',
    heading: 'Omni Flash is selected',
    label: 'Studio · Omni Flash',
    phrase: 'Omni Flash selected',
  },
]

for (const item of cases) {
  const result = preview.buildSignupProductDestinationPreview(item.redirect)
  ok(result, `${item.surface}: recognized`)
  equal(result.surface, item.surface, `${item.surface}: surface preserved`)
  equal(result.heading, item.heading, `${item.surface}: auth heading is specific`)
  equal(result.destinationLabel, item.label, `${item.surface}: destination label is specific`)
  ok(result.description.includes(item.phrase), `${item.surface}: continuation contract is specific`)
  ok(/Nothing|nothing/.test(result.description), `${item.surface}: no automatic generation promise`)
}

const rejected = [
  null,
  '',
  '/pricing',
  '/affiliate',
  '/api/stripe/checkout/resume?plan=starter',
  '/studio',
  '/studio?engine=unknown',
  '/studio?engine=h3&coupon=free',
  '/studio?engine=veo&engine=fast',
  '/images?engine=fast',
  '/audio?next=https://evil.example',
  '//evil.example/images',
  '/\\evil.example/images',
  'https://evil.example/images',
  'javascript:alert(1)',
]

for (const raw of rejected) {
  equal(preview.buildSignupProductDestinationPreview(raw), null, `fail closed: ${String(raw)}`)
}

const signup = source('app/(auth)/signup/page.tsx')
ok(signup.includes("import { buildSignupProductDestinationPreview } from '@/lib/growth/signupProductDestinationPreview'"), 'real signup imports destination proof')
ok(signup.includes("buildSignupProductDestinationPreview(params.get('redirect'))"), 'real signup derives proof from the validated redirect field')
ok(signup.includes('if (isCheckoutResume) return null'), 'checkout resume suppresses product proof')
ok(signup.indexOf("? 'Create your account to continue'") < signup.indexOf(': savedProductDestination'), 'checkout heading keeps first priority')
ok(signup.indexOf(': savedProductDestination') < signup.indexOf(': savedCreation'), 'product destination is named before generic creation copy')
ok(signup.includes('aria-labelledby="saved-product-destination-heading"'), 'destination proof has an accessible heading')
ok(signup.includes('{savedProductDestination.destinationLabel}'), 'fixed destination label is rendered')
ok(signup.includes('{savedProductDestination.description}'), 'fixed continuation contract is rendered')
ok(signup.includes('The confirmation link opens {savedProductDestination.destinationLabel}.'), 'email confirmation keeps the destination promise')
ok(signup.indexOf('{savedProductDestination && (') < signup.indexOf('<GoogleSignInButton'), 'proof appears before auth methods')
equal((signup.match(/dangerouslySetInnerHTML/g) ?? []).length, 0, 'signup proof never renders raw HTML')

const helper = source('lib/growth/signupProductDestinationPreview.ts')
ok(!helper.toLowerCase().includes('supabase'), 'preview helper has no Supabase dependency')
ok(!helper.includes('fetch('), 'preview helper has no network call')
ok(!helper.includes('/api/'), 'preview helper has no API call')
ok(helper.includes('normalizeInternalRedirect(raw)'), 'preview reuses the canonical internal redirect validator')
ok(helper.includes('PRODUCT_SURFACE_DESTINATIONS'), 'preview matches the same destination source used by public CTAs')
ok(helper.includes('ENGINE_LANDING_PARAMS'), 'preview recognizes the same engine enum used by engine landing pages')
ok(helper.includes('ENGINE_LANDING_LABELS'), 'preview names engines from the engine landing source')

equal(engineIntent.ENGINE_LANDING_PARAMS.length, 7, 'all seven engine landing params execute')
const enginePage = source('app/ai-video-generator/[engine]/page.tsx')
for (const engine of engineIntent.ENGINE_LANDING_PARAMS) {
  const campaign = `test_${engine}`
  const signupHref = engineIntent.buildEngineLandingSignupHref({ engine, campaign })
  const signupUrl = new URL(signupHref, 'https://www.usekineo.com')
  const result = preview.buildSignupProductDestinationPreview(signupUrl.searchParams.get('redirect'))
  equal(result?.surface, engine, `${engine}: real engine landing href is recognized at signup`)
  equal(result?.destinationLabel, `Studio · ${engineIntent.ENGINE_LANDING_LABELS[engine]}`, `${engine}: label survives the full handoff`)
  const pair = new RegExp(`param: '${engine}'[\\s\\S]{0,180}name: '${engineIntent.ENGINE_LANDING_LABELS[engine].replace('.', '\\.')}'`)
  ok(pair.test(enginePage), `${engine}: public page name matches the signup proof`)
}

console.log(`signup product destination: ${checks}/${checks} checks passed`)
