import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import postcss from 'postcss'
import ts from 'typescript'
import { themeAuditRoutes, themeLayoutDifferences } from './test-support/theme-layout-1811.mjs'

const entries = [
  'app/appearance.css', 'app/globals.css', 'app/layout.tsx',
  'app/(dashboard)/layout.tsx', 'app/(dashboard)/studio/page.tsx',
  'app/(dashboard)/studio/create/page.tsx', 'app/(dashboard)/ads/new/page.tsx',
  'app/(dashboard)/library/page.tsx', 'app/create/[tab]/page.tsx',
  'app/recreate/RecreateFlowPage.tsx', 'app/recreate-preview/SeuVideoRecreateClient.tsx',
  'app/for-creators/page.tsx', 'app/for-creators/creators.css',
  'app/(auth)/layout.tsx', 'app/(auth)/login/page.tsx', 'app/(auth)/signup/page.tsx',
  'app/pricing/page.tsx', 'app/pricing-preview/page.tsx',
  'components/Sidebar.tsx', 'components/MobileNav.tsx', 'components/AuthReel.tsx',
]
const read = file => readFileSync(file, 'utf8')
const themeSelector = /\[data-theme(?:[=\s\]])|prefers-color-scheme/i
const colorProperty = /^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?-color|outline-color|fill|stroke|color-scheme)$/
const colorValue = /^(?:#[\da-f]{3,8}|(?:rgba?|hsla?)\([^)]*\)|var\(--[\w-]+\)|transparent|currentcolor)$/i
const themeComparison = /\b(?:theme|appearance|colorScheme)\b\s*(?:[!=]==?)\s*['"](?:light|dark)['"]|['"](?:light|dark)['"]\s*(?:[!=]==?)\s*(?:theme|appearance|colorScheme)\b|\b(?:isDark|darkMode|isLight|lightMode)\b|\bdataset\.theme\b|prefers-color-scheme/i

function cssProblems(css, file) {
  const problems = []
  if (!themeSelector.test(css)) return problems
  postcss.parse(css, { from: file }).walkRules(rule => {
    let themed = themeSelector.test(rule.selector)
    for (let parent = rule.parent; parent && !themed; parent = parent.parent) {
      themed = parent.type === 'atrule' && themeSelector.test(parent.params)
    }
    if (!themed) return
    rule.walkDecls(({ prop, value }) => {
      if (colorProperty.test(prop) && (prop === 'color-scheme' || colorValue.test(value))) return
      if (prop.startsWith('--') && colorValue.test(value)) return
      problems.push(file + ' ' + rule.selector + ' muda ' + prop + ' pelo tema')
    })
  })
  return problems
}

function jsxProblems(node, source, problems) {
  const selectedTheme = candidate => candidate && themeComparison.test(candidate.getText(source))
  if ((ts.isConditionalExpression(node) && selectedTheme(node.condition)) ||
      (ts.isIfStatement(node) && selectedTheme(node.expression)) ||
      (ts.isSwitchStatement(node) && /^(theme|appearance|colorScheme)$/i.test(node.expression.getText(source))) ||
      (ts.isBinaryExpression(node) &&
        [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind) &&
        selectedTheme(node.left))) {
    const pos = source.getLineAndCharacterOfPosition(node.getStart(source))
    problems.push(source.fileName + ':' + (pos.line + 1) + ' pinta ramos diferentes por tema')
  }
  if (ts.isJsxAttribute(node) && node.name.getText(source) === 'className' && /\bdark:/.test(node.getText(source))) {
    problems.push(source.fileName + ' usa classe específica de tema em vez de token')
  }
  ts.forEachChild(node, child => jsxProblems(child, source, problems))
}

function imports(source) {
  const refs = []
  function visit(node) {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly && ts.isStringLiteral(node.moduleSpecifier)) {
      refs.push(node.moduleSpecifier.text)
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
      refs.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return refs.flatMap(ref => {
    const absolute = ref.startsWith('@/') ? ref.slice(2) : ref.startsWith('.') ? join(dirname(source.fileName), ref) : ''
    if (!absolute || !/^(?:app|components)[/\\]/.test(absolute)) return []
    const file = [absolute, absolute + '.tsx', absolute + '.ts', join(absolute, 'index.tsx')].find(candidate => /\.(?:tsx?|css)$/.test(candidate) && existsSync(candidate))
    return file ? [normalize(file).replaceAll('\\', '/')] : []
  })
}

const visited = new Set()
const problems = []
function check(file) {
  if (visited.has(file)) return
  visited.add(file)
  const text = read(file)
  if (file.endsWith('.css')) {
    problems.push(...cssProblems(text, file))
    return
  }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  if (file.endsWith('.tsx')) jsxProblems(source, source, problems)
  function embedded(node) {
    if (ts.isStringLiteralLike(node) && themeSelector.test(node.text) && node.text.includes('{')) {
      problems.push(...cssProblems(node.text, file))
    }
    ts.forEachChild(node, embedded)
  }
  embedded(source)
  imports(source).forEach(check)
}
entries.forEach(check)
assert.deepEqual(problems, [])

for (const [mutation, expected] of [
  ['const C = () => <>{theme === "dark" && <Button/>}</>', 'ramos'],
  ['const C = () => <button>{isDark ? "Dark" : "Light"}</button>', 'ramos'],
  ['const C = () => <button className="bg-area dark:invisible" />', 'classe'],
]) {
  const mutant = ts.createSourceFile('mutant.tsx', mutation, ts.ScriptTarget.Latest, true)
  const found = []
  jsxProblems(mutant, mutant, found)
  assert(found.some(problem => problem.includes(expected)), mutation)
}
for (const mutation of [
  '[data-theme=dark] .cta { display:none }',
  '[data-theme=dark] .cta { order:2 }',
  '[data-theme=dark] .cta { --cta-gap:20px }',
  '@media (prefers-color-scheme: dark) { .cta { padding:2px } }',
]) {
  assert.equal(cssProblems(mutation, 'mutant.css').length, 1, mutation)
}
assert.deepEqual(cssProblems('[data-theme=dark] .cta { --cta-color:#abc; color:var(--cta-color) }', 'ok.css'), [])

const sample = { theme: 'light', width: 390, nodes: [{ key: '0', tag: 'button', text: 'Generate', state: [true] }] }
const same = { ...sample, theme: 'dark' }
assert.deepEqual(themeLayoutDifferences(sample, same), [])
assert(themeLayoutDifferences(sample, { ...same, nodes: [{ ...sample.nodes[0], state: [false] }] }).some(x => x.endsWith('state')))
assert(themeLayoutDifferences(sample, { ...same, nodes: [] }).length > 0)

const snapshotPath = process.argv[2]
if (snapshotPath) {
  const snapshots = JSON.parse(read(snapshotPath))
  for (const [route] of themeAuditRoutes) {
    for (const width of [390, 1920]) {
      const { light, dark } = snapshots[route]?.[width] ?? {}
      assert(light && dark, route + ' sem o par de ' + width)
      assert.deepEqual(themeLayoutDifferences(light, dark), [], route + ' em ' + width)
    }
  }
}
console.log(`PASS — ${visited.size} arquivos, 7 mutantes de estilo/estrutura${snapshotPath ? ', 24 pares reais comparados' : ''}.`)
