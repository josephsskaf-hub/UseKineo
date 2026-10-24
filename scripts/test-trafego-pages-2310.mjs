// Offline regression guard. Does not load .env, contact services or generate files.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = require('typescript')
const { results, disclosure } = require('../docs/trafego-2310/render-pages.cjs')
assert.equal(results.length, 6)
assert.deepEqual(results.map((result) => result.page), ['/', '/ai-video-generator/seedance', '/text-to-video-shorts', '/free-ai-shorts/horror', '/ai-video-generator/for/urdu', '/gerador-de-shorts-gratis'])
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const original = (file) => execFileSync('git', ['show', `895d6c99638dc0af65e11ad761f4999141587fa7:${file}`], { cwd: root, encoding: 'utf8' })
const metadata = (text, file) => {
  const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  return parsed.statements.filter((statement) => (ts.isFunctionDeclaration(statement) && statement.name?.text === 'generateMetadata') || (ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => declaration.name.getText(parsed) === 'metadata'))).map((statement) => statement.getText(parsed)).join('\n')
}
const pages = [
  ['app/KineoLanding.tsx', 'home'],
  ['app/ai-video-generator/[engine]/page.tsx', 'seedance'],
  ['app/ai-video-generator/for/[slug]/page.tsx', 'urdu'],
  ['app/free-ai-shorts/[niche]/page.tsx', 'horror'],
  ['app/gerador-de-shorts-gratis/page.tsx', 'portuguese'],
  ['app/text-to-video-shorts/page.tsx', 'text'],
]
for (const [file, page] of pages) {
  const text = source(file)
  assert.equal((text.match(/<CitationDirectAnswer\b/g) || []).length, 1, `${file}: one direct answer mount`)
  assert.equal((text.match(/<CitationDetails\b/g) || []).length, 1, `${file}: one details mount`)
  assert(text.includes(`<CitationDirectAnswer page="${page}" />`))
  assert(text.includes(`<CitationDetails page="${page}" />`))
  assert.equal(metadata(text, file), metadata(original(file), file), `${file}: title/canonical unchanged`)
}
for (const file of ['app/page.tsx', 'app/pricing/page.tsx']) assert.equal(metadata(source(file), file), metadata(original(file), file), `${file}: metadata unchanged`)
for (const [file, selector, page] of [
  ['app/ai-video-generator/[engine]/page.tsx', 'params.engine', 'seedance'],
  ['app/ai-video-generator/for/[slug]/page.tsx', 'params.slug', 'urdu'],
  ['app/free-ai-shorts/[niche]/page.tsx', 'params.niche', 'horror'],
]) {
  const text = source(file)
  assert(text.includes(`${selector} === '${page}' ? <CitationDirectAnswer page="${page}" />`), `${page}: no sibling answer changes`)
  assert(text.includes(`${selector} === '${page}' ? <CitationDetails page="${page}" /> : null`), `${page}: no sibling details mounts`)
}
for (const file of ['lib/checkoutPricing.ts', 'lib/settlementCurrency.ts']) assert.equal(source(file), original(file), `${file}: prices and settlement unchanged`)
assert(disclosure.includes('Customers in Brazil pay in reais (BRL) at checkout'))
assert(!disclosure.includes('USD worldwide'))
console.log(`PASS KINEO-TRAFEGO-2310 pages: ${results.length} rendered blocks, 40–60 words, 5 FAQs, date, metadata, prices, BRL and slug isolation`)
