#!/usr/bin/env node
// KINEO-SEO-FAQ-SO-ONDE-VISIVEL-2026-09-07 — FAQPage só junto do FAQ visível.
// KINEO-WATCH-HOME-1311: a prévia noindex usa o mesmo FAQ. Autenticado delega
// para a home inteira; visitante monta schema+Landing uma vez, na mesma volta.
// Guarda offline: AST das voltas reais + SSR do FAQ JSX e JSON-LD reais.
// Não executa página/API, efeitos, autenticação, rede ou banco.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, join, resolve, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const rootArg = process.argv.indexOf('--root')
const root = rootArg >= 0 ? resolve(process.argv[rootArg + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const STRUCTURED = 'components/StructuredData.tsx', LAYOUT = 'app/layout.tsx'
const HOME = 'app/page.tsx', PREVIEW = 'app/watch-preview/page.tsx', LANDING = 'app/KineoLanding.tsx'
const read = rel => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')
function files(dir, out = []) {
  for (const name of readdirSync(join(root, dir))) {
    const rel = posix.join(dir, name)
    if (statSync(join(root, rel)).isDirectory()) files(rel, out)
    else if (/\.(tsx|ts)$/.test(name)) out.push(rel)
  }
  return out
}
const appFiles = files('app')
const compiled = new Map()
const visit = (node, fn) => { fn(node); ts.forEachChild(node, n => visit(n, fn)) }
const astOf = (rel, source) => ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function exportedFunction(ast, name) { return ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name) }
function importsFrom(ast, local, target) {
  return ast.statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === target && (
    n.importClause?.name?.text === local || (n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some(e => e.name.text === local && (!e.propertyName || e.propertyName.text === local)))
  ))
}
function jsxUses(node, ast, name) {
  const found = []
  visit(node, n => { if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(ast) === name) found.push(n) })
  return found
}
function attr(node, name) { return node.attributes.properties.find(n => ts.isJsxAttribute(n) && n.name.text === name) }
function sections(ast, id) {
  const found = []
  visit(ast, n => {
    if (ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'section') {
      const a = attr(n.openingElement, 'id')
      if (a?.initializer && ts.isStringLiteral(a.initializer) && a.initializer.text === id) found.push(n)
    }
  })
  return found
}
function isHidden(open, ast) {
  if (attr(open, 'hidden')) return true
  const aria = attr(open, 'aria-hidden')?.initializer
  if (aria?.getText(ast) === '"true"' || aria?.getText(ast) === "'true'" || aria?.getText(ast) === '{true}') return true
  const style = attr(open, 'style')?.initializer?.getText(ast) ?? ''
  return /display\s*:\s*['"]none|visibility\s*:\s*['"]hidden|opacity\s*:\s*0\b/.test(style)
}
function unconditionalVisible(node, ast) {
  for (let n = node; n && !ts.isFunctionDeclaration(n); n = n.parent) {
    if (ts.isConditionalExpression(n) || ts.isIfStatement(n) || ts.isSwitchStatement(n)) return false
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind)) return false
    if (ts.isJsxElement(n) && isHidden(n.openingElement, ast)) return false
  }
  return true
}
function unparen(n) { while (n && ts.isParenthesizedExpression(n)) n = n.expression; return n }
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;|&ldquo;|&rdquo;|&#x201c;|&#x201d;/gi, '"').replace(/&#x27;|&#39;|&rsquo;|&#x2019;/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const text = s => decode(s.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/[’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
// Duas diferenças de redação já existentes entre schema e JSX, sem relaxar
// nenhuma afirmação: a contração that's e a referência à própria homepage.
const answerText = s => text(s).replace(/that(?:'s| is)/g, 'that is').replace(/on the Kineo homepage/g, 'on this page')

function offlineLoader(source, faqNode) {
  const cache = new Map()
  const Stub = ({ children }) => children ?? null
  const componentStub = new Proxy({ __esModule: true, default: Stub }, { get: (o, k) => o[k] ?? Stub })
  const load = rel => {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }; cache.set(rel, mod)
    let code = source(rel)
    // The probe renders the actual #faq AST node, retaining its original
    // imported billing/offer/text globals; it does not recreate Q&A data.
    if (rel === LANDING) code += '\nexport function __FaqProbe(){return (' + faqNode.getText() + ')}\n'
    const shim = id => {
      if (id === 'react') return React
      if (id === 'react/jsx-runtime') return require(id)
      if (id === 'server-only' || id === 'client-only' || id.endsWith('.css')) return {}
      if (id === '@/components/InterfaceLanguage') return { UiLabel: Stub, UiText: Stub, InterfaceLanguageSelect: Stub }
      if (id.startsWith('@/components/') && id !== '@/components/StructuredData') return componentStub
      if (['next/link', 'next/image', 'next/navigation'].includes(id)) return componentStub
      if (id === 'node:crypto' || id === 'crypto') return require(id)
      const base = id.startsWith('@/') ? id.slice(2) : id.startsWith('.') ? posix.normalize(posix.join(posix.dirname(rel), id)) : null
      if (!base) throw new Error(`Dependência offline inesperada: ${id}`)
      if (base.startsWith('app/') && base !== 'app/kineoLandingTheme') return componentStub
      const target = [base, base + '.ts', base + '.tsx', base + '.json'].find(f => existsSync(join(root, f)) && statSync(join(root, f)).isFile())
      if (!target || /supabase|\/api\//.test(target)) throw new Error(`Dependência de produção proibida: ${id}`)
      return target.endsWith('.json') ? JSON.parse(source(target)) : load(target)
    }
    const key = rel + '\0' + code
    if (!compiled.has(key)) compiled.set(key, ts.transpileModule(code, { fileName: rel, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)
    vm.runInNewContext(compiled.get(key), { module: mod, exports: mod.exports, require: shim, process: { env: Object.freeze({}) }, console, URL, URLSearchParams, Date, Math, Intl, Buffer, fetch() { throw new Error('Rede proibida no teste') } }, { filename: rel })
    return mod.exports
  }
  return load
}

function verify(overrides = {}) {
  let checks = 0
  const check = (condition, message) => { checks++; if (!condition) throw new assert.AssertionError({ message }) }
  const source = rel => Object.hasOwn(overrides, rel) ? (typeof overrides[rel] === 'function' ? overrides[rel](read(rel)) : overrides[rel]) : read(rel)
  const ast = rel => astOf(rel, source(rel))
  const structured = ast(STRUCTURED), layout = ast(LAYOUT), home = ast(HOME), preview = ast(PREVIEW), landing = ast(LANDING)
  const globalFn = exportedFunction(structured, 'StructuredData')
  const faqFn = exportedFunction(structured, 'FaqStructuredData')
  check(globalFn && faqFn, 'schema: exports global e FAQ existem')
  check(!/faqSchema|FaqStructuredData/.test(globalFn.body.getText(structured)), 'schema: global nunca emite FAQPage')
  check(jsxUses(layout, layout, 'StructuredData').length === 1 && jsxUses(layout, layout, 'FaqStructuredData').length === 0, 'layout: um schema global e nenhum FAQPage')
  check((faqFn.body.getText(structured).match(/jsonLd\(faqSchema\)/g) ?? []).length === 1, 'schema: FaqStructuredData emite FAQ uma vez')
  const allowed = new Set([HOME, PREVIEW])
  const others = appFiles.filter(rel => !allowed.has(rel) && /\bFaqStructuredData\b/.test(source(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')))
  check(others.length === 0, 'consumidores: FAQPage restrito à home e à prévia conferida')
  check(importsFrom(home, 'FaqStructuredData', '@/components/StructuredData') && importsFrom(preview, 'FaqStructuredData', '@/components/StructuredData'), 'imports: home e prévia usam o schema original')
  check(importsFrom(home, 'KineoLanding', './KineoLanding') && importsFrom(preview, 'KineoLanding', '@/app/KineoLanding') && importsFrom(preview, 'HomePage', '@/app/page'), 'imports: prévia reutiliza a Landing e a home originais')
  const homeFaqs = jsxUses(home, home, 'FaqStructuredData'), homeLandings = jsxUses(home, home, 'KineoLanding')
  check(homeFaqs.length === 1 && homeLandings.length === 1 && unconditionalVisible(homeFaqs[0], home) && unconditionalVisible(homeLandings[0], home), 'home: um FAQPage e uma Landing')
  check(jsxUses(landing, landing, 'FaqStructuredData').length === 0, 'Landing: não duplica o schema do chamador')
  const faqSections = sections(landing, 'faq')
  check(faqSections.length === 1 && unconditionalVisible(faqSections[0], landing), 'visibilidade: FAQ único e incondicional nos dois topos da Landing')

  const previewFn = exportedFunction(preview, 'WatchPreviewPage')
  check(previewFn?.body, 'prévia: função esperada existe')
  const statements = previewFn.body.statements
  const auth = statements.find(n => ts.isIfStatement(n))
  const authReturn = auth && ts.isReturnStatement(auth.thenStatement) ? auth.thenStatement : auth && ts.isBlock(auth.thenStatement) ? auth.thenStatement.statements.find(ts.isReturnStatement) : null
  check(auth?.expression.getText(preview) === 'user' && authReturn && jsxUses(authReturn, preview, 'HomePage').length === 1 && jsxUses(authReturn, preview, 'FaqStructuredData').length === 0 && jsxUses(authReturn, preview, 'KineoLanding').length === 0, 'prévia logada: somente HomePage inteira, sem FAQ extra')
  const guestReturn = statements.find(ts.isReturnStatement)
  const guest = unparen(guestReturn?.expression)
  check(guest && ts.isJsxFragment(guest), 'prévia visitante: retorno explícito com conteúdo')
  const guestFaqs = jsxUses(guest, preview, 'FaqStructuredData'), guestLandings = jsxUses(guest, preview, 'KineoLanding')
  check(guestFaqs.length === 1 && guestLandings.length === 1 && unconditionalVisible(guestFaqs[0], preview) && unconditionalVisible(guestLandings[0], preview) && jsxUses(guest, preview, 'HomePage').length === 0, 'prévia visitante: um FAQPage junto da mesma Landing visível')
  check(jsxUses(previewFn, preview, 'FaqStructuredData').length === 1, 'prévia: sem segunda montagem de FAQPage')
  const metadata = preview.statements.flatMap(n => ts.isVariableStatement(n) ? [...n.declarationList.declarations] : []).find(n => n.name.getText(preview) === 'metadata')?.initializer
  const robotProp = metadata && ts.isObjectLiteralExpression(metadata) ? metadata.properties.find(n => ts.isPropertyAssignment(n) && n.name.getText(preview) === 'robots') : null
  const indexProp = robotProp && ts.isObjectLiteralExpression(robotProp.initializer) ? robotProp.initializer.properties.find(n => ts.isPropertyAssignment(n) && n.name.getText(preview) === 'index') : null
  check(indexProp?.initializer.kind === ts.SyntaxKind.FalseKeyword, 'prévia: exceção exige noindex explícito')

  const load = offlineLoader(source, faqSections[0])
  const globalHtml = renderToStaticMarkup(React.createElement(load(STRUCTURED).default))
  const faqHtml = renderToStaticMarkup(React.createElement(load(STRUCTURED).FaqStructuredData))
  const scripts = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]))
  const globals = scripts(globalHtml), faqs = scripts(faqHtml)
  check(globals.length === 2 && globals.some(s => s['@type'] === 'Organization') && globals.some(s => s['@type'] === 'SoftwareApplication') && globals.every(s => s['@type'] !== 'FAQPage'), 'SSR global: dois schemas e nenhum FAQPage')
  check(faqs.length === 1 && faqs[0]['@type'] === 'FAQPage', 'SSR FAQ: exatamente um FAQPage')
  const questions = faqs[0].mainEntity
  check(questions.length === 13 && new Set(questions.map(q => q.name)).size === questions.length, 'SSR FAQ: treze perguntas únicas')
  const visibleHtml = renderToStaticMarkup(React.createElement(load(LANDING).__FaqProbe))
  const visible = answerText(visibleHtml)
  for (const q of questions) {
    check(visible.includes(answerText(q.name)), `visível: pergunta ${q.name}`)
    check(typeof q.acceptedAnswer?.text === 'string' && visible.includes(answerText(q.acceptedAnswer.text)), `visível: resposta ${q.name}`)
  }
  return checks
}

const checks = verify()
function replacement(rel, from, to) {
  const current = read(rel)
  assert.equal(current.split(from).length - 1, 1, `âncora única do mutante: ${rel}: ${from}`)
  return { [rel]: current.replace(from, to) }
}
const mutants = [
  ['FAQ global volta', () => replacement(STRUCTURED, 'export default function StructuredData() {', 'export default function StructuredData() {\n  return <FaqStructuredData />'), 'schema: global nunca emite FAQPage'],
  ['outro consumidor indexável', () => ({ 'app/pricing/page.tsx': read('app/pricing/page.tsx') + '\nconst leakedSchema = FaqStructuredData\n' }), 'consumidores: FAQPage restrito à home e à prévia conferida'],
  ['home duplica FAQ', () => replacement(HOME, '<FaqStructuredData />', '<FaqStructuredData /><FaqStructuredData />'), 'home: um FAQPage e uma Landing'],
  ['prévia troca o schema por outro módulo', () => replacement(PREVIEW, "from '@/components/StructuredData'", "from '@/components/AnotherSchema'"), 'imports: home e prévia usam o schema original'],
  ['prévia troca a Landing por outra tela', () => replacement(PREVIEW, "from '@/app/KineoLanding'", "from '@/app/AnotherLanding'"), 'imports: prévia reutiliza a Landing e a home originais'],
  ['Landing passa a emitir schema', () => replacement(LANDING, '<section id="faq">', '<FaqStructuredData /><section id="faq">'), 'consumidores: FAQPage restrito à home e à prévia conferida'],
  ['FAQ fica oculto', () => replacement(LANDING, '<section id="faq">', '<section id="faq" hidden>'), 'visibilidade: FAQ único e incondicional nos dois topos da Landing'],
  ['FAQ fica só no ramo antigo', () => {
    const source = read(LANDING), ast = astOf(LANDING, source), faq = sections(ast, 'faq')[0]
    assert(faq, 'mutante precisa da seção FAQ real')
    return { [LANDING]: source.slice(0, faq.getStart(ast)) + '{!watchVisitor && (' + faq.getText(ast) + ')}' + source.slice(faq.end) }
  }, 'visibilidade: FAQ único e incondicional nos dois topos da Landing'],
  ['prévia sem conteúdo visível', () => replacement(PREVIEW, '<KineoLanding watchVisitor watchPreview initialUser={null}/>', ''), 'prévia visitante: um FAQPage junto da mesma Landing visível'],
  ['prévia duplica FAQ visitante', () => replacement(PREVIEW, '<FaqStructuredData/>', '<FaqStructuredData/><FaqStructuredData/>'), 'prévia visitante: um FAQPage junto da mesma Landing visível'],
  ['prévia duplica FAQ logado', () => replacement(PREVIEW, 'if(user)return <HomePage />', 'if(user)return <><FaqStructuredData/><HomePage /></>'), 'prévia logada: somente HomePage inteira, sem FAQ extra'],
  ['prévia indexável', () => replacement(PREVIEW, 'robots: { index:false', 'robots: { index:true'), 'prévia: exceção exige noindex explícito'],
  ['pergunta sai do texto visível', () => replacement(LANDING, 'Can I use my own script?', 'Question removed'), 'visível: pergunta Can I use my own script?'],
  ['resposta diverge do schema', () => replacement(STRUCTURED, "text: 'Yes — paste your script and pick \"Use my script as is\" and the AI narrates it word for word.'", "text: 'An answer not visible in the FAQ.'"), 'visível: resposta Can I use my own script?'],
]
for (const [name, mutate, expected] of mutants) {
  const changed = mutate()
  let caught
  try { verify(changed) } catch (error) { caught = error }
  assert(caught instanceof assert.AssertionError && caught.message === expected, `mutante precisa falhar pela regra exata: ${name}; recebido=${caught?.message ?? 'passou'}`)
  console.log(`  ok mutante: ${name}`)
}
console.log(`faq-schema-so-onde-visivel: ${checks} verificações passaram; ${mutants.length} mutantes rejeitados pela regra exata; 0 falhas.`)
