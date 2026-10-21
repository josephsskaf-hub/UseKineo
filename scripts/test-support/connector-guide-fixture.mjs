// KINEO-PAGINAS-CONECTOR-2110 — executa componentes puros em memória; sem DOM, rede, banco, build ou render de vídeo.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const element = (type, props) => ({ type: typeof type === 'function' ? type.name : type, props: props ?? {} })
const stub = (name) => Object.defineProperty((props) => element(name, props), 'name', { value: name })

export function loadGuideFixture(overrides = {}) {
  const cache = new Map()
  const stateUpdates = []
  const clipboard = []
  const react = { useState: (initial) => [typeof initial === 'function' ? initial() : initial, (value) => stateUpdates.push(value)], useRef: () => ({ current: null }), useEffect: () => {} }
  function load(rel) {
    if (cache.has(rel)) return cache.get(rel)
    const source = overrides[rel] ?? rd(rel)
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (id) => {
      if (id === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' }
      if (id === 'react') return react
      if (id === 'next/link') return { __esModule: true, default: stub('Link') }
      if (id === '@/components/Footer') return { __esModule: true, default: stub('Footer') }
      if (id.endsWith('/ShowcaseGrid')) return { __esModule: true, default: stub('ShowcaseGrid') }
      if (id.endsWith('/ConnectPanel')) return { CopyField: stub('CopyField') }
      if (id.endsWith('/ClientGlyphs') || id === './ClientGlyphs') return { ClientGlyph: stub('ClientGlyph') }
      if (id === '@/components/ConnectorGuidePage') return { __esModule: true, default: stub('ConnectorGuidePage') }
      if (id === '@/lib/analytics') return { trackEvent: () => { throw new Error('telemetria proibida no fixture') } }
      if (id === '@/lib/claudeConnectClient') return { copyUrlAndOpenClaude: () => { throw new Error('navegação proibida no fixture') } }
      if (id.startsWith('@/')) {
        const base = id.slice(2)
        const resolved = ['.ts', '.tsx'].map((ext) => base + ext).find((file) => fs.existsSync(path.join(ROOT, file)))
        if (resolved) return load(resolved)
      }
      if (id === './palette') return load('app/claude-connector/palette.ts')
      throw new Error(`import não permitido no fixture: ${id} em ${rel}`)
    }
    vm.runInNewContext(output, { module, exports: module.exports, require: req, URL, setTimeout: () => 0, navigator: { clipboard: { writeText: async (value) => { clipboard.push(value) } } } }, { filename: rel })
    cache.set(rel, module.exports)
    return module.exports
  }
  const model = load('lib/seo/connectorGuides.ts')
  const page = load('components/ConnectorGuidePage.tsx').default
  return { load, model, page, stateUpdates, clipboard }
}

export function nodes(tree, predicate = () => true) {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, predicate))
  if (!tree || typeof tree !== 'object') return []
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)]
}

export function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join(' ')
  if (tree === null || tree === undefined || typeof tree === 'boolean') return ''
  if (typeof tree === 'object') return textOf(tree.props?.children)
  return String(tree)
}
