#!/usr/bin/env node
// ═══ KINEO-MS-UET-1111 — guardião da tag UET da Microsoft Ads e da meta "assinou" ═══════════════════════════════════
// Executa o CÓDIGO REAL (ts.transpileModule, @/ resolvido aqui, sem rede, sem banco, sem .env) e prova:
//   1. sem NEXT_PUBLIC_MS_UET_TAG_ID válido não existe tag: o layout entrega ao ConsentManager o MESMO elemento de
//      marketing de antes (mesma referência = mesmo HTML); ID que não é número não entra no <script>;
//   2. com ID: o pacote de marketing ganha a tag UMA vez, com o snippet oficial (ti, bat.js, SPA) e o sinal
//      ad_storage = granted; a tag só existe dentro do portão de consentimento (prop `marketing` do ConsentManager);
//   3. conversão: o evento 'kineo_subscribed' sai só de dispatchCheckoutPurchasePixels (compra confirmada pelo servidor),
//      só para ASSINATURA, com valor e moeda, uma vez por sessão da Stripe (recarregar a página não conta de novo);
//      sem a tag carregada, nada sai e nada é marcado como enviado.
// Depois, MUTANTES em memória: cada regra quebrada TEM de deixar a prova vermelha.
//
// Rodar: node scripts/test-ms-uet-1111.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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
const FRAGMENT = Symbol('Fragment')
const SCRIPT = function Script() {}
const JSX = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: FRAGMENT }
function loader(ov = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const out = ts.transpileModule(src(ov, rel), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: join(root, rel),
    }).outputText
    const module = { exports: {} }
    cache.set(rel, module)
    const req = (spec) => {
      if (spec === 'react/jsx-runtime') return JSX
      if (spec === 'next/script') return { __esModule: true, default: SCRIPT }
      if (spec === 'react') return {}
      const r = resolveRel(rel, spec)
      if (r === null) return nodeRequire(spec)
      return load(r)
    }
    new Function('require', 'module', 'exports', 'process', out)(req, module, module.exports, { env: {} })
    return module.exports
  }
  return load
}

let passed = 0
const failed = []
const check = (cond, label) => { if (cond) passed++; else failed.push(label); return Boolean(cond) }

const LIB = 'lib/growth/microsoftUet.ts'
const COMP = 'components/MicrosoftUetTag.tsx'
const PIX = 'lib/growth/checkoutPurchasePixels.ts'
const LAYOUT = 'app/layout.tsx'
const ID = '187654321'

