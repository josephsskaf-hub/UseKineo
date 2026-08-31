#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }
const deepEqual = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)((id) => {
    throw new Error(`${path}: unexpected import ${id}`)
  }, module, module.exports)
  return module.exports
}

const policy = loadTs('lib/growth/freeFinishedScriptBridge.ts')
equal(policy.FREE_FINISHED_SCRIPT_BRIDGE_VERSION, 'free_finished_script_bridge_v1', 'version is stable')
equal(policy.FREE_FINISHED_SCRIPT_BRIDGE_DESTINATION, '/text-to-video-shorts#try-text-to-video-mode-heading', 'destination targets the existing mode chooser')
equal(policy.FREE_FINISHED_SCRIPT_BRIDGE_PLACEMENT, 'before_topic_form', 'placement is finite')
equal(policy.FREE_FINISHED_SCRIPT_BRIDGE_VISIBLE_RATIO, 0.35, 'view requires 35 percent visibility')
equal(policy.FREE_FINISHED_SCRIPT_BRIDGE_GATE_PEOPLE, 10, 'gate counts ten external people after click')
deepEqual(policy.FREE_FINISHED_SCRIPT_BRIDGE_METADATA, {
  version: 'free_finished_script_bridge_v1',
  destination: 'text_to_video_finished_script',
  placement: 'before_topic_form',
}, 'metadata is finite and PII-free')

const page = read('app/free-ai-shorts-generator/page.tsx')
ok(page.includes("import FreeFinishedScriptBridge from '@/components/growth/FreeFinishedScriptBridge'"), 'real campaign page imports the bridge')
ok(page.includes('<FreeFinishedScriptBridge />'), 'real campaign page renders the bridge')
ok(page.indexOf('<FreeFinishedScriptBridge />') < page.indexOf('<TopicGeneratorForm'), 'choice appears before the ambiguous topic form')
ok(page.includes('placeholder: \'Type one topic or paste your script\''), 'existing broad input remains unchanged')
ok(page.includes(`const CAMPAIGN = 'push60_free_ai_shorts_generator'`), 'existing acquisition campaign remains unchanged')

const component = read('components/growth/FreeFinishedScriptBridge.tsx')
ok(component.includes("trackEvent('free_finished_script_bridge_viewed'"), 'view event is wired')
ok(component.includes("trackEvent('free_finished_script_bridge_clicked'"), 'click event is wired')
ok(component.includes('intersectionRatio >= FREE_FINISHED_SCRIPT_BRIDGE_VISIBLE_RATIO'), 'view event enforces canonical threshold')
ok(component.includes("sessionStorage.setItem(FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER, '1')"), 'view dedupe closes only after stored event')
ok(component.includes('const pendingViews = new Set<string>()'), 'in-memory guard closes remount race')
ok(!component.includes("sessionStorage.setItem(FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER, 'pending')"), 'interrupted request cannot strand a pending marker')
ok(component.includes('Already have a finished script?'), 'copy names the mismatch')
ok(component.includes('Keep the spoken wording'), 'copy describes the existing verbatim behavior')
ok(component.includes('Choose finished-script mode'), 'CTA names the explicit choice at the destination')
ok(!component.includes('utm_'), 'bridge cannot overwrite first-touch attribution')
ok(!component.includes('email'), 'telemetry contains no email')

const destination = read('app/text-to-video-shorts/TextToVideoIntentForm.tsx')
ok(destination.includes("finished_script: {"), 'destination keeps a finished-script mode')
ok(destination.includes("scriptMode={selected.scriptMode}"), 'destination passes the selected mode to handoff')
ok(destination.includes('formId}-mode-heading'), 'destination renders the exact target anchor')

const intent = loadTs('lib/growth/textToVideoIntent.ts')
const finished = intent.getTextToVideoInputMode('finished_script')
equal(finished.scriptMode, 'verbatim', 'finished-script mode remains verbatim')
equal(finished.duration, 35, 'finished-script duration remains 35 seconds')

const previewPath = 'docs/previews/FREE-FINISHED-SCRIPT-BRIDGE-2026-08-31.html'
ok(existsSync(join(root, previewPath)), 'self-contained visual comparison exists')
const preview = read(previewPath)
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label.toLowerCase()}`)
}
ok(!/https?:\/\//i.test(preview), 'preview has no external dependency')

console.log(`PASS — ${checks}/${checks} free finished-script bridge checks`)
