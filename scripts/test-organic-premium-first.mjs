#!/usr/bin/env node

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks += 1 }

const free = read('app/free-ai-shorts-generator/page.tsx')
const faceless = read('app/faceless-video-generator/page.tsx')
const niches = read('app/free-ai-shorts/[niche]/page.tsx')
const helper = read('lib/growth/publicCreationIntent.ts')
const trial = read('lib/growth/trialActivationIntent.ts')
const offer = read('lib/freeTierOffer.ts')

for (const [name, source] of [
  ['free generator', free],
  ['faceless generator', faceless],
  ['niche template', niches],
]) {
  check(
    source.includes("creationIntent={OFFER.reverseTrial ? 'trial_best' : 'fast'}"),
    name + ': active reverse trial requests trial_best while legacy offer keeps Fast',
  )
  check(source.includes('starts with Seedance when its balance covers it'), name + ': form explains premium-first')
  check(source.includes('falls back safely to Fast'), name + ': ineligible state is explained')
}

check(helper.includes("type PromptedCreationIntent = 'fast' | 'trial_best'"), 'helper accepts only internal intents')
check(helper.includes('create_intent: input.creationIntent'), 'helper carries the selected intent through signup')
check(helper.includes("creationIntent: 'fast'"), 'legacy Fast wrapper stays unchanged')
check(niches.includes('buildPromptedSignupHref({'), 'niche links use the intent-aware helper')
check(niches.includes("creationIntent: OFFER.reverseTrial ? 'trial_best' : 'fast'"), 'niche links obey the active offer')
check(trial.includes("input.createIntent === 'trial_best'"), 'premium intent remains guarded')
check(trial.includes('input.credits >= input.seedanceCreditCost'), 'insufficient balance cannot dispatch Seedance')
check(offer.includes('export const TRIAL_GRANT_CREDITS_COPY = 25'), 'grant remains 25 credits')

const preview = read('docs/previews/ORGANIC-PREMIUM-FIRST-2026-08-29.html')
for (const label of [
  'FREE GENERATOR', 'NICHE PAGE', 'FACELESS GENERATOR',
  'BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE',
]) check(preview.includes(label), 'preview includes ' + label)

console.log('PASS — ' + checks + '/' + checks + ' organic premium-first checks')
