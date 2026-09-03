#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)((id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(path + ': unexpected import ' + id)
  }, module, module.exports)
  return module.exports
}

const helper = loadTs('lib/growth/shortsVendorEvaluation.ts')
const sheet = helper.buildShortsVendorEvaluation('https://www.usekineo.com')
equal(sheet.version, 'b2b_vendor_evaluation_v1', 'stable worksheet version')
equal(sheet.rows.length, 13, 'twelve criteria plus one attributable optional resource')
equal(new Set(sheet.rows.slice(0, 12).map((row) => row.requirement)).size, 12, 'requirements are unique')
for (const row of sheet.rows.slice(0, 12)) {
  equal(row.vendorA, '', 'Vendor A remains neutral and empty')
  equal(row.vendorB, '', 'Vendor B remains neutral and empty')
  ok(row.evidenceToRequest.length > 20, 'every criterion asks for evidence')
}
equal(sheet.publisher, 'Kineo', 'publisher is explicit')
ok(sheet.disclosure.includes('vendor-neutral'), 'neutrality disclosure is explicit')
ok(sheet.disclosure.includes('first-party example'), 'commercial bias is disclosed')
const brief = new URL(sheet.rows[12].evidenceToRequest)
equal(brief.origin, 'https://www.usekineo.com', 'brief link uses canonical origin')
equal(brief.pathname, '/client-video-brief-generator', 'brief link uses existing tool')
equal(brief.searchParams.get('utm_source'), 'vendor_evaluation_sheet', 'source is exact')
equal(brief.searchParams.get('utm_medium'), 'referral', 'medium is exact')
equal(brief.searchParams.get('utm_campaign'), sheet.version, 'campaign shares worksheet version')
assert.throws(() => helper.buildShortsVendorEvaluation('http://www.usekineo.com'), /canonical HTTPS/)
checks += 1
assert.throws(() => helper.buildShortsVendorEvaluation('https://evil.example'), /canonical HTTPS|canonical/)
checks += 1

equal(helper.safeCsvCell('=HYPERLINK("https://evil")'), '"\'=HYPERLINK(""https://evil"")"', 'formula prefix is neutralized')
equal(helper.safeCsvCell('+SUM(1,2)'), '"\'+SUM(1,2)"', 'plus formula is neutralized')
equal(helper.safeCsvCell('-2+3'), '"\'-2+3"', 'minus formula is neutralized')
equal(helper.safeCsvCell('@cmd'), '"\'@cmd"', 'at formula is neutralized')
equal(helper.safeCsvCell('  =1+1'), '"\'  =1+1"', 'leading whitespace cannot bypass formula neutralization')
equal(helper.safeCsvCell('"quote"\nnext'), '"""quote""\nnext"', 'quotes and embedded newline are escaped')
equal(helper.safeCsvCell('normal, value'), '"normal, value"', 'commas are quoted')
const csv = helper.renderShortsVendorEvaluationCsv(sheet)
equal(csv.split('\r\n').length, 19, 'CSV has four metadata rows, header, thirteen rows and final line')
ok(csv.includes('"Category","Requirement","Evidence to request"'), 'CSV has stable seven-column header')
ok(csv.includes('b2b_vendor_evaluation_v1'), 'CSV declares its version')
ok(!/\$\d|USD|price per|discount/i.test(csv), 'worksheet contains no price or discount')
ok(!/guarantee|unlimited|best vendor/i.test(csv), 'worksheet makes no unsupported promise')

const route = loadTs('app/short-form-video-vendor-evaluation.csv/route.ts', {
  '@/lib/kineoFacts': { PRODUCT: { url: 'https://www.usekineo.com' } },
  '@/lib/growth/shortsVendorEvaluation': helper,
})
const response = route.GET()
equal(response.status, 200, 'route returns 200')
equal(response.headers.get('content-type'), 'text/csv; charset=utf-8', 'route returns CSV')
equal(response.headers.get('content-disposition'), 'attachment; filename="short-form-video-vendor-evaluation.csv"', 'route downloads with stable filename')
equal(response.headers.get('x-robots-tag'), 'all', 'route remains discoverable')
equal(response.headers.get('x-content-type-options'), 'nosniff', 'route blocks MIME sniffing')
equal(await response.text(), csv, 'route executes exact production builder')
ok(!read('app/short-form-video-vendor-evaluation.csv/route.ts').includes('trackEvent'), 'crawler GET never creates a human event')
ok(read('app/sitemap.ts').includes("{ path: '/short-form-video-vendor-evaluation.csv'"), 'sitemap discovers worksheet')
ok(read('app/sitemap.ts').includes("new Date('2026-09-03T07:27:36.555Z')"), 'sitemap date advances with the public acquisition cluster')
ok(!read('lib/growth/shortsVendorEvaluation.ts').includes('searchParams.get'), 'worksheet accepts no query-controlled content')

console.log('shorts vendor evaluation: ' + checks + '/' + checks)
