#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('app/sora-alternative/page.tsx', 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }

check(source.includes("import TopicGeneratorForm"), 'real Sora page imports the canonical topic form')
check(source.includes('<TopicGeneratorForm'), 'migration decision renders the canonical form')
check(source.includes('campaign="sora_migration_topic_v1"'), 'campaign is stable and versioned')
check(source.includes('source="sora_alternative"'), 'source identifies the organic page')
check(source.includes('placement="migration_decision"'), 'placement identifies the decision point')
check(source.includes('analyticsVariant="sora_migration_topic_v1"'), 'analytics variant matches the campaign')
check(source.includes('formId="sora-migration-topic"'), 'form has a unique accessible id')
check(source.includes('scriptMode="ai"'), 'one idea requests AI authorship')
check(source.includes('duration={35}'), 'first test uses the supported 35-second duration')
check(source.includes('creationIntent="trial_best"'), 'migration path uses the approved trial-best rail')
check(source.includes('preserveHandoffForSignedIn'), 'signed-in visitors keep the idea too')
check(source.includes('before any render begins'), 'copy states the review boundary')
check(!source.includes('/free?utm_source=sora_alternative'), 'old generic /free jump is removed')
check(!source.includes('utmSource='), 'form does not overwrite the real first-touch source')
check(source.indexOf('<TopicGeneratorForm') < source.indexOf('Why trust this page?'), 'form appears at the migration decision before the trust appendix')
check(source.includes('sora.chatgpt.com/sunset'), 'export guidance remains intact')
check(source.includes('help.openai.com/en/articles/20001152'), 'primary-source link remains intact')

console.log(`PASS — ${checks}/${checks} Sora migration topic checks`)