// ─── 1 e 2. tag ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function provaTag(ov = {}) {
  const p = []
  const L = loader(ov)
  const { msUetTagId, msUetSnippet } = L(LIB)
  if (msUetTagId(` ${ID} `) !== ID) p.push('1 ID numérico válido não passa')
  for (const bad of ['', undefined, null, 'abc123', '12', '123"});alert(1);//', '1234567890123', 'ywlh8m9437']) {
    if (msUetTagId(bad) !== null) p.push(`1 ID inválido passou: ${JSON.stringify(bad)}`)
    if (typeof bad === 'string' && msUetSnippet(bad) !== null) p.push(`1 snippet com ID inválido: ${JSON.stringify(bad)}`)
  }
  const s = msUetSnippet(ID) ?? ''
  const count = (needle) => s.split(needle).length - 1
  if (count(`ti:"${ID}"`) !== 1) p.push('2 o snippet não tem ti:"<ID>" exatamente uma vez')
  if (count('//bat.bing.com/bat.js') !== 1) p.push('2 o snippet não carrega bat.bing.com/bat.js uma vez')
  if (!s.includes('enableAutoSpaTracking:true')) p.push('2 sem enableAutoSpaTracking (o Next navega sem recarregar)')
  if (!s.includes('w[u].push("pageLoad")')) p.push('2 sem o pageLoad oficial')
  const iTag = s.indexOf('bat.bing.com'), iConsent = s.indexOf("window.uetq.push('consent','update',{'ad_storage':'granted'})")
  if (iConsent < 0 || iConsent < iTag) p.push('2 sem o sinal ad_storage = granted depois da tag (Basic Consent Mode)')
  if (/'consent','default'/.test(s)) p.push('2 consent default no snippet (a tag só roda depois do sim)')

  const { default: Tag, withMicrosoftUet } = L(COMP)
  const base = { type: FRAGMENT, props: { children: ['gtag', 'tiktok'] } }
  if (withMicrosoftUet(base, null) !== base) p.push('1 sem ID o pacote de marketing não é o MESMO elemento')
  const withTag = withMicrosoftUet(base, ID)
  const kids = withTag?.props?.children
  if (withTag === base || !Array.isArray(kids) || kids.length !== 2 || kids[0] !== base || kids[1]?.type !== Tag || kids[1]?.props?.tagId !== ID) {
    p.push('2 com ID o pacote não vira [marketing de antes, <MicrosoftUetTag tagId>]')
  }
  const rendered = Tag({ tagId: ID })
  if (rendered?.type !== SCRIPT || rendered.props.id !== 'ms-uet' || rendered.props.strategy !== 'afterInteractive' || rendered.props.children !== s) {
    p.push('2 a tag não é um <Script id="ms-uet" afterInteractive> com o snippet')
  }
  if (Tag({ tagId: 'abc' }) !== null) p.push('1 a tag renderiza com ID inválido')

  // layout: um ponto de montagem, dentro do portão
  const lay = src(ov, LAYOUT)
  if (!/^const MS_UET_TAG_ID = msUetTagId\(process\.env\.NEXT_PUBLIC_MS_UET_TAG_ID \|\| KINEO_MS_UET_TAG_ID\)/m.test(lay)) p.push('1 o layout não lê NEXT_PUBLIC_MS_UET_TAG_ID pela régua msUetTagId')
  if ((lay.match(/withMicrosoftUet\(/g) ?? []).length !== 1 || !/<ConsentManager marketing=\{withMicrosoftUet\(marketingTags, MS_UET_TAG_ID\)\} clarity=/.test(lay)) {
    p.push('2 a tag não entra só pela prop marketing do ConsentManager (portão de consentimento)')
  }
  if (/<MicrosoftUetTag\b|bat\.bing\.com|uetq/.test(lay)) p.push('2 o layout monta a tag fora do portão')
  // a Privacidade lista a Microsoft Advertising entre as tags de marketing (as que esperam o consentimento)
  if (!/Microsoft Advertising \(conversion measurement, only while we run\s+Bing ads\)/.test(src(ov, 'app/privacy/page.tsx'))) p.push('2 /privacy não conta que a Microsoft Advertising mede conversões')
  for (const rel of codeFiles()) {
    if (rel === LIB || rel === COMP || rel === PIX || rel === LAYOUT) continue
    const f = src(ov, rel)
    if (/bat\.bing\.com|withMicrosoftUet|MicrosoftUetTag|NEXT_PUBLIC_MS_UET_TAG_ID/.test(f)) p.push(`2 ${rel} também mexe na tag UET (era para ter um dono só)`)
  }
  return p
}
function codeFiles() {
  const out = []
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const rel = `${dir}/${name}`
      const st = statSync(join(root, rel))
      if (st.isDirectory()) walk(rel)
      else if (/\.(ts|tsx|js|jsx)$/.test(name)) out.push(rel)
    }
  }
  for (const d of ['app', 'components', 'lib']) walk(d)
  return out
}
const CODE = codeFiles()

