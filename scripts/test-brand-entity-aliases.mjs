#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`unexpected import ${id}`) }, module, module.exports,
  )
  return module.exports
}

let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

const brand = loadTs('lib/brandIdentity.ts')
equal(brand.BRAND_NAME, 'Kineo', 'canonical name stays Kineo')
equal(brand.BRAND_URL, 'https://www.usekineo.com', 'canonical domain stays www.usekineo.com')
equal(new Set(brand.BRAND_ALIASES).size, brand.BRAND_ALIASES.length, 'aliases are unique')
ok(brand.BRAND_ALIASES.includes('Cineo'), 'observed misspelling is declared')
ok(brand.BRAND_ALIASES.includes('Cineo AI'), 'observed AI misspelling is declared')
ok(brand.BRAND_ALIASES.includes('ShortsForgeAI'), 'historical brand remains connected')
ok(!brand.BRAND_ALIASES.includes('Kineo'), 'canonical name is not duplicated as an alias')

const home = source('app/page.tsx')
const structured = source('components/StructuredData.tsx')
const pricing = source('app/pricing/page.tsx')

ok(home.includes("import { BRAND_ALIASES, BRAND_NAME, BRAND_URL } from '@/lib/brandIdentity'"), 'homepage imports canonical identity')
equal((home.match(/alternateName: BRAND_ALIASES/g) ?? []).length, 2, 'homepage organization and website share aliases')
ok(structured.includes("import { BRAND_ALIASES, BRAND_NAME, BRAND_URL } from '@/lib/brandIdentity'"), 'global schema imports canonical identity')
equal((structured.match(/alternateName: BRAND_ALIASES/g) ?? []).length, 2, 'global organization and software schemas share aliases')
ok(!structured.includes("alternateName: 'ShortsForgeAI'"), 'stale single-alias schema is gone')
ok(pricing.includes("alternates: { canonical: '/pricing' }"), 'Google-selected pricing page remains self-canonical')
ok(!pricing.includes('Cineo'), 'no typo copy is exposed in the visible pricing page')
ok(!/\n\s*aggregateRating\s*:/.test(structured), 'entity correction does not invent rating proof')

console.log(`brand entity aliases: ${checks}/${checks} checks passed`)
