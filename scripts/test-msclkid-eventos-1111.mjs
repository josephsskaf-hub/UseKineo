#!/usr/bin/env node
// ═══ KINEO-MSCLKID-EVENTOS-1111 — guardião: o clique pago do Bing (msclkid) viaja em todo evento do navegador ═════════
// POR QUÊ (leitura de 11/11 da Div. 3): o msclkid só ia para o cookie de clique pago (lib/growth/paidClickAttribution.ts);
// os eventos levavam utm_* e gclid, mas não o msclkid. Um anúncio do Bing sem utm chegava só com referrer bing.com e
// ficava igual à busca orgânica do Bing. Agora msclkid está em UTM_KEYS (lib/analytics.ts), junto com o gclid.
// Executa o CÓDIGO REAL (ts.transpileModule, @/ resolvido aqui, navegador simulado, sem rede) e prova:
//   1. URL só com ?msclkid= (sem utm) → o evento leva metadata.msclkid;
//   2. URL com utm + msclkid → leva os dois; o gclid continua indo como antes;
//   3. primeiro toque vence: outra página da mesma aba com outro msclkid não troca o guardado;
//   4. visita sem nenhum parâmetro → nada de msclkid inventado.
// Depois, MUTANTES em memória: cada regra quebrada TEM de deixar a prova vermelha.
//
// Rodar: node scripts/test-msclkid-eventos-1111.mjs
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(join(root, 'package.json'))
const ts = nodeRequire('typescript')
const CR = String.fromCharCode(13)
const disk = new Map()
const read = (rel) => {
  if (!disk.has(rel)) disk.set(rel, readFileSync(join(root, rel), 'utf8').split(CR).join(''))
  return disk.get(rel)
}
const src = (ov, rel) => ov[rel] ?? read(rel)

function resolveRel(fromRel, spec) {
  let base
  if (spec.startsWith('@/')) base = spec.slice(2)
  else if (spec.startsWith('.')) base = join(dirname(fromRel), spec).split(sep).join('/')
  else return null
  for (const ext of ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx']) {
    const cand = base + ext
    if (existsSync(join(root, cand)) && statSync(join(root, cand)).isFile()) return cand
  }
  throw new Error(`não resolvi ${spec} a partir de ${fromRel}`)
}

function loader(ov = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const out = ts.transpileModule(src(ov, rel), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: join(root, rel),
    }).outputText
    const module = { exports: {} }
    cache.set(rel, module)
    const req = (spec) => {
      const r = resolveRel(rel, spec)
      if (r === null) return nodeRequire(spec)
      return load(r)
    }
    new Function('require', 'module', 'exports', 'process', out)(req, module, module.exports, { env: {} })
    return module.exports
  }
  return load
}