// ─── 3. conversão ────────────────────────────────────────────────────────────────────────────────────────────────────
async function provaConversao(ov = {}) {
  const p = []
  const L = loader(ov)
  const { dispatchCheckoutPurchasePixels, MS_UET_SUBSCRIPTION_EVENT } = L(PIX)
  if (MS_UET_SUBSCRIPTION_EVENT !== 'kineo_subscribed') p.push(`3 a ação mudou (a meta do painel casa 'kineo_subscribed'): ${MS_UET_SUBSCRIPTION_EVENT}`)
  const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m } }
  const pushes = []
  const uetq = { push: (...a) => pushes.push(a) }
  const sub = { sessionId: 'cs_live_a1B2c3D4e5F6g7H8', mode: 'subscription', amountMinor: 1900, currency: 'USD', value: 19 }
  const st = mem()
  dispatchCheckoutPurchasePixels(sub, { uetq }, st)
  const ev = pushes[0]
  if (pushes.length !== 1 || ev[0] !== 'event' || ev[1] !== 'kineo_subscribed' || ev[2]?.revenue_value !== 19 || ev[2]?.currency !== 'USD') {
    p.push(`3 assinatura confirmada não gera UM evento kineo_subscribed com valor e moeda: ${JSON.stringify(pushes)}`)
  }
  dispatchCheckoutPurchasePixels(sub, { uetq }, st)
  if (pushes.length !== 1) p.push('3 a mesma sessão contou duas vezes (mesmo módulo)')
  // página recarregada: módulo novo, mesmo sessionStorage
  const L2 = loader(ov)
  const pushes2 = []
  L2(PIX).dispatchCheckoutPurchasePixels(sub, { uetq: { push: (...a) => pushes2.push(a) } }, st)
  if (pushes2.length !== 0) p.push('3 recarregar a página de sucesso contou de novo')
  // avulso não é "assinou"
  const pushes3 = []
  dispatchCheckoutPurchasePixels({ ...sub, sessionId: 'cs_live_Z9y8X7w6V5u4T3s2', mode: 'payment' }, { uetq: { push: (...a) => pushes3.push(a) } }, mem())
  if (pushes3.length !== 0) p.push('3 compra avulsa disparou a meta "assinou"')
  // dado inválido (valor 0, moeda estranha, sessão que não é da Stripe) não dispara
  for (const bad of [{ ...sub, amountMinor: 0, value: 0 }, { ...sub, currency: 'EUR' }, { ...sub, sessionId: 'abc' }]) {
    const pb = []
    dispatchCheckoutPurchasePixels(bad, { uetq: { push: (...a) => pb.push(a) } }, mem())
    if (pb.length) p.push(`3 compra inválida disparou: ${JSON.stringify(bad)}`)
  }
  // sem a tag: nada sai e nada é marcado; quando a tag chega, conta uma vez
  const st4 = mem()
  const s4 = { ...sub, sessionId: 'cs_live_Q1w2E3r4T5y6U7i8' }
  dispatchCheckoutPurchasePixels(s4, {}, st4)
  if ([...st4.m.keys()].some((k) => k.includes(':microsoft:'))) p.push('3 sem a tag carregada, a conversão foi marcada como enviada')
  const p4 = []
  dispatchCheckoutPurchasePixels(s4, { uetq: { push: (...a) => p4.push(a) } }, st4)
  if (p4.length !== 1) p.push('3 depois que a tag chega, a conversão não sai')
  // só a compra verificada chama o disparador; a ação só existe no disparador
  for (const rel of CODE) {
    if (rel === PIX) continue
    if (/kineo_subscribed|MS_UET_SUBSCRIPTION_EVENT|uetq\.push\(\s*['"]event/.test(src(ov, rel)) && rel !== 'lib/growth/microsoftUet.ts') p.push(`3 ${rel} também dispara a conversão`)
  }
  const obs = src(ov, 'lib/growth/observeCheckoutPurchase.ts')
  if (!/result\.state === 'verified'[\s\S]{0,120}purchase = result\.purchase[\s\S]{0,40}flush\(\)/.test(obs)) p.push('3 o observador não espera a verificação do servidor antes de disparar')
  return p
}

const PROVAS = [
  ['1/2 tag só com ID, dentro do portão, uma vez', provaTag],
  ['3 conversão só na assinatura confirmada, uma vez', provaConversao],
]
for (const [label, prova] of PROVAS) {
  let p
  try { p = await prova() } catch (e) { p = [`quebrou: ${e.stack ?? e}`] }
  check(p.length === 0, `${label} — ${p.join(' | ')}`)
}

function troca(rel, de, para) {
  return () => {
    const s = read(rel)
    const n = s.split(de).length - 1
    if (n !== 1) throw new Error(`âncora ${n}x em ${rel}: ${de.slice(0, 60)}`)
    return { [rel]: s.split(de).join(para) }
  }
}
const MUTANTES = [
  ['M1 ID aceita qualquer texto', provaTag, troca(LIB, 'export const MS_UET_TAG_ID_PATTERN = /^\\d{4,12}$/', 'export const MS_UET_TAG_ID_PATTERN = /^.+$/')],
  ['M2 sem ID ainda embrulha', provaTag, troca(COMP, '  if (!tagId) return marketing\n', '')],
  ['M3 sem o sinal de consentimento', provaTag, troca(LIB, "    `window.uetq=window.uetq||[];window.uetq.push('consent','update',{'ad_storage':'granted'});`,\n", '')],
  ['M4 sem SPA', provaTag, troca(LIB, ',enableAutoSpaTracking:true', '')],
  ['M5 layout tira a tag do portão', provaTag, troca(LAYOUT, 'marketing={withMicrosoftUet(marketingTags, MS_UET_TAG_ID)}', 'marketing={marketingTags}')],
  ['M6 layout lê a env sem a régua', provaTag, troca(LAYOUT, 'const MS_UET_TAG_ID = msUetTagId(process.env.NEXT_PUBLIC_MS_UET_TAG_ID || KINEO_MS_UET_TAG_ID)', "const MS_UET_TAG_ID = process.env.NEXT_PUBLIC_MS_UET_TAG_ID || null")],
  ['M7 tag duplicada no pacote', provaTag, troca(COMP, '      <MicrosoftUetTag tagId={tagId} />\n', '      <MicrosoftUetTag tagId={tagId} />\n      <MicrosoftUetTag tagId={tagId} />\n')],
  ['M8 id do Script muda', provaTag, troca(COMP, '<Script id="ms-uet" strategy="afterInteractive">', '<Script id="ms-uet" strategy="lazyOnload">')],
  ['M14 Privacidade esquece a Microsoft', provaTag, troca('app/privacy/page.tsx', 'Microsoft Advertising (conversion measurement, only while we run', 'Bing (only while we run')],
  ['M9 avulso também conta', provaConversao, troca(PIX, "purchase.mode === 'subscription' && typeof targets.uetq?.push", 'typeof targets.uetq?.push')],
  ['M10 sem valor', provaConversao, troca(PIX, ' revenue_value: purchase.value,', '')],
  ['M11 ação diferente da meta', provaConversao, troca(PIX, "export const MS_UET_SUBSCRIPTION_EVENT = 'kineo_subscribed'", "export const MS_UET_SUBSCRIPTION_EVENT = 'purchase'")],
  ['M12 conversão fora da trava por sessão', provaConversao, troca(PIX, "  send('microsoft', purchase.mode === 'subscription' && typeof targets.uetq?.push === 'function' ? () => targets.uetq!.push(", "  if (purchase.mode === 'subscription' && targets.uetq) (() => targets.uetq!.push(")],
  ['M13 observador dispara sem verificar', provaConversao, troca('lib/growth/observeCheckoutPurchase.ts', "      if (result.state === 'verified' && result.purchase?.sessionId === input.sessionId) {", "      if (result.purchase) {")],
]
for (const [label, prova, mutar] of MUTANTES) {
  let ov
  try { ov = mutar() } catch (e) { check(false, `${label}: ${e.message}`); continue }
  let p
  try { p = await prova(ov) } catch (e) { p = [`quebrou: ${e.message}`] }
  check(p.length > 0, `${label}: a prova ficou VERDE com a regra quebrada`)
  if (process.argv.includes('--verbose')) console.log(`  ${label} → ${p[0] ?? '(verde)'}`)
}

if (failed.length) {
  for (const f of failed) console.log(`  ✗ ${f}`)
  console.log(`\n${passed} ok, ${failed.length} FALHA(S) — test-ms-uet-1111`)
  process.exit(1)
}
console.log(`${passed} verificações ok — test-ms-uet-1111 (${PROVAS.length} provas, ${MUTANTES.length} mutantes vermelhos)`)
