// Offline: execute the real GET and local pure dependencies; no network/DB/env.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const route = 'app/llms.txt/route.ts'
const source = 'lib/affiliateCommission.ts'
function loadGraph(overrides = {}) {
  const cache = new Map()
  function load(relative) {
    const path = resolve(root, relative)
    assert.ok(path.startsWith(root + sep), 'module stays in workspace')
    if (cache.has(path)) return cache.get(path).exports
    const input = overrides[relative] ?? readFileSync(path, 'utf8')
    const module = { exports: {} }
    cache.set(path, module)
    const localRequire = (name) => {
      if (name === 'node:crypto') return { createHash }
      assert.ok(name.startsWith('@/lib/') || name.startsWith('.'), `No external dependency: ${name}`)
      const candidate = name.startsWith('@/') ? resolve(root, name.slice(2)) : resolve(dirname(path), name)
      const file = existsSync(candidate + '.ts') ? candidate + '.ts' : candidate + '/index.ts'
      assert.ok(file.startsWith(resolve(root, 'lib') + sep), 'pure lib dependency only')
      return load(file.slice(root.length + 1).replaceAll('\\', '/'))
    }
    vm.runInNewContext(ts.transpileModule(input, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, { module, exports: module.exports, require: localRequire, Response, URL,
      process: Object.freeze({ env: Object.freeze({ NODE_ENV: 'production' }) }),
    }, { timeout: 5000, filename: relative })
    return module.exports
  }
  return load
}
const actual = loadGraph()
const rate = actual(source).AFFILIATE_COMMISSION_PCT
const response = actual(route).GET()
assert.equal(response.status, 200)
assert.match(response.headers.get('Content-Type'), /^text\/plain/)
const body = await response.text()
const affiliateLine = (text) => text.split('\n').find(line => line.startsWith('- [Affiliate program]'))
assert.ok(affiliateLine(body)?.includes(`: ${rate} commission`), 'GET must publish canonical commission')

// In-memory source mutation: changing the canonical rate must change the GET.
// No real commission, code file or production setting is modified.
const canonical = readFileSync(resolve(root, source), 'utf8')
const changed = canonical.replace(/(AFFILIATE_COMMISSION_RATE\s*=\s*)[\d.]+/, (_, prefix) => prefix + '0.17')
assert.notEqual(changed, canonical)
const mutatedBody = await loadGraph({ [source]: changed })(route).GET().text()
assert.ok(affiliateLine(mutatedBody)?.includes(': 17% commission'), 'GET follows source, not a new hardcode')
assert.equal(mutatedBody.replace(affiliateLine(mutatedBody), ''), body.replace(affiliateLine(body), ''), 'No unrelated offer or content changes')
console.log('PASS: real GET, canonical commission, source mutation and unchanged other content; no network or DB')
