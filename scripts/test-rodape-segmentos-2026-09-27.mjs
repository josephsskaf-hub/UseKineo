// SPRINT16H-B-C-2026-09-27 — o rodapé global liga as 8 páginas de segmento (/ads/for/<slug>, G1).
// Antes deste item elas só tinham entrada pelo sitemap e entre si (0 links internos de superfície global).
// Offline: JSX real renderizado (renderPage), fonte lida com readFileSync, sem alias @/, sem rede, banco ou env.
// O conjunto esperado é DERIVADO de lib/growth/adsSegments.ts (ADS_SEGMENTS + adsSegmentPath), nunca digitado.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { renderPage } from './preview-ux-complete.mjs'
import { offlineModules, React, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
const require = createRequire(import.meta.url), ts = require('typescript')
const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++; console.log('PASS ' + message) }
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; console.log('PASS ' + message) }
// Mesma técnica de scripts/test-interface-language.mjs: a lib pura vira módulo CommonJS num contexto vazio.
function pure(file) { const box = { exports: {} }; vm.runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: 1, target: 7 } }).outputText, { exports: box.exports }); return box.exports }
const segments = pure('lib/growth/adsSegments.ts')
// Array.from no realm principal: a lista vinda do vm tem outro Array.prototype e deepStrictEqual a rejeitaria.
const expectedHrefs = Array.from(segments.ADS_SEGMENTS, (segment) => segments.adsSegmentPath(segment.slug))
check(expectedHrefs.length > 0 && new Set(expectedHrefs).size === expectedHrefs.length, 'source exposes a non-empty, duplicate-free segment set (' + expectedHrefs.length + ' derived hrefs)')
const FOOTER = 'components/Footer.tsx'
// Mesmo literal que scripts/test-business-ads-navigation-2026-09-24.mjs fixa como porta pública de negócios.
const BUSINESS_DOOR = 'href="/ads"'
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

