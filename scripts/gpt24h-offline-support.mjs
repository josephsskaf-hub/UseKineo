// Offline TS/TSX harness: real local modules, no Next server, credentials or network.
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(root, 'package.json'))
const ts = require('typescript')
export const React = require('react')
export const { renderToStaticMarkup } = require('react-dom/server')
export const source = (path) => readFileSync(resolve(root, path), 'utf8')
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))

export function offlineModules({ replacements = {}, mocks = {} } = {}) {
  const cache = new Map()
  function load(relative) {
    let file = resolve(root, relative)
    if (!existsSync(file)) file += existsSync(file + '.ts') ? '.ts' : '.tsx'
    const key = file.slice(root.length + 1).replace(/\\/g, '/')
    if (Object.hasOwn(mocks, key)) return mocks[key]
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    const input = replacements[key] ?? readFileSync(file, 'utf8')
    const code = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    function localRequire(name) {
      if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, prop) => prop === '__esModule' ? false : String(prop) })
      if (name === 'next/navigation') return { notFound() { throw new Error('NEXT_NOT_FOUND') } }
      if (name === 'next/image') return function Image({ priority, ...props }) { return React.createElement('img', props) }
      if (name === 'next/link') return function Link({ children, ...props }) { return React.createElement('a', props, children) }
      if (name === 'react' || name.startsWith('react/')) return require(name)
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(resolve(dirname(file), name))
      throw new Error(`Offline harness refuses non-local dependency: ${name}`)
    }
    vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, process: { env: { NODE_ENV: 'production' } }, console, URL, URLSearchParams, Date, Intl }, { filename: key })
    return module.exports
  }
  return load
}

export function checks() {
  let passed = 0, failed = 0
  return {
    check(name, condition) { console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`); condition ? passed++ : failed++ },
    finish() { console.log(`${passed} passed; ${failed} failed`); if (failed) process.exitCode = 1 },
  }
}
