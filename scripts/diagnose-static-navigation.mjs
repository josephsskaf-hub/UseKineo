// Read-only route-shape inventory. Does not execute application modules,
// middleware, redirects, APIs or requests. An existing file is not a working UX.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
const root = path.resolve(import.meta.dirname, '..')
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8' }).trim()
const list = (args) => run('rg', args).split(/\r?\n/).filter(Boolean)
const pages = list(['--files', 'app', '-g', 'page.tsx', '-g', 'page.ts', '-g', 'page.jsx', '-g', 'page.js'])
const handlers = list(['--files', 'app', '-g', 'route.ts', '-g', 'route.js'])
const routeName = (file) => '/' + file.replaceAll('\\', '/').split('/').slice(1, -1).filter((part) => !/^\(.*\)$/.test(part)).join('/')
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function matcher(route) {
  let pattern = ''
  for (const segment of route.split('/').slice(1)) {
    if (segment.startsWith('[[...')) pattern += '(?:/.*)?'
    else if (segment.startsWith('[...')) pattern += '/.+'
    else if (segment.startsWith('[')) pattern += '/[^/]+'
    else pattern += '/' + escape(segment)
  }
  return new RegExp('^' + pattern + '/?$')
}
const routes = [...pages.map((file) => ({ file, kind: 'page' })), ...handlers.map((file) => ({ file, kind: 'handler' }))].map((entry) => ({ ...entry, pattern: matcher(routeName(entry.file)) }))
const files = list(['--files', 'app', 'components', '-g', '*.tsx'])
const counts = { page: 0, handler: 0, asset: 0, unresolved: 0 }
const unresolved = new Map(), nonPage = new Map()
let literals = 0, expressions = 0
function remember(map, pathname, location) {
  const list = map.get(pathname) ?? []
  list.push(location)
  map.set(pathname, list)
}
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(source) === 'href') {
      let value = node.initializer
      if (value && ts.isJsxExpression(value)) value = value.expression
      if (value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))) {
        if (value.text.startsWith('/') && !value.text.startsWith('//')) {
          literals++
          const pathname = value.text.split(/[?#]/)[0]
          const location = file.replaceAll('\\', '/') + ':' + (source.getLineAndCharacterOfPosition(node.getStart()).line + 1)
          const route = routes.find((candidate) => candidate.pattern.test(pathname))
          const asset = path.resolve(root, 'public', '.' + pathname)
          const publicRoot = path.resolve(root, 'public') + path.sep
          if (route) {
            counts[route.kind]++
            if (route.kind === 'handler') remember(nonPage, pathname, location)
          } else if (asset.startsWith(publicRoot) && fs.existsSync(asset) && fs.statSync(asset).isFile()) counts.asset++
          else { counts.unresolved++; remember(unresolved, pathname, location) }
        }
      } else expressions++
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}
const entries = (map) => [...map].map(([pathname, locations]) => ({ pathname, locations }))
console.log(JSON.stringify({
  classification: 'STATIC DIAGNOSTIC ONLY — not browser acceptance or proven 404s',
  generatedAt: new Date().toISOString(),
  head: run('git', ['rev-parse', 'HEAD']), originMain: run('git', ['rev-parse', 'origin/main']),
  pageFiles: pages.length, scannedTsxFiles: files.length,
  literalInternalHrefOccurrences: literals, nonLiteralHrefExpressions: expressions,
  matchingRouteShapes: counts, nonPageDestinations: entries(nonPage), unresolved: entries(unresolved),
  limitations: [
    'Counts JSX href occurrences, not people, unique buttons or visited pages.',
    'Dynamic query expressions, router.push, handlers and runtime conditions are not executed.',
    'Route shape may exist while a parameter, auth state, query or HTTP method is invalid.',
    'Redirects and middleware are not resolved; unresolved needs investigation, not automatic replacement.',
    'File existence does not prove browser playback, accessibility, delivery or purchase.',
  ],
}, null, 2))
