// Local regression evidence for the mechanical extraction. No env files or network.
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const crypto = require('crypto')
const assert = require('assert/strict')
const { execFileSync } = require('child_process')
const ts = require('typescript')
const root = process.cwd()
const routePath = 'app/ai-video-generator/[engine]/page.tsx'
const catalogPath = 'lib/growth/enginePageCatalog.ts'
const baselineCommit = 'b619128999e93b77e74287795c43a6f4aac699c4'
const oldText = execFileSync('git', ['show', `${baselineCommit}:${routePath}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
const routeText = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n')
const catalogText = fs.readFileSync(catalogPath, 'utf8').replace(/\r\n/g, '\n')
const parse = (text, filename) => ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const oldAst = parse(oldText, routePath)
const routeAst = parse(routeText, routePath)
const catalogAst = parse(catalogText, catalogPath)
const variables = ast => new Map(ast.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations].map(d => [d.name.getText(ast), d])))
const oldVars = variables(oldAst)
const newVars = variables(catalogAst)
const checks = []
const same = (name, actual, expected) => { assert.equal(actual, expected, name); checks.push(name) }
const names = ['STUDIO_USD', 'OFFER', 'FAST_COST', 'SEEDANCE_COST', 'KLING_COST', 'VEO_COST', 'KLING3_COST', 'H3_COST', 'OMNI_COST', 'S25_COST', 'ENGINES', 'ENGINE_SLUGS']
for (const name of names) same(`unchanged initializer: ${name}`, newVars.get(name)?.initializer?.getText(catalogAst), oldVars.get(name)?.initializer?.getText(oldAst))
const printer = ts.createPrinter({ removeComments: false })
for (const before of oldAst.statements.filter(ts.isFunctionDeclaration)) {
  const after = routeAst.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === before.name?.text)
  assert.ok(after, `missing function ${before.name?.text}`)
  same(`unchanged route function: ${before.name?.text}`, printer.printNode(ts.EmitHint.Unspecified, after, routeAst), printer.printNode(ts.EmitHint.Unspecified, before, oldAst))
}
for (const name of ['dynamic', 'dynamicParams']) same(`unchanged route config: ${name}`, variables(routeAst).get(name)?.initializer?.getText(routeAst), oldVars.get(name)?.initializer?.getText(oldAst))
const routeExports = routeAst.statements.filter(s => s.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)).flatMap(s => ts.isVariableStatement(s) ? [...s.declarationList.declarations].map(d => d.name.getText(routeAst)) : [s.modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) ? 'default' : s.name?.text])
same('only supported route exports', [...routeExports].sort().join(','), ['default', 'dynamic', 'dynamicParams', 'generateMetadata', 'generateStaticParams'].sort().join(','))
for (const file of [routePath, 'app/ai-video-generator/page.tsx', 'app/sitemap.ts']) {
  assert.ok(fs.readFileSync(file, 'utf8').includes("from '@/lib/growth/enginePageCatalog'"), `catalog consumer: ${file}`)
  checks.push(`catalog consumer: ${file}`)
}
const imports = catalogAst.statements.filter(ts.isImportDeclaration).map(s => s.getText(catalogAst)).join('\n')
const baselineCatalog = imports + '\n' + oldText.slice(oldText.indexOf('// KINEO-PRICING-V7-2026-09-09'), oldText.indexOf("export const dynamic = 'force-static'")) + oldText.slice(oldText.indexOf('type Engine = {'), oldText.indexOf('export const ENGINE_SLUGS = Object.keys(ENGINES)') + 'export const ENGINE_SLUGS = Object.keys(ENGINES)'.length)
const rejectNetwork = () => { throw new Error('Network forbidden') }
function evaluate(code, flag) {
  const cache = new Map()
  function run(source, filename) {
    const module = { exports: {} }
    const compiled = ts.transpileModule(source, { fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
    const requireLocal = request => {
      if (request === '@/lib/engineLaunch') return { S25_PUBLIC: flag }
      const resolved = path.resolve(request.startsWith('@/') ? path.join(root, request.slice(2)) : path.join(path.dirname(filename), request)) + '.ts'
      assert.ok(resolved.startsWith(path.join(root, 'lib') + path.sep), 'only local library dependencies')
      if (!cache.has(resolved)) cache.set(resolved, run(fs.readFileSync(resolved, 'utf8'), resolved))
      return cache.get(resolved)
    }
    vm.runInNewContext(compiled, { module, exports: module.exports, require: requireLocal, process: { env: { NODE_ENV: 'test' } }, URL, URLSearchParams, fetch: rejectNetwork }, { filename, timeout: 10000 })
    return module.exports
  }
  return run(code, path.join(root, catalogPath))
}
const scenarios = [false, true].map(flag => {
  const before = evaluate(baselineCatalog, flag)
  const after = evaluate(catalogText, flag)
  const expected = JSON.stringify({ engines: before.ENGINES, slugs: before.ENGINE_SLUGS })
  const actual = JSON.stringify({ engines: after.ENGINES, slugs: after.ENGINE_SLUGS })
  same(`evaluated data and order unchanged: S25_PUBLIC=${flag}`, actual, expected)
  return { flag, engineSlugs: after.ENGINE_SLUGS, sha256: crypto.createHash('sha256').update(actual).digest('hex') }
})
const result = { classification: 'TESTADO LOCALMENTE', timeUtc: new Date().toISOString(), baselineCommit, method: 'Compare original initializers and printed route functions, then evaluate old/new catalog with both feature-flag values in isolated contexts. No network or env-file access.', checks, scenarios, passed: true }
fs.writeFileSync('docs/citacoes-chatgpt/2026-09-10-prioridade/engine-catalog-verification.json', JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ passed: true, checks: checks.length, scenarios }))
