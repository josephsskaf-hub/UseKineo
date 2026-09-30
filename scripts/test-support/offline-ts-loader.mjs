// Read/transpile real modules. All network, SDK and storage calls fail closed.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import crypto from 'node:crypto'

// `source(relPath, text)` (opcional) transforma a fonte antes de transpilar — ex.: um guardião histórico que precisa da
// régua da época (scripts/test-support/desfaz-cobertura-15s.mjs). Sem ele, a fonte real, como sempre.
export function createOfflineLoader({ mocks = {}, env = {}, globals = {}, source: transformSource = null } = {}) {
  const root = process.cwd(), cache = new Map()
  const unavailable = name => { throw new Error(`Offline test forbids ${name}`) }
  const external = {
    'node:crypto': crypto, crypto,
    openai: { __esModule: true, default: class { constructor() { unavailable('OpenAI') } }, toFile: () => unavailable('toFile') },
    '@supabase/supabase-js': { createClient: () => unavailable('Supabase') },
    ...mocks,
  }
  const context = {
    Buffer, URL, URLSearchParams, TextEncoder, TextDecoder,
    process: { env: { ...env } },
    console: { log() {}, warn() {}, error() {} },
    fetch: () => unavailable('network'),
    setTimeout: () => unavailable('timer'), clearTimeout() {},
    ...globals,
  }
  function load(specifier, parent = root) {
    if (Object.hasOwn(external, specifier)) return external[specifier]
    let filename = specifier.startsWith('@/') ? path.join(root, specifier.slice(2))
      : specifier.startsWith('.') ? path.resolve(parent, specifier) : path.resolve(root, specifier)
    if (!filename.startsWith(root + path.sep)) throw new Error(`Module outside test workspace: ${specifier}`)
    if (!fs.existsSync(filename)) filename += '.ts'
    if (!fs.existsSync(filename) || !/\.tsx?$/.test(filename)) throw new Error(`Unexpected import: ${specifier}`)
    if (cache.has(filename)) return cache.get(filename)
    const exports = {}
    cache.set(filename, exports)
    const raw = fs.readFileSync(filename, 'utf8')
    const source = transformSource ? transformSource(path.relative(root, filename).split(path.sep).join('/'), raw.replace(/\r\n/g, '\n')) : raw
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    vm.runInNewContext(code, {
      ...context, exports, require: name => load(name, path.dirname(filename)),
    }, { timeout: 5000, filename })
    return exports
  }
  return load
}
