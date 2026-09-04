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
    (id) => { throw new Error(`${rel} imported unexpected module: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

const remix = loadTs('lib/growth/exampleRemix.ts')
const examples = loadTs('lib/publicExamples.ts').PUBLIC_EXAMPLES
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(remix.sanitizeExampleRemixTopic('  Bermuda\n\tTriangle  '), 'Bermuda Triangle', 'topic whitespace is normalized')
equal(remix.sanitizeExampleRemixTopic('\u0000Mars\u007f'), 'Mars', 'control characters are removed')
equal(remix.sanitizeExampleRemixTopic('x'.repeat(200)).length, 140, 'topic length is capped')
equal(remix.sanitizeExampleRemixTopic('   '), '', 'empty whitespace remains empty')
equal(remix.remixExamplePrompt('Reference prompt', ''), 'Reference prompt', 'empty topic does not fabricate a prompt')

equal(examples.length, 6, 'all six permanent public examples are covered')
for (const example of examples) {
  const generated = remix.remixExamplePrompt(example.prompt, 'the Bermuda Triangle')
  ok(generated.includes('about the Bermuda Triangle, with'), `${example.slug}: visitor topic replaces reference subject`)
  ok(generated.startsWith('Create a fast-paced faceless Short about'), `${example.slug}: format opening survives`)
  ok(generated.length > 'the Bermuda Triangle'.length + 40, `${example.slug}: reference visual direction survives`)
}

const fallback = remix.remixExamplePrompt('A prompt with no replaceable subject.', 'black holes')
ok(fallback.includes('about black holes,'), 'fallback contains visitor topic')
ok(fallback.includes('curiosity hook'), 'fallback remains a useful creation prompt')

const href = remix.exampleRemixHref({
  slug: 'north-sentinel-island',
  referencePrompt: examples[1].prompt,
  topic: 'ice caves & volcanoes',
})
const parsed = new URL(href, 'https://www.usekineo.com')
equal(parsed.pathname, '/studio/create', 'handoff uses the direct Studio creation route')
equal(parsed.searchParams.get('create_intent'), 'example_remix', 'creation intent is explicit')
equal(parsed.searchParams.get('script_mode'), 'ai', 'AI script handoff is explicit')
equal(parsed.searchParams.get('utm_source'), 'example_watch', 'source attribution is stable')
equal(parsed.searchParams.get('utm_medium'), 'proof', 'medium attribution is stable')
equal(parsed.searchParams.get('utm_campaign'), 'example_remix_v1', 'campaign attribution is versioned')
equal(parsed.searchParams.get('utm_content'), 'north-sentinel-island', 'example slug is preserved')
ok(parsed.searchParams.get('prompt')?.includes('ice caves & volcanoes'), 'URLSearchParams safely round-trips punctuation')

const form = source('app/examples/ExampleRemixForm.tsx')
const page = source('app/examples/[slug]/page.tsx')
const player = source('app/examples/ExampleVideoPlayer.tsx')
const admin = source('app/api/admin/funnel/route.ts')
const client = source('app/(dashboard)/admin/funnel/FunnelClient.tsx')

ok(page.includes('ExampleRemixForm'), 'public page renders the topic form')
ok(page.includes('ctaHref="#remix-this-example"'), 'ended-video CTA points to the form')
ok(page.includes('ctaTarget="remix_form"'), 'ended-video event names its real target')
ok(!page.includes('const generateHref'), 'old direct reference-prompt handoff is removed')
ok(player.includes("ctaTarget?: 'generate' | 'remix_form'"), 'player target contract is typed')
ok(form.includes("trackEvent('example_remix_form_viewed'"), 'visible form is measured')
ok(form.includes("trackEvent('example_remix_topic_submitted'"), 'topic submission is measured')
ok(form.includes('intersectionRatio >= 0.5'), 'impression requires 50% visibility')
ok(form.includes('sessionStorage.getItem(marker)'), 'form impression dedupes within the browser session')
ok(form.includes('topic_length: safeTopic.length'), 'telemetry retains useful topic length')
ok(!/trackEvent\('example_remix_topic_submitted',[\s\S]{0,300}\btopic:\s*safeTopic/.test(form), 'telemetry never emits the visitor topic')
ok(form.includes('No card required to start.'), 'the form states the existing trial condition honestly')
ok(admin.includes("'example_remix_form_viewed', 'example_remix_topic_submitted'"), 'admin fetches both funnel events')
ok(admin.includes("event.metadata?.version === 'example_remix_v1'"), 'admin isolates the experiment version')
ok(admin.includes('.map(checkoutActorKey)'), 'browser stages count unique identifiable actors')
ok(admin.includes("profile.signup_utm_source?.trim().toLowerCase() === 'example_watch'"), 'signup attribution uses persisted profile source')
ok(admin.includes("profile.signup_utm_campaign?.trim().toLowerCase() === 'example_remix_v1'"), 'signup attribution requires the exact campaign')
ok(admin.includes("video.status === 'completed'"), 'activation requires a completed video')
ok(client.includes('Example remix · proof → topic → signup'), 'admin exposes the new causal funnel')
ok(client.includes('Signup → Video'), 'admin shows activation after signup')

console.log(`example-remix: ${checks}/${checks} checks passed`)
