// KINEO-STUDIO-NA-MOLDURA-1011 — um "navegador de bolso" offline para o guardião e para as prévias: módulos REAIS transpilados
// (docs/recreate-0911/test-recreate.cjs → loader), hooks de React emulados com estado que persiste entre renders, efeitos de montagem
// executados uma vez, e cliques/digitação chamando os handlers DE VERDADE dos elementos. Rede, roteador, sessionStorage e eventos são
// dublês que só ANOTAM. Sem credencial, sem banco, sem fornecedor.
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { loader, read, ROOT } = require('../recreate-0911/test-recreate.cjs')
const React = require(path.join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(path.join(ROOT, 'node_modules/react-dom/server'))

const BASE = '1768381e8' // origin/main antes desta obra
const baseSrc = p => execFileSync('git', ['show', `${BASE}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
const link = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) }

/** Uma "aba": dublês + hooks emulados. `overrides` troca o fonte de arquivos (main antiga ou mutantes). */
function aba(overrides = {}, { now = 1_800_000_000_000, cookie = '', credits = null } = {}) {
  const log = { pushes: [], events: [], fetches: [], storage: new Map() }
  const store = new Map(), effects = []
  let cur = 'root', idx = 0
  const key = () => cur + '#' + idx++
  const react = {
    ...React,
    useState: init => { const k = key(); if (!store.has(k)) store.set(k, typeof init === 'function' ? init() : init); return [store.get(k), v => store.set(k, typeof v === 'function' ? v(store.get(k)) : v)] },
    useRef: init => { const k = key(); if (!store.has(k)) store.set(k, { current: init }); return store.get(k) },
    useMemo: f => { key(); return f() },
    useCallback: f => { key(); return f },
    useEffect: f => { const k = key(); if (!store.has(k)) { store.set(k, true); effects.push(f) } },
  }
  const analytics = {
    trackEvent: async (name, meta) => { log.events.push([name, meta]); return true },
    trackClosedEvent: async (name, meta) => { log.events.push([name, meta]); return 'stored' },
  }
  const navigation = { useRouter: () => ({ push: u => log.pushes.push(u), replace: u => log.pushes.push(u), prefetch: () => {} }) }
  const m = loader({ react, 'next/link': link, 'next/navigation': navigation, '@/lib/analytics': analytics }, overrides)
  // Globais do navegador, só o que os componentes tocam.
  const g = globalThis
  g.sessionStorage = { getItem: k => log.storage.get(k) ?? null, setItem: (k, v) => log.storage.set(k, String(v)), removeItem: k => log.storage.delete(k) }
  g.document = { cookie, querySelectorAll: () => [], querySelector: () => null }
  g.window = { matchMedia: () => ({ matches: false }), requestAnimationFrame: f => f(), addEventListener: () => {}, removeEventListener: () => {} }
  g.IntersectionObserver = class { observe() {} disconnect() {} }
  g.fetch = async (url, init) => { log.fetches.push([String(url), init?.method ?? 'GET']); return credits && String(url) === '/api/credits' ? { ok: true, json: async () => credits } : { ok: false, json: async () => null } }
  Date.now = () => now

  let rootEl = null
  function expand(node, p) {
    if (node == null || typeof node !== 'object') return node
    if (Array.isArray(node)) return node.map((n, i) => expand(n, p + '.' + i))
    if (typeof node.type === 'function') {
      const saved = [cur, idx]
      cur = p + '/' + (node.type.name || 'anon'); idx = 0
      const out = node.type(node.props)
      const here = cur
      ;[cur, idx] = saved
      return expand(out, here)
    }
    const props = { ...node.props }
    if (props.children !== undefined) props.children = expand(props.children, p + '>' + (typeof node.type === 'string' ? node.type : 'f'))
    if (node.key != null) props.key = node.key
    return React.createElement(node.type, props)
  }
  let tree = null
  function render(el) { if (el) rootEl = el; tree = expand(rootEl, 'root'); return tree }
  function mount(el) { render(el); for (let i = 0; i < effects.length; i++) effects[i](); return render() }
  function walk(pred, node, out) {
    if (node == null || typeof node !== 'object') return out
    if (Array.isArray(node)) { for (const n of node) walk(pred, n, out); return out }
    if (typeof node.type === 'string' && pred(node.props, node.type)) out.push(node)
    walk(pred, node.props?.children, out)
    return out
  }
  const all = pred => walk(pred, tree, [])
  function one(pred, what) {
    const hits = all(pred)
    if (hits.length !== 1) throw new Error(`${what}: ${hits.length} elementos`)
    return hits[0]
  }
  // KINEO-STUDIO-NA-MOLDURA-ABRE-1011 — deixa as promessas dos efeitos (fetch → setState) terminarem e redesenha.
  async function settle() { for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r)); return render() }
  return {
    m, log, mount, render, settle,
    html: () => renderToStaticMarkup(tree),
    one, all,
    click(pred, what) { one(pred, what).props.onClick({ preventDefault() {}, target: {}, currentTarget: {} }); return render() },
    type(pred, value, what) { one(pred, what).props.onChange({ target: { value, checked: value } }); return render() },
    select(pred, value, what) { one(pred, what).props.onChange({ target: { value } }); return render() },
  }
}

const visibleText = html => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"')

module.exports = { aba, baseSrc, BASE, React, renderToStaticMarkup, loader, read, ROOT, link, visibleText }
