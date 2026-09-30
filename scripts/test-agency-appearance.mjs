// Founder requested canonical Light/Dark, 29/09. Real SSR, no effects or requests.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { React, root, source, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
const require = createRequire(import.meta.url), ts = require('typescript')
export const BEFORE = '881f69dc9fa7b19d97440bec23c3141107c44360'
export const files = ['page.tsx', 'AgencyHeaderCta.tsx', 'AgencyPacksClient.tsx', 'AgencyMarginCalculator.tsx', 'AgencyBriefClient.tsx'].map(f => 'app/ai-shorts-for-agencies/' + f)
const old = (file, ref = BEFORE) => execFileSync('git', ['show', ref + ':' + file], { cwd: root, encoding: 'utf8' })
export const focusCss = ' .agency-page :is(a,button,input,select,summary):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; } .agency-page input::placeholder { color: var(--muted); opacity: 1; } '
// Fixtures change initial local state only, never invoke an effect or handler.
function fixtureSource(file, input, fixture) {
 const sf = ts.createSourceFile(file, input, 99, true, 4), edits = []
 function walk(n) {
  if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(sf) === 'useState') {
   const key = n.name.elements[0].getText(sf)
   if (Object.hasOwn(fixture, key)) edits.push([n.initializer.arguments[0].getStart(sf), n.initializer.arguments[0].end, JSON.stringify(fixture[key])])
  }
  ts.forEachChild(n, walk)
 }
 walk(sf)
 for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) input = input.slice(0, start) + text + input.slice(end)
 return input
}
export function agencyHtml(before = false, fixtures = {}, includeFooter = true) {
 const replacements = Object.fromEntries(files.map(file => [file, fixtureSource(file, before ? old(file, typeof before === 'string' ? before : BEFORE) : source(file), fixtures[file.split('/').at(-1)] ?? {})]))
 // Next pathname fixture for the untouched footer's calculator link.
 replacements['components/CostCalculatorLink.tsx'] = source('components/CostCalculatorLink.tsx').replace('usePathname()', JSON.stringify('/ai-shorts-for-agencies'))
 const forbidden = () => { throw Error('No telemetry in offline render') }
 const mocks = { 'lib/analytics.ts': { trackEvent: forbidden, trackClosedEvent: forbidden } }
 if (!includeFooter) mocks['components/Footer.tsx'] = { __esModule: true, default: () => null }
 const load = offlineModules({ replacements, mocks })
 return renderToStaticMarkup(React.createElement(load(files[0]).default))
}
export const states = [
 ['default', {}],
 ['signed-in', { 'AgencyHeaderCta.tsx': { authState: 'signed_in' } }],
 ['checkout-return', { 'AgencyPacksClient.tsx': { cancelledPackId: 'bulk30' } }],
 ['negative-margin', { 'AgencyMarginCalculator.tsx': { clientPrice: '0' } }],
 ...['sending', 'sent', 'error'].map(status => ['brief-' + status, { 'AgencyBriefClient.tsx': { status } }]),
]
const paint = new Set(['color', 'background', 'border', 'borderBottom', 'boxShadow'])
function frozenAst(file, input) {
 const sf = ts.createSourceFile(file, input, 99, true, 4)
 const result = ts.transform(sf, [context => {
  const visit = n => {
   if (ts.isPropertyAssignment(n) && paint.has(n.name.getText(sf))) return undefined
   if (ts.isJsxElement(n) && n.openingElement.tagName.getText(sf) === 'style') return undefined
   if (ts.isJsxAttribute(n) && n.name.text === 'className' && n.initializer?.text === 'agency-page') return undefined
   if (ts.isJsxText(n) && !n.text.trim()) return undefined
   return ts.visitEachChild(n, visit, context)
  }
  return n => ts.visitNode(n, visit)
 }])
 const printed = ts.createPrinter({ removeComments: true }).printFile(result.transformed[0]); result.dispose()
 return printed
}
const content = html => html.replace(/ style="[^"]*"/g, '').replace(/ class="agency-page"/g, '').replace(/<style>[\s\S]*?<\/style>/g, '')
function tokens(theme) {
 const css = source('app/appearance.css'), blocks = [...css.matchAll(/(?:^:root|^html\[data-theme='dark'\], \.kineo-admin-theme)\s*\{([^}]+)\}/gm)]
 assert.equal(blocks.length, 2)
 return Object.fromEntries([...blocks[theme === 'dark' ? 1 : 0][1].matchAll(/(--[\w-]+):([^;]+);/g)].map(m => [m[1], m[2].trim()]))
}
function rgb(value, palette) {
 if (value.startsWith('var(')) return rgb(palette[value.slice(4, -1)], palette)
 assert.match(value, /^#[\da-f]{3,8}$/i, 'all tested colors resolve from canonical hex tokens')
 let hex = value.slice(1); if (hex.length === 3) hex = [...hex].map(c => c + c).join('')
 return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).concat(hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1)
}
function blend(top, bottom) { return top.slice(0, 3).map((n, i) => n * top[3] + bottom[i] * (1 - top[3])).concat(1) }
function contrast(a, b) {
 const luminance = c => c.slice(0, 3).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0)
 const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
}
function textContrast(html, theme) {
 const palette = tokens(theme), stack = [{ color: rgb(palette['--text'], palette), bg: rgb(palette['--bg'], palette), size: 16, weight: 400, skip: false }]
 let count = 0, minimum = Infinity
 const voids = new Set(['input', 'meta', 'link', 'img', 'br', 'hr'])
 for (const match of html.matchAll(/<[^>]+>|[^<]+/g)) {
  const token = match[0], parent = stack.at(-1)
  if (!token.startsWith('<')) {
   if (!parent.skip && token.trim()) { const ratio = contrast(parent.color, parent.bg), large = parent.size >= 24 || (parent.size >= 18.667 && parent.weight >= 700); assert.ok(ratio >= (large ? 3 : 4.5), `${theme}: ${token.slice(0, 80)} has contrast ${ratio.toFixed(2)}`); minimum = Math.min(minimum, ratio); count++ }
   continue
  }
  if (token.startsWith('</')) { stack.pop(); continue }
  const tag = token.match(/^<(\w+)/)?.[1]; if (!tag) continue
  const attrs = Object.fromEntries([...(token.match(/ style="([^"]*)"/)?.[1] ?? '').matchAll(/([\w-]+):([^;]+);?/g)].map(m => [m[1], m[2]]))
  const bg = attrs.background && attrs.background !== 'transparent' ? blend(rgb(attrs.background, palette), parent.bg) : parent.bg
  const color = attrs.color ? rgb(attrs.color, palette) : parent.color
  const skip = parent.skip || ['style', 'script'].includes(tag) || token.includes('aria-hidden="true"')
  const size = /^\d+(?:\.\d+)?px$/.test(attrs['font-size'] ?? '') ? parseFloat(attrs['font-size']) : parent.size
  const weight = attrs['font-weight'] ? Number(attrs['font-weight']) : tag === 'strong' ? 700 : parent.weight
  if (!voids.has(tag)) stack.push({ color, bg, skip, size, weight })
 }
 assert.ok(count > 100, 'checks real page text throughout all sections')
 for (const surface of ['--bg', '--card', '--card2']) assert.ok(contrast(rgb(palette['--accent'], palette), rgb(palette[surface], palette)) >= 3, 'focus outline against ' + surface)
 return { count, minimum: Number(minimum.toFixed(2)) }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
 for (const file of files) {
  assert.equal(frozenAst(file, source(file)), frozenAst(file, old(file)), file + ': all executable logic, layout, copy, media and destinations frozen')
  assert.ok(!/#[\da-f]{3,8}\b|rgba?\(|gradient\(/i.test(source(file)), file + ': no private literal palette')
 }
 assert.ok(source(files[0]).includes(focusCss), 'scoped focus and readable placeholders')
 const results = []
 for (const [name, fixtures] of states) {
  assert.equal(content(agencyHtml(false, fixtures)), content(agencyHtml(true, fixtures)), name + ': full actual SSR content/attributes preserved')
  const html = agencyHtml(false, fixtures, false)
  for (const theme of ['light', 'dark']) results.push({ state: name, theme, ...textContrast(html, theme) })
 }
 const appearance = offlineModules()('lib/ui/appearance.ts')
 for (const saved of [null, 'light', 'dark', 'invalid']) {
  const document = { documentElement: { dataset: {} } }
  vm.runInNewContext(appearance.APPEARANCE_BOOT, { document, localStorage: { getItem: () => saved } })
  assert.equal(document.documentElement.dataset.theme, saved === 'dark' ? 'dark' : 'light', 'existing preference boot unchanged')
 }
 console.log('PASS: five actual component ASTs, seven SSR states in both themes, normal text contrast >=4.5 / large >=3, focus >=3, existing preference boot. ' + JSON.stringify(results))
}
