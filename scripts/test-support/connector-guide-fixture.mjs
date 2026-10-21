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

export function loadGuideFixture(overrides = {}, boundaries = {}) {
  const cache = new Map()
  const stateUpdates = []
  const clipboard = []
  const react = { useState: (initial) => [typeof initial === 'function' ? initial() : initial, (value) => stateUpdates.push(value)], useRef: () => ({ current: null }), useEffect: () => {} }
  function load(rel) {
    if (Object.hasOwn(boundaries, rel)) return boundaries[rel]
    if (rel.endsWith('.json')) return JSON.parse(overrides[rel] ?? rd(rel))
    if (cache.has(rel)) return cache.get(rel)
    const source = overrides[rel] ?? rd(rel)
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (id) => {
      if (id === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' }
      if (id === 'react') return react
      if (id === 'node:crypto') return require('node:crypto')
      if (id === 'next/navigation') return { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, redirect: () => { throw new Error('NEXT_REDIRECT') } }
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
        const resolved = ['', '.ts', '.tsx', '.json'].map((ext) => base + ext).find((file) => fs.existsSync(path.join(ROOT, file)))
        if (resolved) return load(resolved)
      }
      if (id.startsWith('.')) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), id))
        const resolved = ['', '.ts', '.tsx', '.json'].map((ext) => target + ext).find((file) => fs.existsSync(path.join(ROOT, file)))
        if (resolved) return load(resolved)
      }
      throw new Error(`import não permitido no fixture: ${id} em ${rel}`)
    }
    vm.runInNewContext(output, { module, exports: module.exports, require: req, URL, URLSearchParams, Date, Intl, Buffer, Response, TextEncoder, TextDecoder, process: { env: { NODE_ENV: 'production' } }, console: { log() {}, warn() {}, error() {} }, fetch: () => { throw new Error('rede proibida') }, setTimeout: () => 0, navigator: { clipboard: { writeText: async (value) => { clipboard.push(value) } } } }, { filename: rel })
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

// Só as páginas alheias ao lote são fronteiras estáticas. Sitemap, llms e todas
// as fontes dos novos guias são executados de verdade, com os loaders offline da casa.
export async function guideDistribution(overrides = {}) {
  const sitemap = loadGuideFixture(overrides, {
    'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: [] },
    'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: [] },
    'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] },
    'lib/comparisons.ts': { CANONICAL_SLUGS: [] },
    'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
    'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
    'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: (x) => x },
    'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: [], CITATION_REVIEW_DATE: '2026-09-27' },
    'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] },
  }).load('app/sitemap.ts').default()
  const response = loadGuideFixture(overrides).load('app/llms.txt/route.ts').GET()
  return { sitemap, llms: await response.text() }
}
