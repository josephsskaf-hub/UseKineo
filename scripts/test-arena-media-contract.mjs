#!/usr/bin/env node
// KINEO-ARENA-MEDIA-CONTRACT-2026-08-27
// Deterministic, offline contract. No credentials or production writes.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks += 1 }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1 }

function executeTs(file) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => { throw new Error(`unexpected import ${id}`) },
  }, { filename: file })
  return moduleBox.exports
}

const examples = executeTs('lib/publicExamples.ts')
const page = read('app/arena/page.tsx')
const enginePage = read('app/ai-video-generator/[engine]/page.tsx')
const facts = read('lib/kineoFacts.ts')
const fighterIds = [...page.matchAll(/exampleId:\s*'([^']+)'/g)].map((match) => match[1])

equal(fighterIds.length, 7, 'arena declares all seven compared engines')
equal(new Set(fighterIds).size, fighterIds.length, 'arena has no duplicate fighter asset')
for (const id of fighterIds) {
  const example = examples.getPublicEngineExample(id)
  check(example, `${id} resolves through founder-owned allowlist`)
  equal(example.ownershipEvidence, 'founder_confirmed_owned', `${id} carries ownership evidence`)
  const previewPath = example.arenaPreviewPath ?? example.videoPath
  check(previewPath.startsWith('/'), `${id} Arena preview is local and cacheable`)
  const file = path.join(root, 'public', previewPath.slice(1))
  check(fs.existsSync(file), `${id} local Arena video exists`)
  check(fs.statSync(file).size > 20_000, `${id} local Arena video is non-empty`)
  check(fs.statSync(file).size < 2_000_000, `${id} Arena video stays below 2 MB`)
  const posterPath = example.arenaPosterPath ?? example.posterPath
  check(typeof posterPath === 'string' && posterPath.startsWith('/'), `${id} poster is centralized in the allowlist`)
  check(fs.existsSync(path.join(root, 'public', posterPath.slice(1))), `${id} poster file exists`)
}

const kineoOne = examples.getPublicEngineExample('c87c3a25-c3b7-4a97-8429-eb0fc98b67bc')
check(kineoOne?.engine === 'fast', 'Kineo 1 resolves to the approved Fast render')
check(kineoOne?.videoPath.startsWith('https://cqqukkvjjrguayiyjvhh.supabase.co/storage/'), 'home keeps the founder-selected Kineo 1 render')
check(kineoOne?.arenaPreviewPath === '/videos/example-turkmenistan.mp4', 'Arena uses the lightweight approved Kineo 1 preview')
check(!page.includes("preview: '/previews/c87c3a25-c3b7-4a97-8429-eb0fc98b67bc.mp4'"), 'dead Kineo 1 preview path is gone')
check(page.includes('getPublicEngineExample(f.exampleId)'), 'render resolves media from the allowlist')
check(page.includes('src={previewPath}'), 'video source is the Arena path resolved from the allowlist')
check(page.includes('poster={posterPath}'), 'poster source is resolved from the allowlist')
check(!/\bposter:\s*['"]/.test(page), 'Arena page has no duplicated poster paths')
check(!page.includes('autoPlay') && !page.includes('\n                loop'), 'seven videos do not autoplay or loop')
check(page.includes('preload="none"') && page.includes('controls') && page.includes('aria-label={`${f.badge} example:'), 'video is user-controlled, lazy and named')
check(page.includes("getTierPrice('starter', 'usd')"), 'Starter price comes from checkoutPricing')
check(page.includes('TRIAL_GRANT_CREDITS_COPY'), 'trial grant comes from the canonical free offer')
check(!page.includes('Plans from $7/month'), 'Arena has no literal plan price')
check(!page.includes('gets 25 free credits'), 'Arena has no literal trial grant')
check(page.includes('intent_campaign=arena'), 'engine CTA keeps campaign attribution')
check(page.includes('href="/studio?intent_campaign=arena&utm_source=seo&utm_medium=arena&utm_campaign=engine_arena"'), 'bottom CTA keeps acquisition intent without /free rewrite')
check(!page.includes('The most expensive per film'), 'Veo is not called the most expensive engine')
check(!page.includes('at half the price of the flagships'), 'Kling 2.5 has no false price ratio')
check(!page.includes('Nine-image consistency'), 'Arena does not promise nine-image H3 input')
check(!page.includes('Kling 3 is the only one'), 'Arena acknowledges H3 lip-sync dialogue')
check(!/up to nine reference images|accepts up to nine reference images|nine reference images/i.test(enginePage), 'H3 engine page matches the one-anchor-per-scene caller')
check(!/up to nine reference images|nine reference images/i.test(facts), 'LLM facts do not repeat the false H3 claim')
check(facts.includes('identity can still drift between shots'), 'LLM facts state the H3 limitation')

console.log(`PASS — ${checks}/${checks} Arena media-contract checks`)