// ─── navegador simulado (uma aba) ────────────────────────────────────────────────────────────────────────────────────
function storage() {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
function novaAba() {
  const sent = []
  const loc = { search: '', pathname: '/', hostname: 'www.usekineo.com', protocol: 'https:', href: 'https://www.usekineo.com/' }
  globalThis.window = { location: loc, crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' } }
  globalThis.sessionStorage = storage()
  globalThis.localStorage = storage()
  globalThis.document = { cookie: '', referrer: '' }
  globalThis.fetch = async (url, init) => {
    if (url === '/api/events') sent.push(JSON.parse(init.body))
    return { ok: true, json: async () => ({ stored: true }) }
  }
  const ir = (path, search) => { loc.pathname = path; loc.search = search; loc.href = `https://www.usekineo.com${path}${search}` }
  return { sent, ir }
}

const MS = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
const MS2 = 'ffffffffffffffffffffffffffffffff'
const GCLID = 'Cj0KCQjwTESTE_abc-123'
const A = 'lib/analytics.ts'

async function prova(ov = {}) {
  const p = []
  const L = loader(ov)
  const { trackEvent } = L(A)

  // 1. só msclkid
  {
    const aba = novaAba()
    aba.ir('/ai-video-generator/kling-3', `?msclkid=${MS}`)
    await trackEvent('landing_session_started', { source: 'bing.com' })
    const m = aba.sent.at(-1)?.metadata ?? {}
    if (m.msclkid !== MS) p.push('1 URL só com msclkid: o evento não levou metadata.msclkid')
  }
  // 2. utm + msclkid; gclid segue indo
  {
    const aba = novaAba()
    aba.ir('/ai-video-generator/kling-4', `?utm_source=bing&utm_medium=cpc&utm_campaign=motores_0810&utm_term=kling%203%20app&msclkid=${MS}`)
    await trackEvent('landing_session_started', {})
    const m = aba.sent.at(-1)?.metadata ?? {}
    if (m.msclkid !== MS) p.push('2 utm + msclkid: msclkid não foi junto')
    if (m.utm_source !== 'bing' || m.utm_campaign !== 'motores_0810' || m.utm_term !== 'kling 3 app') p.push('2 os utm deixaram de ir')
    const g = novaAba()
    g.ir('/pricing', `?utm_source=google&gclid=${GCLID}`)
    await trackEvent('landing_session_started', {})
    if ((g.sent.at(-1)?.metadata ?? {}).gclid !== GCLID) p.push('2 o gclid deixou de ir (regressão)')
  }
  // 3. primeiro toque vence
  {
    const aba = novaAba()
    aba.ir('/ai-video-generator/kling-3', `?msclkid=${MS}`)
    await trackEvent('landing_session_started', {})
    aba.ir('/pricing', `?msclkid=${MS2}`)
    await trackEvent('pricing_viewed', {})
    aba.ir('/create', '')
    await trackEvent('idea_submitted', {})
    if (aba.sent.some((e) => e.metadata?.msclkid !== MS)) p.push('3 o msclkid do primeiro toque não seguiu igual em todos os eventos da aba')
  }
  // 4. orgânico
  {
    const aba = novaAba()
    aba.ir('/how-much-do-youtube-shorts-pay', '')
    await trackEvent('landing_session_started', { source: 'bing.com' })
    const m = aba.sent.at(-1)?.metadata ?? {}
    if ('msclkid' in m) p.push('4 visita orgânica ganhou um msclkid')
  }
  return p
}

let passed = 0
const failed = []
const base = await prova()
if (base.length) failed.push(...base.map((x) => `BASE: ${x}`))
else passed += 4

// ─── mutantes ────────────────────────────────────────────────────────────────────────────────────────────────────────
const orig = read(A)
const mutants = [
  ['M1 msclkid fora de UTM_KEYS', orig.replace("'gclid', 'msclkid', 'ref'", "'gclid', 'ref'")],
  ['M2 eventos sem os utm guardados', orig.replace('{ ...storedUtms(), ...(metadata ?? {}) }', '{ ...(metadata ?? {}) }')],
  ['M3 último toque em vez do primeiro', orig.replace("if (sessionStorage.getItem('sfa_utms')) return // first-touch wins", '')],
  ['M4 captura só com utm_source', orig.replace('if (!UTM_KEYS.some((k) => sp.get(k))) return', "if (!sp.get('utm_source')) return")],
]
for (const [label, code] of mutants) {
  if (code === orig) { failed.push(`${label}: âncora não encontrada (o mutante não mudou nada)`); continue }
  const r = await prova({ [A]: code })
  if (r.length) passed++
  else failed.push(`${label}: SOBREVIVEU (a prova não pegou)`)
}

if (failed.length) {
  console.error(`✗ ${failed.length} falha(s):\n  - ${failed.join('\n  - ')}`)
  process.exit(1)
}
console.log(`✓ KINEO-MSCLKID-EVENTOS-1111: ${passed} ok (4 provas + ${mutants.length} mutantes vermelhos)`)
