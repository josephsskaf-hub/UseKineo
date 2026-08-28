#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')

let checks = 0
function ok(value, label) {
  assert.ok(value, label)
  checks += 1
}
function equal(actual, expected, label) {
  assert.equal(actual, expected, label)
  checks += 1
}

function loadCreationHandoff() {
  const output = ts.transpileModule(read('lib/creationHandoff.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: 'creationHandoff.ts',
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', output)(module, module.exports)
  return module.exports
}

const handoff = loadCreationHandoff()
const withoutPrompt = handoff.readCreationHandoff(
  new URLSearchParams('create_intent=fast&intent_campaign=broken'),
)
equal(withoutPrompt.prompt, '', 'old CTA carries no prompt')
equal(withoutPrompt.createIntent, null, 'create_intent without prompt is discarded by the real contract')

const withPrompt = handoff.readCreationHandoff(
  new URLSearchParams('prompt=one+real+idea&create_intent=fast'),
)
equal(withPrompt.prompt, 'one real idea', 'form submission carries the topic')
equal(withPrompt.createIntent, 'fast', 'form submission activates Fast only with a real topic')

const pages = [
  {
    path: 'app/youtube-automation/page.tsx',
    formId: 'youtube-automation-first-video',
    expectedLinks: 2,
    oldIntent: 'push96_youtube_automation_hub',
    placement: 'youtube_automation_inline_form',
  },
  {
    path: 'app/how-to-start-a-faceless-youtube-channel/page.tsx',
    formId: 'faceless-channel-first-video',
    expectedLinks: 2,
    oldIntent: 'push96_start_faceless_channel',
    placement: 'faceless_channel_inline_form',
  },
  {
    path: 'app/vs/page.tsx',
    formId: 'vs-hub-generator',
    expectedLinks: 1,
    oldIntent: 'vs_comparison_hub',
    placement: null,
  },
]

for (const page of pages) {
  const source = read(page.path)
  const hashLinks = source.match(/href=\{`#\$\{FORM_ID\}`\}/g) ?? []
  const focusLinks = source.match(/focusTargetId=\{FORM_ID\}/g) ?? []
  const handoffEvents = source.match(/analyticsEvent="organic_handoff_opened"/g) ?? []
  equal(hashLinks.length, page.expectedLinks, `${page.path}: every promised action stays on the page`)
  equal(focusLinks.length, page.expectedLinks, `${page.path}: every handoff focuses its form`)
  equal(handoffEvents.length, page.expectedLinks, `${page.path}: in-page intent is measured separately`)
  equal((source.match(/<TopicGeneratorForm/g) ?? []).length, 1, `${page.path}: exactly one topic form exists`)
  ok(source.includes(`const FORM_ID = '${page.formId}'`), `${page.path}: form id is explicit and bounded`)
  ok(source.includes('formId={FORM_ID}'), `${page.path}: caller uses the same form id`)
  ok(source.includes('campaign={CAMPAIGN}') && source.includes('source={CAMPAIGN}'), `${page.path}: campaign survives through the real form`)
  ok(!source.includes(`/signup?create_intent=fast&intent_campaign=${page.oldIntent}`), `${page.path}: old promptless CTA is gone`)
  if (page.placement) {
    ok(source.includes(`placement="${page.placement}"`), `${page.path}: form placement is named`)
    ok(source.includes('utmSource="seo"') && source.includes('utmMedium="organic"'), `${page.path}: organic acquisition attribution crosses signup`)
    ok(source.includes('Nothing starts until you submit it.'), `${page.path}: no automatic-render promise is explicit`)
  }
}

const topicForm = read('app/youtube-shorts-from-topic/TopicGeneratorForm.tsx')
ok(topicForm.includes('name="prompt"'), 'shared form submits the visitor topic')
ok(topicForm.includes('name="create_intent" value="fast"'), 'shared form couples Fast intent to that submission')
ok(topicForm.includes('name="intent_campaign" value={campaign}'), 'shared form submits campaign attribution')
ok(topicForm.includes('required') && topicForm.includes('minLength={3}'), 'empty or trivial topic cannot submit')
ok(topicForm.includes('action="/signup"') && topicForm.includes('method="get"'), 'form uses the established resilient signup handoff')
ok(topicForm.indexOf('name="prompt"') < topicForm.indexOf('name="create_intent"'), 'visible work and creation intent share the same form')

const cta = read('components/OrganicCtaLink.tsx')
ok(cta.includes("analyticsEvent?: 'organic_cta_clicked' | 'organic_handoff_opened'"), 'shared CTA distinguishes a handoff from an exit')
ok(cta.includes('event.preventDefault()'), 'existing in-page handoff prevents navigation when target exists')
ok(cta.includes("target.querySelector<HTMLElement>('textarea, input, button')"), 'existing handoff focuses the first usable control')
ok(cta.includes("window.history.replaceState(null, '', `#${encodeURIComponent(focusTargetId)}`)"), 'URL records the focused section')

const preview = read('docs/previews/SEO-FORM-HANDOFF-2026-08-28.html')
ok(preview.includes('Before · promise leaves the page'), 'preview contains the old state')
ok(preview.includes('After · idea first, signup second'), 'preview contains the new state')
ok(preview.includes('Desktop') && preview.includes('Mobile'), 'preview labels both viewports')
ok(preview.includes('YouTube Automation') && preview.includes('Faceless channel') && preview.includes('Comparison hub'), 'preview covers all three pages')

console.log(`seo form handoff: ${checks}/${checks} checks passed`)
