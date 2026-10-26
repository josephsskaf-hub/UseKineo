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

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} imported unexpected module: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const intent = loadTs('lib/growth/productSurfaceIntent.ts')
equal(intent.PRODUCT_SURFACES, ['images', 'audio', 'fast', 'seedance', 'h3'], 'closed destination list executes')

const cases = [
  { surface: 'images', campaign: 'seo_image_studio', source: 'img_seo', destination: '/images?intent_campaign=seo_image_studio' },
  { surface: 'audio', campaign: 'seo_voice_studio', source: 'voice_seo', destination: '/audio?intent_campaign=seo_voice_studio' },
  { surface: 'fast', campaign: 'seo_engine_hub', source: 'seo', destination: '/studio?engine=fast&intent_campaign=seo_engine_hub' },
  { surface: 'seedance', campaign: 'seo_video_upscaler', source: 'upscaler', destination: '/studio?engine=seedance&intent_campaign=seo_video_upscaler' },
  { surface: 'h3', campaign: 'seo_talking_characters', source: 'seo', destination: '/studio?engine=h3&intent_campaign=seo_talking_characters' },
]

for (const item of cases) {
  const href = intent.buildProductSurfaceSignupHref({
    surface: item.surface,
    campaign: item.campaign,
    utmSource: item.source,
  })
  const url = new URL(href, 'https://www.usekineo.com')
  equal(url.pathname, '/signup', `${item.surface}: auth entry stays canonical`)
  equal(url.searchParams.get('redirect'), item.destination, `${item.surface}: exact product destination survives auth`)
  equal(url.searchParams.get('utm_source'), item.source, `${item.surface}: original source survives`)
  equal(url.searchParams.get('utm_medium'), 'organic', `${item.surface}: medium is explicit`)
  equal(url.searchParams.get('utm_campaign'), item.campaign, `${item.surface}: acquisition campaign survives`)
  equal(url.searchParams.get('intent_campaign'), item.campaign, `${item.surface}: activation campaign matches acquisition`)
  equal(url.searchParams.get('create_intent'), null, `${item.surface}: blank CTA never auto-submits work`)
}

const pages = {
  images: source('app/ai-image-generator/page.tsx'),
  audio: source('app/ai-voice-generator/page.tsx'),
  engine: source('app/ai-video-generator/page.tsx'),
  upscaler: source('app/ai-video-upscaler/page.tsx'),
  talking: source('app/ai-video-with-talking-characters/page.tsx'),
}

ok(pages.images.includes('href={IMAGE_SIGNUP_HREF}'), 'image CTA uses bounded handoff')
ok(pages.audio.includes('href={VOICE_SIGNUP_HREF}'), 'voice CTA uses bounded handoff')
ok(pages.engine.includes('href={ENGINE_HUB_SIGNUP_HREF}'), 'engine hub CTA uses bounded handoff')
ok(pages.upscaler.includes('href={UPSCALER_SIGNUP_HREF}'), 'upscaler CTA uses bounded handoff')
equal((pages.talking.match(/href=\{TALKING_CHARACTERS_SIGNUP_HREF\}/g) ?? []).length, 2, 'both talking-character CTAs use H3 handoff')
ok(!pages.talking.includes('Make one free'), 'talking-character CTA no longer promises an unaffordable free render')
// The approved FAQ now describes the credit grant in plural; bind the
// disclosure to canonical inputs and execute the actual FAQ template.
ok(/import \{[^}]*TRIAL_CREDITS_SHOWN[^}]*\} from '@\/lib\/freeTierOffer'/.test(pages.talking), 'trial disclosure imports the canonical grant')
const talkingAst = ts.createSourceFile('talking.tsx', pages.talking, 99, true, ts.ScriptKind.TSX)
let faq
for (const node of talkingAst.statements) if (ts.isVariableStatement(node)) for (const decl of node.declarationList.declarations) if (decl.name.getText(talkingAst) === 'FAQ') faq = decl.initializer
ok(faq && ts.isArrayLiteralExpression(faq), 'real talking-character FAQ is located')
const costNode = faq.elements.find(node => ts.isObjectLiteralExpression(node) && node.properties.some(p => p.name?.getText(talkingAst) === 'q' && p.initializer?.text === 'How much does it cost?'))
const answer = costNode?.properties.find(p => p.name?.getText(talkingAst) === 'a')?.initializer
ok(answer && ts.isTemplateExpression(answer) && ['H3_60_CREDITS', 'KLING3_60_CREDITS', 'TRIAL_CREDITS_SHOWN', 'STARTER_MONTH'].every(name => answer.templateSpans.some(span => span.expression.getText(talkingAst) === name)), 'FAQ derives grant, both engine costs and plan price from canonical bindings')
const renderAnswer = (grant, h3) => new Function('H3_60_CREDITS','KLING3_60_CREDITS','TRIAL_CREDITS_SHOWN','STARTER_MONTH', 'return ' + answer.getText(talkingAst))(h3,150,grant,'fixture-plan-price')
const disclosure = renderAnswer(10,45)
ok(disclosure.includes('45 credits') && disclosure.includes('10 credits') && /do(?:es)? not cover a full 60-second H3 film/.test(disclosure), 'FAQ exposes grant-to-engine gap before signup')
ok(renderAnswer(11,46).includes('46 credits') && renderAnswer(11,46).includes('11 credits'), 'mutant control: changing canonical inputs changes the actual FAQ output')
ok(pages.talking.includes('this specific engine needs additional balance'), 'hero states the trial-to-engine gap before signup')
ok(pages.talking.includes("creditCostForDuration('cinematic_h3', true, 60)"), 'H3 cost is derived from the billing source')
ok(pages.talking.includes("creditCostForDuration('cinematic_hollywood', true, 60)"), 'Kling 3 cost is derived from the billing source')
ok(!Object.values(pages).some((page) => /href="\/signup\?utm_source=(img_seo|voice_seo|upscaler)/.test(page)), 'three legacy generic signup links are gone')
ok(!source('lib/growth/productSurfaceIntent.ts').includes('fetch('), 'handoff helper adds no network call')

console.log(`product surface intent: ${checks}/${checks} checks passed`)