// ── Trava de FONTE: o rodapé deriva, não digita ───────────────────────────────────────────────
// Devolve a lista de problemas (vazia = fonte honesta). Reaplicada a cada mutante em memória.
function sourceProblems(src) {
  const problems = []
  // Literal ANTIGO = 0: nenhum caminho de segmento entre aspas/crase (lista digitada ou template digitado).
  const typed = (src.match(/['"`]\/ads\/for/g) || []).length
  if (typed !== 0) problems.push('typed segment path x' + typed)
  if (!src.includes("import { ADS_SEGMENTS, adsSegmentPath } from '@/lib/growth/adsSegments'")) problems.push('missing derived import')
  if (!src.includes('links: ADS_SEGMENTS.map((segment) => ({ href: adsSegmentPath(segment.slug), label: segment.shortName })),')) problems.push('sublist not derived from ADS_SEGMENTS/adsSegmentPath/shortName')
  return problems
}

// ── Trava de RENDER: exatamente os hrefs derivados, dentro do grupo de negócios, 4 <details> ──
function renderProblems(html) {
  const problems = []
  const groups = [...html.matchAll(/<details [\s\S]*?<\/details>/g)].map((m) => m[0])
  if (groups.length !== 4) problems.push('details=' + groups.length)
  const business = groups.filter((g) => g.includes(BUSINESS_DOOR))
  if (business.length !== 1) problems.push('business groups=' + business.length)
  const group = business[0] ?? ''
  const inside = [...group.matchAll(/href="(\/ads\/for\/[^"]*)"/g)].map((m) => m[1])
  const everywhere = [...html.matchAll(/href="(\/ads\/for\/[^"]*)"/g)].map((m) => m[1])
  if (JSON.stringify(inside) !== JSON.stringify(expectedHrefs)) problems.push('inside business group=' + (inside.join(',') || '(none)'))
  if (JSON.stringify(everywhere) !== JSON.stringify(expectedHrefs)) problems.push('anywhere in footer=' + (everywhere.join(',') || '(none)'))
  for (const segment of segments.ADS_SEGMENTS) {
    const href = segments.adsSegmentPath(segment.slug)
    if (!new RegExp('<a href="' + href + '"[^>]*>' + escapeHtml(segment.shortName) + '</a>').test(group)) problems.push('label for ' + segment.slug + ' is not shortName')
  }
  const door = group.indexOf(BUSINESS_DOOR), caption = group.indexOf('Video ads for…'), first = group.indexOf('href="' + expectedHrefs[0] + '"')
  if (!(door >= 0 && caption > door && first > caption)) problems.push('order door/caption/first=' + [door, caption, first].join('/'))
  return problems
}

// ── Estado real ──────────────────────────────────────────────────────────────────────────────
const footerSource = read(FOOTER)
equal(sourceProblems(footerSource), [], 'footer source derives the sublist and types zero segment paths')
const after = renderPage(FOOTER)
equal(renderProblems(after), [], 'rendered footer: every derived segment href, once, inside the business group, under the door, 4 groups')
for (const language of ['es', 'hi']) {
  const html = renderPage(FOOTER, false, { interfaceLanguage: language })
  equal([...html.matchAll(/href="(\/ads\/for\/[^"]*)"/g)].map((m) => m[1]), expectedHrefs, language + ' keeps the same derived destinations')
}
// Todo link que o rodapé já entregava em origin/main (910317ea, 27/09 antes deste item) continua entregue.
const before = renderPage(FOOTER, true, {}, {}, '910317ea')
const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1])
const beforeHrefs = hrefs(before), afterHrefs = hrefs(after)
check(beforeHrefs.length > 0 && beforeHrefs.every((h) => afterHrefs.includes(h)), 'every historical footer link (' + beforeHrefs.length + ') is still rendered')
equal(afterHrefs.filter((h) => !beforeHrefs.includes(h)).sort(), [...expectedHrefs].sort(), 'the only new links are the derived segment doors')
check((before.match(/href="\/ads\/for\//g) || []).length === 0, 'baseline had zero segment links from the footer (the orphan state this item closes)')

// ── Mutantes em memória (nada gravado em disco) ─────────────────────────────────────────────
// O mesmo componente, com a fonte substituída em memória e os clientes de telemetria substituídos por âncoras puras.
const anchor = ({ children, href, style }) => React.createElement('a', { href, style }, children)
const mocks = {
  'components/FooterBusinessLink.tsx': { __esModule: true, default: anchor },
  'components/CostCalculatorLink.tsx': { __esModule: true, default: anchor },
  'components/LiveStatsBadge.tsx': { __esModule: true, default: () => null },
  'components/InterfaceLanguage.tsx': { __esModule: true, InterfaceLanguageSelect: () => null, UiLabel: ({ children }) => children },
}
const renderSource = (src) => renderToStaticMarkup(React.createElement(offlineModules({ mocks, replacements: { [FOOTER]: src } })(FOOTER).default, { showStats: false }))
equal(renderProblems(renderSource(footerSource)), [], 'mutant harness renders the unmutated source green (so red below is the mutation, not the harness)')
const mutate = (name, from, to) => { const src = footerSource.split(from).join(to); check(src !== footerSource, name + ': mutation applied'); return src }
const m1 = mutate('M1 one slug removed', 'ADS_SEGMENTS.map(', 'ADS_SEGMENTS.slice(1).map(')
check(renderProblems(renderSource(m1)).length > 0, 'M1 one slug removed from the rendered sublist → red')
const m2 = mutate('M2 href without the derivation', 'adsSegmentPath(segment.slug)', '`/ads/${segment.slug}`')
check(renderProblems(renderSource(m2)).length > 0 && sourceProblems(m2).length > 0, 'M2 typed wrong path → red (render and source)')
const m3 = mutate('M3 typed template with the right path', 'adsSegmentPath(segment.slug)', '`/ads/for/${segment.slug}`')
check(renderProblems(renderSource(m3)).length === 0 && sourceProblems(m3).length > 0, 'M3 same HTML but typed path → source lock red')
const m4 = mutate('M4 sublist moved out of the business group', "{ href: '/ads', label: 'Videos for businesses', sublist: ADS_SEGMENT_SUBLIST }", "{ href: '/ads', label: 'Videos for businesses' }").split("{ href: '/alternatives', label: 'All comparisons' }").join("{ href: '/alternatives', label: 'All comparisons', sublist: ADS_SEGMENT_SUBLIST }")
check(m4.includes("label: 'All comparisons', sublist: ADS_SEGMENT_SUBLIST") && renderProblems(renderSource(m4)).length > 0, 'M4 sublist outside the business group → red')
const m5 = mutate('M5 fifth navigation group', 'export default function Footer(', "navGroups.push({ title: 'Extra', links: [] })\nexport default function Footer(")
check(renderProblems(renderSource(m5)).some((p) => p.startsWith('details=5')), 'M5 fifth <details> group → red')
console.log(`PASS ${checks} footer segment checks; ${expectedHrefs.length} derived doors; no network, database or generation`)
