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
function ok(value, label) { assert.ok(value, label); checks += 1 }
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${path}: unexpected import ${id}`)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

const intent = loadTs('lib/growth/engineLandingIntent.ts')
const expected = {
  fast: '/ai-video-generator/kineo-1',
  seedance: '/ai-video-generator/seedance',
  kling: '/ai-video-generator/kling',
  veo: '/ai-video-generator/veo',
  hollywood: '/ai-video-generator/kling-3',
  h3: '/ai-video-generator/minimax-h3',
  omni: '/ai-video-generator/gemini-omni-flash',
}

equal(Object.keys(intent.ENGINE_LANDING_PUBLIC_PATHS).sort().join(','), Object.keys(expected).sort().join(','), 'every live engine has one public destination')
for (const [engine, path] of Object.entries(expected)) {
  equal(intent.ENGINE_LANDING_PUBLIC_PATHS[engine], path, `${engine}: canonical path is exact`)
  equal(intent.engineLandingPublicPath(engine), path, `${engine}: public helper executes`)
  ok(path.startsWith('/ai-video-generator/'), `${engine}: destination stays inside the engine cluster`)
  ok(!path.includes('?') && !path.includes('#'), `${engine}: canonical destination carries no attribution or fragment`)
}

const facts = read('lib/kineoFacts.ts')
ok(facts.includes("import { engineLandingPublicPath } from './growth/engineLandingIntent'"), 'public facts use the shared destination source')
for (const engine of Object.keys(expected)) {
  ok(facts.includes(`engineLandingPublicPath('${engine}')`), `${engine}: facts derive the engine URL`)
}
ok(facts.includes("url: `${BASE}/ai-avatar`"), 'Avatar keeps its canonical standalone page')
equal((facts.match(/url: `\$\{BASE\}\$\{engineLandingPublicPath\('/g) ?? []).length, 7, 'all seven video-engine URLs are derived once')

const llms = read('app/llms.txt/route.ts')
ok(llms.includes('[**${engine.name}**](${engine.url})'), 'llms catalog emits a direct Markdown link per engine')
ok(!llms.includes('`- **${engine.name}** — ${engine.credits}'), 'unlinked engine catalog is removed')

const api = read('app/api/facts/route.ts')
ok(api.includes('getKineoFacts()'), 'JSON endpoint still serializes the canonical facts object')
ok(facts.includes('engines: ENGINE_FACTS'), 'JSON payload still publishes the engine catalog')

const enginePage = read('app/ai-video-generator/[engine]/page.tsx')
for (const [engine, path] of Object.entries(expected)) {
  const slug = path.split('/').pop()
  const key = slug.includes('-') ? `'${slug}': {` : `${slug}: {`
  const entryStart = enginePage.indexOf(key)
  ok(entryStart >= 0, `${engine}: destination slug exists in the generated engine catalog`)
  const entryEnd = enginePage.indexOf('\n  },', entryStart)
  ok(entryEnd > entryStart, `${engine}: generated engine entry is structurally bounded`)
  const entry = enginePage.slice(entryStart, entryEnd)
  ok(entry.includes(`param: '${engine}'`), `${engine}: destination resolves to the matching generator parameter`)
}

const avatarPage = read('app/ai-avatar/page.tsx')
ok(avatarPage.includes("canonical: 'https://www.usekineo.com/ai-avatar'"), 'Avatar destination exists with the published canonical URL')

console.log(`AEO engine destinations: ${checks}/${checks} checks passed`)
