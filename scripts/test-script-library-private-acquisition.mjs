#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'

const page = fs.readFileSync('app/scripts/page.tsx', 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }

check(page.includes("PRIVATE_FORM_CAMPAIGN = 'script_library_private_topic_v1'"), 'private script acquisition has a stable version')
check(page.includes('<TopicGeneratorForm'), 'private state renders the existing topic handoff form')
check(page.includes('source="script_library_private"'), 'private state declares its own analytics source')
check(page.includes('placement="private_topic_form"'), 'private state declares its exact placement')
check(page.includes('scriptMode="ai"'), 'a topic is authored instead of treated as a finished script')
check(page.includes('duration={35}'), 'handoff uses the lowest supported Short duration')
check(page.includes('creationIntent="fast"'), 'handoff stays on the lowest-cost workflow')
check(page.includes('preserveHandoffForSignedIn'), 'signed-in visitors keep the topic through the auth route')
check(page.includes('Nothing renders until you review and continue.'), 'copy states the no-autostart boundary')
check(!page.includes('placement="private_state"'), 'generic private-state CTA was replaced, not duplicated')

const privateBranchStart = page.indexOf('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED)')
const libraryFetch = page.indexOf('const lib = await getScriptLibrary()')
const form = page.indexOf('<TopicGeneratorForm')
check(privateBranchStart >= 0 && form > privateBranchStart && form < libraryFetch, 'form exists only in the privacy-safe branch before library access')

const preview = fs.readFileSync('docs/previews/SCRIPT-LIBRARY-PRIVATE-TOPIC-2026-08-30.html', 'utf8')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(preview.includes(label), `preview includes ${label}`)
}

console.log(`PASS — ${checks}/${checks} private script acquisition checks`)
