import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

export const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(resolve(root, 'package.json'))
const ts = require('typescript')
export const React = require('react')
export const { renderToStaticMarkup } = require('react-dom/server')
export const source = (file) => readFileSync(resolve(root, file), 'utf8')

export function offlineCompanyOffer({ replacements = {}, mocks = {}, fetch, globals = {} } = {}) {
  const compiled = new Map()
  function load(file) {
    let filename = resolve(root, file)
    if (!extname(filename)) filename += existsSync(filename + '.ts') ? '.ts' : '.tsx'
    const relative = filename.slice(root.length).replace(/\\/g, '/')
    const key = relative.replace(/^\/+/, '')
    if (compiled.has(key)) return compiled.get(key).exports
    if (Object.hasOwn(mocks, key)) return mocks[key]
    const module = { exports: {} }
    compiled.set(key, module)
    const transpiled = ts.transpileModule(replacements[key] ?? source(key), {
      fileName: key,
      compilerOptions: {
        esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      },
    }).outputText
    function localRequire(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
      if (specifier === 'server-only' || specifier.endsWith('.css')) return {}
      if (specifier === 'next/navigation') return { notFound() { throw Error('OFF_404') } }
      if (specifier === 'next/server') return { NextResponse: Response }
      if (specifier === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children)
      if (specifier === 'crypto' || specifier === 'node:crypto' || specifier === 'react' || specifier.startsWith('react/')) {
        return require(specifier)
      }
      if (specifier.startsWith('@/')) return load(specifier.slice(2))
      if (specifier.startsWith('.')) return load(resolve(dirname(filename), specifier))
      throw Error('Offline module not authorized: ' + specifier)
    }
    runInNewContext(transpiled, {
      module, exports: module.exports, require: localRequire, URL, URLSearchParams, Intl, Response, TextDecoder, Request,
      fetch: fetch ?? (() => { throw Error('Unexpected network call') }),
      process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-not-a-secret' } },
      console: { error() {}, warn() {}, log() {} },
      ...globals,
    }, { filename: key })
    return module.exports
  }
  return load
}
